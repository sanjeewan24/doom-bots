'use strict';
(function () {
  var qs = new URLSearchParams(location.search);
  var TOKEN = qs.get('t') || '';
  try { if (TOKEN) sessionStorage.setItem('doomT', TOKEN); else TOKEN = sessionStorage.getItem('doomT') || ''; } catch (e) { /* ignore */ }
  var $ = function (id) { return document.getElementById(id); };

  var personas = {};      // role id -> persona
  var agents = {};        // role id -> {state, task, tools, active:Set}
  var replaying = true; Doom.replaying = true;
  var busy = false;

  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'x-doom-token': TOKEN, 'content-type': 'application/json' }, opts.headers || {});
    return fetch(path, opts).then(function (r) { return r.json(); });
  }
  function post(path, obj) { return api(path, { method: 'POST', body: JSON.stringify(obj || {}) }); }

  // ---------- safe text rendering ----------
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function inline(s) {
    return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  }
  function md(text) {
    var parts = String(text).split(/```/);
    var out = '';
    for (var i = 0; i < parts.length; i++) {
      if (i % 2) { out += '<pre><code>' + esc(parts[i].replace(/^[^\n]*\n/, '')) + '</code></pre>'; continue; }
      var lines = parts[i].split('\n'), list = false, para = [];
      var flush = function () { if (para.length) { out += '<p>' + para.join('<br>') + '</p>'; para = []; } };
      for (var j = 0; j < lines.length; j++) {
        var l = lines[j], m;
        if ((m = /^\s*[-*]\s+(.*)/.exec(l)) || (m = /^\s*\d+[.)]\s+(.*)/.exec(l))) {
          flush(); if (!list) { out += '<ul>'; list = true; } out += '<li>' + inline(m[1]) + '</li>';
        } else {
          if (list) { out += '</ul>'; list = false; }
          if ((m = /^#{1,4}\s+(.*)/.exec(l))) { flush(); out += '<h4>' + inline(m[1]) + '</h4>'; }
          else if (!l.trim()) flush();
          else para.push(inline(l));
        }
      }
      if (list) out += '</ul>';
      flush();
    }
    return out;
  }

  // ---------- roster ----------
  function avatarSrc(id) { try { return window.Avatars.icon(id, 80); } catch (e) { return ''; } }
  function ensureAgent(id) {
    if (!agents[id]) {
      agents[id] = { state: 'idle', task: '', tools: 0, active: new Set() };
      if (!personas[id]) personas[id] = { id: id, name: id, role: 'Helper', color: '#9a8f8a' };
    }
    return agents[id];
  }
  function renderRoster() {
    var el = $('roster'), html = '';
    Object.keys(personas).forEach(function (id) {
      var p = personas[id], a = ensureAgent(id);
      html += '<div class="card" data-state="' + a.state + '" style="--c:' + esc(p.color) + '">' +
        '<div class="avatar"><img alt="" src="' + avatarSrc(id) + '"></div>' +
        '<div><div class="nm">' + esc(p.name) + '<small>' + esc(p.role) + '</small></div>' +
        '<div class="task">' + esc(a.task || (a.state === 'idle' ? 'idle' : '')) + '</div></div>' +
        '<div class="st">' + esc(a.state) + (a.tools ? '<em>' + a.tools + ' tools</em>' : '') + '</div></div>';
    });
    el.innerHTML = html;
  }
  var rosterQueued = false;
  function rosterSoon() { if (replaying || rosterQueued) return; rosterQueued = true; setTimeout(function () { rosterQueued = false; renderRoster(); }, 80); }

  // ---------- chat ----------
  var msgs = $('msgs');
  function atBottom() { return msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 80; }
  function addMsg(ev) {
    var empty = $('empty'); if (empty) empty.remove();
    var stick = atBottom() || replaying;
    var p = personas[ev.agent] || { name: ev.agent === 'you' ? 'You' : (ev.agent || 'system'), color: '#9a8f8a' };
    var d = document.createElement('div');
    d.className = 'msg ' + (ev.role === 'user' ? 'user' : ev.role === 'system' ? 'system' : ev.role === 'agent' ? 'agent' : 'marcus');
    var ic = (ev.agent && personas[ev.agent]) ? '<img alt="" src="' + avatarSrc(ev.agent) + '">' : '<i style="background:' + esc(p.color) + '"></i>';
    d.innerHTML = '<div class="who" style="color:' + esc(p.color) + '">' + ic + esc(p.name) + '</div><div class="bubble">' + md(ev.text) + '</div>';
    msgs.appendChild(d);
    if (stick) msgs.scrollTop = msgs.scrollHeight;
  }

  // ---------- feed ----------
  var feed = $('feed');
  function addFeed(agentId, html) {
    var p = personas[agentId] || { name: agentId, color: '#9a8f8a' };
    var row = document.createElement('div');
    row.className = 'row'; row.style.setProperty('--c', p.color);
    row.innerHTML = '<b>' + esc(p.name) + '</b><span>' + html + '</span>';
    feed.appendChild(row);
    while (feed.childNodes.length > 400) feed.removeChild(feed.firstChild);
    var tab = $('tab-feed'); if (!replaying) tab.scrollTop = tab.scrollHeight;
  }

  // ---------- events ----------
  function onEvent(ev) {
    if (window.Demo && window.Demo.isRunning() && ev.t !== 'status' && ev.t !== 'replay-done' && ev.t !== 'init' && ev.t !== 'log' && !Doom.replaying) window.Demo.stop(true);
    if (ev.t !== 'status' && ev.t !== 'replay-done' && ev.t !== 'init' && ev.t !== 'log') { try { Doom.feed(ev); } catch (e) { /* views are optional */ } }
    switch (ev.t) {
      case 'chat': addMsg(ev); break;
      case 'tool':
        ensureAgent(ev.agent).tools++;
        addFeed(ev.agent, '<u>' + esc(ev.name) + '</u> ' + esc(ev.summary || ''));
        rosterSoon(); break;
      case 'agent': {
        if (ev.state === 'reset') { Object.keys(agents).forEach(function (k) { agents[k].state = 'idle'; agents[k].task = ''; agents[k].active.clear(); }); rosterSoon(); break; }
        var a = ensureAgent(ev.agent);
        if (ev.state === 'start') {
          a.active.add(ev.id); a.state = 'working'; a.task = ev.desc || 'working';
          addFeed(ev.from || 'marcus', 'called <u>' + esc((personas[ev.agent] || { name: ev.agent }).name) + '</u> ' + esc(ev.desc || ''));
        } else {
          a.active.delete(ev.id);
          if (!a.active.size) { a.state = ev.state === 'error' ? 'error' : 'done'; a.task = ev.state === 'error' ? 'failed' : 'finished'; }
          addFeed(ev.agent, (ev.state === 'error' ? 'failed' : 'finished') + (ev.summary ? ': ' + esc(ev.summary.replace(/\s+/g, ' ').slice(0, 160)) : ''));
        }
        rosterSoon(); loadFiles(); break;
      }
      case 'log': {
        var e = ev.event || { text: ev.text };
        addFeed(e.agentId || e.agent || 'marcus', 'event <u>' + esc(e.type || e.event || 'log') + '</u> ' + esc(String(e.message || e.title || e.text || '').slice(0, 140)));
        break;
      }
      case 'turn': addFeed('marcus', 'turn done' + (ev.ms ? ' in ' + Math.round(ev.ms / 1000) + 's' : '') + (ev.cost ? ', $' + Number(ev.cost).toFixed(2) : '')); loadFiles(); break;
      case 'status': setStatus(ev.state, ev.msg); break;
      case 'replay-done':
        replaying = false; Doom.replaying = false; try { if (view === 'pov') window.POV.setRunning(true); if (view === 'diagram') window.Diagram.setRunning(true); } catch (e) { /* ignore */ } renderRoster(); msgs.scrollTop = msgs.scrollHeight; $('tab-feed').scrollTop = 1e9; break;
      default: break;
    }
  }

  function setStatus(state, msg) {
    $('pill').dataset.state = state;
    $('pillText').textContent = state === 'ready' ? 'ready' : state === 'working' ? 'working' : state === 'starting' ? 'starting' : state === 'error' ? 'error' : 'offline';
    $('pill').title = msg || '';
    busy = state === 'working';
    var t = $('typing');
    t.hidden = !(state === 'working' || state === 'starting');
    $('typingText').textContent = state === 'starting' ? 'Starting Marcus' : 'Marcus is working';
    var mk = agents.marcus; if (mk && !replaying) { mk.state = state === 'working' ? 'working' : 'idle'; mk.task = state === 'working' ? 'orchestrating' : ''; rosterSoon(); }
    if (state === 'error' && msg) addMsg({ role: 'system', agent: 'system', text: msg });
    if (state === 'stopped' && msg && !replaying) addMsg({ role: 'system', agent: 'system', text: msg + ' Send a message to start him again.' });
  }

  function connect() {
    var es = new EventSource('/api/events?t=' + encodeURIComponent(TOKEN));
    es.onmessage = function (m) { try { onEvent(JSON.parse(m.data)); } catch (e) { /* ignore */ } };
    es.onerror = function () { setStatus('error', ''); $('pillText').textContent = 'reconnecting'; };
  }

  // ---------- files ----------
  function ago(ms) { var s = Math.max(1, Math.round((Date.now() - ms) / 1000)); return s < 90 ? s + 's' : s < 5400 ? Math.round(s / 60) + 'm' : Math.round(s / 3600) + 'h'; }
  var filesTimer = null;
  function loadFiles() {
    clearTimeout(filesTimer);
    filesTimer = setTimeout(function () {
      api('/api/files').then(function (r) {
        var ul = $('files'); ul.innerHTML = '';
        if (!r.files || !r.files.length) { ul.innerHTML = '<li class="none">Nothing yet. Specs, reports and the project map appear here.</li>'; return; }
        r.files.forEach(function (f) {
          var li = document.createElement('li'), b = document.createElement('button');
          b.innerHTML = '<span>' + esc(f.path) + '</span><small>' + ago(f.mtime) + '</small>';
          b.onclick = function () { openFile(f.path); };
          li.appendChild(b); ul.appendChild(li);
        });
      }).catch(function () { /* ignore */ });
    }, 300);
  }
  function openFile(p) {
    api('/api/file?p=' + encodeURIComponent(p)).then(function (r) {
      $('modalTitle').textContent = p; $('modalBody').textContent = r.text || r.error || ''; $('modal').hidden = false;
    });
  }
  $('modalClose').onclick = function () { $('modal').hidden = true; };
  $('modal').onclick = function (e) { if (e.target === $('modal')) $('modal').hidden = true; };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('modal').hidden = true; });
  $('btnRefresh').onclick = loadFiles;

  // ---------- input ----------
  var input = $('input');
  function send(text) {
    text = (text || '').trim(); if (!text) return;
    post('/api/message', { text: text }).then(function (r) { if (r && r.ok === false) addMsg({ role: 'system', agent: 'system', text: 'Could not reach Marcus. Check the terminal.' }); });
    input.value = '';
  }
  $('form').onsubmit = function (e) { e.preventDefault(); send(input.value); };
  input.onkeydown = function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(input.value); } };
  $('qStatus').onclick = function () { send('status'); };
  $('qApprove').onclick = function () { if (confirm('Approve and merge the escalated branch?')) send('approve'); };
  $('qReject').onclick = function () { var r = prompt('Why reject? Marcus sends this to Forge as the finding.'); if (r && r.trim()) send('reject ' + r.trim()); };
  $('btnStop').onclick = function () { if (!busy || confirm('Marcus is working. Stop him now?')) post('/api/stop'); };
  $('btnNew').onclick = function () { if (confirm('Start a fresh Marcus session? The chat history stays, his memory of this run does not.')) post('/api/new'); };

  // tabs
  Array.prototype.forEach.call(document.querySelectorAll('.tabs button'), function (b) {
    b.onclick = function () {
      Array.prototype.forEach.call(document.querySelectorAll('.tabs button'), function (x) { x.classList.toggle('on', x === b); });
      ['agents', 'feed', 'files'].forEach(function (t) { $('tab-' + t).hidden = (t !== b.dataset.tab); });
      if (b.dataset.tab === 'files') loadFiles();
    };
  });
  Array.prototype.forEach.call(document.querySelectorAll('#mobileTabs button'), function (b) {
    b.onclick = function () {
      Array.prototype.forEach.call(document.querySelectorAll('#mobileTabs button'), function (x) { x.classList.toggle('on', x === b); });
      document.body.classList.toggle('show-side', b.dataset.pane === 'side');
    };
  });


  // ---------- view modes ----------
  var view = 'chat', projName = '';
  function setView(v, remember) {
    if (v !== 'chat' && v !== 'pov' && v !== 'diagram') v = 'chat';
    view = v; document.body.dataset.view = v;
    Array.prototype.forEach.call(document.querySelectorAll('#views button'), function (b) { b.classList.toggle('on', b.dataset.view === v); });
    $('demoBox').hidden = v === 'chat';
    try { if (remember !== false) localStorage.setItem('doomView', v); } catch (e) { /* ignore */ }
    if (v === 'pov') { window.POV.init($('povCanvas'), projName); window.POV.setProject(projName); window.POV.setRunning(true); }
    else if (window.POV) window.POV.setRunning(false);
    if (v === 'diagram') { window.Diagram.init($('diagHost'), $('dpanel')); window.Diagram.setRunning(true); }
    else if (window.Diagram) window.Diagram.setRunning(false);
    if (v === 'chat') $('msgs').scrollTop = $('msgs').scrollHeight;
  }
  Array.prototype.forEach.call(document.querySelectorAll('#views button'), function (b) { b.onclick = function () { setView(b.dataset.view); }; });
  function runDemo(kind) {
    if (busy) { addMsg({ role: 'system', agent: 'system', text: 'Marcus is working right now, so the demo is off. Try again when he is idle.' }); return; }
    $('demoBox').classList.add('playing'); $('demoStop').hidden = false;
    window.Demo.run(kind, function () { $('demoBox').classList.remove('playing'); $('demoStop').hidden = true; });
  }
  $('demoStop').onclick = function () { window.Demo.stop(true); };
  $('demoA').onclick = function () { runDemo('merge'); };
  $('demoB').onclick = function () { runDemo('escalate'); };
  document.addEventListener('keydown', function (e) { if (e.altKey && /^[123]$/.test(e.key)) setView(['chat', 'pov', 'diagram'][+e.key - 1]); });

  // ---------- boot ----------
  api('/api/state').then(function (s) {
    if (s.error) { document.body.innerHTML = '<p style="padding:24px;font-family:monospace">Bad or missing token. Open the URL printed in your terminal.</p>'; return; }
    s.personas.forEach(function (p) { personas[p.id] = p; agents[p.id] = { state: 'idle', task: '', tools: 0, active: new Set() }; });
    var g = s.git || {};
    $('proj').textContent = s.cwd + (g.repo ? '   [' + g.branch + (g.dirty ? ', ' + g.dirty + ' uncommitted' : '') + ']' : '   [not a git repo]');
    $('proj').title = s.cwd;
    document.title = 'DOOM-Bots · ' + s.name;
    projName = s.name;
    var saved = 'chat'; try { saved = (location.hash || '').replace('#', '') || localStorage.getItem('doomView') || 'chat'; } catch (e) { /* ignore */ }
    $('modeBadge').hidden = !s.yolo;
    renderRoster(); loadFiles(); connect(); setView(saved, false);
  }).catch(function () { document.body.innerHTML = '<p style="padding:24px;font-family:monospace">DOOM-Bots server is not running.</p>'; });
  setInterval(function () { if (!replaying) loadFiles(); }, 15000);
})();
