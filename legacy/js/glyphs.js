/* ------------------------------------------------------------------
   glyphs.js  -  a typeface that exists only as geometry.

   Every letter is a handful of strokes on a cap-height-1 grid (y up).
   Arcs are real ellipse arcs; nothing is a font file. Free stroke ends
   receive a short perpendicular "survey tick", so the alphabet reads
   as an engineer's drawing of letters - stems are beams, terminals are
   dimension marks. The same strokes feed the 3D world, the SVG
   micro-type in the margins, and the specimen page.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = (window.SID = window.SID || {});
  var RAD = Math.PI / 180;

  /* ---- tiny stroke DSL ---- */
  function L() {                       /* polyline from flat x,y list */
    var a = arguments, out = [];
    for (var i = 0; i < a.length; i += 2) out.push([a[i], a[i + 1]]);
    return out;
  }
  function A(cx, cy, rx, ry, a0, a1) { /* elliptical arc, degrees, ccw positive */
    var n = Math.max(4, Math.ceil(Math.abs(a1 - a0) / 6)), out = [];
    for (var i = 0; i <= n; i++) {
      var a = (a0 + (a1 - a0) * i / n) * RAD;
      out.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]);
    }
    return out;
  }
  function P() {                       /* join pieces, dropping duplicate joints */
    var out = [];
    for (var s = 0; s < arguments.length; s++) {
      var seg = arguments[s];
      for (var i = 0; i < seg.length; i++) {
        var q = out[out.length - 1], p = seg[i];
        if (q && Math.abs(q[0] - p[0]) < 1e-6 && Math.abs(q[1] - p[1]) < 1e-6) continue;
        out.push([p[0], p[1]]);
      }
    }
    return out;
  }

  var G = {};
  function def(ch, w, strokes, anchor) { G[ch] = { ch: ch, w: w, s: strokes, anchor: anchor || null }; }

  /* ---- capitals ---- */
  def('A', 0.84, [L(0, 0, 0.42, 1, 0.84, 0), L(0.134, 0.32, 0.706, 0.32)], [0.42, 0.51]);
  def('B', 0.62, [L(0, 0, 0, 1),
    P(L(0, 1, 0.3, 1), A(0.3, 0.75, 0.28, 0.25, 90, -90), L(0.3, 0.5, 0, 0.5)),
    P(L(0, 0.5, 0.34, 0.5), A(0.34, 0.25, 0.28, 0.25, 90, -90), L(0.34, 0, 0, 0))]);
  def('C', 0.82, [A(0.46, 0.5, 0.46, 0.5, 40, 320)]);
  def('D', 0.82, [P(L(0, 0, 0, 1, 0.38, 1), A(0.38, 0.5, 0.44, 0.5, 90, -90), L(0.38, 0, 0, 0))]);
  def('E', 0.58, [L(0.58, 1, 0, 1, 0, 0, 0.58, 0), L(0, 0.5, 0.48, 0.5)]);
  def('F', 0.58, [L(0.58, 1, 0, 1, 0, 0), L(0, 0.55, 0.48, 0.55)]);
  def('G', 0.92, [P(A(0.46, 0.5, 0.46, 0.5, 40, 360), L(0.5, 0.5))]);
  def('H', 0.72, [L(0, 0, 0, 1), L(0.72, 0, 0.72, 1), L(0, 0.5, 0.72, 0.5)]);
  def('I', 0.4, [L(0.2, 0, 0.2, 1), L(0, 1, 0.4, 1), L(0, 0, 0.4, 0)]);          /* the I-beam */
  def('J', 0.5, [P(L(0.5, 1, 0.5, 0.32), A(0.25, 0.32, 0.25, 0.32, 0, -180))]);
  def('K', 0.68, [L(0, 0, 0, 1), L(0.64, 1, 0, 0.4), L(0.18, 0.58, 0.68, 0)]);
  def('L', 0.54, [L(0, 1, 0, 0, 0.54, 0)]);
  def('M', 0.8, [L(0, 0, 0, 1, 0.4, 0.36, 0.8, 1, 0.8, 0)]);
  def('N', 0.7, [L(0, 0, 0, 1, 0.7, 0, 0.7, 1)]);
  def('O', 0.92, [A(0.46, 0.5, 0.46, 0.5, 90, 450)]);
  def('P', 0.6, [L(0, 0, 0, 1), P(L(0, 1, 0.3, 1), A(0.3, 0.72, 0.3, 0.28, 90, -90), L(0.3, 0.44, 0, 0.44))]);
  def('Q', 0.92, [A(0.46, 0.5, 0.46, 0.5, 90, 450), L(0.56, 0.22, 0.9, -0.1)]);
  def('R', 0.72, [L(0, 0, 0, 1),
    P(L(0, 1, 0.36, 1), A(0.36, 0.75, 0.3, 0.25, 90, -90), L(0.36, 0.5, 0, 0.5)),
    L(0.3, 0.5, 0.72, 0)]);
  def('S', 0.6, [P(A(0.3, 0.75, 0.3, 0.25, 25, 270), A(0.3, 0.25, 0.3, 0.25, 90, -155))]);
  def('T', 0.8, [L(0, 1, 0.8, 1), L(0.4, 1, 0.4, 0)]);
  def('U', 0.72, [P(L(0, 1, 0, 0.42), A(0.36, 0.42, 0.36, 0.42, 180, 360), L(0.72, 0.42, 0.72, 1))]);
  def('V', 0.8, [L(0, 1, 0.4, 0, 0.8, 1)]);
  def('W', 1.0, [L(0, 1, 0.22, 0, 0.5, 0.62, 0.78, 0, 1, 1)]);
  def('X', 0.7, [L(0, 0, 0.7, 1), L(0, 1, 0.7, 0)]);
  def('Y', 0.72, [L(0, 1, 0.36, 0.5, 0.72, 1), L(0.36, 0.5, 0.36, 0)]);
  def('Z', 0.66, [L(0, 1, 0.66, 1, 0, 0, 0.66, 0)]);

  /* ---- numerals: chamfered, instrument-like ---- */
  def('0', 0.5, [L(0.1, 0, 0.4, 0, 0.5, 0.1, 0.5, 0.9, 0.4, 1, 0.1, 1, 0, 0.9, 0, 0.1, 0.1, 0)]);
  def('1', 0.4, [L(0.06, 0.78, 0.28, 1, 0.28, 0)]);
  def('2', 0.5, [L(0, 0.9, 0.1, 1, 0.4, 1, 0.5, 0.9, 0.5, 0.62, 0, 0, 0.5, 0)]);
  def('3', 0.5, [L(0, 0.9, 0.1, 1, 0.4, 1, 0.5, 0.9, 0.5, 0.6, 0.4, 0.5, 0.16, 0.5), L(0.4, 0.5, 0.5, 0.4, 0.5, 0.1, 0.4, 0, 0.1, 0, 0, 0.1)]);
  def('4', 0.5, [L(0.4, 0, 0.4, 1, 0, 0.34, 0.5, 0.34)]);
  def('5', 0.5, [L(0.5, 1, 0.04, 1, 0, 0.56, 0.4, 0.6, 0.5, 0.5, 0.5, 0.1, 0.4, 0, 0.1, 0, 0, 0.1)]);
  def('6', 0.5, [L(0.46, 1, 0.1, 1, 0, 0.9, 0, 0.1, 0.1, 0, 0.4, 0, 0.5, 0.1, 0.5, 0.44, 0.4, 0.54, 0, 0.54)]);
  def('7', 0.5, [L(0, 1, 0.5, 1, 0.16, 0)]);
  def('8', 0.5, [L(0.1, 0.5, 0, 0.6, 0, 0.9, 0.1, 1, 0.4, 1, 0.5, 0.9, 0.5, 0.6, 0.4, 0.5, 0.1, 0.5, 0, 0.4, 0, 0.1, 0.1, 0, 0.4, 0, 0.5, 0.1, 0.5, 0.4, 0.4, 0.5)]);
  def('9', 0.5, [L(0.04, 0, 0.4, 0, 0.5, 0.1, 0.5, 0.9, 0.4, 1, 0.1, 1, 0, 0.9, 0, 0.56, 0.1, 0.46, 0.5, 0.46)]);
  /* ---- marks ---- */
  def('.', 0.12, [L(0.06, 0, 0.06, 0.09)]);
  def(',', 0.12, [L(0.08, 0.09, 0.04, -0.08)]);
  def('-', 0.42, [L(0, 0.5, 0.42, 0.5)]);
  def(':', 0.12, [L(0.06, 0.06, 0.06, 0.15), L(0.06, 0.6, 0.06, 0.69)]);
  def('/', 0.42, [L(0, 0, 0.42, 1)]);
  def('+', 0.5, [L(0, 0.5, 0.5, 0.5), L(0.25, 0.25, 0.25, 0.75)]);
  def('·', 0.12, [L(0.06, 0.5, 0.06, 0.58)]);
  def('→', 0.9, [L(0, 0.5, 0.9, 0.5), L(0.7, 0.72, 0.9, 0.5, 0.7, 0.28)]);
  def('?', 0.5, [P(A(0.25, 0.74, 0.25, 0.26, 170, -70), L(0.25, 0.44, 0.25, 0.3)), L(0.25, 0, 0.25, 0.09)]);
  def('!', 0.12, [L(0.06, 1, 0.06, 0.3), L(0.06, 0, 0.06, 0.09)]);
  def("'", 0.12, [L(0.06, 1, 0.06, 0.72)]);
  def(';', 0.12, [L(0.06, 0.6, 0.06, 0.69), L(0.08, 0.09, 0.04, -0.08)]);
  def(' ', 0.5, []);

  /* ---- geometry helpers ---- */
  function distPtSeg(px, py, ax, ay, bx, by) {
    var dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
    var t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    var qx = ax + dx * t - px, qy = ay + dy * t - py;
    return Math.sqrt(qx * qx + qy * qy);
  }

  /* survey ticks on every free stroke end */
  var TICK = 0.1;
  function ticksFor(strokes) {
    var out = [];
    for (var si = 0; si < strokes.length; si++) {
      var pts = strokes[si], n = pts.length;
      if (n < 2) continue;
      if (Math.abs(pts[0][0] - pts[n - 1][0]) < 1e-6 && Math.abs(pts[0][1] - pts[n - 1][1]) < 1e-6) continue; /* closed */
      for (var end = 0; end < 2; end++) {
        var ei = end ? n - 1 : 0, ni = end ? n - 2 : 1, adj = end ? n - 2 : 0;
        var e = pts[ei], joined = false;
        for (var sj = 0; sj < strokes.length && !joined; sj++) {
          var q = strokes[sj];
          for (var k = 0; k < q.length - 1; k++) {
            if (sj === si && k === adj) continue;
            if (distPtSeg(e[0], e[1], q[k][0], q[k][1], q[k + 1][0], q[k + 1][1]) < 0.012) { joined = true; break; }
          }
        }
        if (joined) continue;
        var tx = e[0] - pts[ni][0], ty = e[1] - pts[ni][1], tl = Math.sqrt(tx * tx + ty * ty) || 1;
        tx /= tl; ty /= tl;
        var px = -ty, py = tx;                       /* perpendicular to the stroke */
        var dx, dy;
        if (Math.abs(px) >= Math.abs(py)) { dx = 1; dy = 0; } else { dx = 0; dy = 1; }
        out.push([[e[0] - dx * TICK / 2, e[1] - dy * TICK / 2], [e[0] + dx * TICK / 2, e[1] + dy * TICK / 2]]);
      }
    }
    return out;
  }

  /* resample a polyline to ~uniform spacing; returns [[x,y,t],...] with t = 0..1 arc position */
  function resample(pts, ds) {
    var n = pts.length, cum = [0], i;
    for (i = 1; i < n; i++) {
      var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
      cum.push(cum[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    var total = cum[n - 1];
    if (total < 1e-9) return [[pts[0][0], pts[0][1], 0]];
    var count = Math.max(1, Math.round(total / ds)), out = [], j = 1;
    for (i = 0; i <= count; i++) {
      var d = total * i / count;
      while (j < n - 1 && cum[j] < d) j++;
      var seg = cum[j] - cum[j - 1] || 1, u = (d - cum[j - 1]) / seg;
      out.push([pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * u, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * u, d / total]);
    }
    return out;
  }
  function length(pts) {
    var t = 0;
    for (var i = 1; i < pts.length; i++) {
      var dx = pts[i][0] - pts[i - 1][0], dy = pts[i][1] - pts[i - 1][1];
      t += Math.sqrt(dx * dx + dy * dy);
    }
    return t;
  }

  /* ---- word layout ----
     lines: ['SIDDHARTHA'] or ['SIDDH','ARTHA'].
     Origin of the result is the *axis*: the counter of the shared A on a
     single line, or the gap between the rows when stacked. That point is
     the door of the piece. */
  var TRACK = 0.3, LINEGAP = 0.62;
  function layout(lines) {
    var glyphs = [], gi = 0, rowInfo = [];
    lines.forEach(function (text, r) {
      var w = 0, i;
      for (i = 0; i < text.length; i++) w += G[text[i]].w + (i ? TRACK : 0);
      var x = -w / 2, y = -r * (1 + LINEGAP);
      for (i = 0; i < text.length; i++) {
        var g = G[text[i]];
        glyphs.push({ ch: text[i], idx: gi++, row: r, x: x, y: y, w: g.w, cx: x + g.w / 2, cy: y + 0.5 });
        x += g.w + TRACK;
      }
      rowInfo.push({ w: w, y: y });
    });
    var ax, ay;
    if (lines.length === 1) {
      var ga = null;
      for (var k = 0; k < glyphs.length; k++) if (glyphs[k].ch === 'A') { ga = glyphs[k]; break; } /* first A = SIDDH-A */
      ax = ga.x + G.A.anchor[0]; ay = ga.y + G.A.anchor[1];
    } else {
      ax = 0; ay = -LINEGAP / 2;
    }
    var strokes = [], x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    glyphs.forEach(function (g) {
      g.x -= ax; g.y -= ay; g.cx -= ax; g.cy -= ay;
      var src = G[g.ch].s.map(function (pts) {
        return pts.map(function (p) { return [p[0] + g.x, p[1] + g.y]; });
      });
      src.forEach(function (pts) {
        strokes.push({ pts: pts, glyph: g.idx, kind: 'main' });
        pts.forEach(function (p) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; });
      });
      ticksFor(src).forEach(function (pts) {
        strokes.push({ pts: pts, glyph: g.idx, kind: 'tick' });
        pts.forEach(function (p) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; });
      });
    });
    return { glyphs: glyphs, strokes: strokes, bbox: { x0: x0, x1: x1, y0: y0, y1: y1 }, rows: lines.length };
  }

  /* ---- text as strokes (for in-world numerals and DOM micro-type) ---- */
  function textStrokes(str, opts) {
    opts = opts || {};
    var track = opts.track == null ? 0.22 : opts.track, x = 0, out = [];
    for (var i = 0; i < str.length; i++) {
      var g = G[str[i].toUpperCase()] || G[' '];
      g.s.forEach(function (pts) { out.push(pts.map(function (p) { return [p[0] + x, p[1]]; })); });
      if (opts.ticks !== false) ticksFor(g.s).forEach(function (pts) { out.push(pts.map(function (p) { return [p[0] + x, p[1]]; })); });
      x += g.w + track;
    }
    return { strokes: out, width: Math.max(0, x - track) };
  }

  /* markup for a piece of micro-type: real geometry, real text for AT */
  function svg(str, opts) {
    opts = opts || {};
    var t = textStrokes(str, { track: opts.track == null ? 0.3 : opts.track, ticks: false });
    var U = 100, d = '';
    t.strokes.forEach(function (pts) {
      d += 'M' + pts.map(function (p) { return (p[0] * U).toFixed(1) + ' ' + (U - p[1] * U).toFixed(1); }).join('L');
    });
    var wpx = t.width * U;
    return '<svg class="gl" viewBox="-6 -10 ' + (wpx + 12).toFixed(0) + ' 120" role="img" aria-label="' +
      str.replace(/"/g, '') + '" style="aspect-ratio:' + ((wpx + 12) / 120).toFixed(3) + '"><path d="' + d + '"/></svg>';
  }

  SID.Glyphs = { defs: G, layout: layout, resample: resample, length: length, textStrokes: textStrokes, svg: svg, ticksFor: ticksFor, TRACK: TRACK };
})();
