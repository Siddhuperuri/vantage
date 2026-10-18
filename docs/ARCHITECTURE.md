# ARCHITECTURE

React 18 · TypeScript · Vite 5 · three 0.180 · @react-three/fiber 8 ·
@react-three/drei 9 · Vitest. No backend, no analytics, no state library, no
font files, no textures, no network at runtime.

> R3F 9 requires React 19; R3F 8 + drei 9 is the React 18 pair. That was
> checked against the registry before installing rather than assumed.

## Layering

```
src/world/    pure data. No three, no React. Unit-testable.
src/engine/   simulation, input, quality, frame order, effect registry types.
src/render/   everything that builds three objects, including effect definitions.
src/ui/       ordinary accessible HTML. Never drawn in WebGL.
```

`world/` never imports `render/`. The rule that matters: **the world data does
not know how it will be drawn.** `world/vantage.ts` produces typed arrays —
`LineData`, `CellData`, `PointCloud` — and a `PointCloud` can be handed to any
treatment that wants it.

## One frame, one owner

`render/Director.tsx` holds **the only `useFrame` in the piece**, at render
priority 1, which hands rendering over to it. Everything else registers an
update at a declared order through `engine/systems.ts`:

```
 0 input decay   10 camera   20 the laws   30 layers   40 ember, labels   90 effects
                                                       then one gl.render
```

This is why the camera cannot be written by two things in the same frame, and
why there is no mount-order dependency anywhere. The whole frame body is a
plain function held in a ref, so in development `window.__vantage.step(dt, n)`
can drive it with a fixed dt — which is how the camera path and the laws were
verified, rather than by watching and hoping.

## The journey

`src/world/journey.ts` is one scalar, **travel**, and a path through space.
Four modules sit at four points on it; `moduleWeight()` says how present each
is, and `ModuleGroup` switches a module off entirely below a threshold, so a
place the visitor is not near costs nothing to draw (asserted by a test). The
camera's pivot follows `journeyPoint(travel)`, which means travelling between
places and moving within one are the same mechanism — there is no transition
system, because there are no transitions.

Module content lives in `src/render/modules/`. Each module is wrapped in
`SafeModule`, an error boundary: a module that throws is dropped, reported to
the console, and announced in the live region, while the rest of the journey
keeps running.

## The post chain

`src/render/post/chain.ts` owns at most one scene target, two half-resolution
targets for the glow, and two full-screen passes on screen during a crossfade.
That is a budget rather than a composer, which is why its cost can be stated
instead of measured. When nothing is active it allocates no targets and issues
exactly the single `gl.render` the piece made before the chain existed.

`PostControl` decides which treatment belongs where from the module and the
depth of the descent; the visitor can override it in Settings. The ASCII atlas
is built at runtime from the same stroke alphabet that draws the subject, so
the piece reads itself in its own letters.

## The camera

`render/camera.ts` is a rig of three numbers about a pivot: `yaw, pitch,
radius`. V\* is `(0, 0, D0)` about the word-plane centre, so it is an exact
state, not a tolerance.

- **guided** — a hermite path through four keys to V\*, held at the first key
  until the visitor chooses to begin. Any drag, wheel or look key adopts the
  current values as targets and hands over (`release()`), so there is no jump
  and no trap. It also ends by itself.
- **exploratory** — targets integrated by exact critically damped springs
  (`crit()` in `lib/mathx.ts`), stable at any dt including a 2 s one.
- **focused** — an off-axis viewpoint on one layer's sheet, so it reads as a
  separate sheet rather than as part of the sum.

A viewport change refits the **lens**, never the eye: `rig.fit()` recomputes
the fov that frames the word at the new aspect. Moving the eye would break the
resolve the piece is about. The world itself is rebuilt only when the aspect
crosses into portrait, where the name stacks to `SIDDH / ARTHA`.

## Input

`engine/input.ts` is the single owner of every global listener. Nothing else in
the codebase calls `addEventListener` on `window`. Intent is separated from
motion deliberately:

```
move          disturbs the world   (MOTION SCATTERS)
drag / wheel  moves the camera     (exploration)
keys          move the camera and operate the piece
```

so moving the pointer never secretly orbits the camera. A press is not a drag
(the gap before a press is not accumulated), and a gesture that begins on a
control belongs to that control.

## The laws

`engine/sim.ts` keeps energy, stillness, lock, attention and a `LayerRuntime`
per layer, all mutated in place and read inside the frame. None of it is React
state. Energy comes from pointer speed **and** how fast the camera is actually
travelling, so turning the wheel at rest does not scatter the subject.

## The visual engine

`engine/effects/registry.ts` defines a treatment as a definition with an id, a
category, typed defaults, per-quality overrides and a factory returning
`{ object, update, dispose }`. `render/EffectSlot.tsx` owns the lifecycle:
creating a new instance, crossfading by weight, then disposing the outgoing one.

Four are registered, deliberately not twenty:

| id | category | layer |
| --- | --- | --- |
| `field.points` | representation | field |
| `field.halftone` | representation | field |
| `lattice.cells` | representation | lattice |
| `atmos.film` | atmosphere | — |

`field.points` and `field.halftone` draw the **same** `PointCloud` from
`world/vantage.ts` and are swappable at runtime from Settings. That swap is the
proof the abstraction is real rather than decorative, and it is what Phase 2's
dither / ASCII / pixel treatments plug into. Instrument, design and trace are
drawn by a dedicated `LineLayer` — they are structure, not swappable treatment,
and pretending otherwise would be an empty abstraction.

## Performance

Every layer's deformation happens in GLSL, driven by about ten uniforms. The
CPU cost per frame is O(uniforms), not O(points): nothing walks 30,000 samples
in JavaScript, no attribute is re-uploaded after the world is built, and the
frame loop allocates nothing. The lattice is one instanced draw; the field is
one `Points` draw; each line layer is one draw.

Point size is computed from `projectionMatrix[1][1]` and the drawing-buffer
height, so a sample is a fixed world size at any viewport. (It was first written
as a magic constant, which produced ~54 px points and tens of millions of
additive fragments.)

Quality tiers (`engine/quality.ts`) set field density, trace passes, lattice
pitch, dpr cap and a total-pixel cap. `low` also drops grain and the shards.

## Accessibility

Nothing in the interface is drawn in WebGL. Real buttons, real radio and switch
roles, visible focus rings, a polite live region, a full prose description of
the artwork for screen readers, and every action reachable from the keyboard —
`1–5`, `[`/`]`, `V`, `G`, `Esc`, `H`, `,`. Reduced motion shortens the guided
path, stops the drift, freezes the grain and softens the kick, while leaving the
laws in force. If WebGL is missing, `ui/Fallback.tsx` draws the name five times
as SVG from the same stroke geometry — a still frame of the real artwork, not an
apology.
