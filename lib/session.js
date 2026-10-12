'use strict';
// Runs Marcus as a long-lived `claude -p` stream-json process and turns its output into UI events.
const { spawn, spawnSync } = require('child_process');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');

const MODEL = 'claude-sonnet-4-6';

function summarize(name, input) {
  input = input || {};
  const clip = (s, n) => { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
  switch (name) {
    case 'Bash': return clip(input.command, 140);
    case 'Read': case 'Write': case 'Edit': case 'NotebookEdit': return clip(input.file_path, 140);
    case 'Grep': case 'Glob': return clip(input.pattern, 100);
    case 'WebFetch': return clip(input.url, 120);
    case 'WebSearch': return clip(input.query, 120);
    case 'Skill': return clip(input.skill, 60);
    case 'TaskCreate': return clip(input.subject, 100);
    case 'TaskUpdate': return clip((input.status || '') + ' #' + (input.taskId || ''), 60);
    default: return clip(JSON.stringify(input), 100);
  }
}

function detectFlags(bin) {
  const r = spawnSync(bin, ['--help'], { encoding: 'utf8', shell: process.platform === 'win32' });
  const help = (r.stdout || '') + (r.stderr || '');
  return {
    ok: r.status === 0 && help.length > 0,
    yolo: help.includes('--dangerously-skip-permissions'),
    forwardSub: help.includes('--forward-subagent-text'),
    effort: help.includes('--effort'),
    agent: help.includes('--agent')
  };
}

class Session extends EventEmitter {
  constructor(opts) {
    super();
    this.cwd = opts.cwd;
    this.bin = opts.bin || process.env.DOOM_CLAUDE_BIN || 'claude';
    this.yolo = opts.yolo !== false;
    this.resumeId = opts.resumeId || null;
    this.sessionFile = opts.sessionFile;
    this.settingsFile = opts.settingsFile || null;
    this.calls = new Map();   // tool_use_id -> subagent role id
    this.proc = null;
    this.state = 'stopped';
    this.sessionId = null;
    this.buf = '';
    this.errTail = '';
  }

  setState(state, msg) {
    this.state = state;
    this.emit('ev', { t: 'status', state, msg: msg || '' });
  }

  start() {
    if (this.proc) return;
    const flags = detectFlags(this.bin);
    if (!flags.ok) { this.setState('error', 'Cannot run "' + this.bin + '". Install Claude Code and make sure `claude` is on PATH.'); return; }
    if (!flags.agent) { this.setState('error', 'This Claude Code version has no --agent flag. Update Claude Code.'); return; }
    const args = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose',
      '--agent', 'marcus', '--model', MODEL];
    if (flags.effort) args.push('--effort', 'medium');
    if (flags.forwardSub) args.push('--forward-subagent-text');
    if (this.yolo) {
      if (!flags.yolo) { this.setState('error', 'This Claude Code version has no --dangerously-skip-permissions flag.'); return; }
      args.push('--dangerously-skip-permissions');
    }
    if (this.settingsFile) args.push('--settings', this.settingsFile);
    if (this.resumeId) args.push('--resume', this.resumeId);

    const env = Object.assign({}, process.env, { DOOM_BOTS: '1' });
    if (typeof process.getuid === 'function' && process.getuid() === 0) env.IS_SANDBOX = '1';

    this.setState('starting', 'Starting Marcus' + (this.resumeId ? ' (resuming session)' : '') + '…');
    this.errTail = '';
    this.buf = '';
    this.proc = spawn(this.bin, args, { cwd: this.cwd, env, shell: process.platform === 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
    this.proc.stdout.setEncoding('utf8');
    this.proc.stderr.setEncoding('utf8');
    this.proc.stdout.on('data', d => this.onData(d));
    this.proc.stderr.on('data', d => { this.errTail = (this.errTail + d).slice(-1500); });
    this.proc.stdin.on('error', () => { /* process gone; exit handler reports it */ });
    this.startedAt = Date.now();
    this.proc.on('error', e => { this.proc = null; this.setState('error', 'Failed to start claude: ' + e.message); });
    this.proc.on('exit', (code, sig) => {
      this.proc = null;
      this.calls.clear();
      if (code !== 0 && this.resumeId && Date.now() - this.startedAt < 8000) {
        this.resumeId = null;
        try { if (this.sessionFile) fs.unlinkSync(this.sessionFile); } catch (e) { /* ignore */ }
        this.emit('ev', { t: 'chat', role: 'system', agent: 'system', text: 'Could not resume the last session. Your next message starts a fresh one.', ts: Date.now() });
      }
      const why = code === 0 ? 'Marcus stopped.' : ('Marcus exited (' + (sig || code) + '). ' + this.errTail.trim().split('\n').slice(-3).join(' | '));
      this.setState(code === 0 ? 'stopped' : 'error', why);
      this.emit('ev', { t: 'agent', id: '*', agent: '*', state: 'reset', ts: Date.now() });
    });
    // Marcus has no turn yet; the process waits for the first message. Mark ready once it accepts input.
    setTimeout(() => { if (this.proc && this.state === 'starting') this.setState('ready', 'Marcus is ready. Tell him about the project.'); }, 600);
  }

  send(text) {
    if (!this.proc) this.start();
    if (!this.proc) return false;
    const line = JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text }] } }) + '\n';
    this.proc.stdin.write(line);
    this.emit('ev', { t: 'chat', role: 'user', agent: 'you', text, ts: Date.now() });
    this.setState('working', 'Marcus is working…');
    return true;
  }

  stop() {
    if (!this.proc) return;
    const p = this.proc;
    try { p.stdin.end(); } catch (e) { /* ignore */ }
    setTimeout(() => { try { p.kill(); } catch (e) { /* ignore */ } }, 400);
  }

  onData(d) {
    this.buf += d;
    let i;
    while ((i = this.buf.indexOf('\n')) >= 0) {
      const line = this.buf.slice(0, i).trim();
      this.buf = this.buf.slice(i + 1);
      if (!line) continue;
      let o;
      try { o = JSON.parse(line); } catch (e) { continue; }
      try { this.onMsg(o); } catch (e) { this.emit('ev', { t: 'log', text: 'parse error: ' + e.message, ts: Date.now() }); }
    }
  }

  agentOf(o) {
    const pid = o.parent_tool_use_id;
    return (pid && this.calls.get(pid)) || 'marcus';
  }

  onMsg(o) {
    const ts = Date.now();
    if (o.session_id && o.session_id !== this.sessionId) {
      this.sessionId = o.session_id;
      if (this.sessionFile) { try { fs.writeFileSync(this.sessionFile, JSON.stringify({ sessionId: o.session_id, cwd: this.cwd, at: ts })); } catch (e) { /* ignore */ } }
    }
    if (o.type === 'system' && o.subtype === 'init') {
      if (this.state === 'starting') this.setState('ready', 'Marcus is ready. Tell him about the project.');
      this.emit('ev', { t: 'init', model: o.model, sessionId: o.session_id, ts });
      return;
    }
    if (o.type === 'assistant' && o.message && Array.isArray(o.message.content)) {
      const agent = this.agentOf(o);
      for (const b of o.message.content) {
        if (b.type === 'text' && b.text && b.text.trim()) {
          this.emit('ev', { t: 'chat', role: agent === 'marcus' ? 'marcus' : 'agent', agent, text: b.text, ts });
        } else if (b.type === 'tool_use') {
          if (b.name === 'Agent' || b.name === 'Task') {
            const sub = (b.input && (b.input.subagent_type || b.input.agent)) || 'general-purpose';
            this.calls.set(b.id, sub);
            this.emit('ev', { t: 'agent', id: b.id, agent: sub, from: agent, state: 'start', desc: (b.input && b.input.description) || '', ts });
          } else {
            this.emit('ev', { t: 'tool', agent, name: b.name, summary: summarize(b.name, b.input), ts });
          }
        }
      }
      return;
    }
    if (o.type === 'user' && o.message && Array.isArray(o.message.content)) {
      for (const b of o.message.content) {
        if (b.type === 'tool_result' && this.calls.has(b.tool_use_id)) {
          const agent = this.calls.get(b.tool_use_id);
          let txt = typeof b.content === 'string' ? b.content : (Array.isArray(b.content) ? b.content.map(c => c.text || '').join('\n') : '');
          this.emit('ev', { t: 'agent', id: b.tool_use_id, agent, state: b.is_error ? 'error' : 'done', summary: txt.slice(0, 600), ts });
          this.calls.delete(b.tool_use_id);
        }
      }
      return;
    }
    if (o.type === 'result') {
      this.emit('ev', { t: 'turn', ms: o.duration_ms, cost: o.total_cost_usd, error: !!o.is_error, ts });
      if (o.is_error && o.result) this.emit('ev', { t: 'chat', role: 'system', agent: 'system', text: String(o.result), ts });
      if (this.state === 'working') this.setState('ready', 'Waiting for you.');
    }
  }
}

module.exports = { Session, summarize, MODEL };
