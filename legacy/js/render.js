/* ------------------------------------------------------------------
   render.js  -  light on a dark ground.

   Everything is additive. A single layer is a faint sheet; five layers
   that line up sum to something bright. That is not a shader trick,
   it is the argument of the piece: the word is what the parts add up
   to from exactly one place.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID, M = SID.M, D0 = SID.Cam.D0;

  var canvas, ctx, bloom, bctx, W = 1, H = 1, DPR = 1, BW = 1, BH = 1;
  var GROUND = SID.C.GROUND, PAPER = SID.C.PAPER, rgba = M.rgba;
  var NB = 12, AMAX = 0.9, WC = 3;
  var segBuf = [], segCnt = new Int32Array(NB * WC), dotBuf = [], dotCnt = new Int32Array(NB * 2);
  var WIDTHS = [0.85, 1.15, 1.6];

  function ensureBuffers(maxN) {
    if (segBuf.length && segBuf[0].length >= maxN * 4) return;
    segBuf = []; dotBuf = [];
    for (var i = 0; i < NB * WC; i++) segBuf.push(new Float32Array(maxN * 4));
    for (var j = 0; j < NB * 2; j++) dotBuf.push(new Float32Array(maxN * 2));
  }

  SID.Render = {
    init: function (cv, bl) {
      canvas = cv; bloom = bl;
      ctx = canvas.getContext('2d', { alpha: false });
      bctx = bloom.getContext('2d', { alpha: false });
    },
    resize: function (w, h, dpr) {
      W = Math.round(w * dpr); H = Math.round(h * dpr); DPR = dpr;
      canvas.width = W; canvas.height = H;
      BW = Math.max(64, Math.round(W / 5)); BH = Math.max(64, Math.round(H / 5));
      bloom.width = BW; bloom.height = BH;
    },
    get dpr() { return DPR; },

    /* fs: frame state from the director */
    frame: function (fs) {
      var world = fs.world, cam = fs.cam, layers = world.layers;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      /* inside a memory the ground warms a little: the same world, a different hour */
      var inn = fs.inside || 0;
      ctx.fillStyle = inn > 0.004 ? 'rgb(' + Math.round(10 + 6 * inn) + ',' + Math.round(9 + 2 * inn) + ',' + Math.round(8 - 1 * inn) + ')' : GROUND;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';

      var maxN = 0;
      for (var i = 0; i < layers.length; i++) maxN = Math.max(maxN, layers[i].n);
      ensureBuffers(maxN);

      for (var li = 0; li < layers.length; li++) {
        var L = layers[li], fade = fs.layerAlpha[li];
        if (fade < 0.004) continue;                     /* (in the interior these have given way) */
        var st = L.def.style;
        if (st === 'lines') linesPass(L, fs, fade);
        else if (st === 'dots') dotsPass(L, fs, fade, false);
        else dotsPass(L, fs, fade, true);
      }

      if (fs.streak > 0.02) streakPass(layers, fs);
      if (SID.Sprites.segs || SID.Sprites.dots) SID.Sprites.flush(ctx, cam, DPR, fs.lineScale);
      if (SID.Edge && SID.Edge.draw2d) SID.Edge.draw2d(ctx, DPR, fs);
      if (fs.reticle > 0.01) reticlePass(fs);
      if (SID.Seeker) SID.Seeker.draw(ctx, cam, fs, DPR);
      if (fs.brackets > 0.01) bracketsPass(fs);

      /* soft bloom: a downscaled copy, blurred and screened by the browser */
      bctx.globalCompositeOperation = 'copy';
      bctx.drawImage(canvas, 0, 0, BW, BH);
    }
  };

  /* -------- connected polylines: design, instrument, trace -------- */
  function linesPass(L, fs, fade) {
    var def = L.def, n = L.n, sx = L.sx, sy = L.sy, sz = L.sz, vis = L.vis, conn = L.conn, amp = L.amp, par = L.par, pid = L.pid, wave = L.wave;
    var base = def.gain * fs.master * fade, near = fs.cam.near, t = fs.t;
    var pen = def.id === 'trace' ? (1 - fs.lock * 0.85) : 0;
    var ign = fs.ignite, mg = 40 * DPR;
    segCnt.fill(0);
    for (var i = 1; i < n; i++) {
      if (!conn[i] || !vis[i] || !vis[i - 1]) continue;
      var x0 = sx[i - 1], y0 = sy[i - 1], x1 = sx[i], y1 = sy[i];
      if ((x0 < -mg && x1 < -mg) || (x0 > W + mg && x1 > W + mg) || (y0 < -mg && y1 < -mg) || (y0 > H + mg && y1 > H + mg)) continue;
      var zc = (sz[i] + sz[i - 1]) * 0.5;
      var att = Math.pow(D0 / zc, 0.55); att = att < 0.35 ? 0.35 : att > 2.2 ? 2.2 : att;
      var nf = M.smooth(near, near * 6, zc);
      var a = base * amp[i] * att * nf;
      if (pen) {                                   /* a hand: a bright stretch travels each pass */
        var ph = (par[i] - ((t * 0.11 + pid[i] * 0.137) % 1) + 1) % 1;
        a *= 1 - pen * (0.55 - 0.55 * Math.exp(-ph * 5));
      }
      if (ign >= 0) a *= 1 + 1.6 * Math.exp(-Math.pow((wave[i] - ign) * 9, 2));
      if (a < 0.008) continue;
      var b = (a * NB / AMAX) | 0; if (b >= NB) b = NB - 1;
      var wc = zc < 0.65 * D0 ? 2 : zc < 1.4 * D0 ? 1 : 0;
      var idx = b * WC + wc, buf = segBuf[idx], o = segCnt[idx] * 4;
      buf[o] = x0; buf[o + 1] = y0; buf[o + 2] = x1; buf[o + 3] = y1; segCnt[idx]++;
    }
    for (var b2 = 0; b2 < NB; b2++) {
      for (var w = 0; w < WC; w++) {
        var c = segCnt[b2 * WC + w]; if (!c) continue;
        var buf2 = segBuf[b2 * WC + w];
        ctx.strokeStyle = rgba(PAPER, Math.min(1, (b2 + 0.5) / NB * AMAX));
        ctx.lineWidth = def.w * DPR * WIDTHS[w] * fs.lineScale;
        ctx.beginPath();
        for (var k = 0; k < c; k++) { var o2 = k * 4; ctx.moveTo(buf2[o2], buf2[o2 + 1]); ctx.lineTo(buf2[o2 + 2], buf2[o2 + 3]); }
        ctx.stroke();
      }
    }
  }

  /* -------- points: field (dust that denoises) and lattice (cells) -------- */
  function dotsPass(L, fs, fade, cells) {
    var def = L.def, n = L.n, sx = L.sx, sy = L.sy, sz = L.sz, vis = L.vis, amp = L.amp, wave = L.wave;
    var base = def.gain * fs.master * fade, near = fs.cam.near, F = fs.cam.F, ign = fs.ignite, mg = 20 * DPR;
    dotCnt.fill(0);
    var cellW = L.cellPx * F;
    for (var i = 0; i < n; i++) {
      if (!vis[i]) continue;
      var x = sx[i], y = sy[i];
      if (x < -mg || x > W + mg || y < -mg || y > H + mg) continue;
      var zc = sz[i];
      var att = Math.pow(D0 / zc, 0.55); att = att < 0.35 ? 0.35 : att > 2.2 ? 2.2 : att;
      var a = base * amp[i] * att * M.smooth(near, near * 6, zc);
      if (ign >= 0) a *= 1 + 1.6 * Math.exp(-Math.pow((wave[i] - ign) * 9, 2));
      if (a < 0.008) continue;
      var b = (a * NB / AMAX) | 0; if (b >= NB) b = NB - 1;
      var big = zc < 0.7 * D0 ? 1 : 0, idx = b * 2 + big, buf = dotBuf[idx], o = dotCnt[idx] * 2;
      buf[o] = x; buf[o + 1] = y; dotCnt[idx]++;
    }
    for (var b2 = 0; b2 < NB; b2++) {
      for (var g = 0; g < 2; g++) {
        var c = dotCnt[b2 * 2 + g]; if (!c) continue;
        var buf2 = dotBuf[b2 * 2 + g];
        ctx.fillStyle = rgba(PAPER, Math.min(1, (b2 + 0.5) / NB * AMAX));
        var sz2 = cells ? Math.max(1.6 * DPR, cellW / (D0 * (g ? 0.55 : 1.05))) : (g ? 2.1 : 1.35) * DPR * fs.lineScale;
        var h = sz2 / 2;
        for (var k = 0; k < c; k++) { var o2 = k * 2; ctx.fillRect(buf2[o2] - h, buf2[o2 + 1] - h, sz2, sz2); }
      }
    }
  }

  /* -------- travel: streaks between last frame and this one -------- */
  function streakPass(layers, fs) {
    var k = fs.streak, inv = 0.05 / Math.max(fs.dt, 0.004), maxL = 140 * DPR;   /* a fixed shutter time, not a fixed frame count */
    ctx.lineWidth = DPR * 0.8;
    ctx.strokeStyle = rgba(PAPER, 0.075 * k);
    ctx.beginPath();
    for (var li = 0; li < layers.length; li++) {
      var L = layers[li]; if (L.def.style === 'cells') continue;
      var n = L.n, sx = L.sx, sy = L.sy, px = L.px, py = L.py, vis = L.vis;
      for (var i = 0; i < n; i += 4) {
        if (!vis[i]) continue;
        var dx = (sx[i] - px[i]) * inv, dy = (sy[i] - py[i]) * inv, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 3 * DPR) continue;
        if (d > maxL) { dx *= maxL / d; dy *= maxL / d; }
        ctx.moveTo(sx[i] - dx, sy[i] - dy); ctx.lineTo(sx[i], sy[i]);
      }
    }
    ctx.stroke();
  }

  /* -------- the reach of the visitor's mass: a dashed ring that tightens when you press -------- */
  function reticlePass(fs) {
    var c = fs.c, r = c.radius * 0.5 * (1 - 0.32 * fs.press), k = fs.reticle;
    ctx.save();
    ctx.setLineDash([2 * DPR, 7 * DPR]);
    ctx.lineDashOffset = -fs.t * 6 * DPR;
    ctx.strokeStyle = rgba(PAPER, (0.13 + 0.22 * fs.press) * k); ctx.lineWidth = DPR;
    ctx.beginPath(); ctx.arc(c.px, c.py, r, 0, 6.2832); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = rgba(PAPER, 0.22 * k);
    ctx.beginPath();
    ctx.moveTo(c.px - 4 * DPR, c.py); ctx.lineTo(c.px + 4 * DPR, c.py); ctx.moveTo(c.px, c.py - 4 * DPR); ctx.lineTo(c.px, c.py + 4 * DPR);
    ctx.stroke();
    ctx.restore();
  }

  /* -------- autofocus brackets: the moment the word locks -------- */
  function bracketsPass(fs) {
    var b = fs.bracketRect; if (!b) return;
    var k = fs.brackets, pad = (1 - k) * 60 * DPR + 22 * DPR;
    var x0 = b.x0 - pad, y0 = b.y0 - pad, x1 = b.x1 + pad, y1 = b.y1 + pad, l = 16 * DPR;
    ctx.strokeStyle = rgba(PAPER, 0.55 * k); ctx.lineWidth = DPR;
    ctx.beginPath();
    [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]].forEach(function (c) {
      ctx.moveTo(c[0] + c[2] * l, c[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0], c[1] + c[3] * l);
    });
    ctx.stroke();
  }
})();
