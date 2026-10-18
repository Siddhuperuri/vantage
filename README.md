# MIRACLE SPATIAL

An explorable digital artwork about a person, built as a 3D environment.

The subject is never drawn. Five layers of light each state the same name a
different way, floating at five depths in a dark room; from one viewpoint — the
vantage — depth cancels and they sum into the word. One law governs the place:

> **STILLNESS RESOLVES. MOTION SCATTERS. ATTENTION PULLS.**

Four places along one axis: **VANTAGE**, **THE INSIDE**, **THE EDGE**, **THE
DEEP**. You travel between them; nothing cuts or fades.

```bash
npm install
npm run dev        # http://127.0.0.1:5173
npm run build      # typecheck + production bundle
npm run preview    # serve the production bundle
npm test           # 19 unit tests
npm run test:e2e   # 21 end-to-end tests, dev and production
npm run test:perf  # frame rate, headed, on the real GPU
```

## This repository

- `src/` — **MIRACLE SPATIAL**, environment 01: VANTAGE. React Three Fiber.
- `legacy/` — the original MIRACLE, untouched and still self-contained. Open
  `legacy/index.html` directly, or `python -m http.server --directory legacy`.
  It is vanilla HTML, CSS and JavaScript with no build step, and it is where the
  concept, the five layers, the three laws and the stroke alphabet come from.

The upstream repository (<https://github.com/Siddhuperuri/miracle>) is the
original work and is not modified by anything here.

## Documentation

- [docs/ART_DIRECTION.md](docs/ART_DIRECTION.md) — the idea, the law, the palette, the composition
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — layering, the single frame owner, the camera, the effect registry
- [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md) — what works, what was tested, what remains

## Controls

Drag to turn · wheel or `Q`/`E` to move, and keep going to travel · arrow keys
to look · `1`–`5` focus a layer · `Esc` let go · `N`/`B` onward and back ·
`V` return to the vantage · `G` guided camera · `H` hide the interface ·
`,` settings.

The ember is the intended route: hold the vantage until the name resolves and
it will start looking onward.
