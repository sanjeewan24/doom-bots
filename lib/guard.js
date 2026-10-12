#!/usr/bin/env node
'use strict';
// PreToolUse hook. Keeps Marcus (the main thread) an orchestrator: no file edits, and Bash only for
// git, listing, reading, and appending to .doombots/. Subagents (Forge etc.) are not restricted here.
// Exit 2 = block (stderr is shown to Marcus). Exit 0 = leave the normal flow alone.

const ALLOWED_CMDS = new Set(['git', 'ls', 'dir', 'pwd', 'cd', 'echo', 'printf', 'cat', 'type', 'head', 'tail', 'wc',
  'date', 'mkdir', 'test', '[', 'true', 'false', 'grep', 'find', 'which', 'where', 'stat', 'basename', 'dirname']);
const GIT_DENY = new Set(['push', 'clean', 'filter-branch', 'gc', 'prune', 'reflog']);

const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);

function reason(msg) {
  return msg + ' You are the orchestrator: delegate this to the right worker with the Agent tool (builder writes and fixes code, codebase-mapper reads the project, spec-writer writes specs). Bug fixes go through the bug route.';
}

// Split a shell line into segments on unquoted ; && || | and newlines. Also collect unquoted redirects.
function scan(cmd) {
  const segs = [], redirs = [];
  let cur = '', q = null, i = 0;
  const push = () => { if (cur.trim()) segs.push(cur.trim()); cur = ''; };
  while (i < cmd.length) {
    const c = cmd[i], n = cmd[i + 1];
    if (q) { cur += c; if (c === q) q = null; else if (c === '\\' && q === '"') { cur += n || ''; i++; } i++; continue; }
    if (c === '"' || c === "'") { q = c; cur += c; i++; continue; }
    if (c === '\\') { cur += c + (n || ''); i += 2; continue; }
    if (c === ';' || c === '\n' || c === '|' || (c === '&' && n === '&')) {
      push(); i += (c === '|' && n === '|') || (c === '&' && n === '&') ? 2 : 1; continue;
    }
    if (c === '&') { return { error: 'background jobs are not allowed' }; }
    if (c === '>' || (c === '<' && n === '<')) {
      if (c === '<') return { error: 'heredocs are not allowed' };
      // redirect: >, >>, 2>, &> handled by the preceding char already in cur
      let j = i + 1; if (cmd[j] === '>') j++;
      if (cmd[j] === '&') { j++; while (/\d/.test(cmd[j] || '')) j++; i = j; continue; } // 2>&1
      while (cmd[j] === ' ') j++;
      let target = '', tq = null;
      while (j < cmd.length) {
        const d = cmd[j];
        if (tq) { if (d === tq) { tq = null; j++; continue; } target += d; j++; continue; }
        if (d === '"' || d === "'") { tq = d; j++; continue; }
        if (/[\s;&|]/.test(d)) break;
        target += d; j++;
      }
      redirs.push(target);
      cur = cur.replace(/\s*\d?&?$/, ''); // drop a trailing fd number like "2"
      i = j; continue;
    }
    cur += c; i++;
  }
  push();
  return { segs, redirs };
}

function words(seg) {
  const out = []; let cur = '', q = null;
  for (let i = 0; i < seg.length; i++) {
    const c = seg[i];
    if (q) { if (c === q) q = null; else cur += c; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (/\s/.test(c)) { if (cur) { out.push(cur); cur = ''; } continue; }
    cur += c;
  }
  if (cur) out.push(cur);
  return out;
}

function okTarget(t) {
  t = t.replace(/\\/g, '/');
  if (t === '/dev/null' || t === 'nul' || t === 'NUL') return true;
  return /(^|\/)\.doombots\//.test(t) && !/\.\.\//.test(t);
}

function checkBash(cmd) {
  if (/\$\(|`|<\(|\beval\b|\bsource\b/.test(cmd)) return 'command substitution and eval are not allowed.';
  const r = scan(cmd);
  if (r.error) return r.error + '.';
  for (const t of r.redirs) if (!okTarget(t)) return 'writing to "' + t + '" is not allowed. You may only write inside .doombots/.';
  if (!r.segs.length) return null;
  for (const seg of r.segs) {
    const w = words(seg);
    if (!w.length) continue;
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0])) return 'environment assignments are not allowed.';
    const name = w[0].replace(/^.*[\\/]/, '').replace(/\.exe$/i, '').toLowerCase();
    if (!ALLOWED_CMDS.has(name)) return '"' + name + '" is not allowed for the orchestrator.';
    if (name === 'git') {
      const sub = w.slice(1).find(x => !x.startsWith('-'));
      if (sub && GIT_DENY.has(sub)) return '"git ' + sub + '" is not allowed.';
      if (sub === 'reset' && w.includes('--hard')) return '"git reset --hard" is not allowed.';
      if (w.some(x => x === '-f' || x === '--force' || x.startsWith('--force'))) return 'forced git operations are not allowed.';
    }
    if (name === 'find' && w.some(x => /^-(exec|execdir|delete|fprint|fprintf|ok)$/.test(x))) return '"find" with actions is not allowed.';
    if (name === 'mkdir' && w.slice(1).filter(x => !x.startsWith('-')).some(x => !okTarget(x.replace(/\\/g, '/') + '/'))) return 'mkdir is only allowed inside .doombots/.';
  }
  return null;
}

function decide(input) {
  const tn = input.tool_name, at = input.agent_type, aid = input.agent_id;
  const isMarcus = at === 'marcus' || (!aid && !at);
  if (!isMarcus) return null;
  if (WRITE_TOOLS.has(tn)) return reason('Marcus cannot edit files (' + tn + ').');
  if (tn === 'Bash') {
    const why = checkBash(String((input.tool_input || {}).command || ''));
    if (why) return reason('Blocked Bash: ' + why);
  }
  return null;
}

module.exports = { decide, checkBash };

if (require.main === module) {
  let raw = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', d => { raw += d; });
  process.stdin.on('end', () => {
    let input; try { input = JSON.parse(raw); } catch (e) { process.exit(0); }
    const why = decide(input);
    if (why) { process.stderr.write(why + '\n'); process.exit(2); }
    process.exit(0);
  });
}
