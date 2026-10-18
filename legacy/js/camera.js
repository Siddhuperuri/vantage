/* ------------------------------------------------------------------
   camera.js  -  where the visitor stands.

   The camera follows a path through the piece (a function of scroll
   progress S) and carries a small spring the visitor disturbs by
   moving. At the vantage V* = (0,0,0) with the spring at rest, the five
   layers of the world project onto one another and become the word.
   Anywhere else they are separate sheets of light at separate depths.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID, M = SID.M, RAD = Math.PI / 180;

  var D0 = 10;                       /* vantage -> word plane */
  var PIVOT = [0, 0, -D0];

  function orbit(yawDeg, pitchDeg, R) {
    var th = yawDeg * RAD, ph = pitchDeg * RAD;
    return [PIVOT[0] + R * Math.sin(th) * Math.cos(ph), PIVOT[1] + R * Math.sin(ph), PIVOT[2] + R * Math.cos(th) * Math.cos(ph)];
  }
  function fwd(z) { return [0, 0, z - 10]; }   /* aim straight down the axis */

  /* ---- the path ----
     hold:true pins the tangent to zero so the camera comes to a true rest.
     Acts: unknown 0-.10, discovery .10-.335, identity .335-.47,
           curiosity .47-.84 (the flight through the door), immersion .84-1. */
  var KEYS = [
    { s: 0.00, p: orbit(-71, 14, 24.0), a: PIVOT, fov: 66 },
    { s: 0.10, p: orbit(-58, 11, 20.0), a: PIVOT, fov: 62 },
    { s: 0.21, p: orbit(-32, 6, 15.0), a: PIVOT, fov: 55 },
    { s: 0.285, p: orbit(-11, 2, 11.8), a: PIVOT, fov: 49 },
    { s: 0.335, p: [0, 0, 0], a: PIVOT, fov: 46, hold: true },
    { s: 0.47, p: [0, 0, 0], a: PIVOT, fov: 46, hold: true },
    { s: 0.60, p: [0, 0, -4.2], a: fwd(-4.2), fov: 50 },
    { s: 0.72, p: [0, 0, -9.6], a: fwd(-9.6), fov: 54 },
    { s: 0.84, p: [0, 0, -15.0], a: fwd(-15.0), fov: 54 },
    { s: 0.915, p: [0, 0, -18.0], a: fwd(-18.0), fov: 56, hold: true },    /* the centre of the rings */
    { s: 1.00, p: [0, 0, -18.0], a: fwd(-18.0), fov: 56, hold: true }
  ];
  var CENTER = [0, 0, -18.0];

  function hermite(p0, p1, m0, m1, t) {
    var t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1;
  }
  function tangent(i, get) {
    var k = KEYS[i];
    if (k.hold || i === 0 || i === KEYS.length - 1) return 0;
    var a = KEYS[i - 1], b = KEYS[i + 1];
    return (get(b) - get(a)) / (b.s - a.s);
  }
  function evalKeys(S, get) {
    var i = 0;
    while (i < KEYS.length - 2 && S > KEYS[i + 1].s) i++;
    var a = KEYS[i], b = KEYS[i + 1], h = b.s - a.s;
    var t = M.clamp((S - a.s) / h, 0, 1);
    return hermite(get(a), get(b), tangent(i, get) * h, tangent(i + 1, get) * h, t);
  }

  var cam = SID.cam = {
    x: 0, y: 0, z: 0,
    fx: 0, fy: 0, fz: -1, rx: 1, ry: 0, rz: 0, ux: 0, uy: 1, uz: 0,
    F: 1000, cx: 0, cy: 0, near: 0.12, fov: 46,
    W: 1, H: 1, err: 9, lock: 0
  };
  var off = { x: 0, y: 0, vx: 0, vy: 0 };     /* the visitor's disturbance, in camera axes */
  var lockS = 0;

  SID.Cam = {
    D0: D0, PIVOT: PIVOT, KEYS: KEYS, CENTER: CENTER,
    setViewport: function (w, h) { cam.W = w; cam.H = h; cam.cx = w / 2; cam.cy = h / 2; },

    /* S: smoothed scroll progress. t: seconds. dt: frame time. */
    /* look: {yaw, pitch}. extra: {ox, oy, oz, fov} - the interior moves the camera off the
       centre of the rings (leaning toward a door) and changes the lens. allowKick may be a
       multiplier for how strongly the visitor's motion disturbs the viewpoint. */
    update: function (S, t, dt, energy, pointer, allowKick, look, extra) {
      var px = evalKeys(S, function (k) { return k.p[0]; });
      var py = evalKeys(S, function (k) { return k.p[1]; });
      var pz = evalKeys(S, function (k) { return k.p[2]; });
      var ax = evalKeys(S, function (k) { return k.a[0]; });
      var ay = evalKeys(S, function (k) { return k.a[1]; });
      var az = evalKeys(S, function (k) { return k.a[2]; });
      cam.fov = evalKeys(S, function (k) { return k.fov; });

      /* look basis (lookAt with world up), computed before disturbance so the
         spring lives in the camera's own axes */
      var fx = ax - px, fy = ay - py, fz = az - pz, fl = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1;
      fx /= fl; fy /= fl; fz /= fl;
      if (look && (look.yaw || look.pitch)) {            /* turning the head from the centre of the rings */
        var cy_ = Math.cos(look.yaw), sy_ = Math.sin(look.yaw), cp = Math.cos(look.pitch), sp = Math.sin(look.pitch);
        var tx = fx * cy_ - fz * sy_, tz = fx * sy_ + fz * cy_;
        fx = tx * cp; fz = tz * cp; fy = fy * cp + sp;
        var l2 = Math.sqrt(fx * fx + fy * fy + fz * fz) || 1; fx /= l2; fy /= l2; fz /= l2;
      }
      var rx = fy * 0 - fz * 1, ry = fz * 0 - fx * 0, rz = fx * 1 - fy * 0;   /* f x up(0,1,0) */
      var rl = Math.sqrt(rx * rx + ry * ry + rz * rz) || 1;
      rx /= rl; ry /= rl; rz /= rl;
      var ux = ry * fz - rz * fy, uy = rz * fx - rx * fz, uz = rx * fy - ry * fx;

      /* the spring: motion kicks it, stillness returns it home */
      var reduced = SID.env.reduced;
      if (allowKick && pointer.present) {
        var kick = (reduced ? 3 : 15) * (typeof allowKick === 'number' ? allowKick : 1);
        off.vx -= pointer.vx * kick * dt;
        off.vy += pointer.vy * kick * dt;
      }
      var w0 = 4.4, zeta = 0.86;
      off.vx += (-w0 * w0 * off.x - 2 * zeta * w0 * off.vx) * dt;
      off.vy += (-w0 * w0 * off.y - 2 * zeta * w0 * off.vy) * dt;
      off.x += off.vx * dt; off.y += off.vy * dt;
      var ol = Math.sqrt(off.x * off.x + off.y * off.y);
      if (ol > 1.7) { off.x *= 1.7 / ol; off.y *= 1.7 / ol; }

      /* the world breathes on its own before it is found; the drift is
         gone by the time we arrive at the vantage */
      var dAmp = reduced ? 0 : 0.7 * (1 - M.smooth(0.04, 0.33, S)) * (0.5 + 0.5 * M.smooth(0, 0.06, S));
      var dx = Math.sin(t * 0.21) * dAmp + Math.sin(t * 0.53 + 1.3) * dAmp * 0.35;
      var dy = Math.cos(t * 0.17 + 0.6) * dAmp * 0.6;

      cam.px = px; cam.py = py; cam.pz = pz;              /* the path itself, before the visitor's disturbance */
      var eox = extra ? extra.ox : 0, eoy = extra ? extra.oy : 0, eoz = extra ? extra.oz : 0;
      if (extra && extra.fov) { cam.fov = extra.fov; }
      cam.x = px + eox + rx * (off.x + dx) + ux * (off.y + dy);
      cam.y = py + eoy + ry * (off.x + dx) + uy * (off.y + dy);
      cam.z = pz + eoz + rz * (off.x + dx) + uz * (off.y + dy);
      cam.fx = fx; cam.fy = fy; cam.fz = fz;
      cam.rx = rx; cam.ry = ry; cam.rz = rz;
      cam.ux = ux; cam.uy = uy; cam.uz = uz;
      cam.F = (cam.H / 2) / Math.tan(cam.fov * RAD / 2);

      /* how close is this to standing exactly where he stands? */
      cam.err = Math.sqrt(cam.x * cam.x + cam.y * cam.y + cam.z * cam.z);
      var lockT = 1 - M.smooth(0.010, 0.17, cam.err);
      lockS = M.damp(lockS, lockT, lockT > lockS ? 5 : 14, dt);
      cam.lock = lockS;
      return cam;
    },

    /* project a world point; returns false if behind the near plane */
    project: function (x, y, z, out) {
      var dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
      var zc = dx * cam.fx + dy * cam.fy + dz * cam.fz;
      if (zc < cam.near) return false;
      out[0] = cam.cx + cam.F * (dx * cam.rx + dy * cam.ry + dz * cam.rz) / zc;
      out[1] = cam.cy - cam.F * (dx * cam.ux + dy * cam.uy + dz * cam.uz) / zc;
      out[2] = zc;
      return true;
    }
  };
})();
