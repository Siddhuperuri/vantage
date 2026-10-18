/* ------------------------------------------------------------------
   ledger.js  -  what stands above the wall.

   Scroll in the wall used to do nothing unless a door was chosen. Now, with nothing chosen, it lifts you: the
   camera rises out of the middle of the crossword toward the top of the wall and into the space above it, and
   comes back down before the ending begins (mind.js: `rise`). Up there, level with your eyes, are fifteen rings
   round the room, one for each tool the record names. Each is a circle at the wall's own radius, hairline, and
   almost nothing until it is asked.

   Rest your attention on a concept below and the rings of the tools that concept is made with light up, and the
   name of each tool is written on its ring, directly above the concept it belongs to. A tool used by several
   concepts is one ring with several names on it, so the ring is what connects them: attend to CODE and PYTHON
   and JAVASCRIPT are lit, and so are the places on those rings where AI, TECHNOLOGY, WEB and MOTION also stand.
   The connection was there before you looked; you have only made it visible.

   Concepts the record names no tool for (CURIOSITY, INTUITION, IMAGINATION, SYSTEMS, STRUCTURE... ) have nothing above
   them. That is not a gap: they are frames, not claims. It is the same honesty as the evidence ceilings.

   What has been lit is remembered. On a later visit those rings are faintly there before anything is asked.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID, M = SID.M, G = SID.Glyphs, SP = SID.Sprites, Mind = SID.Mind, Visit = SID.Visit, DNA = SID.DNA;
  var CEN = SID.Cam.CENTER, R = Mind.R, CELL = Mind.CELL, sm = M.smooth, clamp = M.clamp, TAU = M.TAU;

  var ROW0 = -6.6, DROW = 0.58;           /* the first ring, and the gap between rings, in rows of the wall (up is negative) */

  /* tool -> the concepts it is evidence for, as the record has it. A concept's column is where its word is centred on the wall. */
  var TOOLS = [
    ['FIGMA', ['DESIGN', 'STRUCTURE']], ['FRAMER', ['DESIGN', 'MOTION']], ['ILLUSTRATOR', ['ART', 'DESIGN']], ['PHOTOSHOP', ['ART', 'DESIGN']],
    ['CANVA', ['ART']], ['LIGHTROOM', ['CAMERA']],
    ['HTML', ['WEB', 'CODE']], ['CSS', ['WEB', 'CODE']], ['JAVASCRIPT', ['WEB', 'CODE', 'MOTION', 'GAMES', 'EXPERIMENTS', 'TECHNOLOGY']], ['REACT', ['WEB']],
    ['PYTHON', ['AI', 'CODE', 'TECHNOLOGY']], ['JAVA', ['CODE', 'TECHNOLOGY']], ['PYTORCH', ['AI']],
    ['WEBGL', ['3D', 'EXPERIMENTS']], ['GSAP', ['MOTION']]
  ];
  /* nudges (in columns) so that two concepts standing on one ring do not write over each other */
  var NUDGE = { WEB: -1.0, EXPERIMENTS: 1.3, CODE: 1.0, TECHNOLOGY: -0.9, ART: -0.9, DESIGN: 0.6, MOTION: 0.4, AI: -0.2, CAMERA: 0.9, STRUCTURE: -0.6, '3D': -0.4 };

  var rings = [], byConcept = {}, built = false, force = null;
  /* Above the last ring, one more, that says nothing about the work: how the piece itself is made. It is only ever seen by someone who has
     gone up to the top of the room and looked straight up, and stayed. It is true, and it is the constraint the whole piece was made under. */
  var COLO = 'MADE OF HTML CSS AND JAVASCRIPT AND NOTHING ELSE', colo = { on: 0, hold: 0, seen: !!(Visit.rec.tl >> 20 & 1), mem: Visit.mem.tl >> 20 & 1 };
  /* how strongly a concept is being attended (its word's activation); `force` lets a test say so */
  function actOf(mk) { return force && force[mk.c] != null ? force[mk.c] : mk.w.act; }

  function build() {
    var words = {}; Mind.words.forEach(function (w) { words[w.text] = w; });
    TOOLS.forEach(function (t, i) {
      var rg = { name: t[0], row: ROW0 - i * DROW, y: CEN[1] - (ROW0 - i * DROW) * CELL, marks: [], on: 0, mem: (Visit.mem.tl >> i & 1) ? 1 : 0, seen: !!(Visit.rec.tl >> i & 1), hold: 0, i: i };
      t[1].forEach(function (c) {
        var w = words[c]; if (!w) return;
        var col = (w.dir === 'A' ? w.c + (w.text.length - 1) / 2 : w.c) + (NUDGE[c] || 0);
        rg.marks.push({ c: c, col: col, w: w });
        (byConcept[c] = byConcept[c] || []).push(rg);
      });
      rings.push(rg);
    });
    built = true;
  }

  /* how strongly each ring is being asked: the attention on the concepts that use it (and, through it, on the ring's other names) */
  function update(o) {
    if (!built) build();
    var dt = Math.min(o.dt, 1 / 30), i, j, st = Mind.st;
    var reach = sm(0.3, 0.75, st.rise) * 0.6 + 0.4;                    /* asked from the middle of the room it is fainter than from up there */
    for (i = 0; i < rings.length; i++) {
      var rg = rings[i], want = 0;
      for (j = 0; j < rg.marks.length; j++) want = Math.max(want, clamp((actOf(rg.marks[j]) - 0.1) * 3.4, 0, 1));
      rg.on = M.damp(rg.on, want * reach, want > rg.on ? 3.2 : 1.1, dt);
      if (rg.on > 0.45) { rg.hold += dt; if (rg.hold > 1.6 && !rg.seen) { rg.seen = true; Visit.rec.tl = (Visit.rec.tl | 0) | (1 << rg.i); DNA.express('ideas', 0.02); } }
      else rg.hold = Math.max(0, rg.hold - dt * 0.3);
    }
    /* the top: up there, looking up, and still */
    var up = st.rise > 0.7 && st.pitch > 0.75 && o.en.stillT > 0.5;
    colo.on = M.damp(colo.on, up ? 1 : 0, up ? 1.4 : 0.8, dt);
    if (colo.on > 0.6) { colo.hold += dt; if (colo.hold > 2 && !colo.seen) { colo.seen = true; Visit.rec.tl = (Visit.rec.tl | 0) | (1 << 20); SID.announce('At the top of the room, a line: made of HTML, CSS and JavaScript, and nothing else.'); } }
    else colo.hold = Math.max(0, colo.hold - dt * 0.3);
  }
  /* text bent round the ring, letter by letter, centred on an azimuth */
  function ringTextCurve(str, angC, y, h, a) {
    var w = 0, i, gd, x, sn, cs, tx, tz, bx, bz, k, j, p;
    for (i = 0; i < str.length; i++) { gd = G.defs[str[i]] || G.defs[' ']; w += (gd.w + 0.3) * h; }
    x = -w / 2;
    for (i = 0; i < str.length; i++) {
      gd = G.defs[str[i]] || G.defs[' '];
      var ang = angC + (x + gd.w * h / 2) / R; sn = Math.sin(ang); cs = Math.cos(ang); tx = cs; tz = sn; bx = CEN[0] + R * sn; bz = CEN[2] - R * cs;
      for (k = 0; k < gd.s.length; k++) {
        p = gd.s[k];
        for (j = 1; j < p.length; j++) {
          var a0 = (p[j - 1][0] - gd.w / 2) * h, b0 = p[j - 1][1] * h, a1 = (p[j][0] - gd.w / 2) * h, b1 = p[j][1] * h;
          SP.seg(bx + tx * a0, y + b0 - h * 0.5, bz + tz * a0, bx + tx * a1, y + b1 - h * 0.5, bz + tz * a1, a, 0, 0);
        }
      }
      x += (gd.w + 0.3) * h;
    }
  }

  /* micro-type on the ring, standing on the wall's radius and turned to face the middle of the room */
  var TC = {};
  function ringText(str, ang, y, h, a) {
    var s = TC[str] || (TC[str] = G.textStrokes(str, { track: 0.28, ticks: false })), w = s.width * h;
    var sn = Math.sin(ang), cs = Math.cos(ang), tx = cs, tz = sn, bx = CEN[0] + R * sn, bz = CEN[2] - R * cs;
    for (var i = 0; i < s.strokes.length; i++) {
      var p = s.strokes[i];
      for (var j = 1; j < p.length; j++) {
        var a0 = p[j - 1][0] * h - w / 2, b0 = p[j - 1][1] * h, a1 = p[j][0] * h - w / 2, b1 = p[j][1] * h;
        SP.seg(bx + tx * a0, y + b0 - h * 0.5, bz + tz * a0, bx + tx * a1, y + b1 - h * 0.5, bz + tz * a1, a, 0, 0);
      }
    }
  }

  function emit(o) {
    if (!built) return;
    var st = Mind.st, wallA = st.wallA, rise = st.rise;
    if (wallA < 0.02) return;
    /* it exists at the top of the room even before you go up, only more faintly */
    var vis = wallA * (0.3 + 0.7 * sm(0.05, 0.5, rise)) * (1 - Mind.ext.fade);
    if (vis < 0.01) return;
    var az0 = Mind.wallAz, DOOR = 15, ALPHA = TAU / 32, i, j;
    var ca = vis * (0.1 * colo.mem + 0.7 * colo.on);
    if (ca > 0.01) { var cy = CEN[1] - (ROW0 - TOOLS.length * DROW - 0.4) * CELL; SP.ring(CEN[0], cy, CEN[2], 1, 0, 0, 0, 0, 1, R, 120, ca * 0.4, 0, 0); ringTextCurve(COLO, az0, cy, CELL * 0.3, ca); }
    for (i = 0; i < rings.length; i++) {
      var rg = rings[i], on = rg.on, base = 0.05 + 0.1 * rg.mem;
      var a = vis * (base + 0.34 * on);
      if (a > 0.006) SP.ring(CEN[0], rg.y, CEN[2], 1, 0, 0, 0, 0, 1, R, 120, a, 0, 0);
      var la = vis * (0.55 * on + 0.16 * rg.mem);
      if (la < 0.02) continue;
      for (j = 0; j < rg.marks.length; j++) {
        var mk = rg.marks[j], ang = az0 + (mk.col - DOOR) * ALPHA;
        /* the name of the tool is brighter above the concept that is being asked, and quieter above the others that use it.
           TXT: the user found this text too faint to read even while genuinely resting on a word - brightened without
           changing when it appears (still gated by rise/attention/stillness above), only how bright it gets. */
        var mine = clamp((actOf(mk) - 0.1) * 3.4, 0, 1), TXT = 1.8, aa = la * (0.4 + 0.6 * mine) * TXT;
        ringText(rg.name, ang, rg.y, CELL * 0.3, aa);
        SP.seg(CEN[0] + R * Math.sin(ang), rg.y - CELL * 0.26, CEN[2] - R * Math.cos(ang), CEN[0] + R * Math.sin(ang), rg.y - CELL * 0.26 - CELL * 0.7 * mine, CEN[2] - R * Math.cos(ang), aa * 0.9, 0, 0);       /* a short plumb line toward the concept it belongs to */
      }
    }
  }

  SID.Ledger = { update: update, emit: emit, rings: rings, get built() { return built; }, set force(v) { force = v; } };
})();
