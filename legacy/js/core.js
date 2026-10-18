/* ------------------------------------------------------------------
   core.js  -  math, procedural noise, input, energy.
   No dependencies. Everything hangs off window.SID.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = (window.SID = window.SID || {});

  /* ---------- math ---------- */
  var clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var smooth = function (a, b, x) {
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  var smoother = function (a, b, x) {
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * t * (t * (t * 6 - 15) + 10);
  };
  /* frame-rate independent exponential approach */
  var damp = function (a, b, lambda, dt) { return a + (b - a) * (1 - Math.exp(-lambda * dt)); };

  /* A critically damped spring toward `target`, solved exactly (stable at any dt). Unlike damp() above, whose speed
     jumps to its maximum the instant the target moves, this builds speed up and lets it settle, so a wheel notch or a
     turn of the head starts and ends like something with weight. Returns via out: [position, velocity]. */
  var crit = function (x, v, target, w, dt, out) {
    var d = x - target, e = Math.exp(-w * dt), c = (v + w * d) * dt;
    out[0] = target + (d + c) * e; out[1] = (v - w * c) * e;
    return out;
  };

  /* mulberry32 - small seeded PRNG so the world is identical on every visit */
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) {
    var u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307179586 * v);
  }

  function hash(ix, iy, iz, seed) {
    var h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(iz, 1440662683) ^ Math.imul(seed | 0, 1274126177);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967295;
  }
  /* smooth value noise in [-1, 1] */
  function noise(x, y, z, seed) {
    var ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    var fx = x - ix, fy = y - iy, fz = z - iz;
    fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
    var s = seed || 0;
    var a = hash(ix, iy, iz, s), b = hash(ix + 1, iy, iz, s);
    var c = hash(ix, iy + 1, iz, s), d = hash(ix + 1, iy + 1, iz, s);
    var e = hash(ix, iy, iz + 1, s), f = hash(ix + 1, iy, iz + 1, s);
    var g = hash(ix, iy + 1, iz + 1, s), h = hash(ix + 1, iy + 1, iz + 1, s);
    var x1 = a + (b - a) * fx, x2 = c + (d - c) * fx, x3 = e + (f - e) * fx, x4 = g + (h - g) * fx;
    var y1 = x1 + (x2 - x1) * fy, y2 = x3 + (x4 - x3) * fy;
    return (y1 + (y2 - y1) * fz) * 2 - 1;
  }

  /* the shortest signed turn, as an angle in (-pi, pi] */
  var wrapPi = function (a) { return a - Math.PI * 2 * Math.floor((a + Math.PI) / (Math.PI * 2)); };
  /* a canvas colour from an [r, g, b] palette entry and an alpha */
  var rgba = function (c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a < 0 ? 0 : a).toFixed(3) + ')'; };

  SID.M = { clamp: clamp, lerp: lerp, smooth: smooth, smoother: smoother, damp: damp, crit: crit, wrapPi: wrapPi, rgba: rgba,
            rng: rng, gauss: gauss, hash: hash, noise: noise, TAU: Math.PI * 2 };
  /* the palette, as the canvas needs it (style.css holds the same three colours for the page) */
  SID.C = { GROUND: '#0a0908', PAPER: [233, 226, 211], EMBER: [255, 92, 36] };

  /* ---------- environment ---------- */
  var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  SID.env = {
    reduced: !!(mq && mq.matches),
    coarse: !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
  };
  if (mq && mq.addEventListener) mq.addEventListener('change', function (e) { SID.env.reduced = e.matches; });

  /* ---------- input: the visitor as a physical quantity ---------- */
  var input = SID.input = {
    w: window.innerWidth, h: window.innerHeight, dpr: 1,
    px: 0, py: 0,            /* pointer, css px */
    nx: 0, ny: 0,            /* pointer, -1..1 */
    vx: 0, vy: 0,            /* smoothed velocity, viewport-heights / second */
    speed: 0,
    present: false,          /* pointer currently over the piece / finger down */
    down: false,
    kdown: false,            /* Enter, held: asks, as a held pointer does */
    touch: false,
    everMoved: false,
    lastMoveAt: 0,
    dragX: 0, dragY: 0,      /* touch drag accumulated since last read (the interior turns your head) */
    scrollY: 0, scrollMax: 1, S: 0, y3: 1, dy: 0
  };

  var lastT = 0, lastX = 0, lastY = 0;
  function onMove(e) {
    var now = e.timeStamp || performance.now();
    var x = e.clientX, y = e.clientY;
    if (e.pointerType === 'touch' && input.down && lastT) { input.dragX += x - lastX; input.dragY += y - lastY; }
    if (input.present && lastT) {
      var dt = Math.max(0.004, (now - lastT) / 1000);
      var rx = (x - lastX) / input.h / dt, ry = (y - lastY) / input.h / dt;
      var kv = 1 - Math.exp(-dt * 26);                    /* (by time, not by event: a 1000 Hz mouse and a trackpad feel the same) */
      input.vx += (rx - input.vx) * kv;
      input.vy += (ry - input.vy) * kv;
    }
    lastT = now; lastX = x; lastY = y;
    input.px = x; input.py = y;
    input.nx = (x / input.w) * 2 - 1;
    input.ny = (y / input.h) * 2 - 1;
    input.present = true;
    input.everMoved = true;
    input.lastMoveAt = performance.now();
    input.touch = e.pointerType === 'touch';
  }
  function onLeave() { input.present = false; lastT = 0; }
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerdown', function (e) {
    input.down = true; onMove(e);
  }, { passive: true });
  window.addEventListener('pointerup', function (e) {
    input.down = false;
    if (e.pointerType === 'touch') onLeave();
  }, { passive: true });
  window.addEventListener('pointercancel', function () { input.down = false; onLeave(); }, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('blur', onLeave);

  /* ---------- one polite live region for assistive technology (index.html: #live) ---------- */
  var liveEl = null, liveShown = '';
  SID.announce = function (txt) {
    if (!liveEl) liveEl = document.getElementById('live');
    if (liveEl && txt !== liveShown) { liveShown = txt; liveEl.textContent = txt; }
  };

  /* ---------- scroll ---------- */
  /* The column has two kinds of length. The three parts (the name, the inside, the edge) are #track, and their
     progress S is scroll / y3, where y3 is how far you can scroll before the end of #track. Beyond that is #deep,
     the descent, which is zero tall until the piece has been finished once; its depth is measured in pixels below
     y3 (input.dy). Because S never depends on how tall #deep is, opening the descent cannot move anything. */
  var scrollH = 1, y3 = 1, trackEl = null;
  /* the column's height only changes when the window does (or when the descent opens), so it is measured then, not every frame */
  function measureScroll() {
    if (!trackEl) trackEl = document.getElementById('track');
    scrollH = (document.scrollingElement || document.documentElement).scrollHeight;
    y3 = Math.max(1, (trackEl ? trackEl.offsetHeight : scrollH) - window.innerHeight);
  }
  function readScroll() {
    input.scrollY = window.pageYOffset || 0;
    input.scrollMax = Math.max(1, scrollH - window.innerHeight);
    input.y3 = y3;
    input.S = clamp(input.scrollY / y3, 0, 1);
    input.dy = Math.max(0, input.scrollY - y3);
  }
  SID.readScroll = readScroll;
  SID.remeasure = function () { measureScroll(); readScroll(); };
  SID.track = { get y3() { return y3; } };

  function onResize() {
    var prevY = input.scrollY, prevY3 = y3, prevH = input.h, widthChanged = input.w && Math.abs(window.innerWidth - input.w) > 1;
    input.w = window.innerWidth; input.h = window.innerHeight;
    /* sharp, but never more than ~8 megapixels of additive light per frame, however dense the screen */
    input.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(8.4e6 / (input.w * input.h))));
    measureScroll(); readScroll();
    /* the timeline is measured in viewport heights: keep the visitor's place when the
       window is reshaped (but not when a phone's URL bar merely nudges the height) */
    if (widthChanged && input.scrollMax > 1) {
      window.scrollTo(0, prevY > prevY3 ? y3 + (prevY - prevY3) * input.h / (prevH || input.h) : (prevY / prevY3) * y3);
      readScroll();
    }
    if (SID.onResize) SID.onResize();
  }
  window.addEventListener('resize', onResize);
  onResize();

  /* ---------- the world's single law -------------------------------
     Energy is what the visitor puts into the piece by moving or
     scrolling. It decays. Stillness is the absence of energy, and
     stillness is what resolves the image.
     ------------------------------------------------------------------ */
  SID.energy = { E: 0, still: 0, stillT: 0, scrollSpeed: 0 };
  /* pathSpeed: how fast the *camera* is travelling (world units / s). The wheel is
     not motion; movement through the world is. Scrolling while the camera is at
     rest at the vantage adds nothing, so the word stays crisp as you pass it. */
  SID.updateEnergy = function (dt, pathSpeed) {
    var en = SID.energy;
    /* pointer velocity decays between events */
    var k = Math.exp(-7 * dt);
    input.vx *= k; input.vy *= k;
    input.speed = Math.sqrt(input.vx * input.vx + input.vy * input.vy);
    en.scrollSpeed = pathSpeed;
    var target = clamp(input.speed * 0.85 + pathSpeed * 0.09, 0, 1.4);
    en.E = damp(en.E, target, target > en.E ? 12 : 1.7, dt);
    if (en.E > 0.09) en.stillT = 0; else en.stillT += dt;
    en.still = smooth(0.15, 1.3, en.stillT);
  };
})();
