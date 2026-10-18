/* ------------------------------------------------------------------
   strata.js  -  what is embedded in the well.

   THE ARCHIVE. Nineteen drawings (artifacts.js), each one of the artefacts the record lists under his own
   work, set into the shaft at different heights, angles and distances from the axis. Some pass within reach,
   some hang near the wall, one or two are behind you. They are not shown. From a distance each is a fragment:
   only some of its strokes exist. They are completed, and resolved, by the piece's one law:

     stillness resolves, motion scatters, attention pulls.

   Rest your attention on one and it goes from a sketch, to dust that collects, to cells, to exact geometry,
   to the marks of its own measurement, and it stops at what the record supports. Hold the pointer down on one
   and it is drawn toward you. Pieces of the same work answer to each other: once two are resolved, a survey
   line is drawn between them and named. Pieces that share a tool are tied too, but only ever to the one you
   are looking at. And what the record says does not exist yet is drawn, dashed, and never gets past a sketch.

   What you opened on the wall above is remembered here: a door that was opened leaves its work already
   half-collected, and what an earlier visit resolved comes back a little faded.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID, M = SID.M, G = SID.Glyphs, SP = SID.Sprites, Letters = SID.Letters, Deep = SID.Deep, Edge = SID.Edge, Visit = SID.Visit;
  var cam = SID.cam, DNA = SID.DNA, Mind = SID.Mind, Art = SID.Artifacts, CEN = SID.Cam.CENTER;
  var sm = M.smooth, clamp = M.clamp, TAU = M.TAU, wrapPi = M.wrapPi;

  var nodes = [], frags = [], built = false, az0 = 0, groups = {}, attended = null, ptrAt = { x: 0, y: 0 };
  var tools = {};                                         /* tool name -> the nodes that use it */
  var spr = [0, 0];
  var RK = 1.42, CK = 1.15;                               /* how far out, and how large, the table in artifacts.js is drawn */
  var sheets = [], fit = 1;
  var SHEETS = [
    { id: 'origin', th: -0.95, D: 181, r: 14.5, cap: 9.6, yaw: 0.26, ceil: 0.9 },
    { id: 'failures', th: 0.38, D: 191, r: 14.0, cap: 9.6, yaw: -0.16, ceil: 0.85 },
    { id: 'evolution', th: 1.62, D: 201, r: 14.5, cap: 9.6, yaw: 0.3, ceil: 0.85 }
  ];

  /* ---------------- build ---------------- */
  function doorSeen(mem) { for (var i = 0; i < Mind.hosts.length; i++) if (Mind.hosts[i].mem === mem) return Mind.hosts[i].seen ? 1 : 0; return 0; }

  function place(n) {
    var p = n.art.p, ang = az0 + p.th, s = Math.sin(ang), c = Math.cos(ang), fa = ang + p.yaw;
    /* the same archive, set a little differently each visit: where each hangs moves by a few degrees and a few units */
    var jt = (Visit.r('ath' + n.art.i) - 0.5) * 0.36, jd = (Visit.r('adp' + n.art.i) - 0.5) * 5;
    ang += jt; s = Math.sin(ang); c = Math.cos(ang); fa = ang + p.yaw;
    n.hx = CEN[0] + p.r * RK * s; n.hz = CEN[2] - p.r * RK * c; n.hy = CEN[1] - p.D - jd;
    n.htx = Math.cos(fa); n.htz = Math.sin(fa);
  }
  function build() {
    if (built) return;
    az0 = Edge.az3;
    var rng = Visit.rng('archive');
    Art.list.forEach(function (a) {
      var n = Letters.node(0, a.i, a.glyph, rng);
      n.art = a; n.cap = a.p.cap * CK; n.nat = 0.1; n.ceil = a.ceil; n.pull = 0; n.pullV = 0; n.vis = 0; n.dist = 99; n.found = false; n.seenT = 0;
      var before = Visit.mem.ar[a.i] || 0;
      /* a door that was opened above leaves its work half collected; an earlier visit's resolution returns, faded */
      n.rho = clamp(0.06 + 0.16 * doorSeen(a.door) + 0.55 * before, 0, a.ceil);
      n.rho0 = n.rho;
      n.nx = 0; n.nz = -1; n.draw = 1; n.noMark = false;
      place(n);
      (groups[a.proj] = groups[a.proj] || []).push(n);
      a.tools.forEach(function (tl) { (tools[tl] = tools[tl] || []).push(n); });
      nodes.push(n);
    });
    /* The letters the wall never held. The sentence at the edge needed F, J, K, B, L and a comma, and the ember wrote them,
       because none of the wall's words had them. They were left here: small, near the axis, at odd heights, easy to pass. */
    var lost = [['F', 38, 1.1, 2.6, 0.62], ['J', 66, -2.2, 2.2, 0.55], ['K', 94, 0.35, 2.9, 0.6], ['B', 121, 2.6, 2.4, 0.5], ['L', 146, -0.9, 2.8, 0.58], [',', 171, 1.9, 2.3, 0.7]];
    lost.forEach(function (q, k) {
      var f = Letters.node(1, 40 + k, q[0], rng);
      f.frag = k; f.cap = q[4]; f.nat = 0.08; f.ceil = 0.85; f.rho = 0.08 + 0.4 * (Visit.mem.fr >> k & 1); f.pull = 0; f.pullV = 0; f.vis = 0; f.found = !!(Visit.rec.fr >> k & 1);
      f.art = { proj: 'frag' + k, label: '', tools: [], unlit: false, p: { th: q[2], D: q[1], r: q[3], cap: q[4], yaw: 0.2 * (k % 3 - 1) }, i: 60 + k };
      var ang = az0 + q[2], sn = Math.sin(ang), cs = Math.cos(ang), fa = ang + f.art.p.yaw;
      f.hx = CEN[0] + q[3] * sn; f.hz = CEN[2] - q[3] * cs; f.hy = CEN[1] - q[1]; f.htx = Math.cos(fa); f.htz = Math.sin(fa); f.nx = 0; f.nz = -1; f.draw = 1; f.noMark = true;
      frags.push(f); nodes.push(f); (groups['frag' + k] = [f]);
    });
    /* the three sheets of what the record does not hold (deep-data.js) */
    SHEETS.forEach(function (sh, k) {
      var n = Letters.node(2, 80 + k, '@sheet', rng);
      n.sheet = sh.id; n.cap = sh.cap; n.nat = 0.1; n.ceil = sh.ceil; n.rho = 0.1; n.pull = 0; n.pullV = 0; n.vis = 0; n.dist = 99; n.found = false; n.nx = 0; n.nz = -1; n.draw = 1; n.noMark = false;
      n.art = { proj: 'sheet-' + sh.id, label: '', tools: [], unlit: false, i: 80 + k, p: { th: sh.th, D: sh.D, r: sh.r / RK, cap: sh.cap / CK, yaw: sh.yaw } };
      place(n); sheets.push(n); nodes.push(n); groups['sheet-' + sh.id] = [n];
    });
    if (SID.DeepData) {
      /* (a returning visitor finds the sheet they left a little more resolved than a stranger would) */
      if (Visit.returning) sheets.forEach(function (n) { n.rho = Math.min(n.ceil, n.rho + 0.12 * Math.min(3, Visit.n - 1)); });
    }
    built = true;
  }

  /* ---------------- per frame ---------------- */
  function update(o) {
    if (!built) return;
    var dt = Math.min(o.dt, 1 / 30), en = o.en, dpr = o.dpr, reduced = SID.env.reduced, i, j, n;
    var still = 0.22 + 0.78 * sm(0.05, 0.8, en.stillT);
    fit = clamp((cam.W / cam.H) / 1.25, 0.55, 1);                                       /* (a tall screen is narrower than the drawings are wide) */
    if (reduced) still = 0.6 + 0.4 * sm(0.05, 0.8, en.stillT);
    var ptr = o.ptr, ax = cam.cx, ay = cam.cy, aS = 0.7;
    if (ptr.present) { ax = ptr.x; ay = ptr.y; aS = 1; }
    ptrAt.x = ax; ptrAt.y = ay;

    /* 1. raw attention, from last frame's projection: only what can be seen is attended */
    var best = null, bestA = 0.12;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      if (n.zc <= 0 || n.vis < 0.05) { n.a0 = 0; continue; }
      var gw = Math.max(1, n.gl.w * 0.62), dx = n.sx - ax, dy = n.sy - ay, sg = Math.max(46 * dpr, 0.66 * n.capPx * gw);
      n.a0 = Math.exp(-(dx * dx + dy * dy) / (2 * sg * sg)) * aS * sm(0.05, 0.4, n.vis);
      if (n.a0 > bestA) { bestA = n.a0; best = n; }
    }
    /* 2. it spreads between the pieces of one work */
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i]; var sib = groups[n.art.proj], s = 0;
      for (j = 0; j < sib.length; j++) if (sib[j] !== n) s += sib[j].a0;
      n.A = n.a0 + (sib.length > 1 ? 0.28 * s / (sib.length - 1) : 0);
    }
    attended = best;
    /* 3. resolution: attention raises it (only while still), neglect lets it settle back, the record caps it */
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      var up = 0.5 * n.A * still * (n.ceil - n.rho) * (1 + 1.4 * n.pull), relax = 0.06 * (n.rho - n.nat) * (1 - 0.8 * Math.min(1, n.A));
      n.rho = clamp(n.rho + (up - relax) * dt, 0, n.ceil);
      /* the drawing is completed as it is resolved: from a fragment of it to the whole */
      n.draw = 0.34 + 0.66 * sm(0.0, 0.42, n.rho);
      if (!n.found && n.rho > (n.frag != null ? 0.45 : 0.72) && !n.art.unlit) {
        n.found = true; DNA.express('memory', 0.03);
        if (n.frag != null) { Visit.rec.fr = (Visit.rec.fr | 0) | (1 << n.frag); SID.announce('A letter the wall never held: ' + (n.ch === ',' ? 'a comma' : n.ch) + '.'); }
      }
    }
    /* 4. asking: hold on one and it comes toward you; let go and it goes back */
    var asked = SID.Director.press > 0.5 && attended && !attended.art.unlit ? attended : null;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      M.crit(n.pull, n.pullV, n === asked ? 1 : 0, 4.2, dt, spr); n.pull = clamp(spr[0], 0, 1); n.pullV = spr[1];
    }
  }

  /* ---------------- light ---------------- */
  function dimension(x0, y0, z0, x1, y1, z1, a, label, tick) {
    /* a survey line between two things: long dashes, a terminal at each end, and its name in the middle */
    var dx = x1 - x0, dy = y1 - y0, dz = z1 - z0, L = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (L < 0.5 || a < 0.01) return;
    var nseg = Math.max(6, Math.round(L / 0.9) | 1), k;
    for (k = 0; k < nseg; k += 2) SP.seg(x0 + dx * k / nseg, y0 + dy * k / nseg, z0 + dz * k / nseg, x0 + dx * (k + 1) / nseg, y0 + dy * (k + 1) / nseg, z0 + dz * (k + 1) / nseg, a, 0, 0);
    /* terminals: short bars across the line, perpendicular to it and to the view */
    var ux = dx / L, uy = dy / L, uz = dz / L, px = -uz, pz = ux, pl = Math.sqrt(px * px + pz * pz) || 1; px /= pl; pz /= pl;
    var tb = tick || 0.32;
    SP.seg(x0 - px * tb, y0, z0 - pz * tb, x0 + px * tb, y0, z0 + pz * tb, a, 0, 0);
    SP.seg(x1 - px * tb, y1, z1 - pz * tb, x1 + px * tb, y1, z1 + pz * tb, a, 0, 0);
    if (label) text(label, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, ux, uy, uz, a * 1.4, 0.3);
  }
  /* micro-type along a direction, in the piece's own strokes, centred on a point */
  var TC = {};
  function text(str, cx, cy, cz, ux, uy, uz, a, h, lift) {
    lift = lift == null ? 0.18 : lift;
    var s = TC[str] || (TC[str] = G.textStrokes(str, { track: 0.28, ticks: false })), w = s.width * h;
    /* keep the type reading left to right and upright as far as the direction allows */
    var hx = ux, hy = uy, hz = uz; if (hx * cam.rx + hy * cam.ry + hz * cam.rz < 0) { hx = -hx; hy = -hy; hz = -hz; }
    var vx = 0, vy = 1, vz = 0;
    for (var i = 0; i < s.strokes.length; i++) {
      var p = s.strokes[i];
      for (var j = 1; j < p.length; j++) {
        var a0 = p[j - 1][0] * h - w / 2, b0 = p[j - 1][1] * h, a1 = p[j][0] * h - w / 2, b1 = p[j][1] * h;
        SP.seg(cx + hx * a0 + vx * b0, cy + hy * a0 + vy * b0 + lift, cz + hz * a0 + vz * b0, cx + hx * a1 + vx * b1, cy + hy * a1 + vy * b1 + lift, cz + hz * a1 + vz * b1, a, 0, 0);
      }
    }
  }

  /* ---------------- the three sheets ---------------- */
  var W3 = [0, 0, 0], before = null, TITLE = { origin: 'ORIGIN', failures: 'FAILURES', evolution: 'EVOLUTION' };
  function sw(n, u, v) {                                                   /* a point on the sheet (u across, v up, in its own units) as a point in the well */
    var c = n.cap * fit * (1 + 0.6 * n.pull);
    W3[0] = n.rx + n.tx * (u - 0.36) * c; W3[1] = n.ry + (v - 0.5) * c; W3[2] = n.rz + n.tz * (u - 0.36) * c;
    return W3;
  }
  function sseg(n, u0, v0, u1, v1, a) {
    var p = sw(n, u0, v0), x = p[0], y = p[1], z = p[2]; p = sw(n, u1, v1);
    SP.seg(x, y, z, p[0], p[1], p[2], a, 0, 0);
  }
  function sheetText(n, str, u, v, h, a) { var p = sw(n, u, v); text(str, p[0], p[1], p[2], n.tx, 0, n.tz, a, h * n.cap * fit * (1 + 0.6 * n.pull), 0); }
  /* a measured absence: a dimension line with no number on it. The gap is where the number would be. */
  function blankDim(n, u0, u1, v, a) {
    var mid = (u0 + u1) / 2, gap = 0.07, tk = 0.026;
    sseg(n, u0, v, mid - gap, v, a); sseg(n, mid + gap, v, u1, v, a);
    [u0, u1, mid - gap, mid + gap].forEach(function (u) { sseg(n, u, v - tk, u, v + tk, a); });
  }
  function emitSheet(n, t) {
    var ca = sm(0.3, 0.8, n.rho / n.ceil) * n.vis;
    if (ca < 0.02) return;
    var a = 0.66 * ca, id = n.sheet, D = SID.DeepData || {}, i, facts = D[id] || [];
    sheetText(n, TITLE[id], 0.523, 0.112, 0.034, a * 1.2);
    sseg(n, 0.4, 0.06, 0.52, 0.06, a * 0.8);                             /* the field of the title block that would hold a date: nothing in it */
    if (id === 'origin') {
      ['PERURI', 'JAI', 'SAI', 'SIDDHARTHA'].forEach(function (w, k) { sheetText(n, w, 0.36, 0.83 - k * 0.1, k === 3 ? 0.062 : 0.05, a * (k === 3 ? 1.25 : 0.85)); });
      blankDim(n, 0.09, 0.63, 0.34, a * 0.8);
    } else if (id === 'failures') {
      var mine = SID.Trace.flag.slips, prev = Visit.mem.sl | 0, total = Math.min(24, prev + mine);
      for (i = 0; i < total; i++) {
        var p = sw(n, 0.1 + (i % 6) * 0.1, 0.84 - Math.floor(i / 6) * 0.11), a0 = M.hash(i, 3, 3, 71) * TAU, isPrev = i < Math.min(prev, 24);
        SP.ring(p[0], p[1], p[2], n.tx, 0, n.tz, 0, 1, 0, 0.034 * n.cap * fit, 22, a * (isPrev ? 0.5 : 1.1), 0, 0, a0, a0 + 5.3);        /* a ring that did not close */
      }
      blankDim(n, 0.09, 0.63, 0.34, a * 0.8);
    } else {
      var N = 380, cx = [0.2, 0.52], cy = 0.66, R = 0.12, k;
      if (!before && Visit.mem.gene.length) before = DNA.sampleWith(Visit.mem.gene, N, 1);
      var pn = DNA.sample(N, clamp(DNA.st.prog, 0.05, 1)), px = DNA.px, py = DNA.py;
      for (i = 1; i < pn; i++) { var q0 = sw(n, cx[1] + px[i - 1] * R, cy + py[i - 1] * R); var x0 = q0[0], y0 = q0[1], z0 = q0[2]; var q1 = sw(n, cx[1] + px[i] * R, cy + py[i] * R); SP.seg(x0, y0, z0, q1[0], q1[1], q1[2], a * 0.9, 0, 0); }
      if (before) for (i = 0; i < before.n; i += 2) { var qb = sw(n, cx[0] + before.x[i] * R, cy + before.y[i] * R); SP.dot(qb[0], qb[1], qb[2], a * 0.7, 0.03, 0); }
      else for (k = 0; k < 10; k += 2) { var c0 = sw(n, cx[0], cy); SP.ring(c0[0], c0[1], c0[2], n.tx, 0, n.tz, 0, 1, 0, R * n.cap * fit, 8, a * 0.7, 0, 0, k * TAU / 10, (k + 1) * TAU / 10); }       /* no earlier figure: an outline with nothing drawn in it */
      blankDim(n, cx[0], cx[1], 0.42, a * 0.8);
    }
    for (i = 0; i < facts.length && i < 6; i++) sheetText(n, facts[i], 0.36, 0.24 - i * 0.05, 0.03, a);        /* what the record says, if it ever says anything */
  }

  function emit(o) {
    if (!built) return;
    var t = o.t, i, j, n, fade = sm(0.6, 8, Deep.D);
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      /* where it is: home, or drawn toward the eye while it is being asked */
      var pl = n.pull, hx = n.hx, hy = n.hy, hz = n.hz, tx = n.htx, tz = n.htz;
      if (pl > 0.001) {
        var ahead = Math.max(3.4, n.cap * 1.7);
        var gx = cam.x + cam.fx * ahead, gy = cam.y + cam.fy * ahead, gz = cam.z + cam.fz * ahead;
        hx += (gx - hx) * pl; hy += (gy - hy) * pl; hz += (gz - hz) * pl;
        var ta = Math.atan2(cam.rz, cam.rx), ha = Math.atan2(tz, tx), ba = ha + wrapPi(ta - ha) * pl;       /* it turns to face you as it comes */
        tx = Math.cos(ba); tz = Math.sin(ba);
      }
      n.rx = hx; n.ry = hy; n.rz = hz; n.tx = tx; n.tz = tz; n.nx = tz; n.nz = -tx;
      var dx = hx - cam.x, dy = hy - cam.y, dz = hz - cam.z, dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      n.dist = dist;
      /* from far away only dust of it; up close (or pulled) all there is */
      n.vis = (1 - sm(20, 46, dist)) * fade * (0.35 + 0.65 * sm(0.5, 2, dist / n.cap)) * (n.art.unlit ? 0.75 : 1);
      n.sep = 0.75 * pl;                                                               /* asked, a drawing opens into the five sheets it is made of */
      if (n.vis > 0.004) {
        Letters.emit(n, t, n.vis, n.cap * fit * (1 + 0.6 * pl));
        /* hung from above: a plumb line from the top of it up out of sight, with a small cross where it is made fast */
        var top = hy + n.cap * 0.5 + 0.1, pa = 0.085 * n.vis * (1 - pl), sway = SID.env.reduced ? 0 : Math.sin(t * 0.4 + n.art.i * 1.7) * 0.05;
        if (pa > 0.006) { SP.seg(hx + sway, top, hz, hx + sway, top + 26, hz, pa, 0, 0); SP.seg(hx + sway - 0.12, top, hz, hx + sway + 0.12, top, hz, pa * 2.2, 0, 0); }
      } else n.zc = -1;
      if (n.sheet) emitSheet(n, t);
    }
    /* relations: the pieces of one work, once two of them are resolved; then, for the one you look at, whatever shares a tool with it */
    for (var pj in groups) {
      var gr = groups[pj];
      for (i = 0; i + 1 < gr.length; i++) {
        var A0 = gr[i], A1 = gr[i + 1], r = Math.min(A0.rho / A0.ceil, A1.rho / A1.ceil) * Math.min(A0.vis, A1.vis);
        if (r > 0.3 && !A0.art.unlit) dimension(A0.rx, A0.ry, A0.rz, A1.rx, A1.ry, A1.rz, 0.34 * sm(0.3, 0.8, r), i === 0 ? pj : '', 0.3);
      }
    }
    if (Visit.n >= 2) {                                                       /* the world remembers how these relate: what you have collected before is tied without being asked */
      for (var tl2 in tools) {
        var tg = tools[tl2];
        for (i = 0; i < tg.length; i++) for (j = i + 1; j < tg.length; j++) {
          var na = tg[i], nb = tg[j];
          if (na.art.proj === nb.art.proj || na.rho / na.ceil < 0.6 || nb.rho / nb.ceil < 0.6 || j !== i + 1 + ((i + tl2.length) % 3) % Math.max(1, tg.length - i - 1)) continue;
          dimension(na.rx, na.ry, na.rz, nb.rx, nb.ry, nb.rz, 0.2 * Math.min(na.vis, nb.vis), '', 0.22);
        }
      }
    }
    if (attended && !attended.art.unlit && attended.rho > 0.4) {
      var seen = {}, ai = attended;
      ai.art.tools.forEach(function (tl) {
        (tools[tl] || []).forEach(function (m) {
          if (m === ai || m.art.proj === ai.art.proj || seen[m.i] || m.rho < 0.25 || m.vis < 0.1) return;
          seen[m.i] = 1;
          dimension(ai.rx, ai.ry, ai.rz, m.rx, m.ry, m.rz, 0.26 * sm(0.4, 0.8, ai.rho) * Math.min(1, m.vis * 2), tl, 0.22);
        });
      });
    }
  }

  /* ---------------- words beside things ---------------- */
  var el = null, shown = '', op = '', wI = 0;
  function ui(o) {
    if (!el) el = document.getElementById('inscr');
    if (!el) return;
    var best = null, bd = 0.6, i;
    for (i = 0; i < nodes.length; i++) if (nodes[i].rho / Math.max(0.3, nodes[i].ceil) > bd && nodes[i].zc > 0 && nodes[i].vis > 0.3 && !nodes[i].art.unlit && !nodes[i].sheet) { bd = nodes[i].rho / Math.max(0.3, nodes[i].ceil); best = nodes[i]; }
    if (!best) { if (op !== '0') { op = '0'; el.style.opacity = '0'; } return; }
    var lines = best.frag != null ? ['THE WALL DID NOT HAVE THIS LETTER', ''] : [best.art.proj, best.art.label], key = lines.join('|');
    if (key !== shown) { shown = key; el.innerHTML = lines.map(function (l) { return l ? '<div>' + G.svg(l, { track: 0.34 }) + '</div>' : ''; }).join(''); wI = el.offsetWidth; }
    var dpr = SID.Render.dpr, x = best.sx / dpr + best.capPx * best.gl.w * 0.5 / dpr + 16, y = best.sy / dpr - best.capPx * 0.5 / dpr;
    var maxX = SID.input.w - wI - (SID.input.w > 640 ? 44 : 34);
    el.style.transform = 'translate(' + Math.min(x, maxX).toFixed(1) + 'px,' + Math.max(8, y).toFixed(1) + 'px)';
    var o2 = (sm(0.6, 0.9, bd) * 0.85).toFixed(3);
    if (o2 !== op) { op = o2; el.style.opacity = o2; }
  }

  /* what was collected is kept (as how far it resolved), to come back faded */
  Visit.onSave(function (rec) {
    if (!built) return;
    var ar = rec.ar.slice(); while (ar.length < Art.list.length) ar.push(0);
    for (var i = 0; i < nodes.length; i++) ar[nodes[i].art.i] = Math.max(ar[nodes[i].art.i] | 0, Math.round(clamp(nodes[i].rho, 0, 1) * 255));
    rec.ar = ar;
  });

  SID.Strata = {
    build: build, update: update, emit: emit, ui: ui, nodes: nodes,
    get built() { return built; }, get attended() { return attended; }
  };
})();
