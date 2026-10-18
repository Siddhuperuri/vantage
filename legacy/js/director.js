/* ------------------------------------------------------------------
   director.js  -  pacing.

   UNKNOWN -> DISCOVERY -> IDENTITY -> CURIOSITY -> IMMERSION
   The director turns scroll progress, time and the visitor's energy
   into the parameters of the world, and decides when the piece speaks.
   It is deliberately quiet: five hairline layers, one ember, a handful
   of whispers set in the piece's own strokes.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID, M = SID.M, Cam = SID.Cam, D0 = Cam.D0;

  var ACTS = [
    { name: 'unknown', from: 0.0 },
    { name: 'discovery', from: 0.10 },
    { name: 'identity', from: 0.335 },
    { name: 'curiosity', from: 0.47 },
    { name: 'immersion', from: 0.84 }
  ];
  function actAt(S) { var a = 0; for (var i = 0; i < ACTS.length; i++) if (S >= ACTS[i].from) a = i; return a; }

  /* the dials: each layer starts turned away from the others by its own angle */
  /* the layers start turned away from each other, by an amount that is different every visit: the same world, another state */
  var Visit = SID.Visit;
  var DIAL = [-0.74, 0.46, -0.31, 0.83, -0.57].map(function (a, i) { return a * (1 + (Visit.r('dial' + i) - 0.5) * 0.36); });
  var DIAL_DRIFT = [0.21, -0.17, 0.26, -0.13, 0.19];
  var DIAL_PH = DIAL.map(function (a, i) { return Visit.r('dph' + i) * 6.283; });

  var VERBS = ['MEASURES', 'ARRANGES', 'COMPUTES', 'INFERS', 'SKETCHES'];
  var el = {}, shown = {};
  function $(id) { return document.getElementById(id); }
  function setText(key, node, str) {
    if (shown[key] === str) return;
    shown[key] = str;
    node.innerHTML = str ? SID.Glyphs.svg(str, { track: 0.34 }) : '';
  }
  var visShown = {};
  function setVis(node, v) {
    var s = v < 0.004 ? '0' : v.toFixed(3);
    if (visShown[node.id] !== s) { visShown[node.id] = s; node.style.opacity = s; }
  }

  var state = {
    lockHold: 0, igniteT: -1, ignited: false, failT: 0, hintShown: false, act: 0,
    capA: 0, verbA: 0, verbTxt: '', hintA: 0, threadA: 0, asksA: 0,
    gaze: { yaw: 0, pitch: 0 }, yT: 0, pT: 0, press: 0, retA: 0, glow: 0,
    ring: [-1.1, -0.55, 0, 0.55, 1.1].map(function (a) { return { theta: a }; })
  };
  var RING_DRIFT = [0.09, -0.07, 0.12, -0.10, 0.06];
  var wrapPi = M.wrapPi;
  var fsOut = { c: { rot: [0, 0, 0, 0, 0], ringRot: [0, 0, 0, 0, 0], jit: { field: 1, trace: 1 }, center: SID.Cam.CENTER }, layerAlpha: [0, 0, 0, 0, 0], bracketRect: null, look: state.gaze };

  SID.Director = {
    look: state.gaze,
    press: 0,
    /* the interior fixes its wall to where the design ring was facing, and hands the gaze back on the way out */
    wallAz: function () { return state.ring[1].theta; },
    syncGaze: function (yaw, pitch) { state.gaze.yaw = yaw; state.gaze.pitch = pitch; state.yT = yaw; state.pT = pitch; },
    init: function () {
      el.capL = $('cap-l'); el.verb = $('verb'); el.whisper = $('whisper');
      el.pin = $('ruler-pin'); el.thread = $('thread'); el.asks = $('asks');
    },

    update: function (o) {
      var S = o.S, t = o.t, dt = o.dt, cam = o.cam, en = SID.energy, inp = SID.input, dpr = o.dpr, world = o.world;
      var fs = fsOut, c = fs.c;
      var act = actAt(S);
      if (act !== state.act) { state.act = act; document.body.setAttribute('data-act', ACTS[act].name); }

      /* ---------- the piece fades up out of nothing (never a loading screen) ---------- */
      var lockRise = SID.env.reduced ? 1.4 : Visit.returning ? 1.35 : 1;      /* a returning visitor is recognised: the piece arrives a little sooner */
      /* ...and gives way, layer by layer, to the interior as the letters of the name take over */
      var m1A = 1 - M.smooth(0.0, 0.085, o.S2 || 0);
      for (var li = 0; li < 5; li++) {
        var intro = M.smooth(0.9 + li * 0.75, 5.2 + li * 0.75, t * lockRise);
        fs.layerAlpha[li] = intro * m1A;
      }
      fs.inside = o.inside || 0;

      /* ---------- dials: layers rotate into agreement as we approach ---------- */
      var mis = 1 - M.smoother(0.04, 0.315, S);
      for (li = 0; li < 5; li++) {
        c.rot[li] = SID.env.reduced ? DIAL[li] * mis : (DIAL[li] + Math.sin(t * DIAL_DRIFT[li] + li + DIAL_PH[li]) * 0.18) * mis;
      }

      /* ---------- the visitor's mass ---------- */
      c.present = inp.present && (!SID.env.coarse || inp.down);
      c.px = inp.px * dpr; c.py = inp.py * dpr;
      /* pressing is asking: hold, and the world leans harder toward you */
      var pushed = inp.down || inp.kdown;
      state.press = M.damp(state.press, pushed ? 1 : 0, pushed ? 5 : 2.2, dt);
      SID.Director.press = state.press;
      c.radius = 170 * dpr * (1 + 0.6 * state.press);
      c.g = M.lerp(0.5, 2.6, M.smooth(0.46, 0.62, S)) * (1 + 2.2 * state.press) * (SID.env.reduced ? 0.4 : 1);
      c.E = SID.env.reduced ? en.E * 0.4 : en.E;
      c.jit.field = (1 - cam.lock * 0.97) * (1 + en.E * 0.5);
      c.jit.trace = 1 - cam.lock * 0.6;
      c.wind = M.clamp(o.fwdVel * 0.45, -9, 9) * (SID.env.reduced ? 0.3 : 1);   /* the wake of travelling */

      /* ---------- immersion: the name wraps around whoever stands at the centre ---------- */
      c.morph = M.smoother(0.845, 0.955, S);
      var gate = M.smooth(0.85, 0.93, S), act5 = M.smooth(0.9, 0.96, S);
      if (inp.present && (!SID.env.coarse || inp.down)) { state.yT = inp.nx * 1.25; state.pT = -inp.ny * 0.24; }
      else if (SID.env.coarse) { state.yT = 0.7 * Math.sin(t * 0.11); state.pT = 0.05 * Math.sin(t * 0.17); }
      var gz = state.gaze;
      gz.yaw = M.damp(gz.yaw, SID.env.reduced ? 0 : state.yT * act5, 2.4, dt);
      gz.pitch = M.damp(gz.pitch, SID.env.reduced ? 0 : state.pT * act5, 2.4, dt);
      for (li = 0; li < 5; li++) {
        var rs = state.ring[li];
        rs.theta += RING_DRIFT[li] * dt * (1 - en.still) * gate * (SID.env.reduced ? 0.2 : 1);
        /* attention pulls: the word turns to face you, faster the stiller you are */
        rs.theta += wrapPi(gz.yaw - rs.theta) * (1 - Math.exp(-(0.12 + 1.7 * en.still) * dt)) * gate;
        c.ringRot[li] = rs.theta;
      }

      /* ---------- lock: the moment the parts add up ---------- */
      var dwell = M.smooth(0.30, 0.335, S) * (1 - M.smooth(0.47, 0.53, S));
      var lock = cam.lock * dwell;
      if (lock > 0.9) state.lockHold += dt; else if (lock < 0.5) state.lockHold = 0;
      if (lock > 0.9 && !state.ignited) { state.ignited = true; state.igniteT = 0; }
      if (lock < 0.3) { if (state.ignited) SID.Trace.slip(); state.ignited = false; }
      fs.ignite = -1;
      if (state.igniteT >= 0) {
        state.igniteT += dt;
        var p = state.igniteT / 2.0;
        if (p > 1.3) state.igniteT = -1; else fs.ignite = p * 1.3 - 0.15;
      }
      fs.lock = lock; fs.E = c.E; fs.t = t; fs.cam = cam; fs.world = world;
      /* unknown: everything is dim and half-there, and only comes up as you find your way in */
      fs.master = M.lerp(0.72, 1, M.smooth(0.0, 0.3, S));
      fs.layerAlpha[3] *= M.lerp(0.55, 1, M.smooth(0.0, 0.3, S));
      fs.m1A = m1A;
      fs.lineScale = M.clamp(0.8 + 0.2 * (inp.w / 1440), 0.85, 1.3);
      fs.dt = dt;
      fs.press = state.press;
      state.retA = M.damp(state.retA, c.present && !SID.env.coarse ? M.smooth(0.47, 0.6, S) : 0, 3, dt);
      fs.reticle = state.retA;
      /* the bloom breathes when the word locks */
      if (state.igniteT >= 0 && state.igniteT < dt * 1.5) state.glow = 1;
      state.glow = Math.max(0, state.glow - dt / 1.4);
      fs.bloom = (0.40 + 0.32 * state.glow + 0.10 * state.press) * M.smooth(1.5, 6, t);
      c.calm = lock;                                /* being found makes the world calmer */
      fs.streak = M.smooth(2, 12, o.pathSpeed) * (S > 0.47 ? 1 : 0.35) * (SID.env.reduced ? 0 : 1);
      fs.seekerAlpha = M.smooth(1.2, 4.2, t * lockRise);

      /* autofocus brackets around the word */
      fs.brackets = M.smooth(0.7, 1.0, lock) * M.smooth(0.4, 1.4, state.lockHold);
      if (fs.brackets > 0.01) {
        var s = world.s, b = world.word.bbox, P = [0, 0, 0], q = [0, 0, 0];
        if (Cam.project(s * b.x0, s * b.y0, -D0, P) && Cam.project(s * b.x1, s * b.y1, -D0, q)) {
          fs.bracketRect = { x0: Math.min(P[0], q[0]), y0: Math.min(P[1], q[1]), x1: Math.max(P[0], q[0]), y1: Math.max(P[1], q[1]) };
        } else fs.bracketRect = null;
      }

      this.ui(o, fs, lock);
      return fs;
    },

    /* ---------- the piece's whispers, in its own letterforms ---------- */
    ui: function (o, fs, lock) {
      var S = o.S, t = o.t, dt = o.dt, en = SID.energy, inp = SID.input;

      /* ruler pin: where you are in the whole piece, not just Module 1 */
      el.pin.style.transform = 'translateY(' + ((o.Sg == null ? S : o.Sg) * (inp.h - 96)).toFixed(1) + 'px)';

      /* scroll invitation: a thread that lengthens, only if nobody has scrolled */
      /* ...and again if someone rests at the identity moment and does not know there is more */
      var idle = (S < 0.012 && t > 9) || (S < 0.46 && S > 0.33 && state.lockHold > 7) || (o.S2 > 0.92 && en.stillT > 9 && !SID.Edge.active);
      state.threadA = M.damp(state.threadA, idle ? 1 : 0, idle ? 1.4 : 6, dt);
      setVis(el.thread, state.threadA);

      /* identity: full name + the shared letter */
      var idn = M.smooth(1.6, 3.2, state.lockHold) * (1 - M.smooth(0.47, 0.5, S));
      state.capA = M.damp(state.capA, idn, 2.2, dt);
      if (state.capA > 0.01) setText('capL', el.capL, 'PERURI JAI SAI SIDDHARTHA');
      setVis(el.capL, state.capA * 0.8);

      /* hint: only if the visitor fails to hold still near the vantage */
      var near = S > 0.30 && S < 0.47 && lock < 0.5 && en.E > 0.15;
      state.failT = near ? state.failT + dt : Math.max(0, state.failT - dt * 0.5);
      var hint = state.failT > 9 && !state.hintShown ? 1 : 0;
      if (hint && lock > 0.5) state.hintShown = true;
      if (lock > 0.9) state.hintShown = true;
      state.hintA = M.damp(state.hintA, hint && !state.hintShown ? 1 : 0, 1.6, dt);
      if (state.hintA > 0.01) setText('whisper', el.whisper, 'HOLD STILL');
      /* the dark answers someone who waits in it: after a long stillness, each of the five layers says in turn, quietly, what it does
         (they say it again as you pass through their gates; this is only for a visitor who stopped to listen) */
      var wt = en.stillT - 16, waitA = 0;
      if (S < 0.06 && wt > 0) {
        var wph = (wt / 6) % 1, wi = Math.floor(wt / 6) % VERBS.length;
        waitA = Math.pow(Math.sin(Math.PI * wph), 0.7) * 0.5;
        if (waitA > 0.01) setText('whisper', el.whisper, VERBS[wi]);
      }
      setVis(el.whisper, Math.max(state.hintA * 0.7, waitA));

      /* the door: the seeker asks */
      var asks = M.smooth(0.485, 0.52, S) * (1 - M.smooth(0.56, 0.6, S));
      state.asksA = M.damp(state.asksA, asks, 3, dt);
      if (state.asksA > 0.01) {
        setText('asks', el.asks, 'ASKS');
        var sp = SID.Seeker.screenPos();
        if (sp) el.asks.style.transform = 'translate(' + (sp[0] / SID.Render.dpr + 18).toFixed(1) + 'px,' + (sp[1] / SID.Render.dpr - 8).toFixed(1) + 'px)';
      }
      setVis(el.asks, state.asksA * 0.85);

      /* verbs: each layer names what it does as you pass through its gate */
      var cz = o.cam.z, best = -1, bestD = 1e9, L = o.world.layers, i;
      if (S > 0.5 && S < 0.9) for (i = 0; i < L.length; i++) {
        var d = Math.abs(-L[i].def.depth - cz);
        if (d < bestD) { bestD = d; best = i; }
      }
      var vAlpha = best >= 0 ? 1 - M.smooth(1.0, 2.2, bestD) : 0;
      if (best >= 0 && vAlpha > 0.02) {
        state.verbTxt = L[best].def.verb;
        setText('verb', el.verb, state.verbTxt);
      }
      state.verbA = M.damp(state.verbA, vAlpha, 4, dt);
      setVis(el.verb, state.verbA * 0.8);
      /* passing through a layer switches that rendering of the signature on: slowly if you are slow, barely if you rush */
      if (best >= 0) SID.DNA.express(best, 1.3 * dt * state.verbA * (1 - M.smooth(2, 16, o.pathSpeed)));
      /* and holding still at the end, while the ember signs the name, finishes what a hurried pass left unwritten */
      if (S > 0.93 && o.S2 <= 0.001 && en.stillT > 1.5) for (i = 0; i < 5; i++) SID.DNA.express(i, dt * 0.035);
    }
  };
})();
