/* ------------------------------------------------------------------
   archive3d.js  -  the archive's "opens into its five sheets" moment, in genuine depth.

   Three.js belongs to exactly one place in this piece: here, and only while a drawing in
   the well (strata.js) is actually being held open. Everywhere else the piece is unlit
   canvas and DOM, as it always was.

   Nothing here invents a second system. The five sheets are the same five stages of
   becoming every letter already has (letters.js: sketched, inferred, computed, designed,
   measured), drawn from the SAME resampled stroke data (Letters.glyphFor - the exact
   points the 2D renderer draws), weighted by the SAME resolution law (Letters.stagesOf,
   a pure copy of letters.js's own stages()), fanned apart by the SAME field every letter
   already carries for exactly this purpose (node.sep - "how far apart its five renderings
   stand in depth", letters.js's node()). The WebGL canvas tracks the artifact's own
   projected screen position every frame (SID.Cam's projection, already computed onto the
   node as n.sx/n.sy/n.capPx by Letters.emit) - the same technique the 2D caption in #inscr
   uses - so it reads as the same object gaining a dimension, not a separate demo bolted on.

   If Three.js failed to load, or this browser has no WebGL, `ensure()` fails once and the
   module goes quiet for the rest of the visit: the archive works exactly as it always has,
   in 2D only. Nothing else in the piece knows or cares whether this file is here.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID;
  if (!window.THREE) { SID.Archive3D = null; return; }
  var THREE = window.THREE, M = SID.M, Letters = SID.Letters, sm = M.smooth, clamp = M.clamp;

  var BW = 480, BH = 360;                 /* fixed internal size in CSS px: cheap, and stretched to fit on screen by transform, not re-rendered at a new size every frame */
  var SPACING = 0.85;                     /* world units between adjacent sheets at full sep */
  var THRESH = 0.015;                     /* below this n.sep nothing is being asked; stay dormant */

  var canvas = null, renderer = null, scene = null, camera = null, group = null, sheets = null;
  var curGlyph = null, disabled = false;
  var cache = {};                          /* glyph id -> its strokes, split and jittered once */

  function cap() { return Math.min(window.devicePixelRatio || 1, 2); }
  function hashStr(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h >>> 0; }

  function ensure() {
    if (canvas || disabled) return !disabled;
    try {
      canvas = document.getElementById('arc3d');
      if (!canvas || !window.WebGLRenderingContext) throw new Error('no canvas or no webgl');
      canvas.style.width = BW + 'px'; canvas.style.height = BH + 'px';    /* the CSS box stays fixed; only its transform: scale() below resizes it visually */
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(1);                                    /* the buffer size below already accounts for device pixels */
      renderer.setSize(Math.round(BW * cap()), Math.round(BH * cap()), false);
      renderer.setClearColor(0x000000, 0);
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(34, BW / BH, 0.1, 20);
      camera.position.set(0, 0, 5.4);
      group = new THREE.Group(); scene.add(group);
      var col = new THREE.Color(0.913, 0.886, 0.827);                /* paper, SID.C.PAPER */
      sheets = [];
      for (var i = 0; i < 5; i++) {
        var lg = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
        var pg = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: col, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
        lg.frustumCulled = false; pg.frustumCulled = false; pg.visible = false;
        group.add(lg); group.add(pg);
        sheets.push({ line: lg, pts: pg });
      }
      return true;
    } catch (e) { disabled = true; canvas = null; return false; }
  }

  /* the artifact's strokes, already resampled and centred by letters.js (the exact points the
     2D renderer draws): split once into "main" (the drawing) and "tick" (its own registration
     marks), plus a fixed seeded offset for the sketch stage - a loose hand, not an animation */
  function segsOf(glyph) {
    if (cache[glyph]) return cache[glyph];
    var gl = Letters.glyphFor(glyph);
    if (!gl) return (cache[glyph] = { main: [], tick: [], jitter: [], w: 1.4 });
    var main = [], tick = [], rng = M.rng(hashStr(glyph)), i;
    for (i = 1; i < gl.n; i++) {
      if (!gl.conn[i]) continue;
      var seg = [gl.x[i - 1], gl.y[i - 1], gl.x[i], gl.y[i]];
      (gl.tick[i] || gl.tick[i - 1] ? tick : main).push(seg);
    }
    var jitter = main.map(function (s) {
      var jx = (rng() - 0.5) * 0.05, jy = (rng() - 0.5) * 0.05;
      return [s[0] + jx, s[1] + jy, s[2] + jx, s[3] + jy];
    });
    return (cache[glyph] = { main: main, tick: tick, jitter: jitter, w: gl.w });
  }
  function segToBuf(list) {
    var a = new Float32Array(list.length * 6);
    for (var i = 0; i < list.length; i++) {
      a[i * 6] = list[i][0]; a[i * 6 + 1] = list[i][1]; a[i * 6 + 2] = 0;
      a[i * 6 + 3] = list[i][2]; a[i * 6 + 4] = list[i][3]; a[i * 6 + 5] = 0;
    }
    return a;
  }
  function ptsToBuf(list) {                                          /* one point per segment midpoint: dust that has not yet collapsed onto the stroke */
    var a = new Float32Array(list.length * 3);
    for (var i = 0; i < list.length; i++) { a[i * 3] = (list[i][0] + list[i][2]) / 2; a[i * 3 + 1] = (list[i][1] + list[i][3]) / 2; a[i * 3 + 2] = 0; }
    return a;
  }
  function snapped(list, pitch) {
    return list.map(function (s) { return [Math.round(s[0] / pitch) * pitch, Math.round(s[1] / pitch) * pitch, Math.round(s[2] / pitch) * pitch, Math.round(s[3] / pitch) * pitch]; });
  }

  function build(glyph) {
    var s = segsOf(glyph);
    var geoms = [
      segToBuf(s.jitter.length ? s.jitter : s.main),                 /* 0 sketch: a loose pass */
      null,                                                          /* 1 inferred: dust (built as points, below) */
      segToBuf(snapped(s.main, 0.11)),                                /* 2 computed: the same stroke on a grid */
      segToBuf(s.main),                                               /* 3 designed: the exact geometry */
      segToBuf(s.main.concat(s.tick))                                 /* 4 measured: the geometry, and its own registration marks */
    ];
    var dust = ptsToBuf(s.main);
    for (var i = 0; i < 5; i++) {
      var sh = sheets[i];
      if (i === 1) {
        sh.pts.geometry.dispose(); sh.pts.geometry = new THREE.BufferGeometry();
        sh.pts.geometry.setAttribute('position', new THREE.BufferAttribute(dust, 3));
        sh.pts.visible = true; sh.line.visible = false;
      } else {
        sh.line.geometry.dispose(); sh.line.geometry = new THREE.BufferGeometry();
        sh.line.geometry.setAttribute('position', new THREE.BufferAttribute(geoms[i], 3));
        sh.line.visible = true; sh.pts.visible = false;
      }
    }
    var scale = 1.9 / Math.max(0.6, s.w || 1.4);
    group.scale.set(scale, scale, scale);
  }

  /* ---------------- per frame (called from main.js only while the interior is active) ---------------- */
  function frame(o) {
    var St = SID.Strata; if (!St || !St.built) return;
    var nodes = St.nodes, best = null, bs = THRESH, i, n;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      if (n.frag != null || n.sheet || !n.art || n.art.unlit || !n.gl) continue;
      if (n.sep > bs) { bs = n.sep; best = n; }
    }
    if (!best) { if (canvas) canvas.style.opacity = '0'; return; }
    if (!ensure()) return;
    if (best.art.glyph !== curGlyph) { build(best.art.glyph); curGlyph = best.art.glyph; }

    var dpr = o.dpr || SID.Render.dpr || 1;
    var cx = best.sx / dpr, cy = best.sy / dpr;
    var vw = (SID.input && SID.input.w) || BW, vh = (SID.input && SID.input.h) || BH;
    var maxSize = Math.min(vw, vh) * 0.86;                              /* it may fill much of the view as it is fully asked (as a memory window does elsewhere), but never spill past it */
    var size = Math.min(maxSize, Math.max(60, best.capPx / dpr * (best.gl.w + 1.8) * 1.1)), s2 = size / BW;
    canvas.style.transform = 'translate(' + (cx - size / 2).toFixed(1) + 'px,' + (cy - size * BH / BW / 2).toFixed(1) + 'px) scale(' + s2.toFixed(3) + ')';
    canvas.style.opacity = sm(0, 0.1, best.sep).toFixed(3);

    var rho = clamp(best.rho + (best.rj || 0), 0, 1), stg = Letters.stagesOf(rho), sep = best.sep, k;
    var gate = sm(0, 0.05, sep);
    for (k = 0; k < 5; k++) {
      var sh = sheets[k], z = -k * SPACING * sep;
      sh.line.position.z = z; sh.pts.position.z = z;
      sh.line.material.opacity = stg[k] * gate * 0.85; sh.pts.material.opacity = stg[k] * gate * 0.6;
    }
    var reduced = SID.env.reduced, t = o.t || 0, inp = SID.input;
    camera.position.x = reduced ? 0 : 0.14 * Math.sin(t * 0.17) + 0.2 * (inp ? inp.nx : 0);
    camera.position.y = reduced ? 0 : 0.08 * Math.sin(t * 0.12 + 1.7) - 0.1 * (inp ? inp.ny : 0);
    camera.lookAt(0, 0, -SPACING * sep * 2);
    group.rotation.y = reduced ? 0 : 0.22 * sep * Math.sin(t * 0.23);

    renderer.render(scene, camera);
  }

  SID.Archive3D = { frame: frame };
})();
