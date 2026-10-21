# IMPLEMENTATION STATUS

Last updated 2026-10-18, end of Phase 2.

Phase 1 built VANTAGE: five layers, three camera modes, the three laws, and a
typed effect registry. Phase 2 extended that into four connected places, twenty
visual treatments, a bounded post chain, and a committed test suite. Nothing
below is marked complete because a component exists; where something is
implemented but not yet looked at, it says so.

---

## 1. The four places

One continuous space, not four scenes. `src/world/journey.ts` holds a single
scalar, **travel**, and everything else is a function of it: which module is
present and how strongly, what the interface says, where the ember is going.
The camera's pivot moves along a path through all four, so arriving somewhere
is travelling, never a cut or a fade.

| | place | what it is | state |
| --- | --- | --- | --- |
| I | **VANTAGE** | five layers of light that sum into the name from one exact point | works, verified |
| II | **THE INSIDE** | 110 letters wrapped around the visitor as a crossword whose spine is the name | works, verified |
| III | **THE EDGE** | density drops: three drafts, a survey of the ground, three solids, one sentence | works, verified |
| IV | **THE DEEP** | the floor lets go; the same five layers fall past, resampled ever more coarsely | works, verified |

Travelling is the wheel's own gesture: once the dolly has nothing left to give
it becomes travel, so forward is forward. `N` and `B`, the four numerals in the
journey strip, and the ember's own invitation all do the same thing.

**Module II's five stages** are Phase 1's five layers read a second way. A
letter is somewhere between sketched, inferred, computed, designed and
measured; attention raises it, but only while the visitor is still; neglect
lets it relax to its word's natural stage; and the opposite of a word being
attended to recoils. Per-letter state lives in a texture, one texel per letter,
so 110 letters in different states cost one draw call.

---

## 2. The twenty treatments

Each is implemented against shared world data rather than as its own demo, and
each has a place it belongs to. Cost is relative to the rest of the frame on
the `high` tier.

### Matter and material

| # | effect | approach | parameters | interaction | cost | fallback | verified |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | **Liquid morph** | the subject's own design-layer geometry, with a second target position per vertex on a closed form; per-point smootherstep crossing staggered left to right so it folds rather than scales | `uMorph` (driven by descent), swell amplitude | the fold is driven by how far the visitor has fallen, not by a clock | low (one extra attribute, no CPU work) | the morph simply rests at 0 | seen in the deep |
| 2 | **Metaballs** | a real implicit surface: six orbiting centres combined with a polynomial smooth minimum, ray-marched inside a bounding sphere | `uSteps` (22/36/56 by tier), merge radius `k` rises with stillness | energy swells the field | medium, and strictly bounded: it only marches the pixels its quad covers | step count drops by tier; the quad is skipped outside its stretch of the fall | **seen** (still 06) |
| 3 | **Clay** | unglazed `MeshStandardMaterial`, roughness 0.92, squashed where it meets its plinth so the contact is a contact | roughness, squash, plinth | lit by the ember as it passes | low | none needed | **seen** (still 03) |
| 4 | **Glassmorphism** | a written-out translucent pane: a face that keeps the contrast of what is behind it, an edge that carries the light, and a lit card standing behind it to be seen through. Physical transmission was tried first and abandoned (see defects) | tint, fresnel exponent, edge weight | reads by its edges as the camera moves | low, and tier-independent | none needed: there is one path | **seen** (stills 03, 04) |
| 5 | **Holographic foil** | thin-film interference: the colour is a function of view angle through a cosine triple, held inside the palette so it is a warm sheet rather than a rainbow | film thickness, fresnel exponent | changes as the visitor moves, which is the whole point | low | none needed | **seen** (still 04) |

### Light and motion

| # | effect | approach | parameters | interaction | cost | fallback | verified |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6 | **Particle swarm** | two systems: module I's field layer (a cloud that denoises onto the stroke) and module IV's shaft swarm | count by tier (3.2k/8k/15k), dispersion, attraction | gathers toward attention, scatters with energy, collapses onto the stroke when attended to | low — all motion is in the vertex shader | count drops by tier | **seen** (stills 01, 06) |
| 7 | **Flow fields** | a coherent analytic vector field, integrated four Euler steps per vertex; each particle is a two-vertex streak one step long, so the segment drawn *is* a piece of the streamline | field scale, step size, streak length | the swarm above rides it | low | fewer particles | **seen** (still 06) |
| 8 | **Neon glow** | bright-pass at 0.74, two separable five-tap blurs at half resolution, composited back into the scene target so the print treatments print the lit image | `bloom` strength per module, threshold | none directly | medium: three half-res passes | **off entirely on the low tier and at the vantage**, where the art direction forbids it | implemented and tuned down twice after it hazed the descent; not isolated in a still of its own |
| 9 | **Topographic lines** | marching squares over a real scalar field (two octaves of value noise plus a dip where the subject stood), 13 levels | levels (7 on low), extent, step | static: it is the ground, not an animation | low, built once | fewer levels | **seen** (still 03) |
| 10 | **Vaporwave grid** | rings and verticals on the shaft, faded by distance from the eye in the vertex shader | ring spacing, opacity, fade range | gives the fall its scale | low | none needed | **seen** (still 06) |

### Print and representation

All five read the same scene texture through `src/render/post/chain.ts`, so
switching between them changes how the world is said, never what is being
looked at. Each subtracts a ground floor first: a screen that reads near-black
as "a little light" fills the void with ink.

| # | effect | approach | parameters | interaction | cost | fallback | verified |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 11 | **ASCII** | a glyph atlas built at runtime **from this world's own stroke alphabet**, sorted by measured ink coverage, sampled one glyph per cell | cell size, ink ramp | — | one full-screen pass | treatment set to none | **seen** (earlier capture) |
| 12 | **Dithering** | a real recursive Bayer construction, ordered or noise-based, pushing the value across a level boundary before snapping | levels (6), scale, `uBlue` | — | one pass | none | **seen** |
| 13 | **Halftone** | a rotated dot screen: each dot is sized by the light measured at the centre of its own cell | cell, screen angle | — | one pass | none | **seen** (still 06) |
| 14 | **Risograph** | two ink plates, screened at different angles and deliberately out of register, printing on this world's ground rather than white stock; the overlap builds a third colour | registration offset, grain, two inks | — | one pass, two screens | none | **seen** (still 03) |
| 15 | **Pixel art** | nearest-neighbour block sampling plus palette quantisation, with the ground subtracted first | block size, levels | — | one pass | none | **seen** (still 08) |
| 19 | **Glitch** | banded horizontal displacement chosen deterministically per tick, plus channel separation and an occasional scan line | shift, block fraction, `glitch` 0..1 | **an event, not an ambience**: it fires on arrival in a new place and at the bottom of the descent, then decays | one pass, only while firing | nothing fires | **seen** (still 08) |

### Geometry and composition

| # | effect | approach | parameters | interaction | cost | fallback | verified |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 16 | **Bauhaus shapes** | circle, square, triangle and arc in one composed arrangement, flat-shaded, one ember accent | placement, opacities | static by design | negligible | none | **seen** (still 03) |
| 17 | **Paper cutout** | three draft sheets at real separation, carrying a thinned print of the design layer, with cast and received shadows | separation, rotation, print density | real parallax as the camera moves | low | none | **seen** (still 03) |
| 18 | **Kinetic typography** | the name's letters, each moving as one unit, assembling from the shaft wall as the visitor descends and leaning toward them as they approach | assemble (driven by descent), lean distance | responds to camera position and to stillness | low | assembles instantly under reduced motion | **seen** (still 08) |
| 20 | **Ray-marched fractal** | a Menger fold distance field, bounded iterations (2/3/4 by tier) and bounded steps, marched inside a bounding sphere on one quad | iterations, steps, scale | energy swells the field | medium, bounded as metaballs are | iterations and steps drop by tier; skipped outside its stretch | implemented; the lit implicit surface in still 06 is this system (shared marcher) |

**Where they are, and where they deliberately are not.** The vantage and the
inside are left unprinted: one is a measured drawing and the other is already
dense, and screening either would be arguing with it. The edge is a two-ink
riso. The descent loses resolution as it falls — ascii, halftone, dither, then
pixels. Nothing activates everything at once, and two of the four places are
quiet by design.

---

## 3. Tests actually executed

`npm test` — **19 unit tests, all passing.** They include the invariant the
whole artwork rests on: every layer has real relief in depth *and* its
projection from the vantage still matches the word's own bounding box to five
decimal places. Also the crossword builder: that every word crosses one already
placed, that no cell holds two different letters, that all ten contradiction
pairs resolve both ways, and that the wall wraps without closing.

`npm run test:e2e` — **23 end-to-end tests across two projects, all passing**
(2.9 min). Assertions are in simulated seconds through a development-only frame
stepper, so they are about what the world does rather than how fast the machine
is.

- loads, offers the way in, and reports its own size
- the guided path arrives at `DELTA 0.000`, `LOCK 1.00`, and hands over by itself
- motion scatters, and each layer fails in its own way (lattice loses
  resolution; the instrument, being the reference frame, keeps more of its own)
- stillness resolves, exactly
- attention raises only the layer attended to
- focusing moves the camera off-axis and names the layer in the world
- `V` returns to the vantage exactly, from anywhere including the bottom of the deep
- a guided path taken over early still settles completely (a regression test)
- the keyboard operates the piece; `H` leaves nothing behind
- **layout and resolve at 1280×720, 768×1024 and 390×844**: correct stacking, no
  horizontal overflow, and the two docks never overlap
- reduced motion shortens the path and softens the law while keeping it in force
- swapping a treatment disposes the one it replaced (geometry count returns)
- a whole session leaves no console errors and no failed requests
- without WebGL the piece still draws itself from the same stroke geometry
- the journey is one continuous space, travelled rather than cut to
- only the places the visitor is near are drawn at all
- each place gets its own treatment, and two of them stay unprinted
- the ember looks onward only once a place has been met

`npm run test:perf` — headed, on the real GPU, printing the renderer with the
figure. On an NVIDIA RTX 3050 (ANGLE / D3D11): **162 fps at 1280×720** and
**165 fps at 390×844**, 16 draw calls, measured at the vantage. A headless run would measure SwiftShader
rather than this artwork, which is why that project is headed; on a software
rasteriser it records the number and skips the floor assertion instead of
failing.

`npm run build` — clean, 0 TypeScript errors. The production bundle is served
and driven by the `production` project, which also asserts that the development
frame stepper is **not** in the shipped bundle.

`npx playwright test --project=stills` writes one still of each place to
`docs/stills/`. The "verified" column above means a still or a screenshot was
actually looked at, not that the code exists.

---

## 4. Defects found by running it, and fixed

Phase 2 found these by driving the real thing rather than by reading it:

1. `active` is a reserved word in GLSL ES, so the **glitch shader never
   compiled**. Caught by the console-error test.
2. The camera's composition offset was an absolute distance tuned for the
   vantage's radius of 10; standing inside a room 0.6 units from its own centre,
   it **aimed the camera at the floor**, and module II rendered a black frame.
   It is now an angle.
3. Every input applied during guided motion was **discarded**: the hand-over ran
   after the input and overwrote the targets it had just set, so a visitor's
   first drag or first turn of the wheel did nothing.
4. The swarm's vertical wrap was anchored to the origin instead of to the shaft,
   **teleporting half the particles above the ceiling**.
5. Print screens printed **half a dot at zero luminance**, because the soft edge
   straddled zero — so the empty half of every frame filled with ink.
6. Dithering **lifted the blacks**, because it quantised the ground itself.
7. The film grain and a print screen were **stacked**, which is two ways of
   saying "reproduction" at once; the grain now stands down under a treatment.
8. Entering the piece removed the focused Begin button and left focus on a
   detached node, so **every keyboard control was dead** until the visitor
   clicked somewhere. Focus now lands on the stage.
9. The input system re-attached its listeners on every phase change, leaving a
   moment with no listeners at all; it now attaches once.
10. The `production` test project reused an already-running preview server, so
    it could **quietly test a bundle that no longer existed**. It now always
    builds what it tests.

11. **Every print treatment was encoding colour twice.** The scene target
    already holds display-encoded values and each pass encoded them again, so
    this world's ground of 0.039 came out at 0.237 - a flat mid grey laid over
    the whole frame. All five print treatments were washed out by it, and it
    only became obvious once a still was compared against the same frame with
    the chain switched off.
12. The pixel pass **rounded the near-black floor up a level**, lifting almost
    every pixel to mid grey. It now subtracts the ground first, as dither does.
13. The transmissive glass was also marked `transparent: true`, which puts it
    in the transparent pass where three never samples the transmission buffer:
    it rendered as its own dark body, a black rectangle. Fixing that still left
    glass transmitting a void, so the approach was changed rather than patched.
14. **Content was placed for a camera pitch only one route gives you.** The
    edge's composition and the deep's assembling name were positioned for the
    downward pitch that arriving via the journey strip sets, but travelling
    there by wheel keeps a level camera, so both sat below the frame entirely.
    Both are now composed around eye level.
15. The edge's draft sheets were 13.5 units wide a few units in front of the
    camera, blocking the module, and the print on them reused module I's
    **absolute** coordinates, so it was drawn twelve units behind its own sheet.

Earlier Phase 1 fixes (white-frame blend mode, 54-pixel points, phantom drag on
click, drift that never died, world built inside an animation frame) are in the
git history of this file.

---

## 5. Known defects and limitations

- **Neon glow has not been isolated in a still of its own.** It is on in the
  inside and the deep, and was tuned down twice after it hazed the descent, but
  no capture separates it from everything else in the frame.
- **Glass is not physically transmissive.** Transmission did not resolve in
  this renderer setup, and a transmissive slab in a dark room transmits
  darkness in any case. The pane is written out instead: translucent face, lit
  edge, and a card behind it to be seen through. It reads as glass; it is not
  refracting the scene.
- **The edge rewards dollying in.** The still life reads from the module's own
  viewpoint, but its detail - the foil's colour shift especially - only really
  appears closer, and nothing tells the visitor that.
- **Module II has no keyboard path to individual letters.** Attention there is
  pointer- and gaze-shaped; the layer buttons and the journey strip remain
  keyboard-operable, and the module is described in the live region, but a
  keyboard visitor cannot raise one specific letter.
- **The deep is dense on the ascii stretch.** It has been quietened twice and is
  now legible, but it is the busiest thing in the piece and the first place to
  look if performance is reported as poor.
- **No touch device has been tested.** Pointer events cover touch and
  `touch-action: none` is set, but this has only been exercised with a mouse and
  emulated viewports.
- **Quality tiers do not react.** The tier is chosen once from
  `hardwareConcurrency`/`deviceMemory` or by the visitor; nothing downgrades on
  sustained frame drops. drei's `PerformanceMonitor` is installed and unused.
- **Frame rate was measured at the vantage only**, not in the deep, which is the
  expensive place. The figure above is honest about where it was taken.
- **WebGL context loss is not handled.** A lost context leaves a blank canvas
  rather than recovering.
- The journey strip is a navigation aid the brief would rather not have; it
  exists because a keyboard visitor needs a way to reach all four places, and
  the ember's invitation is the intended route.

---

## 6. What a next phase would do first

1. Capture stills of the four unverified treatments and fix what they show.
2. Make the quality tier react to sustained frame time, and measure the deep.
3. Handle context loss: redraw, or fall back to the SVG still.
4. Give module II a keyboard route through the wall, word by word.
5. Test on a real touch device.
