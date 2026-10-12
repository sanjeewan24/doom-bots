'use strict';
// Procedural pixel-art avatars for the nine agents. Original designs, drawn with rectangles.
// Avatars.draw(ctx, id, x, y, {t, dir, pose, carry})  x,y = feet position (logical pixels).
// Avatars.icon(id, size) -> data URL of a head-and-shoulders portrait.
(function (root) {
  var W = 32, H = 32, OX = 16, OY = 30;

  var P = {
    marcus:  { skin: '#e8b48a', hair: '#2a1a14', main: '#c8321a', second: '#7a1a10', accent: '#f2c230', boots: '#2a1a14' },
    scout:   { skin: '#d9a273', hair: '#5a3a1c', main: '#8a6a3a', second: '#c9a45a', accent: '#e8d070', boots: '#4a3018' },
    sage:    { skin: '#f0c8a0', hair: '#e8e8f0', main: '#3a5ac8', second: '#243a8a', accent: '#f2d84a', boots: '#243a8a' },
    forge:   { skin: '#c88a5c', hair: '#3a2418', main: '#d86a1a', second: '#5a3a22', accent: '#f2a030', boots: '#2a1a14' },
    warden:  { skin: '#e0b090', hair: '#1a1a24', main: '#b0b8c8', second: '#5a6478', accent: '#e84a5a', boots: '#3a4254' },
    iris:    { skin: '#f0c8a8', hair: '#2ac8b8', main: '#2aa86a', second: '#1a6a44', accent: '#aaf0d8', boots: '#1a4a30' },
    muse:    { skin: '#f4cfb4', hair: '#e870b0', main: '#9a5af0', second: '#5a2ab0', accent: '#f8a0d0', boots: '#3a1a6a' },
    cato:    { skin: '#e0b088', hair: '#6a3ac8', main: '#e8eef4', second: '#2ab8c8', accent: '#4af0d0', boots: '#3a4a5a' },
    themis:  { skin: '#e8c0a0', hair: '#f0f0f4', main: '#1c1c28', second: '#f4f4f8', accent: '#e8c040', boots: '#101018' }
  };
  var ALIAS = { 'codebase-mapper': 'scout', 'spec-writer': 'sage', builder: 'forge', 'security-reviewer': 'warden', 'ux-reviewer': 'iris', 'ui-design-reviewer': 'muse', 'code-reviewer': 'cato', approver: 'themis' };
  function key(id) { return ALIAS[id] || id; }
  var IDS = Object.keys(P);
  P.you = { skin: '#d8a070', hair: '#16161c', main: '#4a5060', second: '#2a2e3a', accent: '#8a90a0', boots: '#1a1a22' };

  var sp = document.createElement('canvas'); sp.width = W; sp.height = H;
  var sx = sp.getContext('2d');
  var dk = document.createElement('canvas'); dk.width = W; dk.height = H;
  var dx = dk.getContext('2d');

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, Math.round(r * f))); g = Math.max(0, Math.min(255, Math.round(g * f))); b = Math.max(0, Math.min(255, Math.round(b * f)));
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }

  // Draw one frame of the figure onto the sprite canvas (no outline).
  function figure(id, o) {
    id = key(id);
    var c = P[id] || P.marcus, t = o.t || 0, dir = o.dir >= 0 ? 1 : -1, pose = o.pose || 'idle';
    sx.clearRect(0, 0, W, H);
    function r(x, y, w, h, col) { sx.fillStyle = col; sx.fillRect(dir > 0 ? OX + x : OX - x - w, OY + y, w, h); }

    var bob = 0, step = 0, armF = 0, armB = 0, headDy = 0, jump = 0, blink = (Math.floor(t * 2.2) % 11 === 0);
    var raised = false, forward = false;
    if (pose === 'idle') bob = Math.sin(t * 2.4) > 0.4 ? 1 : 0;
    if (pose === 'walk' || pose === 'carry-walk') { step = Math.floor(t * 8) % 2; bob = step; armF = step ? -1 : 1; armB = -armF; }
    if (pose === 'work') { forward = true; bob = Math.floor(t * 6) % 2; }
    if (pose === 'think') { forward = true; }
    if (pose === 'cheer') { jump = Math.abs(Math.sin(t * 7)) > 0.5 ? 2 : 0; raised = true; }
    if (pose === 'sad') { headDy = 1; }
    if (pose === 'sleep') { headDy = 2; blink = true; }
    if (pose === 'point') { forward = true; }
    if (pose === 'alert') { jump = Math.floor(t * 14) % 2; raised = true; }
    if (pose === 'carry') { forward = true; }
    var by = -bob - jump; // body offset

    // back gear
    if (id === 'marcus') { r(-5, by - 15, 10, 13, c.second); r(-4, by - 15, 8, 2, shade(c.second, 1.3)); }
    if (id === 'scout') { r(-7, by - 14, 4, 8, shade(c.main, 0.8)); r(-7, by - 14, 4, 1, c.accent); }
    if (id === 'forge') { r(-6, by - 12, 2, 4, '#3a3a44'); }
    if (id === 'sage') { r(-5, by - 14, 10, 14, shade(c.main, 0.8)); }
    if (id === 'themis') { r(-5, by - 14, 10, 15, c.main); }
    if (id === 'muse') { r(-6, by - 19, 3, 12, c.hair); r(3, by - 19, 3, 12, c.hair); }
    if (id === 'iris') { r(-5, by - 18, 3, 7, c.hair); r(2, by - 18, 3, 7, c.hair); }

    // legs
    var lA = step ? 1 : 0, lB = step ? 0 : 1;
    if (id === 'sage' || id === 'themis') {
      r(-4, by - 6, 8, 6 - by - 2, c.main); r(-3 - lA, -2, 3, 2, c.boots); r(0 + lB, -2, 3, 2, c.boots);
    } else {
      r(-3, by - 6, 2, 6 - by, shade(c.second, 0.9));
      r(1, by - 6, 2, 6 - by, shade(c.second, 0.9));
      r(-3 - lA, -2, 3, 2, c.boots); r(0 + lB, -2, 3, 2, c.boots);
    }
    // torso
    r(-4, by - 13, 8, 8, c.main);
    r(-4, by - 8, 8, 3, shade(c.main, 0.82));
    r(-4, by - 7, 8, 1, c.accent);
    if (id === 'forge') { r(-3, by - 12, 6, 8, c.second); r(-3, by - 12, 6, 1, c.accent); }
    if (id === 'cato') { r(-1, by - 13, 2, 8, c.second); r(-4, by - 13, 1, 8, '#c8d0d8'); r(3, by - 13, 1, 8, '#c8d0d8'); }
    if (id === 'muse') { r(-3, by - 10, 1, 1, '#f0d040'); r(2, by - 9, 1, 1, '#40d0f0'); r(0, by - 8, 1, 1, '#f04040'); }
    if (id === 'themis') { r(-1, by - 13, 2, 5, c.second); r(-3, by - 13, 6, 1, c.second); }
    if (id === 'warden') { r(-4, by - 13, 8, 2, c.second); r(-1, by - 12, 2, 5, c.accent); }
    if (id === 'marcus') { r(-5, by - 13, 2, 2, c.accent); r(3, by - 13, 2, 2, c.accent); }
    if (id === 'scout') { r(-4, by - 13, 8, 2, c.accent); }
    if (id === 'sage') { r(-4, by - 8, 8, 8, shade(c.main, 0.9)); r(-1, by - 13, 2, 14, c.accent); }
    // head
    var hy = by + headDy;
    r(-4, hy - 21, 8, 8, c.skin);
    r(-4, hy - 15, 8, 2, shade(c.skin, 0.93));
    // eyes (look toward facing side)
    var ey = hy - 17;
    if (id !== 'themis') {
      if (blink) { r(-2, ey + 1, 2, 1, '#3a2a2a'); r(1, ey + 1, 2, 1, '#3a2a2a'); }
      else { r(-2, ey, 2, 2, '#fff'); r(1, ey, 2, 2, '#fff'); r(-1, ey, 1, 2, '#1a1a2a'); r(2, ey, 1, 2, '#1a1a2a'); }
    }
    // mouth
    if (pose === 'sad') r(-1, hy - 14, 2, 1, '#6a3a3a'); else if (pose === 'cheer' || pose === 'alert') r(-1, hy - 14, 3, 1, '#a03030'); else r(0, hy - 14, 2, 1, '#8a4a4a');

    // hair / hats / face gear
    switch (id) {
      case 'marcus': r(-5, hy - 23, 10, 3, c.main); r(-5, hy - 21, 10, 1, c.second); r(-1, hy - 23, 2, 2, c.accent); r(-5, hy - 20, 2, 5, c.hair); r(-6, hy - 16, 2, 1, '#222'); r(-6, hy - 16, 1, 3, '#222'); r(-7, hy - 14, 3, 1, '#222'); break;
      case 'scout': r(-6, hy - 22, 12, 2, c.main); r(-4, hy - 25, 8, 4, c.main); r(-4, hy - 22, 8, 1, c.accent); r(-4, hy - 15, 8, 3, '#c83a3a'); break;
      case 'sage': r(-4, hy - 22, 8, 2, '#243a8a'); r(-3, hy - 26, 6, 4, c.main); r(-2, hy - 29, 4, 3, c.main); r(0, hy - 31, 2, 2, c.main); r(-1, hy - 27, 1, 1, c.accent); r(-5, hy - 21, 2, 2, c.main); r(-4, hy - 14, 8, 4, c.hair); r(-3, hy - 10, 6, 3, c.hair); break;
      case 'forge': r(-5, hy - 22, 10, 3, '#f2a030'); r(-4, hy - 24, 8, 2, '#f2a030'); r(-4, hy - 18, 8, 2, '#2a2a34'); r(-3, hy - 18, 2, 2, '#9af0ff'); r(1, hy - 18, 2, 2, '#9af0ff'); r(-4, hy - 15, 8, 2, '#3a2418'); break;
      case 'warden': r(-5, hy - 23, 10, 10, c.main); r(-5, hy - 23, 10, 2, '#e8eef8'); r(-4, hy - 18, 8, 2, '#10101a'); r(-1, hy - 18, 2, 2, c.accent); r(-1, hy - 25, 2, 3, c.accent); r(-5, hy - 14, 10, 2, c.second); break;
      case 'iris': r(-4, hy - 22, 8, 3, c.hair); r(-5, hy - 20, 2, 7, c.hair); r(3, hy - 20, 2, 7, c.hair); r(-4, hy - 18, 4, 3, '#1a3a3a'); r(0, hy - 18, 4, 3, '#1a3a3a'); r(-3, hy - 17, 2, 1, '#aaf0ff'); r(1, hy - 17, 2, 1, '#aaf0ff'); break;
      case 'muse': r(-5, hy - 22, 10, 3, c.hair); r(-6, hy - 24, 10, 3, c.main); r(-1, hy - 26, 2, 2, c.accent); r(-5, hy - 20, 2, 6, c.hair); r(3, hy - 20, 2, 6, c.hair); break;
      case 'cato': r(-4, hy - 23, 8, 3, c.hair); r(-3, hy - 25, 2, 2, c.hair); r(1, hy - 25, 2, 2, c.hair); r(-4, hy - 21, 8, 2, '#2a3a4a'); r(-3, hy - 21, 2, 1, c.accent); r(1, hy - 21, 2, 1, c.accent); break;
      case 'themis': r(-5, hy - 22, 10, 5, c.hair); r(-5, hy - 18, 2, 5, c.hair); r(3, hy - 18, 2, 5, c.hair); r(-4, hy - 18, 8, 2, '#f8f8f8'); r(-4, hy - 17, 8, 1, '#c8c8d0'); break;
      default: r(-4, hy - 22, 8, 3, c.hair); break;
    }

    // arms
    var frontY = by - 13, backY = by - 13, fx = 4, bx = -6, fh = 6, fw = 2;
    var hand = { x: 6, y: by - 8 };
    if (raised) { frontY = by - 19; backY = by - 19; hand = { x: 5, y: by - 20 }; }
    else if (forward) { frontY = by - 12; fh = 2; fw = 6; hand = { x: 10, y: by - 12 }; if (pose === 'work') { var sw = Math.sin(t * 9); frontY += Math.round(sw * 2); hand.y = frontY; } if (pose === 'think') { frontY = by - 15; fw = 3; hand = { x: 6, y: by - 15 }; } }
    else { frontY += armF; backY += armB; hand = { x: 6, y: frontY + 6 }; }
    r(bx, backY, 2, 6, shade(c.main, 0.78)); r(bx, backY + 5, 2, 2, c.skin);
    if (forward && !raised) { r(fx, frontY, fw, fh, c.main); r(fx + fw, frontY, 2, 2, c.skin); }
    else if (raised) { r(fx, frontY, 2, 7, c.main); r(fx, frontY - 1, 2, 2, c.skin); }
    else { r(fx, frontY, 2, 6, c.main); r(fx, frontY + 5, 2, 2, c.skin); }

    // gear in hands
    var wk = pose === 'work' || pose === 'alert';
    var hx = hand.x, hyy = hand.y;
    switch (id) {
      case 'marcus': r(hx, hyy - 4, 5, 4, '#10202a'); r(hx + 1, hyy - 3, 3, 2, wk && Math.floor(t * 4) % 2 ? '#f2f2a0' : '#4ad0f0'); break;
      case 'scout': if (wk) { r(hx - 1, hyy - 6, 8, 6, '#e8d8a0'); r(hx + 2, hyy - 4, 2, 2, '#c83a3a'); r(hx, hyy - 3, 3, 1, '#8a6a3a'); } else { r(hx, hyy - 2, 6, 3, '#e8d8a0'); r(hx, hyy - 2, 1, 3, '#a07a3a'); } break;
      case 'sage': r(hx, hyy - 1, 1, 1, '#f8f8ff'); r(hx + 1, hyy - 3, 1, 3, '#f8f8ff'); r(hx + 2, hyy - 5, 1, 3, '#e8e8f0'); if (wk) r(hx - 6, hyy + 1, 9, 2, '#f4ecd0'); break;
      case 'forge': { var up = wk ? (Math.floor(t * 5) % 2 === 0) : false; if (up) { r(hx - 1, hyy - 9, 1, 8, '#6a4020'); r(hx - 3, hyy - 12, 5, 3, '#9aa0ac'); } else { r(hx - 1, hyy - 2, 7, 1, '#6a4020'); r(hx + 5, hyy - 4, 3, 5, '#9aa0ac'); } break; }
      case 'warden': r(bx - 1, by - 14, 5, 8, '#2a4acc'); r(bx - 1, by - 14, 5, 1, c.accent); r(bx + 1, by - 11, 1, 3, c.accent); r(bx, by - 12, 3, 1, c.accent); if (wk) { r(hx, hyy - 3, 3, 4, '#f2e8a0'); r(hx + 3, hyy - 5, 6, 1, 'rgba(255,240,150,.8)'); } break;
      case 'iris': r(hx, hyy - 5, 4, 4, '#aaf0ff'); r(hx + 1, hyy - 4, 2, 2, '#10303a'); r(hx - 1, hyy - 1, 1, 2, '#6a8a8a'); break;
      case 'muse': r(hx, hyy - 5, 1, 6, '#6a3a1a'); r(hx - 1, hyy - 7, 2, 2, wk && Math.floor(t * 3) % 2 ? '#40d0f0' : '#f04070'); r(bx - 2, backY + 3, 4, 3, '#e8c890'); r(bx - 1, backY + 3, 1, 1, '#f04070'); r(bx + 1, backY + 4, 1, 1, '#40a0f0'); break;
      case 'cato': r(hx, hyy - 4, 5, 4, '#10202a'); r(hx + 1, hyy - 3, 3, 2, wk ? (Math.floor(t * 5) % 3 ? '#4af070' : '#f0e040') : '#4af070'); break;
      case 'themis': if (wk) { r(hx - 1, hyy - 3, 5, 2, '#6a4020'); r(hx + 1, hyy - 6, 2, 4, '#6a4020'); } else { r(hx, hyy - 7, 1, 8, '#e8c040'); r(hx - 3, hyy - 7, 7, 1, '#e8c040'); r(hx - 3, hyy - 6, 3, 1, '#e8c040'); r(hx + 2, hyy - 6, 3, 1, '#e8c040'); } break;
      default: break;
    }
    if (o.carry) { r(4, by - 13, 7, 5, o.carry); r(5, by - 12, 5, 1, 'rgba(255,255,255,.7)'); r(5, by - 10, 4, 1, 'rgba(255,255,255,.5)'); }
  }

  function outlined(ctx, x, y, id, o) {
    figure(id, o);
    dx.clearRect(0, 0, W, H);
    dx.globalCompositeOperation = 'source-over';
    dx.drawImage(sp, 0, 0);
    dx.globalCompositeOperation = 'source-in';
    dx.fillStyle = '#0c0608'; dx.fillRect(0, 0, W, H);
    dx.globalCompositeOperation = 'source-over';
    var ox = Math.round(x) - OX, oy = Math.round(y) - OY;
    ctx.drawImage(dk, ox - 1, oy); ctx.drawImage(dk, ox + 1, oy); ctx.drawImage(dk, ox, oy - 1); ctx.drawImage(dk, ox, oy + 1);
    ctx.drawImage(sp, ox, oy);
  }

  var iconCache = {};
  function icon(id, px) {
    px = px || 40; id = key(id);
    var ck = id + ':' + px;
    if (iconCache[ck]) return iconCache[ck];
    var out = document.createElement('canvas'); out.width = px; out.height = px;
    var ox = out.getContext('2d'); ox.imageSmoothingEnabled = false;
    ox.fillStyle = shade(P[id] ? P[id].main : '#888888', 0.35); ox.fillRect(0, 0, px, px);
    var head = document.createElement('canvas'); head.width = W; head.height = H;
    var hc = head.getContext('2d'); outlined(hc, OX, OY, id, { t: 0, dir: 1, pose: 'idle' });
    // crop region: x 6..26 (20w), y 1..21 (20h) -> square
    ox.drawImage(head, 6, 3, 20, 20, 0, 0, px, px);
    return (iconCache[ck] = out.toDataURL());
  }

  root.Avatars = { key: key, draw: function (ctx, id, x, y, o) { outlined(ctx, x, y, id, o || {}); }, icon: icon, IDS: IDS, palette: P, shade: shade, W: W, H: H };
})(window);
