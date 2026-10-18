/* ------------------------------------------------------------------
   dna.js  -  a signature that is drawn, not designed.

   It is a harmonograph: a figure traced by damped pendulums. Nothing
   in it is a logo; it is what a handful of springs do when they are
   left to swing, and springs are what this whole piece is made of.

   The figure has ten loci. Five are the five layers of the name (instrument,
   design, lattice, field, trace): passing through them in Module 1, slowly,
   is how much of the path the pen has drawn. The other five decide the SHAPE:

     curiosity  how finely the pendulums are tuned: 2:3, then 3:4, then 4:5 ...  (frequency, density)
     ideas      how round it is                         (curvature)
     balance    how strongly the mirrored partner swings  (symmetry)
     memory     how long it keeps swinging before it settles  (persistence)
     mutation   how far the pendulums are out of tune   (precession)

   Complexity is the tuning, not a heap of unrelated pendulums: one pair, tuned
   finer, stays an ordered woven figure however far it grows.

   Nothing here is told to the visitor, and it is shown in exactly one place:
   behind the door that says NOT YET, once that door has been forced (memories.js).
   (It was once drawn round the ember, in a letter I, and at the edge. Each was
   taken out.) It still grows, unseen, from what is found, and is kept between
   visits.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID, M = SID.M, TAU = Math.PI * 2, clamp = M.clamp;

  var LOCI = ['instrument', 'design', 'lattice', 'field', 'trace', 'curiosity', 'ideas', 'balance', 'memory', 'mutation'];
  var I = {};  LOCI.forEach(function (n, i) { I[n] = i; });
  var g = new Float32Array(LOCI.length);                  /* expression, 0..1 */

  /* the pendulums: one pair (n, n+1) and its mirrored partner (n+1, n). Integer ratios close the figure;
     the small detune is what makes each pass land a little to one side of the last */
  var st = {
    prog: 0,                                              /* how much of the path the pen has drawn, 0..1 */
    t: 0, phase: 0,                                       /* slow precession of the whole figure */
    detune: 0, seed: 0
  };

  var MAXN = 2400, PX = new Float32Array(MAXN), PY = new Float32Array(MAXN), PE = new Float32Array(MAXN);
  var ax = 1, delta = 0.03, loops = 4, bAmp = 0.3, lag = 0, fnow = 2, ph0 = 0, ph1 = 1.3;

  /* the parameters of the path from the loci (cheap: run once per frame, not per point) */
  function params() {
    var cur = g[I.curiosity], ide = g[I.ideas], bal = g[I.balance], mem = g[I.memory], mut = g[I.mutation];
    fnow = 2 + 3 * cur;                                   /* 2:3 -> 5:6 */
    ax = M.lerp(0.6, 1, ide);
    bAmp = 0.16 + 0.24 * bal;
    lag = (1 - bal) * 0.9;                                /* at balance 1 the two hands agree exactly: the figure is symmetric */
    /* the pendulums are never quite in tune; mutation takes them further out */
    st.detune = 0.005 + 0.02 * mut;
    ph0 = st.seed * 6.283; ph1 = ph0 + 1.3;
    delta = 0.034 - 0.022 * mem;
    loops = 3.0 + 3.2 * mem + 1.0 * cur;
  }

  /* n samples of the path for the pair (m, m+1), from tau = 0 to frac * T. Unit figure, |x|,|y| <= 1 */
  function path(n, frac, m) {
    n = Math.min(n, MAXN);
    var T = TAU * loops * (3 / (m + 1)), t1 = T * frac, off = st.phase, e = st.detune, nrm = 1 / (1 + bAmp);
    var fx0 = m * (1 + e), fy0 = (m + 1) * (1 - e), fx1 = (m + 1) * (1 - e * 0.7), fy1 = m * (1 + e * 0.7);
    for (var i = 0; i < n; i++) {
      var tau = t1 * i / (n - 1 || 1);
      var x = Math.sin(fx0 * tau + ph0 + off) + bAmp * Math.sin(fx1 * tau + ph1 + off);
      var y = Math.sin(fy0 * tau + ph0 + 1.5708 + off * 0.7) + bAmp * Math.sin(fy1 * tau + ph1 + 1.5708 + lag + off * 0.7);
      var d = Math.exp(-delta * tau);
      PX[i] = x * nrm * ax * d; PY[i] = y * nrm * d; PE[i] = d;
    }
    return n;
  }

  var DNA = SID.DNA = {
    LOCI: LOCI, I: I, g: g, st: st,
    /* raise a locus (never past 1). Returns how much it actually rose, so callers can tell a first discovery */
    express: function (name, amount) {
      var i = typeof name === 'number' ? name : I[name], before = g[i];
      g[i] = clamp(before + amount, 0, 1);
      return g[i] - before;
    },
    set: function (name, v) { g[typeof name === 'number' ? name : I[name]] = clamp(v, 0, 1); },
    get: function (name) { return g[typeof name === 'number' ? name : I[name]]; },
    load: function (arr) { if (arr && arr.length) for (var i = 0; i < LOCI.length; i++) g[i] = clamp(+arr[i] || 0, 0, 1); },
    dump: function () { var out = []; for (var i = 0; i < LOCI.length; i++) out.push(Math.round(g[i] * 100) / 100); return out; },
    /* how much there is of it (0..1): what the pen has to draw */
    complexity: function () {
      var s = 0, i;
      for (i = 0; i < 5; i++) s += g[i];
      var shape = (g[I.curiosity] + g[I.ideas] + g[I.balance] + g[I.memory]) / 4;
      return clamp((s / 5) * 0.62 + shape * 0.38, 0, 1);
    },
    seed: function (s) { st.seed = s; },
    update: function (dt, t, o) {
      o = o || {};
      st.t = t;
      /* the pen draws forward as things are discovered and never backward; it hurries a little when you are still */
      var want = 0.16 + 0.84 * DNA.complexity();
      if (SID.env.reduced) st.prog = M.damp(st.prog, want, 4, dt);
      else st.prog += Math.max(0, want - st.prog) * (1 - Math.exp(-(0.35 + 0.5 * (o.still || 0)) * dt));
      /* movement: a slow precession, faster once it is out of tune */
      var drift = SID.env.reduced ? 0 : 0.05 + 0.35 * g[I.mutation];
      st.phase += drift * dt;
      params();
    },
    /* the path itself, as n unit points (x, y in DNA.px, DNA.py), for whoever draws it in their own space */
    sample: function (n, frac) { return path(n, frac, Math.min(5, Math.floor(fnow))); },
    /* the figure a different set of genes would draw (the last visit's), as its own arrays; the live figure is not disturbed */
    sampleWith: function (arr, n, frac) {
      var keep = Array.prototype.slice.call(g), i, m;
      for (i = 0; i < LOCI.length; i++) g[i] = clamp(+arr[i] || 0, 0, 1);
      params(); m = path(n, frac, Math.min(5, Math.floor(fnow)));
      var out = { n: m, x: new Float32Array(PX.subarray(0, m)), y: new Float32Array(PY.subarray(0, m)) };
      for (i = 0; i < LOCI.length; i++) g[i] = keep[i];
      params();
      return out;
    },
    get px() { return PX; }, get py() { return PY; }
  };
})();
