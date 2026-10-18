/* ------------------------------------------------------------------
   deep.js  -  the way down.

   The ending is not the end. When the wish is written, and the visitor waits or tries to go on, the floor
   of the room lets go and the page grows: a fourth part of the scroll column, one that has no height
   until this moment. Its progress is not a fraction of the page but a depth, D, in the same units as
   the wall (one row of the crossword is CELL units, so the well is the wall's own grid continued downward).

   Everything in the well obeys the same law as everything above it: stillness resolves, motion
   scatters, attention pulls. The camera stays on the axis. What changes is where it is.

   This file is the shaft itself: the state of the descent, the camera, the surveying rings and grid the
   wall's coordinates continue as, the dust you fall through, the gauge. The strata (strata.js) are
   what is embedded in it.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID, M = SID.M, G = SID.Glyphs, SP = SID.Sprites, Mind = SID.Mind, Visit = SID.Visit, cam = SID.cam;
  var sm = M.smooth, clamp = M.clamp, TAU = M.TAU;
  var CEN = SID.Cam.CENTER, CELL = Mind.CELL, R = Mind.R;

  var LEN = 260;                   /* how deep the well is, in world units (about 175 rows of the wall) */
  /* how much scroll the descent is worth is --m4 in the stylesheet (viewport heights); it is set on #deep only when the floor lets go */
  var FALL = 9;                    /* how far the floor lets you down by itself when it opens */

  var st = {
    unlocked: false,               /* the descent exists (this visit) */
    D: 0, Dv: 0,                   /* smoothed depth, and its speed */
    Dt: 0,                         /* depth the scroll asks for */
    frac: 0,                       /* D / LEN */
    ext: 0,                        /* how much of the new column has been revealed to the ruler (0..1) */
    ruler: 0, active: false, free: 0, arrive: 0, steer: 0, arriveT: 0, endT: 0, final: 0,
    deepest: 0, hint: 0
  };
  /* after the last words, the only light there is: a beam from the eye along the way you point, as wide as a hand held out */
  var lamp = { dx: 0, dy: 0, dz: -1, k: 0 };
  function beam(x, y, z) {                              /* how much of the beam a point is in, 0..1 */
    if (lamp.k < 0.02) return 0;
    var vx = x - cam.x, vy = y - cam.y, vz = z - cam.z, t = vx * lamp.dx + vy * lamp.dy + vz * lamp.dz;
    if (t <= 0.2) return 0;
    var l2 = vx * vx + vy * vy + vz * vz, ang2 = (l2 - t * t) / (t * t);
    return lamp.k * Math.exp(-ang2 / 0.03);
  }
  var deepEl = null, deepH = 1, spr = [0, 0], wishAt = -1, attempt = false, gaugeEl = null;

  /* ---------------- opening ---------------- */
  function open(t) {
    if (st.unlocked) return;
    st.unlocked = true;
    deepEl.style.height = 'var(--m4)';
    SID.remeasure(); deepH = Math.max(1, deepEl.offsetHeight);
    var inp = SID.input;
    /* nothing above depends on where in the finished ending you are standing, so if you were not at its end you are put there */
    if (inp.scrollY < inp.y3 - 2) window.scrollTo(0, inp.y3);
    /* and the floor lets you down by itself, a little: the same scroll the visitor would make, so it can be interrupted, reversed, continued */
    var px = FALL / LEN * deepH;
    window.scrollTo({ top: inp.y3 + px, behavior: SID.env.reduced ? 'auto' : 'smooth' });
    SID.announce('The floor lets go. Scroll on: there is more below.');
  }

  /* the keyboard can ask, too: Enter, held, does what a held pointer does in the well */
  function bindKeys() {
    window.addEventListener('keydown', function (e) { if (e.key === 'Enter' && st.active && SID.Mind.focus < 0) SID.input.kdown = true; });
    window.addEventListener('keyup', function (e) { if (e.key === 'Enter') SID.input.kdown = false; });
  }
  /* the visitor's attempt to go past what looked like the end (a wheel, a finger, a key) */
  function bindAttempt() {
    function atEnd() { var i = SID.input; return i.scrollY >= i.y3 - 3 && i.scrollMax <= i.y3 + 3; }
    window.addEventListener('wheel', function (e) { if (e.deltaY > 0 && atEnd()) attempt = true; }, { passive: true });
    var ty = 0;
    window.addEventListener('touchstart', function (e) { ty = e.touches[0].clientY; }, { passive: true });
    window.addEventListener('touchmove', function (e) { if (ty - e.touches[0].clientY > 14 && atEnd()) attempt = true; }, { passive: true });
    window.addEventListener('keydown', function (e) { if ((e.key === 'PageDown' || e.key === 'End' || e.key === ' ' || e.key === 'ArrowDown') && atEnd()) attempt = true; });
  }

  /* ---------------- per frame: where the scroll has put us ---------------- */
  function pre(o) {
    var inp = o.inp, dt = o.dt;
    st.Dt = st.unlocked ? clamp(inp.dy / deepH, 0, 1) * LEN : 0;
    var w = SID.env.reduced ? 12 : 4.4;
    M.crit(st.D, st.Dv, st.Dt, w, dt, spr); st.D = spr[0]; st.Dv = spr[1];
    if (st.D < 0 || st.D > LEN) { st.D = clamp(st.D, 0, LEN); st.Dv = 0; }
    st.frac = st.D / LEN; st.active = st.D > 0.01;
    st.free = sm(0.3, 3, st.D);
    st.arrive = sm(LEN - 8, LEN - 0.5, st.D);                   /* arriving is reaching the bottom: the last words stand at the height of the eye there, and nowhere else */
    if (st.D > st.deepest) st.deepest = st.D;
    /* the new length is offered to the ruler gradually, so that the pin is seen to start climbing again */
    if (st.unlocked) st.ext = Math.min(1, st.ext + dt / (SID.env.reduced ? 0.6 : 3.2));
  }

  function update(o) {
    var Edge = SID.Edge, t = o.t, dt = o.dt;
    if (!st.unlocked) {
      /* the ending is finished when the wish is written; after that, waiting or trying to go on opens the floor */
      if (Edge.wishDone) {
        if (wishAt < 0) wishAt = t;
        if (attempt || (t - wishAt > 4 && SID.energy.stillT > 3)) open(t);
      } else wishAt = -1;
      attempt = false;
    }
    st.ruler = st.unlocked ? sm(0, 0.6, st.ext) : 0;
    if (st.unlocked && SID.Strata) { if (!SID.Strata.built) SID.Strata.build(); SID.Strata.update(o); }
    if (st.unlocked && SID.Chamber) SID.Chamber.update(o);
    if (st.active) seek(o);
    /* arriving at the bottom, the head is turned once, gently, toward where the last words stand; then it is yours again */
    st.arriveT = st.arrive > 0.9 ? st.arriveT + dt : 0;
    st.steer = st.arrive * 0.9 * (1 - sm(2.5, 6, st.arriveT));
    /* THE FINAL VOID. When the last words have been said, and the visitor has stayed, everything but their own light goes out. */
    st.endT = st.arrive > 0.98 && Edge.R > 0.97 ? st.endT + dt : Math.max(0, st.endT - dt * 2);
    st.final = sm(7, 19, st.endT);
    if (st.unlocked) {
      var rec = Visit.rec, dq = Math.round(clamp(st.frac, 0, 1) * 255);
      if (dq > (rec.cd | 0)) rec.cd = dq;
      if (dq > (rec.dp | 0)) rec.dp = dq;
      if (st.arrive > 0.98 && Edge.R > 0.97 && !rec.ce) rec.ce = 1;
    }
    st.ruler *= 1 - st.final;
    /* the wall has no floor: from the middle of the room, looking down, its rings go on (very faintly) */
    st.hint = Mind.st.wallA * sm(0.9, 1, Mind.st.grow) * (1 - Mind.ext.quiet);
  }

  /* ---------------- the ember: it leads you down, leans toward where you point, and waits at what you attend ---------------- */
  var seekerOut = { mode: 'follow', x: 0, y: 0, z: 0, k: 7, d: 4.8, speed: 9, down: false, life: 3.4, near: 1 };
  function seek(o) {
    var S = SID.Strata, A = S && S.attended, ptr = o.ptr, t = o.t, sway = SID.env.reduced ? 0 : 1;
    seekerOut.mode = 'follow'; seekerOut.k = 7; seekerOut.d = 4.8; seekerOut.down = false; seekerOut.life = 2.1;
    if (A && !A.art.unlit && A.zc > 0) {
      /* it waits in front of the thing you are attending, a little to one side of it */
      seekerOut.x = A.rx + A.tx * A.cap * (A.gl.w * 0.5 + 0.25) - A.nx * 0.5; seekerOut.y = A.ry + A.cap * 0.1; seekerOut.z = A.rz + A.tz * A.cap * (A.gl.w * 0.5 + 0.25) - A.nz * 0.5;
      return;
    }
    var ahead = 4.6;
    if (st.final > 0.02) { seekerOut.k = 7 + 40 * st.final; seekerOut.d = 4.8 + 6 * st.final; }         /* in the void it is yours: it goes where you point, quickly */
    if (ptr.present) {
      var d0 = (ptr.x - cam.cx) / cam.F, d1 = -(ptr.y - cam.cy) / cam.F;
      seekerOut.x = cam.x + (cam.fx + cam.rx * d0 + cam.ux * d1) * ahead; seekerOut.y = cam.y + (cam.fy + cam.ry * d0 + cam.uy * d1) * ahead; seekerOut.z = cam.z + (cam.fz + cam.rz * d0 + cam.uz * d1) * ahead;
    } else {                                                                     /* it leads: a little ahead, a little below, going down */
      seekerOut.x = cam.x + cam.fx * ahead + cam.rx * Math.sin(t * 0.31) * 0.7 * sway; seekerOut.y = cam.y + cam.fy * ahead - 1.1 + Math.sin(t * 0.23) * 0.25 * sway; seekerOut.z = cam.z + cam.fz * ahead + cam.rz * Math.sin(t * 0.31) * 0.7 * sway;
    }
    var bx = cam.fx, by = cam.fy, bz = cam.fz;
    if (ptr.present) { var e0 = (ptr.x - cam.cx) / cam.F, e1 = -(ptr.y - cam.cy) / cam.F; bx += cam.rx * e0 + cam.ux * e1; by += cam.ry * e0 + cam.uy * e1; bz += cam.rz * e0 + cam.uz * e1; }
    var bl = Math.sqrt(bx * bx + by * by + bz * bz) || 1;
    lamp.dx = bx / bl; lamp.dy = by / bl; lamp.dz = bz / bl; lamp.k = st.final;
  }

  /* ---------------- the shaft, as light ---------------- */
  /* Dust: what you fall through. It is placed by hash, not stored (the same dust is where it was when you come back),
     and the visitor is a mass: near your pointer it is pushed away, and pressed on, drawn in. */
  var DUST = 92, LH = 1.5;
  function dust(o) {
    var t = o.t, camY = cam.y, k0 = Math.floor(camY / LH), fade = sm(0.4, 6, st.D) * (1 - sm(LEN - 24, LEN - 4, st.D) * 0.6) * (1 - 0.9 * st.final), k, j;
    var lk = lamp.k;
    var ptr = o.ptr, press = SID.Director.press, hasP = ptr.present, px = 0, py = 0, pz = 0, drift = SID.env.reduced ? 0 : 1;
    if (hasP) { var d0 = (ptr.x - cam.cx) / cam.F, d1 = -(ptr.y - cam.cy) / cam.F; px = cam.x + (cam.fx + cam.rx * d0 + cam.ux * d1) * 6; py = cam.y + (cam.fy + cam.ry * d0 + cam.uy * d1) * 6; pz = cam.z + (cam.fz + cam.rz * d0 + cam.uz * d1) * 6; }
    for (k = k0 - 16; k <= k0 + 16; k++) {
      for (j = 0; j < DUST; j++) {
        var h1 = M.hash(k, j, 1, 77), h2 = M.hash(k, j, 2, 77), h3 = M.hash(k, j, 3, 77), h4 = M.hash(k, j, 4, 77);
        var ang = h1 * TAU + Math.sin(t * 0.03 + h4 * 6) * 0.06 * drift, rad = 1.4 + Math.sqrt(h2) * 8.6, y = (k + h3) * LH, dy = Math.abs(y - camY);
        var a = 0.3 * fade * Math.exp(-dy / 15) * (0.3 + 0.7 * h4);
        if (a < 0.008) continue;
        var x = CEN[0] + Math.sin(ang) * rad, z = CEN[2] - Math.cos(ang) * rad;
        if (hasP) {
          var ex = px - x, ey = py - y, ez = pz - z, d2 = ex * ex + ey * ey + ez * ez;
          if (d2 < 6.5) { var f = Math.exp(-d2 / 2.4) * (press > 0.3 ? 0.55 * press : -0.32); x += ex * f; y += ey * f; z += ez * f; a *= 1 + 0.9 * Math.exp(-d2 / 2.4); }
        }
        if (lk > 0.02) a += 0.9 * beam(x, y, z);
        SP.dot(x, y, z, a, 0.013, 0);
      }
    }
  }

  var NUM = {};
  function numStrokes(str) { return NUM[str] || (NUM[str] = G.textStrokes(str, { track: 0.3, ticks: false })); }

  function emit(o) {
    if (!st.active) { hintRings(o); return; }
    var camY = cam.y, fadeIn = sm(0.4, 6, st.D), row0 = Math.floor((CEN[1] - camY) / CELL);
    var i, c, r, a;
    dust(o);
    if (SID.Strata) SID.Strata.emit(o);
    if (SID.Chamber) SID.Chamber.emit(o);
    var az0 = Mind.wallAz;
    /* the survey rings: the wall's own radius, at every fifth row, going down as far as you can see */
    for (r = Math.max(6, row0 - 9); r <= row0 + 30; r++) {
      var y = CEN[1] - (r - 0.5) * CELL;
      var five = r % 5 === 0, dist = Math.abs(y - camY);
      a = (five ? 0.13 : 0.0) * fadeIn * Math.exp(-dist / 34);
      if (a > 0.008) SP.ring(CEN[0], y, CEN[2], 1, 0, 0, 0, 0, 1, R, 96, a, 0, 0);
      /* the grid the wall continues as: a small cross in every cell, brighter near the eye */
      if (dist < 42) {
        var ga = 0.075 * fadeIn * Math.exp(-dist / 30), s = CELL * 0.085;
        if (ga > 0.008) for (c = 0; c < 32; c++) {
          var ang = az0 + (c - 15) * (TAU / 32), sx = Math.sin(ang), cz = -Math.cos(ang), px = CEN[0] + R * sx, pz = CEN[2] + R * cz;
          SP.seg(px - cz * -s, y, pz - sx * s, px + cz * -s, y, pz + sx * s, ga, 0, 0);
          SP.seg(px, y - s, pz, px, y + s, pz, ga, 0, 0);
        }
      }
      /* and the row number, in the piece's own numerals, where the wall's door column would be */
      if (five && dist < 26) {
        var ns = numStrokes(String(r)), h = CELL * 0.34, na = 0.42 * fadeIn * Math.exp(-dist / 20);
        var ang0 = az0 + 15.5 * (TAU / 32), tx = Math.cos(ang0), tz = Math.sin(ang0), bx = CEN[0] + R * Math.sin(ang0), bz = CEN[2] - R * Math.cos(ang0);
        for (i = 0; i < ns.strokes.length; i++) {
          var pts = ns.strokes[i];
          for (var j = 1; j < pts.length; j++) SP.seg(bx + tx * pts[j - 1][0] * h, y - 0.5 * h + pts[j - 1][1] * h, bz + tz * pts[j - 1][0] * h, bx + tx * pts[j][0] * h, y - 0.5 * h + pts[j][1] * h, bz + tz * pts[j][0] * h, na, 0, 0);
        }
      }
    }
  }

  /* the well, glimpsed from the room: the survey rings go on below the last row of the wall, so faint that it takes looking down to see them */
  function hintRings(o) {
    var a0 = st.hint * 0.045;
    if (a0 < 0.004) return;
    for (var r = 6; r <= 46; r += 1) {
      var a = a0 * (r % 5 === 0 ? 1 : 0.35) * Math.exp(-(r - 5) / 15);
      if (a > 0.003) SP.ring(CEN[0], CEN[1] - (r - 0.5) * CELL, CEN[2], 1, 0, 0, 0, 0, 1, R, 96, a, 0, 0);
    }
  }

  /* ---------------- the gauge and the ruler ---------------- */
  var gaugeShown = '', gaugeOp = '';
  function ui(o) {
    if (!gaugeEl) return;
    if (SID.Strata && st.active) SID.Strata.ui(o);
    var row = st.D > 0.3 ? Math.round(st.D / CELL) : -1;                 /* the row at the level of the eye: the wall's own numbering goes on below its last row, 5 */
    var txt = row >= 0 ? String(row) : '';
    if (txt !== gaugeShown) { gaugeShown = txt; gaugeEl.innerHTML = txt ? G.svg(txt, { track: 0.34 }) : ''; }
    var op = (sm(0.5, 5, st.D) * 0.75 * (1 - st.final)).toFixed(3);
    if (op !== gaugeOp) { gaugeOp = op; gaugeEl.style.opacity = op; }
  }

  function init() {
    deepEl = document.getElementById('deep'); gaugeEl = document.getElementById('gauge');
    bindAttempt(); bindKeys();
  }

  SID.Deep = {
    LEN: LEN, st: st, init: init, pre: pre, update: update, emit: emit, ui: ui, open: open,
    get D() { return st.D; }, get active() { return st.active; }, get unlocked() { return st.unlocked; },
    lamp: lamp, get final() { return st.final; },
    get free() { return st.free; }, get arrive() { return st.arrive; }, get ext() { return st.ext; }, get ruler() { return st.ruler; },
    get frac() { return st.frac; }, get steer() { return st.steer; },
    get camY() { return -st.D; },
    get deepH() { return deepH; },
    beam: beam,
    remeasure: function () { if (deepEl) deepH = Math.max(1, deepEl.offsetHeight); },
    /* (for tests and for the keyboard: scroll to a depth) */
    goto: function (d, smooth) { window.scrollTo({ top: SID.input.y3 + clamp(d, 0, LEN) / LEN * deepH, behavior: smooth ? 'smooth' : 'auto' }); },
    seeker: seekerOut
  };
})();
