/* ------------------------------------------------------------------
   world.js  -  five layers of light, one name.

   Each layer is a different way of making the same word. Every point
   is placed on the ray from the vantage V* through its home on the
   word plane, at a depth chosen by coherent noise. Seen from V*, depth
   vanishes and the layers add up to the word. Seen from anywhere else
   they are separate sheets, each with its own character:

     instrument  measures   ticks, guides, dimensions      (farthest)
     design      arranges   exact geometry
     lattice     computes   quantised cells
     field       infers     a distribution that denoises to the stroke
     trace       sketches   loose passes, overshoot         (nearest)

   Physics: every point is a spring to its home. The visitor is a mass
   that pulls, swirls and agitates. Stillness lets the springs win.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID, M = SID.M, G = SID.Glyphs, Cam = SID.Cam;
  var D0 = Cam.D0;

  var LAYERS = [
    { id: 'instrument', verb: 'MEASURES', depth: 16.0, spread: 0.055, k: 34, damp: 7.0, idle: 0.0, agit: 1.2, gain: 0.30, style: 'lines', w: 1.0 },
    { id: 'design', verb: 'ARRANGES', depth: 12.6, spread: 0.075, k: 30, damp: 6.5, idle: 0.0, agit: 2.4, gain: 0.44, style: 'lines', w: 1.55 },
    { id: 'lattice', verb: 'COMPUTES', depth: 9.8, spread: 0.10, k: 24, damp: 7.5, idle: 0.0, agit: 1.6, gain: 0.34, style: 'cells', w: 1.0, quant: 0.05 },
    { id: 'field', verb: 'INFERS', depth: 7.6, spread: 0.13, k: 9, damp: 3.2, idle: 0.55, agit: 7.0, gain: 0.21, style: 'dots', w: 1.0 },
    { id: 'trace', verb: 'SKETCHES', depth: 5.5, spread: 0.10, k: 14, damp: 4.2, idle: 0.28, agit: 4.0, gain: 0.11, style: 'lines', w: 1.0 }
  ];

  function Emitter() {
    this.hx = []; this.hy = []; this.hz = []; this.jx = []; this.jy = []; this.jz = [];
    this.conn = []; this.amp = []; this.par = []; this.pid = []; this.wave = []; this.gl = [];
    this.lx = []; this.ly = []; this.dr = [];        /* layout coords + depth ratio: the same point, later, on a ring */
    this.n = 0;
  }
  Emitter.prototype.push = function (X, Y, Z, jx, jy, conn, amp, par, pid, wave, gl, lx, ly, dr) {
    this.hx.push(X); this.hy.push(Y); this.hz.push(Z);
    this.jx.push(jx || 0); this.jy.push(jy || 0); this.jz.push(0);
    this.conn.push(conn ? 1 : 0); this.amp.push(amp == null ? 1 : amp);
    this.par.push(par || 0); this.pid.push(pid || 0); this.wave.push(wave || 0); this.gl.push(gl == null ? -1 : gl);
    this.lx.push(lx); this.ly.push(ly); this.dr.push(dr);
    this.n++;
  };

  /* ------------------------------------------------------------------ */
  function build(lines, aspect, seed) {
    var word = G.layout(lines);
    var fov = 46 * Math.PI / 180;
    var vh = 2 * D0 * Math.tan(fov / 2), vw = vh * aspect;
    var portrait = aspect < 1.15;
    var halfW = Math.max(Math.abs(word.bbox.x0), Math.abs(word.bbox.x1));
    var halfH = Math.max(Math.abs(word.bbox.y0), Math.abs(word.bbox.y1));
    var s = Math.min(vw * (portrait ? 0.86 : 0.80) / (2 * halfW), vh * (portrait ? 0.46 : 0.5) / (2 * halfH));
    var x0 = word.bbox.x0, xr = word.bbox.x1 - word.bbox.x0;
    var R = M.rng(seed || 1337);

    var layers = LAYERS.map(function (def, li) {
      var e = new Emitter();
      var pid = 0;

      function depthAt(x, y, gi) {
        var n = M.noise(x * 0.21 + li * 11.7, y * 0.33 + li * 3.1, li * 5.3, 7 + li);
        var t = 0.75 * n;
        if (gi >= 0) {
          var g = word.glyphs[gi];
          t += 0.65 * ((M.hash(gi, li, 1, 91) * 2 - 1) + (M.hash(gi, li, 2, 91) * 2 - 1) * 0.9 * (x - g.cx));
        }
        return def.depth * (1 + def.spread * (SID.Visit.mem.open ? 1.35 : 1) * t);      /* once a door has been forced, the sheets never quite settle together again */
      }
      /* place a layout point (cap units) on its ray; extra = depth override */
      function place(x, y, gi, jx, jy, conn, amp, par, pidv, dOverride) {
        var d = dOverride || depthAt(x, y, gi), k = d / D0;
        e.push(s * x * k, s * y * k, -d, (jx || 0) * s * k, (jy || 0) * s * k, conn, amp, par, pidv, (x - x0) / xr, gi, x, y, d / def.depth);
      }
      function circle(r, n, opts) {
        opts = opts || {};
        var pv = ++pid, d = def.depth;
        for (var i = 0; i <= n; i++) {
          var a = i / n * Math.PI * 2 + (opts.rot || 0), rr = r;
          var jx = 0, jy = 0;
          if (opts.wob) { jx = (M.noise(i * 0.4, pv, 1, 3) * opts.wob); jy = (M.noise(i * 0.4, pv, 2, 3) * opts.wob); }
          place(Math.cos(a) * rr, Math.sin(a) * rr, -1, jx, jy, i > 0, opts.amp == null ? 1 : opts.amp, i / n, pv, d);
        }
      }
      var ringR = 0.13;

      /* ---- DESIGN: exact geometry, survey ticks ---- */
      if (def.id === 'design') {
        word.strokes.forEach(function (st) {
          var pv = ++pid, pts = G.resample(st.pts, st.kind === 'tick' ? 0.05 : 0.028);
          pts.forEach(function (p, i) { place(p[0], p[1], st.glyph, 0, 0, i > 0, st.kind === 'tick' ? 0.75 : 1, p[2], pv); });
        });
        circle(ringR, 72);
      }

      /* ---- INSTRUMENT: what measuring looks like ---- */
      if (def.id === 'instrument') {
        var seg = function (ax, ay, bx, by, amp, ds) {
          var pv = ++pid, len = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(len / (ds || 0.1)));
          for (var i = 0; i <= n; i++) place(ax + (bx - ax) * i / n, ay + (by - ay) * i / n, -1, 0, 0, i > 0, amp == null ? 1 : amp, i / n, pv);
        };
        var dash = function (ax, ay, bx, by, amp) {
          var len = Math.hypot(bx - ax, by - ay), n = Math.round(len / 0.14);
          for (var i = 0; i < n; i += 2) seg(ax + (bx - ax) * i / n, ay + (by - ay) * i / n, ax + (bx - ax) * (i + 1) / n, ay + (by - ay) * (i + 1) / n, amp, 0.07);
        };
        var rows = {};
        word.glyphs.forEach(function (g) { (rows[g.row] = rows[g.row] || []).push(g); });
        Object.keys(rows).forEach(function (rk) {
          var gs = rows[rk], yb = gs[0].y, xa = gs[0].x - 0.9, xb = gs[gs.length - 1].x + gs[gs.length - 1].w + 0.9;
          seg(xa, yb, xb, yb, 0.7); seg(xa, yb + 1, xb, yb + 1, 0.7);              /* baseline, cap line */
          dash(xa, yb + 0.5, xb, yb + 0.5, 0.45);                                  /* mid line */
          /* ruler under the baseline */
          for (var q = Math.ceil(xa * 10); q <= Math.floor(xb * 10); q++) {
            var xx = q / 10, big = q % 10 === 0, half = q % 5 === 0;
            seg(xx, yb - 0.05, xx, yb - (big ? 0.2 : half ? 0.13 : 0.09), big ? 0.9 : 0.55, 0.06);
          }
          /* glyph edge guides */
          gs.forEach(function (g) {
            dash(g.x, yb - 0.26, g.x, yb + 1.26, 0.5);
            dash(g.x + g.w, yb - 0.26, g.x + g.w, yb + 1.26, 0.5);
          });
          /* overall dimension line with true numeral */
          var dy = yb - 0.62, xl = gs[0].x, xr2 = gs[gs.length - 1].x + gs[gs.length - 1].w;
          seg(xl, dy - 0.09, xl, dy + 0.09, 0.8, 0.06); seg(xr2, dy - 0.09, xr2, dy + 0.09, 0.8, 0.06);
          var label = G.textStrokes((xr2 - xl).toFixed(2), { ticks: false, track: 0.18 }), sc = 0.16;
          var lx = (xl + xr2) / 2 - label.width * sc / 2;
          seg(xl, dy, lx - 0.16, dy, 0.6); seg(lx + label.width * sc + 0.16, dy, xr2, dy, 0.6);
          label.strokes.forEach(function (pts) {
            var pv = ++pid;
            pts.forEach(function (p, i) { place(lx + p[0] * sc, dy - sc / 2 + p[1] * sc, -1, 0, 0, i > 0, 0.9, 0, pv); });
          });
        });
        /* registration crosses at the four corners of the word */
        var b = word.bbox, mg = 0.9;
        [[b.x0 - mg, b.y0 - mg], [b.x1 + mg, b.y0 - mg], [b.x0 - mg, b.y1 + mg], [b.x1 + mg, b.y1 + mg]].forEach(function (c) {
          seg(c[0] - 0.24, c[1], c[0] + 0.24, c[1], 0.8); seg(c[0], c[1] - 0.24, c[0], c[1] + 0.24, 0.8);
          var pv = ++pid; for (var i = 0; i <= 24; i++) { var a = i / 24 * 6.2832; place(c[0] + Math.cos(a) * 0.09, c[1] + Math.sin(a) * 0.09, -1, 0, 0, i > 0, 0.8, 0, pv); }
        });
        /* the door: crosshair, ring, graduated outer ring */
        seg(-0.38, 0, 0.38, 0, 0.55); seg(0, -0.38, 0, 0.38, 0.55);
        circle(ringR, 72);
        circle(0.22, 72, { amp: 0.5 });
        for (var t = 0; t < 36; t++) {
          var a2 = t / 36 * 6.2832, c2 = Math.cos(a2), s2 = Math.sin(a2), tl = t % 3 === 0 ? 0.06 : 0.035;
          seg(c2 * 0.22, s2 * 0.22, c2 * (0.22 + tl), s2 * (0.22 + tl), 0.7, 0.06);
        }
      }

      /* ---- LATTICE: the same word, computed on a grid ---- */
      if (def.id === 'lattice') {
        var pitch = def.quant, cells = {}, list = [];
        var add = function (x, y, gi, a) {
          var ix = Math.round(x / pitch), iy = Math.round(y / pitch), key = ix * 8192 + iy;
          if (cells[key]) return; cells[key] = 1; list.push([ix * pitch, iy * pitch, gi, a]);
        };
        word.strokes.forEach(function (st) {
          G.resample(st.pts, pitch * 0.5).forEach(function (p) {
            add(p[0], p[1], st.glyph, 1);
            if (st.kind === 'main' && R() < 0.10) add(p[0] + (R() < 0.5 ? -pitch : pitch), p[1] + (R() < 0.5 ? -pitch : pitch), st.glyph, 0.45); /* dither residue */
          });
        });
        for (var i = 0; i <= 96; i++) { var a3 = i / 96 * 6.2832; add(Math.cos(a3) * ringR, Math.sin(a3) * ringR, -1, 1); }
        list.forEach(function (c) { place(c[0], c[1], c[2], 0, 0, false, c[3], 0, 0); });
      }

      /* ---- FIELD: a distribution that collapses onto the stroke ---- */
      if (def.id === 'field') {
        word.strokes.forEach(function (st) {
          G.resample(st.pts, 0.05).forEach(function (p) {
            for (var m = 0; m < 4; m++) place(p[0], p[1], st.glyph, M.gauss(R) * 0.11, M.gauss(R) * 0.11, false, 0.85 + R() * 0.3, p[2], 0);
          });
        });
        for (var i2 = 0; i2 < 44; i2++) { var a4 = R() * 6.2832; place(Math.cos(a4) * ringR, Math.sin(a4) * ringR, -1, M.gauss(R) * 0.05, M.gauss(R) * 0.05, false, 1, 0, 0, def.depth); }
        /* the prior: the noise the word is drawn out of */
        for (var i3 = 0; i3 < 230; i3++) {
          var px = M.gauss(R) * halfW * 0.55, py = M.gauss(R) * 0.8;
          if (Math.abs(px) < 0.5 && Math.abs(py) < 0.3) continue;
          place(px, py, -1, 0, 0, false, 0.2 + R() * 0.25, 0, 0);
        }
      }

      /* ---- TRACE: passes of a hand ---- */
      if (def.id === 'trace') {
        word.strokes.forEach(function (st) {
          if (st.kind !== 'main') return;
          var closed = Math.hypot(st.pts[0][0] - st.pts[st.pts.length - 1][0], st.pts[0][1] - st.pts[st.pts.length - 1][1]) < 1e-6;
          for (var pass = 0; pass < 3; pass++) {
            var pv = ++pid, pts = G.resample(st.pts, 0.03), n = pts.length;
            var over = closed ? 0 : 0.025 + R() * 0.04, dOff = (R() - 0.5) * 0.09 * def.depth;
            var ph = R() * 10, wob = 0.014 + R() * 0.012;
            /* overshoot: extend first and last segments outward */
            var ext = [];
            if (over) {
              var a = pts[0], b2 = pts[1], dx = a[0] - b2[0], dy = a[1] - b2[1], dl = Math.hypot(dx, dy) || 1;
              ext.push([a[0] + dx / dl * over, a[1] + dy / dl * over, 0]);
            }
            pts.forEach(function (p) { ext.push(p); });
            if (over) {
              var c = pts[n - 1], d2 = pts[n - 2], ex = c[0] - d2[0], ey = c[1] - d2[1], el = Math.hypot(ex, ey) || 1;
              ext.push([c[0] + ex / el * over, c[1] + ey / el * over, 1]);
            }
            ext.forEach(function (p, i) {
              var nx = M.noise(i * 0.18 + ph, pass, 1, 5), ny = M.noise(i * 0.18 + ph, pass, 2, 5);
              var d = depthAt(p[0], p[1], st.glyph) + dOff;
              place(p[0], p[1], st.glyph, nx * wob * 2, ny * wob * 2, i > 0, 0.85 + R() * 0.3, p[2], pv, d);
            });
          }
        });
        circle(ringR, 60, { wob: 0.012, amp: 0.9 }); circle(ringR * 1.05, 60, { wob: 0.015, amp: 0.7, rot: 1.1 });
      }

      return finalize(def, li, e);
    });

    /* the ring: the same word, wrapped around whoever stands at the centre.
       Angular size is the same on every ring, so from the centre they add up
       exactly as the anamorphic layers do from V*. */
    var phi = Math.min(2.2 / (2 * halfW), 0.6 / (2 * halfH));              /* radians per cap unit */
    var ring = { phi: phi, R: LAYERS.map(function (d) { return d.depth * 0.6; }) };

    return { word: word, s: s, layers: layers, aspect: aspect, portrait: portrait, ring: ring };
  }

  function finalize(def, li, e) {
    var n = e.n, L = {
      id: def.id, def: def, li: li, n: n,
      H: new Float32Array(n * 3), J: new Float32Array(n * 3), U: new Float32Array(n * 3), V: new Float32Array(n * 3),
      Rr: new Float32Array(n * 3), ph: new Float32Array(n),
      conn: new Uint8Array(n), amp: new Float32Array(n), par: new Float32Array(n), pid: new Uint16Array(n),
      wave: new Float32Array(n), gl: new Int16Array(n),
      LX: new Float32Array(n), LY: new Float32Array(n), DR: new Float32Array(n),
      W: def.id === 'design' ? new Float32Array(n * 3) : null,      /* final world positions, for the seeker's pen */
      sx: new Float32Array(n), sy: new Float32Array(n), sz: new Float32Array(n),
      px: new Float32Array(n), py: new Float32Array(n),           /* previous frame, for streaks */
      vis: new Uint8Array(n), rot: 0, cellPx: 0
    };
    var r = M.rng(9001 + li * 17);
    /* connected layers shimmer as a wave along the stroke (neighbours agree);
       point clouds shimmer point by point */
    L.coh = def.id !== 'field' && def.id !== 'lattice';
    for (var i = 0; i < n; i++) {
      L.H[i * 3] = e.hx[i]; L.H[i * 3 + 1] = e.hy[i]; L.H[i * 3 + 2] = e.hz[i];
      L.J[i * 3] = e.jx[i]; L.J[i * 3 + 1] = e.jy[i]; L.J[i * 3 + 2] = e.jz[i];
      var ux, uy, uz;
      if (L.coh) {
        ux = M.noise(e.hx[i] * 0.8 + 1.3, e.hy[i] * 0.8, e.hz[i] * 0.8, 21);
        uy = M.noise(e.hx[i] * 0.8, e.hy[i] * 0.8 + 4.1, e.hz[i] * 0.8, 22);
        uz = M.noise(e.hx[i] * 0.8, e.hy[i] * 0.8, e.hz[i] * 0.8 + 7.7, 23);
      } else { ux = r() * 2 - 1; uy = r() * 2 - 1; uz = r() * 2 - 1; }
      var ul = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1;
      L.Rr[i * 3] = ux / ul; L.Rr[i * 3 + 1] = uy / ul; L.Rr[i * 3 + 2] = uz / ul;
      L.ph[i] = L.coh ? e.pid[i] * 1.3 + e.par[i] * 6 : r() * 6.2832;
      L.conn[i] = e.conn[i]; L.amp[i] = e.amp[i]; L.par[i] = e.par[i]; L.pid[i] = e.pid[i]; L.wave[i] = e.wave[i]; L.gl[i] = e.gl[i];
      L.LX[i] = e.lx[i]; L.LY[i] = e.ly[i]; L.DR[i] = e.dr[i];
    }
    return L;
  }

  /* ------------------------------------------------------------------
     step: physics + projection for every point of every layer.
     c = { g, radius, present, px, py, jit:{field,trace}, rot:[], wind, E, lock }
     ------------------------------------------------------------------ */
  function step(world, dt, t, cam, c) {
    var layers = world.layers, s = world.s;
    var F = cam.F, cx = cam.cx, cy = cam.cy, near = cam.near;
    var fx = cam.fx, fy = cam.fy, fz = cam.fz, rx = cam.rx, ry = cam.ry, rz = cam.rz, ux = cam.ux, uy = cam.uy, uz = cam.uz;
    var camx = cam.x, camy = cam.y, camz = cam.z;
    var gOn = c.g > 0.001 && c.present;

    for (var li = 0; li < layers.length; li++) {
      var L = layers[li], def = L.def, n = L.n;
      var H = L.H, J = L.J, U = L.U, V = L.V, Rr = L.Rr, ph = L.ph;
      var sx = L.sx, sy = L.sy, sz = L.sz, vis = L.vis, pxA = L.px, pyA = L.py;
      /* keep last frame for motion streaks */
      pxA.set(sx); pyA.set(sy);

      var ang = c.rot[li] || 0, ca = Math.cos(ang), sa = Math.sin(ang);
      var jit = def.id === 'field' ? c.jit.field : def.id === 'trace' ? c.jit.trace : 0;
      var k = def.k, dmp = Math.exp(-def.damp * dt);
      var agit = def.agit * 0.5 * Math.min(1, c.E) * (1 - c.calm * 0.6), idle = def.idle;
      var quant = def.quant ? def.quant * s * (def.depth / D0) : 0;

      /* ring mode: where this layer's points go when the name wraps around the visitor */
      var morph = c.morph, morphing = morph > 0.0005;
      var ringR = world.ring.R[li], phi = world.ring.phi, ringRot = c.ringRot ? c.ringRot[li] : 0;
      var LX = L.LX, LY = L.LY, DR = L.DR, wv = L.wave, W = L.W, coh = L.coh;
      var cc = c.center;

      /* the visitor's mass, projected to this layer's depth */
      var zPlane = Math.max(1.5, (-camx) * fx + (-camy) * fy + (-def.depth - camz) * fz);
      var zL = morphing ? zPlane + (ringR - zPlane) * morph : zPlane;
      var kx = (c.px - cx) / F * zL, ky = -(c.py - cy) / F * zL;
      var fpx = camx + fx * zL + rx * kx + ux * ky, fpy = camy + fy * zL + ry * kx + uy * ky, fpz = camz + fz * zL + rz * kx + uz * ky;
      var rc = c.radius / F * zL, eps2 = (0.4 * rc) * (0.4 * rc), inv2s = 1 / (2 * (0.6 * rc) * (0.6 * rc));
      var g = c.g * (def.id === 'instrument' ? 0.35 : 1) * rc * rc * 3.2;
      var swirl = 0.55;
      var wind = c.wind * (def.id === 'field' ? 1.6 : 1);
      var any = false;

      for (var i = 0; i < n; i++) {
        var i3 = i * 3;
        var hx = H[i3], hy = H[i3 + 1];
        var bx = hx * ca - hy * sa, by = hx * sa + hy * ca, bz = H[i3 + 2];
        if (morphing) {
          /* each point leaves in its turn, left to right, and swings round the centre as it goes */
          var loc = (morph - wv[i] * 0.4) / 0.6;
          if (loc > 0) {
            loc = loc > 1 ? 1 : loc; loc = loc * loc * loc * (loc * (loc * 6 - 15) + 10);
            var Rp = ringR * DR[i], az0 = LX[i] * phi + ringRot;
            var ex = cc[0] + Rp * Math.sin(az0), ey = cc[1] + LY[i] * phi * Rp, ez = cc[2] - Rp * Math.cos(az0);
            bx += (ex - bx) * loc; by += (ey - by) * loc; bz += (ez - bz) * loc;
            var vw = Math.sin(loc * Math.PI) * 0.9, cv = Math.cos(vw), sv = Math.sin(vw), rx0 = bx - cc[0], rz0 = bz - cc[2];
            bx = cc[0] + rx0 * cv - rz0 * sv; bz = cc[2] + rx0 * sv + rz0 * cv;
          }
        }
        var jx = 0, jy = 0;
        if (jit) { var jj0 = J[i3] * jit, jj1 = J[i3 + 1] * jit; jx = jj0 * ca - jj1 * sa; jy = jj0 * sa + jj1 * ca; }
        var uxx = U[i3], uyy = U[i3 + 1], uzz = U[i3 + 2];
        var X = bx + jx + uxx, Y = by + jy + uyy, Z = bz + uzz;

        var ax = -k * uxx, ay = -k * uyy, az = -k * uzz;
        if (gOn) {
          var qx = fpx - X, qy = fpy - Y, qz = fpz - Z;
          var d2 = qx * qx + qy * qy + qz * qz;
          if (d2 < rc * rc * 9) {
            var f = g * Math.exp(-d2 * inv2s) / (d2 + eps2);
            ax += qx * f; ay += qy * f; az += qz * f;
            ax += (qy * fz - qz * fy) * f * swirl; ay += (qz * fx - qx * fz) * f * swirl; az += (qx * fy - qy * fx) * f * swirl;
          }
        }
        /* agitation: energy stirs the space, not the points. The field is smooth,
           so neighbours move together and strokes bend like smoke instead of tearing */
        if (agit > 0.01) {
          ax += Math.sin(Y * 0.9 + Z * 0.5 + t * 0.7 + li * 1.7) * agit;
          ay += Math.sin(Z * 0.8 + X * 0.6 + t * 0.61 + li * 2.9) * agit;
          az += Math.sin(X * 0.7 + Y * 0.8 + t * 0.57 + li * 4.1) * agit;
        }
        if (idle) {                                    /* a private shimmer, only where the layer is probabilistic */
          var sh = Math.sin(t * (coh ? 1.1 : 1.3 + (ph[i] % 1.7)) + ph[i]) * idle;
          ax += Rr[i3] * sh; ay += Rr[i3 + 1] * sh; az += Rr[i3 + 2] * sh;
        }
        /* scroll wind: velocity along the axis of travel */
        if (wind) { ax += fx * wind; ay += fy * wind; az += fz * wind; }

        var vx = (V[i3] + ax * dt) * dmp, vy = (V[i3 + 1] + ay * dt) * dmp, vz = (V[i3 + 2] + az * dt) * dmp;
        V[i3] = vx; V[i3 + 1] = vy; V[i3 + 2] = vz;
        uxx += vx * dt; uyy += vy * dt; uzz += vz * dt;
        U[i3] = uxx; U[i3 + 1] = uyy; U[i3 + 2] = uzz;

        X = bx + jx + uxx; Y = by + jy + uyy; Z = bz + uzz;
        if (quant) { X = bx + Math.round((jx + uxx) / quant) * quant; Y = by + Math.round((jy + uyy) / quant) * quant; }

        if (W) { W[i3] = X; W[i3 + 1] = Y; W[i3 + 2] = Z; }
        var dx = X - camx, dy = Y - camy, dz = Z - camz;
        var zc = dx * fx + dy * fy + dz * fz;
        if (zc < near) { vis[i] = 0; continue; }
        var inv = F / zc;
        sx[i] = cx + (dx * rx + dy * ry + dz * rz) * inv;
        sy[i] = cy - (dx * ux + dy * uy + dz * uz) * inv;
        sz[i] = zc; vis[i] = 1;
      }
      L.cellPx = quant ? def.quant * s * 0.62 : 0;
      L.zRef = zL;
    }
  }

  SID.World = { LAYERS: LAYERS, build: build, step: step, D0: D0 };
})();
