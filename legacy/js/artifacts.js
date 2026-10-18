/* ------------------------------------------------------------------
   artifacts.js  -  what is in the archive, as data and as strokes.

   An artifact is a letter that is not a letter. It is a drawing on the same cap-height grid as the
   typeface (y up, one unit tall), registered as a glyph, so it becomes everything a letter becomes:
   sketched, inferred, computed, designed, measured, by the same law (letters.js).

   What is here comes from the record and nothing else. Each artifact is one of the "artefacts"
   listed under his own projects, and it is drawn from what that artefact is said to DO, never from
   an image of it (the record contains none). Where something is said not to exist yet, it is drawn
   dashed and its ceiling is close to nothing: it can be seen, and it never resolves.

   `proj` is the work it belongs to. `tools` are the tools the record names for that work. Two
   artifacts that share either are related, and the archive can show it (deep-strata.js).
   `ceil` is the evidence ceiling, as on the wall: how far the record lets it resolve.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID, G = SID.Glyphs, M = SID.M, RAD = Math.PI / 180;

  /* ---- a few strokes ---- */
  function poly() { var a = arguments, o = []; for (var i = 0; i < a.length; i += 2) o.push([a[i], a[i + 1]]); return o; }
  function ellPt(cx, cy, rx, ry, rot, t) { var c = Math.cos(t * RAD), s = Math.sin(t * RAD), x = rx * c, y = ry * s, cr = Math.cos(rot * RAD), sr = Math.sin(rot * RAD); return [cx + x * cr - y * sr, cy + x * sr + y * cr]; }
  function ell(cx, cy, rx, ry, rot, a0, a1) {
    var n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 8)), o = [];
    for (var i = 0; i <= n; i++) o.push(ellPt(cx, cy, rx, ry, rot || 0, a0 + (a1 - a0) * i / n));
    return o;
  }
  function circ(cx, cy, r) { return ell(cx, cy, r, r, 0, 0, 360); }
  function rect(x, y, w, h) { return poly(x, y, x + w, y, x + w, y + h, x, y + h, x, y); }
  function ln(x0, y0, x1, y1) { return [[x0, y0], [x1, y1]]; }
  function dashes(x0, y0, x1, y1, n) {                       /* n dashes along a line (every other segment of 2n-1) */
    var o = [], d = 2 * n - 1;
    for (var i = 0; i < d; i += 2) o.push(ln(x0 + (x1 - x0) * i / d, y0 + (y1 - y0) * i / d, x0 + (x1 - x0) * (i + 1) / d, y0 + (y1 - y0) * (i + 1) / d));
    return o;
  }
  function dashedPoly(pts, n) {                              /* a polyline as short dashes: the sign for something that does not exist yet */
    var o = [], tot = 0, i, cum = [0];
    for (i = 1; i < pts.length; i++) { tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(tot); }
    function at(d) { var j = 1; while (j < pts.length - 1 && cum[j] < d) j++; var u = (d - cum[j - 1]) / ((cum[j] - cum[j - 1]) || 1); return [pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * u, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * u]; }
    var step = tot / (2 * n - 1);
    for (i = 0; i < 2 * n - 1; i += 2) { var a = at(i * step), b = at((i + 1) * step), seg = [a], k; for (k = 1; k < pts.length - 1; k++) if (cum[k] > i * step && cum[k] < (i + 1) * step) seg.push(pts[k]); seg.push(b); o.push(seg); }
    return o;
  }
  var rr = M.rng(90210);
  function def(id, w, strokes, opts) { G.defs['@' + id] = { ch: '@' + id, w: w, s: strokes, anchor: null, nt: !!(opts && opts.nt) }; }

  /* ================= the drawings ================= */

  /* Cosmos Engine: a workspace, its controls, its feedback */
  (function () {
    var C = [0.8, 0.5], s = [rect(0, 0, 1.6, 1)];
    s.push(circ(0.8, 0.5, 0.04), ell(C[0], C[1], 0.62, 0.2, 18, 0, 360), ell(C[0], C[1], 0.36, 0.36, 0, 0, 360), ell(C[0], C[1], 0.74, 0.35, -28, 0, 360));
    [[0.62, 0.2, 18, 40], [0.36, 0.36, 0, 200], [0.74, 0.35, -28, 300]].forEach(function (o) { var p = ellPt(C[0], C[1], o[0], o[1], o[2], o[3]); s.push(circ(p[0], p[1], 0.024)); });
    for (var i = 1; i <= 5; i++) s.push(ln(0.2 * i + 0.1, 0, 0.2 * i + 0.1, 0.05));
    def('workspace', 1.6, s);

    s = [rect(0, 0, 1.4, 1)];
    [[0.82, 0.5], [0.64, 0.78], [0.46, 0.34], [0.28, 0.66]].forEach(function (o) { s.push(ln(0.14, o[0], 0.98, o[0]), circ(0.14 + 0.84 * o[1], o[0], 0.042), ln(0.14, o[0] - 0.035, 0.14, o[0] + 0.035), ln(0.98, o[0] - 0.035, 0.98, o[0] + 0.035)); });
    s.push(ln(1.1, 0.78, 1.24, 0.78), ln(1.17, 0.71, 1.17, 0.85), ln(1.1, 0.6, 1.24, 0.6));
    s.push(ln(1.1, 0.34, 1.24, 0.34), ln(1.17, 0.27, 1.17, 0.41), poly(1.17, 0.45, 1.145, 0.41, 1.195, 0.41, 1.17, 0.45), poly(1.17, 0.23, 1.145, 0.27, 1.195, 0.27, 1.17, 0.23));
    s.push(poly(0.14, 0.06, 0.14, 0.18, 0.24, 0.12, 0.14, 0.06));
    def('controls', 1.4, s);

    s = [];
    for (i = 0; i < 15; i++) {
      var a = i * 24 * RAD + 0.3, r0 = 0.09 + (i % 3) * 0.05, r1 = r0 + 0.1 + ((i * 7) % 5) * 0.06;
      s.push(ln(0.5 + Math.cos(a) * r0, 0.5 + Math.sin(a) * r0, 0.5 + Math.cos(a) * r1, 0.5 + Math.sin(a) * r1));
    }
    s.push(ell(0.5, 0.5, 0.46, 0.46, 0, 200, 300), ell(0.5, 0.5, 0.36, 0.36, 0, 20, 90));
    for (i = 0; i < 7; i++) { var pa = rr() * 6.28, pr = 0.25 + rr() * 0.22; s.push(circ(0.5 + Math.cos(pa) * pr, 0.5 + Math.sin(pa) * pr, 0.012 + rr() * 0.01)); }
    def('feedback', 1.0, s, { nt: true });
  })();

  /* Travelease: discovery, a loop of exploration, planning support */
  (function () {
    /* a region divided into states: a coast, and borders that wander; one place chosen */
    var coast = [], k;
    for (k = 0; k <= 56; k++) { var ta = k / 56 * 6.2832, rc = 0.4 + 0.07 * Math.sin(2 * ta + 1) + 0.045 * Math.sin(3 * ta) + 0.025 * Math.sin(7 * ta + 2); coast.push([0.5 + rc * Math.cos(ta) * 1.02, 0.5 + rc * Math.sin(ta)]); }
    function border(a, b, seed) { var o = [], q; for (q = 0; q <= 9; q++) { var u = q / 9, w = Math.sin(u * Math.PI) * 0.05 * Math.sin(seed + u * 7); o.push([a[0] + (b[0] - a[0]) * u + w, a[1] + (b[1] - a[1]) * u - w * 0.6]); } return o; }
    var s = [coast, border([0.2, 0.78], [0.62, 0.46], 1), border([0.62, 0.46], [0.88, 0.7], 2), border([0.62, 0.46], [0.5, 0.11], 3), border([0.3, 0.2], [0.62, 0.46], 4), border([0.2, 0.78], [0.1, 0.42], 5)];
    s.push(circ(0.42, 0.62, 0.032), ln(0.42, 0.592, 0.42, 0.5), ln(0.3, 0.72, 0.3, 0.75), ln(0.3, 0.72, 0.33, 0.72), ln(0.54, 0.52, 0.54, 0.49), ln(0.54, 0.49, 0.51, 0.49));
    def('discovery', 1.0, s);

    s = []; var loop = [], i;
    for (i = 0; i <= 64; i++) { var t = i / 64 * 6.2832, r = 0.34 + 0.06 * Math.sin(3 * t) + 0.035 * Math.sin(5 * t + 1); loop.push([0.6 + r * Math.cos(t) * 1.4, 0.46 + r * Math.sin(t) * 1.0]); }
    s.push(loop);
    for (i = 0; i < 5; i++) { var q = loop[Math.round(i * 64 / 5 + 4)]; s.push(circ(q[0], q[1] + 0.09, 0.034), ln(q[0], q[1] + 0.055, q[0], q[1])); }
    var xq = loop[Math.round(3 * 64 / 5 + 4)]; s.push(ln(xq[0] - 0.03, xq[1] + 0.06, xq[0] + 0.03, xq[1] + 0.12), ln(xq[0] - 0.03, xq[1] + 0.12, xq[0] + 0.03, xq[1] + 0.06));
    def('loop', 1.2, s);

    function bubble(x, y, w, h, tail) { var c = 0.05; return poly(x + c, y, x + w - c, y, x + w, y + c, x + w, y + h - c, x + w - c, y + h, x + c, y + h, x, y + h - c, x, y + c, x + c, y).concat([]); }
    s = [bubble(0.02, 0.56, 0.68, 0.38), poly(0.1, 0.56, 0.06, 0.46, 0.2, 0.56), ln(0.1, 0.8, 0.5, 0.8), ln(0.1, 0.7, 0.36, 0.7),
         bubble(0.62, 0.06, 0.66, 0.34), poly(1.2, 0.06, 1.24, -0.04, 1.1, 0.06), ln(0.7, 0.28, 1.1, 0.28), ln(0.7, 0.18, 0.94, 0.18)];
    s.push(poly(0.04, 0.3, 0.22, 0.4, 0.32, 0.2, 0.46, 0.34), circ(0.04, 0.3, 0.025), circ(0.22, 0.4, 0.025), circ(0.32, 0.2, 0.025), circ(0.46, 0.34, 0.025));
    def('planning', 1.3, s);
  })();

  /* PETPONKS: only construction geometry (the mark itself is not in the record, so it is not drawn) */
  (function () {
    var s = [circ(0.5, 0.5, 0.42), circ(0.5, 0.5, 0.21), rect(0.5 - 0.297, 0.5 - 0.297, 0.594, 0.594), poly(0.5, 0.92, 0.92, 0.5, 0.5, 0.08, 0.08, 0.5, 0.5, 0.92), ln(0.04, 0.5, 0.96, 0.5), ln(0.5, 0.04, 0.5, 0.96), ell(0.5, 0.5, 0.31, 0.31, 0, 20, 70), ell(0.5, 0.5, 0.31, 0.31, 0, 200, 250)];
    def('brand', 1.0, s);
    s = [rect(0, 0, 0.8, 1), rect(0.04, 0.88, 0.72, 0.08), rect(0.04, 0.5, 0.72, 0.34), ln(0.04, 0.5, 0.76, 0.84), ln(0.04, 0.84, 0.76, 0.5), rect(0.04, 0.2, 0.22, 0.24), rect(0.29, 0.2, 0.22, 0.24), rect(0.54, 0.2, 0.22, 0.24), ln(0.08, 0.36, 0.22, 0.36), ln(0.33, 0.36, 0.47, 0.36), ln(0.58, 0.36, 0.72, 0.36), rect(0.04, 0.04, 0.72, 0.1)];
    def('structure', 0.8, s);
    /* colour, typography, layout: three swatches, a specimen of type, a baseline */
    var A = G.defs.A.s.map(function (p) { return p.map(function (q) { return [0.08 + q[0] * 0.38, 0.12 + q[1] * 0.38]; }); });
    s = [rect(0.05, 0.62, 0.3, 0.3), rect(0.45, 0.62, 0.3, 0.3), rect(0.85, 0.62, 0.3, 0.3), ln(0.05, 0.12, 1.15, 0.12)].concat(A);
    s.push(circ(0.7, 0.21, 0.09), ln(0.79, 0.12, 0.79, 0.3));
    dashes(0.05, 0.3, 1.15, 0.3, 14).forEach(function (d) { s.push(d); });
    def('language', 1.2, s);
  })();

  /* VIGIL-88: a monitoring dashboard, a classification pipeline, a watchfulness */
  (function () {
    var s = [rect(0, 0, 1.4, 1), rect(0.05, 0.5, 0.6, 0.44), rect(0.7, 0.5, 0.65, 0.44), rect(0.05, 0.06, 0.4, 0.38), rect(0.5, 0.06, 0.85, 0.38)], i;
    [[0.1, 0.36], [0.2, 0.62], [0.3, 0.48], [0.4, 0.78], [0.5, 0.56]].forEach(function (b) { s.push(rect(b[0] + 0.02, 0.54, 0.06, (b[1] - 0.5) * 0.9 + 0.06)); });
    s.push(poly(0.76, 0.6, 0.88, 0.78, 1.0, 0.66, 1.1, 0.86, 1.28, 0.74), ln(0.76, 0.56, 1.3, 0.56), ln(0.76, 0.56, 0.76, 0.9));
    s.push(ell(0.25, 0.14, 0.15, 0.15, 0, 0, 180), ln(0.25, 0.14, 0.32, 0.26));
    for (i = 0; i < 3; i++) for (var j = 0; j < 2; j++) { s.push(rect(0.56 + i * 0.25, 0.1 + j * 0.15, 0.16, 0.1)); if ((i + j) % 2 === 0) s.push(ln(0.6 + i * 0.25, 0.15 + j * 0.15, 0.68 + i * 0.25, 0.15 + j * 0.15)); }
    def('dashboard', 1.4, s);

    s = [rect(0.02, 0.32, 0.22, 0.36), ln(0.02, 0.32, 0.24, 0.68), ln(0.02, 0.68, 0.24, 0.32)];
    var xs = [0.34, 0.56, 0.78, 1.0], hs = [0.78, 0.62, 0.46, 0.34];
    xs.forEach(function (x, k) { var h = hs[k], y0 = 0.5 - h / 2; s.push(poly(x, y0, x + 0.1, y0 + 0.05, x + 0.1, y0 + h + 0.05, x, y0 + h, x, y0), ln(x, y0 + h, x + 0.1, y0 + h + 0.05), ln(x + 0.1, y0 + 0.05, x + 0.1, y0 + h + 0.05)); });
    s.push(ell(0.55, 0.96, 0.22, 0.22, 0, 20, 160), ell(0.89, 0.92, 0.22, 0.22, 0, 20, 160));
    [[0.24, 0.5, 0.34, 0.5], [0.44, 0.5, 0.56, 0.5], [0.66, 0.5, 0.78, 0.5], [0.88, 0.5, 1.0, 0.5], [1.1, 0.5, 1.3, 0.5]].forEach(function (a) { s.push(ln(a[0], a[1], a[2], a[3])); });
    [0.62, 0.36, 0.7, 0.24, 0.12].forEach(function (h, k) { s.push(rect(1.36 + k * 0.08, 0.5 - 0.3, 0.05, h * 0.5)); });
    def('pipeline', 1.8, s);

    s = [circ(0.5, 0.5, 0.46), circ(0.5, 0.5, 0.32), circ(0.5, 0.5, 0.18), ln(0.02, 0.5, 0.3, 0.5), ln(0.7, 0.5, 0.98, 0.5), ln(0.5, 0.02, 0.5, 0.3), ln(0.5, 0.7, 0.5, 0.98), ln(0.5, 0.5, 0.5 + 0.46 * Math.cos(35 * RAD), 0.5 + 0.46 * Math.sin(35 * RAD)), ell(0.5, 0.5, 0.39, 0.39, 0, 8, 35), circ(0.72, 0.72, 0.02), circ(0.3, 0.68, 0.02)];
    def('defense', 1.0, s);
  })();

  /* the visual-design collection: identities explored, campaign assets, type and composition */
  (function () {
    var s = [rect(0, 0, 1, 1), ln(0.5, 0.04, 0.5, 0.96), ln(0.04, 0.5, 0.96, 0.5)];
    s.push(circ(0.27, 0.73, 0.15), ln(0.13, 0.59, 0.41, 0.87), rect(0.6, 0.6, 0.28, 0.28), poly(0.74, 0.9, 0.9, 0.74, 0.74, 0.58, 0.58, 0.74, 0.74, 0.9));
    s.push(circ(0.27, 0.27, 0.16), poly(0.27, 0.43, 0.41, 0.19, 0.13, 0.19, 0.27, 0.43), circ(0.66, 0.27, 0.12), circ(0.82, 0.27, 0.12));
    def('logos', 1.0, s);

    s = [rect(0.05, 0.08, 0.42, 0.84), ln(0.11, 0.8, 0.41, 0.8), ln(0.11, 0.72, 0.34, 0.72), circ(0.26, 0.42, 0.13), ln(0.11, 0.16, 0.41, 0.16), rect(0.57, 0.56, 0.9, 0.36), ln(0.63, 0.82, 1.1, 0.82), ln(0.63, 0.74, 0.9, 0.74), circ(1.28, 0.74, 0.11), rect(0.57, 0.08, 0.36, 0.36), ln(0.63, 0.34, 0.87, 0.34), ln(0.63, 0.26, 0.8, 0.26), rect(1.03, 0.08, 0.44, 0.36), ln(1.03, 0.08, 1.47, 0.44)];
    def('posters', 1.5, s);

    /* typography: a letter on its guides, and the space between two of them measured */
    var R = G.defs.R.s.map(function (p) { return p.map(function (q) { return [0.16 + q[0] * 0.66, 0.12 + q[1] * 0.76]; }); });
    s = [ln(0, 0.12, 1, 0.12), ln(0, 0.88, 1, 0.88), ln(0, 0.6, 1, 0.6), ln(0.08, 0.02, 0.08, 0.98), ln(0.9, 0.02, 0.9, 0.98)].concat(R);
    s.push(ell(0.16 + 0.36 * 0.66, 0.12 + 0.75 * 0.76, 0.3 * 0.66, 0.25 * 0.76, 0, 0, 360));
    def('typo', 1.0, s);
  })();

  /* a drafting sheet: the ground of the three places the record does not fill (deep-data.js) */
  (function () {
    var s = [rect(0, 0, 0.72, 1), rect(0.03, 0.03, 0.66, 0.94), rect(0.36, 0.035, 0.325, 0.1), ln(0.36, 0.085, 0.685, 0.085)];
    [[0.075, 0.075], [0.645, 0.925], [0.075, 0.925], [0.645, 0.075]].forEach(function (c) { s.push(ln(c[0] - 0.025, c[1], c[0] + 0.025, c[1]), ln(c[0], c[1] - 0.025, c[0], c[1] + 0.025)); });
    dashes(0.36, 0.16, 0.36, 0.9, 9).forEach(function (d) { s.push(d); });
    def('sheet', 0.72, s, { nt: true });
  })();

  /* what does not exist yet: dashed, and it never resolves */
  (function () {
    var mag = [];
    var lens = ell(0.4, 0.58, 0.3, 0.3, 0, 0, 360);
    mag = dashedPoly(lens, 12).concat(dashedPoly([[0.62, 0.36], [0.9, 0.08]], 4), dashedPoly([[0.3, 0.58], [0.5, 0.58]], 2), dashedPoly([[0.4, 0.48], [0.4, 0.68]], 2));
    def('retrieval', 1.0, mag, { nt: true });
    var b = poly(0.1, 0.32, 0.9, 0.32, 0.9, 0.9, 0.1, 0.9, 0.1, 0.32);
    var chat = dashedPoly(b, 14).concat(dashedPoly([[0.24, 0.32], [0.16, 0.14], [0.4, 0.32]], 3), dashedPoly([[0.2, 0.7], [0.72, 0.7]], 4), dashedPoly([[0.2, 0.52], [0.54, 0.52]], 3));
    def('chat', 1.0, chat, { nt: true });

    /* SPECTRA: three kinds of signal approaching a line and stopping short of it */
    var s = [ln(1.2, 0.04, 1.2, 0.96)], i, j;
    for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) s.push(rect(0.04 + i * 0.13, 0.66 + j * 0.1, 0.09, 0.06));
    for (i = 0; i < 4; i++) s.push(ln(0.04, 0.5 - i * 0.05, 0.3 + (i % 2) * 0.16, 0.5 - i * 0.05));
    var wave = []; for (i = 0; i <= 44; i++) wave.push([0.04 + i * 0.0245, 0.16 + Math.sin(i * 0.55) * 0.1 * (1 - i / 90)]);
    s.push(wave);
    s.push(ln(0.56, 0.75, 1.1, 0.75), ln(0.74, 0.49, 1.1, 0.49));
    def('spectra', 1.3, s);
  })();

  /* ================= the archive ================= */
  /* place: th (radians from the direction you were facing at the end), D (how far down), r (distance from the axis, the wall is 7.56),
     cap (its height), yaw (how far it is turned from squarely facing the axis) */
  var LIST = [
    /* Cosmos Engine */
    { id: 'workspace', proj: 'COSMOS ENGINE', label: 'SIMULATION WORKSPACE', tools: ['HTML', 'CSS', 'JAVASCRIPT'], ceil: 1.0, door: 'gravity', p: { th: -0.42, D: 19, r: 5.6, cap: 3.3, yaw: 0.25 } },
    { id: 'controls', proj: 'COSMOS ENGINE', label: 'CONTROLS', tools: ['HTML', 'CSS', 'JAVASCRIPT'], ceil: 1.0, door: 'gravity', p: { th: 0.62, D: 27, r: 6.4, cap: 2.6, yaw: -0.3 } },
    { id: 'feedback', proj: 'COSMOS ENGINE', label: 'SYSTEM FEEDBACK', tools: ['HTML', 'CSS', 'JAVASCRIPT'], ceil: 1.0, door: 'gravity', p: { th: 2.35, D: 33, r: 4.6, cap: 2.5, yaw: 0.2 } },
    /* Travelease */
    { id: 'discovery', proj: 'TRAVELEASE', label: 'DESTINATION DISCOVERY', tools: ['HTML', 'CSS', 'JAVASCRIPT'], ceil: 1.0, door: 'route', p: { th: -1.15, D: 45, r: 6.6, cap: 3.0, yaw: 0.35 } },
    { id: 'loop', proj: 'TRAVELEASE', label: 'EXPLORATION LOOP', tools: ['HTML', 'CSS', 'JAVASCRIPT'], ceil: 1.0, door: 'route', p: { th: 0.12, D: 53, r: 4.3, cap: 2.7, yaw: -0.15 } },
    { id: 'planning', proj: 'TRAVELEASE', label: 'PLANNING SUPPORT', tools: ['HTML', 'CSS', 'JAVASCRIPT'], ceil: 1.0, door: 'route', p: { th: 1.25, D: 60, r: 6.9, cap: 3.0, yaw: -0.4 } },
    /* PETPONKS */
    { id: 'brand', proj: 'PETPONKS', label: 'BRAND FOUNDATION', tools: ['FIGMA', 'FRAMER'], ceil: 1.0, door: 'wireframe', p: { th: -0.2, D: 73, r: 5.2, cap: 3.0, yaw: 0.1 } },
    { id: 'structure', proj: 'PETPONKS', label: 'PLATFORM STRUCTURE', tools: ['FIGMA', 'FRAMER'], ceil: 1.0, door: 'wireframe', p: { th: 0.95, D: 81, r: 6.2, cap: 3.2, yaw: -0.3 } },
    { id: 'language', proj: 'PETPONKS', label: 'VISUAL LANGUAGE', tools: ['FIGMA', 'FRAMER'], ceil: 1.0, door: 'wireframe', p: { th: -1.7, D: 88, r: 6.6, cap: 2.6, yaw: 0.4 } },
    /* VIGIL-88 */
    { id: 'dashboard', proj: 'VIGIL-88', label: 'MONITORING DASHBOARD', tools: ['PYTHON', 'PYQT6'], ceil: 1.0, door: 'eye', p: { th: 0.35, D: 101, r: 5.4, cap: 3.1, yaw: -0.2 } },
    { id: 'pipeline', proj: 'VIGIL-88', label: 'COMPUTER-VISION PIPELINE', tools: ['PYTHON', 'PYTORCH', 'TORCHVISION', 'RESNET-18'], ceil: 1.0, door: 'eye', p: { th: -0.95, D: 109, r: 6.8, cap: 2.8, yaw: 0.3 } },
    { id: 'defense', proj: 'VIGIL-88', label: 'DIGITAL-DEFENSE IDENTITY', tools: ['PYQT6'], ceil: 1.0, door: 'eye', p: { th: 1.85, D: 116, r: 5.0, cap: 2.8, yaw: -0.25 } },
    /* the visual-design collection */
    { id: 'logos', proj: 'CREATIVE DESIGN COLLECTION', label: 'LOGO AND IDENTITY EXPLORATIONS', tools: [], ceil: 1.0, door: 'type', p: { th: -0.5, D: 128, r: 6.0, cap: 2.9, yaw: 0.2 } },
    { id: 'posters', proj: 'CREATIVE DESIGN COLLECTION', label: 'POSTERS AND CAMPAIGN ASSETS', tools: [], ceil: 1.0, door: 'type', p: { th: 0.75, D: 136, r: 6.9, cap: 2.8, yaw: -0.35 } },
    { id: 'typo', proj: 'CREATIVE DESIGN COLLECTION', label: 'TYPOGRAPHY AND COMPOSITION', tools: [], ceil: 1.0, door: 'type', p: { th: 2.1, D: 142, r: 4.8, cap: 3.0, yaw: 0.3 } },
    /* what the record says does not exist: seen, never resolved */
    { id: 'retrieval', proj: 'ORBIT', label: 'RETRIEVAL', tools: ['PYTHON'], ceil: 0.06, unlit: true, door: 'pipeline', p: { th: -1.4, D: 152, r: 6.4, cap: 2.6, yaw: 0.3 } },
    { id: 'chat', proj: 'ORBIT', label: 'CHAT', tools: ['PYTHON'], ceil: 0.06, unlit: true, door: 'pipeline', p: { th: -0.55, D: 156, r: 5.6, cap: 2.6, yaw: 0.15 } },
    { id: 'spectra', proj: 'SPECTRA', label: 'MULTIMODAL PERCEPTION', tools: [], ceil: 0.32, unlit: true, door: 'ghost', p: { th: 0.7, D: 162, r: 6.4, cap: 2.8, yaw: -0.3 } }
  ];
  var byId = {};
  LIST.forEach(function (a, i) { a.i = i; a.glyph = '@' + a.id; byId[a.id] = a; });

  SID.Artifacts = { list: LIST, byId: byId };
})();
