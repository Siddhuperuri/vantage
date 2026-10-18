/* ------------------------------------------------------------------
   memories.js  -  what is behind the counters.

   Each memory is a small system, not an image. They are recollections,
   not copies: drawn by the piece, from what the record says the work
   *does* (never from invented screenshots), and they are allowed to be
   incomplete. Where the record says something does not exist yet, the
   memory shows it as unlit.

     gravity    Gravity Playground / Cosmos Engine: bodies, forces, orbits,
                collisions. The pointer is a mass; pressing makes a body.
     route      Travelease: a treasure hunt that only reveals places as you
                approach them.
     wireframe  PETPONKS: structure before styling. Rough becomes exact.
     eye        VIGIL-88 / camera: an aperture that watches, an image that
                resolves out of noise.
     solar      HELIOS: a clear-sky curve, a modelled forecast, observations,
                and an honest band of uncertainty.
     pipeline   ORBIT: parse, normalise, chunk, embed, index are lit.
                Retrieval and chat are not, because they do not exist yet.
     sphere     a morphing sphere (his WebGL work): a liquid form the pointer
                can push.
     type       typography: a letter being constructed from circles and lines.
     ghost      an intention with nothing found yet: three streams that
                approach and never meet.

   Local coordinates: u, v in [-1, 1] across the counter, w outward from
   the wall. The host supplies the frame; nothing here knows about the wall.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID, M = SID.M, G = SID.Glyphs, SP = SID.Sprites, clamp = M.clamp, sm = M.smooth, TAU = Math.PI * 2;

  var fr = null, wx = 0, wy = 0, wz = 0;
  /* the host gives a full frame: t (along the wall), u (up, tilted to face the ray from the centre)
     and n (outward along that ray), so a memory over a high door still faces you squarely */
  function P(u, v, w) {
    var s = fr.sc;
    wx = fr.ox + (fr.tx * u + fr.ux * v + fr.nx * w) * s;
    wy = fr.oy + (fr.ty * u + fr.uy * v + fr.ny * w) * s;
    wz = fr.oz + (fr.tz * u + fr.uz * v + fr.nz * w) * s;
  }
  function L(u0, v0, w0, u1, v1, w1, a, wc, col) { P(u0, v0, w0); var x = wx, y = wy, z = wz; P(u1, v1, w1); SP.seg(x, y, z, wx, wy, wz, a, wc || 0, col || 0); }
  function Dt(u, v, w, a, size, col) { P(u, v, w); SP.dot(wx, wy, wz, a, size * fr.sc, col || 0); }
  function circ(u, v, w, r, n, a, wc, col, a0, a1) {
    var s = a0 || 0, e = a1 == null ? TAU : a1, pu = 0, pv = 0;
    for (var i = 0; i <= n; i++) { var t = s + (e - s) * i / n, x = u + Math.cos(t) * r, y = v + Math.sin(t) * r; if (i) L(pu, pv, w, x, y, w, a, wc, col); pu = x; pv = y; }
  }
  function dashed(u0, v0, u1, v1, w, a, n, wc, col) {
    for (var i = 0; i < n; i += 2) { var s = i / n, e = (i + 1) / n; L(u0 + (u1 - u0) * s, v0 + (v1 - v0) * s, w, u0 + (u1 - u0) * e, v0 + (v1 - v0) * e, w, a, wc, col); }
  }
  function rect(u, v, w0, h, w, a, wc, col) { L(u, v, w, u + w0, v, w, a, wc, col); L(u + w0, v, w, u + w0, v + h, w, a, wc, col); L(u + w0, v + h, w, u, v + h, w, a, wc, col); L(u, v + h, w, u, v, w, a, wc, col); }
  var TC = {};
  function T(str, u, v, w, h, a, col, align) {                       /* micro-type, in the piece's own strokes */
    var s = TC[str] || (TC[str] = G.textStrokes(str, { track: 0.28, ticks: false })), ox = -(align || 0) * s.width * h;
    for (var i = 0; i < s.strokes.length; i++) { var p = s.strokes[i]; for (var j = 1; j < p.length; j++) L(u + ox + p[j - 1][0] * h, v + p[j - 1][1] * h, w, u + ox + p[j][0] * h, v + p[j][1] * h, w, a, 0, col); }
  }
  var rng = M.rng(777 ^ (SID.Visit.seed & 0xffff));                 /* the same memories, set going a little differently each visit */

  /* ================= GRAVITY ================= */
  function Gravity() {
    var B = [], GM = 0.55, prevPress = false, sinceSpawn = 0;
    function sat(r, ph, m) { var v = Math.sqrt(GM / r) * (0.86 + rng() * 0.2); return { x: Math.cos(ph) * r, y: Math.sin(ph) * r, vx: -Math.sin(ph) * v, vy: Math.cos(ph) * v, m: m, tr: [], k: 0 }; }
    function init() { B = [{ x: 0, y: 0, vx: 0, vy: 0, m: 1, tr: [], k: 0, hub: true }]; for (var i = 0; i < 6; i++) B.push(sat(0.24 + i * 0.11, rng() * TAU, 0.02 + rng() * 0.03)); }
    init();
    return {
      update: function (dt, t, c) {
        var h = Math.min(dt, 1 / 30) / 3 * (c.reduced ? 0.45 : 1), sub, i, j;
        for (sub = 0; sub < 3; sub++) {
          for (i = 0; i < B.length; i++) {
            var b = B[i], ax = 0, ay = 0;
            for (j = 0; j < B.length; j++) {
              if (i === j) continue;
              var o = B[j], dx = o.x - b.x, dy = o.y - b.y, d2 = dx * dx + dy * dy + 0.003, inv = GM * o.m / (d2 * Math.sqrt(d2));
              ax += dx * inv; ay += dy * inv;
            }
            if (c.ptr.has && !b.hub) {                                   /* the pointer is a mass */
              var cx = clamp(c.ptr.u, -1.2, 1.2) - b.x, cy = clamp(c.ptr.v, -1.2, 1.2) - b.y, cd = cx * cx + cy * cy + 0.01;
              var cm = c.press ? 0.5 : 0.16; ax += cx * cm / (cd * Math.sqrt(cd)) * 0.5; ay += cy * cm / (cd * Math.sqrt(cd)) * 0.5;
            }
            b.ax = ax; b.ay = ay;
          }
          for (i = 0; i < B.length; i++) { var q = B[i]; if (q.hub) continue; q.vx += q.ax * h; q.vy += q.ay * h; q.x += q.vx * h; q.y += q.vy * h; }
          B[0].vx += B[0].ax * h; B[0].vy += B[0].ay * h; B[0].x += B[0].vx * h; B[0].y += B[0].vy * h;
          B[0].x *= 0.998; B[0].y *= 0.998;
        }
        /* collisions merge (momentum is conserved); the hub absorbs; the lost are returned to an orbit */
        for (i = 1; i < B.length; i++) {
          var a = B[i], hub = B[0], hd = Math.hypot(a.x - hub.x, a.y - hub.y);
          if (hd < 0.045 || hd > 1.6) { B.splice(i, 1); i--; if (hd < 0.045) hub.m = Math.min(1.3, hub.m + 0.01); continue; }
          for (j = i + 1; j < B.length; j++) {
            var d = B[j], dd = Math.hypot(a.x - d.x, a.y - d.y);
            if (dd < 0.03 + 0.02 * (Math.sqrt(a.m) + Math.sqrt(d.m))) {
              var m = a.m + d.m; a.x = (a.x * a.m + d.x * d.m) / m; a.y = (a.y * a.m + d.y * d.m) / m; a.vx = (a.vx * a.m + d.vx * d.m) / m; a.vy = (a.vy * a.m + d.vy * d.m) / m; a.m = m; B.splice(j, 1); j--;
            }
          }
        }
        sinceSpawn += dt;
        if (B.length < 6 && sinceSpawn > 1.2) { B.push(sat(0.5 + rng() * 0.4, rng() * TAU, 0.02 + rng() * 0.03)); sinceSpawn = 0; }
        if (c.press && !prevPress && c.ptr.has && B.length < 13) {      /* pressing makes a body: give it an orbit */
          var r = Math.max(0.15, Math.hypot(c.ptr.u, c.ptr.v)), ph = Math.atan2(c.ptr.v, c.ptr.u), s = sat(Math.min(r, 0.95), ph, 0.05);
          B.push(s);
        }
        prevPress = c.press;
        for (i = 0; i < B.length; i++) { var bb = B[i]; if ((++bb.k) % 2 === 0) { bb.tr.push(bb.x, bb.y); if (bb.tr.length > 80) bb.tr.splice(0, 2); } }
      },
      emit: function (f, A, c) {
        fr = f; var w = 0.4, i, j;
        circ(0, 0, w, 1.05, 48, 0.14 * A, 0, 0);
        for (i = 0; i < B.length; i++) {
          var b = B[i], r = 0.018 + 0.05 * Math.sqrt(b.m) * (b.hub ? 1.4 : 1.6);
          for (j = 2; j < b.tr.length; j += 2) L(b.tr[j - 2], b.tr[j - 1], w, b.tr[j], b.tr[j + 1], w, 0.42 * A * (j / b.tr.length), 0, 0);
          circ(b.x, b.y, w, r, 14, 0.85 * A, 1, 0);
          if (b.hub) { circ(b.x, b.y, w, r * 1.6, 20, 0.35 * A, 0, 0); Dt(b.x, b.y, w, 0.9 * A, 0.02, 0); }
          else L(b.x, b.y, w, b.x + b.vx * 0.16, b.y + b.vy * 0.16, w, 0.35 * A, 0, 0);
        }
        if (c.ptr.has) { circ(clamp(c.ptr.u, -1.2, 1.2), clamp(c.ptr.v, -1.2, 1.2), w, c.press ? 0.06 : 0.09, 20, 0.7 * A, 0, 1); }
      }
    };
  }

  /* ================= ROUTE (a treasure hunt) ================= */
  function Route() {
    var pts = [[-0.78, -0.5], [-0.58, -0.08], [-0.72, 0.36], [-0.3, 0.62], [0.04, 0.22], [0.32, 0.56], [0.66, 0.3], [0.52, -0.2], [0.8, -0.56]];
    var hidden = [1, 3, 4, 6, 7], found = pts.map(function () { return 0; }), idle = 0, done = 0, traveller = 0;
    found[0] = 1; found[8] = 1;
    var blob = []; for (var i = 0; i <= 40; i++) { var a = i / 40 * TAU; blob.push([Math.cos(a) * (0.92 + M.noise(Math.cos(a) * 1.4, Math.sin(a) * 1.4, 2, 3) * 0.1), Math.sin(a) * (0.82 + M.noise(Math.cos(a) * 1.4 + 9, Math.sin(a) * 1.4, 3, 4) * 0.1)]); }
    return {
      update: function (dt, t, c) {
        var all = true;
        for (var i = 0; i < pts.length; i++) {
          if (hidden.indexOf(i) < 0) continue;
          var near = c.ptr.has && Math.hypot(c.ptr.u - pts[i][0], c.ptr.v - pts[i][1]) < 0.17;
          if (near) { found[i] = Math.min(1, found[i] + dt * 2.5); idle = 0; }
          else if (done < 0.5) found[i] = Math.max(found[i] === 1 ? 0.999 : 0, found[i] - dt * 0.01);
          if (found[i] < 0.99) all = false;
        }
        idle += dt;
        if (all) { done = Math.min(1, done + dt * 0.6); traveller = (traveller + dt * 0.14) % 1; if (done >= 1 && idle > 9) { hidden.forEach(function (k) { found[k] = 0; }); done = 0; } }
        else done = Math.max(0, done - dt);
      },
      emit: function (f, A, c) {
        fr = f; var w = 0.3, i;
        for (i = 0; i < blob.length - 1; i++) if (i % 2 === 0) L(blob[i][0], blob[i][1], w - 0.05, blob[i + 1][0], blob[i + 1][1], w - 0.05, 0.16 * A, 0, 0);
        /* the route so far: dotted between places that have been found, barely there elsewhere */
        for (i = 0; i < pts.length - 1; i++) {
          var a = pts[i], b = pts[i + 1], both = found[i] > 0.5 && found[i + 1] > 0.5;
          if (both) { var n = 10; for (var k = 0; k < n; k++) if (k % 2 === 0) L(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, w, a[0] + (b[0] - a[0]) * (k + 1) / n, a[1] + (b[1] - a[1]) * (k + 1) / n, w, 0.6 * A, 0, 0); }
          else dashed(a[0], a[1], b[0], b[1], w, 0.09 * A, 8, 0, 0);
        }
        for (i = 0; i < pts.length; i++) {
          var p = pts[i], fnd = found[i], edge = i === 0 || i === pts.length - 1;
          if (fnd > 0.3) { circ(p[0], p[1], w, 0.045 + (edge ? 0.02 : 0), 14, (0.5 + 0.4 * fnd) * A, 1, 0); Dt(p[0], p[1], w, 0.9 * A * fnd, 0.02, 0); if (!edge) L(p[0], p[1], w, p[0], p[1] + 0.13, w, 0.5 * A * fnd, 0, 0); }
          else {
            var prox = c.ptr.has ? Math.exp(-Math.pow(Math.hypot(c.ptr.u - p[0], c.ptr.v - p[1]) / 0.3, 2)) : 0;
            var breathe = 0.5 + 0.5 * Math.sin(f.t * 1.3 + i * 2.1);            /* a place you have not found breathes, faintly */
            var xa = (0.12 + 0.1 * breathe + 0.55 * prox) * A, s = 0.03 + 0.012 * prox;
            L(p[0] - s, p[1] - s, w, p[0] + s, p[1] + s, w, xa, 0, 0); L(p[0] - s, p[1] + s, w, p[0] + s, p[1] - s, w, xa, 0, 0);
            if (prox > 0.25) circ(p[0], p[1], w, 0.07 + 0.05 * (1 - prox), 16, 0.5 * prox * A, 0, 0);
          }
        }
        if (done > 0.05) {                                              /* the traveller walks the finished route */
          var seg = traveller * (pts.length - 1), si = Math.min(pts.length - 2, Math.floor(seg)), sf = seg - si;
          var tx = pts[si][0] + (pts[si + 1][0] - pts[si][0]) * sf, ty = pts[si][1] + (pts[si + 1][1] - pts[si][1]) * sf;
          circ(tx, ty, w, 0.05, 16, 0.9 * A * done, 0, 1); Dt(tx, ty, w, A * done, 0.03, 1);
        }
      }
    };
  }

  /* ================= WIREFRAME (structure before styling) ================= */
  function Wireframe() {
    var fid = 0.2;
    var boxes = [                                  /* precise layout; x, y, w, h, kind */
      [-0.85, 0.74, 1.7, 0.14, 'bar'], [-0.85, 0.28, 1.7, 0.38, 'img'],
      [-0.85, -0.16, 0.52, 0.34, 'img'], [-0.26, -0.16, 0.52, 0.34, 'img'], [0.33, -0.16, 0.52, 0.34, 'img'],
      [0.12, -0.72, 0.73, 0.38, 'img']
    ];
    var seeds = boxes.map(function (b, i) { var r = []; for (var k = 0; k < 10; k++) r.push(M.noise(i * 3.1 + k * 0.7, k, i, 21)); return r; });
    return {
      update: function (dt, t, c, f) {
        var target = c.ptr.has ? clamp(0.5 + c.ptr.u * 0.6, 0, 1) : 0.25 + 0.75 * f.dev;
        fid = M.damp(fid, target, 3, dt);
      },
      emit: function (f, A, c) {
        fr = f; var w = 0.3, rough = 1 - fid, i, k;
        function pt(bi, ci, x, y) { var s = seeds[bi]; return [x + s[ci * 2] * 0.045 * rough, y + s[ci * 2 + 1] * 0.045 * rough]; }
        for (i = 0; i < boxes.length; i++) {
          var b = boxes[i], x = b[0], y = b[1], bw = b[2], bh = b[3];
          for (var pass = 0; pass < (rough > 0.25 ? 2 : 1); pass++) {
            var q = [pt(i, 0 + pass, x, y), pt(i, 1 + pass, x + bw, y), pt(i, 2 + pass, x + bw, y + bh), pt(i, 3 + pass, x, y + bh)];
            for (k = 0; k < 4; k++) L(q[k][0], q[k][1], w, q[(k + 1) % 4][0], q[(k + 1) % 4][1], w, (pass ? 0.3 : 0.6) * A, pass ? 0 : 1, 0);
          }
          if (b[4] === 'img') { var xa = 0.25 + 0.5 * fid; L(x, y, w, x + bw, y + bh, w, xa * A, 0, 0); L(x, y + bh, w, x + bw, y, w, xa * A, 0, 0); }
        }
        /* text lines: a scrawl becomes a rule */
        for (i = 0; i < 4; i++) {
          var ly = -0.34 - i * 0.1 - 0.02, len = [0.82, 0.68, 0.76, 0.42][i], x0 = -0.85, prev = null;
          for (k = 0; k <= 12; k++) {
            var xx = x0 + len * k / 12, yy = ly + M.noise(k * 0.6 + i * 4, i, 1, 22) * 0.03 * rough;
            if (prev) L(prev[0], prev[1], w, xx, yy, w, 0.45 * A, 0, 0); prev = [xx, yy];
          }
        }
        for (i = 0; i < 5; i++) circ(-0.79 + i * 0.16, -0.88 + M.noise(i, 5, 1, 23) * 0.02 * rough, w, 0.05 + M.noise(i, 6, 2, 24) * 0.008 * rough, 14, 0.5 * A, 0, 0);
        /* the mark is not drawn yet: only the construction of one */
        circ(-0.7, 0.81, w + 0.05, 0.05, 18, 0.5 * A, 0, 1); circ(-0.7, 0.81, w + 0.05, 0.02, 12, 0.5 * A, 0, 1);
        L(-0.77, 0.81, w + 0.05, -0.63, 0.81, w + 0.05, 0.35 * A, 0, 1); L(-0.7, 0.74, w + 0.05, -0.7, 0.88, w + 0.05, 0.35 * A, 0, 1);
        for (i = 0; i < 3; i++) L(0.5 + i * 0.12, 0.81, w, 0.58 + i * 0.12, 0.81, w, 0.4 * A, 0, 0);
      }
    };
  }

  /* ================= EYE (an aperture that watches) ================= */
  function Eye() {
    var open = 0.3, px = 0, py = 0, scan = 0, cells = [];
    for (var j = 0; j < 8; j++) for (var i = 0; i < 12; i++) cells.push([-0.66 + i * 0.12, -0.48 + j * 0.13, rng()]);
    return {
      update: function (dt, t, c, f) {
        var want = c.ptr.has ? 0.34 + 0.4 * Math.exp(-(c.ptr.u * c.ptr.u + c.ptr.v * c.ptr.v) / 0.5) : 0.3 + 0.25 * f.dev;
        open = M.damp(open, want, 3, dt);
        px = M.damp(px, c.ptr.has ? clamp(c.ptr.u, -1, 1) * 0.16 : 0, 5, dt); py = M.damp(py, c.ptr.has ? clamp(c.ptr.v, -1, 1) * 0.16 : 0, 5, dt);
        scan = (scan + dt * (c.reduced ? 0.15 : 0.3)) % 1.4;
      },
      emit: function (f, A, c) {
        fr = f; var w = 0.5, t = f.t, i;
        /* an image that resolves out of noise: the cells inside the eye settle, the rest keep flickering */
        var sy = -0.6 + scan * 1.2;
        for (i = 0; i < cells.length; i++) {
          var ce = cells[i], ex = ce[0] / 0.66, ey = ce[1] / 0.42, inside = ex * ex + ey * ey < 1, settled = ce[1] < sy;
          var flick = 0.5 + 0.5 * Math.sin(t * (3 + ce[2] * 5) + ce[2] * 40);
          var a = inside ? (settled ? 0.5 : 0.15 + 0.2 * flick) : (0.05 + 0.08 * flick * (settled ? 0.3 : 1));
          Dt(ce[0], ce[1], w + 0.35, a * A, 0.028, 0);
        }
        L(-0.72, sy, w + 0.35, 0.72, sy, w + 0.35, 0.3 * A, 0, 1);
        /* the lens */
        for (i = 0; i < 48; i++) { var a0 = i / 48 * TAU, r0 = 0.9, r1 = i % 4 === 0 ? 0.95 : 0.92; L(Math.cos(a0) * r0, Math.sin(a0) * r0, w, Math.cos(a0) * r1, Math.sin(a0) * r1, w, 0.35 * A, 0, 0); }
        circ(0, 0, w, 0.9, 56, 0.5 * A, 0, 0); circ(0, 0, w, 0.74, 48, 0.45 * A, 1, 0);
        /* six blades: a hexagon that turns as the aperture opens, and the lines that make the blades */
        var ra = 0.16 + open * 0.5, rot = open * 0.7, vx = [], vy = [];
        for (i = 0; i < 6; i++) { var an = rot + i * TAU / 6; vx.push(Math.cos(an) * ra); vy.push(Math.sin(an) * ra); }
        for (i = 0; i < 6; i++) {
          L(vx[i], vy[i], w, vx[(i + 1) % 6], vy[(i + 1) % 6], w, 0.9 * A, 1, 0);
          var ao = rot + i * TAU / 6 + 0.75; L(vx[i], vy[i], w, Math.cos(ao) * 0.74, Math.sin(ao) * 0.74, w, 0.4 * A, 0, 0);
        }
        /* the pupil follows you */
        circ(px, py, w + 0.1, ra * 0.42, 20, 0.8 * A, 0, 1); Dt(px, py, w + 0.1, 0.9 * A, 0.035, 1);
        /* four verdicts, one settles */
        for (i = 0; i < 4; i++) { var hh = 0.05 + (i === 0 ? 0.22 * f.dev : 0.05 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 2))); rect(-0.42 + i * 0.22, -0.86, 0.12, hh, w, 0.5 * A, 0, i === 0 ? 1 : 0); }
      }
    };
  }

  /* ================= SOLAR (a forecast that admits what it does not know) ================= */
  function Solar() {
    var hour = 0.5, obs = [];
    for (var i = 0; i < 44; i++) obs.push(M.noise(i * 0.5, 1, 4, 31));
    function clear(x) { var s = Math.sin(clamp((x + 0.9) / 1.8, 0, 1) * Math.PI); return -0.5 + 0.86 * Math.pow(s, 1.25); }
    function model(x) { var dip = Math.exp(-Math.pow((x - 0.12) / 0.16, 2)); return -0.5 + (clear(x) + 0.5) * (0.84 - 0.42 * dip); }
    return {
      update: function (dt, t, c) { var target = c.ptr.has ? clamp((c.ptr.u + 0.9) / 1.8, 0, 1) : (t * 0.04) % 1; hour = M.damp(hour, target, 6, dt); },
      emit: function (f, A, c) {
        fr = f; var w = 0.4, i, x;
        L(-0.9, -0.52, w, 0.9, -0.52, w, 0.4 * A, 0, 0);
        for (i = 0; i <= 14; i++) { var tx = -0.9 + i * 0.1286; L(tx, -0.52, w, tx, -0.52 - (i % 2 ? 0.03 : 0.055), w, 0.35 * A, 0, 0); }
        var px = null, py = null;
        for (i = 0; i <= 60; i++) { x = -0.9 + i * 0.03; var y = clear(x); if (px !== null) L(px, py, w, x, y, w, 0.42 * A, 0, 0); px = x; py = y; }
        /* the modelled curve is dashed (it is a claim, not a fact); the band around it is the uncertainty */
        for (i = 0; i < 60; i++) {
          var x0 = -0.9 + i * 0.03, x1 = x0 + 0.03;
          if (i % 2 === 0) L(x0, model(x0), w, x1, model(x1), w, 0.7 * A, 1, 0);
          if (i % 2 === 1) {
            var m = model(x0), cl = Math.exp(-Math.pow((x0 - 0.12) / 0.2, 2)), wd = 0.06 + 0.09 * cl + 0.03 * Math.abs(x0);
            L(x0, m - wd, w - 0.06, x0, m + wd, w - 0.06, 0.22 * A, 0, 0);
          }
        }
        for (i = 0; i < obs.length; i++) { x = -0.9 + i * (1.8 / (obs.length - 1)); var cl2 = Math.exp(-Math.pow((x - 0.12) / 0.2, 2)); Dt(x, model(x) + obs[i] * 0.06 - 0.09 * cl2 * Math.abs(obs[(i * 3) % obs.length]), w + 0.06, 0.7 * A, 0.022, 0); }
        /* the sun's path, and where it is at the hour you are pointing to */
        var pxs = null, pys = null;
        for (i = 0; i <= 30; i++) { var u = -0.9 + i * 0.06, v = 0.66 + Math.sin(i / 30 * Math.PI) * 0.22; if (pxs !== null) L(pxs, pys, w, u, v, w, 0.25 * A, 0, 0); pxs = u; pys = v; }
        var hx = -0.9 + hour * 1.8, hy = 0.66 + Math.sin(hour * Math.PI) * 0.22;
        circ(hx, hy, w, 0.045, 16, 0.9 * A, 0, 1); Dt(hx, hy, w, A, 0.03, 1);
        L(hx, -0.52, w, hx, clear(hx), w, 0.35 * A, 0, 1);
        var hrs = Math.round(5 + hour * 14); T((hrs < 10 ? '0' : '') + hrs + ':00', hx, -0.66, w, 0.07, 0.75 * A, 1, 0.5);
        /* a legend in the empty corner: each name beside a sample of its own mark, out of the data's way */
        L(-0.92, 0.52, w, -0.84, 0.52, w, 0.55 * A, 0, 0); T('CLEAR-SKY', -0.79, 0.5, w, 0.04, 0.45 * A, 0, 0);
        dashed(-0.92, 0.44, -0.84, 0.44, w, 0.7 * A, 4, 1, 0); T('MODELLED', -0.79, 0.42, w, 0.04, 0.55 * A, 0, 0);
        Dt(-0.88, 0.36, w, 0.7 * A, 0.022, 0); T('OBSERVED', -0.79, 0.34, w, 0.04, 0.45 * A, 0, 0);
      }
    };
  }

  /* ================= PIPELINE (ORBIT: what exists, and what does not yet) ================= */
  function Pipeline() {
    var pulse = 0, scrub = -1;
    var xs = [-0.55, -0.27, 0.01, 0.29, 0.57], y0 = 0.28, S = 0.075;
    var labels = ['PARSE', 'NORMALIZE', 'CHUNK', 'EMBED', 'INDEX'];
    return {
      update: function (dt, t, c) {
        if (c.ptr.has && Math.abs(c.ptr.v - y0) < 0.4) scrub = clamp((c.ptr.u + 0.85) / 1.42, 0, 1.3); else scrub = -1;
        if (scrub >= 0) pulse = M.damp(pulse, scrub, 8, dt); else { pulse += dt * (c.reduced ? 0.12 : 0.26); if (pulse > 1.6) pulse = 0; }
      },
      emit: function (f, A, c) {
        fr = f; var w = 0.4, i, k;
        /* the document */
        for (i = 0; i < 7; i++) L(-0.95, y0 + 0.16 - i * 0.055, w, -0.95 + [0.15, 0.13, 0.15, 0.1, 0.14, 0.15, 0.08][i], y0 + 0.16 - i * 0.055, w, 0.5 * A, 0, 0);
        rect(-0.99, y0 - 0.2, 0.23, 0.42, w, 0.35 * A, 0, 0);
        var ux0 = -0.75, ux1 = 0.57, headX = ux0 + (ux1 - ux0) * Math.min(pulse, 1);
        for (i = 0; i < 5; i++) {
          var x = xs[i], lit = sm(x - 0.05, x + 0.05, headX) * (pulse < 1.25 ? 1 : 1 - sm(1.25, 1.5, pulse));
          rect(x - S, y0 - S, S * 2, S * 2, w, (0.3 + 0.6 * lit) * A, 1, lit > 0.6 ? 1 : 0);
          var a = (0.35 + 0.55 * lit) * A;
          if (i === 0) { L(x - 0.03, y0 + 0.03, w, x - 0.005, y0, w, a, 0, 0); L(x - 0.005, y0, w, x - 0.03, y0 - 0.03, w, a, 0, 0); L(x + 0.03, y0 + 0.03, w, x + 0.005, y0, w, a, 0, 0); L(x + 0.005, y0, w, x + 0.03, y0 - 0.03, w, a, 0, 0); }
          if (i === 1) for (k = -1; k <= 1; k++) L(x - 0.04, y0 + k * 0.03, w, x + 0.04, y0 + k * 0.03, w, a, 0, 0);
          if (i === 2) for (k = -1; k <= 1; k++) rect(x - 0.045 + (k + 1) * 0.033, y0 - 0.015, 0.024, 0.03, w, a, 0, 0);
          if (i === 3) { L(x - 0.045, y0, w, x + 0.045, y0, w, a * 0.7, 0, 0); for (k = 0; k < 4; k++) Dt(x - 0.036 + k * 0.024, y0 + (k % 2 ? 0.02 : -0.02), w, a, 0.02, 0); }
          if (i === 4) { L(x - 0.045, y0 - 0.04, w, x - 0.045, y0 + 0.04, w, a, 0, 0); for (k = 0; k < 3; k++) L(x - 0.03, y0 + 0.028 - k * 0.028, w, x + 0.045, y0 + 0.028 - k * 0.028, w, a, 0, 0); }
          T(labels[i], x, y0 - 0.17, w, 0.032, (0.3 + 0.35 * lit) * A, 0, 0.5);
          var nx = i < 4 ? xs[i + 1] : null, sx = x + S;
          if (nx !== null) { L(sx, y0, w, nx - S, y0, w, 0.35 * A, 0, 0); L(nx - S - 0.025, y0 + 0.02, w, nx - S, y0, w, 0.35 * A, 0, 0); L(nx - S - 0.025, y0 - 0.02, w, nx - S, y0, w, 0.35 * A, 0, 0); }
        }
        L(-0.76, y0, w, xs[0] - S, y0, w, 0.35 * A, 0, 0);
        /* the pulse itself */
        if (pulse < 1.3) { var pa = pulse < 1 ? 1 : 1 - sm(1, 1.3, pulse); if (pulse <= 1) { Dt(headX, y0, w, A * pa, 0.05, 1); circ(headX, y0, w, 0.04, 14, 0.7 * A * pa, 0, 1); } else { var dy = y0 - (pulse - 1) / 0.3 * 0.35; Dt(ux1, dy, w, A * pa, 0.04, 1); } }
        /* what does not exist yet: retrieval and chat are drawn, unlit, and the pulse dies before them */
        dashed(ux1, y0 - S, ux1, -0.24, w, 0.25 * A, 10, 0, 0);
        [[0.57, -0.36, 'RETRIEVAL'], [0.27, -0.36, 'CHAT']].forEach(function (s) {
          for (var q = 0; q < 8; q += 2) { var a0 = q / 8 * TAU, a1 = (q + 1) / 8 * TAU; L(s[0] + Math.cos(a0) * 0.08, s[1] + Math.sin(a0) * 0.08, w, s[0] + Math.cos(a1) * 0.08, s[1] + Math.sin(a1) * 0.08, w, 0.3 * A, 0, 0); }
          dashed(s[0] - S, s[1] + S, s[0] + S, s[1] + S, w, 0.28 * A, 6, 0, 0); dashed(s[0] - S, s[1] - S, s[0] + S, s[1] - S, w, 0.28 * A, 6, 0, 0);
          dashed(s[0] - S, s[1] - S, s[0] - S, s[1] + S, w, 0.28 * A, 6, 0, 0); dashed(s[0] + S, s[1] - S, s[0] + S, s[1] + S, w, 0.28 * A, 6, 0, 0);
          T(s[2], s[0], s[1] - 0.16, w, 0.032, 0.25 * A, 0, 0.5);
        });
        dashed(0.49, -0.36, 0.35, -0.36, w, 0.22 * A, 6, 0, 0);
        circ(-0.5, -0.36, w, 0.05, 16, 0.25 * A, 0, 0, 0.3, 5.6); Dt(-0.5, -0.36, w, 0.25 * A, 0.02, 0);   /* a question with no answer yet */
      }
    };
  }

  /* ================= SPHERE (a liquid form) ================= */
  function Sphere() {
    var bx = 0, by = 0, spin = 0;
    return {
      update: function (dt, t, c) { spin += dt * (c.reduced ? 0.12 : 0.34); bx = M.damp(bx, c.ptr.has ? clamp(c.ptr.u, -1, 1) : 0, 4, dt); by = M.damp(by, c.ptr.has ? clamp(c.ptr.v, -1, 1) : 0, 4, dt); },
      emit: function (f, A, c) {
        fr = f; var w = 0.9, t = f.t, i, j, LA = 9, LO = 14, SEG = 22;
        var cs = Math.cos(spin), sn = Math.sin(spin), ct = Math.cos(0.42), st = Math.sin(0.42);
        function v(la, lo) {                                      /* la: -pi/2..pi/2, lo: 0..2pi */
          var x0 = Math.cos(la) * Math.cos(lo), y0 = Math.sin(la), z0 = Math.cos(la) * Math.sin(lo);
          var lq = 1 + 0.14 * Math.sin(3 * x0 + t * 0.8) * Math.cos(2 * y0 - t * 0.6) + 0.08 * Math.sin(4 * z0 + 2 * y0 + t * 1.1);
          var d = x0 * bx + y0 * by + 0.6 * Math.sqrt(Math.max(0.01, 1 - bx * bx - by * by)); lq += 0.28 * Math.max(0, d - 0.55) / 0.45;
          var x = x0 * lq, y = y0 * lq, z = z0 * lq, xr = x * cs + z * sn, zr = -x * sn + z * cs, yr = y * ct - zr * st, zr2 = y * st + zr * ct;
          return [xr * 0.62, yr * 0.62, w + zr2 * 0.4];
        }
        for (i = 1; i < LA; i++) {
          var la = -Math.PI / 2 + i / LA * Math.PI, pv = v(la, 0);
          for (j = 1; j <= SEG; j++) { var cv = v(la, j / SEG * TAU); L(pv[0], pv[1], pv[2], cv[0], cv[1], cv[2], 0.5 * A, i === LA >> 1 ? 1 : 0, 0); pv = cv; }
        }
        for (j = 0; j < LO; j++) {
          var lo = j / LO * TAU, pv2 = v(-Math.PI / 2, lo);
          for (i = 1; i <= 16; i++) { var cv2 = v(-Math.PI / 2 + i / 16 * Math.PI, lo); L(pv2[0], pv2[1], pv2[2], cv2[0], cv2[1], cv2[2], 0.32 * A, 0, 0); pv2 = cv2; }
        }
        /* a halo, and something small in orbit around it */
        var hx = 0.9, ang = t * 0.5, px = null, py = null;
        for (i = 0; i <= 48; i++) { var a = i / 48 * TAU, x = Math.cos(a) * hx, y = Math.sin(a) * hx * 0.28; var xr = x * Math.cos(-0.35) - y * Math.sin(-0.35), yr = x * Math.sin(-0.35) + y * Math.cos(-0.35); if (px !== null) L(px, py, w, xr, yr, w, 0.28 * A, 0, 0); px = xr; py = yr; }
        var ox = Math.cos(ang) * hx, oy = Math.sin(ang) * hx * 0.28; Dt(ox * Math.cos(-0.35) - oy * Math.sin(-0.35), ox * Math.sin(-0.35) + oy * Math.cos(-0.35), w, A, 0.03, 1);
      }
    };
  }

  /* ================= TYPE (a letter, constructed) ================= */
  function Type() {
    var rx = 0.42;
    return {
      update: function (dt, t, c, f) { var want = c.ptr.has ? 0.28 + 0.3 * clamp((c.ptr.u + 1) / 2, 0, 1) : 0.42; rx = M.damp(rx, want, 4, dt); },
      emit: function (f, A, c) {
        fr = f; var w = 0.4, x0 = -0.4, top = 0.5, bot = -0.5, i, dev = f.dev;
        /* guides: the drawing before the letter */
        var g = sm(0.1, 0.5, dev);
        L(-0.95, bot, w, 0.95, bot, w, 0.4 * A * g, 0, 0); L(-0.95, top, w, 0.95, top, w, 0.4 * A * g, 0, 0); dashed(-0.95, 0, 0.95, 0, w, 0.25 * A * g, 30, 0, 0);
        var cx = x0 + 0.02, r = 0.5;
        circ(cx, 0, w, r, 48, 0.22 * A * g, 0, 0);                  /* the circle the bowl is cut from */
        var an = f.t * 0.5; L(cx, 0, w, cx + Math.cos(an) * r, Math.sin(an) * r, w, 0.5 * A * g, 0, 1); Dt(cx, 0, w, 0.7 * A * g, 0.02, 1);
        var l = sm(0.35, 0.85, dev);
        /* the letter: a stem, two rules, and an ellipse whose width is a number */
        var bw = rx;
        L(x0, bot, w, x0, top, w, 0.9 * A * l, 1, 0);
        L(x0, top, w, x0 + 0.38, top, w, 0.9 * A * l, 1, 0); L(x0, bot, w, x0 + 0.38, bot, w, 0.9 * A * l, 1, 0);
        var px = null, py = null;
        for (i = 0; i <= 28; i++) { var a = Math.PI / 2 - i / 28 * Math.PI, x = x0 + 0.38 + Math.cos(a) * bw, y = Math.sin(a) * 0.5; if (px !== null) L(px, py, w, x, y, w, 0.9 * A * l, 1, 0); px = x; py = y; }
        L(x0 - 0.06, top, w, x0 + 0.06, top, w, 0.6 * A * l, 0, 0); L(x0 - 0.06, bot, w, x0 + 0.06, bot, w, 0.6 * A * l, 0, 0);
        /* the measurement */
        L(x0 + 0.38, -0.66, w, x0 + 0.38 + bw, -0.66, w, 0.5 * A * l, 0, 0); L(x0 + 0.38, -0.7, w, x0 + 0.38, -0.62, w, 0.5 * A * l, 0, 0); L(x0 + 0.38 + bw, -0.7, w, x0 + 0.38 + bw, -0.62, w, 0.5 * A * l, 0, 0);
        T(bw.toFixed(2), x0 + 0.38 + bw / 2, -0.82, w, 0.07, 0.7 * A * l, 0, 0.5);
        /* the rest of the alphabet, waiting */
        var lx = -0.9; 'ABCDEFG'.split('').forEach(function (ch) { var d = G.defs[ch]; d.s.forEach(function (p) { for (var j = 1; j < p.length; j++) L(lx + p[j - 1][0] * 0.11, 0.78 + p[j - 1][1] * 0.11, w, lx + p[j][0] * 0.11, 0.78 + p[j][1] * 0.11, w, 0.3 * A * l, 0, 0); }); lx += (d.w + 0.35) * 0.11; });
      }
    };
  }

  /* ================= GHOST (an intention with nothing found yet) ================= */
  /* It is the one door that will not open for someone who only looks. When it is forced (mind.js: forb), the three
     streams no longer stop short of the line: they cross it and become one figure, the signature. That is not a
     claim about anything made; it is what was behind a door that said not yet. */
  function Ghost() {
    var ph = [0, 0.33, 0.66];
    return {
      update: function (dt, t, c) { for (var i = 0; i < 3; i++) ph[i] = (ph[i] + dt * (c.reduced ? 0.04 : 0.09) * (1 + 0.3 * i)) % 1; },
      emit: function (f, A, c) {
        fr = f; var w = 0.4, i, k, op = clamp(f.open, 0, 1);
        /* an image, a text, a signal - three streams that come toward one place and stop short of it (unless the door was forced) */
        for (i = 0; i < 3; i++) {
          var p = ph[i], reach = 0.95 + op * 0.9, u = -0.9 + p * reach, fade = p > 0.88 && op < 0.5 ? 1 - (p - 0.88) / 0.12 : 1, y = (0.4 - i * 0.4) * (1 - op * sm(0.5, 1, p));
          var a = 0.3 * A * fade * (0.5 + 0.5 * p);
          if (i === 0) for (var r = 0; r < 3; r++) for (k = 0; k < 5; k++) Dt(u + k * 0.05, y + 0.05 - r * 0.05, w, a * (0.5 + 0.5 * Math.sin(f.t * 3 + k * r)), 0.03, 0);
          if (i === 1) for (k = 0; k < 4; k++) dashed(u, y + 0.06 - k * 0.04, u + [0.28, 0.22, 0.3, 0.14][k], y + 0.06 - k * 0.04, w, a, 6, 0, 0);
          if (i === 2) { var px = null, py = null; for (k = 0; k <= 16; k++) { var x = u + k * 0.02, yy = y + Math.sin(k * 0.7 + f.t * 2) * 0.05; if (px !== null) L(px, py, w, x, yy, w, a, 0, 0); px = x; py = yy; } }
        }
        dashed(0.1, 0.55, 0.1, -0.55, w, 0.12 * A * (1 - 0.8 * op), 20, 0, 0);
        if (op < 0.02) { circ(0.32, 0, w, 0.09, 20, 0.22 * A, 0, 0); circ(0.32, 0, w, 0.03, 10, 0.2 * A, 0, 0); return; }
        /* what was behind it: the signature, drawn by the same pendulums, at the size of the counter */
        var np = SID.DNA.sample(360, Math.max(0.15, SID.DNA.st.prog)), X = SID.DNA.px, Y = SID.DNA.py, cu = 0.34, ru = 0.5 * (0.35 + 0.65 * op);
        for (i = 1; i < np; i++) L(cu + X[i - 1] * ru, Y[i - 1] * ru, w, cu + X[i] * ru, Y[i] * ru, w, 0.5 * A * op * (0.35 + 0.65 * Math.exp(-i / np * 0.9)), 0, i % 80 < 3 ? 1 : 0);
        circ(cu, 0, w, ru * 1.12, 40, 0.16 * A * op, 0, 0);
      }
    };
  }

  var FACT = { gravity: Gravity, route: Route, wireframe: Wireframe, eye: Eye, solar: Solar, pipeline: Pipeline, sphere: Sphere, type: Type, ghost: Ghost };
  SID.Memories = { create: function (type) { return (FACT[type] || Ghost)(); } };
})();
