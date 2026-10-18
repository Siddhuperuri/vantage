# ART DIRECTION — MIRACLE SPATIAL

## The idea

**Radiolucence**: material that lets radiation through. The subject is never
drawn. What is drawn is what passed through him. Nothing here is a portrait, a
list of skills, or a hero section with a 3D object behind it.

This continues the original MIRACLE (`legacy/`), which stated the same idea in
2D canvas. It is not a port: the anamorphic placement, the five layers, the
three laws and the geometry-only alphabet are carried over because they are the
work; everything else is rebuilt for real space.

## The one law

> **STILLNESS RESOLVES. MOTION SCATTERS. ATTENTION PULLS.**

It is not a slogan on a screen. It is three numbers in `engine/sim.ts` that
every layer reads, and each layer answers them **differently in kind, not in
degree** — that difference is most of the artistic content:

| layer | verb | motion does | attention does |
| --- | --- | --- | --- |
| **instrument** | MEASURES | does not scatter: extends its guides to measure the error | reveals the true measured numerals, in ember |
| **design** | ARRANGES | comes apart into the strokes it was built from | grows the survey ticks on every terminal |
| **lattice** | COMPUTES | loses resolution: the grid coarsens, letters survive as blocks | refines the grid below its resting pitch |
| **field** | INFERS | disperses back into the prior it was inferred from | collapses the cloud onto the stroke, locally |
| **trace** | SKETCHES | lags behind the gesture and its passes separate | the passes converge into one line |

## The vantage

Every point of every layer sits on the ray from **V\*** `(0,0,0)` through its
home on the word plane at `z = -10`, at a depth chosen by coherent noise.
Projected from V\*, depth cancels: the five layers land on the same pixels and,
being additive light, they **sum** into the name. From anywhere else they are
five sheets of matter at five distances.

Two consequences used throughout:

- moving a point **along** its ray cannot be seen from V\*. That is why each
  layer has real relief and still resolves exactly (unit-tested).
- moving a point **across** its ray is the only thing that breaks the sum. That
  is exactly what motion applies.

The camera rig is three numbers around a pivot, and V\* is simply
`yaw 0, pitch 0, radius 10` — so "return to the vantage" is exact, not
approximate. `DELTA` in the readout is the real distance from it.

## Four places, one space

The work is not four scenes with transitions between them. It is one shaft of
space with four places along it, and the visitor travels. The wheel's own
gesture carries them: once the dolly has nothing left to give it becomes
travel, so forward is simply forward.

| | | what it is for |
| --- | --- | --- |
| I | VANTAGE | the laws. Five layers sum into the name from one point, and only if you stop. |
| II | THE INSIDE | the same idea applied everywhere: a shared letter is an intersection. Typography becomes the room. The five layers return as five stages a letter passes through. |
| III | THE EDGE | everything is put down. Density drops, the camera slows, and what is left is residue: drafts, a survey of the ground, three solids, one sentence. |
| IV | THE DEEP | the floor lets go. The same five layers again, falling past, resampled ever more coarsely the further down you go. |

Two of the four are deliberately quiet, and two of them are left unprinted.
A place that does nothing is doing something.

## Palette

```
GROUND  #0a0908   the dark the piece is made of
PAPER   #e9e2d3   the only colour light is drawn in
EMBER   #ff5c24   the one thing that is curious
```

Ember appears in four places and nowhere else: the ember itself, the light it
casts, a numeral that has just been measured, and a control that is currently
on. The second ink of the riso plate is the same ember, used the same way.

**There is no bloom at the vantage.** The layers are additive light already,
and a blur would turn a measured drawing into a glow, which is the opposite of
the point. Selective glow exists, restrained, in the inside and the deep, where
there are emissive structures for it to find; it is off entirely on the low
tier. Atmosphere is two full-screen draws: a multiply vignette and a stepped
film grain, and the grain stands down whenever a print treatment is running,
because two ways of saying "reproduction" at once is just noise.

## Composition

- The subject sits high in the frame. The void beneath it is deliberate and is
  where the datum plate, the shards and the drawn figure live.
- A datum circle with graduations is engraved on the floor, with a horizon line
  that leaves frame on both sides, so the room has a ground.
- Four posts and two rails stand around the word volume like a specimen holder.
  They are **not** emissive: they are lit only by a dim fill and by the ember,
  so most of the time they are barely there, and when the ember passes, a post
  has a lit side and a dark one.
- Shards are kept strictly out of the subject's silhouette. They are opaque
  matter, and anywhere they overlap the word they punch a black hole through
  additive light.
- Nothing drifts continuously once the world has been found. Before the visitor
  begins, it breathes; after, stillness is real stillness.

## Typography

The alphabet exists only as geometry — strokes on a cap-height-1 grid, real
ellipse arcs, no font file, nothing to load. The same strokes build the subject
in 3D, the in-world layer labels standing on each layer's own plane, the
measured numerals the instrument draws, and the SVG still shown when WebGL is
unavailable. Free stroke ends get a perpendicular survey tick, so the letters
read as an engineer's drawing: stems are beams, terminals are dimension marks.

Interface type is one tracked-out monospace in capitals at micro sizes — a
margin note on a drawing, not a brand. No cursive anywhere.

## What this is not

No purple-and-blue gradients, no glowing spheres, no floating cubes, no
particles without a job, no bloom, no template layout, no decorative technical
text. Every number shown is true: `LOCK`, `STILL`, `ENERGY`, `DELTA` are read
straight out of the simulation, and the numeral on the dimension line is the
measured width of the word.

Press **H** and the whole interface disappears. The scene still reads as a
place, which is the test.
