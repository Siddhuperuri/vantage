/* ------------------------------------------------------------------
   mind-data.js  -  the crossword of a mind: pure data.

   The name is the spine (row 0). Every other word crosses the wall
   through a genuinely shared letter. The layout was found by search
   (see README, "How the wall was made"): every one of the five
   contradictions ended up with both poles inside one field of view.

   Three properties are read off the letters, not asserted:
     * The name crosses five words directly: EXPERIMENTS, 3D, AI,
       CAMERA and ART.
     * EXPERIMENTS and IMAGINATION run the full height of the wall
       and touch CURIOSITY, STRUCTURE, SYSTEMS, ENGINEERING, IDEAS
       and MOTION.
     * Three contradictions are separated by an empty cell in the
       same column. That gap is a place you can rest your attention.

   Resolution ("rho", 0..1) is how far a letter has become:
     0.0-0.2 sketched   0.2-0.4 inferred   0.4-0.6 computed
     0.6-0.8 designed   0.8-1.0 measured
   Each word rests at a natural stage (`nat`) and can never resolve
   beyond its evidence ceiling (`ceil`). The ceiling is how the wall
   stays honest: a concept supported only by a tool in the record can
   never look more finished than that.
   ------------------------------------------------------------------ */
(function () {
  'use strict';
  var SID = (window.SID = window.SID || {});

  /* text, column, row, direction, resting stage, evidence ceiling, evidence kind, wave (writing order) */
  var W = [
    ['SIDDHARTHA', 10, 0, 'A', 0.55, 1.00, 'name', 0],
    /* the five words that cross the name grow first */
    ['EXPERIMENTS', 11, -5, 'D', 0.30, 1.00, 'work', 1],   /* Gravity Playground, experimental WebGL */
    ['3D', 13, -1, 'D', 0.45, 1.00, 'work', 1],            /* WebGL / Three.js work */
    ['AI', 15, 0, 'D', 0.35, 1.00, 'work', 1],             /* PyTorch classification, ORBIT, HELIOS */
    ['CAMERA', 16, -4, 'D', 0.30, 0.70, 'tool', 1],        /* Lightroom only: capped */
    ['ART', 19, 0, 'D', 0.20, 1.00, 'work', 1],            /* visual design collection */
    /* what crosses them */
    ['WEB', 10, -2, 'A', 0.50, 1.00, 'work', 2],
    ['SYSTEMS', 11, 5, 'A', 0.70, 1.00, 'frame', 2],
    ['ENGINEERING', 5, -5, 'A', 0.75, 1.00, 'frame', 2],
    ['STRUCTURE', 3, 2, 'A', 0.80, 1.00, 'frame', 2],
    ['CURIOSITY', 4, 4, 'A', 0.20, 1.00, 'frame', 2],
    ['TECHNOLOGY', 14, -4, 'A', 0.70, 1.00, 'frame', 2],
    ['INTUITION', 17, 2, 'A', 0.15, 1.00, 'frame', 2],
    /* the rest */
    ['IMAGINATION', 8, -5, 'D', 0.15, 1.00, 'frame', 3],
    ['GAMES', 3, -2, 'D', 0.30, 0.75, 'mechanic', 3],       /* the treasure-hunt mechanic only: capped */
    ['MOTION', 3, 0, 'A', 0.40, 0.90, 'tool', 3],           /* Framer / GSAP in the record: capped */
    ['IDEAS', 5, -3, 'A', 0.20, 0.90, 'concept', 3],
    ['CODE', 19, -5, 'D', 0.65, 1.00, 'work', 3],
    ['DESIGN', 23, -1, 'D', 0.50, 1.00, 'work', 3]
  ];

  /* the five contradictions, loose pole first. `gap` lists the empty cells between the two
     poles (the place where holding attention balances them). */
  var PAIRS = [
    { a: 'DESIGN', b: 'TECHNOLOGY', gap: [[23, -3], [23, -2]] },
    { a: 'INTUITION', b: 'SYSTEMS', gap: [[17, 3], [17, 4]] },
    { a: 'ART', b: 'CODE', gap: [[19, -1]] },
    { a: 'CURIOSITY', b: 'STRUCTURE', gap: [[5, 3], [6, 3], [9, 3], [10, 3]] },
    { a: 'IMAGINATION', b: 'ENGINEERING', gap: [] }          /* these two share a letter: I at (8,-5) */
  ];

  /* The hidden law: what a concept does to the space around it. Nothing on screen says so; a hand
     that stirs the wall finds out. Every number is a multiplier on what the world already does.
       k     how hard a letter is held to its place (stiff snaps back; loose keeps swaying)
       d     how quickly its motion is used up
       m     how heavy the ember feels while it rests on the word (heavy is slow, light is eager)
     The contradictions are literally this: each pair sets a stiff word against a loose one. */
  var CONCEPT = {
    STRUCTURE:   { k: 1.9, d: 1.5, m: 1.7 },
    SYSTEMS:     { k: 1.7, d: 1.4, m: 1.6 },
    ENGINEERING: { k: 1.8, d: 1.4, m: 1.7 },
    TECHNOLOGY:  { k: 1.5, d: 1.3, m: 1.4 },
    CODE:        { k: 1.6, d: 1.3, m: 1.5 },
    INTUITION:   { k: 0.55, d: 0.65, m: 0.55 },
    IMAGINATION: { k: 0.5, d: 0.6, m: 0.5 },
    IDEAS:       { k: 0.7, d: 0.75, m: 0.65 },
    ART:         { k: 0.65, d: 0.7, m: 0.6 },
    CURIOSITY:   { k: 0.6, d: 0.7, m: 0.5 },
    EXPERIMENTS: { k: 0.85, d: 0.55, m: 0.8 },
    MOTION:      { k: 0.9, d: 0.6, m: 0.55 }
  };
  var NEUTRAL = { k: 1, d: 1, m: 1 };

  /* the counters (holes) of the letters that can be doors: cx, cy, r in glyph units */
  var COUNTERS = {
    A: [0.42, 0.50, 0.17], D: [0.40, 0.50, 0.30], O: [0.46, 0.50, 0.34],
    P: [0.30, 0.72, 0.19], R: [0.36, 0.75, 0.19], B: [0.30, 0.75, 0.19]
  };

  /* which letter opens onto which memory; `word` + the cell make it unambiguous */
  var HOSTS = [
    { c: 15, r: 0, mem: 'pipeline' },     /* the A of AI: also the door of Module 1 */
    { c: 13, r: 0, mem: 'sphere' },       /* the D of 3D */
    { c: 16, r: -3, mem: 'eye' },         /* an A of CAMERA */
    { c: 19, r: -4, mem: 'gravity' },     /* the O where TECHNOLOGY meets CODE */
    { c: 8, r: 4, mem: 'route' },         /* the O where IMAGINATION meets CURIOSITY */
    { c: 23, r: -1, mem: 'wireframe' },   /* the D of DESIGN */
    { c: 11, r: -3, mem: 'solar' },       /* the P of EXPERIMENTS */
    { c: 19, r: 0, mem: 'type' },         /* the A where ART meets the name */
    { c: 4, r: 0, mem: 'ghost' }          /* an O of MOTION: something intended, nothing found yet */
  ];

  /* what each memory may say about itself, and only what the record supports */
  var INSCRIPTIONS = {
    pipeline: ['ORBIT', 'IN DEVELOPMENT'],
    sphere: ['MORPHING SPHERE', 'WEBGL'],
    eye: ['VIGIL-88', ''],
    gravity: ['COSMOS ENGINE', ''],
    route: ['TRAVELEASE', ''],
    wireframe: ['PETPONKS', ''],
    solar: ['HELIOS', 'IN DEVELOPMENT'],
    type: ['TYPOGRAPHY', ''],
    ghost: ['NOT YET', '']
  };

  SID.MindData = {
    N: 32,                 /* columns around the wall */
    ROWS: [-5, 5],
    words: W.map(function (w) {
      return { text: w[0], c: w[1], r: w[2], dir: w[3], nat: w[4], ceil: w[5], evidence: w[6], wave: w[7] };
    }),
    pairs: PAIRS,
    counters: COUNTERS,
    hosts: HOSTS,
    inscriptions: INSCRIPTIONS,
    concept: CONCEPT, neutral: NEUTRAL
  };
})();
