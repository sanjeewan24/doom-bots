'use strict';
// POV mode: a living pixel-art HQ. Everything that moves is driven by real events (or the demo script).
(function (root) {
  var LW = 480, LH = 270;
  var FY = { U: 128, G: 222 };                       // floor feet y
  var LADDERS = [124, 378];
  var HOME = {
    marcus: { x: 62, f: 'U' }, 'codebase-mapper': { x: 216, f: 'U' }, 'spec-writer': { x: 318, f: 'U' }, you: { x: 436, f: 'U' },
    builder: { x: 62, f: 'G' }, 'security-reviewer': { x: 160, f: 'G' }, 'ux-reviewer': { x: 214, f: 'G' },
    'ui-design-reviewer': { x: 268, f: 'G' }, 'code-reviewer': { x: 322, f: 'G' }, approver: { x: 384, f: 'G' }
  };
  var NAMES = { marcus: 'Marcus', 'codebase-mapper': 'Scout', 'spec-writer': 'Sage', builder: 'Forge', 'security-reviewer': 'Warden', 'ux-reviewer': 'Iris', 'ui-design-reviewer': 'Muse', 'code-reviewer': 'Cato', approver: 'Themis', you: 'You' };
  var COL = { marcus: '#ff5a36', 'codebase-mapper': '#e0b84a', 'spec-writer': '#4aa8e0', builder: '#f08a2c', 'security-reviewer': '#e04a6a', 'ux-reviewer': '#5ac88c', 'ui-design-reviewer': '#b07af0', 'code-reviewer': '#4ad0d0', approver: '#d8d8e0', you: '#9aa0b0' };
  var SLEEPERS = { builder: 1, 'security-reviewer': 1, 'ux-reviewer': 1, 'ui-design-reviewer': 1, 'code-reviewer': 1, approver: 1, 'codebase-mapper': 1, 'spec-writer': 1 };

  var cv, ctx, wc, wx, bg, sky2, running = false, raf = 0, last = 0, T = 0, S = 1, OX = 0, OY = 0, DPR = 1;
  var ents = {}, parts = [], flights = [], crates = [], banners = [], ticker = [], shake = 0, flash = 0;
  var alarm = { red: 0, amber: 0 }, rocket = { y: 0, vy: 0, state: 'idle', t: 0 }, bell = 0, stampT = 0, stampText = '', stampCol = '#3c3', loopSign = { n: 0, t: 0 }, routeChip = '';
  var project = '', inited = false, ready = false;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function mix(a, b, k) {
    var A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
    var r = Math.round((A >> 16) + ((B >> 16) - (A >> 16)) * k), g = Math.round(((A >> 8) & 255) + (((B >> 8) & 255) - ((A >> 8) & 255)) * k), bl = Math.round((A & 255) + ((B & 255) - (A & 255)) * k);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1);
  }

  // ---------- sky ----------
  var SKY = [[0, '#080616', '#241034'], [5, '#0a0a22', '#2a1238'], [6.5, '#3a2a62', '#f08a5a'], [8, '#3a88d8', '#b0dcf4'], [16, '#3a88d8', '#a8d4f0'], [18, '#4a2a6a', '#ff7a42'], [20, '#10102a', '#3a1a44'], [24, '#080616', '#241034']];
  function skyColors(h) {
    for (var i = 0; i < SKY.length - 1; i++) {
      if (h >= SKY[i][0] && h <= SKY[i + 1][0]) { var k = (h - SKY[i][0]) / (SKY[i + 1][0] - SKY[i][0]); return [mix(SKY[i][1], SKY[i + 1][1], k), mix(SKY[i][2], SKY[i + 1][2], k)]; }
    }
    return [SKY[0][1], SKY[0][2]];
  }
  function nightness(h) { return h < 5 || h > 20 ? 1 : h < 7 ? 1 - (h - 5) / 2 : h > 18 ? (h - 18) / 2 : 0; }
  var stars = [], clouds = [], cars = [], birds = [];
  for (var si = 0; si < 60; si++) stars.push([Math.random() * LW, Math.random() * 120, Math.random() * 6]);
  for (var ci = 0; ci < 5; ci++) clouds.push({ x: Math.random() * LW, y: 10 + Math.random() * 40, w: 24 + Math.random() * 30, v: 2 + Math.random() * 4 });

  function drawSky(c, t) {
    var d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (root.__povHour != null) h = root.__povHour;
    var col = skyColors(h), n = nightness(h);
    for (var y = 0; y < 250; y += 5) R(c, 0, y, LW, 5, mix(col[0], col[1], y / 250));
    stars.forEach(function (s) { if (n > 0.2) { var a = (0.4 + 0.6 * Math.abs(Math.sin(t * 1.3 + s[2]))) * n; c.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')'; c.fillRect(Math.round(s[0]), Math.round(s[1]), 1, 1); } });
    // sun / moon arc
    var sunK = clamp((h - 6) / 12, -0.2, 1.2), mk = ((h + 6) % 24) / 12 - 0.0;
    if (n < 0.9) { var sx = 30 + sunK * 420, sy = 120 - Math.sin(clamp(sunK, 0, 1) * Math.PI) * 100; R(c, sx - 6, sy - 6, 12, 12, '#fff0a0'); R(c, sx - 8, sy - 4, 16, 8, 'rgba(255,240,160,.35)'); R(c, sx - 4, sy - 8, 8, 16, 'rgba(255,240,160,.35)'); }
    if (n > 0.3) { var mx = 40 + (((h >= 18 ? h - 18 : h + 6) / 12)) * 400, my = 110 - Math.sin(clamp(((h >= 18 ? h - 18 : h + 6) / 12), 0, 1) * Math.PI) * 80; R(c, mx - 5, my - 5, 10, 10, '#e8ecff'); R(c, mx - 2, my - 5, 6, 10, '#c0c8e8'); R(c, mx + 2, my - 3, 2, 2, '#a8b0d0'); }
    clouds.forEach(function (cl) { cl.x += cl.v * 0.016; if (cl.x > LW + 40) cl.x = -60; var cc = n > 0.5 ? 'rgba(80,70,110,.5)' : 'rgba(255,255,255,.75)'; R(c, cl.x, cl.y, cl.w, 5, cc); R(c, cl.x + 5, cl.y - 3, cl.w - 12, 4, cc); });
    return n;
  }

  // ---------- static background ----------
  function buildBg() {
    bg = document.createElement('canvas'); bg.width = LW; bg.height = LH; var bx = bg.getContext('2d');
    var c = bx;
    // skyline silhouettes (two layers)
    var seed = 7; function rr() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
    [['#140c22', 150, 40], ['#0e0818', 175, 60]].forEach(function (L, li) {
      for (var x = -10; x < LW + 10;) { var w = 14 + Math.floor(rr() * 26), h = L[2] + Math.floor(rr() * 70); R(c, x, 250 - h, w, h, L[0]);
        for (var wy = 250 - h + 4; wy < 246; wy += 6) for (var wx2 = x + 3; wx2 < x + w - 3; wx2 += 5) if (rr() > 0.62) R(c, wx2, wy, 2, 3, li ? '#6a5a2a' : '#8a7a3a');
        x += w + 2; }
    });
    // street
    R(c, 0, 248, LW, 22, '#16121c'); R(c, 0, 248, LW, 1, '#2a2438');
    for (var rx = 6; rx < LW; rx += 28) R(c, rx, 259, 14, 2, '#3a3448');
    // building shell
    R(c, 4, 36, 472, 202, '#0e0a12');
    R(c, 6, 38, 468, 6, '#2a2030'); R(c, 6, 38, 468, 1, '#4a3a58');   // roof slab
    // upper rooms
    var U = [[8, 168, '#2a1a22', '#3a2630'], [168, 262, '#1c2430', '#2a3444'], [262, 374, '#241c30', '#34283f'], [374, 472, '#1c2620', '#2a3a30']];
    U.forEach(function (r) { R(c, r[0], 44, r[1] - r[0], 84, r[2]); for (var y = 44; y < 128; y += 12) R(c, r[0], y, r[1] - r[0], 1, r[3]); });
    // ground rooms
    var G = [[8, 128, '#2e1a14', '#44281c'], [128, 338, '#1a222c', '#263240'], [338, 420, '#241c2a', '#362a3e'], [420, 472, '#1a2430', '#2a3646']];
    G.forEach(function (r) { R(c, r[0], 134, r[1] - r[0], 88, r[2]); for (var y = 134; y < 222; y += 12) R(c, r[0], y, r[1] - r[0], 1, r[3]); });
    // slabs / floors
    R(c, 6, 128, 468, 6, '#3a2c34'); R(c, 6, 128, 468, 1, '#6a5668'); R(c, 6, 222, 468, 6, '#3a2c34'); R(c, 6, 222, 468, 1, '#6a5668');
    // floor hatch for ladders
    LADDERS.forEach(function (lx) { R(c, lx - 5, 128, 10, 6, '#0e0a12'); for (var y = 100; y < 222; y += 5) { R(c, lx - 4, y, 1, 4, '#a89870'); R(c, lx + 3, y, 1, 4, '#a89870'); if (y > 98) R(c, lx - 4, y + 2, 8, 1, '#a89870'); } });
    // partitions (with door gaps)
    [168, 262, 374].forEach(function (x) { R(c, x - 1, 44, 2, 40, '#0e0a12'); R(c, x - 1, 112, 2, 16, '#0e0a12'); R(c, x - 2, 82, 4, 2, '#4a3a58'); });
    [128, 338, 420].forEach(function (x) { R(c, x - 1, 134, 2, 38, '#0e0a12'); R(c, x - 1, 200, 2, 22, '#0e0a12'); R(c, x - 2, 170, 4, 2, '#4a3a58'); });
    [180, 236, 290].forEach(function (x) { R(c, x, 180, 2, 42, '#10161e'); R(c, x - 1, 180, 4, 2, '#3a4a5a'); });
    // windows on exterior walls
    [[14, 52], [14, 150]].forEach(function (w) { R(c, w[0], w[1], 12, 16, '#0a0610'); R(c, w[0] + 1, w[1] + 1, 10, 14, '#18283a'); });
    // belt trench
    R(c, 6, 228, 468, 14, '#120e16'); R(c, 6, 232, 468, 6, '#2a2a34'); R(c, 6, 232, 468, 1, '#5a5a6a');
    // --- room props (static parts) ---
    // Bridge: console desk + big screen frame
    R(c, 18, 52, 84, 42, '#0a0a12'); R(c, 20, 54, 80, 38, '#0c1a22'); R(c, 18, 52, 84, 1, '#4a5a6a');
    R(c, 100, 110, 50, 4, '#3a2a30'); R(c, 100, 114, 50, 14, '#241820'); // holo table
    R(c, 106, 106, 8, 4, '#6a3a30'); R(c, 108, 104, 4, 2, '#fff');         // mug on table
    R(c, 12, 118, 14, 10, '#3a1a1a'); R(c, 12, 118, 14, 2, '#c8321a');      // chair/cape stand
    // Scout: wall map + desk
    R(c, 176, 54, 60, 36, '#c8b078'); R(c, 178, 56, 56, 32, '#d8c68e');
    for (var i = 0; i < 9; i++) { R(c, 180 + i * 6, 58, 1, 28, 'rgba(120,90,50,.35)'); }
    R(c, 180, 66, 14, 10, '#7aa860'); R(c, 200, 60, 20, 8, '#5a98c8'); R(c, 210, 72, 18, 12, '#8aa868'); R(c, 186, 78, 8, 6, '#5a98c8');
    R(c, 232, 100, 28, 4, '#4a3420'); R(c, 234, 104, 3, 24, '#3a2818'); R(c, 255, 104, 3, 24, '#3a2818');
    // Sage: bookshelves
    for (var sh = 0; sh < 2; sh++) { var by = 56 + sh * 22; R(c, 270, by + 18, 54, 3, '#4a3020'); var bxx = 272; var cols = ['#c83a3a', '#3a6ac8', '#e8c040', '#3ab88a', '#a05ac8', '#e8e0d0', '#c8703a'];
      while (bxx < 320) { var bw = 2 + ((bxx * 7) % 3), bh = 12 + ((bxx * 13) % 6); R(c, bxx, by + 18 - bh, bw, bh, cols[(bxx * 3) % cols.length]); bxx += bw + 1; } }
    R(c, 338, 100, 30, 4, '#4a3420'); R(c, 340, 104, 3, 24, '#3a2818'); R(c, 363, 104, 3, 24, '#3a2818');
    // Human desk
    R(c, 396, 106, 62, 4, '#3a3a44'); R(c, 400, 110, 3, 18, '#2a2a34'); R(c, 452, 110, 3, 18, '#2a2a34');
    R(c, 394, 56, 66, 28, '#14181a'); R(c, 396, 58, 62, 24, '#0c1214');
    R(c, 462, 112, 8, 16, '#2a6a3a'); R(c, 460, 108, 12, 6, '#3a8a4a');                 // plant
    // Foundry: furnace body + anvil + tools
    R(c, 82, 170, 34, 52, '#2a2024'); R(c, 82, 170, 34, 3, '#5a4a50'); R(c, 88, 190, 22, 22, '#0a0608'); R(c, 80, 222 - 2, 38, 2, '#4a3a40');
    R(c, 100, 150, 8, 22, '#2a2024');                                                      // chimney
    R(c, 30, 208, 22, 6, '#4a4a58'); R(c, 34, 214, 14, 8, '#3a3a48'); R(c, 28, 206, 6, 2, '#6a6a78');  // anvil
    for (var tt = 0; tt < 4; tt++) { R(c, 16 + tt * 6, 150, 2, 14, '#6a4020'); R(c, 14 + tt * 6, 148, 6, 3, '#9aa0ac'); }
    // Lab booths
    // Warden vault
    R(c, 140, 160, 34, 50, '#3a4254'); R(c, 143, 163, 28, 44, '#2a303e'); R(c, 150, 178, 14, 14, '#5a647a'); R(c, 155, 183, 4, 4, '#e8c040');
    // Iris monitor
    R(c, 192, 170, 38, 26, '#10161e'); R(c, 194, 172, 34, 22, '#0a2a2a'); R(c, 206, 196, 10, 6, '#2a3a4a'); R(c, 198, 204, 26, 3, '#2a3a4a');
    // Muse easel
    R(c, 246, 168, 30, 34, '#4a3420'); R(c, 248, 170, 26, 28, '#f0ead8'); R(c, 256, 202, 2, 20, '#4a3420'); R(c, 266, 202, 2, 20, '#4a3420');
    // Cato rack
    R(c, 298, 160, 36, 62, '#1a2430'); R(c, 300, 162, 32, 58, '#10161e'); for (var rk = 0; rk < 5; rk++) R(c, 302, 166 + rk * 11, 28, 8, '#2a3a4a');
    // Themis bench + flag + scales wall
    R(c, 356, 196, 46, 26, '#3a2418'); R(c, 356, 196, 46, 3, '#6a4428'); R(c, 372, 150, 14, 18, '#14101c'); R(c, 376, 142, 6, 8, '#14101c');
    R(c, 348, 150, 4, 70, '#2a1c2e'); R(c, 406, 150, 4, 70, '#2a1c2e');
    // Gate pad
    R(c, 428, 214, 36, 8, '#4a4a58'); R(c, 428, 214, 36, 2, '#8a8a9a'); R(c, 426, 160, 40, 10, '#0a0e14'); R(c, 428, 162, 36, 6, '#142030');
  }

  // ---------- entities ----------
  function mkEnt(id) {
    var h = HOME[id];
    return { id: id, x: h.x, f: h.f, y: FY[h.f], dir: id === 'builder' ? 1 : (id === 'you' ? -1 : 1), pose: 'idle', path: [], carry: null, work: 0, active: false,
      bubble: null, label: null, idleAt: rnd(2, 6), lastAct: -99, sleep: false, hit: 0, wake: 0, wander: 0, busy: 0, say: '', sayAt: 0, pinned: 0 };
  }
  function ent(id) { if (!ents[id]) ents[id] = mkEnt(id); return ents[id]; }
  function headPos(id) { var e = ent(id); return { x: e.x, y: e.y - 26 - (e.pose === 'sleep' ? -4 : 0) }; }

  function planPath(e, x, f) {
    var steps = [];
    if (f === e.f) steps.push({ x: x });
    else {
      var best = LADDERS[0], bd = 1e9; LADDERS.forEach(function (L) { var d = Math.abs(e.x - L) + Math.abs(x - L); if (d < bd) { bd = d; best = L; } });
      steps.push({ x: best }, { climb: f }, { x: x });
    }
    return steps;
  }
  function goTo(id, x, f, done) {
    var e = ent(id); e.path = planPath(e, x, f); e.onArrive = done || null; e.sleep = false;
  }
  function goHome(id) { var h = HOME[id]; goTo(id, h.x, h.f); }

  function say(id, text, opts) {
    var e = ent(id); opts = opts || {};
    text = String(text || '').replace(/\s+/g, ' ').replace(/[`*#]/g, '').trim();
    if (!text) return;
    if (text.length > 120) { var cut = text.slice(0, 120); var p = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(', ')); text = (p > 50 ? cut.slice(0, p + 1) : cut.slice(0, 118) + '…'); }
    e.bubble = { text: text, t0: T, until: T + Math.max(3.2, text.length / 18), col: opts.col || null, kind: opts.kind || 'say' };
    e.say = text; e.sayAt = T;
    pushTicker(NAMES[id] + ': ' + text, COL[id]);
  }
  function pushTicker(text, col) { ticker.push({ text: text, col: col, t: T }); if (ticker.length > 4) ticker.shift(); }

  // ---------- particles ----------
  function P(x, y, vx, vy, life, col, size, g, kind) { if (parts.length < 900) parts.push({ x: x, y: y, vx: vx, vy: vy, life: life, max: life, col: col, s: size || 1, g: g == null ? 0 : g, kind: kind || 'px' }); }
  function sparks(x, y, n, col) { for (var i = 0; i < n; i++) P(x, y, rnd(-50, 50), rnd(-70, -10), rnd(0.3, 0.7), col || (Math.random() > 0.5 ? '#ffd060' : '#ff8a30'), 1, 160); }
  function confetti(x, y, n) { var cs = ['#ff5a36', '#ffd060', '#5ac88c', '#4aa8e0', '#b07af0', '#f870b0']; for (var i = 0; i < n; i++) P(x + rnd(-6, 6), y, rnd(-70, 70), rnd(-120, -30), rnd(1.2, 2.2), cs[i % cs.length], 2, 120); }
  function puff(x, y, n, col) { for (var i = 0; i < n; i++) P(x + rnd(-3, 3), y, rnd(-10, 10), rnd(-24, -8), rnd(0.6, 1.2), col || '#8a8a96', 2, -4); }
  function glyphs(x, y, ch, col, n) { for (var i = 0; i < n; i++) P(x + rnd(-6, 6), y + rnd(-4, 4), rnd(-8, 8), rnd(-26, -12), rnd(0.8, 1.4), col, 0, 0, ch); }

  // ---------- flights (envelopes / drones) ----------
  function fly(from, to, col, label, cb, opts) {
    var a = headPos(from), b = headPos(to); opts = opts || {};
    flights.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y, t: 0, dur: opts.dur || 0.9, col: col, label: label, cb: cb, to: to });
  }
  function drawFlights(c, dt) {
    for (var i = flights.length - 1; i >= 0; i--) {
      var f = flights[i]; f.t += dt; var k = clamp(f.t / f.dur, 0, 1);
      var tt = f.to ? headPos(f.to) : { x: f.x1, y: f.y1 }; f.x1 = tt.x; f.y1 = tt.y;
      var cx = (f.x0 + f.x1) / 2, cy = Math.min(f.y0, f.y1) - 34;
      var x = (1 - k) * (1 - k) * f.x0 + 2 * (1 - k) * k * cx + k * k * f.x1, y = (1 - k) * (1 - k) * f.y0 + 2 * (1 - k) * k * cy + k * k * f.y1;
      var flap = Math.floor(f.t * 18) % 2;
      R(c, x - 3, y - 2, 7, 5, f.col); R(c, x - 3, y - 2, 7, 1, 'rgba(255,255,255,.55)'); R(c, x - 1, y, 3, 1, 'rgba(0,0,0,.4)');
      R(c, x - 5, y - 3 + flap, 2, 2, '#e8e8f4'); R(c, x + 4, y - 3 + flap, 2, 2, '#e8e8f4');
      if (Math.random() < 0.7) P(x - 2, y + 3, rnd(-6, 6), rnd(8, 20), 0.4, f.col, 1, 0);
      if (k >= 1) { flights.splice(i, 1); if (f.cb) f.cb(); }
    }
  }

  // ---------- reactions to the story ----------
  function cheer(id, secs) { var e = ent(id); e.pose = 'cheer'; e.busy = secs || 1.1; }
  function sad(id, secs) { var e = ent(id); e.pose = 'sad'; e.busy = secs || 1.4; }
  function alert(id, secs) { var e = ent(id); e.pose = 'alert'; e.busy = secs || 0.7; e.sleep = false; }

  function onStart(d) {
    var to = d.agent, from = d.from || 'marcus';
    if (!HOME[to]) return;
    var e = ent(to); e.active = true; e.sleep = false; e.lastAct = T; e.label = null;
    if (!HOME[from]) from = 'marcus';
    ent(from).pose = 'point'; ent(from).busy = 0.7;
    say(from, d.desc ? 'To ' + NAMES[to] + ': ' + d.desc : 'Go, ' + NAMES[to], { col: COL[from] });
    fly(from, to, COL[to], d.desc, function () {
      alert(to, 0.6); puff(e.x, e.y - 24, 4, '#f4f4a0');
      if (to !== 'marcus') { var h = HOME[to]; if (Math.abs(e.x - h.x) > 6 || e.f !== h.f) goHome(to); }
    });
    if (to === 'builder') { loopHud(); }
  }

  function loopHud() { var n = root.Doom.state.loop; if (n) { loopSign.n = n; loopSign.t = T; } }

  function onDone(d) {
    var id = d.agent; if (!HOME[id]) return;
    var e = ent(id), v = d.verdict;
    var col = v === 'changes' || v === 'error' ? '#ff4a5a' : v === 'approve' ? '#ffd060' : v === 'escalate' ? '#ffb02a' : '#5ae88c';
    var tag = v === 'pass' ? 'PASS ✓' : v === 'changes' ? 'CHANGES ✗' : v === 'approve' ? 'APPROVED ✓' : v === 'escalate' ? 'ESCALATE !' : v === 'rereview' ? 'RE-REVIEW' : v === 'error' ? 'FAILED' : 'DONE ✓';
    e.bubble = { text: tag, t0: T, until: T + 2.4, col: col, kind: 'verdict' }; pushTicker(NAMES[id] + ' → ' + tag, col);
    e.active = false; e.lastAct = T;
    spawnCrate(id, col);
    if (v === 'changes') {
      sad(id, 1.0); alarm.red = 3.2; shake = 0.5;
      // carry the defect report to Forge on foot
      setTimeout(function () { carryTo(id, 'builder', '#ff4a5a', d.summary); }, 900);
      fly(id, 'marcus', col, 'report');
    } else if (v === 'error') { sad(id, 1.4); puff(e.x, e.y - 20, 8, '#444'); fly(id, 'marcus', col, 'report'); }
    else {
      if (v === 'pass' || v === 'none') cheer(id, 1.0);
      fly(id, d.to && HOME[d.to] ? d.to : 'marcus', col, 'report', function () { var m = ent('marcus'); m.pose = 'think'; m.busy = 0.8; });
    }
    if (v === 'approve') { stampT = T; stampText = 'APPROVED'; stampCol = '#4ae88a'; confetti(e.x, e.y - 30, 28); cheer('approver', 1.6); }
    if (v === 'escalate') { stampT = T; stampText = 'ESCALATED'; stampCol = '#ffb02a'; alarm.amber = 4; bell = T; ent('you').pose = 'alert'; ent('you').busy = 1.2; say('you', 'Needs my decision.', { col: COL.you }); }
  }

  function carryTo(id, target, col, text) {
    var e = ent(id), b = ent(target);
    e.carry = col; e.sleep = false;
    goTo(id, b.x - 16, b.f, function () {
      e.dir = 1; b.dir = -1; alert(target, 0.9); say(id, text ? text : 'Found problems.', { col: col });
      sweat(b);
      setTimeout(function () { e.carry = null; b.dir = 1; goHome(id); }, 1600);
    });
  }
  function sweat(b) { for (var i = 0; i < 6; i++) P(b.x + rnd(-4, 4), b.y - 24, rnd(-10, 10), rnd(-20, -6), 0.7, '#9ad8ff', 1, 60); }

  function onActivity(d) {
    var id = d.agent; if (!HOME[id]) return;
    var e = ent(id); e.lastAct = T; e.active = true; e.sleep = false;
    var label = (d.name + (d.summary ? ' ' + d.summary.replace(/^.*[\\/]/, '') : '')).slice(0, 24);
    e.label = { text: label, t: T };
    if (d.name === 'Write' || d.name === 'Edit') glyphs(e.x + 10, e.y - 22, '{ }', COL[id], 2);
    if (d.name === 'Bash') glyphs(e.x + 10, e.y - 22, '$_', '#5ae88c', 2);
    if (id === 'builder' && (d.name === 'Edit' || d.name === 'Write')) sparks(40, 204, 6);
  }

  function onSay(d) { if (HOME[d.agent]) { say(d.agent, d.text, { col: COL[d.agent] }); } }

  function onMerge() {
    rocket.state = 'ready'; rocket.t = T;
    setTimeout(function () { launch(); }, 700);
    cheer('marcus', 2);
  }
  function launch() { if (rocket.state === 'launch') return; rocket.state = 'launch'; rocket.y = 0; rocket.vy = 0; rocket.t = T; banners.push({ text: 'MERGED → main', t: T, col: '#5ae88c' }); confetti(446, 150, 40); shake = 0.8; flash = 0.5; pushTicker('Merged to main', '#5ae88c'); }

  function onApprove() { var h = ent('you'); h.pose = 'cheer'; h.busy = 1.4; say('you', 'Approved.', { col: COL.you }); bell = 0; alarm.amber = 0; fly('you', 'marcus', '#5ae88c', 'approve'); }
  function onLoop(d) { loopSign.n = d.n; loopSign.t = T; banners.push({ text: 'FIX LOOP ' + d.n + '/2', t: T, col: '#ffb02a' }); }
  function onRequest(d) { say('you', d.text, { col: COL.you }); ent('you').pose = 'point'; ent('you').busy = 0.6; fly('you', 'marcus', '#ff5a36', 'request'); loopSign.n = 0; routeChip = ''; }
  function onRoute(d) { routeChip = d.route; }
  function onIdle() { var m = ent('marcus'); setTimeout(function () { say('marcus', 'Standing by.', { col: COL.marcus }); }, 600); Object.keys(ents).forEach(function (k) { ents[k].active = false; }); }
  function onReset() { ents = {}; parts = []; flights = []; crates = []; banners = []; ticker = []; alarm.red = alarm.amber = 0; rocket = { y: 0, vy: 0, state: 'idle', t: 0 }; bell = 0; stampT = 0; loopSign.n = 0; routeChip = ''; Object.keys(HOME).forEach(ent); }

  function spawnCrate(id, col) { var e = ent(id); crates.push({ x: e.x, y: 233, col: col, t: T }); if (crates.length > 12) crates.shift(); }

  // ---------- update ----------
  function update(dt) {
    T += dt;
    Object.keys(HOME).forEach(function (id) {
      var e = ent(id);
      e.work += ((e.active ? 1 : 0) - e.work) * Math.min(1, dt * 4);
      if (e.busy > 0) { e.busy -= dt; if (e.busy <= 0) { e.pose = 'idle'; } }
      // walking
      if (e.path.length) {
        var s = e.path[0];
        if (s.climb) {
          var ty = FY[s.climb], dy = ty - e.y;
          if (Math.abs(dy) < 1.2) { e.y = ty; e.f = s.climb; e.path.shift(); }
          else e.y += Math.sign(dy) * 34 * dt;
          e.pose = 'walk';
        } else {
          var dx = s.x - e.x;
          if (Math.abs(dx) < 1.2) { e.x = s.x; e.path.shift(); if (!e.path.length) { e.pose = 'idle'; var cb = e.onArrive; e.onArrive = null; if (cb) cb(); } }
          else { e.x += Math.sign(dx) * 42 * dt; e.dir = dx > 0 ? 1 : -1; e.pose = e.carry ? 'carry-walk' : 'walk'; }
        }
        e.sleep = false; e.lastAct = Math.max(e.lastAct, T - 1);
      } else if (e.busy <= 0) {
        var home = HOME[id];
        if (e.active && e.work > 0.2) { e.pose = id === 'you' ? 'idle' : 'work'; if (id !== 'marcus') e.dir = id === 'builder' ? 1 : 1; if (e.carry) e.pose = 'carry'; }
        else {
          e.pose = e.sleep ? 'sleep' : (e.carry ? 'carry' : 'idle');
          if (!e.sleep && SLEEPERS[id] && T - e.lastAct > 28 && !root.Doom.state.running) e.sleep = true;
          // little wander
          e.idleAt -= dt;
          if (e.idleAt <= 0 && !e.sleep && id !== 'you') { e.idleAt = rnd(4, 9); var nx = clamp(home.x + rnd(-16, 16), home.x - 18, home.x + 18); goTo(id, nx, home.f); e.onArrive = null; }
          if (e.sleep && T - e.lastAct < 2) e.sleep = false;
        }
      }
      if (e.bubble && T > e.bubble.until) e.bubble = null;
      if (e.label && T - e.label.t > 2.2) e.label = null;
    });
    // station effects
    var F = ents.builder; if (F && F.work > 0.3) { var ph = Math.floor(T * 5) % 2; if (ph !== (update.fph || 0)) { update.fph = ph; if (ph === 0) { sparks(46, 206, 4 + Math.round(root.Doom.state.loop * 4)); flash = Math.max(flash, 0.08); } } }
    var fx = 98, fy = 190; if (Math.random() < 0.18 + (F && F.work ? 0.5 : 0)) P(fx + rnd(-6, 6), fy + rnd(0, 6), rnd(-4, 4), rnd(-30, -12), rnd(0.4, 0.8), Math.random() > 0.5 ? '#ff8a30' : '#ffd060', 1, -6);
    if (Math.random() < 0.05) puff(104, 148, 1, 'rgba(120,120,130,.6)');
    var W = ents['security-reviewer']; if (W && W.work > 0.4 && Math.random() < 0.3) P(150 + rnd(0, 14), 168 + rnd(0, 36), 0, 0, 0.3, '#ffe890', 1, 0);
    var M = ents['ui-design-reviewer']; if (M && M.work > 0.4 && Math.random() < 0.25) P(rnd(250, 272), rnd(172, 196), rnd(-20, 20), rnd(-20, 10), 0.6, ['#f04070', '#40d0f0', '#f0d040', '#9a5af0'][Math.floor(rnd(0, 4))], 1, 60);
    var Sg = ents['spec-writer']; if (Sg && Sg.work > 0.4 && Math.random() < 0.08) P(Sg.x + rnd(-12, 12), Sg.y - 20, rnd(-8, 8), rnd(-16, -4), 1.2, '#f4ecd0', 2, 0);
    var Sc = ents['codebase-mapper']; if (Sc && Sc.work > 0.4 && Math.random() < 0.15) P(Sc.x - 6, Sc.y - 2, rnd(-4, 4), rnd(-2, 2), 0.8, 'rgba(255,255,255,.4)', 1, 0);
    // sleeping zzz
    Object.keys(ents).forEach(function (k) { var e = ents[k]; if (e.sleep && Math.random() < 0.04) P(e.x + 4, e.y - 26, 6, -10, 1.6, '#cfd8ff', 0, 0, 'z'); });
    // crates slide along the belt
    crates.forEach(function (c) { c.x += 22 * dt; });
    crates = crates.filter(function (c) { return c.x < 470 && T - c.t < 25; });
    alarm.red = Math.max(0, alarm.red - dt); alarm.amber = Math.max(0, alarm.amber - dt * 0.25);
    shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt * 1.5);
    // rocket
    if (rocket.state === 'launch') { rocket.vy -= 90 * dt; rocket.y += rocket.vy * dt; for (var i = 0; i < 3; i++) P(446 + rnd(-3, 3), 212 + rocket.y, rnd(-14, 14), rnd(40, 90), rnd(0.4, 0.9), Math.random() > 0.5 ? '#ffb02a' : '#ff5a36', 2, 0); if (rocket.y < -300) { rocket.state = 'idle'; rocket.y = 0; rocket.vy = 0; } }
    // particles
    for (var j = parts.length - 1; j >= 0; j--) { var p = parts[j]; p.life -= dt; if (p.life <= 0) { parts.splice(j, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    banners = banners.filter(function (b) { return T - b.t < 3.2; });
    // ambient
    if (Math.random() < 0.004) cars.push({ x: Math.random() > 0.5 ? -12 : LW + 12, v: rnd(30, 60), c: ['#c83a3a', '#3a6ac8', '#e8c040', '#8a8a96'][Math.floor(rnd(0, 4))] }), cars[cars.length - 1].v *= cars[cars.length - 1].x < 0 ? 1 : -1;
    cars.forEach(function (c) { c.x += c.v * dt; }); cars = cars.filter(function (c) { return c.x > -20 && c.x < LW + 20; });
    if (Math.random() < 0.002) birds.push({ x: -8, y: rnd(20, 70), v: rnd(20, 36) }); birds.forEach(function (b) { b.x += b.v * dt; }); birds = birds.filter(function (b) { return b.x < LW + 10; });
    // idle chatter between co-workers so the floor never feels dead
    if (!root.Doom.state.running && Math.random() < 0.0016) {
      var pairs = [['builder', 'Forge: anyone seen my other hammer?'], ['code-reviewer', 'Cato: tests are green. Suspiciously green.'], ['ux-reviewer', 'Iris: that button is 43px. I can feel it.'], ['ui-design-reviewer', 'Muse: this palette needs more soul.'], ['security-reviewer', 'Warden: still no open ports. Good.'], ['spec-writer', 'Sage: assumptions go at the top. Always.'], ['codebase-mapper', 'Scout: I smell a legacy module.'], ['approver', 'Themis: balance is everything.'], ['marcus', 'Marcus: waiting for orders.']];
      var pick = pairs[Math.floor(rnd(0, pairs.length))]; var pe = ent(pick[0]); if (!pe.bubble && !pe.sleep) say(pick[0], pick[1].replace(/^[^:]+:\s*/, ''), { col: COL[pick[0]] });
    }
  }

  // ---------- drawing the live world ----------
  function drawDyn(c) {
    var D = root.Doom.state, A = D.agents;
    var st = function (id) { return (A[id] && A[id].state) || 'idle'; };
    // Bridge big screen: live pipeline
    var nodes = [['marcus', 28, 62], ['codebase-mapper', 44, 76], ['spec-writer', 44, 62], ['builder', 62, 69], ['security-reviewer', 80, 58], ['ux-reviewer', 80, 66], ['ui-design-reviewer', 80, 74], ['code-reviewer', 80, 82], ['approver', 94, 70]];
    c.fillStyle = 'rgba(90,200,240,.35)'; [[28, 62, 44, 62], [44, 62, 62, 69], [44, 76, 44, 62], [62, 69, 80, 58], [62, 69, 80, 66], [62, 69, 80, 74], [62, 69, 80, 82], [80, 58, 94, 70], [80, 66, 94, 70], [80, 74, 94, 70], [80, 82, 94, 70]].forEach(function (l) {
      var x0 = l[0], y0 = l[1], x1 = l[2], y1 = l[3], n = 8; for (var i = 0; i <= n; i++) c.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 1, 1); });
    nodes.forEach(function (n) { var s = st(n[0]), col = s === 'working' ? COL[n[0]] : s === 'done' ? '#5ae88c' : s === 'error' ? '#ff4a5a' : '#2a4a5a'; var pulse = s === 'working' && Math.floor(T * 5) % 2; R(c, n[1] - 3, n[2] - 3, 6, 6, col); if (pulse) R(c, n[1] - 4, n[2] - 4, 8, 8, 'rgba(255,255,255,.18)'); });
    R(c, 20, 86, 76, 1, 'rgba(90,200,240,.5)'); for (var q = 0; q < 12; q++) R(c, 22 + q * 6, 88, 4, 1, (Math.floor(T * 3) + q) % 5 === 0 ? '#5ae88c' : '#1a3a4a');
    // holo table
    var mh = ents.marcus, hw = mh && mh.active ? 1 : 0.3;
    var hy = 98 + Math.sin(T * 2) * 1.5; R(c, 118, hy - 8 * hw, 2, 8 * hw, 'rgba(90,220,255,.55)'); R(c, 114, hy, 10, 2, 'rgba(90,220,255,.8)'); R(c, 116, hy - 4, 6, 1, 'rgba(90,220,255,.6)');
    // Scout map pins
    var sc = ents['codebase-mapper'], pins = sc ? Math.min(7, Math.floor((A['codebase-mapper'] || { tools: 0 }).tools / 1)) : 0;
    for (var pi = 0; pi < pins; pi++) R(c, 182 + (pi * 17) % 48, 60 + (pi * 11) % 24, 2, 2, '#e83a3a');
    if (sc && sc.work > 0.3) { var gx = 206 + Math.floor(T * 14) % 30; R(c, gx, 58, 1, 30, 'rgba(255,255,255,.18)'); }
    // lantern
    R(c, 240, 92, 6, 8, '#e8c040'); R(c, 241, 93, 4, 6, Math.floor(T * 9) % 3 ? '#fff0a0' : '#ffd060'); R(c, 238, 100, 10, 2, '#4a3420');
    // Sage desk scroll + owl + candle
    var wr = (A['spec-writer'] || { tools: 0 }).tools; var sl = Math.min(26, 6 + wr * 3); R(c, 340, 98, sl, 2, '#f4ecd0'); R(c, 340, 97, 2, 4, '#c8a060');
    R(c, 330, 96, 4, 4, '#c8c8d0'); R(c, 331, 92, 2, 4, Math.floor(T * 8) % 2 ? '#ffb040' : '#ffd860');
    R(c, 306, 50, 8, 8, '#8a6a40'); R(c, 307, 49, 2, 2, '#8a6a40'); R(c, 311, 49, 2, 2, '#8a6a40'); var blink = Math.floor(T * 1.3) % 7 === 0; R(c, 308, 52, 2, 2, blink ? '#8a6a40' : '#ffe040'); R(c, 311, 52, 2, 2, blink ? '#8a6a40' : '#ffe040');
    // Human monitor
    var hu = root.Doom.state.human; R(c, 398, 60, 58, 20, '#0c1a14'); for (var hl = 0; hl < 5; hl++) R(c, 400, 62 + hl * 4, 10 + ((hl * 17 + Math.floor(T * 2)) % 40), 1, hu === 'waiting' ? '#ffb02a' : '#3ab86a');
    if (hu === 'waiting') { R(c, 436, 64, 18, 12, Math.floor(T * 4) % 2 ? '#ff4a2a' : '#8a1a0a'); }
    // bell
    var swing = bell && T - bell < 6 ? Math.sin((T - bell) * 22) * 2 : 0; R(c, 402 + swing, 98, 6, 6, '#e8c040'); R(c, 401 + swing, 103, 8, 2, '#c8a030'); R(c, 404 + swing, 96, 2, 2, '#e8c040');
    // Furnace glow
    var big = ents.builder && ents.builder.work > 0.3 ? 1 : 0; var fh = 6 + big * 8 + Math.sin(T * 14) * 2; R(c, 90, 210 - fh, 6, fh, '#ff6a20'); R(c, 98, 210 - fh * 0.8, 6, fh * 0.8, '#ffb02a'); R(c, 104, 210 - fh * 0.6, 4, fh * 0.6, '#ff6a20'); R(c, 94, 210 - fh * 0.5, 6, fh * 0.5, '#fff0a0');
    // anvil flash
    if (ents.builder && ents.builder.work > 0.3 && Math.floor(T * 5) % 2 === 0) R(c, 30, 205, 22, 2, '#fff4c0');
    // Warden vault + beam
    var wd = ents['security-reviewer']; var wv = st('security-reviewer');
    R(c, 155, 183, 4, 4, wv === 'error' ? '#ff4a5a' : wv === 'done' ? '#5ae88c' : '#e8c040');
    if (wd && wd.work > 0.3) { var by = 164 + (Math.floor(T * 30) % 44); R(c, 142, by, 30, 1, 'rgba(255,90,100,.8)'); R(c, 142, by + 1, 30, 1, 'rgba(255,90,100,.3)'); }
    // Iris monitor path
    var ir = ents['ux-reviewer']; if (ir && ir.work > 0.3) { var pts = Math.floor(T * 6) % 12; for (var ip = 0; ip <= pts; ip++) R(c, 196 + ip * 2.5 + (ip % 3) * 1, 190 - Math.abs(Math.sin(ip * 0.9)) * 14, 2, 2, ip === pts ? '#fff' : '#5ae8c8'); R(c, 196 + (Math.floor(T * 2) % 28), 175, 1, 3, '#aaf0ff'); }
    else R(c, 205, 182, 14, 6, '#0e4a4a');
    // Muse easel strokes
    var mu = ents['ui-design-reviewer']; var strokes = mu ? Math.min(10, Math.floor((A['ui-design-reviewer'] || { tools: 0 }).tools * 2 + (mu.work > 0.3 ? T % 6 : 0))) : 0;
    var sc2 = ['#f04070', '#40a0f0', '#f0d040', '#6a4ac8', '#40d0a0']; for (var k = 0; k < strokes; k++) R(c, 250 + (k * 7) % 20, 173 + (k * 5) % 22, 6, 2, sc2[k % 5]);
    // Cato rack lamps + terminal
    var ca = ents['code-reviewer']; var cv2 = st('code-reviewer');
    for (var rk = 0; rk < 5; rk++) for (var lp = 0; lp < 5; lp++) { var on = ca && ca.work > 0.3 ? ((Math.floor(T * 6) + rk * 2 + lp) % 7 > 2) : false; var colr = cv2 === 'error' && rk === 3 && lp === 2 ? '#ff4a5a' : on ? '#4af070' : '#1a3a2a'; R(c, 304 + lp * 5, 169 + rk * 11, 2, 2, colr); }
    // Themis scales + stamp
    var th = ents.approver; var tilt = th && th.work > 0.3 ? Math.sin(T * 3) * 3 : 0; R(c, 378, 154, 1, 12, '#e8c040'); R(c, 372, 154 + tilt / 2, 13, 1, '#e8c040'); R(c, 371, 156 + tilt, 5, 1, '#e8c040'); R(c, 381, 156 - tilt, 5, 1, '#e8c040');
    // siren
    var red = alarm.red > 0 ? 1 : 0, amb = alarm.amber > 0 ? 1 : 0;
    var sirCol = red ? (Math.floor(T * 6) % 2 ? '#ff2a3a' : '#7a0a14') : amb ? (Math.floor(T * 4) % 2 ? '#ffb02a' : '#7a4a0a') : '#3a2a30';
    R(c, 232, 136, 12, 5, '#2a2a34'); R(c, 234, 134, 8, 4, sirCol);
    if (red || amb) { c.fillStyle = (red ? 'rgba(255,40,60,' : 'rgba(255,170,40,') + (0.06 + 0.06 * Math.abs(Math.sin(T * 6))).toFixed(2) + ')'; c.fillRect(128, 134, 210, 88); }
    // belt rollers + crates
    for (var rx = 8; rx < 470; rx += 8) R(c, rx + (Math.floor(T * 10) % 8), 237, 2, 1, '#6a6a7a');
    crates.forEach(function (cr) { R(c, cr.x - 4, cr.y - 7, 9, 7, cr.col); R(c, cr.x - 4, cr.y - 7, 9, 1, 'rgba(255,255,255,.5)'); R(c, cr.x, cr.y - 7, 1, 7, 'rgba(0,0,0,.35)'); });
    // gate rocket
    var rk2 = rocket.y; R(c, 442, 190 + rk2, 8, 22, '#e8e8f4'); R(c, 442, 190 + rk2, 8, 3, '#c0c0d0'); R(c, 444, 184 + rk2, 4, 6, '#ff5a36'); R(c, 445, 180 + rk2, 2, 4, '#ff5a36'); R(c, 440, 204 + rk2, 3, 8, '#ff5a36'); R(c, 449, 204 + rk2, 3, 8, '#ff5a36'); R(c, 444, 196 + rk2, 4, 4, '#4aa8e0');
    if (rocket.state === 'ready') { for (var rr2 = 0; rr2 < 2; rr2++) P(446 + rnd(-3, 3), 213, rnd(-8, 8), rnd(10, 30), 0.4, '#ffb02a', 2, 0); }
    // cars + birds
    cars.forEach(function (cr) { R(c, cr.x, 252, 12, 4, cr.c); R(c, cr.x + 3, 250, 6, 3, mix(cr.c, '#ffffff', 0.4)); R(c, cr.v > 0 ? cr.x + 11 : cr.x, 253, 2, 2, '#fff0a0'); });
    birds.forEach(function (b) { var f = Math.floor(T * 8) % 2; R(c, b.x, b.y + f, 2, 1, '#222'); R(c, b.x + 2, b.y + 1 - f, 2, 1, '#222'); });
  }

  function drawCrates() {}

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!running) return;
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    update(dt);
    resize();
    // world
    var h = new Date().getHours() + new Date().getMinutes() / 60; if (root.__povHour != null) h = root.__povHour;
    var n = drawSky(wx, T);
    wx.drawImage(bg, 0, 0);
    // antenna + roof details
    R(wx, 420, 20, 2, 18, '#4a3a58'); R(wx, 416, 24, 10, 1, '#4a3a58'); R(wx, 420, 16, 2, 3, Math.floor(T * 2) % 2 ? '#ff2a3a' : '#5a0a14');
    R(wx, 24, 30, 10, 8, '#2a2030'); R(wx, 26, 24, 2, 6, '#2a2030'); puffRoof();
    drawDyn(wx);
    // ladders occupancy and agents sorted by y then x
    var order = Object.keys(ents).sort(function (a, b) { return ents[a].y - ents[b].y; });
    order.forEach(function (id) {
      var e = ents[id]; var pose = e.pose;
      Avatars.draw(wx, id, e.x, e.y, { t: T + id.length, dir: e.dir, pose: pose, carry: e.carry });
    });
    drawFlights(wx, dt);
    parts.forEach(function (p) {
      if (p.kind === 'px') { var a = clamp(p.life / p.max, 0, 1); wx.globalAlpha = a; R(wx, p.x, p.y, p.s, p.s, p.col); wx.globalAlpha = 1; }
    });
    if (flash > 0) R(wx, 0, 0, LW, LH, 'rgba(255,240,200,' + (flash * 0.35).toFixed(2) + ')');
    if (n > 0.5) { wx.fillStyle = 'rgba(8,4,24,' + (0.12 * n).toFixed(2) + ')'; wx.fillRect(0, 0, LW, LH); }
    // blit
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#05030a'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.imageSmoothingEnabled = false;
    var sx = shake > 0 ? Math.round(rnd(-1, 1) * shake * 6 * S / 2) : 0, sy2 = shake > 0 ? Math.round(rnd(-1, 1) * shake * 4 * S / 2) : 0;
    ctx.drawImage(wc, OX + sx, OY + sy2, LW * S, LH * S);
    overlay();
  }
  var roofPuff = 0;
  function puffRoof() { roofPuff += 1; if (roofPuff % 22 === 0) puff(29, 22, 1, 'rgba(160,160,170,.7)'); }

  // ---------- overlay (crisp text) ----------
  function wrap(text, maxW, font) {
    ctx.font = font; var words = text.split(' '), lines = [], cur = '';
    words.forEach(function (w) { var test = cur ? cur + ' ' + w : w; if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; } else cur = test; });
    if (cur) lines.push(cur); return lines.slice(0, 4);
  }
  function X(x) { return OX + x * S; } function Y(y) { return OY + y * S; }

  function overlay() {
    var fs = Math.max(10, Math.round(6.4 * S)), mono = 'ui-monospace, "Cascadia Code", Consolas, monospace';
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    // neon sign
    var flick = Math.floor(T * 7) % 53 === 0 ? 0.35 : 1;
    ctx.font = '800 ' + Math.round(13 * S) + 'px ' + mono; ctx.textAlign = 'center';
    ctx.shadowColor = '#ff5a36'; ctx.shadowBlur = 14 * S / 2; ctx.fillStyle = 'rgba(255,110,70,' + flick + ')';
    ctx.fillText('DOOM-BOTS', X(240), Y(24)); ctx.shadowBlur = 0;
    ctx.font = '700 ' + Math.round(5 * S) + 'px ' + mono; ctx.fillStyle = 'rgba(160,150,190,.8)'; ctx.fillText('HQ  ·  ' + (project || 'workspace').toUpperCase(), X(240), Y(33));
    // room plates
    ctx.font = '700 ' + Math.round(4.2 * S) + 'px ' + mono; ctx.fillStyle = 'rgba(190,175,200,.55)';
    [['COMMAND BRIDGE', 88, 49], ['MAP ROOM', 215, 49], ['LIBRARY', 318, 49], ['FOUNDRY', 62, 140], ['SECURITY', 157, 140], ['UX', 213, 140], ['DESIGN', 263, 140], ['TESTS', 316, 140], ['COURT', 378, 140], ['MAIN', 446, 140]].forEach(function (p) { ctx.fillText(p[0], X(p[1]), Y(p[2])); });
    ctx.fillStyle = 'rgba(120,230,160,.7)'; ctx.fillText('YOU', X(436), Y(52));
    // names + bubbles + labels
    Object.keys(ents).forEach(function (id) {
      var e = ents[id];
      ctx.font = '700 ' + Math.round(4.6 * S) + 'px ' + mono; ctx.textAlign = 'center';
      var nm = NAMES[id], w = ctx.measureText(nm).width + 6 * S;
      ctx.fillStyle = 'rgba(10,6,14,.72)'; ctx.fillRect(X(e.x) - w / 2, Y(e.y + 3), w, 6.4 * S);
      ctx.fillStyle = COL[id]; ctx.fillText(nm, X(e.x), Y(e.y + 6.2));
      if (e.active && e.work > 0.3) { ctx.fillStyle = COL[id]; ctx.fillRect(X(e.x) - w / 2, Y(e.y + 3), w * Math.min(1, e.work), 1 * S * 0.6); }
      if (e.label && !e.bubble) { ctx.font = '600 ' + Math.round(4.4 * S) + 'px ' + mono; var lw = ctx.measureText(e.label.text).width + 5 * S; var lx = clamp(X(e.x), OX + lw / 2 + 4, OX + LW * S - lw / 2 - 4); ctx.fillStyle = 'rgba(10,6,14,.8)'; ctx.fillRect(lx - lw / 2, Y(e.y - 38), lw, 6.6 * S); ctx.fillStyle = COL[id]; ctx.fillText(e.label.text, lx, Y(e.y - 34.8)); }
    });
    Object.keys(ents).forEach(function (id) { var e = ents[id]; if (e.bubble) drawBubble(e, fs); });
    // zzz glyphs and code glyph particles
    parts.forEach(function (p) { if (p.kind !== 'px') { ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.col; ctx.font = '700 ' + Math.round((p.kind === 'z' ? 5 : 4.4) * S) + 'px ' + mono; ctx.textAlign = 'center'; ctx.fillText(p.kind === 'z' ? 'z' : p.kind, X(p.x), Y(p.y)); ctx.globalAlpha = 1; } });
    // loop sign above Forge
    if (loopSign.n) { var lx2 = X(62), ly = Y(150); var blink = T - loopSign.t < 3 && Math.floor(T * 5) % 2; ctx.fillStyle = blink ? '#ff4a2a' : '#7a1a0a'; ctx.fillRect(lx2 - 24 * S / 2, ly - 5 * S, 24 * S, 8 * S); ctx.fillStyle = '#fff'; ctx.font = '800 ' + Math.round(5 * S) + 'px ' + mono; ctx.textAlign = 'center'; ctx.fillText('LOOP ' + loopSign.n + '/2', lx2, ly - 1 * S); }
    // stamp
    if (stampT && T - stampT < 2.6) { var k = T - stampT, sc = k < 0.18 ? 2.2 - k * 6 : 1.1, a = k < 2 ? 1 : (2.6 - k) / 0.6; ctx.save(); ctx.translate(X(380), Y(178)); ctx.rotate(-0.15); ctx.globalAlpha = a; ctx.strokeStyle = stampCol; ctx.fillStyle = stampCol; ctx.lineWidth = 2 * S; ctx.font = '800 ' + Math.round(10 * sc * S) + 'px ' + mono; var tw = ctx.measureText(stampText).width; ctx.strokeRect(-tw / 2 - 4 * S, -8 * S * sc, tw + 8 * S, 14 * S * sc); ctx.textAlign = 'center'; ctx.fillText(stampText, 0, 0); ctx.restore(); }
    // banners
    banners.forEach(function (b, i) { var k = T - b.t, a = k < 0.3 ? k / 0.3 : k > 2.6 ? (3.2 - k) / 0.6 : 1; ctx.globalAlpha = clamp(a, 0, 1); ctx.font = '800 ' + Math.round(11 * S) + 'px ' + mono; ctx.textAlign = 'center'; var w = ctx.measureText(b.text).width + 16 * S; var y = Y(106 + i * 18); ctx.fillStyle = 'rgba(8,4,12,.85)'; ctx.fillRect(X(240) - w / 2, y - 8 * S, w, 16 * S); ctx.strokeStyle = b.col; ctx.lineWidth = 1.5 * S / 2; ctx.strokeRect(X(240) - w / 2, y - 8 * S, w, 16 * S); ctx.fillStyle = b.col; ctx.fillText(b.text, X(240), y); ctx.globalAlpha = 1; });
    // ticker
    ctx.textAlign = 'left'; ctx.font = '600 ' + Math.round(4.6 * S) + 'px ' + mono;
    ticker.forEach(function (tk, i) { var age = T - tk.t; if (age > 14) return; ctx.globalAlpha = clamp(1 - age / 14, 0.25, 1); ctx.fillStyle = tk.col || '#ddd'; ctx.fillText('› ' + tk.text.slice(0, 90), X(10), Y(256 + (i - ticker.length + 1) * 6.4 - 2)); ctx.globalAlpha = 1; });
    // route chip + demo tag
    ctx.textAlign = 'right'; ctx.font = '700 ' + Math.round(4.6 * S) + 'px ' + mono;
    if (routeChip) { ctx.fillStyle = 'rgba(255,90,54,.9)'; ctx.fillText('ROUTE: ' + routeChip.toUpperCase(), X(470), Y(10)); }
    if (root.Doom.demo) { ctx.fillStyle = 'rgba(255,208,96,.95)'; ctx.fillText('● DEMO', X(470), Y(18)); }
    // scanlines + vignette
    ctx.fillStyle = 'rgba(0,0,0,.10)'; for (var y = 0; y < cv.height; y += Math.max(2, Math.round(S))) ctx.fillRect(0, y, cv.width, Math.max(1, Math.round(S / 3)));
    var g = ctx.createRadialGradient(cv.width / 2, cv.height / 2, cv.height * 0.35, cv.width / 2, cv.height / 2, cv.height * 0.95); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, cv.width, cv.height);
  }

  function drawBubble(e, fs) {
    var b = e.bubble, mono = 'ui-monospace, "Cascadia Code", Consolas, monospace';
    var shown = b.kind === 'verdict' ? b.text : b.text.slice(0, Math.floor((T - b.t0) * 55) + 1);
    var font = (b.kind === 'verdict' ? '800 ' : '500 ') + (b.kind === 'verdict' ? Math.round(fs * 1.15) : fs) + 'px ' + mono;
    var maxW = (b.kind === 'verdict' ? 90 : 128) * S;
    var lines = wrap(shown, maxW, font), lh = fs * 1.3;
    var w = 0; ctx.font = font; lines.forEach(function (l) { w = Math.max(w, ctx.measureText(l).width); });
    var bw = w + 8 * S * 0.9, bh = lines.length * lh + 5 * S * 0.9;
    var bx0 = clamp(X(e.x) - bw / 2, OX + 3, OX + LW * S - bw - 3), by0 = Y(e.y - 31) - bh - 4 * S;
    if (by0 < OY + 2) by0 = OY + 2;
    var col = b.col || COL[e.id] || '#ddd';
    ctx.fillStyle = 'rgba(14,8,18,.93)'; ctx.fillRect(bx0, by0, bw, bh);
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, S * 0.5); ctx.strokeRect(bx0, by0, bw, bh);
    ctx.beginPath(); ctx.moveTo(clamp(X(e.x), bx0 + 6, bx0 + bw - 6) - 3 * S, by0 + bh); ctx.lineTo(clamp(X(e.x), bx0 + 6, bx0 + bw - 6) + 3 * S, by0 + bh); ctx.lineTo(X(e.x), Y(e.y - 31) + 1); ctx.closePath(); ctx.fillStyle = 'rgba(14,8,18,.93)'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = b.kind === 'verdict' ? col : '#f2ece8'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    lines.forEach(function (l, i) { ctx.fillText(l, bx0 + 4 * S * 0.9, by0 + 2.6 * S * 0.9 + i * lh); });
    ctx.textBaseline = 'middle';
  }

  // ---------- layout ----------
  function resize() {
    var r = cv.parentNode.getBoundingClientRect(); var d = Math.min(2, root.devicePixelRatio || 1);
    var w = Math.max(200, Math.floor(r.width * d)), h = Math.max(150, Math.floor(r.height * d));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px'; }
    S = Math.min(cv.width / LW, cv.height / LH); OX = Math.floor((cv.width - LW * S) / 2); OY = Math.floor((cv.height - LH * S) / 2); DPR = d;
  }

  function pickAt(px, py) {
    var rect = cv.getBoundingClientRect(), x = ((px - rect.left) * DPR - OX) / S, y = ((py - rect.top) * DPR - OY) / S, hit = null, best = 1e9;
    Object.keys(ents).forEach(function (id) { var e = ents[id]; if (Math.abs(x - e.x) < 9 && y < e.y + 4 && y > e.y - 30) { var d = Math.abs(x - e.x); if (d < best) { best = d; hit = id; } } });
    return { id: hit, x: x, y: y };
  }
  function onClick(ev) {
    var h = pickAt(ev.clientX, ev.clientY);
    if (h.id) { var e = ents[h.id]; e.pose = 'cheer'; e.busy = 0.9; e.sleep = false; e.lastAct = T; var A = root.Doom.state.agents[h.id] || {}; say(h.id, A.say || A.tool || (e.sleep ? 'Zzz' : 'At your service.'), { col: COL[h.id] }); return; }
    if (h.x > 436 && h.x < 458 && h.y > 176 && h.y < 216) { launch(); return; }
    if (h.x > 398 && h.x < 412 && h.y > 90 && h.y < 108) { bell = T; return; }
    if (h.x > 300 && h.x < 316 && h.y > 48 && h.y < 60) { say('spec-writer', 'Hoo. Hoo.', { col: '#ffe040' }); return; }
    if (h.x > 80 && h.x < 120 && h.y > 160 && h.y < 215) { sparks(100, 200, 20); }
  }

  // ---------- public ----------
  function init(canvas, name) {
    if (inited) { project = name || project; return; }
    inited = true; cv = canvas; ctx = cv.getContext('2d'); project = name || '';
    wc = document.createElement('canvas'); wc.width = LW; wc.height = LH; wx = wc.getContext('2d'); wx.imageSmoothingEnabled = false;
    buildBg(); Object.keys(HOME).forEach(ent);
    cv.addEventListener('click', onClick);
    var D = root.Doom;
    D.on('start', onStart); D.on('done', onDone); D.on('activity', onActivity); D.on('say', onSay); D.on('merge', onMerge); D.on('approve', onApprove);
    D.on('loop', onLoop); D.on('request', onRequest); D.on('route', onRoute); D.on('idle', onIdle); D.on('reset', onReset);
    D.on('escalate', function () { /* handled in onDone */ });
    ready = true; last = performance.now(); raf = requestAnimationFrame(frame);
    // sync with whatever is already running
    sync();
  }
  function sync() {
    var A = root.Doom.state.agents; Object.keys(A).forEach(function (id) { if (HOME[id] && A[id].state === 'working') { var e = ent(id); e.active = true; e.work = 1; e.lastAct = T; } });
    if (root.Doom.state.route) routeChip = root.Doom.state.route; if (root.Doom.state.loop) loopSign.n = root.Doom.state.loop;
  }
  function setRunning(v) { running = !!v; if (v) { last = performance.now(); sync(); } }
  root.POV = { init: init, setRunning: setRunning, setProject: function (n) { project = n; }, _ents: function () { return ents; } };
})(window);
