/* ------------------------------------------------------------------
   seeker.js  -  curiosity, as the only thing in the piece with colour.

   Before you arrive it is a point of ember at the vantage V*: the
   place you are being drawn toward. As you arrive it leaps ahead and
   hovers in the counter of the shared A: the door. After that it leads
   you through, leans toward wherever you point, and waits when you
   stop. At the very end, if you are still, it writes the name.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID, M = SID.M, D0 = SID.Cam.D0;
  var EMBER = SID.C.EMBER, rgba = M.rgba;
  var N = 2400, BUCKETS = 9;

  var pos = [0, 0, 0], vel = [0, 0, 0];
  var trail = new Float32Array(N * 3), born = new Float32Array(N), ttl = new Float32Array(N), brk = new Uint8Array(N), head = 0, count = 0, lastPush = [0, 0, 0], breakNext = false;
  var launched = 0, dimByCam = 1, life = 3.2, BOB = SID.Visit.r('bob') * 6.283;
  var pen = { idx: 0, on: false, done: false };
  var segBuf = [], segCnt = new Int32Array(BUCKETS), OUT = [0, 0, 0];
  for (var b = 0; b < BUCKETS; b++) segBuf.push(new Float32Array(N * 4));

  /* the interior: the ember is a pen while the wall is written, then a thing that leans toward you */
  function customUpdate(cam, c) {
    var cu = c.custom, dt = c.dt, t = c.t;
    launched = 1; pen.on = false; pen.idx = 0; pen.done = false; life = cu.life || 3.2;
    var dx = cu.x - pos[0], dy = cu.y - pos[1], dz = cu.z - pos[2], dist = Math.sqrt(dx * dx + dy * dy + dz * dz), down = true;
    if (cu.mode === 'pen') {
      var step = Math.min(dist, cu.speed * dt);
      if (dist > 1e-5) { pos[0] += dx / dist * step; pos[1] += dy / dist * step; pos[2] += dz / dist * step; }
      vel[0] = vel[1] = vel[2] = 0;
      down = !!cu.down && dist < (cu.near || 0.9);        /* a mark only while the pen is on the stroke it is drawing */
    } else {
      vel[0] += (dx * cu.k - vel[0] * cu.d) * dt; vel[1] += (dy * cu.k - vel[1] * cu.d) * dt; vel[2] += (dz * cu.k - vel[2] * cu.d) * dt;
      pos[0] += vel[0] * dt; pos[1] += vel[1] * dt; pos[2] += vel[2] * dt;
    }
    var mv = Math.abs(pos[0] - lastPush[0]) + Math.abs(pos[1] - lastPush[1]) + Math.abs(pos[2] - lastPush[2]);
    if (!down) { lastPush[0] = pos[0]; lastPush[1] = pos[1]; lastPush[2] = pos[2]; breakNext = true; }
    else if (mv > 0.02) {
      trail[head * 3] = pos[0]; trail[head * 3 + 1] = pos[1]; trail[head * 3 + 2] = pos[2]; born[head] = t; ttl[head] = life;
      brk[head] = breakNext ? 1 : 0; breakNext = false;
      head = (head + 1) % N; if (count < N) count++;
      lastPush[0] = pos[0]; lastPush[1] = pos[1]; lastPush[2] = pos[2];
    }
    var ex = pos[0] - cam.x, ey = pos[1] - cam.y, ez = pos[2] - cam.z;
    dimByCam = M.smooth(0.5, 3.0, Math.sqrt(ex * ex + ey * ey + ez * ez));
  }

  SID.Seeker = {
    /* c: { S, t, dt, present, nx, ny, curious, writeOn, design, custom }
       custom: the interior drives the ember itself (it writes the wall, then leans toward you) */
    update: function (cam, c) {
      if (c.custom) { customUpdate(cam, c); return; }
      var dt = c.dt, S = c.S, t = c.t;
      launched = M.smoother(0.305, 0.36, S);
      var lead = M.lerp(D0, 3.6, M.smooth(0.47, 0.6, S));
      var bob = SID.env.reduced ? 0 : 1;
      var tx = Math.sin(t * 0.9 + BOB) * 0.05 * bob, ty = Math.cos(t * 0.7 + BOB) * 0.06 * bob;

      /* the door: straight ahead of wherever the visitor is looking */
      var ax, ay, az;
      if (S < 0.47) { ax = tx; ay = ty; az = -D0; }
      else { ax = cam.x + cam.fx * lead; ay = cam.y + cam.fy * lead; az = cam.z + cam.fz * lead; }
      var gx = M.lerp(0, ax, launched), gy = M.lerp(0, ay, launched), gz = M.lerp(0, az, launched);

      /* curiosity: lean toward where the visitor points (further if they press: asking) */
      var cur = c.curious * (c.present ? 1 : 0);
      if (cur > 0) {
        var hh = lead * Math.tan(cam.fov * Math.PI / 360), hw = hh * (cam.W / cam.H);
        var reach = 0.8 + 0.35 * c.press;
        var ox = c.nx * hw * reach * cur, oy = -c.ny * hh * reach * cur;
        gx += cam.rx * ox + cam.ux * oy; gy += cam.ry * ox + cam.uy * oy; gz += cam.rz * ox + cam.uz * oy;
      }

      /* the pen: hold still at the end and it writes the name along the design layer.
         It is kinematic (it rides the stroke) and only marks when the pen is down. */
      var k = 11, d = 5.2, D = c.design, penDown = true;
      if (S < 0.95) { pen.idx = 0; pen.done = false; }
      var wasOn = pen.on;
      pen.on = !!(c.writeOn && D && D.W && !pen.done);
      if (pen.on && !wasOn) breakNext = true;
      life = pen.on || pen.done ? 16 : 3.2;         /* how long a mark made *now* will last */

      if (pen.on) {
        /* walk the path at a constant speed: slowly when drawing, quickly when lifted.
           The index only advances when the pen has actually arrived. */
        var tleft = dt, guard = 0;
        while (tleft > 0 && pen.idx < D.n && guard++ < 80) {
          var ti = pen.idx * 3, ex = D.W[ti] - pos[0], ey = D.W[ti + 1] - pos[1], ez = D.W[ti + 2] - pos[2];
          var dist = Math.sqrt(ex * ex + ey * ey + ez * ez);
          penDown = D.conn[pen.idx] === 1;
          var spd = penDown ? 4.6 : 30, need = dist / spd;
          if (need <= tleft) { pos[0] = D.W[ti]; pos[1] = D.W[ti + 1]; pos[2] = D.W[ti + 2]; tleft -= need; pen.idx++; }
          else { var m = spd * tleft / dist; pos[0] += ex * m; pos[1] += ey * m; pos[2] += ez * m; tleft = 0; }
        }
        vel[0] = vel[1] = vel[2] = 0;
        if (pen.idx >= D.n) { pen.done = true; pen.on = false; }
      } else {
        vel[0] += ((gx - pos[0]) * k - vel[0] * d) * dt;
        vel[1] += ((gy - pos[1]) * k - vel[1] * d) * dt;
        vel[2] += ((gz - pos[2]) * k - vel[2] * d) * dt;
        pos[0] += vel[0] * dt; pos[1] += vel[1] * dt; pos[2] += vel[2] * dt;
      }

      var mv = Math.abs(pos[0] - lastPush[0]) + Math.abs(pos[1] - lastPush[1]) + Math.abs(pos[2] - lastPush[2]);
      if (pen.on && !penDown) { lastPush[0] = pos[0]; lastPush[1] = pos[1]; lastPush[2] = pos[2]; breakNext = true; }
      else if (mv > 0.02) {
        trail[head * 3] = pos[0]; trail[head * 3 + 1] = pos[1]; trail[head * 3 + 2] = pos[2]; born[head] = t; ttl[head] = life;
        brk[head] = breakNext ? 1 : 0; breakNext = false;
        head = (head + 1) % N; if (count < N) count++;
        lastPush[0] = pos[0]; lastPush[1] = pos[1]; lastPush[2] = pos[2];
      }
      /* fade when the camera is standing where the seed was */
      var dx = pos[0] - cam.x, dy = pos[1] - cam.y, dz = pos[2] - cam.z;
      dimByCam = M.smooth(0.5, 3.0, Math.sqrt(dx * dx + dy * dy + dz * dz));
    },

    draw: function (ctx, cam, fs, dpr) {
      var alpha = fs.seekerAlpha * dimByCam;
      var o = OUT, i, idx, havePrev = false, prevX = 0, prevY = 0;
      if (alpha < 0.005) return;

      /* trail: fades by age, not by length, so the written name can stay */
      segCnt.fill(0);
      var now = fs.t, prevIdx = -1;
      for (i = 0; i < count; i++) {
        idx = ((head - 1 - i) % N + N) % N;
        var age = now - born[idx], tl = ttl[idx];
        if (age > tl) { havePrev = false; if (age > 20) break; continue; }
        if (!SID.Cam.project(trail[idx * 3], trail[idx * 3 + 1], trail[idx * 3 + 2], o)) { havePrev = false; continue; }
        var a = Math.pow(1 - age / tl, 1.7) * 0.7 * alpha;
        if (havePrev && a > 0.01 && !brk[prevIdx]) {      /* a break means the pen was lifted between these two */
          var bk = Math.min(BUCKETS - 1, (a * BUCKETS / 0.7) | 0), bo = segCnt[bk] * 4, buf = segBuf[bk];
          buf[bo] = prevX; buf[bo + 1] = prevY; buf[bo + 2] = o[0]; buf[bo + 3] = o[1]; segCnt[bk]++;
        }
        prevX = o[0]; prevY = o[1]; havePrev = true; prevIdx = idx;
      }
      ctx.lineWidth = dpr * (pen.on || pen.done ? 1.7 : 1.15); ctx.lineCap = 'round';
      for (var bk2 = 0; bk2 < BUCKETS; bk2++) {
        var cn = segCnt[bk2]; if (!cn) continue;
        ctx.strokeStyle = rgba(EMBER, Math.min(1, (bk2 + 0.5) / BUCKETS * 0.95));
        ctx.beginPath();
        var bb = segBuf[bk2];
        for (var s = 0; s < cn; s++) { ctx.moveTo(bb[s * 4], bb[s * 4 + 1]); ctx.lineTo(bb[s * 4 + 2], bb[s * 4 + 3]); }
        ctx.stroke();
      }

      /* head */
      if (!SID.Cam.project(pos[0], pos[1], pos[2], o)) return;
      var x = o[0], y = o[1], zc = o[2];
      var sc = M.clamp(D0 / zc, 0.4, 3.2);
      var pulse = SID.env.reduced ? 1 : 0.85 + 0.15 * Math.sin(fs.t * 1.6);
      var r = 3.2 * dpr * sc * pulse;

      /* anamorphic streak: a long horizontal flare, the lens of the piece */
      var sl = 110 * dpr * sc * pulse * (0.7 + 0.3 * (1 - fs.lock) + 0.6 * fs.E);
      var g = ctx.createLinearGradient(x - sl, y, x + sl, y);
      g.addColorStop(0, rgba(EMBER, 0)); g.addColorStop(0.5, rgba(EMBER, 0.36 * alpha)); g.addColorStop(1, rgba(EMBER, 0));
      ctx.fillStyle = g; ctx.fillRect(x - sl, y - 0.6 * dpr, sl * 2, 1.2 * dpr);

      var rg = ctx.createRadialGradient(x, y, 0, x, y, r * 6);
      rg.addColorStop(0, rgba(EMBER, 0.55 * alpha)); rg.addColorStop(0.35, rgba(EMBER, 0.12 * alpha)); rg.addColorStop(1, rgba(EMBER, 0));
      ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, r * 6, 0, 6.2832); ctx.fill();
      ctx.fillStyle = rgba([255, 214, 190], alpha);
      ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, 6.2832); ctx.fill();
    },
    screenPos: function () { var o = [0, 0, 0]; return SID.Cam.project(pos[0], pos[1], pos[2], o) ? o : null; }
  };
})();
