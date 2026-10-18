/* ------------------------------------------------------------------
   sprites.js  -  immediate-mode light.

   The interior (the wall of letters and the memories behind their
   counters) is rebuilt every frame from the current physical state.
   Everything is pushed here as world-space segments and dots, then
   projected and drawn in one pass: additive, batched by alpha, width
   and colour with a counting sort, so thousands of primitives cost a
   couple of hundred canvas strokes.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID, M = SID.M, D0 = SID.Cam.D0;

  var CAP_S = 44000, CAP_D = 26000;
  var SEG = new Float32Array(CAP_S * 8);        /* x0 y0 z0 x1 y1 z1 alpha meta(width*2+colour) */
  var DOT = new Float32Array(CAP_D * 6);        /* x y z alpha size colour */
  var PRJ = new Float32Array(CAP_S * 4);        /* projected x0 y0 x1 y1 */
  var SORT = new Float32Array(CAP_S * 4);
  var segBk = new Int16Array(CAP_S), dotBk = new Int16Array(CAP_D);
  var DPX = new Float32Array(CAP_D * 3);
  var CNT = new Int32Array(2);                  /* [segments, dots] in use this frame */

  var NB = 10, AMAX = 0.95;
  var NSEG_BK = NB * 3 * 2 * 2;                 /* alpha x width x near/far x colour */
  var cntS = new Int32Array(NSEG_BK + 1), cntD = new Int32Array(NB * 2 + 1);
  var POS_S = new Int32Array(NSEG_BK), POS_D = new Int32Array(NB * 2);
  var PAPER = SID.C.PAPER, EMBER = SID.C.EMBER, rgba = M.rgba;
  var WIDTH = [0.85, 1.2, 1.75];

  var Sprites = SID.Sprites = {
    /* the buffers themselves, for the one caller (letters.js) that pushes tens of thousands of primitives a
       frame and writes them directly: a call with nine numeric arguments boxes every one of them */
    SEG: SEG, DOT: DOT, CNT: CNT, CAP_S: CAP_S, CAP_D: CAP_D,
    get segs() { return CNT[0]; }, get dots() { return CNT[1]; },
    reset: function () { CNT[0] = 0; CNT[1] = 0; },

    seg: function (x0, y0, z0, x1, y1, z1, a, wc, col) {
      var ns = CNT[0];
      if (ns >= CAP_S || a < 0.006) return;
      var o = ns * 8;
      SEG[o] = x0; SEG[o + 1] = y0; SEG[o + 2] = z0; SEG[o + 3] = x1; SEG[o + 4] = y1; SEG[o + 5] = z1;
      SEG[o + 6] = a; SEG[o + 7] = (wc | 0) * 2 + (col ? 1 : 0);
      CNT[0] = ns + 1;
    },
    /* size is in world units; the dot never draws smaller than about a pixel */
    dot: function (x, y, z, a, size, col) {
      var nd = CNT[1];
      if (nd >= CAP_D || a < 0.006) return;
      var o = nd * 6;
      DOT[o] = x; DOT[o + 1] = y; DOT[o + 2] = z; DOT[o + 3] = a; DOT[o + 4] = size; DOT[o + 5] = col ? 1 : 0;
      CNT[1] = nd + 1;
    },
    /* a circle in the plane spanned by unit vectors (ax,ay,az) and (bx,by,bz) */
    ring: function (cx, cy, cz, ax, ay, az, bx, by, bz, r, n, a, wc, col, a0, a1) {
      var s = a0 || 0, e = a1 == null ? 6.283185307 : a1, px = 0, py = 0, pz = 0;
      for (var i = 0; i <= n; i++) {
        var t = s + (e - s) * i / n, c = Math.cos(t) * r, sn = Math.sin(t) * r;
        var x = cx + ax * c + bx * sn, y = cy + ay * c + by * sn, z = cz + az * c + bz * sn;
        if (i) Sprites.seg(px, py, pz, x, y, z, a, wc, col);
        px = x; py = y; pz = z;
      }
    },

    /* project, cull, bucket, draw */
    flush: function (ctx, cam, DPR, lineScale) {
      var W = cam.W, H = cam.H, F = cam.F, cx = cam.cx, cy = cam.cy, near = cam.near;
      var fx = cam.fx, fy = cam.fy, fz = cam.fz, rx = cam.rx, ry = cam.ry, rz = cam.rz, ux = cam.ux, uy = cam.uy, uz = cam.uz;
      var camx = cam.x, camy = cam.y, camz = cam.z, mg = 60 * DPR, i, k, ns = CNT[0], nd = CNT[1];

      /* ---- segments ---- */
      cntS.fill(0);
      for (i = 0; i < ns; i++) {
        var o = i * 8;
        var dx0 = SEG[o] - camx, dy0 = SEG[o + 1] - camy, dz0 = SEG[o + 2] - camz;
        var dx1 = SEG[o + 3] - camx, dy1 = SEG[o + 4] - camy, dz1 = SEG[o + 5] - camz;
        var z0 = dx0 * fx + dy0 * fy + dz0 * fz, z1 = dx1 * fx + dy1 * fy + dz1 * fz;
        if (z0 < near || z1 < near) { segBk[i] = -1; continue; }
        var i0 = F / z0, i1 = F / z1;
        var x0 = cx + (dx0 * rx + dy0 * ry + dz0 * rz) * i0, y0 = cy - (dx0 * ux + dy0 * uy + dz0 * uz) * i0;
        var x1 = cx + (dx1 * rx + dy1 * ry + dz1 * rz) * i1, y1 = cy - (dx1 * ux + dy1 * uy + dz1 * uz) * i1;
        if ((x0 < -mg && x1 < -mg) || (x0 > W + mg && x1 > W + mg) || (y0 < -mg && y1 < -mg) || (y0 > H + mg && y1 > H + mg)) { segBk[i] = -1; continue; }
        var zc = (z0 + z1) * 0.5;
        var att = Math.pow(D0 / zc, 0.5); att = att < 0.4 ? 0.4 : att > 2 ? 2 : att;
        var nf = zc >= near * 6 ? 1 : (zc - near) / (near * 5);
        var a = SEG[o + 6] * att * nf;
        var b = (a * NB / AMAX) | 0; if (b >= NB) b = NB - 1;
        if (a < 0.006) { segBk[i] = -1; continue; }
        var meta = SEG[o + 7] | 0, col = meta & 1, wc = meta >> 1;
        var nr = zc < D0 * 0.6 ? 1 : 0;
        k = (((col * 3 + wc) * 2 + nr) * NB) + b;
        segBk[i] = k; cntS[k + 1]++;
        var p = i * 4; PRJ[p] = x0; PRJ[p + 1] = y0; PRJ[p + 2] = x1; PRJ[p + 3] = y1;
      }
      for (k = 0; k < NSEG_BK; k++) cntS[k + 1] += cntS[k];
      /* place */
      var pos = POS_S; pos.fill(0);
      for (i = 0; i < ns; i++) {
        k = segBk[i]; if (k < 0) continue;
        var dst = (cntS[k] + pos[k]++) * 4, p2 = i * 4;
        SORT[dst] = PRJ[p2]; SORT[dst + 1] = PRJ[p2 + 1]; SORT[dst + 2] = PRJ[p2 + 2]; SORT[dst + 3] = PRJ[p2 + 3];
      }
      ctx.lineCap = 'round';
      for (k = 0; k < NSEG_BK; k++) {
        var start = cntS[k], end = cntS[k + 1]; if (end === start) continue;
        var bb = k % NB, rest = (k / NB) | 0, nr2 = rest % 2, rest2 = (rest / 2) | 0, wc2 = rest2 % 3, col2 = (rest2 / 3) | 0;
        ctx.strokeStyle = rgba(col2 ? EMBER : PAPER, Math.min(1, (bb + 0.5) / NB * AMAX));
        ctx.lineWidth = WIDTH[wc2] * DPR * lineScale * (nr2 ? 1.35 : 1);
        ctx.beginPath();
        for (var s = start; s < end; s++) { var q = s * 4; ctx.moveTo(SORT[q], SORT[q + 1]); ctx.lineTo(SORT[q + 2], SORT[q + 3]); }
        ctx.stroke();
      }

      /* ---- dots (squares) ---- */
      cntD.fill(0);
      for (i = 0; i < nd; i++) {
        var od = i * 6;
        var ddx = DOT[od] - camx, ddy = DOT[od + 1] - camy, ddz = DOT[od + 2] - camz;
        var zc2 = ddx * fx + ddy * fy + ddz * fz;
        if (zc2 < near) { dotBk[i] = -1; continue; }
        var ii = F / zc2, sx = cx + (ddx * rx + ddy * ry + ddz * rz) * ii, sy = cy - (ddx * ux + ddy * uy + ddz * uz) * ii;
        if (sx < -mg || sx > W + mg || sy < -mg || sy > H + mg) { dotBk[i] = -1; continue; }
        var att2 = Math.pow(D0 / zc2, 0.5); att2 = att2 < 0.4 ? 0.4 : att2 > 2 ? 2 : att2;
        var nf2 = zc2 >= near * 6 ? 1 : (zc2 - near) / (near * 5);
        var a2 = DOT[od + 3] * att2 * nf2;
        if (a2 < 0.006) { dotBk[i] = -1; continue; }
        var b2 = (a2 * NB / AMAX) | 0; if (b2 >= NB) b2 = NB - 1;
        dotBk[i] = ((DOT[od + 5] | 0) * NB) + b2; cntD[dotBk[i] + 1]++;
        /* grain stays grain: close up, a cell grows but never becomes a block */
        var pd = i * 3; DPX[pd] = sx; DPX[pd + 1] = sy; DPX[pd + 2] = Math.min(13 * DPR, Math.max(1.2 * DPR, DOT[od + 4] * ii));
      }
      for (k = 0; k < NB * 2; k++) cntD[k + 1] += cntD[k];
      var posD = POS_D, sortD = SORT;                     /* reuse: x y size triples */
      posD.fill(0);
      for (i = 0; i < nd; i++) {
        k = dotBk[i]; if (k < 0) continue;
        var dd = (cntD[k] + posD[k]++) * 3, pp = i * 3;
        sortD[dd] = DPX[pp]; sortD[dd + 1] = DPX[pp + 1]; sortD[dd + 2] = DPX[pp + 2];
      }
      for (k = 0; k < NB * 2; k++) {
        var st = cntD[k], en = cntD[k + 1]; if (en === st) continue;
        ctx.fillStyle = rgba((k / NB | 0) ? EMBER : PAPER, Math.min(1, ((k % NB) + 0.5) / NB * AMAX));
        for (var d = st; d < en; d++) { var r3 = d * 3, sz = sortD[r3 + 2], h = sz / 2; ctx.fillRect(sortD[r3] - h, sortD[r3 + 1] - h, sz, sz); }
      }
    }
  };
})();
