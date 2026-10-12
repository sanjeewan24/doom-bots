'use strict';
// Local-only HTTP server: static UI, SSE event stream, chat API, file viewer for .doombots/.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Session } = require('./session');
const personas = require('./personas');

const UI_DIR = path.resolve(__dirname, '..', 'ui');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' };
const MAX_HISTORY = 3000;

function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

function createApp(opts) {
  const cwd = opts.cwd;
  const doomDir = path.join(cwd, '.doombots');
  ensureDir(doomDir);
  const logFile = path.join(doomDir, 'ui-log.jsonl');
  const sessionFile = path.join(doomDir, 'session.json');
  const token = crypto.randomBytes(18).toString('hex');
  const clients = new Set();
  let history = [];
  let seq = 0;

  // chat history survives restarts
  try {
    history = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).slice(-MAX_HISTORY);
    seq = history.reduce((m, e) => Math.max(m, e.seq || 0), 0);
  } catch (e) { /* none yet */ }

  let resumeId = null;
  if (!opts.fresh) {
    try { resumeId = JSON.parse(fs.readFileSync(sessionFile, 'utf8')).sessionId || null; } catch (e) { /* none */ }
  }

  // Hook that keeps Marcus an orchestrator (blocks his edits and non-git shell commands).
  const settingsFile = path.join(doomDir, 'hooks.settings.json');
  const guardCmd = '"' + process.execPath + '" "' + path.resolve(__dirname, 'guard.js') + '"';
  fs.writeFileSync(settingsFile, JSON.stringify({ hooks: { PreToolUse: [{ matcher: 'Bash|Write|Edit|MultiEdit|NotebookEdit', hooks: [{ type: 'command', command: guardCmd }] }] } }, null, 2));

  const session = new Session({ cwd, yolo: opts.yolo, resumeId, sessionFile, settingsFile, bin: opts.bin });
  let status = { state: 'stopped', msg: '' };

  function publish(ev) {
    ev.seq = ++seq;
    if (ev.t === 'status') status = { state: ev.state, msg: ev.msg };
    if (ev.t !== 'status') {
      history.push(ev);
      if (history.length > MAX_HISTORY) history.shift();
      try { fs.appendFileSync(logFile, JSON.stringify(ev) + '\n'); } catch (e) { /* ignore */ }
    }
    const data = 'id: ' + ev.seq + '\ndata: ' + JSON.stringify(ev) + '\n\n';
    for (const res of clients) { try { res.write(data); } catch (e) { clients.delete(res); } }
  }
  session.on('ev', publish);

  // Tail Marcus's protocol events (.doombots/events.jsonl) and relay them.
  const evFile = path.join(doomDir, 'events.jsonl');
  let evPos = 0;
  try { evPos = fs.statSync(evFile).size; } catch (e) { evPos = 0; }
  const tail = setInterval(() => {
    try {
      const st = fs.statSync(evFile);
      if (st.size < evPos) evPos = 0;
      if (st.size === evPos) return;
      const fd = fs.openSync(evFile, 'r');
      const buf = Buffer.alloc(st.size - evPos);
      fs.readSync(fd, buf, 0, buf.length, evPos);
      fs.closeSync(fd);
      evPos = st.size;
      for (const line of buf.toString('utf8').split('\n')) {
        if (!line.trim()) continue;
        try { publish({ t: 'log', event: JSON.parse(line), ts: Date.now() }); } catch (e) { /* skip bad line */ }
      }
    } catch (e) { /* file not there yet */ }
  }, 700);

  function listFiles() {
    const out = [];
    (function walk(dir, depth) {
      if (depth > 4 || out.length > 400) return;
      let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
      for (const e of ents) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, depth + 1);
        else if (/\.(md|json|jsonl|txt)$/i.test(e.name) && e.name !== 'ui-log.jsonl') {
          const st = fs.statSync(p);
          out.push({ path: path.relative(doomDir, p).split(path.sep).join('/'), size: st.size, mtime: st.mtimeMs });
        }
      }
    })(doomDir, 0);
    return out.sort((a, b) => b.mtime - a.mtime);
  }

  function gitInfo() {
    const { spawnSync } = require('child_process');
    const run = a => spawnSync('git', a, { cwd, encoding: 'utf8' });
    const r = run(['rev-parse', '--is-inside-work-tree']);
    if (r.status !== 0) return { repo: false };
    const br = run(['rev-parse', '--abbrev-ref', 'HEAD']);
    const dirty = run(['status', '--short']);
    return { repo: true, branch: (br.stdout || '').trim(), dirty: (dirty.stdout || '').trim().split('\n').filter(Boolean).length };
  }

  function hostOk(req) {
    const h = (req.headers.host || '').toLowerCase();
    return h === '127.0.0.1:' + port || h === 'localhost:' + port;
  }
  function tokenOk(req, url) {
    return url.searchParams.get('t') === token || req.headers['x-doom-token'] === token;
  }
  function json(res, code, obj) {
    res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(obj));
  }
  function body(req, cb) {
    let b = '';
    req.on('data', d => { b += d; if (b.length > 200000) req.destroy(); });
    req.on('end', () => { try { cb(JSON.parse(b || '{}')); } catch (e) { cb(null); } });
  }

  let port = 0;
  const server = http.createServer((req, res) => {
    if (!hostOk(req)) { res.writeHead(403); return res.end('bad host'); }
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname.startsWith('/api/')) {
      if (!tokenOk(req, url)) return json(res, 401, { error: 'bad token' });
      if (req.method === 'POST' && req.headers.origin && !/^http:\/\/(127\.0\.0\.1|localhost):/.test(req.headers.origin)) return json(res, 403, { error: 'bad origin' });

      if (url.pathname === '/api/events') {
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
        res.write('retry: 2000\n\n');
        for (const ev of history) res.write('data: ' + JSON.stringify(ev) + '\n\n');
        res.write('data: ' + JSON.stringify({ t: 'status', state: status.state, msg: status.msg, seq: 0 }) + '\n\n');
        res.write('data: ' + JSON.stringify({ t: 'replay-done' }) + '\n\n');
        clients.add(res);
        req.on('close', () => clients.delete(res));
        return;
      }
      if (url.pathname === '/api/state') {
        return json(res, 200, { cwd, name: path.basename(cwd), git: gitInfo(), status, personas, yolo: opts.yolo !== false, resuming: !!resumeId });
      }
      if (url.pathname === '/api/files') return json(res, 200, { files: listFiles() });
      if (url.pathname === '/api/file') {
        const rel = url.searchParams.get('p') || '';
        const abs = path.resolve(doomDir, rel);
        if (abs !== doomDir && !abs.startsWith(doomDir + path.sep)) return json(res, 400, { error: 'outside .doombots' });
        try {
          const st = fs.statSync(abs);
          if (!st.isFile() || st.size > 1024 * 1024) return json(res, 400, { error: 'not a readable file' });
          return json(res, 200, { path: rel, text: fs.readFileSync(abs, 'utf8') });
        } catch (e) { return json(res, 404, { error: 'not found' }); }
      }
      if (req.method === 'POST' && url.pathname === '/api/message') {
        return body(req, b => {
          const text = b && typeof b.text === 'string' ? b.text.trim() : '';
          if (!text) return json(res, 400, { error: 'empty' });
          json(res, 200, { ok: session.send(text) });
        });
      }
      if (req.method === 'POST' && url.pathname === '/api/stop') { session.stop(); return json(res, 200, { ok: true }); }
      if (req.method === 'POST' && url.pathname === '/api/start') { session.start(); return json(res, 200, { ok: true }); }
      if (req.method === 'POST' && url.pathname === '/api/new') {
        session.stop();
        setTimeout(() => { session.resumeId = null; try { fs.unlinkSync(sessionFile); } catch (e) { /* ignore */ } session.start(); }, 700);
        return json(res, 200, { ok: true });
      }
      return json(res, 404, { error: 'no such route' });
    }
    // static
    let rel = url.pathname === '/' ? '/index.html' : url.pathname;
    const abs = path.resolve(UI_DIR, '.' + rel);
    if (!abs.startsWith(UI_DIR + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(abs, (err, data) => {
      if (err) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'content-type': MIME[path.extname(abs)] || 'application/octet-stream', 'cache-control': 'no-store' });
      res.end(data);
    });
  });

  function listen(startPort) {
    return new Promise((resolve, reject) => {
      let p = startPort;
      const tryOne = () => {
        server.once('error', e => { if (e.code === 'EADDRINUSE' && p < startPort + 40) { p++; tryOne(); } else reject(e); });
        server.listen(p, '127.0.0.1', () => { port = p; server.removeAllListeners('error'); resolve(p); });
      };
      tryOne();
    });
  }

  function close() { clearInterval(tail); session.stop(); server.close(); for (const c of clients) { try { c.end(); } catch (e) { /* ignore */ } } }

  return { listen, close, session, token, getPort: () => port, publish };
}

module.exports = { createApp };
