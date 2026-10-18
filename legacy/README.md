# SIDDHARTHA

An interactive artwork about a person. Not a portfolio, not a landing page: an environment you move through and slowly realise is someone.

**Vanilla HTML, CSS and JavaScript. Nothing else.** No framework, no library, no build step, no backend, no network requests, no font files, no images. The whole piece is about 375 KB of code that draws itself.

The idea underneath it is **radiolucence**: material that lets radiation through. You never see him directly; you see what passes through him. Nothing here is a portrait or a list of skills. The layers pass through one another, one reveals another, and what is drawn of him is only ever what a visit let through.

It is one continuous world in four parts. **Module 1** is the name: five layers of light that add up to a word from exactly one place. **Module 2** is the inside of the name: the same world, deeper, with more above it than you first see. **Module 3** is the edge: everything is put down, and what is left is a sentence and a wish. **Module 4** is what the edge was standing on: the ending is not the end, and the floor of the room lets go. There is no seam between any of them.

### Three ways through it

The piece is built to be walked at three speeds, and only the last of them reaches everything.

| | what they do | what they get |
| --- | --- | --- |
| **fast** | scroll | the whole story: the name, the inside of it, the edge, the fall, the last words. The scroll has a purpose all the way down: in the name it is travel; in the wall, with nothing chosen, it lifts you out of the middle of the room to see it from above; in the well it is depth. |
| **curious** | stop, rest the pointer, turn round, wait | the doors and their memories; what each concept does when you stay with it; the rings of tools above the wall; the drawings in the well and how they resolve; the three sheets; the field of dust behind you. |
| **obsessive** | try everything, more than once, over more than one visit | the hidden marks in the wall's empty cells and the route they make; the six letters the wall never held; the line at the top of the room; the door that says NOT YET; what the world keeps of them from one visit to the next; and the last light in the void. |

None of the deeper things is necessary and none is explained. Each is a behaviour; you find it by stopping.

## Run it

Double-click `index.html`. It runs from `file://`. (Scripts are classic `<script>` files, not ES modules, precisely so this works.)

Or serve the folder with any static server (`python -m http.server`). `.claude/launch.json` is a one-line preview config for that, nothing more.

Best experienced with a mouse or trackpad and the sound of nothing. Works on phones (the name stacks; the interior becomes a panorama you turn and tap; the ending restacks for a tall screen) and honours `prefers-reduced-motion`.

---

# Module 1 — Vantage

The name is built from **five layers of light** floating at five different depths in a dark 3D space. Each layer is a different way of making the same word:

| layer | what it is | what it says (verb) |
| --- | --- | --- |
| **instrument** (farthest) | baselines, rulers, dimension lines, registration marks, a true measurement of the word | MEASURES |
| **design** | the exact geometry of every letter, with survey ticks | ARRANGES |
| **lattice** | the same word quantised into computed cells | COMPUTES |
| **field** | a probability cloud that *denoises* onto the stroke | INFERS |
| **trace** (nearest) | loose hand passes with overshoot | SKETCHES |

From almost every viewpoint they are separate, dim sheets. From exactly one place, **V\***, every point lies on the same ray, depth vanishes, and, because everything is additive light, the layers *sum* into the word. The name is what the parts add up to.

### The one law of this world

> **Stillness resolves. Motion scatters. Attention pulls.**

- Your pointer is a mass. Moving it kicks the viewpoint off V\*, and the layers slide apart in depth. Stopping lets a spring carry it home; the exact lock is measurable (`SID.cam.err`).
- Energy comes from how the *camera* moves, not from the wheel, so scrolling through the vantage does not scatter it.
- Pressing is *asking*: hold, and the letters are drawn into an orbit around your cursor (gravity-engine physics as the piece's native language).
- At the end the same law returns inverted: the name wraps around you as five concentric rings that turn to face wherever you look, faster the stiller you are.

### The door

`SIDDHA + ARTHA` share a single letter: the middle **A** of SIDDH**A**RTHA. That intersection is the door. The flight axis passes through its counter on every layer; the ember waits inside it. (On a phone, where the name stacks, the axis passes through the gap between the rows.)

### Acts (scroll progress within Module 1)

| act | scroll | what happens |
| --- | --- | --- |
| **UNKNOWN** | 0 – .10 | Darkness. A point of ember. Five faint sheets seen edge-on. After ~9 s, a thread of light offers the only invitation. |
| **DISCOVERY** | .10 – .335 | The camera swings toward V\*. Sheets fan open, layers turn like dials into agreement. |
| **IDENTITY** | .335 – .47 | The vantage. The word resolves; autofocus brackets close, a wave of light runs through it. Move and it breaks; stop and it returns. |
| **CURIOSITY** | .47 – .84 | The ember asks. You fly through the door and each layer's gate, each naming what it does. |
| **IMMERSION** | .84 – 1 | Silence. Then the fragments swing round and the name re-forms as rings around you. Hold still and the ember writes it. |

---

# Module 2 — The inside

> *He is not a finished identity. He is becoming.*

You are standing at the centre of the rings, inside the name. Keep going, and the name is cut open. The letters you have been looking at start to write *other words*: the ember goes back to the letters of the name and writes concepts out of them, each one crossing the name (or another word) at a **letter they share**. It is the same idea that made the door, applied everywhere: a shared letter is an intersection.

What you are inside is a **crossword of a mind**, wrapped around you, whose spine is the name. It is not a diagram: it is one physical system with four rules.

### 1. Every letter is becoming

Each letter has a *resolution*: sketched, inferred, computed, designed, measured. These are Module 1's five layers, now the five stages a letter passes through (hand passes, then a probability cloud, then cells, then exact geometry, then the cell's own registration marks).

- **Attention raises it, but only while you are still.** Rest the pointer (or your gaze, or a finger) on a letter and it resolves; move and it does not.
- **Attention spreads** along the word and through shared letters into the words that cross it.
- **Neglect lets it relax** to the word's *natural stage*: loose concepts (INTUITION, IMAGINATION, CURIOSITY, ART) rest as sketches; exact ones (STRUCTURE, ENGINEERING, SYSTEMS, TECHNOLOGY, CODE) rest as computed or designed geometry.
- **Nothing resolves past the evidence for it** (below). Every word is whole; "unfinished" is shown by how far a letter has resolved, never by a hole in a word.

### 2. Contradictions are physical

The five contradictions you asked me to explore are five pairs of words:

| pole A (loose) | pole B (exact) | how they sit on the wall |
| --- | --- | --- |
| DESIGN | TECHNOLOGY | same column, two empty cells between them |
| INTUITION | SYSTEMS | same column, two empty cells between them |
| ART | CODE | same column, **one** empty cell between them (with a blinking caret) |
| CURIOSITY | STRUCTURE | parallel rows, tied together by two pillars (EXPERIMENTS and IMAGINATION) |
| IMAGINATION | ENGINEERING | they *share a letter*: the I at the top of the wall |

- **Attend to one pole and the other recoils** (its resolution falls, it is stirred off its axis).
- **Rest on the gap between them and both rise**, and the two words are physically drawn together: the dimension line across the gap shortens, and you can watch TECHNOLOGY bend down toward DESIGN.

That is the whole claim of the module, made into behaviour: the work lives where the two hands meet, and you cannot hold both at once unless you stop at the gap.

### 3. Behind some counters are memories

Nine letters (the holes in A, D, O, P, R) are doors. Each opens onto a small living system that appears **only when you choose that letter** (click it, tap it, or Tab to it) and enlarges **only when you then scroll**. Resting the pointer on a door does nothing but show a glint in its counter; scrolling with nothing chosen does not move the view at all. They are recollections, not copies: drawn by the piece from what your record says the work *does*, never from invented screenshots, and where the record says something is unfinished, the memory is unfinished.

| door | memory | what it does | what the record supports |
| --- | --- | --- | --- |
| the A of AI (also Module 1's door) | **ORBIT** | parse → normalize → chunk → embed → index are lit and a pulse runs through them (the pointer scrubs it). **Retrieval and chat are drawn dashed and unlit**, and the pulse dies before them. | the ORBIT README: those five stages exist, retrieval and chat "do not exist yet"; status "in development" |
| the D of 3D | **morphing sphere** | a liquid wireframe the pointer pushes | the morphing WebGL sphere in his earlier WebGL portfolio |
| an A of CAMERA | **VIGIL-88** | an aperture that opens toward the pointer, a pupil that follows it, an image resolving out of noise | PyTorch/Torchvision ResNet-18 image classification in a PyQt6 app |
| the O where TECHNOLOGY meets CODE | **Cosmos Engine** | live orbits, collisions that merge (momentum conserved). The pointer is a mass; pressing makes a body. | Gravity Playground: custom engine for forces, velocity, orbits, collisions, body generation |
| the O where IMAGINATION meets CURIOSITY | **Travelease** | a treasure hunt: places reveal only as you approach them | the location-based treasure-hunt mechanic |
| the D of DESIGN | **PETPONKS** | a wireframe that sharpens from rough to exact as the pointer moves right. The mark is *only construction geometry*, not drawn. | low- and high-fidelity wireframes; the logo itself is not in the record, so it is not invented |
| the P of EXPERIMENTS | **HELIOS** | a clear-sky curve, a *dashed* modelled forecast, observed points and a hatched uncertainty band; the pointer scrubs the hour | irradiance forecasting, clear-sky index, calibrated prediction intervals; "currently building" |
| the A where ART meets the name | **typography** | a letter constructed from a circle and rules; its bowl width is a live, measured number | his typography exploration; this piece's own typeface |
| an O of MOTION | *(nothing yet)* | three streams (an image, a text, a signal) drift toward a line and stop short of it | SPECTRA is named in his profile with no code found: an intention, drawn as one |

The counters of the other letters are simply empty. That is deliberate.

### 4. The wall is stirred

Words are ropes of letters. The pointer pulls and swirls the letters it rests on; pressing pulls harder; scroll (even though you are not travelling) sends waves along the words; the recoil of a contradiction pushes a pole off its axis. Twist, stretch and the *iris* of an opening counter deform the strokes themselves.

### How you move

| | look | attend | go in | step back |
| --- | --- | --- | --- | --- |
| **mouse** | move to the screen edge to turn | rest the pointer | **click** a letter that holds a memory, then scroll | scroll back, or click elsewhere |
| **keyboard** | ← → ↑ | (your gaze) | **Tab** to a door, **Enter** | **Esc** |
| **touch** | drag to turn | tap a letter (or hold a finger down) | tap a letter that holds a memory, then scroll | scroll back, or tap elsewhere |

Choosing a door stirs its memory inside the counter (small, and only that one) and eases your gaze toward it for a moment, then leaves you free to look elsewhere; a click anywhere else lets go of it. The counter is a *window*: you do not pass through it. Scroll, and you lean toward the chosen one until the memory fills the view and the giant letter frames it, and the ground warms a little, the same world at a different hour. How far back you stop depends on the shape of the screen, so a tall phone stands further from a memory than a wide desktop.

### Seamless

There is one scroll column in three parts (`--m1`, `--m2` and `--m3` in the stylesheet; `main.js` turns them into two hand-over points). Crossing over, the rings fade as the same letters come up in the wall, the crossing words sprout from the letters of the name, and the camera, the gaze, the ember and the law of the world are all unchanged. Once you have crossed, the wall writes itself on the clock: scrolling only hurries it, so stopping halfway never leaves a word half-written. The memories wait until the wall is written. Scrolling back to Module 1 unwrites it, and crossing again re-sprouts it.

### How the wall was made

`lab/solve-wall.js` is a small search (run with Node; nothing in the site depends on it). It looks for a crossword on a cylinder whose spine is the name, where every other word interlocks through a genuinely shared letter, scored so that **both poles of every contradiction fit in one field of view** (otherwise a reaction would happen off-screen). Seed `275418` is the layout in `js/mind-data.js`. Three things fell out of the letters rather than being asserted:

- the name crosses five words directly: EXPERIMENTS, 3D, AI, CAMERA, ART;
- EXPERIMENTS and IMAGINATION run the full height of the wall and touch CURIOSITY, STRUCTURE, SYSTEMS, ENGINEERING, IDEAS and MOTION;
- three contradictions are separated by an empty cell, which is where they can be balanced.

---

---

# Module 3 — The edge

> *Things still being figured out.*

Everything the visitor has met is put down, not switched off. Scroll past the last door and the wall exhales. What happens next is a sequence that advances **on its own clock** once you have crossed (about thirty-five seconds), and scrolling only hurries it, so a visitor who stops anywhere is never left in the middle of a gesture. Scroll back up and it scrubs backwards; scroll all the way back into the wall and it is undone.

### The sequence

| when | what happens |
| --- | --- |
| **quiet** | The doors close and the memory you were leaning into lets go. The camera steps back to the centre and the lens settles. Everything that was measured, designed or computed goes back to being a **sketch**: the wall becomes a pencil draft of itself. The mouse stops turning your head. |
| **questions** | The five contradictions are drawn together. Into each empty gap between two opposites the ember writes a large **?**: the gap was always a question. (The cell where ART and CODE could not meet, which held a blinking caret, gets its question mark too.) |
| **the sentence** | The letters of the wall itself lift off, swirl round the room the short way, shrink, turn to face you and settle into **one sentence, in the order it is read**. Each letter comes from a real letter of the wall with the same character. The wall does not contain the four F, the J, the K, the commas, one B and one L; those are written by the ember. The rest of the wall lets go like dust. |
| **it resolves** | By the piece's one law: stillness and attention. It never reaches the last stage. Nothing about it is measured, so it never grows registration marks. |
| **the frame lets go** | The crop marks and the ruler fade. At the edge there is no frame. |
| **the wish** | The ember writes it in the stage of knowing that is **chance**. Each letter of *may the odds be ever in your favour* carries a roll of the dice, slowly re-rolled: some letters are crisp, some are dust, and they change. **Attention improves the odds**: rest on a word and it resolves. |
| **rest** | The ember waits just below the wish. No button, no link, no word to complete. The room breathes very slowly (a sway of 2% of the window's width). This is where the ending *looks* like the end. If you wait, or go on, the floor lets go (see *Module 4*); the **residue** (see *The world remembers*) is what is said at the bottom of the well. |

The words are yours, set in this piece's own typeface with a small optical kerning table (the alphabet has none, and `AV`, `AY` and `LT` leave holes): *Jack of all, master of none, but often times better than master of one*, and *may the odds be ever in your favour*. They are the only sentences in the piece that are not observations of the visit: what comes after them (the residue) says only what was true of the visit itself.

### Composition

Two groups in a stack, the second smaller and apart from the first: the sentence (four lines, or five on a tall screen) and the wish. Sized to both the width and the height of the window (`layout()` in `js/edge.js`), so a phone in portrait, a phone in landscape and a 2560 px display all get the same composition, not the same pixels. The sentence stands where you were facing when the ending began, and the ending gently draws your gaze back to it.

---

# Above the wall (Module 2, further in)

Three things were added to the inside of the name. None changes what was there.

### The rise

With nothing chosen, scrolling in the wall used to do nothing. Now it lifts you. Between about a third and two thirds of the way through the wall the camera rises out of the middle of the crossword, ten and a half units, level with the top of the room; between four fifths and the end it comes back down, so the ending begins where it always did. Choosing a door cancels the rise and does what it always did (lean in). Seen from up there, the wall is a tube of letters going down into the dark.

### The ledger (`js/ledger.js`)

Fifteen rings circle the room above the wall, at its own radius, one for each tool named in the record: Figma, Framer, Illustrator, Photoshop, Canva, Lightroom, HTML, CSS, JavaScript, React, Python, Java, PyTorch, WebGL, GSAP. They are hairlines, almost nothing.

Rest your attention on a concept and the rings of the tools it is made with light up, and each tool's name is written on its ring, directly above the concept. A tool used by several concepts is **one ring with several names on it**, so the ring is what connects them: attend CODE and PYTHON and JAVASCRIPT are lit, and so are the places on those rings where AI, TECHNOLOGY, WEB and MOTION also stand. The connection was there before you looked. Concepts the record names no tool for (CURIOSITY, INTUITION, IMAGINATION, SYSTEMS, STRUCTURE) have nothing above them: they are frames, not claims, which is the honesty of the evidence ceilings again.

A ring you have lit is remembered (faintly present on a later visit). One more ring sits above all the others and says nothing about the work: how the piece is made. It appears only if you go to the top of the room, look straight up and stay: *MADE OF HTML CSS AND JAVASCRIPT AND NOTHING ELSE*.

### What a concept does (`js/reactions.js`)

Stay with a word (attention resting on it, not passing over it) and after a couple of seconds the concept starts to act on the room, each in its own way. `k` rises while you stay and falls slowly when you leave, so leaving one word for another leaves a little of the first still acting, and the places where two overlap are where the room starts to show how its parts are connected.

| concept | what happens |
| --- | --- |
| CURIOSITY | questions appear in the empty cells around it, in ember |
| STRUCTURE | the grid under the letters shows itself; the word is measured with a dimension line, and its length in cells is the number in the gap |
| SYSTEMS | the springs holding the wall together are drawn: every letter to its neighbours |
| IMAGINATION | its letters lift off the wall, toward you |
| ENGINEERING / TECHNOLOGY | construction lines run through the word (baseline, mid-line, cap height) and past its ends |
| CODE | a caret reads it letter by letter; the letter it stands on is computed |
| 3D | its five renderings part in depth |
| CAMERA | four brackets close on it and everything else goes out of focus |
| MOTION | a wave runs along its letters |
| WEB | every place two words cross lights up |
| AI | it cannot decide what stage it is at: its letters flicker between them |
| EXPERIMENTS | the whole wall becomes a little unstable |
| INTUITION | the ember goes to a door that has not been opened, without being asked (the same happens to anyone who has been still for a long time) |
| IDEAS | a spark leaves it, crosses the room and lands in another word |

**The hunt.** Games are hidden places. Five of the wall's empty cells each hold something small, the same five in every visit. Nothing marks them. Rest on an empty cell and if there is something in it, it shows itself, in ember, and is kept. Staying with GAMES makes the places to try glint, very faintly. When all five are found they are joined by a route. It is the treasure-hunt mechanic of one of his works, done to a wall.

### The dark answers

In Module 1, a visitor who waits in the dark without touching anything for about sixteen seconds is answered: each of the five layers says, quietly and in turn, what it does (MEASURES, ARRANGES, COMPUTES, INFERS, SKETCHES). They say it again as you pass through their gates. This is only for someone who stopped to listen.

# Module 4 — The well

> *I thought I reached the end.*

The ending is not the end. Once the wish is written, waiting (about four seconds of stillness) or trying to go on (a wheel, a finger, PageDown, End, Space, the down arrow) lets the floor go. The scroll column, which stopped at the wish, **grows**: a fourth part with no height until this moment. The ruler's pin, which the edge had taken away, comes back and starts to climb again; the sentence lets go; and you are let down a little by the same scroll you would have made yourself (so it can be interrupted, reversed, continued).

Scroll below that is **depth**, not a fraction of the page. The well is the wall's own grid continued downward: the same radius, the same row height, and the gauge at the bottom right shows the row you are at (the wall's last row is 5, so the numbering simply goes on). Scroll back up and you climb it. It is measured in pixels below the end of the three parts (`input.dy`), never as a share of the column, so opening it cannot move anything above. Its length is `--m4` in the stylesheet.

Everything in it obeys the same law: **stillness resolves, motion scatters, attention pulls.** Your pointer is still a mass (dust is pushed away from it, and pressed on, drawn in). You may look in any direction, and straight down.

### What is in it

| depth | what | how it works |
| --- | --- | --- |
| 0–9 | **the floor** | rings and the wall's grid go on below the last row. The wall's own rings are glimpsed, very faintly, from the room, if you look down. |
| 14–170 | **the archive** (`js/strata.js`, `js/artifacts.js`) | nineteen drawings, one for each artefact the record lists under his work: Cosmos Engine (workspace, controls, feedback), Travelease (destination discovery, exploration loop, planning support), PETPONKS (brand foundation, platform structure, visual language), VIGIL-88 (monitoring dashboard, computer-vision pipeline, digital-defence identity), the visual-design collection (logo and identity explorations, posters and campaign assets, typography and composition). Each is a drawing on the typeface's own grid, registered as a glyph, so it is everything a letter is: sketched, inferred, computed, designed, measured. They hang from plumb lines at different heights, angles and distances (some within reach, some near the wall, one or two behind you) and are set a little differently every visit. From a distance each is a *fragment* (only some of its strokes exist); resting attention completes and resolves it, up to what the record supports. Hold a press (or Enter) on one and it comes toward you and opens into its five sheets. |
| | relationships | once two pieces of one work are resolved, a survey line joins them and names the work. Pieces that share a tool are tied too, but only ever to the one you are looking at (on a later visit, what you collected before is tied without being asked). A door you opened on the wall leaves its work half collected here. |
| | what does not exist | ORBIT's retrieval and chat, and SPECTRA, are drawn dashed and never resolve past a sketch. |
| | **the letters the wall never held** | the ending needed F, J, K, B, L and a comma, and the ember wrote them, because no word on the wall had them. Six small letters were left near the axis at odd heights. Resolve one and it says so. Found ones are kept. |
| 181–201 | **the unrecorded** (`js/deep-data.js`) | three large drafting sheets, ORIGIN, FAILURES and EVOLUTION. The record holds nothing that belongs on them, so they are not filled: each has its construction and one measured absence (a dimension line with no number). ORIGIN draws the four words of the name in the order they are written (PERURI, JAI, SAI, SIDDHARTHA) and nothing before them. FAILURES draws a ring that did not close for each time the name came apart in front of a visitor who had just found it: the only failure the piece has any record of, and it is the visitor's. EVOLUTION draws the figure the last visit left, and the figure now (on a first visit, only an empty outline for the first). If there is ever something real to say, it goes in `js/deep-data.js`, one line of capitals per fact, and the sheet writes it where its absence was. |
| 206–240 | **the memory** (`js/chamber.js`) | one ring round the wall for every visit. The first is this one: the path your pointer has made so far, wrapped round the wall in ember. Under it, the last visit's, jittered and broken where the memory failed, and the ones before it, fainter. A ring with no line is a visit of which only the fact is kept. |
| 260 | **the bottom** | three things at once, and you find them by looking. *Ahead*, the last words (Module 3's residue now happens here, not in the room). *Below*, five sheets of light at five depths, each a different rendering of one figure, the signature: each is exactly as bright as the layer it stands for was passed through, so the figure is as complete as the visit; move and they slide apart; stand at the axis and hold still and they add up (Module 1's vantage again). *Behind you*, a field of dust that is everywhere the same **except where the name would be**: the dust settles thickest against its edge and there is none inside it. Nothing of him is ever drawn, only what passes through, and he is the outline of where it did not. Move and it scatters into the shape; hold still and the absence is exact. |
| | **the final void** | if you stay after the last words, the dust dims to almost nothing and the only light left is a beam from your eye, along the way you point. The ember goes where you point, quickly. The frame lets go. Where the beam passes over a letter of the name, that letter draws itself in hairline light (the exact strokes of Module 1's word). Sweep the whole name and it is whole, and stays: it was only ever the absence, and now it is there because of the light you carried. |

The wish is left at the top and found again at the bottom; the sentence lets go as the floor does. Scrolling up unwinds all of it.

# The world remembers (across all the parts)

Everything above is one place. Several more systems live inside it and across it. None has a menu, a label or a number on screen; each is a behaviour you can find, and they share one record.

### The visit (`js/visit.js`) and what it remembers

One small JSON record in `localStorage`, on this device, never sent anywhere. **There is no network code in this piece at all.** It holds only abstract behaviour:

- which doors opened, whether the forbidden one was forced, whether the ending was reached,
- how far the signature has been drawn (ten numbers),
- the shape of one pointer path (about ninety points),
- a random number that only seeds this browser's own procedural variation.

Since the well, it also holds, all of it abstract: how long attention rested on each concept (a number per word); which tool rings and hidden marks were found (a bit each); how far each drawing in the archive resolved (a number each); which of the six lost letters were found; how deep the descent went and whether the ending was reached; how many times the name came apart in front of a visitor who had just found it; one line for each earlier visit (which day, how deep, whether it ended); and the last three paths a pointer made. Older paths and older resolutions have been read more times and come back fainter. None of it says anything about the person.

No name, no identifier that leaves the device, no fingerprint, no inference about the person. If storage is refused (private windows, blocked site data) the piece works and is simply always a first visit. `index.html#forget` wipes the record on load; `SID.Visit.forget()` does it from the console and stops writing for the rest of that page.

**Memory here is reconstruction.** Each time the record is read it decays: by the days since the last visit and by being read at all (`keep` in `visit.js`). What is left is jittered. What comes back is recognisable and never exact. **Decay never removes a letter from a word**: it shows as fainter genes and a jittered, broken line only. (An earlier version withheld letters to look "unfinished" and it read as a bug. This one cannot.)

**What comes back.** A concept you stayed with returns with its letters a little further resolved. A tool ring you lit is faintly there before anything is asked. Marks found in the empty cells stay found. A drawing you resolved in the archive comes back a little faded, and what you collected before is tied to its relatives without being asked. Every earlier visit is a ring in the memory, with the line it drew if any of it is still remembered. The archive hangs a little differently. The sheets of the unrecorded begin a little more resolved.

**Same world, different state.** Every visit has its own seed and `Visit.r(name)` turns it into a stable number for whoever asks. It varies the hand of the sketches (`letters.js`), the order the wall is written in and how fast, the starting angles of Module 1's layers, the phase of the ember's idle drift, how the ending's letters fly and the wish's dice, and the phase of the signature. The wall, the words, the doors and the law never change.

### The signature (`js/dna.js`): a figure drawn, not designed

A **harmonograph**: a drawing made by damped pendulums, which is to say by springs, which is what everything in this piece is. It is never drawn where you are looking for something else, and it is never explained. It only grows, unseen, as things are found, and it is shown in one place only: behind the door that says NOT YET, once that door has been forced. (It was tried round the ember as you went, inside a letter I, and at the edge. Each was taken out.)

It has ten loci. The first five are **the five layers of the name**, and each decides one *rendering* of the path: the exact line (design), survey ticks and registration marks (instrument), cells on a grid (lattice), dust (field), the loose second pass of a hand (trace). They are switched on by passing through the layers in Module 1, slowly (rush, and barely any), and finished by holding still while the ember signs the name. The other five decide the *shape*: `curiosity` how finely the pendulums are tuned (2:3, then 3:4, 4:5...), `ideas` how round, `balance` how strongly the mirrored partner swings (symmetry), `memory` how long it keeps swinging before it settles, `mutation` how far the pendulums are out of tune (precession, and the pen lifting). Complexity is the tuning, not a heap of unrelated pendulums, so it stays an ordered woven figure however far it grows. `lab/dna.html` draws it at several stages.

What raises them: doors that develop (`curiosity`), concepts you rest on (`ideas`), holding the gap between two opposites (`balance`), time inside the wall and returning (`memory`), and one thing you should not do yet (`mutation`). Left alone it precesses very slowly; out of tune, faster, and the pen lifts.

### The visitor's trace (`js/trace.js`)

Only behaviour: the pointer's path (or, without a pointer, where the head is turned), how long attention rested at each place, how fast, how often the direction reversed, which doors were found and which were not. It is never shown as a number, a graph or a card. It is only turned into two things, both at the edge or on a later visit:
- **a line**: at the edge, your own path, drawn by the ember, with a small loop where the hand stayed (the longest stay ringed twice) and a cross where it began.
- **a sentence that is literally true** (see the ending).

There is nothing drawn on the wall for what you did. (Ember loops round the letters you rested on, and faint doubled sketches of them on a later visit, were tried and taken out.) Attention on a letter is not kept between visits at all; it is only noticed while you are there, to know when you come back to a letter after leaving it.

The piece is allowed to say what happened. It is not allowed to say what it means: nothing here infers a trait.

### The forbidden door

The one memory whose record says "nothing found yet" (SPECTRA, in the O of MOTION) is the one door that will not open for someone who only looks. Attend to it and it **flinches**: its counter closes on itself, its glint shudders and withdraws, and the only words it has appear beside it: NOT YET. **Ask, and it gives**: press and hold on it (a mouse button, a finger, or Enter with the door focused by Tab) for about two and a half seconds, while the wall near it strains. Then the world changes. It is not an alert or a reward:

- the three streams behind the door no longer stop short of the line: they cross it and become the signature;
- the wall comes apart: every letter's five renderings stand apart in depth, and stay so;
- the signature is drawn in the counter, as far as the visit completed it, and from then on it is out of tune, for good.

**It is kept.** On a later visit the ghost door is already open and does not flinch, the wall begins a little apart (Module 1's layers too are slightly more separated, and never quite settle), and the signature begins out of tune. Nothing lets you undo it except `#forget`. `SID.Mind.forbid()` forces it from the console; the tests do.

### The hidden law (`CONCEPT` in `js/mind-data.js`)

Concepts have conceptual gravity, and it is one small table of multipliers, applied consistently, never shown. Each concept sets how hard its letters are held to their place, how quickly their motion is used up, and how heavy the ember feels while it rests on the word. **Stiff concepts** (STRUCTURE, SYSTEMS, ENGINEERING, TECHNOLOGY, CODE) snap their letters back and make the ember slow. **Loose concepts** (INTUITION, IMAGINATION, IDEAS, ART, CURIOSITY) let them sway on and make the ember eager. The five contradictions are literally this: each pair sets a stiff word against a loose one. A hand that stirs the wall finds out, and it never has to be told.

### The ending's residue (`js/edge.js`)

It begins when you arrive at the bottom of the well (Module 4), on its own clock (`R`, 48 s; scrolling back up unwinds it):

1. (The sentence has already let go, with the floor. The wish is found again here, quieter. It was for you.)
2. If there was a last visit, what is left of its line appears first: broken, a little off, never quite where it was.
3. The ember writes your path.
4. What is literally true of the visit is said, one line at a time, then gone (see the table under *Content*).
5. The last three lines stay, and the ember rests where your line ends.

There is no frame, no button, no link. Screen readers get each stage through the live region. If you stay after the last three lines, the room goes dark but for a beam of light from your eye along the way you point (Module 4, *the final void*).

## Files

```
index.html            semantic shell: scroll track, fixed stage, canvases, micro-type slots
css/style.css         tokens, frame (crop marks, edge ruler, safe areas), grain, bloom, responsive, reduced motion
js/core.js            math, palette, seeded noise, input (pointer/scroll/touch drag), the energy model ("the law")
js/visit.js           the record on this device, its decay, and this visit's seed (see "The world remembers")
js/glyphs.js          the typeface: strokes on a cap-height grid, survey ticks, layout, SVG micro-type
js/dna.js             the signature: a harmonograph whose ten loci are the five layers and five shapes
js/trace.js           behaviour kept as behaviour: the path, the stays, the true sentences
js/camera.js          camera path (spline), the visitor's spring, gaze, the interior's lean, projection
js/world.js           Module 1: the five layers, per-point spring physics, cursor mass, ring morph
js/seeker.js          the ember: door, lead, curiosity, the pen that signs, and (inside and at the edge) the pen that writes
js/render.js          additive canvas renderer, motion streaks, reticle, brackets, atmosphere
js/mind-data.js       Module 2 data: the crossword layout, each word's stage and evidence ceiling, the doors
js/sprites.js         immediate-mode light: world-space segments and dots, projected and batched in one pass
js/memories.js        Module 2: the nine memories behind the counters
js/letters.js         what any letter is: strokes, the five stages drawn as light, the forces a hand puts on it
js/mind.js            Module 2: the wall (attention, resolution, contradictions, physics), the interior camera, doors
js/ledger.js          the rise, and the fifteen tool rings above the wall (and the line at the very top)
js/reactions.js       what a concept does when you stay with it, and the hunt in the empty cells
js/edge.js            Module 3: the sequence, the sentence, the wish, and the residue (which now stands at the bottom of the well)
js/artifacts.js       Module 4: the nineteen drawings of the archive, as data and as strokes (registered as glyphs)
js/deep-data.js       Module 4: what the record does not hold, as empty slots that will write what is put in them
js/deep.js            Module 4: the descent (opening, depth, camera, dust, gauge, the ember, the last light)
js/strata.js          Module 4: the archive, the six lost letters and the three sheets
js/chamber.js         Module 4: the memory rings, the five sheets of the signature, the name as absence
js/director.js        pacing: acts, lock/ignite, dials, immersion, whispers
js/main.js            boot, frame loop, the three-part timeline, adaptive resolution
lab/specimen.html     the typeface, drawn out
lab/artifacts.html    the drawings of the archive, at their most resolved
lab/dna.html          the signature at several stages of being drawn
lab/solve-wall.js     how the wall's layout was found
```

Load order matters (see `index.html`); everything hangs off `window.SID`. Live handles for inspection: `SID.Deep` (`D`, `unlocked`, `goto(depth)`, `final`), `SID.Strata`, `SID.Ledger`, `SID.Reactions` (each takes a `force` for tests), `SID.Mind.lookAt(yaw, pitch)`, and: `window.__sid` (`S`, `Sg`, `t`, `world`), `SID.cam`, `SID.energy`, `SID.perf` (`js` is script time per frame), `SID.Mind` (`st`, `words`, `nodes`, `hosts`), `SID.Edge` (`E3`, `duration`). Setting `SID.Edge.duration = 8` plays the whole ending in eight seconds, which is how it is tested.

## Design system

**Palette — three members.** Ground `#0a0908` (warm near-black), paper `#e9e2d3` (the only text colour), ember `#ff5c24` (reserved for the one thing that is curious; under 1% of pixels). Colour is otherwise light: lines are additive paper at low alpha, so brightness is *earned*. Inside a memory the ground warms a few points toward ember.

**Typography — none borrowed.** Every letter, including all micro-type and the entire wall, is a stroke drawn by `glyphs.js`: capitals A–Z, numerals, marks. Free stroke ends get short perpendicular *survey ticks*; the `I` is literally an I-beam. Micro-type is inline SVG (`role="img"` with real text in `aria-label`). In the interior the same letters take five renderings and deform: they bend, twist, stretch, and open like an iris.

**Space & composition.** Module 1: the word on the optical centre in large negative space. Module 2: you at the centre of a cylinder of 32 columns by 11 rows; the front ~three quarters is written, the back is empty until you turn round. Module 3: silence, a sentence and a wish, in a dark room.

**Depth.** Real perspective, coherent-noise depth fields, depth attenuation of brightness and width, near-plane fading. In the interior the five stages sit at slightly different depths so leaning close reveals them as layers.

**Motion.** Spring physics driven by one frame loop; smooth agitation fields (not per-point noise) so strokes bend like smoke; the scroll glide, the turn of the head and the lean toward a door are critically damped springs (`M.crit` in `core.js`, solved exactly, stable at any frame time), so speed builds and settles instead of snapping to its maximum the instant the input moves, and a memory's growth follows its target through one too; the pointer's speed is measured by time, not per event, so a trackpad and a fast mouse feel the same; letters in flight ease in and out and take the short way round the room. No CSS animation except film grain and the scroll thread.

**Texture.** Generated grain, stepped like film frames; a 1/5-resolution copy of the frame blurred and screen-blended as bloom; a soft vignette.

## Responsive, accessible, performant

- **Portrait / narrow:** the name stacks `SIDDH / ARTHA`; the interior shows the wall as tall columns, which suits a phone. The memory stops further back so it fits.
- **Touch:** scroll is native (and leans you into the door you tapped, if you tapped one); a horizontal drag turns you (less so at the edge); a tap gives a place your attention, or chooses a door if you hit one; a finger held down is a pointer.
- **Safe areas:** the frame keeps clear of notches and rounded corners (`env(safe-area-inset-*)`).
- **Reduced motion:** no drift, wind, streaks or waves; muted forces; quicker easing; letters do not flicker; memories run slower; at the edge letters cross-fade in place instead of flying and the room does not breathe. The whole journey still works.
- **Keyboard / assistive tech:** native scrolling (Space, PgUp/PgDn, Home, End) leans you into the door that has focus, if one does; the arrow keys look around; Tab/Shift+Tab choose between doors and announce them through a polite live region, and Tab past the last door leaves the piece (no keyboard trap); Enter goes in the door that has focus; Esc steps back. A visually-hidden description explains all three parts; the canvas has `role="img"` and its label changes when the sentence is on screen; on-canvas captions are SVGs whose real text is in `aria-label`; `<noscript>` shows the name.
- **Performance:** ~9k points in Module 1 (which stop being simulated once they have faded) and ~8k primitives in the interior, all batched additively with a counting sort; typed arrays and preallocated buffers in the hot loops; small letters skip sub-pixel detail (a second sketch pass, every other sample of the dust); DPR capped at 2 and at about 8 megapixels of canvas; the scroll height is measured on resize, not per frame; DOM writes only when a value changes; pauses when hidden; renders at half rate when the edge is at rest; lowers render resolution automatically if a device is slow for a sustained stretch. Measured about 1 ms of script a frame in the wall and 2.7 ms at the edge in software-rendered headless Chrome, 33 KB and 63 KB of garbage a frame (the hot letter loops write straight into the sprite buffers and keep per-point numbers in object fields, because V8 boxes numbers passed as arguments or stored in closure variables), and a flat heap (about 10 MB) after three full round trips with forced collection.

## Content — what is real, what is conceptual

The brief forbids inventing personal facts. Visible copy is limited to:

| text | status |
| --- | --- |
| `PERURI JAI SAI SIDDHARTHA` | Real: his full name, from his own earlier project data. |
| `ARRANGES / COMPUTES / INFERS / SKETCHES / MEASURES / ASKS` | Conceptual verbs for design / code / AI / visual thinking / technology / curiosity. Not skills, not levels. |
| the words on the wall | The eleven concepts from the brief plus the five contradictions' poles. They are *frames*, not skills. |
| `ORBIT · IN DEVELOPMENT`, `HELIOS · IN DEVELOPMENT` | Statuses taken from his own project documentation. **Decide whether you want them public**: to remove, edit `INSCRIPTIONS` in `js/mind-data.js`; the unlit RETRIEVAL/CHAT in the ORBIT memory is in `Pipeline()` in `js/memories.js`. |
| `COSMOS ENGINE`, `TRAVELEASE`, `PETPONKS`, `VIGIL-88`, `MORPHING SPHERE · WEBGL`, `TYPOGRAPHY` | Names of his real works or their subject, revealed only when a memory has fully developed. |
| `HOLD STILL` | Appears only if someone struggles at the vantage for ~9 s. |
| `JACK OF ALL, MASTER OF NONE, BUT OFTEN TIMES BETTER THAN MASTER OF ONE` | **Your words**, set as you wrote them (in capitals, the only case the typeface has). |
| `MAY THE ODDS BE EVER IN YOUR FAVOUR` | **Your words.** |
| `?` in four gaps | A mark from this piece's own language, not a claim. |
| `NOT YET` | Appears only beside the door whose record says nothing was found, and only while it is being looked at. One string: `INSCRIPTIONS.ghost` in `js/mind-data.js`. |
| `YOU MISSED SOMETHING` | Only if a door that could have been chosen never was. `Trace.lines` in `js/trace.js`. |
| `YOU STOPPED HERE` | Only if attention rested at one place for more than about two and a half seconds. The longest stay is the one ringed twice in your line. |
| `YOU CAME BACK` / `YOU RETURNED` / `YOU MOVED QUICKLY` | One of them: a genuine later visit / attention or a door came back after leaving it / more than about a sixth of moving time was quick. |
| `YOU LEFT A TRACE` | Only if there is a line to show. |
| tool names on the rings above the wall | The tools the record names in his own profile, and the concepts each is evidence for. `TOOLS` in `js/ledger.js`. |
| `MADE OF HTML CSS AND JAVASCRIPT AND NOTHING ELSE` | True of this piece. `COLO` in `js/ledger.js`. |
| the drawings in the archive and their labels (`SIMULATION WORKSPACE`, `DESTINATION DISCOVERY`, `BRAND FOUNDATION`...) | The artefacts the record lists under each of his works, drawn from what they are said to do (never from an image: the record has none). `LIST` in `js/artifacts.js`. |
| `THE WALL DID NOT HAVE THIS LETTER` | True: none of the wall's words contain F, J, K, B, L or a comma. Only appears when one of the six small letters has been resolved. |
| `ORIGIN`, `FAILURES`, `EVOLUTION` and the four words `PERURI JAI SAI SIDDHARTHA` | Titles of three sheets that hold only what is true (see Module 4). The four words are his full name, as it is written in his own profile. Nothing is claimed about an origin, a failure or a change in him. |
| `YOU FOUND SOMETHING IN AN EMPTY CELL`, `YOU LIT SOMETHING ABOVE THE WALL` | Only if true of the visit (a hidden mark was found; a tool ring was lit). `Trace.lines`. |
| `YOU KNOW A LITTLE ABOUT ME / I KNOW NOTHING ABOUT YOU / GOOD` | The inversion. It is true in the plain sense: what was kept is behaviour, and the piece cannot know who you are. `FINALE` in `js/edge.js`. |

The new copy (NOT YET, the observations, the last three lines) is all in those three places and none of it is load-bearing: delete any of it and the piece still ends.

**Evidence ceilings.** A word can never resolve beyond the evidence for it (`ceil` in `mind-data.js`). CAMERA is capped at 0.70 (the record contains only Lightroom), GAMES at 0.75 (only the treasure-hunt mechanic), MOTION at 0.90 (Framer and GSAP appear in his tool lists), IDEAS at 0.90. They stay slightly unfinished, and that is the honesty.

**Where the facts came from.** Only as *facts about him* (never code, structure or design) from his other project folders: the portfolio's content data, the GitHub profile project, the ORBIT and HELIOS READMEs. No metrics, no employers, no claims.

## Where a later change attaches

- **The words at the edge.** `STATEMENT` and `WISH` in `js/edge.js`, with `BREAKS` for where each breaks on a wide or a tall screen. Any letter or mark the typeface has can be used; add glyphs in `glyphs.js`.
- **The pacing of the ending.** `T` in `edge.js` is the whole sequence in one small table (in units of E3, 0 to 1); `duration` is its length in seconds.
- **What is on the three sheets.** `js/deep-data.js`: lines of capitals under `origin`, `failures`, `evolution`. Only true things.
- **More drawings.** Add strokes and an entry to `js/artifacts.js` (`lab/artifacts.html` draws them all). Give each an honest `ceil`.
- **More tools above the wall.** `TOOLS` in `js/ledger.js`: a tool and the concepts it is evidence for.
- **What a concept does.** A branch in `reactWord` in `js/reactions.js`.
- **How long the well is.** `LEN` in `js/deep.js` (its depth) and `--m4` in the stylesheet (its scroll); the archive's places are in `artifacts.js`.
- **More doors.** Add a host to `HOSTS` in `js/mind-data.js` and a memory to `FACT` in `js/memories.js`; the wall, attention, development, lean, keyboard focus and inscriptions already handle it.
- **More words.** Add to the layout in `mind-data.js` (re-run `lab/solve-wall.js` if you want it found for you). Give each a natural stage and an honest evidence ceiling.
- **A longer path.** `camera.js` `KEYS` is Module 1's journey; `--m1`, `--m2` and `--m3` in the CSS set how much scroll each part gets.
- **More observations.** Add a condition and a line in `Trace.lines`. It must be a fact about what happened, never about what it says of the person.
- **More genes.** Add a locus in `dna.js` (`LOCI`), decide what it does to `params()` or to a rendering, and call `DNA.express(name, amount)` from wherever the discovery happens. It is persisted for free.
- **What a concept does.** `CONCEPT` in `mind-data.js`.
- **Sound.** Deliberately absent (silence is a design element); `ignite`, `flash` (a door developing), pen-down and fuse events are the natural hooks.
- **Placeholders.** None are visible. Anything a future module must invent should be added as clearly marked content, never as claims.

## Tuning

The well: its depth and the height of the auto-fall are `LEN` and `FALL` in `js/deep.js`; its scroll is `--m4` in the stylesheet; where each drawing hangs is `p` in `js/artifacts.js` (scaled by `RK` and `CK` in `strata.js`); the three sheets are `SHEETS` in `strata.js`; the memory rings start at `MEM_D0` and are `MEM_DS` apart in `chamber.js`; the name's span round the wall is `SH_SPAN`, and how much dust there is `TARGET`, in `chamber.js`; how long a visitor must stay for the last light is `st.final` in `deep.js`. The rise is `UP` in `js/mind.js`; the rings begin at `ROW0` and are `DROW` apart in `js/ledger.js`; each reaction has its own numbers in `reactWord` and how long you must stay is the `sm(1.2, 3.4, ...)` in `Reactions.update`.

Every feel-constant is a named number near the top of its file: layer depths, springs and gains in `LAYERS` (`world.js`); the journey in `KEYS` (`camera.js`); the wall's radius and cell size (`R`, `ALPHA` in `mind.js`) and the stage gains (`GAIN` in `letters.js`); the ending's sequence, flight time, depths, kerning and text (`T`, `FLIGHT`, `DEPTH`, `KERN` in `edge.js`); attention, resolution and recoil rates in `Mind.update`; each memory's constants inside its own function in `memories.js`; energy decay in `core.js`; act boundaries in `director.js`; the residue's sequence and length in `RT` and `RD` in `edge.js`; how long the door must be asked (`ASK_T`) and how far the layers part (`sep`, `zk` in `letters.js`); how fast a visit's memory fades (`keep` in `visit.js`). `SID.Edge.duration = 8; SID.Edge.rduration = 12` plays the whole ending in about twenty seconds, which is how it is tested.
