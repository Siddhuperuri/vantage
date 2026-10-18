/* ------------------------------------------------------------------
   mind.js  -  the inside of the name.

   The letters of the name are the spine of a crossword wrapped around
   whoever stands at the centre. Every other word crosses through a
   shared letter. Nothing here is a diagram: it is one physical system.

     * Each letter has a resolution rho (0..1): sketched, inferred,
       computed, designed, measured - Module 1's five layers, now the
       five stages of becoming. Attention raises it, but only while you
       are still. Neglect lets it relax to the word's natural stage.
       Nothing resolves past the evidence for it.
     * Attention spreads along words and across shared letters.
     * Contradictions inhibit each other: resolve one pole and the other
       recoils - unless you rest on the gap between them, which raises
       both and draws them together.
     * Words are ropes of letters: the wall is stirred by the pointer,
       by scroll and by the pole you are not attending to.
     * Behind some counters (the holes in A, D, O, P, R) are memories.
       They develop only when you look through them.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID, M = SID.M, G = SID.Glyphs, D = SID.MindData, SP = SID.Sprites, TAU = Math.PI * 2;
  var cam = SID.cam, Visit = SID.Visit, Trace = SID.Trace, DNA = SID.DNA;

  var N = D.N, ALPHA = TAU / N, R = 7.56, CELL = R * ALPHA, CAP = CELL * 0.8;
  var CEN = SID.Cam.CENTER, DOOR_COL = 15, NEAR = 0.12, ROW0 = D.ROWS[0], ROW1 = D.ROWS[1];

  var wrapPi = M.wrapPi;
  function key(c, r) { return c + ',' + r; }
  var sm = M.smooth, clamp = M.clamp, damp = M.damp;

  var nodes = [], words = [], grid = {}, hosts = [], pairs = [], seq = [];
  var az0 = 0, azFixed = false, grow = 0, built = false;
  var focusIdx = -1, focusPull = 0, tapAt = null, focusOrder = [];       /* focusIdx: the door that was chosen (click, tap or Tab); scrolling goes into that one only */

  var Letters = SID.Letters, newNode = Letters.node;
  Letters.ref = CAP;

  /* ---------------- geometry of the wall ---------------- */
  function az(c) { return az0 + (c - DOOR_COL) * ALPHA; }
  var PL = { x: 0, y: 0, z: 0, tx: 1, tz: 0, nx: 0, nz: -1 };
  function place(c, r) {
    var a = az(c), s = Math.sin(a), co = Math.cos(a);
    PL.x = CEN[0] + R * s; PL.z = CEN[2] - R * co; PL.y = CEN[1] - r * CELL;
    PL.tx = co; PL.tz = s; PL.nx = s; PL.nz = -co;
  }

  /* ---------------- build ---------------- */
  function build() {
    var rng = M.rng(20260926 ^ (Visit.seed & 0xffff));                     /* same wall, this visit's hand */
    D.words.forEach(function (w, wi) {
      var W = { g: D.concept[w.text] || D.neutral, met: false, id: wi, text: w.text, c: w.c, r: w.r, dir: w.dir, nat: w.nat, ceil: w.ceil, ev: w.evidence, wave: w.wave, cells: [], act: 0, inh: 0, mean: 0, pair: null, side: 0, other: null };
      words.push(W);
      for (var i = 0; i < w.text.length; i++) {
        var c = w.dir === 'A' ? w.c + i : w.c, r = w.dir === 'A' ? w.r : w.r + i, k = key(c, r), n = grid[k];
        if (!n) { n = newNode(c, r, w.text[i], rng); grid[k] = n; nodes.push(n); }
        W.cells.push(n); n.words.push(W);
      }
    });
    /* neighbours along words (and so, through shared letters, across words) */
    words.forEach(function (W) {
      W.cells.forEach(function (n, j) {
        [W.cells[j - 1], W.cells[j + 1]].forEach(function (m) { if (m && n.nb.indexOf(m) < 0) n.nb.push(m); });
      });
    });
    /* resting stage and evidence ceiling per node (crossings take the mean / the more generous ceiling) */
    nodes.forEach(function (n) {
      var nat = 0, ceil = 0;
      n.words.forEach(function (W) { nat += W.nat; ceil = Math.max(ceil, W.ceil); });
      n.nat = nat / n.words.length; n.ceil = ceil; n.rho = n.nat;
      n.isSpine = n.words.some(function (W) { return W.text === 'SIDDHARTHA'; });
      /* what the concepts that cross here do to the space around the letter (mind-data.js: the hidden law) */
      var kk = 0, dd = 0;
      n.words.forEach(function (W) { kk += W.g.k; dd += W.g.d; });
      n.kS = kk / n.words.length; n.dD = dd / n.words.length;
    });
    /* writing order: the words that cross the name first, then what crosses them */
    var ws = words.filter(function (W) { return W.text !== 'SIDDHARTHA'; });
    ws.sort(function (a, b) { return a.wave - b.wave || Math.abs(a.c + (a.dir === 'A' ? a.text.length / 2 : 0) - DOOR_COL) + (Visit.r('o' + a.text) - 0.5) * 3 - Math.abs(b.c + (b.dir === 'A' ? b.text.length / 2 : 0) - DOOR_COL) - (Visit.r('o' + b.text) - 0.5) * 3; });
    ws.forEach(function (W) { W.cells.forEach(function (n) { if (n.order < 0 && !n.isSpine) { n.order = seq.length; seq.push(n); } }); });
    /* contradictions */
    D.pairs.forEach(function (p) {
      var a = words.filter(function (W) { return W.text === p.a; })[0], b = words.filter(function (W) { return W.text === p.b; })[0];
      var P = { a: a, b: b, gap: p.gap.map(function (g) { return { c: g[0], r: g[1], sx: 0, sy: 0, zc: -1, a0: 0 }; }), near: [], gapA: 0, close: 0, seamNode: null };
      a.pair = P; a.side = 0; a.other = b; b.pair = P; b.side = 1; b.other = a;
      /* nodes close to the gap feel it */
      [a, b].forEach(function (W) {
        W.cells.forEach(function (n) {
          var best = 99;
          P.gap.forEach(function (g) { best = Math.min(best, Math.max(Math.abs(n.c - g.c), Math.abs(n.r - g.r))); });
          if (best <= 3) P.near.push({ n: n, w: 1 - best / 4 });
        });
      });
      /* a shared letter is a seam */
      a.cells.forEach(function (n) { if (b.cells.indexOf(n) >= 0) { P.seamNode = n; n.seam = true; } });
      pairs.push(P);
    });
    /* doors: the counters that open onto memories */
    D.hosts.forEach(function (h, hi) {
      var n = grid[key(h.c, h.r)];
      if (!n) return;
      n.host = hosts.length;
      hosts.push({ dv: 0, dvv: 0, entries: 0, within: false, node: n, mem: h.mem, dev: 0, inst: SID.Memories.create(h.mem), flash: 0, seen: false, a0: 0, csx: 0, csy: 0, czc: -1, capPx: 0, idx: hosts.length });
    });
    focusOrder = hosts.map(function (h, i) { return i; }).sort(function (a, b) { return hosts[a].node.c - hosts[b].node.c; });
    hosts.forEach(function (h, i) { if (h.mem === 'ghost') ghostIdx = i; });
    if (Visit.mem.open) { forb.open = true; forb.pre = true; forb.k = 1; }              /* the world remembers what was done to it */
    built = true;
  }

  /* ---------------- state exposed to the rest of the piece ---------------- */
  var st = {
    active: false, L: 0, door: -1, inside: 0, wallA: 0, m1A: 1, fov: 56, grow: 0, rise: 0,
    yaw: 0, pitch: 0, heading: 0
  };
  var H = 0, pB = 0, yawA = 0, pitA = 0, yawV = 0, pitV = 0, Lv = 0, spr = [0, 0], kPrev = 1.25, initDone = false, L = 0, doorIdx = -1;
  /* the wall's other use of scroll. With nothing chosen, scrolling lifts you out of the middle of the crossword to the top of the room
     (where the ledger is: ledger.js) and brings you back before the ending. UP is how high, in world units (a row of the wall is CELL). */
  var UP = 10.5, Rz = 0, Rv = 0;
  var keyDir = { l: 0, r: 0, u: 0, d: 0 };
  var ACC = [0, 0, 0], switchT = 0, sw = { yaw: 0, pit: 0, dx: 0, dy: 0, dz: 0 };
  /* what the ending (edge.js) asks of the wall, written by it every frame:
     E3 progress of the ending; quiet: motion and doors settle, letters go back to being drafts;
     fade: the whole wall dissolves; close: contradictions are drawn together;
     steer/steerAz: the head is gently returned to face the sentence */
  var ext = { E3: 0, quiet: 0, fade: 0, close: 0, steer: 0, steerAz: 0, bx: 0, by: 0, free: 0,
              instab: 0,     /* reactions.js: EXPERIMENTS makes the whole wall a little unstable */
              gridBoost: 0,  /* reactions.js: STRUCTURE makes the grid under the letters visible */
              intuit: 0 };   /* reactions.js: INTUITION points the ember at a door not yet opened */
  var still = 0, massNow = 1, ptrHit = { ok: false, x: 0, y: 0, z: 0 };
  /* The one door that says NOT YET. It flinches from attention (its counter closes, its glint shudders and withdraws) and
     it only gives to being asked, and asked for a while: press and hold on it (a finger, a mouse button, or Enter). Forced,
     the wall does not do anything to you: it comes apart into its layers, and the signature comes out of tune,
     and the world keeps it. sep is how far apart every letter's five renderings stand. */
  var ASK_T = 2.6, ghostIdx = -1, keyAsk = false;
  var forb = { open: false, pre: false, k: 0, ask: 0, flinch: 0, pulse: 0, sep: 0 };
  var seekerOut = { mode: 'follow', x: 0, y: 0, z: 0, k: 9, d: 5.4, speed: 9, down: false, life: 3.2 };

  function hostPos(h, out) {
    place(h.node.c, h.node.r);
    var cc = h.node.gl && h.node.gl.cc, ox = 0, oy = 0;
    if (cc) { ox = cc[0] - h.node.gl.w / 2; oy = cc[1] - 0.5; }
    out[0] = PL.x + PL.tx * ox * CAP; out[1] = PL.y + oy * CAP; out[2] = PL.z + PL.tz * ox * CAP;
  }
  var HP = [0, 0, 0];

  /* ---------------- the camera controller: where you look, how far you lean ---------------- */
  function edge(v) { var a = Math.abs(v); return (v < 0 ? -1 : 1) * sm(0.72, 1, a); }

  function control(o) {
    var S2 = o.S2, dt = o.dt, inp = o.inp, look0 = SID.Director.look, reduced = SID.env.reduced, coarse = SID.env.coarse;
    var mouse = inp.present && !coarse;
    /* the wall is fixed to wherever Module 1's ring was facing as we crossed over */
    if (!azFixed || S2 < 0.02) az0 = SID.Director.wallAz();
    azFixed = S2 > 0.02;
    if (S2 <= 0) {
      /* back in Module 1: hand the gaze back so the rings keep facing where you look */
      if (initDone) { SID.Director.syncGaze(yawA, pitA); initDone = false; L = 0; Lv = 0; doorIdx = -1; }
      return null;
    }

    if (!initDone && S2 > 0) {
      H = look0.yaw - (mouse ? 1.25 * inp.nx : 0); pB = look0.pitch + (mouse ? 0.24 * inp.ny : 0);
      yawA = look0.yaw; pitA = look0.pitch; yawV = 0; pitV = 0; kPrev = mouse ? 1.25 : 0; initDone = true;
    }
    if (!initDone) return null;

    /* at the edge the pointer no longer turns your head; in the well (ext.free) it is yours again */
    var still0 = Math.max(1 - sm(0, 0.3, ext.E3), ext.free);
    var kdir = coarse ? 0 : M.lerp(1.25, 0.42, sm(0, 0.12, S2)) * still0;
    if (mouse) H += (kPrev - kdir) * inp.nx;
    kPrev = kdir;

    if (mouse) { var pan = still0;                                       /* (none at the edge: a pointer parked at the side must not slide the view) */ H += edge(inp.nx) * 1.5 * dt * pan; pB -= edge(inp.ny) * 0.9 * dt * pan; }
    if (ext.steer > 0) {                                              /* the ending draws your eyes back to the sentence */
      H += wrapPi(ext.steerAz - kdir * (mouse ? inp.nx : 0) - H) * (1 - Math.exp(-ext.steer * dt)); pB -= pB * (1 - Math.exp(-ext.steer * dt));
    }
    H += (keyDir.r - keyDir.l) * 1.3 * dt; pB += (keyDir.u - keyDir.d) * 0.8 * dt;
    if (inp.dragX || inp.dragY) {                                   /* touch: grab the world and turn it (less so at the edge) */
      var grab = 1 - 0.85 * sm(0, 0.3, ext.E3) * (1 - ext.free);
      H -= inp.dragX * grab * (cam.fov * Math.PI / 180 * cam.W / cam.H) / inp.w;
      pB += inp.dragY * grab * (cam.fov * Math.PI / 180) / inp.h;
      inp.dragX = 0; inp.dragY = 0;
    }
    /* choosing a door eases the gaze toward it for a moment, and then leaves you free to look elsewhere */
    var tgt = null;
    if (keyDir.l || keyDir.r || keyDir.u || keyDir.d) focusPull = 0;    /* turning your own head cancels it */
    focusPull = Math.max(0, focusPull - dt);
    if (focusIdx >= 0) tgt = hosts[focusIdx];
    if (tgt && L < 0.5 && focusPull > 0) {
      hostPos(tgt, HP);
      var ya = Math.atan2(HP[0] - CEN[0], -(HP[2] - CEN[2])), pa = Math.atan2(HP[1] - CEN[1], R);
      H += wrapPi(ya - kdir * (mouse ? inp.nx : 0) - H) * (1 - Math.exp(-3 * dt));
      pB += (pa - pB) * (1 - Math.exp(-3 * dt));
    } else if (tapAt && tapAt.az != null) {
      H += wrapPi(tapAt.az - H) * (1 - Math.exp(-2.4 * dt)); pB += (tapAt.pitch - pB) * (1 - Math.exp(-2.4 * dt));
    }
    /* you can look further up than the wall goes (there is something there), and in the well, straight down */
    var pHi = 0.9 + 0.4 * ext.free, pLo = -(0.75 + 0.67 * ext.free);
    pB = clamp(pB, pLo, pHi);

    var ty = H + (mouse ? kdir * inp.nx : 0), tp = clamp(pB - (mouse ? 0.26 * still0 * inp.ny : 0), pLo - 0.05, pHi + 0.05);
    /* the head has weight: it accelerates toward where you look and settles without a snap (a critically damped spring) */
    var wH = reduced ? 12 : 5.6;
    M.crit(yawA, yawV, yawA + wrapPi(ty - yawA), wH, dt, spr); yawA = spr[0]; yawV = spr[1];
    M.crit(pitA, pitV, tp, wH, dt, spr); pitA = spr[0]; pitV = spr[1];

    /* lean: scroll takes you into the door you chose, and nowhere else: with nothing chosen it does nothing to the view */
    var Lt = focusIdx >= 0 ? sm(0.30, 1.0, S2) * (1 - sm(0, 0.08, ext.E3)) : 0;           /* (the ending steps you back to the centre) */
    M.crit(L, Lv, Lt, reduced ? 10 : 3.9, dt, spr); L = spr[0]; Lv = spr[1];
    if (L < 0 || L > 1) { L = clamp(L, 0, 1); Lv = 0; }
    /* rise: only while nothing is chosen, and only before the ending. It is the same scroll, doing the other thing. */
    var riseT = (focusIdx >= 0 || ext.E3 > 0.02) ? 0 : sm(0.34, 0.66, S2) * (1 - sm(0.8, 0.98, S2));
    M.crit(Rz, Rv, riseT * UP, reduced ? 10 : 3.0, dt, spr); Rz = spr[0]; Rv = spr[1];
    if (Rz < 0.001 && riseT === 0) { Rz = 0; Rv = 0; }
    st.rise = Rz / UP;
    if (L < 0.03) doorIdx = -1;
    else if (doorIdx < 0 && L > 0.06) doorIdx = focusIdx;
    var yawE = yawA, pitE = pitA, dx = 0, dy = 0, dz = 0;
    if (doorIdx >= 0) {
      hostPos(hosts[doorIdx], HP);
      var wx = HP[0] - CEN[0], wy = HP[1] - CEN[1], wz = HP[2] - CEN[2], wl = Math.sqrt(wx * wx + wy * wy + wz * wz);
      var b = sm(0.2, 0.7, L), yd = Math.atan2(wx, -wz), pd = Math.asin(wy / wl);
      yawE = yawA + wrapPi(yd - yawA) * b; pitE = pitA + (pd - pitA) * b;
      /* the counter is a window: stop a few units short of the wall, where the memory fills the
         view and the huge letter frames it. You do not pass through; it opens toward you. */
      /* how far back depends on the shape of the screen: a tall, narrow phone must stand further
         from the memory than a wide desktop for the whole of it to fit */
      var fovNow = M.lerp(56, 64, sm(0, 0.15, S2)) - 14, aspect = cam.W / cam.H;
      var half = Math.min(fovNow * Math.PI / 360, Math.atan(Math.tan(fovNow * Math.PI / 360) * aspect));
      var stop = Math.max(2.5, CAP * 1.15 * 1.2 / Math.tan(half) - CAP * 0.65);
      var rl = M.smoother(0, 1, L) * (wl - stop);
      dx = wx / wl * rl; dy = wy / wl * rl; dz = wz / wl * rl;
    } else {
      var f = dirFrom(yawA, pitA), rl2 = sm(0, 0.8, L) * (R - 1.9);
      dx = f[0] * rl2; dy = f[1] * rl2; dz = f[2] * rl2;
    }
    /* choosing another door while already leaning: the view glides to it rather than jumping */
    if (switchT > 0) {
      switchT -= dt; var kk = 1 - Math.exp(-7 * dt);
      sw.yaw += wrapPi(yawE - sw.yaw) * kk; sw.pit += (pitE - sw.pit) * kk; sw.dx += (dx - sw.dx) * kk; sw.dy += (dy - sw.dy) * kk; sw.dz += (dz - sw.dz) * kk;
      yawE = sw.yaw; pitE = sw.pit; dx = sw.dx; dy = sw.dy; dz = sw.dz;
    } else { sw.yaw = yawE; sw.pit = pitE; sw.dx = dx; sw.dy = dy; sw.dz = dz; }
    st.L = L; st.door = doorIdx; st.inside = doorIdx >= 0 ? sm(0.7, 0.95, L) : 0;
    st.yaw = yawE; st.pitch = pitE; st.heading = wrapPi(yawA);
    var fovBase = M.lerp(56, 64, sm(0, 0.15, S2)), fovLean = fovBase - 14 * sm(0.35, 1, L) * (doorIdx >= 0 ? 1 : 0.4);
    /* (the ending's slow breath, sideways and up, is what lets the three depths of the text part very slightly) */
    dx += Math.cos(yawE) * ext.bx; dz += Math.sin(yawE) * ext.bx; dy += ext.by + Rz;
    return { look: { yaw: yawE, pitch: pitE }, ox: dx, oy: dy, oz: dz, fov: M.lerp(fovLean, ext.fov || fovLean, sm(0, 0.12, ext.E3)) };
  }
  function dirFrom(yaw, pit) { var cp = Math.cos(pit); return [Math.sin(yaw) * cp, Math.sin(pit), -Math.cos(yaw) * cp]; }

  /* ---------------- physics + attention + resolution ---------------- */
  function wallHit(px, py) {            /* where the pointer's ray meets the wall */
    var d0 = (px - cam.cx) / cam.F, d1 = -(py - cam.cy) / cam.F;
    var dx = cam.fx + cam.rx * d0 + cam.ux * d1, dz = cam.fz + cam.rz * d0 + cam.uz * d1, dy = cam.fy + cam.ry * d0 + cam.uy * d1;
    var ox = cam.x - CEN[0], oz = cam.z - CEN[2], a = dx * dx + dz * dz, b = 2 * (ox * dx + oz * dz), c = ox * ox + oz * oz - R * R;
    var disc = b * b - 4 * a * c;
    if (a < 1e-9 || disc < 0) return false;
    var s = (-b + Math.sqrt(disc)) / (2 * a);
    if (s <= 0 || c > 0) return false;                                /* only from inside the wall */
    ptrHit.x = cam.x + dx * s; ptrHit.y = cam.y + dy * s; ptrHit.z = cam.z + dz * s;
    return true;
  }

  function update(o) {
    if (!built) return;
    var dt = Math.min(o.dt, 1 / 30), t = o.t, S2 = o.S2, en = o.en, reduced = SID.env.reduced, F = cam.F;
    st.active = S2 > 0; st.grow = grow;
    var Q = ext.quiet;                                /* the ending: the wall lets go (see edge.js) */
    st.wallA = sm(0, 0.085, S2) * (1 - ext.fade); st.m1A = 1 - sm(0.0, 0.085, S2);
    if (st.wallA < 0.003 && S2 > 0.5) return;                        /* the wall has let go entirely: nothing of it is visible, so nothing of it is simulated */

    /* growth: the ember writes the crossing words out of the letters of the name.
       Once you have crossed over, the wall writes itself to the end at its own pace and scrolling
       can only hurry it: a wall that stopped half-written wherever you stopped scrolling would
       always look like something was missing. Scrolling back out unwrites it. */
    if (S2 > 0.01) {
      var byScroll = damp(grow, M.smoother(0.0, 0.30, S2), reduced ? 6 : 1.9, dt);
      grow = Math.min(1, Math.max(byScroll, grow + (reduced ? 0.4 : 0.085 * (0.92 + 0.16 * Visit.r('pace'))) * dt));
    } else grow = damp(grow, 0, reduced ? 6 : 1.9, dt);
    if (forb.open) { forb.k = forb.pre ? 1 : Math.min(1, forb.k + dt / (reduced ? 1.2 : 6)); forb.pulse = Math.max(0, forb.pulse - dt / 2.5); }
    var T = seq.length + 3, i, j, n;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      n.draw = n.isSpine ? 1 : clamp(grow * T - n.order, 0, 1);
    }

    /* the attention point: the pointer, a tap, a keyboard-focused door, or simply where you face */
    if (tapAt) { tapAt.t -= dt; if (tapAt.t <= 0) tapAt = null; }
    var ax = cam.cx, ay = cam.cy, aS = 0.7, mouse = o.ptr.present;
    if (mouse) { ax = o.ptr.x; ay = o.ptr.y; aS = 1; }
    else if (focusIdx >= 0) { var fh = hosts[focusIdx]; if (fh.czc > 0) { ax = fh.csx; ay = fh.csy; aS = 1; } }
    var dpr = o.dpr;
    still = 0.22 + 0.78 * sm(0.05, 0.8, en.stillT);
    if (reduced) still = 0.6 + 0.4 * sm(0.05, 0.8, en.stillT);

    /* 1. raw attention, from last frame's projections */
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      if (n.zc <= 0) { n.a0 = 0; continue; }
      var dx = n.sx - ax, dy = n.sy - ay, sg = Math.max(46 * dpr, 0.65 * n.capPx);
      n.a0 = Math.exp(-(dx * dx + dy * dy) / (2 * sg * sg)) * aS * sm(0.05, 0.6, n.draw) * st.wallA;
    }
    /* 2. it spreads along words and through shared letters */
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i]; var s = 0;
      for (j = 0; j < n.nb.length; j++) s += n.nb[j].a0;
      n.A1 = n.a0 + (n.nb.length ? 0.42 * s / n.nb.length : 0);
    }
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i]; var s2 = 0;
      for (j = 0; j < n.nb.length; j++) s2 += n.nb[j].A1;
      n.A = n.A1 + (n.nb.length ? 0.3 * s2 / n.nb.length : 0);
    }
    /* 2a. once the door has been forced, every letter's five renderings stand apart in depth */
    var sepT = forb.open ? (forb.pre ? 0.3 + 0.1 * Visit.keep : forb.k) : 0;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      n.sep = damp(n.sep, Math.max(sepT, n.rsep || 0), 3, dt);
    }

    /* 2b. the seconds attention rested on a letter, kept only to notice when it comes back to one after leaving it */
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      if (n.a0 > 0.22 && en.stillT > 0.5) n.dwell = Math.min(14, n.dwell + dt * n.a0 * 1.2);
      else n.dwell = Math.max(0, n.dwell - dt * 0.012);
      if (n.a0 < 0.05) { if (n.dwell > 2) n.away += dt; }
      else if (n.a0 > 0.3) { if (n.away > 12) { n.rt++; Trace.letterReturn(); } n.away = 0; }
    }

    /* 3. the gap between two poles: resting on it raises both */
    var P, g, q, W, pi;
    for (pi = 0; pi < pairs.length; pi++) {
      P = pairs[pi]; var ga = 0;
      for (j = 0; j < P.gap.length; j++) {
        g = P.gap[j]; place(g.c, g.r);
        var gdx = PL.x - cam.x, gdy = PL.y - cam.y, gdz = PL.z - cam.z, gzc = gdx * cam.fx + gdy * cam.fy + gdz * cam.fz;
        if (gzc < NEAR) { g.zc = -1; continue; }
        var ginv = F / gzc; g.sx = cam.cx + (gdx * cam.rx + gdy * cam.ry + gdz * cam.rz) * ginv; g.sy = cam.cy - (gdx * cam.ux + gdy * cam.uy + gdz * cam.uz) * ginv; g.zc = gzc;
        var gsg = Math.max(46 * dpr, 0.6 * CAP * ginv), ddx = g.sx - ax, ddy = g.sy - ay;
        g.a0 = Math.exp(-(ddx * ddx + ddy * ddy) / (2 * gsg * gsg)) * aS * st.wallA;
        ga = Math.max(ga, g.a0);
      }
      P.gapA = damp(P.gapA, ga, 5, dt);
      for (j = 0; j < P.near.length; j++) P.near[j].n.A += P.gapA * 0.8 * P.near[j].w;
    }
    /* 4. word-level activation and the recoil of the opposite pole */
    for (i = 0; i < words.length; i++) {
      W = words[i]; var ws = 0, wr = 0;
      for (j = 0; j < W.cells.length; j++) { ws += W.cells[j].A; wr += W.cells[j].rho; }
      W.act = damp(W.act, ws / W.cells.length, 4, dt); W.mean = wr / W.cells.length;
      /* meeting an idea is what shapes the signature (curvature); it is only ever added to */
      if (!W.met && W.text !== 'SIDDHARTHA' && W.act > 0.35) { W.met = true; DNA.express('ideas', 1 / 17); }
    }
    /* the concept under the ember, and what it asks of the world (mind-data.js: the hidden law) */
    var aw = null, ab = 0.15;
    for (i = 0; i < words.length; i++) { W = words[i]; if (W.text !== 'SIDDHARTHA' && W.act > ab) { ab = W.act; aw = W; } }
    massNow = aw ? M.lerp(1, aw.g.m, sm(0.15, 0.5, ab)) : 1;
    if (st.wallA > 0.5 && S2 > 0.3) DNA.express('memory', dt * 0.0035);                 /* time spent inside is what it remembers */
    for (pi = 0; pi < pairs.length; pi++) {
      P = pairs[pi];
      var bal = clamp(P.gapA * 2.4, 0, 1);
      P.a.inh = P.b.act * (1 - bal); P.b.inh = P.a.act * (1 - bal);
      /* they draw together when both are resolved and you are resting between them */
      var both = Math.min(P.a.mean, P.b.mean);
      P.close = damp(P.close, Math.max(P.gapA * sm(0.35, 0.7, both), P.gap.length ? ext.close : 0), 1.5, dt);
      if (!P.done && P.gapA * sm(0.35, 0.7, both) > 0.5) { P.done = true; DNA.express('balance', 0.2); }        /* held between two opposites: the figure comes into balance */
    }

    /* 5. resolution: attention raises it (only while still), neglect relaxes it, evidence caps it */
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      var A = n.A, ceil = n.ceil, inh = 0;
      for (j = 0; j < n.words.length; j++) if (n.words[j].inh > inh) inh = n.words[j].inh;
      var up = 0.55 * A * still * (ceil - n.rho) * (1 - Q);
      var relax = 0.11 * (n.rho - n.nat) * (1 - 0.7 * Math.min(1, A));
      var inhb = 0.5 * inh * Math.max(0, n.rho - 0.06) * (1 - Math.min(1, A));
      var draft = Q * 0.5 * Math.max(0, n.rho - 0.14);         /* everything measured goes back to being sketched */
      n.rho = clamp(n.rho + (up - relax - inhb - draft) * dt, 0, ceil);
      if (n.seam) { var pr = n.words[0].pair || n.words[1].pair; n.fuse = damp(n.fuse, pr && Math.min(pr.a.mean, pr.b.mean) > 0.55 && A > 0.4 ? 1 : 0, 1.4, dt); }
    }

    /* 6. the wall as a physical thing */
    var hasHit = mouse && wallHit(ax, ay);
    var calm = 1 - Q, press = o.press, gPull = (reduced ? 0.4 : 1) * (0.9 + 2.4 * press) * (0.5 + still * 0.5) * calm;
    /* the wall feels the wheel: scrolling sends waves along the words, even though you are not travelling */
    var E = (en.E + clamp(Math.abs(o.sVel || 0) * 5, 0, 1.1) + forb.pulse * 1.3 + ext.instab * 0.9) * (reduced ? 0.3 : 1) * calm, tt = t;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      place(n.c, n.r);
      n.rx = PL.x; n.ry = PL.y; n.rz = PL.z; n.tx = PL.tx; n.tz = PL.tz; n.nx = PL.nx; n.nz = PL.nz;
      var kS = 16 * n.kS;                                     /* a stiff concept holds its letters; a loose one lets them sway */
      ACC[0] = -kS * n.ux; ACC[1] = -kS * n.uy; ACC[2] = -kS * n.uz;
      for (j = 0; j < n.nb.length; j++) { var m = n.nb[j]; ACC[0] += kS * (m.ux - n.ux); ACC[1] += kS * (m.uy - n.uy); ACC[2] += kS * (m.uz - n.uz); }
      /* the pointer pulls and swirls the letters it rests on (along the wall, not through it) */
      if (hasHit) Letters.pointerAccel(n, ptrHit, CELL, gPull, ACC);
      /* energy stirs waves along the words; the recoil pushes the opposite pole off its axis */
      if (!reduced) Letters.waveAccel(n, E, tt, 1, ACC);
      if (forb.ask > 0.05 && !reduced && ghostIdx >= 0) {                                    /* being asked to open, the wall near the door strains */
        var gn = hosts[ghostIdx].node, gd = Math.max(Math.abs(n.c - gn.c), Math.abs(n.r - gn.r));
        if (gd < 4) Letters.waveAccel(n, forb.ask / ASK_T * 2.6 * (1 - gd / 4), tt * 3.1, 1, ACC);
      }
      n.inh = 0;
      for (j = 0; j < n.words.length; j++) if (n.words[j].inh > n.inh) n.inh = n.words[j].inh;
      if (n.inh > 0.02) { ACC[0] += n.tx * Math.sin(n.r * 1.3 + tt * 0.9) * n.inh * 5; ACC[1] += Math.cos(n.c * 0.9 + tt * 0.7) * n.inh * 4; ACC[2] += n.tz * Math.sin(n.r * 1.3 + tt * 0.9) * n.inh * 5; }
      n.vx += ACC[0] * dt; n.vy += ACC[1] * dt; n.vz += ACC[2] * dt;
      var dmp = Math.exp(-4.4 * n.dD * dt); n.vx *= dmp; n.vy *= dmp; n.vz *= dmp;
      n.ux += n.vx * dt; n.uy += n.vy * dt; n.uz += n.vz * dt;
    }
    /* the two poles of a contradiction, when you rest between them, are drawn together */
    for (pi = 0; pi < pairs.length; pi++) {
      P = pairs[pi];
      if (P.close < 0.01 || !P.gap.length) continue;
      var gcx = 0, gcy = 0, gcz = 0;
      for (j = 0; j < P.gap.length; j++) { place(P.gap[j].c, P.gap[j].r); gcx += PL.x; gcy += PL.y; gcz += PL.z; }
      gcx /= P.gap.length; gcy /= P.gap.length; gcz /= P.gap.length;
      for (j = 0; j < P.near.length; j++) {
        q = P.near[j];
        var nn = q.n, mx = gcx - (nn.rx + nn.ux), my = gcy - (nn.ry + nn.uy), mz = gcz - (nn.rz + nn.uz), ml = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
        var pull = P.close * q.w * 2.2 * dt;
        nn.vx += mx / ml * pull * 4; nn.vy += my / ml * pull * 4; nn.vz += mz / ml * pull * 4;
      }
    }
    /* derived deformation: twist, stretch, the iris of an open counter */
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      var tw = 0, stv = 0, cnt = 0;
      for (var wi = 0; wi < n.words.length; wi++) {
        W = n.words[wi];
        var ci = W.cells.indexOf(n), a = W.cells[ci - 1] || n, b = W.cells[ci + 1] || n;
        var span = (a === n || b === n) ? 1 : 2;
        if (W.dir === 'A') {
          tw += ((b.uy - a.uy) / span) / CELL; stv += ((b.ux * n.tx + b.uz * n.tz) - (a.ux * n.tx + a.uz * n.tz)) / span / CELL;
        } else {
          tw += -((b.ux * n.tx + b.uz * n.tz) - (a.ux * n.tx + a.uz * n.tz)) / span / CELL; stv += ((b.uy - a.uy) / span) / CELL * -1;
        }
        cnt++;
      }
      n.tw = clamp(cnt ? tw / cnt : 0, -0.55, 0.55); n.st = 1 + clamp((cnt ? stv / cnt : 0) * 0.5, -0.22, 0.22);
      var hostOpen = 0; if (n.host >= 0) {
        var hh = hosts[n.host]; hostOpen = hh.dv * hh.dv; if (st.door === n.host) hostOpen = Math.max(hostOpen, st.inside);
        if (n.host === ghostIdx) hostOpen = forb.open ? forb.k : -forb.flinch * (0.6 + 0.4 * forb.ask / ASK_T);         /* the counter closes on itself */
      }
      n.open = damp(n.open, hostOpen, 3, dt);
    }

    /* 7. the doors */
    for (var hi = 0; hi < hosts.length; hi++) {
      var h = hosts[hi];
      n = h.node;
      hostPos(h, HP);
      var hdx = HP[0] + n.ux - cam.x, hdy = HP[1] + n.uy - cam.y, hdz = HP[2] + n.uz - cam.z, hzc = hdx * cam.fx + hdy * cam.fy + hdz * cam.fz;
      if (hzc > NEAR) {
        var hinv = F / hzc; h.csx = cam.cx + (hdx * cam.rx + hdy * cam.ry + hdz * cam.rz) * hinv; h.csy = cam.cy - (hdx * cam.ux + hdy * cam.uy + hdz * cam.uz) * hinv; h.czc = hzc;
        h.capPx = CAP * hinv;
      } else h.czc = -1;
      var rad = (n.gl.cc ? n.gl.cc[2] : 0.3) * h.capPx;
      var hsg = Math.max(34 * dpr, 0.9 * rad), hddx = h.csx - ax, hddy = h.csy - ay;
      h.a0 = h.czc > 0 ? Math.exp(-(hddx * hddx + hddy * hddy) / (2 * hsg * hsg)) * aS * st.wallA * sm(0.05, 0.6, n.draw) : 0;
      var sel = focusIdx === hi || (hi === ghostIdx && forb.open && !forb.pre);      /* a memory develops only for a door that was chosen (or forced) */
      var rise = sel ? (0.5 + 0.5 * still) * sm(0.85, 1, grow) * (1 - Q) : 0;         /* and only once the wall has been written */
      if (hi === ghostIdx) {
        if (!forb.open) {
          var shy = h.a0 > 0.25 ? 1 : 0;
          forb.flinch = damp(forb.flinch, shy, shy ? 4 : 1.1, dt);
          var asking = h.a0 > 0.3 && (o.press > 0.5 || keyAsk);
          forb.ask = asking ? forb.ask + dt : Math.max(0, forb.ask - dt * 0.6);
          if (forb.ask >= ASK_T) forbid();
          rise *= 1 - forb.flinch;                                        /* it will not develop for someone who only looks */
        } else { forb.flinch = damp(forb.flinch, 0, 3, dt); if (!forb.pre) rise = Math.max(rise, 0.9); }
      }
      /* chosen, it stirs inside its counter; scrolling in is what enlarges it (st.inside), and letting go retracts it */
      var cap = hi === ghostIdx && forb.open && !forb.pre ? 1 : 0.55 + 0.45 * st.inside;
      h.dev = clamp(h.dev + ((sel && h.dev < cap ? rise * 0.5 : 0) - (sel ? 0 : 0.3) - Q * 0.7) * dt, 0, 1);
      if (sel && h.dev > cap) h.dev = Math.max(cap, h.dev - 0.6 * dt);
      if (st.door === h.idx) h.dev = Math.max(h.dev, st.inside);
      M.crit(h.dv, h.dvv, h.dev, 4.6, dt, spr); h.dv = clamp(spr[0], 0, 1); h.dvv = spr[1];       /* what is drawn follows it through a spring: a memory grows and settles, it does not start and stop */
      if (h.dev > 0.8 && !h.seen) { h.seen = true; h.flash = 1; DNA.express('curiosity', 1 / 8); Trace.doorFound(h.idx); }
      var within = st.door === hi && st.inside > 0.6;                 /* going in again, after having gone out, is a return */
      if (within && !h.within) { if (h.entries++ > 0) Trace.doorReturn(); }
      if (!within && st.L < 0.2) h.within = false; else if (within) h.within = true;
      h.flash = Math.max(0, h.flash - dt / 0.9);
    }
    updateSeeker(o, hasHit);
  }

  /* the door gives: the world changes, and the change is kept */
  function forbid() {
    if (forb.open) return;
    forb.open = true; forb.pre = false; forb.k = 0; forb.ask = 0; forb.pulse = 1;
    var h = hosts[ghostIdx]; if (h) { h.flash = 1; h.seen = true; }
    DNA.set('mutation', 1); Trace.opened();
    announce('The door opens. The wall comes apart into its layers.');
    Visit.save(true);
  }

  /* ---------------- the ember: the pen that writes the wall, then the thing that leans toward you ---------------- */
  var lastWritten = null;
  function updateSeeker(o, hasHit) {
    seekerOut.speed = 9; seekerOut.down = false;
    var T = seq.length + 3, idx = Math.floor(grow * T);
    if (grow < 0.995 && grow > 0.001 && idx < seq.length) {
      var wn = seq[clamp(idx, 0, seq.length - 1)];
      seekerOut.mode = 'pen'; seekerOut.speed = 10;
      seekerOut.x = wn.rx + wn.nx * -0.3; seekerOut.y = wn.ry; seekerOut.z = wn.rz + wn.nz * -0.3;
      seekerOut.down = !!(lastWritten && lastWritten !== wn && sharesWord(lastWritten, wn) && Math.abs(lastWritten.c - wn.c) + Math.abs(lastWritten.r - wn.r) === 1);
      lastWritten = wn; seekerOut.life = 4.5;
      return;
    }
    seekerOut.mode = 'follow'; seekerOut.k = 9 / massNow; seekerOut.d = 1.8 * Math.sqrt(seekerOut.k); seekerOut.life = 3.2; lastWritten = null;   /* heavy on a stiff word, eager on a loose one */
    var hint = ext.intuit > 0.5 ? unseenDoor() : -1;
    if (hint >= 0) {                                              /* intuition: it goes to a door that has not been opened, before it is asked to */
      hostPos(hosts[hint], HP); var un = hosts[hint].node;
      seekerOut.x = HP[0] + un.nx * 0.9; seekerOut.y = HP[1] + 0.3; seekerOut.z = HP[2] + un.nz * 0.9;
    } else if (st.door >= 0 && st.inside > 0.3) {
      hostPos(hosts[st.door], HP); var hn = hosts[st.door].node;
      seekerOut.x = HP[0] + hn.nx * 0.9; seekerOut.y = HP[1] + 0.35; seekerOut.z = HP[2] + hn.nz * 0.9;
    } else if (hasHit) {
      seekerOut.x = ptrHit.x - Math.sin(az0) * 0; seekerOut.y = ptrHit.y + 0.15; seekerOut.z = ptrHit.z;
      var ha = Math.atan2(ptrHit.x - CEN[0], -(ptrHit.z - CEN[2]));
      seekerOut.x = ptrHit.x - Math.sin(ha) * 1.4; seekerOut.z = ptrHit.z + Math.cos(ha) * 1.4;
    } else {
      /* with no pointer, it waits at the door nearest your gaze */
      var best = -1, bd = -2, gd = dirFrom(st.yaw, st.pitch);
      for (var hi = 0; hi < hosts.length; hi++) {
        hostPos(hosts[hi], HP);
        var vx = HP[0] - CEN[0], vy = HP[1] - CEN[1], vz = HP[2] - CEN[2], vl = Math.sqrt(vx * vx + vy * vy + vz * vz), dd = (gd[0] * vx + gd[1] * vy + gd[2] * vz) / vl;
        if (dd > bd) { bd = dd; best = hi; }
      }
      if (best >= 0) { hostPos(hosts[best], HP); var bn = hosts[best].node; seekerOut.x = HP[0] + bn.nx * -1.0; seekerOut.y = HP[1] + 0.3; seekerOut.z = HP[2] + bn.nz * -1.0; }
    }
  }
  /* the door (not the one that says not yet) that has been opened least: the nearest one to where you are facing among those still shut */
  function unseenDoor() {
    var best = -1, bd = -2, gd = dirFrom(st.yaw, st.pitch);
    for (var i = 0; i < hosts.length; i++) {
      if (i === ghostIdx || hosts[i].seen) continue;
      hostPos(hosts[i], HP);
      var vx = HP[0] - CEN[0], vy = HP[1] - CEN[1], vz = HP[2] - CEN[2], vl = Math.sqrt(vx * vx + vy * vy + vz * vz), dd = (gd[0] * vx + gd[1] * vy + gd[2] * vz) / vl;
      if (dd > bd) { bd = dd; best = i; }
    }
    return best;
  }
  function sharesWord(a, b) { for (var i = 0; i < a.words.length; i++) if (b.words.indexOf(a.words[i]) >= 0) return true; return false; }

  /* ---------------- emission: the wall and the memories, as light ---------------- */
  function emitNode(n, o, wallA) {
    var vis = n.draw * wallA * o.wallDim * (1 - n.leave);
    if (n.isSpine) vis *= sm(0, 0.085, o.S2);                         /* the name's letters take over from Module 1's ring */
    Letters.emit(n, o.t, vis, CAP);
  }

  var wallDim = 1;
  function emitWall(o) {
    var t = o.t, yawCam = Math.atan2(cam.fx, -cam.fz), wallA = st.wallA, i;
    wallDim = 1 - 0.9 * st.inside;
    o.wallDim = wallDim;
    for (i = 0; i < nodes.length; i++) emitNode(nodes[i], o, wallA);

    /* the grid under the visitor's hand: empty cells show themselves where attention is */
    var ax = o.ptr.present ? o.ptr.x : cam.cx, ay = o.ptr.present ? o.ptr.y : cam.cy, dpr = o.dpr;
    for (var c = DOOR_COL - 16; c <= DOOR_COL + 16; c++) {
      if (Math.abs(wrapPi(az(c) - yawCam)) > 1.25) continue;
      for (var r = ROW0; r <= ROW1; r++) {
        if (grid[key(c, r)]) continue;
        place(c, r);
        var dx = PL.x - cam.x, dy = PL.y - cam.y, dz = PL.z - cam.z, zc = dx * cam.fx + dy * cam.fy + dz * cam.fz;
        if (zc < NEAR * 2) continue;
        var inv = cam.F / zc, sx = cam.cx + (dx * cam.rx + dy * cam.ry + dz * cam.rz) * inv, sy = cam.cy - (dx * cam.ux + dy * cam.uy + dz * cam.uz) * inv;
        if (sx < -80 || sx > cam.W + 80 || sy < -80 || sy > cam.H + 80) continue;
        var ddx = sx - ax, ddy = sy - ay, sg = Math.max(70 * dpr, CAP * inv * 1.1);
        var a = (0.05 + 0.3 * Math.exp(-(ddx * ddx + ddy * ddy) / (2 * sg * sg)) + 0.26 * ext.gridBoost) * wallA * wallDim, s = CELL * 0.09;
        SP.seg(PL.x - PL.tx * s, PL.y, PL.z - PL.tz * s, PL.x + PL.tx * s, PL.y, PL.z + PL.tz * s, a, 0, 0);
        SP.seg(PL.x, PL.y - s, PL.z, PL.x, PL.y + s, PL.z, a, 0, 0);
      }
    }
    /* the gaps between contradictions: a measured absence, in survey grammar (a dimension line
       across the empty cells, terminals at each pole). It shortens as the poles draw together. */
    for (var pi = 0; pi < pairs.length; pi++) {
      var P = pairs[pi];
      if (!P.gap.length || P.a.text === 'CURIOSITY') continue;               /* the vertical gaps only */
      var g0 = P.gap[0], g1 = P.gap[P.gap.length - 1];
      place(g0.c, g0.r); var gx = PL.x, gz = PL.z, ty0 = PL.y, gtx = PL.tx, gtz = PL.tz;
      place(g1.c, g1.r); var by0 = PL.y;
      var ga = (0.16 + 0.55 * P.gapA) * wallA * wallDim * sm(0.5, 1, grow), shrink = P.close * CELL * 0.35;
      var yT = ty0 + CELL * 0.5 - shrink, yB = by0 - CELL * 0.5 + shrink, tl = CELL * 0.17, nseg = 2 * P.gap.length + 3;
      for (var gq = 0; gq < nseg; gq += 2) {
        var u0 = gq / nseg, u1 = (gq + 1) / nseg;
        SP.seg(gx, yT + (yB - yT) * u0, gz, gx, yT + (yB - yT) * u1, gz, ga, 0, 0);
      }
      SP.seg(gx - gtx * tl, yT, gz - gtz * tl, gx + gtx * tl, yT, gz + gtz * tl, ga, 0, 0);
      SP.seg(gx - gtx * tl, yB, gz - gtz * tl, gx + gtx * tl, yB, gz + gtz * tl, ga, 0, 0);
    }
    /* the cell that will not fill: a caret between art and code */
    var art = pairs[2];
    if (art && grow > 0.9) {
      place(art.gap[0].c, art.gap[0].r);
      var blink = 0.16 + 0.84 * sm(-0.2, 0.25, Math.sin(o.t * 4.6));
      SP.seg(PL.x, PL.y - CAP * 0.38, PL.z, PL.x, PL.y + CAP * 0.38, PL.z, 0.62 * blink * wallA * wallDim * (1 - ext.quiet), 1, 1);
    }
  }

  /* memories behind the counters */
  var FR = { ox: 0, oy: 0, oz: 0, tx: 1, ty: 0, tz: 0, ux: 0, uy: 1, uz: 0, nx: 0, ny: 0, nz: -1, sc: 1, cap: CAP, cell: CELL, dev: 0, open: 0, t: 0 };
  var CT = { t: 0, dt: 0, ptr: { has: false, u: 0, v: 0 }, press: false, inside: 0, reduced: false };
  function emitMemories(o) {
    var i;
    for (i = 0; i < hosts.length; i++) {
      var h = hosts[i], n = h.node;
      if (n.draw < 0.5 || st.wallA < 0.02) continue;
      hostPos(h, HP);
      FR.ox = HP[0] + n.ux; FR.oy = HP[1] + n.uy; FR.oz = HP[2] + n.uz;
      /* face the ray from the centre of the wall to this door */
      var rvx = HP[0] - CEN[0], rvy = HP[1] - CEN[1], rvz = HP[2] - CEN[2], rvl = Math.sqrt(rvx * rvx + rvy * rvy + rvz * rvz);
      FR.nx = rvx / rvl; FR.ny = rvy / rvl; FR.nz = rvz / rvl;
      FR.tx = n.tx; FR.ty = 0; FR.tz = n.tz;
      FR.ux = -n.tz * FR.ny; FR.uy = Math.sqrt(Math.max(0, 1 - FR.ny * FR.ny)); FR.uz = n.tx * FR.ny;
      var dev = h.dv;
      FR.sc = CAP * (0.3 + 0.85 * dev * dev); FR.dev = dev; FR.open = n.open; FR.t = o.t;
      /* latent: a glint in the counter says something is here */
      var rad = (n.gl.cc ? n.gl.cc[2] : 0.3) * CAP;
      if (dev < 0.6) {
        var br = 0.5 + 0.5 * Math.sin(o.t * 1.1 + i * 1.7), ga = (0.32 - dev * 0.45) * br * st.wallA * wallDim * (h.mem === 'ghost' ? 0.55 * (1 - 0.85 * forb.flinch) : 1);
        if (ga > 0.01) {
          var gl = rad * 0.3, gs = h.mem === 'ghost' && !SID.env.reduced ? Math.sin(o.t * 31) * rad * 0.06 * forb.flinch : 0;     /* it shudders and withdraws from being looked at */
          var gx = FR.ox + FR.tx * gs, gy = FR.oy, gz = FR.oz + FR.tz * gs;
          SP.seg(gx - FR.tx * gl, gy - FR.ty * gl, gz - FR.tz * gl, gx + FR.tx * gl, gy + FR.ty * gl, gz + FR.tz * gl, ga, 0, 1);
          SP.seg(gx - FR.ux * gl, gy - FR.uy * gl, gz - FR.uz * gl, gx + FR.ux * gl, gy + FR.uy * gl, gz + FR.uz * gl, ga, 0, 1);
        }
      }
      /* a ring closes on the counter the moment it develops */
      if (h.flash > 0.01) SP.ring(FR.ox, FR.oy, FR.oz, FR.tx, FR.ty, FR.tz, FR.ux, FR.uy, FR.uz, rad * (1 + (1 - h.flash) * 1.6), 40, h.flash * 0.9, 1, 1);
      if (dev < 0.03) continue;
      /* pointer in the memory's own coordinates */
      CT.t = o.t; CT.dt = o.dt; CT.press = o.press > 0.5; CT.inside = st.door === i ? st.inside : 0; CT.reduced = SID.env.reduced;
      CT.ptr.has = false;
      if (o.ptr.present || o.ptr.tap) {
        var d0 = (o.ptr.x - cam.cx) / cam.F, d1 = -(o.ptr.y - cam.cy) / cam.F;
        var rdx = cam.fx + cam.rx * d0 + cam.ux * d1, rdy = cam.fy + cam.ry * d0 + cam.uy * d1, rdz = cam.fz + cam.rz * d0 + cam.uz * d1;
        var w0 = FR.sc * 0.5, px0 = FR.ox + FR.nx * w0, py0 = FR.oy + FR.ny * w0, pz0 = FR.oz + FR.nz * w0;
        var den = rdx * FR.nx + rdy * FR.ny + rdz * FR.nz;
        if (Math.abs(den) > 1e-4) {
          var s = ((px0 - cam.x) * FR.nx + (py0 - cam.y) * FR.ny + (pz0 - cam.z) * FR.nz) / den;
          if (s > 0) {
            var hx = cam.x + rdx * s - FR.ox, hy = cam.y + rdy * s - FR.oy, hz = cam.z + rdz * s - FR.oz;
            CT.ptr.has = true;
            CT.ptr.u = (hx * FR.tx + hy * FR.ty + hz * FR.tz) / FR.sc; CT.ptr.v = (hx * FR.ux + hy * FR.uy + hz * FR.uz) / FR.sc;
          }
        }
      }
      h.inst.update(o.dt * (st.door === i ? 0.8 : 1), o.t, CT, FR);
      h.inst.emit(FR, dev * st.wallA, CT);
    }
  }

  /* focus brackets for keyboard users */
  function emitFocus(o) {
    if (focusIdx < 0 || st.wallA < 0.05) return;
    var h = hosts[focusIdx], n = h.node; hostPos(h, HP);
    var s = CELL * 0.55, a = 0.85 * (0.6 + 0.4 * Math.sin(o.t * 3)), cx = HP[0] + n.ux, cy = HP[1] + n.uy, cz = HP[2] + n.uz, l = s * 0.45;
    for (var sx = -1; sx <= 1; sx += 2) for (var sy = -1; sy <= 1; sy += 2) {
      var bx = cx + n.tx * sx * s, by = cy + sy * s, bz = cz + n.tz * sx * s;
      SP.seg(bx, by, bz, bx - n.tx * sx * l, by, bz - n.tz * sx * l, a, 1, 0);
      SP.seg(bx, by, bz, bx, by - sy * l, bz, a, 1, 0);
    }
  }

  function emit(o) {
    if (!built || !st.active || (st.wallA < 0.003 && o.S2 > 0.5)) return;
    o.wallDim = 1;
    emitWall(o);
    emitMemories(o);
    emitFocus(o);
  }

  /* ---------------- interface: focus, keys, taps, inscriptions ---------------- */
  var el = {}, inscShown = '', inscW = 0;
  function setInscription(node, lines) {
    var k = lines.join('|'); if (k === inscShown) return; inscShown = k;
    node.innerHTML = lines.map(function (l) { return l ? '<div>' + G.svg(l, { track: 0.34 }) + '</div>' : ''; }).join('');
    inscW = node.offsetWidth;                                       /* measured when the words change, never per frame */
  }
  var announce = SID.announce, inscOp = '';
  function inscOpacity(v) { if (v !== inscOp) { inscOp = v; el.insc.style.opacity = v; } }       /* (only when it changes) */

  function ui(o) {
    if (!el.insc) return;
    var best = -1, bd = 0.62, shy = false;
    for (var i = 0; i < hosts.length; i++) if (i !== ghostIdx && hosts[i].dv > bd && hosts[i].czc > 0 && D.inscriptions[hosts[i].mem][0]) { bd = hosts[i].dv; best = i; }
    /* the door that refuses answers, in the only words it has, while it is being looked at */
    if (best < 0 && ghostIdx >= 0 && !forb.open && forb.flinch > 0.4 && hosts[ghostIdx].czc > 0) { best = ghostIdx; shy = true; }
    if (best < 0) { inscOpacity('0'); return; }
    var h = hosts[best], ins = D.inscriptions[h.mem];
    setInscription(el.insc, ins);
    var dpr = SID.Render.dpr, x = h.csx / dpr, y = h.csy / dpr, off = h.capPx / dpr * 0.62;
    var maxX = SID.input.w - inscW - (SID.input.w > 640 ? 44 : 34);          /* clear of the edge ruler on a narrow screen */
    el.insc.style.transform = 'translate(' + Math.min(x + off, maxX).toFixed(1) + 'px,' + (y + off * 0.15).toFixed(1) + 'px)';
    inscOpacity((shy ? sm(0.4, 0.85, forb.flinch) * 0.75 : sm(0.62, 0.95, h.dv) * 0.85 * (1 - 0.5 * st.inside)).toFixed(3));
  }

  /* leaving the interior: nothing it said should stay on screen */
  function clear() {
    st.active = false; st.inside = 0; st.L = 0; st.door = -1;          /* arrow keys scroll again; the ground cools */
    grow = 0;                                                           /* the wall is invisible now; next time it sprouts again */
    keyDir.l = keyDir.r = keyDir.u = keyDir.d = 0; focusIdx = -1; keyAsk = false; forb.ask = 0; forb.flinch = 0;
    if (el.insc) inscOpacity('0');
    announce('');
  }

  /* moves the keyboard focus between doors; returns false when it has gone past the last (or before the first),
     so Tab can leave the piece instead of being trapped in it */
  function focusNext(dir) {
    if (!st.active) return false;
    var pos = focusOrder.indexOf(focusIdx);
    pos = pos < 0 ? (dir > 0 ? 0 : focusOrder.length - 1) : pos + dir;
    if (pos < 0 || pos >= focusOrder.length) { choose(-1); announce('Left the doors.'); return false; }
    choose(focusOrder[pos]);                                                        /* Enter must go where the focus is */
    var h = hosts[focusIdx], ins = D.inscriptions[h.mem];
    if (focusIdx === ghostIdx && !forb.open) announce('Door ' + (pos + 1) + ' of ' + focusOrder.length + ': inside the letter ' + h.node.ch + ' of MOTION. It says not yet. Hold Enter to open it anyway, or move on.');
    else announce('Door ' + (pos + 1) + ' of ' + focusOrder.length + ': inside the letter ' + h.node.ch + (ins[0] ? ', a memory: ' + ins[0].toLowerCase() : ', something not yet formed') + '. Press Enter to go in, Escape to step back.');
    return true;
  }
  /* choosing a door (or letting go of the choice); switching while leaning in glides rather than jumps */
  function choose(i) {
    if (i === focusIdx) return;
    focusIdx = i; focusPull = i >= 0 ? 2 : 0;
    if (i >= 0 && doorIdx >= 0 && doorIdx !== i) { doorIdx = -1; switchT = 1.4; }
  }
  function scrollToS2(s2, smooth) {
    var Km = SID.timeline.k, K2 = SID.timeline.k2, se = document.scrollingElement || document.documentElement, max = Math.max(1, se.scrollHeight - window.innerHeight);
    window.scrollTo({ top: (Km + s2 * (K2 - Km)) * max, behavior: smooth && !SID.env.reduced ? 'smooth' : 'auto' });
  }
  function bind() {
    el.insc = document.getElementById('inscr');
    window.addEventListener('keydown', function (e) {
      if (!st.active || e.altKey || e.ctrlKey || e.metaKey) return;
      var k = e.key, ending = ext.E3 > 0.02;                          /* at the edge the keys belong to edge.js */
      if (k === 'ArrowLeft') { keyDir.l = 1; e.preventDefault(); } else if (k === 'ArrowRight') { keyDir.r = 1; e.preventDefault(); }
      else if (k === 'ArrowUp') { keyDir.u = 1; e.preventDefault(); } else if (k === 'ArrowDown') { keyDir.d = 1; e.preventDefault(); }
      else if (ending) return;
      else if (k === 'Tab') { if (focusNext(e.shiftKey ? -1 : 1)) e.preventDefault(); }
      else if (k === 'Enter' && focusIdx >= 0) {
        e.preventDefault();
        if (focusIdx === ghostIdx && !forb.open) keyAsk = true;                                  /* held: asking for what is not yet */
        else if (!e.repeat) { scrollToS2(1, true); announce('Inside. Move the pointer to touch it. Escape to step back.'); }
      }
      else if (k === 'Escape') { e.preventDefault(); if (L > 0.05) scrollToS2(0.3, true); else { focusIdx = -1; announce('Back at the centre.'); } }
    });
    window.addEventListener('keyup', function (e) {
      if (e.key === 'Enter') keyAsk = false;
      if (e.key === 'ArrowLeft') keyDir.l = 0; else if (e.key === 'ArrowRight') keyDir.r = 0; else if (e.key === 'ArrowUp') keyDir.u = 0; else if (e.key === 'ArrowDown') keyDir.d = 0;
    });
    /* A click (or a tap) chooses the letter that holds a memory; scrolling then takes you into that one and only that one.
       A click anywhere else lets go of the choice. A press that is held is something else (asking, at the door that says
       not yet) and does not choose. On a touch screen a tap on empty wall also gives that place your attention. */
    var down = null;
    window.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, t: performance.now(), touch: e.pointerType === 'touch' }; }, { passive: true });
    window.addEventListener('pointerup', function (e) {
      if (!down || !st.active || ext.E3 > 0.02) { down = null; return; }   /* (at the edge a tap belongs to edge.js) */
      var moved = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y), dur = performance.now() - down.t, wasTouch = down.touch; down = null;
      if (moved > 12 || dur > 450) return;
      var dpr = SID.Render.dpr, px = e.clientX * dpr, py = e.clientY * dpr, hit = -1, bd = 60 * dpr;
      hosts.forEach(function (h, i) { if (h.czc > 0) { var d = Math.hypot(h.csx - px, h.csy - py); if (d < bd) { bd = d; hit = i; } } });
      if (hit >= 0) { choose(hit); announce('Chosen. Scroll to go in, or click elsewhere to let go.'); return; }
      if (!wasTouch) { if (focusIdx >= 0) { choose(-1); announce('Let go.'); } return; }
      var ya = st.yaw + Math.atan2((px - cam.cx) / cam.F, 1), pa = st.pitch - Math.atan2((py - cam.cy) / cam.F, 1) * 0.6;
      tapAt = { x: px, y: py, t: 3.2, az: ya, pitch: clamp(pa, -0.7, 0.7), tap: true };
    }, { passive: true });
  }

  SID.Mind = {
    st: st, build: build, bind: bind, control: control, update: update, emit: emit, ui: ui, clear: clear,
    seeker: seekerOut, hosts: hosts, words: words, nodes: nodes, pairs: pairs, ext: ext, forb: forb, forbid: forbid,
    /* (turns the head to a heading and a pitch at once: for tests) */
    lookAt: function (yaw, pitch) { H = yaw; pB = pitch; yawA = yaw; pitA = pitch; yawV = 0; pitV = 0; },
    get wallAz() { return az0; },
    /* where a wall cell is, and which way its letter faces (returned in a shared scratch object) */
    cellPos: function (c, r) { place(c, r); return PL; },
    occupied: function (c, r) { return !!grid[key(c, r)]; },
    az: az,
    get built() { return built; }, get focus() { return focusIdx; },
    get tap() { return !!tapAt; }, get tapX() { return tapAt ? tapAt.x : 0; }, get tapY() { return tapAt ? tapAt.y : 0; },
    CAP: CAP, CELL: CELL, R: R
  };
})();
