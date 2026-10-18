/* ------------------------------------------------------------------
   main.js  -  boot and the frame loop.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID, M = SID.M, inp = SID.input;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  /* film grain: generated, not shipped */
  (function grain() {
    var c = document.createElement('canvas'), n = 180; c.width = c.height = n;
    var x = c.getContext('2d'), id = x.createImageData(n, n), r = M.rng(4242);
    for (var i = 0; i < n * n; i++) {
      var v = Math.max(0, Math.min(255, 128 + M.gauss(r) * 40));
      id.data[i * 4] = v; id.data[i * 4 + 1] = v * 0.97; id.data[i * 4 + 2] = v * 0.92; id.data[i * 4 + 3] = 255;
    }
    x.putImageData(id, 0, 0);
    document.getElementById('grain').style.backgroundImage = 'url(' + c.toDataURL() + ')';
  })();

  var canvas = document.getElementById('world'), bloom = document.getElementById('bloom');
  SID.Render.init(canvas, bloom);
  SID.Director.init();
  SID.DNA.load(SID.Visit.mem.gene); SID.DNA.seed(SID.Visit.r('dna'));            /* what was remembered of the signature, already decayed */
  if (SID.Visit.returning) SID.DNA.express('memory', 0.12 * Math.min(4, SID.Visit.n - 1));
  SID.Visit.onSave(function (rec) { rec.gene = SID.DNA.dump(); });
  SID.Mind.build();
  SID.Mind.bind();
  SID.Edge.build();
  SID.Deep.init();
  var frameEl = document.getElementById('frame'), frameShown = 1, rulerEl = document.getElementById('rw'), rulerShown = 1;

  /* one scroll column, three parts: the name, the inside of it, and the edge.
     Their lengths live in the stylesheet (--m1, --m2, --m3); here they become the two places
     where one part hands over to the next (k: name -> inside, k2: inside -> edge). */
  SID.timeline = { k: 0.42, k2: 0.78 };
  function readTimeline() {
    var cs = getComputedStyle(document.documentElement);
    var m1 = parseFloat(cs.getPropertyValue('--m1')) || 1000, m2 = parseFloat(cs.getPropertyValue('--m2')) || 900, m3 = parseFloat(cs.getPropertyValue('--m3')) || 300;
    SID.timeline.k = m1 / (m1 + m2 + m3);
    SID.timeline.k2 = (m1 + m2) / (m1 + m2 + m3);
  }
  readTimeline();

  var world = null, worldAspect = 0, worldMode = '', worldW = 0;
  function layoutFor(aspect) { return aspect < 1.15 ? ['SIDDH', 'ARTHA'] : ['SIDDHARTHA']; }
  function rebuild() {
    var aspect = inp.w / inp.h, mode = aspect < 1.15 ? 'stack' : 'line';
    /* alignment does not depend on layout scale, so only rebuild when the shape of the
       window genuinely changes - not when a phone's URL bar slides away mid-scroll */
    if (world && mode === worldMode && Math.abs(inp.w - worldW) < 2 && Math.abs(aspect - worldAspect) / worldAspect < 0.22) return;
    world = SID.World.build(layoutFor(aspect), aspect, 1337);
    worldAspect = aspect; worldMode = mode; worldW = inp.w;
  }
  var resizeTimer = 0, qScale = 1, slowFrames = 0, cool = 0;
  function applySize() {
    var dpr = inp.dpr * qScale;                      /* qScale < 1 only if the device cannot keep up */
    SID.Render.resize(inp.w, inp.h, dpr);
    SID.Cam.setViewport(inp.w * dpr, inp.h * dpr);
  }
  SID.onResize = function () {
    readTimeline();
    SID.Deep.remeasure();
    applySize();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(rebuild, 120);
  };
  applySize(); rebuild();

  /* ---- loop ---- */
  var t = 0, S = 0, Sg = 0, SgV = 0, Sv = 0, spr = [0, 0], last = performance.now(), frames = 0, avg = 16.7, pathPrev = [0, 0, 0];
  var mo = { present: false, x: 0, y: 0, tap: false, S2: 0, S3: 0, t: 0, dt: 0, cam: null, en: null, dpr: 1, press: 0 };
  mo.ptr = mo;                                    /* the interior reads the pointer as o.ptr.{present,x,y,tap} */
  SID.perf = { avg: 16.7, js: 0, frames: 0 };

  var skip = false;
  function frame(now) {
    requestAnimationFrame(frame);
    /* at the edge, with nothing happening, half the frames are enough (the caret is the fastest thing on screen) */
    if (SID.Edge.resting && SID.energy.stillT > 5 && (skip = !skip)) return;
    var jsStart = performance.now();
    var raw = (now - last) / 1000; last = now;
    var dt = Math.min(Math.max(raw, 0.001), 1 / 20);
    t += dt;
    SID.readScroll();
    var target = inp.S, Sprev = Sg;
    /* weighty: the camera has mass, so a flick of the wheel glides */
    M.crit(Sg, SgV, target, SID.env.reduced ? 14 : 8.6, dt, spr);
    Sg = spr[0]; SgV = spr[1];
    if (Sg < 0 || Sg > 1) { Sg = M.clamp(Sg, 0, 1); SgV = 0; }                        /* (the ends of the column stop it dead) */
    var K = SID.timeline.k, K2 = SID.timeline.k2;
    S = Math.min(1, Sg / K);                              /* Module 1: the name */
    var S2 = M.clamp((Sg - K) / (K2 - K), 0, 1);          /* Module 2: the inside */
    var S3 = M.clamp((Sg - K2) / (1 - K2), 0, 1);         /* Module 3: the edge */
    Sv = (Sg - Sprev) / dt;
    SID.Deep.pre({ dt: dt, inp: inp });                   /* below the last of the three parts, scroll is depth */

    /* where you look and how far you lean in: the interior owns the camera once you cross over */
    var mc = SID.Mind.control({ S2: S2, dt: dt, inp: inp });
    if (mc) mc.oy += SID.Deep.camY;                                  /* the camera stays on the axis; it is lower */
    var look = mc ? mc.look : SID.Director.look;
    var cam = SID.Cam.update(S, t, dt, SID.energy, inp, mc ? 0.2 : true, look, mc);
    var dxp = cam.px - pathPrev[0], dyp = cam.py - pathPrev[1], dzp = cam.pz - pathPrev[2];
    pathPrev[0] = cam.px; pathPrev[1] = cam.py; pathPrev[2] = cam.pz;
    var pathSpeed = Math.sqrt(dxp * dxp + dyp * dyp + dzp * dzp) / dt;
    var fwdVel = (dxp * cam.fx + dyp * cam.fy + dzp * cam.fz) / dt;
    if (!isFinite(pathSpeed) || frames < 2) { pathSpeed = 0; fwdVel = 0; }
    SID.updateEnergy(dt, pathSpeed);
    SID.Trace.update({ dt: dt, inp: inp, gaze: S2 > 0 && SID.Mind.st.active ? SID.Mind.st : null });       /* behaviour only: see trace.js */
    var dpr = SID.Render.dpr, Mind = SID.Mind;
    var pinS = Sg;
    if (SID.Deep.ext > 0) { var dH = SID.Deep.deepH * SID.Deep.ext, y3 = inp.y3; pinS = (Sg * y3 + SID.Deep.frac * SID.Deep.deepH) / (y3 + dH); }
    var fs = SID.Director.update({ S: S, S2: S2, Sg: pinS, t: t, dt: dt, cam: cam, world: world, sVel: Sv, pathSpeed: pathSpeed, fwdVel: fwdVel, dpr: dpr, inside: Mind.st.inside });

    /* Module 1's rings only need their physics while they are still visible */
    if (fs.m1A > 0.01) SID.World.step(world, Math.min(dt, 1 / 30), t, cam, fs.c);

    /* the interior: the pointer (or a tap) is attention */
    var tap = Mind.tap;
    mo.present = (inp.present && (!SID.env.coarse || inp.down)) || tap;   /* a finger that is down is a pointer */
    mo.x = tap && !inp.present ? Mind.tapX : inp.px * dpr; mo.y = tap && !inp.present ? Mind.tapY : inp.py * dpr; mo.tap = tap;
    mo.S2 = S2; mo.S3 = S3; mo.t = t; mo.dt = dt; mo.cam = cam; mo.en = SID.energy; mo.dpr = dpr; mo.press = SID.Director.press; mo.sVel = Sv;
    SID.Sprites.reset();
    var Edge = SID.Edge;
    if (S2 > 0) { Mind.update(mo); SID.Reactions.update(mo); Mind.emit(mo); SID.Reactions.emit(mo); SID.Ledger.update(mo); SID.Ledger.emit(mo); Mind.ui(mo); Edge.update(mo); Edge.emit(mo); SID.Deep.update(mo); SID.Deep.emit(mo); SID.Deep.ui(mo); if (SID.Archive3D) SID.Archive3D.frame(mo); } else { Mind.clear(); Edge.clear(); }

    var c = fs.c;
    SID.Seeker.update(cam, {
      S: S, t: t, dt: dt, present: c.present, nx: inp.nx, ny: inp.ny,
      curious: M.smooth(0.5, 0.6, S), press: SID.Director.press,
      writeOn: S > 0.965 && SID.energy.stillT > 1.2 && S2 <= 0.001,
      design: world.layers[1],
      custom: S2 > 0 ? (SID.Deep.active && (!Edge.residueOn || SID.Deep.final > 0.05) ? SID.Deep.seeker : Edge.active ? Edge.seeker : Mind.seeker) : null
    });

    SID.DNA.update(dt, t, { still: SID.energy.still });                   /* the signature only grows here; it is shown behind one door and nowhere else */
    SID.Visit.save();

    fs.reticle *= 1 - Edge.calm;                                  /* nothing reaches out at the edge */
    SID.Render.frame(fs);
    bloom.style.opacity = (fs.bloom * (1 - 0.5 * Edge.calm)).toFixed(3);
    if (Math.abs(Edge.frame - frameShown) > 0.004) { frameShown = Edge.frame; frameEl.style.opacity = Edge.frame.toFixed(3); }   /* the apparatus lets go at the edge */
    var rv = Math.max(Edge.frame, SID.Deep.ruler);                                                                            /* (and the ruler comes back to measure the way down) */
    if (Math.abs(rv - rulerShown) > 0.004) { rulerShown = rv; rulerEl.style.opacity = rv.toFixed(3); }

    /* adaptive quality: if the device is slow for a sustained stretch, draw a little softer */
    var ms = raw * 1000;
    avg += (ms - avg) * 0.03;
    if (cool > 0) cool--;
    else if (avg > 27 && qScale > 0.55) {
      if (++slowFrames > 90) { qScale *= 0.85; slowFrames = 0; cool = 240; applySize(); }
    } else slowFrames = 0;
    SID.perf.avg = avg; SID.perf.frames = ++frames; SID.perf.q = qScale;
    SID.perf.js += (performance.now() - jsStart - SID.perf.js) * 0.05;          /* what one frame costs in script, not in waiting */
    document.body.classList.remove('is-booting');
  }
  requestAnimationFrame(frame);

  window.__sid = { get S() { return S; }, get Sg() { return Sg; }, get t() { return t; }, get world() { return world; } };
})();
