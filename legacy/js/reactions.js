/* ------------------------------------------------------------------
   reactions.js  -  what a concept does when you stay with it.

   Resting your attention on a word for a moment resolves its letters. Staying longer, the concept starts to act
   on the room, each in its own way and nothing like another's. None of it is explained; it is what the word would
   do if it were a place instead of a word:

     CURIOSITY     questions appear in the empty cells around it, in ember
     STRUCTURE     the grid the letters stand on shows itself, and the word is measured (its length, in cells)
     SYSTEMS       the springs that hold the wall together are drawn: every letter to its neighbours
     IMAGINATION   its letters lift off the wall, toward you
     ENGINEERING   construction lines run through it: baseline, mid-line, cap height, with tolerances
     CODE          a caret reads it, letter by letter, and each letter it stands on is computed
     3D            its five renderings part in depth
     CAMERA        four brackets close on it and everything else goes out of focus
     MOTION        the word travels: a wave runs along its letters
     WEB           every place two words cross lights up
     AI            it cannot decide what stage it is at: its letters flicker between them
     EXPERIMENTS   the whole wall becomes a little unstable
     INTUITION     the ember goes to a door that has not been opened, without being asked
     IDEAS         a spark leaves it and lands in another word
     GAMES         (see the hunt below)

   Each is `k`, 0..1, how long you have stayed. It rises while attention rests on the word, and falls slowly when you
   leave, so leaving one word for another leaves a little of the first still acting: the reactions overlap, and the
   places where they do are where the room starts to show how its parts are connected.

   THE HUNT. Games are hidden places. Five of the wall's empty cells each hold something small. Nothing marks them.
   Rest on an empty cell for a moment and if there is something in it, it shows itself and is kept. Staying with the
   word GAMES shows, very faintly, where to try. When all five are found they are joined by a route. It is kept.
   This is the treasure-hunt mechanic of one of his works, as a thing you do to a wall.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID, M = SID.M, G = SID.Glyphs, SP = SID.Sprites, Mind = SID.Mind, Visit = SID.Visit, DNA = SID.DNA, cam = SID.cam;
  var sm = M.smooth;
  var CAP = Mind.CAP;

  var rx = {};                    /* word text -> { W, k, t (seconds stayed), box } */
  var force = null, built = false, sparks = { u: 0, from: null, to: null, t: 0 };

  /* ---------------- geometry of a word on the wall ---------------- */
  function boxOf(W) {
    var cells = W.cells, pts = [], i;
    for (i = 0; i < cells.length; i++) { var q = Mind.cellPos(cells[i].c, cells[i].r); pts.push([q.x, q.y, q.z]); }
    var pa = Mind.cellPos(cells[0].c, cells[0].r), tx = pa.tx, tz = pa.tz, nx = pa.nx, nz = pa.nz;
    var f = pts[0], l = pts[pts.length - 1];
    return { x0: f[0], y0: f[1], z0: f[2], x1: l[0], y1: l[1], z1: l[2], cx: (f[0] + l[0]) / 2, cy: (f[1] + l[1]) / 2, cz: (f[2] + l[2]) / 2, tx: tx, tz: tz, nx: nx, nz: nz, len: cells.length, vertical: W.dir === 'D', pts: pts };
  }
  /* the word's own line, offset across by `dist` along the vector `ac`, and run on past both ends by `ext`: the line follows the wall's curve, not the chord */
  function polyPoints(b, ac, dist, ext) {
    var pts = b.pts, n = pts.length, out = [], i;
    var d0x = n > 1 ? pts[0][0] - pts[1][0] : -b.tx, d0y = n > 1 ? pts[0][1] - pts[1][1] : 0, d0z = n > 1 ? pts[0][2] - pts[1][2] : -b.tz, l0 = Math.sqrt(d0x * d0x + d0y * d0y + d0z * d0z) || 1;
    var d1x = n > 1 ? pts[n - 1][0] - pts[n - 2][0] : b.tx, d1y = n > 1 ? pts[n - 1][1] - pts[n - 2][1] : 0, d1z = n > 1 ? pts[n - 1][2] - pts[n - 2][2] : b.tz, l1 = Math.sqrt(d1x * d1x + d1y * d1y + d1z * d1z) || 1;
    out.push([pts[0][0] + d0x / l0 * ext + ac[0] * dist, pts[0][1] + d0y / l0 * ext + ac[1] * dist, pts[0][2] + d0z / l0 * ext + ac[2] * dist]);
    for (i = 0; i < n; i++) out.push([pts[i][0] + ac[0] * dist, pts[i][1] + ac[1] * dist, pts[i][2] + ac[2] * dist]);
    out.push([pts[n - 1][0] + d1x / l1 * ext + ac[0] * dist, pts[n - 1][1] + d1y / l1 * ext + ac[1] * dist, pts[n - 1][2] + d1z / l1 * ext + ac[2] * dist]);
    return out;
  }
  var PT3 = [0, 0, 0];
  function polyAt(P, cum, s) {                                  /* the point at arc length s along a polyline */
    var j = 1; while (j < P.length - 1 && cum[j] < s) j++;
    var u = (s - cum[j - 1]) / ((cum[j] - cum[j - 1]) || 1); u = u < 0 ? 0 : u > 1 ? 1 : u;
    PT3[0] = P[j - 1][0] + (P[j][0] - P[j - 1][0]) * u; PT3[1] = P[j - 1][1] + (P[j][1] - P[j - 1][1]) * u; PT3[2] = P[j - 1][2] + (P[j][2] - P[j - 1][2]) * u;
    return PT3;
  }
  /* draws the stretch of a polyline between fractions u0 and u1 of its length: solid (dash = 0) or as dashes of that length */
  function lineRange(P, u0, u1, a, dash, col) {
    var cum = [0], i, L = 0;
    for (i = 1; i < P.length; i++) { L += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1], P[i][2] - P[i - 1][2]); cum.push(L); }
    var s0 = u0 * L, s1 = u1 * L, step = dash > 0 ? dash * 2 : 0, pa, x, y, z;
    if (!dash) {                                              /* along the polyline's own vertices */
      var prev = polyAt(P, cum, s0); x = prev[0]; y = prev[1]; z = prev[2];
      for (i = 1; i < P.length; i++) if (cum[i] > s0 && cum[i] < s1) { SP.seg(x, y, z, P[i][0], P[i][1], P[i][2], a, 0, col || 0); x = P[i][0]; y = P[i][1]; z = P[i][2]; }
      pa = polyAt(P, cum, s1); SP.seg(x, y, z, pa[0], pa[1], pa[2], a, 0, col || 0);
      return;
    }
    for (var s = s0; s < s1; s += step) {
      var p = polyAt(P, cum, s); x = p[0]; y = p[1]; z = p[2];
      var q = polyAt(P, cum, Math.min(s1, s + dash));
      SP.seg(x, y, z, q[0], q[1], q[2], a, 0, col || 0);
    }
  }
  var TC = {};
  function typ(str, cx, cy, cz, tx, tz, h, a, col) {                       /* micro-type on the wall's plane, centred, facing the room */
    var s = TC[str] || (TC[str] = G.textStrokes(str, { track: 0.28, ticks: false })), w = s.width * h;
    for (var i = 0; i < s.strokes.length; i++) {
      var p = s.strokes[i];
      for (var j = 1; j < p.length; j++) {
        var a0 = p[j - 1][0] * h - w / 2, b0 = p[j - 1][1] * h, a1 = p[j][0] * h - w / 2, b1 = p[j][1] * h;
        SP.seg(cx + tx * a0, cy + b0 - h * 0.5, cz + tz * a0, cx + tx * a1, cy + b1 - h * 0.5, cz + tz * a1, a, 0, col || 0);
      }
    }
  }

  function build() {
    Mind.words.forEach(function (W) { rx[W.text] = { W: W, k: 0, t: 0, box: null, total: 0 }; });
    Mind.nodes.forEach(function (n) { n.rj = 0; });
    /* an earlier visit's attention comes back as letters that begin a little more resolved (and it is not more than a little) */
    Mind.words.forEach(function (W, i) {
      var m = Visit.mem.wa[i] || 0;
      if (m > 0.02) W.cells.forEach(function (n) { n.rho = Math.min(n.ceil, n.rho + 0.18 * m); });
    });
    buildHunt();
    built = true;
  }

  /* ---------------- the reactions ---------------- */
  function reactWord(R, o, k) {
    var W = R.W, id = W.text, t = o.t, rm = SID.env.reduced ? 0.4 : 1, i, n, b = R.box, cells = W.cells, len = cells.length;
    if (id === 'CURIOSITY') {
      var cnt = 0;
      for (i = 0; i < len && cnt < 10; i++) {
        var c0 = cells[i].c, r0 = cells[i].r;
        for (var d = 0; d < 4 && cnt < 10; d++) {
          var h = M.hash(c0 * 7 + d, r0 * 5 + i, 13, 99), dc = ((h * 5) | 0) - 2, dr = ((M.hash(c0, r0 + d, 17, 99) * 5) | 0) - 2;
          if ((dc === 0 && dr === 0) || Mind.occupied(c0 + dc, r0 + dr) || Math.abs(r0 + dr) > 5) continue;
          var p = Mind.cellPos(c0 + dc, r0 + dr);
          var a = k * 0.85 * (0.45 + 0.55 * Math.sin(t * 1.3 + h * 9)) * sm(0, 0.5, M.hash(i, d, 3, 5) + k);
          typ('?', p.x, p.y, p.z, p.tx, p.tz, CAP * 0.55, a, 1); cnt++;
        }
      }
    } else if (id === 'STRUCTURE') {
      Mind.ext.gridBoost = Math.max(Mind.ext.gridBoost, k);
      /* the word, measured: a dimension line beside it, following it, and in its gap the number of cells it spans */
      var acS = b.vertical ? [b.tx, 0, b.tz] : [0, 1, 0], P = polyPoints(b, acS, CAP * 1.0, CAP * 0.5), g = 0.1, a2 = k * 0.7, tk = CAP * 0.14;
      lineRange(P, 0, 0.5 - g, a2, 0); lineRange(P, 0.5 + g, 1, a2, 0);
      var e0 = P[0], e1 = P[P.length - 1], mp;
      if (b.vertical) { SP.seg(e0[0] - b.tx * tk, e0[1], e0[2] - b.tz * tk, e0[0] + b.tx * tk, e0[1], e0[2] + b.tz * tk, a2, 0, 0); SP.seg(e1[0] - b.tx * tk, e1[1], e1[2] - b.tz * tk, e1[0] + b.tx * tk, e1[1], e1[2] + b.tz * tk, a2, 0, 0); }
      else { SP.seg(e0[0], e0[1] - tk, e0[2], e0[0], e0[1] + tk, e0[2], a2, 0, 0); SP.seg(e1[0], e1[1] - tk, e1[2], e1[0], e1[1] + tk, e1[2], a2, 0, 0); }
      mp = P[(P.length / 2) | 0]; typ(String(len), (P.length % 2 ? mp[0] : (mp[0] + P[P.length / 2 - 1][0]) / 2), (P.length % 2 ? mp[1] : (mp[1] + P[P.length / 2 - 1][1]) / 2), (P.length % 2 ? mp[2] : (mp[2] + P[P.length / 2 - 1][2]) / 2), b.tx, b.tz, CAP * 0.36, k * 0.95, 0);
    } else if (id === 'SYSTEMS') {
      var ns = Mind.nodes, a3 = k * 0.34, nn, mm, j;
      for (i = 0; i < ns.length; i++) {
        nn = ns[i]; if (nn.draw < 0.5) continue;
        for (j = 0; j < nn.nb.length; j++) {
          mm = nn.nb[j]; if (mm.c < nn.c || (mm.c === nn.c && mm.r < nn.r)) continue;
          SP.seg(nn.rx + nn.ux, nn.ry + nn.uy, nn.rz + nn.uz, mm.rx + mm.ux, mm.ry + mm.uy, mm.rz + mm.uz, a3, 0, 0);
        }
      }
    } else if (id === 'IMAGINATION') {
      for (i = 0; i < len; i++) { n = cells[i]; var w = 0.5 + 0.5 * Math.sin(t * 0.8 + i * 0.7); n.oy += k * rm * (0.35 + 0.25 * w); n.ox -= n.nx * k * rm * 0.4; n.oz -= n.nz * k * rm * 0.4; }
    } else if (id === 'ENGINEERING' || id === 'TECHNOLOGY') {
      /* construction: baseline, mid-line and cap height run through the word, following it, and past both ends, with a tick where they stop */
      var a4 = k * (id === 'ENGINEERING' ? 0.5 : 0.28), half = CAP * 0.5, acE = b.vertical ? [b.tx, 0, b.tz] : [0, 1, 0], lo = [-half, 0, half], tt = CAP * 0.12;
      for (i = 0; i < 3; i++) {
        var PE = polyPoints(b, acE, lo[i], CAP * 0.9);
        lineRange(PE, 0, 1, a4 * (i === 1 ? 0.5 : 1), CAP * 0.3);
        if (i !== 1) for (var en = 0; en < 2; en++) { var pe = PE[en ? PE.length - 1 : 0]; SP.seg(pe[0] - acE[0] * tt, pe[1] - acE[1] * tt, pe[2] - acE[2] * tt, pe[0] + acE[0] * tt, pe[1] + acE[1] * tt, pe[2] + acE[2] * tt, a4, 0, 0); }
      }
    } else if (id === 'CODE') {
      var at = Math.floor((t * 1.5) % len), blink = 0.25 + 0.75 * sm(-0.1, 0.2, Math.sin(t * 7)), c = cells[at];
      c.rho = Math.max(c.rho, Math.min(c.ceil, 0.16 + 0.5 * k));                     /* the letter the caret is on is computed */
      var cw = c.gl ? c.gl.w : 0.7, pc = Mind.cellPos(c.c, c.r);
      var cxw = pc.x + c.ux, cyw = pc.y + c.uy, czw = pc.z + c.uz, lx = -cw * 0.5 * CAP - CAP * 0.1;
      SP.seg(cxw + pc.tx * lx, cyw - CAP * 0.5, czw + pc.tz * lx, cxw + pc.tx * lx, cyw + CAP * 0.5, czw + pc.tz * lx, k * 0.9 * blink, 1, 0);
    } else if (id === '3D') {
      for (i = 0; i < len; i++) cells[i].rsep = Math.max(cells[i].rsep || 0, 0.62 * k);
    } else if (id === 'CAMERA') {
      var pad = CAP * (0.55 + 1.6 * (1 - k)), bl = CAP * 0.55, a5 = k * 0.75, tx3 = b.tx, tz3 = b.tz;
      var hx = b.vertical ? CAP * 0.6 : (Math.hypot(b.x1 - b.x0, b.z1 - b.z0) / 2 + CAP * 0.6), hy = b.vertical ? Math.abs(b.y1 - b.y0) / 2 + CAP * 0.6 : CAP * 0.6;
      hx += pad - CAP * 0.55; hy += pad - CAP * 0.55;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (cn) {
        var px = b.cx + tx3 * hx * cn[0], pz = b.cz + tz3 * hx * cn[0], py = b.cy + hy * cn[1];
        SP.seg(px, py, pz, px - tx3 * bl * cn[0], py, pz - tz3 * bl * cn[0], a5, 0, 0);
        SP.seg(px, py, pz, px, py - bl * cn[1], pz, a5, 0, 0);
      });
      /* what is not being looked at goes out of focus */
      Mind.nodes.forEach(function (nd) { if (cells.indexOf(nd) < 0) nd.dim = Math.max(nd.dim, 0.5 * k); });
    } else if (id === 'MOTION') {
      for (i = 0; i < len; i++) { n = cells[i]; var ph = t * 2.6 - i * 0.95; n.ox += n.tx * 0.32 * k * rm * Math.sin(ph); n.oz += n.tz * 0.32 * k * rm * Math.sin(ph); n.oy += 0.16 * k * rm * Math.cos(ph); }
    } else if (id === 'WEB') {
      var nodes = Mind.nodes;
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i]; if (n.words.length < 2 || n.draw < 0.5) continue;
        var pu = 0.5 + 0.5 * Math.sin(t * 2 + n.seed * 30);
        SP.ring(n.rx + n.ux, n.ry + n.uy, n.rz + n.uz, n.tx, 0, n.tz, 0, 1, 0, CAP * (0.62 + 0.08 * pu), 20, k * (0.3 + 0.35 * pu), 0, 0);
      }
    } else if (id === 'AI') {
      for (i = 0; i < len; i++) { n = cells[i]; n.rj = k * rm * 0.34 * M.noise(i * 1.7, t * 0.9, 3, 21); }
    } else if (id === 'EXPERIMENTS') {
      Mind.ext.instab = Math.max(Mind.ext.instab, k);
    } else if (id === 'INTUITION') {
      Mind.ext.intuit = Math.max(Mind.ext.intuit, k);
    } else if (id === 'IDEAS') {
      /* a spark leaves it, crosses the room, and lands in another word */
      if (!sparks.to || sparks.u >= 1) {
        var others = Mind.words.filter(function (w) { return w.text !== 'IDEAS' && w.text !== 'SIDDHARTHA'; });
        sparks.from = W; sparks.to = others[(M.hash(Math.floor(t / 3.2), 3, 4, 8) * others.length) | 0]; sparks.u = 0;
      }
      sparks.u = Math.min(1, sparks.u + o.dt / 2.6);
    }
  }

  /* the spark, drawn while IDEAS is being stayed with */
  function emitSpark(k, o) {
    if (!sparks.to || k < 0.05) return;
    var A = rx.IDEAS.box, B = boxOf(sparks.to), u = sparks.u, e = u * u * (3 - 2 * u);
    for (var s = 0; s < 6; s++) {
      var uu = Math.max(0, e - s * 0.03), a = k * (0.9 - s * 0.14) * Math.sin(Math.PI * Math.min(1, u * 1.15));
      var x = A.cx + (B.cx - A.cx) * uu, z = A.cz + (B.cz - A.cz) * uu, y = A.cy + (B.cy - A.cy) * uu - Math.sin(Math.PI * uu) * CAP * 1.6 + 0;
      SP.dot(x, y, z, a, 0.05 - s * 0.006, 1);
    }
    if (u > 0.92) SP.ring(B.cx, B.cy, B.cz, B.tx, 0, B.tz, 0, 1, 0, CAP * (0.4 + (u - 0.92) * 9), 24, k * 0.5 * (1 - (u - 0.92) / 0.08), 0, 1);
  }

  /* ---------------- the hunt ---------------- */
  var tokens = [], huntDone = false;
  function buildHunt() {
    /* five empty cells, chosen once and for good from a fixed seed: the same five in every visit and on every screen */
    var r = M.rng(90071), tries = 0, pick = [];
    while (pick.length < 5 && tries++ < 400) {
      var c = 1 + ((r() * 30) | 0), rw = -4 + ((r() * 9) | 0), ok = !Mind.occupied(c, rw) && !Mind.occupied(c + 1, rw) && !Mind.occupied(c - 1, rw);
      for (var i = 0; ok && i < pick.length; i++) if (Math.hypot(pick[i][0] - c, pick[i][1] - rw) < 5) ok = false;
      if (ok) pick.push([c, rw]);
    }
    tokens = pick.map(function (q, i) { return { c: q[0], r: q[1], found: !!(Visit.rec.hn >> i & 1), hold: 0, flash: 0, sx: 0, sy: 0, zc: -1, glint: 0 }; });
    huntDone = tokens.length === 5 && tokens.every(function (t) { return t.found; });
  }
  function updateHunt(o, gamesK, quiet) {
    var dt = Math.min(o.dt, 1 / 30), still = 0.22 + 0.78 * sm(0.05, 0.8, o.en.stillT), dpr = o.dpr, ax = cam.cx, ay = cam.cy, aS = 0.7;
    if (o.ptr.present) { ax = o.ptr.x; ay = o.ptr.y; aS = 1; }
    for (var i = 0; i < tokens.length; i++) {
      var tk = tokens[i], p = Mind.cellPos(tk.c, tk.r), dx = p.x - cam.x, dy = p.y - cam.y, dz = p.z - cam.z, zc = dx * cam.fx + dy * cam.fy + dz * cam.fz;
      tk.px = p.x; tk.py = p.y; tk.pz = p.z; tk.tx = p.tx; tk.tz = p.tz;
      if (zc < 0.3) { tk.zc = -1; continue; }
      var inv = cam.F / zc; tk.sx = cam.cx + (dx * cam.rx + dy * cam.ry + dz * cam.rz) * inv; tk.sy = cam.cy - (dx * cam.ux + dy * cam.uy + dz * cam.uz) * inv; tk.zc = zc;
      tk.glint = gamesK;                                      /* staying with GAMES makes the places to try glint, very faintly */
      if (tk.found) { tk.flash = Math.max(0, tk.flash - dt / 1.4); continue; }
      var sg = Math.max(40 * dpr, 0.75 * CAP * inv), ex = tk.sx - ax, ey = tk.sy - ay, a = Math.exp(-(ex * ex + ey * ey) / (2 * sg * sg)) * aS * (1 - quiet);
      tk.a = a;
      if (a > 0.55 && o.en.stillT > 0.4) tk.hold += dt * still; else tk.hold = Math.max(0, tk.hold - dt * 0.7);
      if (tk.hold > 1.3) {
        tk.found = true; tk.flash = 1; Visit.rec.hn = (Visit.rec.hn | 0) | (1 << i);
        DNA.express('curiosity', 0.035);
        var got = tokens.filter(function (q) { return q.found; }).length;
        if (got === 5 && !huntDone) { huntDone = true; DNA.express('curiosity', 0.15); SID.announce('The fifth. They are joined by a route.'); }
        else SID.announce('Something was in the empty cell. ' + got + ' of 5.');
      }
    }
  }
  function emitHunt(o, quiet) {
    var t = o.t, i, tk;
    for (i = 0; i < tokens.length; i++) {
      tk = tokens[i]; if (tk.zc < 0) continue;
      var a;
      if (tk.found) a = 0.75 - 0.25 * (1 - tk.flash); else a = Math.max(tk.glint * 0.22 * (0.5 + 0.5 * Math.sin(t * 1.7 + i)), tk.hold > 0 ? tk.hold / 1.3 * 0.7 : 0);
      a *= 1 - quiet;
      if (a < 0.01) continue;
      var s = CAP * (tk.found ? 0.2 : 0.14) * (1 + 0.6 * tk.flash);
      /* a small diamond, in ember: the piece's colour for the one thing that is curious */
      SP.seg(tk.px, tk.py + s, tk.pz, tk.px + tk.tx * s, tk.py, tk.pz + tk.tz * s, a, 0, 1); SP.seg(tk.px + tk.tx * s, tk.py, tk.pz + tk.tz * s, tk.px, tk.py - s, tk.pz, a, 0, 1);
      SP.seg(tk.px, tk.py - s, tk.pz, tk.px - tk.tx * s, tk.py, tk.pz - tk.tz * s, a, 0, 1); SP.seg(tk.px - tk.tx * s, tk.py, tk.pz - tk.tz * s, tk.px, tk.py + s, tk.pz, a, 0, 1);
      if (tk.flash > 0.02) SP.ring(tk.px, tk.py, tk.pz, tk.tx, 0, tk.tz, 0, 1, 0, CAP * (0.3 + (1 - tk.flash) * 1.1), 26, tk.flash * 0.8, 0, 1);
    }
    if (huntDone) {                                       /* joined: a route through the five, in the order that the route is shortest */
      var order = [0], used = { 0: 1 }, cur = 0;
      while (order.length < tokens.length) {
        var bd = 1e9, bi = -1;
        for (i = 0; i < tokens.length; i++) if (!used[i]) { var d = Math.hypot(tokens[i].c - tokens[cur].c, tokens[i].r - tokens[cur].r); if (d < bd) { bd = d; bi = i; } }
        used[bi] = 1; order.push(bi); cur = bi;
      }
      for (i = 1; i < order.length; i++) {
        var A = tokens[order[i - 1]], B = tokens[order[i]], nseg = 16;
        if (Math.abs(M.wrapPi(Mind.az(A.c) - Mind.az(B.c))) > 3) continue;
        for (var q = 0; q < nseg; q += 2) SP.seg(A.px + (B.px - A.px) * q / nseg, A.py + (B.py - A.py) * q / nseg, A.pz + (B.pz - A.pz) * q / nseg, A.px + (B.px - A.px) * (q + 1) / nseg, A.py + (B.py - A.py) * (q + 1) / nseg, A.pz + (B.pz - A.pz) * (q + 1) / nseg, 0.42 * (1 - quiet), 0, 1);
      }
    }
  }

  /* ---------------- the frame's step ---------------- */
  function update(o) {
    if (!Mind.built) return;
    if (!built) build();
    var st = Mind.st, ext = Mind.ext, dt = Math.min(o.dt, 1 / 30), quiet = ext.quiet, i, n;
    var live = st.wallA > 0.05 && st.grow > 0.9;
    /* what the reactions set is set afresh every frame */
    var nodes = Mind.nodes;
    for (i = 0; i < nodes.length; i++) { n = nodes[i]; n.ox = 0; n.oy = 0; n.oz = 0; n.dim = 0; n.rsep = 0; n.rj = 0; }
    ext.gridBoost = 0; ext.instab = 0;
    /* a visitor who has been still for a long time is answered the way INTUITION would: the ember goes to a door that has not been opened */
    ext.intuit = live && !st.inside && ext.E3 <= 0.02 ? sm(14, 22, o.en.stillT) : 0;
    var gamesK = 0;
    for (var id in rx) {
      var R = rx[id], W = R.W, att = W.act;
      /* stay with it: attention rests on the word (not just passes over it) */
      var on = live && att > 0.24 && o.en.stillT > 0.35 && !st.inside;
      if (on) R.t += dt; else R.t = Math.max(0, R.t - dt * 0.45);
      var target = sm(1.2, 3.4, R.t) * (1 - quiet);
      R.k += (target - R.k) * (1 - Math.exp(-(target > R.k ? 2.2 : 0.7) * dt));
      if (force && force[id] != null) R.k = force[id];
      if (R.k > 0.004 && id !== 'GAMES') {
        if (!R.box || R.boxAz !== Mind.wallAz) { R.box = boxOf(W); R.boxAz = Mind.wallAz; }         /* (a word does not move: measured once, again only if the wall is turned) */
        reactWord(R, o, R.k);
      }
      if (id === 'GAMES') gamesK = R.k;
      R.total += on ? dt : 0;
    }
    if (live) updateHunt(o, gamesK, quiet);
    Visit.rec.wa = Visit.rec.wa || [];
    /* how long each word has been stayed with, for a later visit (bounded, and a number per word) */
    for (i = 0; i < Mind.words.length; i++) { var v = Math.min(255, Math.round(rx[Mind.words[i].text].total / 30 * 255)); if (v > (Visit.rec.wa[i] | 0)) Visit.rec.wa[i] = v; }
  }
  function emit(o) {
    if (!built || Mind.st.wallA < 0.05) return;
    var quiet = Mind.ext.quiet;
    if (rx.IDEAS && rx.IDEAS.k > 0.05) emitSpark(rx.IDEAS.k, o);
    emitHunt(o, quiet);
  }

  SID.Reactions = { set force(v) { force = v; }, update: update, emit: emit, rx: rx, get tokens() { return tokens; }, get built() { return built; }, get huntDone() { return huntDone; } };
})();
