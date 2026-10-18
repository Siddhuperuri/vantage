/* ------------------------------------------------------------------
   visit.js  -  the piece remembers, and forgets.

   One small record in localStorage, on this device, never sent anywhere.
   There is no network code in this piece at all. It holds only abstract
   behaviour: which
   doors were opened, how far the signature has been drawn, the shape of a
   pointer's path, and whether one door was forced. No name, no identifier
   that leaves the device, nothing about the person: the "id" below is a
   random number that only seeds this browser's own procedural variation.

   Memory here is reconstruction, not storage. Every time the record is
   read it has decayed a little (by time since the last visit, and by being
   read at all), and what is left is jittered, so what comes back is
   recognisable and never exact. Words are never removed by it: decay
   shows as fainter genes and a broken, jittered line, never as a hole in a word.

   Same world, different state: `seed` is different on every visit, and
   Visit.r(name) turns it into a stable number for whoever asks, so the
   hand of the sketches, the order of the writing, the phase of the
   figure and the timing of the writing are different each time and the
   same for the whole of a visit.

   Storage may be missing or refused (private windows, blocked site data).
   Everything works without it; the piece is then simply always a first visit.
   `index.html#forget` wipes the record on load.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = window.SID, M = SID.M;
  var KEY = 'siddhartha.v1', SKEY = 'siddhartha.session';
  var DAY = 86400000;

  function ls() { try { return window.localStorage; } catch (e) { return null; } }
  function ss() { try { return window.sessionStorage; } catch (e) { return null; } }
  function readRaw() { try { var s = ls() && ls().getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } }
  function strHash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  var now = Date.now();
  if (/#forget\b/.test(location.hash)) { try { ls() && ls().removeItem(KEY); ss() && ss().removeItem(SKEY); } catch (e) { /* nothing to forget */ } }

  var raw = readRaw();
  /* Beyond the first version's fields, the record holds what the deeper layers need to remember, and all of it is abstract:
       wa  how long attention rested on each concept (a number per word, 0..255)
       tl  which of the tool rings above the wall were seen (a bit each)      hn  which hidden marks were found (a bit each)
       ar  how far each artifact in the archive resolved (a number each)      fr  which forgotten fragments were found (a bit each)
       dp  the deepest the descent has reached, as a fraction of its depth (0..255)
       cd  and ce: the same for this visit only: how deep, and whether the ending was reached
       pp  the last few paths a pointer made, older ones first (each shaped like tr)
       vl  one line for every earlier visit: which day, how deep it went, whether it ended
       sl  how many times the name broke apart in front of a visitor who had just found it (all visits) */
  var fresh = { v: 1, id: (Math.random() * 4294967296) >>> 0, n: 0, last: now, open: 0, gene: [], doors: 0, end: 0, seen: 0, tr: [],
                wa: [], tl: 0, hn: 0, ar: [], fr: 0, dp: 0, cd: 0, ce: 0, sl: 0, pp: [], vl: [] };
  var rec = raw && raw.v === 1 ? raw : fresh;
  /* whatever is in storage, it is only ever numbers to this piece */
  rec.n = Math.max(0, rec.n | 0); rec.open = rec.open | 0; rec.doors = rec.doors | 0; rec.end = rec.end | 0;
  rec.last = isFinite(+rec.last) && +rec.last > 0 ? +rec.last : now; rec.id = isFinite(+rec.id) ? +rec.id : fresh.id;
  ['gene', 'tr', 'wa', 'ar', 'pp', 'vl'].forEach(function (k) { if (!Array.isArray(rec[k])) rec[k] = []; });
  ['tl', 'hn', 'fr', 'dp', 'cd', 'ce', 'sl'].forEach(function (k) { rec[k] = rec[k] | 0; });
  rec.wa = rec.wa.slice(0, 64).map(function (v) { return Math.max(0, Math.min(255, +v | 0)); });
  rec.ar = rec.ar.slice(0, 64).map(function (v) { return Math.max(0, Math.min(255, +v | 0)); });
  rec.pp = rec.pp.filter(Array.isArray).slice(-3); rec.vl = rec.vl.filter(Array.isArray).slice(-8);
  delete rec.att;                                    /* (an earlier version also kept how long attention rested on each letter; nothing uses it now) */

  /* a page reload within the same tab is the same visit; a new tab or a new day is the next one */
  var sameVisit = false;
  try { sameVisit = !!(ss() && ss().getItem(SKEY)); if (ss()) ss().setItem(SKEY, '1'); } catch (e) { /* no session storage */ }
  var returning = rec.n > 0;
  var gapDays = returning ? Math.max(0, (now - rec.last) / DAY) : 0;
  var pushedPath = false;
  if (!sameVisit || !returning) {
    /* a new visit: the last one becomes something the world remembers rather than something that is happening */
    if (returning) {
      if (rec.tr.length >= 6) { rec.pp.push(rec.tr.slice()); rec.pp = rec.pp.slice(-3); pushedPath = true; }
      rec.vl.push([Math.floor(rec.last / DAY), Math.max(0, Math.min(255, rec.cd | 0)), rec.ce ? 1 : 0]); rec.vl = rec.vl.slice(-8);
      rec.cd = 0; rec.ce = 0;
    }
    rec.n += 1;
  }
  var n = rec.n;

  /* how much of what was remembered survives: time, and the plain fact of having been read again */
  var keep = returning ? Math.exp(-gapDays / 40) * (sameVisit ? 1 : 0.86) : 1;
  var seed = (strHash(rec.id + ':' + n) ^ (now >>> 9)) >>> 0;
  var mem = { gene: [], tr: [], open: rec.open | 0, doors: rec.doors | 0, end: rec.end | 0,
              wa: [], tl: rec.tl | 0, hn: rec.hn | 0, ar: [], fr: rec.fr | 0, dp: (rec.dp | 0) / 255, sl: rec.sl | 0, pp: [], vl: rec.vl.slice() };

  function r(name) { return M.hash(seed & 0x7fffffff, strHash(name) & 0x7fffffff, 11, 5); }

  if (returning) {
    for (var gi = 0; gi < rec.gene.length; gi++) mem.gene.push(gi === 9 ? rec.gene[gi] : rec.gene[gi] * (0.72 + 0.28 * keep));
    /* the last path, as it is remembered: jittered, and broken where the memory failed */
    var sg = 0.008 + 0.03 * (1 - keep), gp = 0.1 + 0.4 * (1 - keep);
    for (var ti = 0; ti + 2 < rec.tr.length; ti += 3) {
      mem.tr.push({
        x: rec.tr[ti] / 255 + (r('tx' + ti) - 0.5) * 2 * sg,
        y: rec.tr[ti + 1] / 255 + (r('ty' + ti) - 0.5) * 2 * sg,
        w: rec.tr[ti + 2] / 255,
        gap: ti > 0 && r('tg' + ti) < gp                              /* the pen lifts here: this stretch was not remembered */
      });
    }
  }

  /* a path as it is remembered: jittered, and broken where the memory failed (the same for the last one and the ones before it) */
  function decode(tr, tag, k) {
    var out = [], sg = 0.008 + 0.03 * (1 - k), gp = 0.1 + 0.4 * (1 - k);
    for (var ti = 0; ti + 2 < tr.length; ti += 3) {
      out.push({ x: tr[ti] / 255 + (r(tag + 'x' + ti) - 0.5) * 2 * sg, y: tr[ti + 1] / 255 + (r(tag + 'y' + ti) - 0.5) * 2 * sg, w: tr[ti + 2] / 255, gap: ti > 0 && r(tag + 'g' + ti) < gp });
    }
    return out;
  }
  if (returning) {
    for (var wi = 0; wi < rec.wa.length; wi++) mem.wa.push(rec.wa[wi] / 255 * (0.55 + 0.45 * keep));
    for (var ai = 0; ai < rec.ar.length; ai++) mem.ar.push(rec.ar[ai] / 255 * (0.55 + 0.45 * keep));
    /* the paths before the last one are older, so they have been read (and so lost a little) more times
       (the last one is mem.tr already: a path just filed away is not shown twice) */
    var older = pushedPath ? rec.pp.slice(0, -1) : rec.pp;
    older.forEach(function (tr, i) { mem.pp.push(decode(tr, 'pp' + i, keep * Math.pow(0.86, older.length - i + 1))); });
  }

  var savers = [], lastSave = 0, noSave = false;
  var Visit = SID.Visit = {
    n: n, hasRecord: returning, returning: returning && !sameVisit, sameVisit: sameVisit,       /* returning: a genuine return, not a reload */ gapDays: gapDays, keep: keep, seed: seed,
    mem: mem,                                     /* what was remembered, already decayed */
    rec: rec,                                     /* what is being written now (systems set their own fields) */
    /* a stable number in [0,1) for this visit and this name */
    r: r,
    rng: function (name) { return M.rng((seed ^ strHash(name)) >>> 0); },
    /* who wants a say in what is written: fn(rec) fills in its own fields */
    onSave: function (fn) { savers.push(fn); },
    save: function (force) {
      if (noSave) return;
      var t = performance.now();
      if (!force && t - lastSave < 9000) return;
      lastSave = t;
      rec.last = Date.now();
      for (var i = 0; i < savers.length; i++) { try { savers[i](rec); } catch (e) { /* a saver must never break the piece */ } }
      try { ls() && ls().setItem(KEY, JSON.stringify(rec)); } catch (e) { /* refused: a first visit, every time */ }
    },
    /* wipes the record and stops writing it for the rest of this page's life */
    forget: function () { noSave = true; try { ls() && ls().removeItem(KEY); ss() && ss().removeItem(SKEY); } catch (e) { /* nothing */ } },
    get persistent() { try { return !!ls(); } catch (e) { return false; } }
  };

  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') Visit.save(true); });
  window.addEventListener('pagehide', function () { Visit.save(true); });
})();
