'use strict';
// Diagram mode: the factory line as a live flow chart. Nodes light up while their agent works,
// and pulses travel along the edges when work, reports, defects and approvals move.
(function (root) {
  var NS = 'http://www.w3.org/2000/svg';
  var W = 1000, H = 520;
  var COL = { marcus: '#ff5a36', 'codebase-mapper': '#e0b84a', 'spec-writer': '#4aa8e0', builder: '#f08a2c', 'security-reviewer': '#e04a6a', 'ux-reviewer': '#5ac88c', 'ui-design-reviewer': '#b07af0', 'code-reviewer': '#4ad0d0', approver: '#d8d8e0', you: '#8ae8a0', main: '#5ae88c' };
  var META = {
    marcus: ['Marcus', 'Orchestrator'], 'codebase-mapper': ['Scout', 'Mapper'], 'spec-writer': ['Sage', 'Spec writer'], builder: ['Forge', 'Builder'],
    'security-reviewer': ['Warden', 'Security'], 'ux-reviewer': ['Iris', 'UX'], 'ui-design-reviewer': ['Muse', 'UI design'], 'code-reviewer': ['Cato', 'Code'],
    approver: ['Themis', 'Approver'], you: ['You', 'Human'], main: ['main', 'Merged code']
  };
  // center x, y, width, height
  var G = {
    you: [90, 60, 110, 56], marcus: [500, 60, 170, 60], main: [930, 60, 100, 56],
    'codebase-mapper': [70, 290, 104, 62], 'spec-writer': [200, 290, 104, 62], builder: [335, 290, 104, 62],
    'security-reviewer': [515, 250, 118, 54], 'ux-reviewer': [655, 250, 118, 54], 'ui-design-reviewer': [515, 330, 118, 54], 'code-reviewer': [655, 330, 118, 54],
    approver: [830, 290, 104, 62]
  };
  var GROUP = [440, 205, 290, 160];   // x, y, w, h
  var BUS_Y = 140, MARCUS_BOTTOM = 90;

  var svg, nodes = {}, edges = {}, pulses = [], pulseLayer, running = false, raf = 0, last = 0, T = 0, panel, panelBody, selected = null, inited = false, routeTxt, loopTxt;

  function el(tag, attrs, parent, text) { var e = document.createElementNS(NS, tag); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); }); if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; }

  function nodeBox(id) { var g = G[id]; return { x: g[0] - g[2] / 2, y: g[1] - g[3] / 2, w: g[2], h: g[3], cx: g[0], cy: g[1] }; }

  // task path from Marcus to an agent through the orchestration bus
  function busPath(id) {
    var b = nodeBox(id), mx = G.marcus[0];
    if (id === 'you') return 'M' + (G.marcus[0] - 85) + ',' + G.marcus[1] + ' H' + (b.x + b.w);
    if (id === 'main') return 'M' + (G.marcus[0] + 85) + ',' + G.marcus[1] + ' H' + b.x;
    if (/reviewer/.test(id)) { var gx = GROUP[0] + GROUP[2] / 2; var side = b.cx < gx ? b.x + b.w : b.x; return 'M' + mx + ',' + MARCUS_BOTTOM + ' V' + BUS_Y + ' H' + gx + ' V' + b.cy + ' H' + side; }
    return 'M' + mx + ',' + MARCUS_BOTTOM + ' V' + BUS_Y + ' H' + b.cx + ' V' + b.y;
  }
  var PIPE = {
    'scout>sage': 'M' + (70 + 52) + ',290 H' + (200 - 52), 'sage>forge': 'M' + (200 + 52) + ',290 H' + (335 - 52),
    'forge>review': 'M' + (335 + 52) + ',290 H' + GROUP[0],
    'review>themis': 'M' + (GROUP[0] + GROUP[2]) + ',290 H' + (830 - 52),
    'loop': 'M' + (GROUP[0] + GROUP[2] / 2) + ',' + (GROUP[1] + GROUP[3]) + ' V' + 430 + ' H' + 335 + ' V' + (290 + 31)
  };

  function build(host) {
    host.innerHTML = '';
    svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, preserveAspectRatio: 'xMidYMid meet', 'class': 'dg' }, host);
    var defs = el('defs', {}, svg);
    var m = el('marker', { id: 'arr', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, defs); el('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#6a5a78' }, m);
    var m2 = el('marker', { id: 'arrR', viewBox: '0 0 10 10', refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: 'auto-start-reverse' }, defs); el('path', { d: 'M0,0 L10,5 L0,10 z', fill: '#ff4a5a' }, m2);
    var glow = el('filter', { id: 'glow', x: '-40%', y: '-40%', width: '180%', height: '180%' }, defs); el('feGaussianBlur', { stdDeviation: 3, result: 'b' }, glow); var mg = el('feMerge', {}, glow); el('feMergeNode', { 'in': 'b' }, mg); el('feMergeNode', { 'in': 'SourceGraphic' }, mg);

    // title row
    el('text', { x: 20, y: 22, 'class': 'dg-title' }, svg, 'DOOM-BOTS · FLOW');
    routeTxt = el('text', { x: 980, y: 22, 'text-anchor': 'end', 'class': 'dg-route' }, svg, '');

    // bus (orchestration) lines, faint
    var busLayer = el('g', {}, svg);
    ['codebase-mapper', 'spec-writer', 'builder', 'approver', 'security-reviewer', 'ux-reviewer', 'ui-design-reviewer', 'code-reviewer', 'you', 'main'].forEach(function (id) {
      edges['bus:' + id] = el('path', { d: busPath(id), 'class': 'dg-edge bus', fill: 'none' }, busLayer);
    });
    el('text', { x: 24, y: 128, 'class': 'dg-cap faint' }, svg, 'Marcus talks to every agent (lines glow when he does)');

    // group box
    el('rect', { x: GROUP[0], y: GROUP[1], width: GROUP[2], height: GROUP[3], rx: 12, 'class': 'dg-group' }, svg);
    el('text', { x: GROUP[0] + 12, y: GROUP[1] - 7, 'class': 'dg-cap' }, svg, 'PARALLEL REVIEW');

    // pipeline edges
    var pl = el('g', {}, svg);
    Object.keys(PIPE).forEach(function (k) {
      var cls = 'dg-edge pipe' + (k === 'loop' ? ' loop' : '');
      edges[k] = el('path', { d: PIPE[k], 'class': cls, fill: 'none', 'marker-end': k === 'loop' ? 'url(#arrR)' : 'url(#arr)' }, pl);
    });
    loopTxt = el('text', { x: 470, y: 452, 'class': 'dg-loop' }, svg, 'CHANGES → back to Forge (max 2 loops)');
    el('text', { x: 280, y: 52, 'text-anchor': 'middle', 'class': 'dg-cap' }, svg, 'request · approve');
    el('text', { x: 732, y: 52, 'text-anchor': 'middle', 'class': 'dg-cap ok' }, svg, 'merge');

    // nodes
    var nl = el('g', {}, svg);
    Object.keys(G).forEach(function (id) { nodes[id] = makeNode(id, nl); });

    pulseLayer = el('g', {}, svg);

    // legend
    var lg = el('g', { transform: 'translate(24,486)' }, svg);
    [['task', '#ff9a3a'], ['report', '#5ae88c'], ['defect', '#ff4a5a'], ['escalate', '#ffb02a']].forEach(function (l, i) { el('circle', { cx: i * 110 + 6, cy: 0, r: 5, fill: l[1] }, lg); el('text', { x: i * 110 + 16, y: 4, 'class': 'dg-cap' }, lg, l[0]); });
    el('text', { x: 470, y: 490, 'class': 'dg-cap' }, svg, 'Click any node for its latest activity');
  }

  function makeNode(id, parent) {
    var b = nodeBox(id), col = COL[id], meta = META[id];
    var g = el('g', { 'class': 'dg-node', 'data-id': id, transform: 'translate(' + b.x + ',' + b.y + ')', tabindex: 0, role: 'button', 'aria-label': meta[0] + ' ' + meta[1] }, parent);
    var rect = el('rect', { width: b.w, height: b.h, rx: 10, 'class': 'dg-rect', style: '--c:' + col }, g);
    var ring = el('rect', { x: -3, y: -3, width: b.w + 6, height: b.h + 6, rx: 13, 'class': 'dg-ring', style: '--c:' + col }, g);
    var size = id === 'marcus' ? 40 : 34;
    if (id !== 'main') {
      var img = el('image', { x: 8, y: (b.h - size) / 2, width: size, height: size, 'class': 'dg-av' }, g);
      img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', window.Avatars.icon(id, 64)); img.setAttribute('href', window.Avatars.icon(id, 64));
    } else {
      el('path', { d: 'M12,40 L22,8 L32,40 M18,28 H26', stroke: col, 'stroke-width': 3, fill: 'none', transform: 'translate(2,2)' }, g);
    }
    var tx = id === 'main' ? 44 : size + 16;
    el('text', { x: tx, y: id === 'marcus' ? 25 : 22, 'class': 'dg-name', fill: col }, g, meta[0]);
    el('text', { x: tx, y: id === 'marcus' ? 42 : 37, 'class': 'dg-role' }, g, meta[1]);
    var status = el('text', { x: tx, y: b.h - 8, 'class': 'dg-status' }, g, '');
    var badge = el('g', { transform: 'translate(' + (b.w - 10) + ',-2)', 'class': 'dg-badge' }, g);
    el('circle', { r: 9, cx: 0, cy: 0 }, badge); var bt = el('text', { x: 0, y: 3.5, 'text-anchor': 'middle' }, badge, '');
    g.addEventListener('click', function () { select(id); });
    g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(id); } });
    return { g: g, rect: rect, status: status, badge: badge, bt: bt, state: 'idle', flash: 0, lim: Math.max(8, Math.floor((b.w - tx - 8) / 5.9)) };
  }

  function setNode(id, state, text, badgeText) {
    var n = nodes[id]; if (!n) return;
    n.state = state;
    n.g.setAttribute('class', 'dg-node ' + state + (selected === id ? ' sel' : ''));
    if (text != null) { var lim = n.lim || 20; n.status.textContent = text.length > lim ? text.slice(0, lim - 1) + '…' : text; }
    if (badgeText != null) { n.bt.textContent = badgeText; n.badge.style.display = badgeText === '' ? 'none' : ''; }
  }

  function pathFor(key) { return edges[key]; }
  function pulse(pathEl, col, opts) {
    if (!pathEl || !running && !opts) return;
    opts = opts || {};
    var len = pathEl.getTotalLength(); if (!len) return;
    var c = el('circle', { r: opts.r || 5, fill: col, filter: 'url(#glow)' }, pulseLayer);
    var tr = []; for (var i = 0; i < 4; i++) tr.push(el('circle', { r: (opts.r || 5) - 1 - i * 0.8, fill: col, opacity: 0.5 - i * 0.11 }, pulseLayer));
    pulses.push({ p: pathEl, len: len, t: 0, dur: opts.dur || Math.max(0.7, len / 520), rev: !!opts.rev, c: c, tr: tr, col: col });
    pathEl.classList.add('lit'); pathEl.style.setProperty('--lc', col);
    setTimeout(function () { pathEl.classList.remove('lit'); }, (opts.dur || 0.9) * 1000 + 700);
  }
  function stepPulses(dt) {
    for (var i = pulses.length - 1; i >= 0; i--) {
      var p = pulses[i]; p.t += dt; var k = Math.min(1, p.t / p.dur);
      var at = function (kk) { var l = (p.rev ? 1 - kk : kk) * p.len; var pt = p.p.getPointAtLength(Math.max(0, Math.min(p.len, l))); return pt; };
      var pt = at(k); p.c.setAttribute('cx', pt.x); p.c.setAttribute('cy', pt.y);
      p.tr.forEach(function (c, j) { var q = at(Math.max(0, k - (j + 1) * 0.03)); c.setAttribute('cx', q.x); c.setAttribute('cy', q.y); });
      if (k >= 1) { pulseLayer.removeChild(p.c); p.tr.forEach(function (c) { pulseLayer.removeChild(c); }); pulses.splice(i, 1); }
    }
  }
  function loop(now) {
    raf = requestAnimationFrame(loop);
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now; T += dt;
    if (running) stepPulses(dt);
  }

  // ---------- story ----------
  var REVIEW = { 'security-reviewer': 1, 'ux-reviewer': 1, 'ui-design-reviewer': 1, 'code-reviewer': 1 };
  var reviewRound = 0;
  function counts(id) { var a = root.Doom.state.agents[id] || {}; return (a.runs || 0) + '× · ' + (a.tools || 0) + ' tools'; }

  function onStart(d) {
    var id = d.agent; if (!nodes[id]) return;
    setNode(id, 'working', d.desc || 'working', '');
    pulse(edges['bus:' + id], COL[id]);
    if (id === 'spec-writer' && root.Doom.state.agents['codebase-mapper'] && root.Doom.state.agents['codebase-mapper'].runs) pulse(edges['scout>sage'], '#ff9a3a');
    if (id === 'builder' && root.Doom.state.agents['spec-writer'] && root.Doom.state.agents['spec-writer'].runs && root.Doom.state.builderRuns <= 1) pulse(edges['sage>forge'], '#ff9a3a');
    if (REVIEW[id] && !reviewRound) { reviewRound = 1; pulse(edges['forge>review'], '#ff9a3a'); }
    if (id === 'approver') { reviewRound = 0; pulse(edges['review>themis'], '#ff9a3a'); }
    if (id === 'builder') reviewRound = 0;
  }
  function onDone(d) {
    var id = d.agent; if (!nodes[id]) return;
    var v = d.verdict, col = v === 'changes' || v === 'error' ? '#ff4a5a' : v === 'escalate' ? '#ffb02a' : '#5ae88c';
    var stateName = v === 'changes' || v === 'error' ? 'bad' : (root.Doom.state.agents[id] && root.Doom.state.agents[id].active) ? 'working' : 'done';
    var label = v === 'pass' ? 'PASS' : v === 'changes' ? 'CHANGES' : v === 'approve' ? 'APPROVED' : v === 'escalate' ? 'ESCALATE' : v === 'rereview' ? 'RE-REVIEW' : v === 'error' ? 'FAILED' : 'done';
    setNode(id, stateName, label, v === 'pass' || v === 'approve' || v === 'none' ? '✓' : v === 'changes' || v === 'error' ? '✗' : '!');
    pulse(edges['bus:' + id], col, { rev: true });
    if (selected === id) showPanel(id);
  }
  function onDefect() { pulse(edges.loop, '#ff4a5a', { dur: 1.3 }); edges.loop.classList.add('hot'); setTimeout(function () { edges.loop.classList.remove('hot'); }, 2600); }
  function onLoop(d) { loopTxt.textContent = 'FIX LOOP ' + d.n + '/2: Forge is fixing the findings'; loopTxt.classList.add('hot'); setTimeout(function () { loopTxt.classList.remove('hot'); }, 3000); }
  function onMerge() { pulse(edges['bus:main'], '#5ae88c', { dur: 1.2 }); setTimeout(function () { setNode('main', 'done', 'merged', '✓'); }, 1100); }
  function onEscalate() { setTimeout(function () { pulse(edges['bus:you'], '#ffb02a', { dur: 1.2 }); setNode('you', 'working', 'decision needed', '!'); }, 1000); }
  function onApprove() { pulse(edges['bus:you'], '#5ae88c', { rev: true }); setNode('you', 'done', 'approved', '✓'); }
  function onRequest(d) { pulse(edges['bus:you'], COL.you, { rev: true }); setNode('you', 'done', 'request sent', ''); setNode('marcus', 'working', 'orchestrating', ''); Object.keys(nodes).forEach(function (id) { if (id !== 'you' && id !== 'marcus') setNode(id, 'idle', '', ''); }); setNode('main', 'idle', '', ''); reviewRound = 0; loopTxt.textContent = 'CHANGES → back to Forge (max 2 loops)'; applyRoute(''); }
  function applyRoute(r) { routeTxt.textContent = r ? 'ROUTE: ' + r.toUpperCase() : ''; nodes['codebase-mapper'].g.classList.toggle('skip', r === 'new'); }
  function onIdle() { if (nodes.marcus.state === 'working') setNode('marcus', 'idle', 'waiting for you', ''); }
  function onReset() { Object.keys(nodes).forEach(function (id) { setNode(id, 'idle', '', ''); }); pulses.forEach(function (p) { try { pulseLayer.removeChild(p.c); p.tr.forEach(function (c) { pulseLayer.removeChild(c); }); } catch (e) { /* ignore */ } }); pulses = []; reviewRound = 0; applyRoute(''); loopTxt.textContent = 'CHANGES → back to Forge (max 2 loops)'; if (panel) panel.hidden = true; selected = null; }
  function onActivity(d) { var n = nodes[d.agent]; if (!n) return; if (n.state === 'working') n.status.textContent = (d.name + ' ' + (d.summary || '').replace(/^.*[\\/]/, '')).slice(0, n.lim || 20); n.rect.classList.add('tick'); setTimeout(function () { n.rect.classList.remove('tick'); }, 180); if (selected === d.agent) showPanel(d.agent); }
  function onSay(d) { if (selected === d.agent) showPanel(d.agent); }

  // ---------- detail panel ----------
  function select(id) { selected = id; Object.keys(nodes).forEach(function (k) { nodes[k].g.classList.toggle('sel', k === id); }); showPanel(id); }
  function showPanel(id) {
    var a = root.Doom.state.agents[id] || {}, m = META[id];
    panel.hidden = false;
    panelBody.innerHTML = '';
    var h = document.createElement('div'); h.className = 'ph'; h.innerHTML = '<b style="color:' + COL[id] + '"></b> <span></span>'; h.firstChild.textContent = m[0]; h.lastChild.textContent = m[1] + ' · ' + (a.state || 'idle');
    var rows = [['Task', a.task || '—'], ['Last said', a.say || '—'], ['Last tool', a.tool || '—'], ['Verdict', a.verdict && a.verdict !== 'none' ? a.verdict : '—'], ['Runs', (a.runs || 0) + ' · ' + (a.tools || 0) + ' tool calls']];
    panelBody.appendChild(h);
    rows.forEach(function (r) { var d = document.createElement('div'); d.className = 'pr'; var k = document.createElement('i'); k.textContent = r[0]; var v = document.createElement('span'); v.textContent = String(r[1]).slice(0, 400); d.appendChild(k); d.appendChild(v); panelBody.appendChild(d); });
  }

  function sync() {
    var S = root.Doom.state;
    Object.keys(S.agents).forEach(function (id) { var a = S.agents[id]; if (!nodes[id]) return; var st = a.state === 'working' ? 'working' : (a.verdict === 'changes' || a.verdict === 'error') ? 'bad' : a.state === 'done' ? 'done' : 'idle'; setNode(id, st, a.state === 'working' ? a.task : '', st === 'done' ? '✓' : st === 'bad' ? '✗' : ''); });
    applyRoute(S.route || '');
  }

  function init(host, panelEl) {
    if (inited) return; inited = true;
    build(host); panel = panelEl; panelBody = panel.querySelector('.pbody');
    panel.querySelector('.pclose').onclick = function () { panel.hidden = true; selected = null; Object.keys(nodes).forEach(function (k) { nodes[k].g.classList.remove('sel'); }); };
    var D = root.Doom;
    D.on('start', onStart); D.on('done', onDone); D.on('defect', onDefect); D.on('loop', onLoop); D.on('merge', onMerge); D.on('escalate', onEscalate); D.on('approve', onApprove);
    D.on('request', onRequest); D.on('idle', onIdle); D.on('reset', onReset); D.on('activity', onActivity); D.on('say', onSay); D.on('route', function (d) { applyRoute(d.route); });
    sync(); last = performance.now(); raf = requestAnimationFrame(loop);
  }
  function setRunning(v) { running = !!v; if (v) sync(); }

  root.Diagram = { init: init, setRunning: setRunning };
})(window);
