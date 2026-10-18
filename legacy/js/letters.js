/* ------------------------------------------------------------------
   letters.js  -  what any letter of the piece is made of.

   The wall (mind.js) and the ending (edge.js) both write with the same
   letters, so the letter itself lives here: its strokes, its five
   stages of becoming drawn as light, the forces a hand puts on it, and
   where its pen-tip is while it is being written.

   A letter is a plain object (see node()). Its place in the world is
   rx,ry,rz (rest) + ux,uy,uz (displacement); tx,tz is its baseline
   direction and nx,nz the way it faces. Whoever owns the letter moves
   it; this module only draws and pushes.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID, M = SID.M, G = SID.Glyphs, D = SID.MindData, SP = SID.Sprites, cam = SID.cam;
  var sm = M.smooth, clamp = M.clamp;
  var NEAR = 0.12;

  /* ---------------- strokes: resampled once, centred on the letter's cell ---------------- */
  var GL = {};
  function glyphFor(ch) {
    if (GL[ch]) return GL[ch];
    var def = G.defs[ch]; if (!def || !def.s.length) return null;
    var xs = [], ys = [], conn = [], tick = [];
    function add(poly, isTick, ds) {
      var rs = G.resample(poly, ds);
      for (var i = 0; i < rs.length; i++) { xs.push(rs[i][0] - def.w / 2); ys.push(rs[i][1] - 0.5); conn.push(i > 0 ? 1 : 0); tick.push(isTick ? 1 : 0); }
    }
    def.s.forEach(function (p) { add(p, false, 0.06); });
    if (!def.nt) G.ticksFor(def.s).forEach(function (p) { add(p, true, 0.05); });        /* (a drawing made of dashes has no free ends to mark) */
    var n = xs.length, u = new Float32Array(n);
    for (var i = 0; i < n; i++) u[i] = (i + 1) / n;
    return (GL[ch] = { n: n, w: def.w, x: new Float32Array(xs), y: new Float32Array(ys), conn: new Uint8Array(conn), tick: new Uint8Array(tick), u: u, cc: D.counters[ch] || null });
  }

  function node(c, r, ch, rng) {
    return {
      c: c, r: r, ch: ch, words: [], nb: [], gl: glyphFor(ch), rho: 0.4, A: 0, A1: 0, a0: 0, draw: 1, order: -1,
      ux: 0, uy: 0, uz: 0, vx: 0, vy: 0, vz: 0, tw: 0, st: 1, open: 0, host: -1, seed: rng(),
      rx: 0, ry: 0, rz: 0, tx: 1, tz: 0, nx: 0, nz: -1, sx: -1e9, sy: -1e9, zc: -1, capPx: 0, fuse: 0, seam: false,
      sk0: null, sk1: null, du: null, inh: 0,
      leave: 0,          /* 0..1: how far the letter has let go of the wall (the ending) */
      ox: 0, oy: 0, oz: 0,   /* a displacement that is not physics: what a concept does to its own letters (reactions.js) */
      dim: 0,            /* 0..1: how far it has been put out of focus */
      rj: 0,             /* added to its resolution for drawing only (an inference that has not made up its mind) */
      sep: 0,            /* 0..1: how far apart its five renderings stand in depth (0: one letter; 1: five sheets) */
      dwell: 0,          /* seconds attention has rested on it */
      away: 0, rt: 0, kS: 1, dD: 1,
      ember: false,      /* drawn in ember rather than paper */
      noMark: false      /* never grows registration marks, however resolved */
    };
  }

  /* a hand, not static: smooth wobble along the stroke, plus a cloud of samples for the inferred stage */
  function arrays(n) {
    if (n.sk0 || !n.gl) return;
    var rng = M.rng((n.c * 131 + n.r * 17 + 7 + SID.Visit.seed) >>> 0), k = n.gl.n;      /* the hand is never quite the same twice */
    n.sk0 = new Float32Array(k * 2); n.sk1 = new Float32Array(k * 2); n.du = new Float32Array(k * 4);
    var p0 = rng() * 9, p1 = rng() * 9;
    for (var i = 0; i < k; i++) {
      n.sk0[i * 2] = M.noise(i * 0.22 + p0, 1, 3, 11); n.sk0[i * 2 + 1] = M.noise(i * 0.22 + p0, 2, 3, 12);
      n.sk1[i * 2] = M.noise(i * 0.22 + p1, 1, 5, 13); n.sk1[i * 2 + 1] = M.noise(i * 0.22 + p1, 2, 5, 14);
      n.du[i * 4] = M.gauss(rng); n.du[i * 4 + 1] = M.gauss(rng); n.du[i * 4 + 2] = M.gauss(rng); n.du[i * 4 + 3] = M.gauss(rng);
    }
  }

  /* ---------------- the five stages of becoming, as weights of rho ---------------- */
  var STAGE = [0, 0, 0, 0, 0];
  function stages(rho) {
    STAGE[0] = 1 - 0.55 * sm(0.15, 0.5, rho);
    STAGE[1] = sm(0.05, 0.25, rho) * (1 - 0.6 * sm(0.55, 0.9, rho));
    STAGE[2] = sm(0.28, 0.5, rho);
    STAGE[3] = sm(0.45, 0.68, rho);
    STAGE[4] = sm(0.72, 0.9, rho);
  }

  /* ---------------- light ---------------- */
  var GAIN = { trace: 0.11, field: 0.21, lattice: 0.34, design: 0.46, ins: 0.30 };
  /* The hot path of the whole piece: every letter, every frame, every point of every stroke.
     Two things keep it from producing garbage. Numbers written per point live in object fields, not in module
     variables (V8 boxes a number stored in a closure variable as a new heap object on every write, and an
     object's number field is updated in place). And it calls small functions with no arguments, reading and
     writing those fields, because a call with numeric arguments boxes every one that is not a small integer. */
  var Wp = { x: 0.5, y: 0.5, z: 0.5 };          /* the point just placed, in the world */
  var Pp = { x: 0.5, y: 0.5, z: 0.5 };          /* the point before it (the other end of a segment) */
  var Dl = { gx: 0.5, gy: 0.5, dz: 0.5, x: 0.5, y: 0.5 };   /* in: a point in the glyph and its depth offset; out: after deformation */
  var Ap = { a: 0.5, s: 0.5 };                  /* alpha and size of what is about to be pushed */
  var cO = 0, ccx = 0, ccy = 0, ccs = 0.3, cSt = 1, cCos = 1, cSin = 0, cCap = 1;
  var cxw = 0, cyw = 0, czw = 0, ttx = 1, ttz = 0, nnx = 0, nnz = -1;
  var SEGB = SP.SEG, DOTB = SP.DOT, CNT = SP.CNT, CAP_S = SP.CAP_S, CAP_D = SP.CAP_D;

  /* a point of the glyph (Dl.gx, Dl.gy) -> deformed by twist, stretch and the iris of an open counter -> the world (Wp) */
  function place() {
    var x = Dl.gx, y = Dl.gy;
    if (cO > 0.001 || cO < -0.001) { var qx = x - ccx, qy = y - ccy, rr = Math.sqrt(qx * qx + qy * qy) + 1e-6, k = cO * 0.45 * Math.exp(-(rr * rr) / (2 * ccs * ccs)); x += qx / rr * k; y += qy / rr * k; }
    x *= cSt;
    var lx = x * cCos - y * cSin, ly = x * cSin + y * cCos;
    Wp.x = cxw + ttx * lx * cCap + nnx * Dl.dz; Wp.y = cyw + ly * cCap; Wp.z = czw + ttz * lx * cCap + nnz * Dl.dz;
  }
  function pushSeg(wc, col) {
    var no = CNT[0]; if (no >= CAP_S || Ap.a < 0.006) return;
    var o = no * 8;
    SEGB[o] = Pp.x; SEGB[o + 1] = Pp.y; SEGB[o + 2] = Pp.z; SEGB[o + 3] = Wp.x; SEGB[o + 4] = Wp.y; SEGB[o + 5] = Wp.z; SEGB[o + 6] = Ap.a; SEGB[o + 7] = wc * 2 + col;
    CNT[0] = no + 1;
  }
  function pushDot(col) {
    var nd = CNT[1]; if (nd >= CAP_D || Ap.a < 0.006) return;
    var o = nd * 6;
    DOTB[o] = Wp.x; DOTB[o + 1] = Wp.y; DOTB[o + 2] = Wp.z; DOTB[o + 3] = Ap.a; DOTB[o + 4] = Ap.s; DOTB[o + 5] = col;
    CNT[1] = nd + 1;
  }

  var Letters = SID.Letters = {
    ref: 1,                 /* the cap height everything else is scaled against (the wall's) */
    glyphFor: glyphFor, node: node,
    /* the five stages of becoming, as weights of rho - a pure copy for anyone outside the hot
       path who wants the same law (the archive's WebGL sheets: js/archive3d.js) without
       touching the STAGE buffer letters.js reuses for itself every frame */
    stagesOf: function (rho) {
      return [1 - 0.55 * sm(0.15, 0.5, rho), sm(0.05, 0.25, rho) * (1 - 0.6 * sm(0.55, 0.9, rho)), sm(0.28, 0.5, rho), sm(0.45, 0.68, rho), sm(0.72, 0.9, rho)];
    },

    /* Project the letter, and if it is on screen and visible draw it.
       vis: 0..1 brightness from the owner. cap: this letter's cap height in world units. */
    emit: function (n, t, vis, cap) {
      var gl = n.gl; if (!gl) return;
      var sc = cap / Letters.ref;
      cxw = n.rx + n.ux + n.ox; cyw = n.ry + n.uy + n.oy - n.leave * n.leave * 0.5 * sc; czw = n.rz + n.uz + n.oz;
      ttx = n.tx; ttz = n.tz; nnx = n.nx; nnz = n.nz; cCap = cap;
      var dx = cxw - cam.x, dy = cyw - cam.y, dz = czw - cam.z, zc = dx * cam.fx + dy * cam.fy + dz * cam.fz;
      if (zc < NEAR * 2) { n.zc = -1; return; }
      var inv = cam.F / zc;
      n.sx = cam.cx + (dx * cam.rx + dy * cam.ry + dz * cam.rz) * inv; n.sy = cam.cy - (dx * cam.ux + dy * cam.uy + dz * cam.uz) * inv;
      n.zc = zc; n.capPx = cap * inv;
      var mg = n.capPx * 1.7;
      if (n.sx < -mg || n.sx > cam.W + mg || n.sy < -mg || n.sy > cam.H + mg) return;
      if (vis < 0.01) return;
      vis *= 1 - n.dim;
      var reduced = SID.env.reduced, C = n.ember ? 1 : 0;
      /* loose letters breathe, but never dim so far that a word looks like it has a hole in it */
      var fl = (!reduced && n.rho < 0.3) ? 0.8 + 0.2 * Math.sin(t * 0.5 + n.seed * 40) * Math.sin(t * 0.31 + n.seed * 17) : 1;
      vis *= clamp(fl, 0.6, 1);
      arrays(n);
      var rho = clamp(n.rho + n.rj, 0, 1);
      stages(rho);
      var drawP = n.draw < 1 ? n.draw : 1.01;
      cSt = n.st; cCos = Math.cos(n.tw); cSin = Math.sin(n.tw);
      cO = n.open; if (gl.cc) { ccx = gl.cc[0] - gl.w / 2; ccy = gl.cc[1] - 0.5; ccs = gl.cc[2] * 1.5; }
      var k, hp, a;
      /* small letters (a sentence, not a wall) need less: a second pass of the hand and every sample of the
         dust are sub-pixel there, so they are skipped rather than drawn */
      var small = n.capPx < 36;
      /* the five renderings stand at slightly different depths; where a letter is 'open' they part like sheets */
      var zk = 1 + 6 * n.sep;

      /* sketched: two passes of a hand */
      if (STAGE[0] > 0.02) {
        a = GAIN.trace * STAGE[0] * vis; var amp = 0.034 * (1 - 0.5 * rho);
        Ap.a = a; Dl.dz = -0.13 * sc * zk;
        for (var pass = 0, passes = small && STAGE[0] < 0.6 ? 1 : 2; pass < passes; pass++) {
          var sk = pass ? n.sk1 : n.sk0; hp = false;
          for (k = 0; k < gl.n; k++) {
            if (gl.u[k] > drawP) break;
            if (small && (k & 1) && gl.conn[k] && k + 1 < gl.n && gl.conn[k + 1]) continue;        /* every other point inside a stroke */
            Dl.gx = gl.x[k] + sk[k * 2] * amp; Dl.gy = gl.y[k] + sk[k * 2 + 1] * amp; place();
            if (gl.conn[k] && hp) pushSeg(0, C);
            Pp.x = Wp.x; Pp.y = Wp.y; Pp.z = Wp.z; hp = true;
          }
        }
      }
      /* inferred: a distribution that collapses onto the stroke */
      if (STAGE[1] > 0.02) {
        a = GAIN.field * STAGE[1] * vis; var sg = 0.11 * (1 - sm(0.15, 0.6, rho)) + 0.012;
        Ap.s = 0.011 * sc; Dl.dz = -0.06 * sc * zk;
        for (k = 0; k < gl.n; k += small ? 4 : 2) {
          if (gl.u[k] > drawP) break;
          Ap.a = a; Dl.gx = gl.x[k] + n.du[k * 2] * sg; Dl.gy = gl.y[k] + n.du[k * 2 + 1] * sg; place(); pushDot(C);
          Ap.a = a * 0.8; Dl.gx = gl.x[k] + n.du[k * 2 + 2] * sg; Dl.gy = gl.y[k] + n.du[k * 2 + 3] * sg; place(); pushDot(C);
        }
      }
      /* computed: the same stroke on a grid */
      if (STAGE[2] > 0.02) {
        a = GAIN.lattice * STAGE[2] * vis; var lqx = -9, lqy = -9, pitch = 0.055;
        Ap.a = a; Ap.s = pitch * cap * 0.55; Dl.dz = 0;
        for (k = 0; k < gl.n; k++) {
          if (gl.u[k] > drawP) break;
          var qx = Math.round(gl.x[k] / pitch) * pitch, qy = Math.round(gl.y[k] / pitch) * pitch;
          if (qx === lqx && qy === lqy) continue; lqx = qx; lqy = qy;
          Dl.gx = qx; Dl.gy = qy; place(); pushDot(C);
        }
      }
      /* designed: exact geometry, survey ticks (a seam is drawn twice until it fuses) */
      if (STAGE[3] > 0.02 || n.seam) {
        var w3 = Math.max(STAGE[3], n.seam ? 0.5 : 0);
        var copies = n.seam ? 2 : 1;
        for (var cp = 0; cp < copies; cp++) {
          var off = n.seam ? (cp ? 1 : -1) * (1 - n.fuse) * 0.05 : 0;
          a = GAIN.design * w3 * vis * (n.seam ? 0.75 : 1); hp = false;
          Dl.dz = 0.04 * sc * zk;
          for (k = 0; k < gl.n; k++) {
            if (gl.u[k] > drawP) break;
            Dl.gx = gl.x[k] + off; Dl.gy = gl.y[k]; place();
            if (gl.conn[k] && hp) { Ap.a = gl.tick[k] ? a * 0.7 : a; pushSeg(1, C); }
            Pp.x = Wp.x; Pp.y = Wp.y; Pp.z = Wp.z; hp = true;
          }
        }
      }
      /* measured: the cell's own registration marks */
      if (STAGE[4] > 0.02 && !n.noMark) {
        a = GAIN.ins * STAGE[4] * vis; var h = cap * 0.575, hx = Math.max(h, (gl.w * 0.5 + 0.075) * cap), ln = cap * 0.2125;     /* (a wide drawing's cell is as wide as it is) */
        for (var sxn = -1; sxn <= 1; sxn += 2) for (var syn = -1; syn <= 1; syn += 2) {
          var bx = cxw + ttx * sxn * hx, by = cyw + syn * h, bz = czw + ttz * sxn * hx;
          SP.seg(bx, by, bz, bx - ttx * sxn * ln, by, bz - ttz * sxn * ln, a, 0, C);
          SP.seg(bx, by, bz, bx, by - syn * ln, bz, a, 0, C);
        }
      }
    },

    /* where the pen-tip is when a letter is drawn up to n.draw: out = [x, y, z, onStroke] */
    tip: function (n, cap, out) {
      var gl = n.gl; if (!gl) { out[0] = n.rx; out[1] = n.ry; out[2] = n.rz; out[3] = 0; return out; }
      var k = Math.min(gl.n - 1, Math.max(0, Math.floor(n.draw * gl.n)));
      out[0] = n.rx + n.ux + n.tx * gl.x[k] * cap; out[1] = n.ry + n.uy + gl.y[k] * cap; out[2] = n.rz + n.uz + n.tz * gl.x[k] * cap;
      out[3] = gl.conn[k];                                 /* 0 at the start of a stroke: the pen is being lifted and moved */
      return out;
    },

    /* ---- what a hand does to a letter (added into acc = [ax, ay, az]) ---- */
    /* the pointer, resting on a point of the letters' surface, pulls what is near it and swirls it a little */
    pointerAccel: function (n, hit, cell, gPull, acc) {
      var px = hit.x - (n.rx + n.ux), py = hit.y - (n.ry + n.uy), pz = hit.z - (n.rz + n.uz);
      var sgw = 1.7 * cell, pt = px * n.tx + pz * n.tz, d2 = pt * pt + py * py;
      if (d2 >= 9 * sgw * sgw) return;
      var f = gPull * 8 * Math.exp(-d2 / (2 * sgw * sgw)) * cell * 0.6 / (d2 + 0.25 * cell * cell);
      var fpt = pt * f, fpy = py * f;
      acc[0] += n.tx * (fpt - fpy * 0.25); acc[2] += n.tz * (fpt - fpy * 0.25); acc[1] += fpy + fpt * 0.25;
    },
    /* energy (yours, from moving or scrolling) stirs waves along the letters; k scales it to the letter's size */
    waveAccel: function (n, E, t, k, acc) {
      var ph = n.c * 0.6 + n.r * 0.8 + t * 2.1;
      var s1 = Math.sin(ph) * E * 3.2 * k, s2 = Math.sin(ph * 0.8 + 1.3) * E * 2.0 * k, s3 = Math.sin(ph * 0.5) * E * 1.4 * k;
      acc[1] += s1; acc[0] += n.tx * s2 + n.nx * s3; acc[2] += n.tz * s2 + n.nz * s3;
    }
  };
})();
