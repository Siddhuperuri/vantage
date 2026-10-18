/* ------------------------------------------------------------------
   trace.js  -  what the visitor did, kept as behaviour and nothing else.

   The pointer's path (or, without a pointer, where the head is turned),
   how long attention rested at each place, how fast and how often the
   direction changed, which doors were found and which were not. That is
   all. It is never shown as a number and never leaves the device; it is
   only ever turned into a drawing (the scribble at the edge) or into a
   plain sentence that is literally true ("YOU STOPPED HERE").

   The path is stored as samples: x, y in units of the window's height
   (so a wide window and a phone can be compared), and w, the seconds
   attention rested there. It is resampled by arc length when it is
   needed, so a long visit and a short one both become a line of a
   hundred and some points.

   Nothing here infers anything about the person. The piece is allowed
   to say what happened. It is not allowed to say what it means.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID, M = SID.M, Visit = SID.Visit, clamp = M.clamp;

  var MAX = 3200, PX = new Float32Array(MAX), PY = new Float32Array(MAX), PW = new Float32Array(MAX), np = 0;
  var acc = 0, gazeMode = false;
  var stat = { moveT: 0, fastT: 0, dist: 0, turns: 0, ax: 0, ay: 0, first: true };
  var flag = {
    doors: 0,               /* bitmask of the doors that developed this visit */
    doorReturns: 0,         /* a door entered a second time after leaving it */
    letterReturns: 0,       /* attention came back to a letter after having left it */
    opened: false, ended: false,
    slips: 0                /* times the name came apart just after it had come together (Module 1's lock) */
  };

  function push(x, y) {
    if (np >= MAX) {                                        /* very long visits: keep every other point, keep the stops */
      var j = 0;
      for (var i = 0; i < np; i += 2) { PX[j] = PX[i]; PY[j] = PY[i]; PW[j] = PW[i] + (i + 1 < np ? PW[i + 1] : 0); j++; }
      np = j;
    }
    PX[np] = x; PY[np] = y; PW[np] = 0; np++;
  }

  var Trace = SID.Trace = {
    flag: flag, stat: stat,
    get count() { return np; },

    /* o: { dt, inp, gaze: {yaw, pitch} | null } - once per frame */
    update: function (o) {
      var inp = o.inp, dt = o.dt, x, y, have = false;
      if (inp.present) { x = inp.px / inp.h; y = inp.py / inp.h; have = true; gazeMode = false; }
      else if (o.gaze) { x = (0.5 + 0.42 * Math.sin(o.gaze.yaw)) * inp.w / inp.h; y = 0.5 - 0.6 * o.gaze.pitch; have = true; gazeMode = true; }
      if (!have) return;
      var sp = inp.present ? inp.speed : 0;
      if (sp > 0.08) { stat.moveT += dt; if (sp > 1.6) stat.fastT += dt; }
      acc += dt;
      if (acc < 0.08) return;
      acc = 0;
      if (!np) { push(x, y); return; }
      var dx = x - PX[np - 1], dy = y - PY[np - 1], d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0.006) {
        stat.dist += d;
        /* hesitation: a sharp reversal of direction, over a distance that is not just the hand trembling */
        if (d > 0.012) {
          if (!stat.first) { var cs = (dx * stat.ax + dy * stat.ay) / (d * (Math.sqrt(stat.ax * stat.ax + stat.ay * stat.ay) || 1)); if (cs < -0.5) stat.turns++; }
          stat.ax = dx; stat.ay = dy; stat.first = false;
        }
        push(x, y);
      } else PW[np - 1] = Math.min(14, PW[np - 1] + 0.08);            /* attention rests here: the point gets heavier */
    },

    /* ---- what the rest of the piece tells it ---- */
    doorFound: function (i) { flag.doors |= (1 << i); },
    doorReturn: function () { flag.doorReturns++; },
    letterReturn: function () { flag.letterReturns++; },
    opened: function () { flag.opened = true; },
    slip: function () { flag.slips++; Visit.rec.sl = (Visit.rec.sl | 0) + 1; },

    /* ---- the path, as a line: n points spaced by arc length, in a unit square (aspect kept), each with its weight ----
       returns null when the visitor left no line worth drawing */
    scribble: function (n) {
      if (np < 2) return null;
      var i, cum = new Float32Array(np), L = 0;
      for (i = 1; i < np; i++) { var dx = PX[i] - PX[i - 1], dy = PY[i] - PY[i - 1]; L += Math.sqrt(dx * dx + dy * dy); cum[i] = L; }
      if (L < 0.05) return null;
      var out = { x: new Float32Array(n), y: new Float32Array(n), w: new Float32Array(n), n: n }, j = 1, b;
      for (i = 0; i < n; i++) {
        var s = L * i / (n - 1);
        while (j < np - 1 && cum[j] < s) j++;
        var seg = cum[j] - cum[j - 1] || 1, u = clamp((s - cum[j - 1]) / seg, 0, 1);
        out.x[i] = PX[j - 1] + (PX[j] - PX[j - 1]) * u; out.y[i] = PY[j - 1] + (PY[j] - PY[j - 1]) * u;
      }
      for (i = 0; i < np; i++) { if (PW[i] <= 0) continue; b = Math.round(cum[i] / L * (n - 1)); out.w[b] += PW[i]; }
      /* unit square, centred, one scale for both axes */
      var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (i = 0; i < n; i++) { if (out.x[i] < x0) x0 = out.x[i]; if (out.x[i] > x1) x1 = out.x[i]; if (out.y[i] < y0) y0 = out.y[i]; if (out.y[i] > y1) y1 = out.y[i]; }
      var sc = Math.max(x1 - x0, y1 - y0, 0.05), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      for (i = 0; i < n; i++) { out.x[i] = (out.x[i] - cx) / sc; out.y[i] = (out.y[i] - cy) / sc; }
      out.aspect = (x1 - x0) / Math.max(1e-3, y1 - y0);
      return out;
    },

    /* the remembered path from the last visit, as a scribble in the same form (decayed by visit.js) */
    remembered: function () {
      var t = Visit.mem.tr, n = t.length;
      if (n < 4) return null;
      var out = { x: new Float32Array(n), y: new Float32Array(n), w: new Float32Array(n), gap: new Uint8Array(n), n: n };
      for (var i = 0; i < n; i++) { out.x[i] = t[i].x - 0.5; out.y[i] = t[i].y - 0.5; out.w[i] = t[i].w * 14; out.gap[i] = t[i].gap ? 1 : 0; }
      return out;
    },

    /* ---- the sentences that are literally true of this visit ----
       Each is an observation of what happened. None of them says what kind of person does this. */
    lines: function (ctx) {
      var out = [], hosts = ctx.doors || 0, doorsTotal = ctx.doorsTotal || 0, i, longest = 0, li = -1;
      for (i = 0; i < np; i++) if (PW[i] > longest) { longest = PW[i]; li = i; }
      if (doorsTotal && hosts < doorsTotal) out.push('YOU MISSED SOMETHING');
      if (longest > 2.5) out.push('YOU STOPPED HERE');
      var quick = stat.moveT > 6 && stat.fastT / stat.moveT > 0.16;
      if (Visit.returning) out.push('YOU CAME BACK');
      else if (flag.doorReturns + flag.letterReturns > 0) out.push('YOU RETURNED');
      else if (quick) out.push('YOU MOVED QUICKLY');
      if (ctx.hunt) out.push('YOU FOUND SOMETHING IN AN EMPTY CELL');
      if (ctx.looked) out.push('YOU LIT SOMETHING ABOVE THE WALL');
      out.push('YOU LEFT A TRACE');
      return out.slice(0, 5);
    },

    /* the visitor's whole record goes into the visit's own record on save */
    save: function (rec) {
      var s = Trace.scribble(90);
      if (s) {
        var tr = [];
        for (var i = 0; i < s.n; i++) tr.push(Math.round(clamp(s.x[i] + 0.5, 0, 1) * 255), Math.round(clamp(s.y[i] + 0.5, 0, 1) * 255), Math.round(clamp(s.w[i] / 14, 0, 1) * 255));
        rec.tr = tr;
      }
      rec.doors = (rec.doors | 0) | flag.doors;
      if (flag.opened) rec.open = Math.max(rec.open | 0, 1);
      if (flag.ended) rec.end = 1;
    }
  };
  Visit.onSave(Trace.save);
})();
