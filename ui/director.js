'use strict';
// Turns raw server events (agent start/done, tool use, chat text) into the story the visual views tell:
// hand-offs, verdicts, fix loops, merges. Views subscribe with Doom.on(type, fn).
(function (root) {
  var REVIEWERS = { 'security-reviewer': 1, 'ux-reviewer': 1, 'ui-design-reviewer': 1, 'code-reviewer': 1 };
  var listeners = {};
  var D = { replaying: false, demo: false, state: null, on: on, off: off, emit: emit, feed: feed, reset: reset, REVIEWERS: REVIEWERS };
  var starts = {};   // tool_use id -> { agent, from }

  function on(type, fn) { (listeners[type] = listeners[type] || []).push(fn); }
  function off(type, fn) { listeners[type] = (listeners[type] || []).filter(function (f) { return f !== fn; }); }
  function emit(type, data) {
    if (D.replaying && type !== 'state') return;
    data = data || {}; data.ts = data.ts || Date.now(); data.demo = D.demo;
    (listeners[type] || []).forEach(function (fn) { try { fn(data); } catch (e) { if (root.console) console.error(e); } });
    (listeners['*'] || []).forEach(function (fn) { try { fn(type, data); } catch (e) { /* ignore */ } });
  }

  function fresh() {
    return { agents: {}, loop: 0, route: '', defectsSinceBuild: 0, builderRuns: 0, running: false, merged: false, human: 'idle' };
  }
  function ag(id) {
    var a = D.state.agents[id];
    if (!a) a = D.state.agents[id] = { state: 'idle', task: '', tools: 0, say: '', tool: '', verdict: '', runs: 0, active: 0 };
    return a;
  }
  function reset() { D.state = fresh(); starts = {}; emit('reset', {}); }
  D.state = fresh();

  function verdictOf(agent, text) {
    text = String(text || '');
    if (agent === 'approver') {
      if (/LOW_RISK_APPROVE/.test(text)) return 'approve';
      if (/RE_REVIEW/.test(text)) return 'rereview';
      if (/ESCALATE/.test(text)) return 'escalate';
      return 'none';
    }
    if (REVIEWERS[agent]) {
      if (/\bCHANGES\b/.test(text)) return 'changes';
      if (/\bPASS\b/.test(text)) return 'pass';
    }
    return 'none';
  }

  function feed(ev) {
    if (!ev || !ev.t) return;
    var S = D.state, a;
    switch (ev.t) {
      case 'chat':
        if (ev.role === 'user') {
          if (/^\s*(\/factory\s+)?approve\b/i.test(ev.text)) { S.human = 'approved'; emit('approve', { text: ev.text }); }
          else { S.loop = 0; S.defectsSinceBuild = 0; S.builderRuns = 0; S.route = ''; S.merged = false; S.running = true; emit('request', { text: ev.text }); }
          break;
        }
        a = ag(ev.agent || 'marcus'); a.say = ev.text;
        if (ev.role === 'marcus' && !S.route) {
          var m = /\b(new project|bug[- ]?fix|bug|feature|unfamiliar)\b/i.exec(ev.text);
          if (m) { S.route = /bug/i.test(m[1]) ? 'bug' : /feature/i.test(m[1]) ? 'feature' : /unfamiliar/i.test(m[1]) ? 'unfamiliar' : 'new'; emit('route', { route: S.route }); }
        }
        emit('say', { agent: ev.agent || 'marcus', text: ev.text, role: ev.role });
        break;
      case 'tool':
        a = ag(ev.agent || 'marcus'); a.tools++; a.tool = ev.name + ' ' + (ev.summary || '');
        if (ev.agent === 'marcus' && ev.name === 'Bash' && /\bgit\s+merge\b/.test(ev.summary || '')) { S.merged = true; emit('merge', { text: ev.summary }); }
        emit('activity', { agent: ev.agent || 'marcus', name: ev.name, summary: ev.summary || '' });
        break;
      case 'agent': {
        if (ev.state === 'reset') { reset(); break; }
        a = ag(ev.agent);
        if (ev.state === 'start') {
          starts[ev.id] = { agent: ev.agent, from: ev.from || 'marcus' };
          a.active++; a.state = 'working'; a.task = ev.desc || 'working'; a.runs++;
          if (ev.agent === 'codebase-mapper' && !S.route) { S.route = 'existing'; emit('route', { route: 'existing' }); }
          if (ev.agent === 'builder') {
            S.builderRuns++;
            if (S.defectsSinceBuild > 0) { S.loop++; S.defectsSinceBuild = 0; emit('loop', { n: S.loop }); }
          }
          emit('start', { agent: ev.agent, from: ev.from || 'marcus', desc: ev.desc || '', id: ev.id });
        } else {
          var st = starts[ev.id] || { from: 'marcus' };
          delete starts[ev.id];
          a.active = Math.max(0, a.active - 1);
          var v = ev.state === 'error' ? 'error' : verdictOf(ev.agent, ev.summary);
          a.verdict = v; a.state = a.active ? 'working' : (v === 'changes' || v === 'error' ? 'error' : 'done');
          if (v === 'changes') { S.defectsSinceBuild++; emit('defect', { from: ev.agent, to: 'builder', text: ev.summary || '' }); }
          if (v === 'escalate') { S.human = 'waiting'; emit('escalate', { text: ev.summary || '' }); }
          emit('done', { agent: ev.agent, to: st.from, summary: ev.summary || '', verdict: v, id: ev.id });
        }
        break;
      }
      case 'turn':
        S.running = false;
        Object.keys(S.agents).forEach(function (k) { if (S.agents[k].state === 'working' && !S.agents[k].active) S.agents[k].state = 'idle'; });
        emit('idle', { ms: ev.ms, cost: ev.cost });
        break;
      default: break;
    }
    emit('state', {});
  }

  root.Doom = D;
})(window);
