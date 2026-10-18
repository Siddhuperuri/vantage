/* ------------------------------------------------------------------
   edge.js  -  the edge of the piece.

   Everything the visitor has met is put down. The wall does not vanish:
   it goes back to being a draft, the contradictions are drawn together,
   and each of the four empty gaps between them is asked a question by
   the ember. Then the letters of the wall itself swirl round the room
   and become one sentence, in front of you, in the order it is read.
   What the wall never held (J, K, F, and the commas) the ember writes.
   The sentence resolves the way everything here resolves: stillness and
   attention. It never reaches the last stage; nothing about it is
   measured.

   The ember then writes a wish in the stage of knowing that is chance:
   each letter's clarity is a roll of dice that goes on rolling, and
   attention improves the odds. Then nothing else happens.

   After the wish there is one more thing, on its own clock (R, 0..1, running
   only while E3 is complete): the residue. The sentence lets go. The ember
   writes the visitor's own path, which is all the piece kept of them, and
   beside it (fainter, broken, not quite in place) the path of the last
   visit if there was one. Then it says what is literally true of this
   visit, and no more, and ends on the inversion.
   The wish stays. It was for you.

   The sequence is a function of E3 (0..1), which advances on its own
   once you have crossed over; scrolling only hurries it, and scrolling
   back into the wall rewinds it. So a visitor who stops anywhere is
   never left in the middle of a gesture.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID, M = SID.M, Letters = SID.Letters, Mind = SID.Mind, cam = SID.cam, Trace = SID.Trace, Visit = SID.Visit;
  var sm = M.smooth, smr = M.smoother, clamp = M.clamp, lerp = M.lerp;
  var CEN = SID.Cam.CENTER, ext = Mind.ext;

  /* ---- the sequence, in units of E3 ---- */
  var T = {
    quiet: [0.00, 0.09],       /* doors close, the camera steps back, everything measured becomes a draft */
    marks: [0.06, 0.22],       /* the ember asks each gap between contradictions its question */
    gather: [0.18, 0.58],      /* the wall's letters swirl round the room and become the sentence */
    dissolve: [0.27, 0.66],    /* whatever is left of the wall lets go */
    frame: [0.40, 0.70],       /* the apparatus fades: crop marks, ruler */
    wish: [0.64, 0.90]         /* the ember writes the wish */
  };
  var FLIGHT = 0.11, FLIGHT_R = 0.045, FOV_END = 50;
  var OVER = 0.3;                                   /* a letter lands with a little of its own momentum, and spends this much of its own flight settling past the slot before it is still */
  var TRACK = 0.32, GAP = 1.15;                   /* letter and word spacing, in cap heights */
  var DEPTH = { s: 6.0, w: 6.35 };                /* the sentence and the wish stand at slightly different depths */

  /* ---- the residue, in units of R (its own clock, RD seconds long) ---- */
  var RT = {
    sentence: [0.06, 0.24],    /* the sentence lets go, letter by letter */
    memory: [0.16, 0.30],      /* what is left of the last visit's line, if there was one */
    scribble: [0.22, 0.52],    /* the ember writes the visitor's path */
    lines: [0.56, 0.83],       /* what is true of this visit, one line at a time */
    finale: [0.83, 0.94]       /* and the last three lines, which stay */
  };
  var RD = 48, FINALE = 'YOU KNOW A LITTLE ABOUT ME I KNOW NOTHING ABOUT YOU GOOD', FIN_BREAKS = [0, 6, 11];

  var STATEMENT = 'JACK OF ALL, MASTER OF NONE, BUT OFTEN TIMES BETTER THAN MASTER OF ONE';
  var WISH = 'MAY THE ODDS BE EVER IN YOUR FAVOUR';
  /* where a new line starts, by word index; the same letters, broken for the shape of the screen */
  var BREAKS = { land: { s: [0, 3, 6, 9], w: [0] }, port: { s: [0, 3, 6, 9, 11], w: [0, 3, 6] } };

  var E3 = 0, prepared = false, az3 = 0, vw = 0, vh = 0;
  var duration = 36, announced = 0, atEdge = false;
  var eRate = 1, R = 0, resBuilt = false, obs = [], fin = null, resAnn = 0, scr = null, mem = null, knots = [], topKnot = -1, res = null, sway = [0, 0];
  var groups = {}, all = [], marks = [];
  var GROUPS = ['s', 'w'];
  var canvasEl = null, canvasLabel = '';
  var rngS = M.rng(3141592 ^ (Visit.seed & 0xffff));       /* the wish's dice, and how the letters fly, are this visit's */

  /* ---------------- letters ---------------- */
  function make(ch, k, wi) {
    var L = Letters.node(k, wi, ch, rngS);
    L.noMark = true; L.nat = 0.66; L.ceil = 0.76; L.rho = 0.3; L.draw = 0;
    L.src = null; L.p = 0; L.vis = 0; L.cap = 0.1; L.w0 = 0; L.w1 = 0; L.dep = 0; L.jit = rngS() * 2 - 1;
    L.lx = 0; L.line = 0; L.th = 0; L.rad = 0; L.sx1 = 0; L.sy1 = 0; L.sz1 = 0; L.cap1 = 0.1;      /* lx: cap heights from the line's middle; sx1..: the slot in the room */
    return L;
  }
  function group(name, text, nat, ceil, kind) {
    var g = { name: name, kind: kind || name, alpha: 1, dAlpha: 1, yoff: 0, words: text.split(' '), byWord: [], letters: [], lines: [], capPx: 20, yc: 0, pitch: 0, maxW: 1, depth: DEPTH[name] || DEPTH.w };
    g.words.forEach(function (w, wi) {
      var list = [], prev = null;
      for (var i = 0; i < w.length; i++) {
        var L = make(w[i], g.letters.length, wi); L.grp = name; L.nat = nat; L.ceil = ceil; L.rho = nat * 0.5;
        if (prev) { L.nb.push(prev); prev.nb.push(L); }
        prev = L; list.push(L); g.letters.push(L); all.push(L);
      }
      g.byWord.push(list);
    });
    groups[name] = g;
    return g;
  }
  /* optical kerning: this alphabet has none, and A-V, A-Y, L-T leave holes the eye reads as extra space */
  var KERN = { AT: -0.14, TA: -0.14, AV: -0.15, VA: -0.15, AY: -0.15, YA: -0.15, AW: -0.1, WA: -0.1, LT: -0.15, LY: -0.15, LV: -0.12,
               FA: -0.12, PA: -0.1, VO: -0.06, YO: -0.06, OV: -0.05, OY: -0.05, RY: -0.06, RT: -0.03, 'L,': -0.1 };
  function kern(a, b) { return KERN[a + b] || 0; }
  function wordW(list) {
    var w = 0;
    for (var i = 0; i < list.length; i++) w += list[i].gl.w + (i ? TRACK + kern(list[i - 1].ch, list[i].ch) : 0);
    return w;
  }

  function build() {
    group('s', STATEMENT, 0.66, 0.76);
    /* the wish is chance: each letter carries the roll it is currently on */
    group('w', WISH, 0.4, 0.78).letters.forEach(function (L) { L.lt = 0.3; L.tNext = rngS() * 6; });
    canvasEl = document.getElementById('world'); canvasLabel = canvasEl.getAttribute('aria-label');
  }

  /* ---------------- layout: in screen pixels, then into the room ---------------- */
  /* a group's lines: where each letter stands along its line, in cap heights from the line's middle */
  function fit(g, starts) {
    var nW = g.words.length, lines = [];
    g.maxW = 0;
    for (var li = 0; li < starts.length; li++) {
      var a = starts[li], bb = li + 1 < starts.length ? starts[li + 1] : nW, w = 0;
      for (var wi = a; wi < bb; wi++) w += wordW(g.byWord[wi]) + (wi > a ? GAP : 0);
      lines.push({ a: a, b: bb, w: w }); g.maxW = Math.max(g.maxW, w);
    }
    g.lines = lines;
    lines.forEach(function (ln, li) {
      var x = -ln.w / 2;
      for (var wi = ln.a; wi < ln.b; wi++) {
        var list = g.byWord[wi];
        for (var k = 0; k < list.length; k++) {
          var Lk = list[k]; if (k) x += kern(list[k - 1].ch, Lk.ch);
          Lk.lx = x + Lk.gl.w / 2; Lk.line = li; x += Lk.gl.w + TRACK;
        }
        x += GAP - TRACK;
      }
    });
  }

  var right = [1, 0, 0], fwd = [0, 0, -1], Fcss = 1;
  function layout() {
    var W = SID.input.w, H = SID.input.h;
    vw = W; vh = H;
    var port = W / H < 1.15, br = port ? BREAKS.port : BREAKS.land;
    Fcss = (H / 2) / Math.tan(FOV_END * Math.PI / 360);
    right[0] = Math.cos(az3); right[2] = Math.sin(az3); fwd[0] = Math.sin(az3); fwd[2] = -Math.cos(az3);
    fit(groups.s, br.s); fit(groups.w, br.w);
    var s = groups.s, w = groups.w;
    /* two groups in a stack, the second smaller and apart; sized to the width and to the height */
    var PS = 2.55, PW = 2.6 * 0.78, G1 = PS * (port ? 1.8 : 1.6);         /* line pitch and the gap, in the sentence's cap heights */
    var units = (s.lines.length - 1) * PS + 1 + G1 + (w.lines.length - 1) * PW + 0.78;
    s.capPx = Math.max(9, Math.min((port ? 0.033 : 0.040) * H, 0.80 * W / s.maxW, 0.70 * H / units));
    w.capPx = Math.max(8, Math.min(s.capPx * 0.78, 0.86 * W / w.maxW));
    s.pitch = s.capPx * PS; w.pitch = w.capPx * 2.6;
    var hS = (s.lines.length - 1) * s.pitch + s.capPx, hW = (w.lines.length - 1) * w.pitch + w.capPx, gap = G1 * s.capPx;
    var top = 0.47 * H - (hS + gap + hW) / 2;
    s.yc = top + hS / 2; w.yc = top + hS + gap + hW / 2;
    s.letters.forEach(function (L) { slotOf(s, L); });
    w.letters.forEach(function (L) { slotOf(w, L); });
    layoutResidue(W, H, port);
  }
  /* the residue's own places: your line and his outline above, what is true of the visit below */
  function layoutResidue(W, H, port) {
    res = port ? { scr: { cx: 0.5 * W, cy: 0.26 * H, size: Math.min(0.66 * W, 0.30 * H) } }
               : { scr: { cx: 0.5 * W, cy: 0.33 * H, size: Math.min(0.36 * W, 0.40 * H) } };
    if (!resBuilt) return;
    var cap = groups.w.capPx, g, i;
    for (i = 0; i < obs.length; i++) {
      g = obs[i]; fit(g, [0]);
      g.capPx = Math.max(8, Math.min(cap, 0.88 * W / g.maxW)); g.pitch = g.capPx * 2.6; g.yc = (port ? 0.875 : 0.86) * H;
      g.letters.forEach(function (L) { slotOf(g, L); });
    }
    fit(fin, FIN_BREAKS);
    fin.capPx = Math.max(8, Math.min(cap, 0.88 * W / fin.maxW)); fin.pitch = fin.capPx * 2.1; fin.yc = (port ? 0.885 : 0.885) * H;
    fin.letters.forEach(function (L) { slotOf(fin, L); });
  }
  /* pixel offset from the middle of the screen -> a point in the room at depth d, in the sentence's plane */
  var PT = [0, 0, 0];
  function toRoom(dxp, dyp, d, yo) {
    var u = dxp / Fcss * d, v = -dyp / Fcss * d;
    PT[0] = CEN[0] + fwd[0] * d + right[0] * u; PT[1] = CEN[1] + (yo || 0) + v; PT[2] = CEN[2] + fwd[2] * d + right[2] * u;
    return PT;
  }
  function slotOf(g, L) {
    var p = toRoom(L.lx * g.capPx, g.yc + (L.line - (g.lines.length - 1) / 2) * g.pitch - vh / 2, g.depth, g.yoff);
    L.sx1 = p[0]; L.sy1 = p[1]; L.sz1 = p[2];
    L.cap1 = g.capPx / Fcss * g.depth;
    L.th = Math.atan2(p[0] - CEN[0], -(p[2] - CEN[2])); L.rad = Math.hypot(p[0] - CEN[0], p[2] - CEN[2]);
  }

  /* ---------------- which letter of the wall becomes which letter of the sentence ---------------- */
  var wrapPi = M.wrapPi;
  function thetaOf(n) { return Math.atan2(n.rx - CEN[0], -(n.rz - CEN[2])); }
  function assign() {
    var pool = {};
    Mind.nodes.forEach(function (n) { n.srcOf = null; (pool[n.ch] = pool[n.ch] || []).push(n); });
    var S = groups.s.letters, N = S.length, fl = SID.env.reduced ? FLIGHT_R : FLIGHT;
    S.forEach(function (L, i) {
      var list = pool[L.ch];
      L.src = null;
      if (list && list.length) {                                   /* the nearest still-unused letter of the wall, by direction */
        var best = 0, bd = 9;
        for (var k = 0; k < list.length; k++) { var d = Math.abs(wrapPi(thetaOf(list[k]) - L.th)); if (d < bd) { bd = d; best = k; } }
        L.src = list.splice(best, 1)[0]; L.src.srcOf = L;
      }
      L.dep = T.gather[0] + (i / (N - 1)) * (T.gather[1] - T.gather[0] - fl);
      L.w0 = L.dep + fl * 0.4; L.w1 = L.w0 + 0.04;
    });
    /* the wish, letter by letter, by the ember */
    var Wl = groups.w.letters;
    Wl.forEach(function (L, i) { L.w0 = T.wish[0] + (i / Wl.length) * (T.wish[1] - T.wish[0] - 0.035); L.w1 = L.w0 + 0.035; });
    /* a question for each gap between contradictions, written where the poles almost meet */
    marks.length = 0;
    Mind.pairs.forEach(function (P, i) {
      if (!P.gap.length) return;
      var g = P.gap[P.gap.length >> 1], L = make('?', i, 0);
      L.ember = true; L.rho = 0.55; L.cap1 = Mind.CAP * 0.9; L.cell = g;
      L.w0 = T.marks[0] + marks.length * 0.04; L.w1 = L.w0 + 0.06; L.grp = 'q';
      marks.push(L);
    });
  }

  /* ---------------- E3 ---------------- */
  function advance(o) {
    var reduced = SID.env.reduced, dt = Math.min(o.dt, 1 / 20);
    if (o.S3 > 0.01) {
      var want = smr(0.0, 0.7, o.S3);
      if (o.sVel < -0.004 && want < E3 - 0.25) E3 = Math.max(want, E3 - 0.3 * dt);     /* scrolling back up scrubs the ending backward */
      else { eRate = M.damp(eRate, want > E3 + 0.02 ? 2.2 : 1, 1.3, dt); E3 = Math.min(1, E3 + (1 / duration) * eRate * (reduced ? 2.5 : 1) * dt); }      /* (scrolling hurries the ending; the hurry eases in and out rather than switching) */
    } else E3 = Math.max(0, E3 - 0.14 * dt);
    /* the residue runs on its own clock, only once the wish is written; scrolling back up unwinds it */
    if (E3 >= 0.999 && SID.Deep.arrive > 0.98) R = Math.min(1, R + dt / (RD * (reduced ? 0.6 : 1)));
    else if (R > 0) R = Math.max(0, R - dt * 0.4);
  }

  /* ---------------- where a letter is, given the sequence ---------------- */
  function fly(L) {
    var pf = Math.min(L.p, 1), e = smr(0, 1, pf), s = L.src;
    var x0 = s.rx + s.ux, y0 = s.ry + s.uy, z0 = s.rz + s.uz;
    var th0 = Math.atan2(x0 - CEN[0], -(z0 - CEN[2])), r0 = Math.hypot(x0 - CEN[0], z0 - CEN[2]);
    var dth = wrapPi(L.th - th0);
    var th = th0 + dth * e, arc = Math.sin(Math.PI * e);
    var r = lerp(r0, L.rad, e) - 1.5 * arc;
    var y = lerp(y0, L.sy1, e) + 0.45 * arc * L.jit;
    if (L.p > 1) {                              /* past the slot: a small, decaying bounce, a pure function of L.p so scrubbing back retraces it */
      var ov = Math.sin(Math.PI * Math.min((L.p - 1) / OVER, 1));
      th += 0.045 * (dth < 0 ? -1 : 1) * ov;
      r += 0.24 * ov;
      y += 0.08 * ov * L.jit;
    }
    L.rx = CEN[0] + r * Math.sin(th); L.rz = CEN[2] - r * Math.cos(th); L.ry = y;
    var phi = th0 + wrapPi(az3 - th0) * e;
    L.tx = Math.cos(phi); L.tz = Math.sin(phi); L.nx = Math.sin(phi); L.nz = -Math.cos(phi);
    L.cap = Mind.CAP * Math.pow(L.cap1 / Mind.CAP, e);
  }
  function settle(L) {
    L.rx = L.sx1; L.ry = L.sy1; L.rz = L.sz1;
    L.tx = right[0]; L.tz = right[2]; L.nx = fwd[0]; L.nz = fwd[2]; L.cap = L.cap1;
  }

  var hits = { s: { x: 0, y: 0, z: 0, ok: false }, w: { x: 0, y: 0, z: 0, ok: false }, r: { x: 0, y: 0, z: 0, ok: false } };
  function planeHit(d, px, py, out) {                   /* where the pointer's ray meets the plane the group stands in */
    var d0 = (px - cam.cx) / cam.F, d1 = -(py - cam.cy) / cam.F;
    var rx = cam.fx + cam.rx * d0 + cam.ux * d1, ry = cam.fy + cam.ry * d0 + cam.uy * d1, rz = cam.fz + cam.rz * d0 + cam.uz * d1;
    var den = rx * fwd[0] + rz * fwd[2];
    if (Math.abs(den) < 1e-5) { out.ok = false; return; }
    var s = ((CEN[0] + fwd[0] * d - cam.x) * fwd[0] + (CEN[2] + fwd[2] * d - cam.z) * fwd[2]) / den;
    if (s <= 0) { out.ok = false; return; }
    out.x = cam.x + rx * s; out.y = cam.y + ry * s; out.z = cam.z + rz * s; out.ok = true;
  }

  var ctx = { ax: 0, ay: 0, aS: 1, still: 1, dt: 0, t: 0, dpr: 1, reduced: false, fl: FLIGHT, gP: 1, E: 0 };
  var ACC = [0, 0, 0], seekerOut = { mode: 'follow', x: 0, y: 0, z: 0, k: 9, d: 5.4, speed: 14, down: true, life: 4.5, near: 1 };

  /* one group of letters: where each is, how visible, how resolved, and what the visitor's hand does to it */
  function stepGroup(g, k, c) {
    var letters = g.letters, n = letters.length, i, j, L;
    for (i = 0; i < n; i++) {
      L = letters[i];
      L.p = k === 's' ? clamp((E3 - L.dep) / c.fl, 0, 1 + OVER) : 1;
      if (k === 'r') { L.draw = 1; L.vis = g.alpha; }             /* what the residue says fades in and out; it is not written */
      else if (k === 'w') {                                            /* the wish is written by the ember; each letter carries a roll */
        L.draw = clamp((E3 - L.w0) / (L.w1 - L.w0), 0, 1); L.vis = 1;
        L.tNext -= c.dt; if (L.tNext < 0) { L.lt = 0.32 + rngS() * 0.32; L.tNext = 3 + rngS() * 6; }
      } else if (L.src) { L.draw = 1; L.vis = sm(0, 0.35, L.p); if (L.p <= 0) L.rho = L.src.rho; }
      else { L.draw = clamp((E3 - L.w0) / (L.w1 - L.w0), 0, 1); L.vis = L.draw > 0 ? 1 : 0; }
      if (L.src && L.p < 1 + OVER && !c.reduced) fly(L); else settle(L);
      if (L.vis < 0.01 || L.zc <= 0) { L.a0 = 0; continue; }
      /* attention, then resolution: the same law as the wall */
      var dx = L.sx - c.ax, dy = L.sy - c.ay, sg = Math.max(46 * c.dpr, 2.6 * L.capPx);
      L.a0 = Math.exp(-(dx * dx + dy * dy) / (2 * sg * sg)) * c.aS * sm(0.05, 0.6, L.draw);
    }
    for (i = 0; i < n; i++) {
      L = letters[i]; var s1 = 0;
      for (j = 0; j < L.nb.length; j++) s1 += L.nb[j].a0;
      L.A1 = L.a0 + (L.nb.length ? 0.42 * s1 / L.nb.length : 0);
    }
    for (i = 0; i < n; i++) {
      L = letters[i]; var s2 = 0;
      for (j = 0; j < L.nb.length; j++) s2 += L.nb[j].A1;
      L.A = L.A1 + (L.nb.length ? 0.3 * s2 / L.nb.length : 0);
      if (L.vis < 0.01) continue;
      var rest = k === 'w' ? L.lt : L.nat;
      var up = 0.55 * L.A * c.still * (L.ceil - L.rho), relax = (k === 'w' ? 0.5 : 0.11) * (L.rho - rest) * (1 - 0.7 * Math.min(1, L.A));
      L.rho = clamp(L.rho + (up - relax) * c.dt, 0.05, L.ceil);
      if (L.p < 1 || (L.src && !c.reduced && L.p < 1 + OVER)) continue;    /* letters in flight, or still settling from the bounce, are not pushed */
      /* the forces that stir the wall, at the size of this letter */
      var sc = L.cap / Letters.ref;
      ACC[0] = -16 * L.ux; ACC[1] = -16 * L.uy; ACC[2] = -16 * L.uz;
      for (j = 0; j < L.nb.length; j++) { var m = L.nb[j]; ACC[0] += 16 * (m.ux - L.ux); ACC[1] += 16 * (m.uy - L.uy); ACC[2] += 16 * (m.uz - L.uz); }
      if (hits[k].ok) Letters.pointerAccel(L, hits[k], L.cap * 1.25, c.gP * sc * 0.5, ACC);        /* (gentler than on the wall: this is a sentence) */
      if (!c.reduced) Letters.waveAccel(L, c.E, c.t, sc, ACC);
      L.vx += ACC[0] * c.dt; L.vy += ACC[1] * c.dt; L.vz += ACC[2] * c.dt;
      var dmp = Math.exp(-4.4 * c.dt); L.vx *= dmp; L.vy *= dmp; L.vz *= dmp;
      L.ux += L.vx * c.dt; L.uy += L.vy * c.dt; L.uz += L.vz * c.dt;
    }
  }

  function update(o) {
    if (!Mind.built) return;
    var dt = Math.min(o.dt, 1 / 30), t = o.t, reduced = SID.env.reduced, en = o.en, dpr = o.dpr;
    advance(o);
    if (E3 <= 0) { if (prepared) unprepare(); zero(); return; }
    /* the sentence stands where you were facing when the ending began: follow your gaze until that moment, then fix it */
    if (!prepared) {
      if (E3 < 0.03) az3 = Mind.st.heading;
      else { layout(); assign(); prepared = true; announced = 0; }
    } else if (vw !== SID.input.w || vh !== SID.input.h) layout();

    /* what the wall is asked to do */
    ext.E3 = E3; ext.fov = FOV_END;
    ext.quiet = sm(T.quiet[0], T.quiet[1], E3);
    ext.close = sm(0.025, 0.10, E3) * (1 - sm(0.38, 0.58, E3));
    ext.fade = sm(T.dissolve[1] - 0.04, T.dissolve[1], E3);
    var Dd = SID.Deep.D, LEN = SID.Deep.LEN;
    ext.steerAz = az3; ext.steer = prepared ? (Dd > 2 ? SID.Deep.steer : lerp(1.4, 0.35, sm(0.25, 0.6, E3))) : 0;
    ext.free = SID.Deep.free;                                                  /* in the well the head is your own again */
    if (!prepared) return;
    /* the room's slow breath: a sway of 2% of the window's width, whatever the window */
    var sway = reduced || !Fcss ? 0 : 0.02 * vw * DEPTH.s / Fcss * sm(0.5, 0.95, E3) * (1 - ext.free);
    ext.bx = Math.sin(t * 0.17) * sway; ext.by = Math.sin(t * 0.11 + 1.3) * sway * 0.4;                                        /* (the first moments only watch where you are facing) */
    var nodes = Mind.nodes;
    for (var ni = 0; ni < nodes.length; ni++) {
      var nd = nodes[ni];
      nd.leave = nd.srcOf ? sm(0, 0.35, nd.srcOf.p) : sm(T.dissolve[0] + nd.seed * 0.26 - 0.02, T.dissolve[0] + nd.seed * 0.26 + 0.08, E3);
    }
    SID.Edge.frame = 1 - sm(T.frame[0], T.frame[1], E3); SID.Edge.calm = sm(0.38, 0.8, E3);
    if (atEdge !== E3 > 0.3) { atEdge = !atEdge; document.body.classList.toggle('at-edge', atEdge); }

    /* the sentence and the wish */
    var still = 0.22 + 0.78 * sm(0.05, 0.8, en.stillT);
    if (reduced) still = 0.6 + 0.4 * sm(0.05, 0.8, en.stillT);
    var ptr = o.ptr;
    ctx.ax = cam.cx; ctx.ay = cam.cy; ctx.aS = 0.7;
    if (ptr.present) { ctx.ax = ptr.x; ctx.ay = ptr.y; ctx.aS = 1; }
    ctx.still = still; ctx.dt = dt; ctx.t = t; ctx.dpr = dpr; ctx.reduced = reduced;
    ctx.fl = reduced ? FLIGHT_R : FLIGHT;
    ctx.gP = (reduced ? 0.4 : 1) * (0.9 + 2.4 * o.press) * (0.5 + still * 0.5);
    ctx.E = (en.E + clamp(Math.abs(o.sVel || 0) * 5, 0, 1.1)) * (reduced ? 0.3 : 1);
    /* going down: the sentence lets go as the floor does; the wish is left at the top, and is found again at the bottom */
    groups.s.dAlpha = 1 - sm(0, 9, Dd);
    var atBottom = Dd > LEN * 0.5, wantYo = atBottom ? -LEN : 0;
    if (groups.w.yoff !== wantYo) { groups.w.yoff = wantYo; groups.w.letters.forEach(function (L) { slotOf(groups.w, L); }); }
    groups.w.dAlpha = atBottom ? sm(LEN - 26, LEN - 6, Dd) : 1 - sm(0, 12, Dd);
    for (var gi = 0; gi < GROUPS.length; gi++) {
      var k = GROUPS[gi];
      if (groups[k].dAlpha < 0.004) continue;
      if (ptr.present) planeHit(groups[k].depth, ptr.x, ptr.y, hits[k]); else hits[k].ok = false;
      stepGroup(groups[k], k, ctx);
    }

    /* the questions on the wall */
    for (var mi = 0; mi < marks.length; mi++) {
      var ML = marks[mi], c = Mind.cellPos(ML.cell.c, ML.cell.r);
      ML.rx = c.x; ML.ry = c.y; ML.rz = c.z; ML.tx = c.tx; ML.tz = c.tz; ML.nx = c.nx; ML.nz = c.nz; ML.cap = ML.cap1;
      ML.draw = clamp((E3 - ML.w0) / (ML.w1 - ML.w0), 0, 1); ML.vis = 1 - sm(0.31, 0.46, E3);
    }

    if (R > 0.001 && !resBuilt) buildResidue();
    else if (R <= 0.001 && resBuilt) tearDownResidue();
    if (resBuilt) residue(o);

    seek(o);
    say();
  }

  /* ---------------- the residue ---------------- */
  function buildResidue() {
    var seen = 0, tot = 0;
    Mind.hosts.forEach(function (h) { if (h.mem === 'ghost') return; tot++; if (h.seen) seen++; });
    var hunt = SID.Reactions && SID.Reactions.tokens.some(function (q) { return q.found; }), looked = SID.Ledger && SID.Ledger.rings.some(function (r) { return r.seen; });
    var lines = Trace.lines({ doors: seen, doorsTotal: tot, hunt: hunt, looked: looked });
    scr = Trace.scribble(150); mem = Trace.remembered();
    if (!scr) lines = lines.filter(function (l) { return l !== 'YOU LEFT A TRACE' && l !== 'YOU STOPPED HERE'; });      /* only what happened */
    knots = []; topKnot = -1;
    var best = 0.9;
    if (scr) for (var i = 0; i < scr.n; i++) if (scr.w[i] > 0.9) { knots.push(i); if (scr.w[i] > best) { best = scr.w[i]; topKnot = i; } }
    obs = lines.map(function (t, i) { var g = group('o' + i, t, 0.66, 0.76, 'r'); g.alpha = 0; g.yoff = -SID.Deep.LEN; return g; });
    fin = group('f', FINALE, 0.62, 0.74, 'r'); fin.alpha = 1; fin.lineA = [0, 0, 0]; fin.yoff = -SID.Deep.LEN;
    resBuilt = true; resAnn = 0;
    layout();
  }
  function tearDownResidue() {
    resBuilt = false; obs.forEach(function (g) { delete groups[g.name]; }); if (fin) delete groups.f;
    obs = []; fin = null; scr = null; mem = null; knots = []; topKnot = -1; resAnn = 0;
    all = all.filter(function (L) { return L.grp === 's' || L.grp === 'w'; });
    groups.s.letters.forEach(function (L) { L.leave = 0; }); groups.w.alpha = 1;
  }
  function residue(o) {
    var i, k = obs.length;
    var sl = groups.s.letters, N = sl.length;
    for (i = 0; i < N; i++) { var a0 = RT.sentence[0] + (i / N) * (RT.sentence[1] - RT.sentence[0] - 0.05); sl[i].leave = sm(a0, a0 + 0.05, R); }
    groups.w.alpha = 1 - 0.4 * sm(0.14, 0.3, R);                      /* the wish stays, and quiets */
    var w0 = RT.lines[0], win = (RT.lines[1] - RT.lines[0]) / Math.max(1, k), f = win * 0.2;
    for (i = 0; i < k; i++) { var a = w0 + i * win; obs[i].alpha = sm(a, a + f, R) * (1 - sm(a + win - f, a + win, R)) * 0.9; }
    for (i = 0; i < 3; i++) fin.lineA[i] = sm(RT.finale[0] + i * 0.03, RT.finale[0] + i * 0.03 + 0.03, R) * 0.9;
    for (var gi = 0; gi < k + 1; gi++) {
      var g = gi < k ? obs[gi] : fin;
      if (gi < k && g.alpha < 0.004) { g.letters.forEach(function (L) { L.vis = 0; L.a0 = 0; }); continue; }
      if (g.depth) planeHit(g.depth, o.ptr.x, o.ptr.y, hits.r);
      if (!o.ptr.present) hits.r.ok = false;
      stepGroup(g, 'r', ctx);
    }
    if (R > 0.999 && !Trace.flag.ended) Trace.flag.ended = true;
  }

  function zero() {
    ext.E3 = 0; ext.quiet = 0; ext.fade = 0; ext.close = 0; ext.steer = 0; ext.bx = 0; ext.by = 0;
    SID.Edge.frame = 1; SID.Edge.calm = 0;
    if (atEdge) { atEdge = false; document.body.classList.remove('at-edge'); }
  }
  function unprepare() {
    prepared = false; marks.length = 0; announced = 0;
    Mind.nodes.forEach(function (n) { n.leave = 0; n.srcOf = null; });
    all.forEach(function (L) { L.ux = L.uy = L.uz = L.vx = L.vy = L.vz = 0; L.p = 0; L.vis = 0; L.draw = 0; });
    SID.announce(''); label('');
    R = 0; if (resBuilt) tearDownResidue();
  }

  /* ---------------- the ember ---------------- */
  var tipT = [0, 0, 0, 0];
  function seek(o) {
    var w = null, k, L, list, best = -1, gi;
    /* the pen goes to whichever letter is being written right now */
    for (k = 0; k < marks.length; k++) { L = marks[k]; if (E3 >= L.w0 && E3 < L.w1 && L.w0 > best) { best = L.w0; w = L; } }
    for (gi = 0; gi < GROUPS.length; gi++) {
      list = groups[GROUPS[gi]].letters;
      for (k = 0; k < list.length; k++) {
        L = list[k];
        if (!L.src && E3 >= L.w0 && E3 < L.w1 && L.w0 > best) { best = L.w0; w = L; }          /* (letters that fly are not written) */
      }
    }
    seekerOut.speed = 14; seekerOut.down = true;
    if (w) {
      Letters.tip(w, w.cap, tipT);
      seekerOut.mode = 'pen'; seekerOut.x = tipT[0] - w.nx * 0.02; seekerOut.y = tipT[1]; seekerOut.z = tipT[2] - w.nz * 0.02; seekerOut.life = 3.4;
      seekerOut.down = tipT[3] === 1; seekerOut.near = w.cap * 1.6;
      return;
    }
    if (resBuilt && residueSeek()) return;
    seekerOut.mode = 'follow'; seekerOut.k = 9; seekerOut.d = 5.4; seekerOut.life = 3.6;
    var g = groups.w, resting = E3 > T.wish[1] - 0.02;
    if (o.ptr.present && E3 > 0.3 && hits.s.ok && !(resting && o.en.stillT > 6)) {
      seekerOut.x = hits.s.x - fwd[0] * 0.5; seekerOut.y = hits.s.y + 0.05; seekerOut.z = hits.s.z - fwd[2] * 0.5;
    } else if (resting) {                                           /* once the wish is written the ember waits just below it */
      var p = toRoom(0, g.yc + 3.2 * g.capPx - vh / 2, g.depth, g.yoff);
      seekerOut.x = p[0] - fwd[0] * 0.4; seekerOut.y = p[1] + (SID.env.reduced ? 0 : Math.sin(o.t * 0.9) * 0.03); seekerOut.z = p[2] - fwd[2] * 0.4;
    } else {
      seekerOut.x = CEN[0] + fwd[0] * 4.5 + right[0] * Math.sin(o.t * 0.31) * 0.6; seekerOut.y = CEN[1] + 0.4 * Math.sin(o.t * 0.23); seekerOut.z = CEN[2] + fwd[2] * 4.5 + right[2] * Math.sin(o.t * 0.31) * 0.6;
    }
  }

  /* the ember goes where the drawing is being made: along your line, and then it rests where your line ends */
  function onScribble(f) {
    var x = f * (scr.n - 1), i = Math.min(scr.n - 2, Math.floor(x)), u = x - i;
    return { x: res.scr.cx + (scr.x[i] + (scr.x[i + 1] - scr.x[i]) * u) * res.scr.size, y: res.scr.cy + (scr.y[i] + (scr.y[i + 1] - scr.y[i]) * u) * res.scr.size };
  }
  function residueSeek() {
    var sp = sm(RT.scribble[0], RT.scribble[1], R), pt = null, drawing = false;
    if (scr && sp > 0.001 && sp < 0.999) { pt = onScribble(sp); drawing = true; }
    else if (scr && sp >= 0.999) pt = onScribble(1);                 /* it rests where your line ends */
    if (!pt) return false;
    var p = toRoom(pt.x - vw / 2, pt.y - vh / 2, DEPTH.w, -SID.Deep.LEN);
    seekerOut.mode = 'pen'; seekerOut.x = p[0] - fwd[0] * 0.1; seekerOut.y = p[1]; seekerOut.z = p[2] - fwd[2] * 0.1;
    seekerOut.speed = drawing ? 14 : 5; seekerOut.down = false; seekerOut.life = 3.4; seekerOut.near = 1;
    return true;
  }

  /* ---------------- words for assistive technology ---------------- */
  function label(txt) { if (canvasEl) canvasEl.setAttribute('aria-label', txt || canvasLabel); }
  function say() {
    var s = SID.announce;
    if (announced < 1 && E3 > 0.02) { announced = 1; s('The wall lets go of its structure. Each gap between two opposites is asked a question.'); }
    if (announced < 2 && E3 > 0.5) { announced = 2; s('The letters gather into a sentence: jack of all, master of none, but often times better than master of one.'); label('A sentence written in light: jack of all, master of none, but often times better than master of one. Below it: may the odds be ever in your favour.'); }
    if (announced < 3 && E3 > 0.85) { announced = 3; s('Then a wish: may the odds be ever in your favour.'); }
    if (resBuilt) {
      if (resAnn < 1 && R > RT.sentence[0]) { resAnn = 1; s('The sentence lets go. The wish stays.'); }
      if (resAnn < 2 && R > RT.scribble[0] + 0.03) { resAnn = 2; s(scr ? 'A line is drawn in ember: the path your pointer took.' : 'The ember waits.'); }
      if (resAnn < 4 && R > RT.lines[0]) { resAnn = 4; s(obs.map(function (g) { return g.words.join(' ').toLowerCase(); }).join('. ') + '.'); }
      if (resAnn < 5 && R > RT.finale[0] + 0.05) { resAnn = 5; s('You know a little about me. I know nothing about you. Good.'); label('The end. Your path, drawn in ember. Below: may the odds be ever in your favour. You know a little about me. I know nothing about you. Good.'); }
    }
  }

  /* ---------------- light ---------------- */
  function emit(o) {
    if (!prepared || E3 <= 0) return;
    var t = o.t, i, L;
    for (i = 0; i < marks.length; i++) { L = marks[i]; if (L.vis > 0.01 && L.draw > 0) Letters.emit(L, t, L.vis, L.cap); }
    for (var gi = 0; gi < GROUPS.length; gi++) {
      var g = groups[GROUPS[gi]], boost = gi === 0 ? 1.3 : 1.2;
      for (i = 0; i < g.letters.length; i++) {
        L = g.letters[i];
        if (L.vis < 0.01 || L.draw <= 0 || (L.src && L.p <= 0)) continue;
        var va = L.vis * boost * g.alpha * g.dAlpha * (1 - L.leave);
        if (va > 0.01) Letters.emit(L, t, va, L.cap);
      }
    }
    if (!resBuilt) return;
    for (var oi = 0; oi <= obs.length; oi++) {
      var rg = oi < obs.length ? obs[oi] : fin;
      if (oi < obs.length && rg.alpha < 0.004) continue;
      for (i = 0; i < rg.letters.length; i++) {
        L = rg.letters[i];
        var la = (oi < obs.length ? L.vis : rg.lineA[L.line]) * (1 - 0.5 * SID.Deep.final);         /* in the void even the last words are quieter than what you carry */
        if (la > 0.01 && L.zc !== 0) Letters.emit(L, t, la * 1.2, L.cap);
      }
    }
  }

  /* ---------------- the drawings that are not letters (screen space, after the room's light) ---------------- */
  function rgbaS(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a < 0 ? 0 : a > 1 ? 1 : a).toFixed(3) + ')'; }
  /* a path, as it was made: heavier where the hand stayed (a small loose loop, the longest stay ringed twice), newer lines brighter */
  function strokePath(c2, sc, f, geom, dpr, offx, offy, a, gaps, dx, dy) {
    var n = sc.n, i1 = Math.max(1, Math.floor(f * (n - 1))), nb = 5, b, i, EMB = SID.C.EMBER;
    c2.lineCap = 'round'; c2.lineJoin = 'round'; c2.lineWidth = 1.15 * dpr;
    function X(i) { return (geom.cx + (sc.x[i] + dx) * geom.size) * dpr + offx; }
    function Y(i) { return (geom.cy + (sc.y[i] + dy) * geom.size) * dpr + offy; }
    for (b = 0; b < nb; b++) {
      var i0 = Math.floor(i1 * b / nb), ie = Math.min(i1, Math.floor(i1 * (b + 1) / nb) + 1);
      c2.strokeStyle = rgbaS(EMB, a * (0.35 + 0.65 * (b + 1) / nb)); c2.beginPath();
      for (i = i0; i <= ie; i++) (i === i0 || (gaps && gaps[i])) ? c2.moveTo(X(i), Y(i)) : c2.lineTo(X(i), Y(i));
      c2.stroke();
    }
    for (b = 0; b < knots.length && !gaps; b++) {                  /* where the hand stayed */
      i = knots[b]; if (i > i1) break;
      var w = sc.w[i], r = (2.6 + 2.4 * Math.sqrt(w)) * dpr, a0 = i * 2.399, cx = X(i), cy = Y(i);
      c2.strokeStyle = rgbaS(EMB, a * 0.75); c2.beginPath(); c2.arc(cx, cy, r, a0, a0 + 6.9); c2.stroke();
      if (i === topKnot) { c2.strokeStyle = rgbaS(EMB, a * 0.5); c2.beginPath(); c2.arc(cx, cy, r * 1.75, a0 + 1, a0 + 7.6); c2.stroke(); }
    }
    /* the start of a line is marked as a survey would: a small cross */
    if (!gaps) { c2.strokeStyle = rgbaS(EMB, a * 0.55); c2.beginPath(); var sx = X(0), sy = Y(0), tk = 4 * dpr; c2.moveTo(sx - tk, sy); c2.lineTo(sx + tk, sy); c2.moveTo(sx, sy - tk); c2.lineTo(sx, sy + tk); c2.stroke(); }
  }
  function draw2d(c2, dpr, fs) {
    if (!resBuilt || R <= 0.001 || !res) return;
    var q = [0, 0, 0], rp = toRoom(0, 0, DEPTH.w, -SID.Deep.LEN), offx = 0, offy = 0;
    if (SID.Cam.project(rp[0], rp[1], rp[2], q)) { offx = q[0] - cam.cx; offy = q[1] - cam.cy; }       /* the room breathes; so do these */
    var reduced = SID.env.reduced;
    c2.save(); c2.globalCompositeOperation = 'lighter';
    /* what is left of the last visit's line: broken, a little off, and never quite where it was */
    var mp = sm(RT.memory[0], RT.memory[1], R);
    if (mem && mp > 0.01) strokePath(c2, mem, 1, res.scr, dpr, offx, offy, 0.32 * mp, mem.gap, 0.045, 0.03);
    var sp = reduced ? sm(RT.scribble[0], RT.scribble[0] + 0.05, R) : sm(RT.scribble[0], RT.scribble[1], R);
    if (scr && sp > 0.001) strokePath(c2, scr, reduced ? 1 : sp, res.scr, dpr, offx, offy, 0.8 * (reduced ? sp : 1), null, 0, 0);
    c2.restore();
  }

  SID.Edge = {
    build: build, update: update, emit: emit,
    get E3() { return E3; },
    get active() { return E3 > 0; },
    get resting() { return E3 >= 0.999 && R >= 0.999 && !SID.Deep.active; },      /* (in the well there is always something moving: dust, a beam) */
    get R() { return R; },
    get wishDone() { return E3 >= 0.999; },
    get az3() { return az3; },
    get residueOn() { return resBuilt && R > 0.001; },
    draw2d: draw2d,
    set rduration(s) { RD = Math.max(3, s); }, get rduration() { return RD; },
    seeker: seekerOut,
    frame: 1, calm: 0,                                 /* how much of the apparatus is still there; how quiet the world is */
    set duration(s) { duration = Math.max(2, s); },
    get duration() { return duration; },
    clear: function () { E3 = 0; if (prepared) unprepare(); zero(); }
  };
})();
