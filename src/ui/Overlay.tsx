/* ------------------------------------------------------------------
   Overlay.tsx - the interface, in ordinary HTML.

   Nothing here is drawn in WebGL, so all of it is real text, really
   focusable, and readable by a screen reader. Everything it can do can
   also be done from the keyboard, and nothing important is hover-only.
   Pressing H hides all of it, which is the honest test of whether the
   artwork can stand on its own.
   ------------------------------------------------------------------ */

import { LAYER_DEFS } from '../world/layers';
import { MODULES, moduleDef } from '../world/journey';
import { SUBJECT_FULL } from '../world/vantage';
import {
  clearFocus,
  enter,
  focusLayer,
  goOnward,
  goToModule,
  returnToVantage,
  setMode,
  toggleChrome,
  toggleSettings,
} from './actions';
import { Readout } from './Readout';
import { Settings } from './Settings';
import { useUi } from './store';

function Marks() {
  return (
    <div className="marks" aria-hidden="true">
      <i className="marks__m marks__m--tl" />
      <i className="marks__m marks__m--tr" />
      <i className="marks__m marks__m--bl" />
      <i className="marks__m marks__m--br" />
    </div>
  );
}

function Description() {
  return (
    <div className="sr">
      <h1>Siddhartha — Vantage</h1>
      <p>
        An interactive artwork about a person, {SUBJECT_FULL}. The idea underneath it is
        radiolucence: material that lets radiation through. He is never drawn. What you see is five
        layers of light, each a different way of stating the same name, floating at five different
        depths in a dark room.
      </p>
      <p>
        Every point of every layer sits on the ray from one particular viewpoint — the vantage —
        through its place on the name. Seen from there, depth cancels and the five layers add up
        into the word. Seen from anywhere else they are five separate sheets of light at five
        separate distances.
      </p>
      <p>
        The layers are: instrument, which measures, and draws baselines, rulers, dimension lines
        and registration marks; design, which arranges, and draws the exact geometry of every
        letter with a survey tick on every free terminal; lattice, which computes, and holds the
        name as discrete cells; field, which infers, and is a probability cloud that denoises onto
        the stroke; and trace, which sketches, and is loose hand passes with overshoot, together
        with a drawn figure that grows as you find things.
      </p>
      <p>
        One law governs the room. Stillness resolves: hold still and the layers settle into
        agreement. Motion scatters: moving the pointer knocks the eye off the vantage and each
        layer answers differently — the instrument extends its guides to measure the error, the
        design comes apart into its construction strokes, the lattice loses resolution and the
        name survives as blocks, the field disperses back into the noise it was inferred from, and
        the trace lags behind the gesture. Attention pulls: resting on a layer, or focusing it,
        reveals detail — measured numerals, survey ticks, a finer grid, a local collapse of the
        cloud onto the stroke.
      </p>
      <p>
        A single point of ember light is the only colour and the only guide. Before you begin it
        waits at the vantage, which is where you are being drawn. At the vantage it moves into the
        counter of the shared A, the axis of the composition. When you focus a layer it travels
        there, and its light finds the posts and shards of the armature that are otherwise almost
        invisible.
      </p>
      <p>
        Controls: Begin to enter. Drag or use the arrow keys to turn, the wheel or Q and E to move
        closer and further, the number keys 1 to 5 or the layer buttons to focus a layer, Escape to
        let go, V to return to the vantage, G for the guided camera, H to hide this interface, and
        comma for settings. Nothing is ever sent anywhere.
      </p>
    </div>
  );
}

export function Overlay() {
  const phase = useUi((s) => s.phase);
  const mode = useUi((s) => s.mode);
  const focus = useUi((s) => s.focus);
  const chrome = useUi((s) => s.chrome);
  const module = useUi((s) => s.module);
  const invitation = useUi((s) => s.invitation);
  const message = useUi((s) => s.message);
  const samples = useUi((s) => s.samples);
  const settingsOpen = useUi((s) => s.settingsOpen);

  return (
    <div className="ui">
      <Description />
      <p className="sr" role="status" aria-live="polite">
        {message}
      </p>

      {phase === 'loading' && (
        <div className="veil">
          <p className="veil__line">building the world</p>
        </div>
      )}

      {phase === 'ready' && (
        <div className="veil veil--ready">
          <div className="intro">
            <p className="intro__kicker">miracle spatial · environment 01</p>
            <p className="intro__title">VANTAGE</p>
            <p className="intro__body">
              Five layers of light. They only add up from one place, and only if you stop.
            </p>
            <button type="button" className="btn btn--primary" onClick={enter} autoFocus>
              Begin
            </button>
            <p className="intro__meta">
              {samples.toLocaleString()} samples · drag to turn · V returns to the vantage
            </p>
          </div>
        </div>
      )}

      {chrome && phase === 'entered' && (
        <>
          <Marks />
          <header className="plate plate--tl">
            <p className="plate__kicker">miracle spatial</p>
            <p className="plate__line">
              {moduleDef(module).numeral} · {moduleDef(module).title.toLowerCase()}
            </p>
            <p className="plate__line plate__line--dim">radiolucence</p>
          </header>

          <nav className="journey" aria-label="Journey">
            <ol className="journey__list">
              {MODULES.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className={`btn btn--numeral${module === m.id ? ' is-on' : ''}`}
                    aria-current={module === m.id ? 'true' : undefined}
                    aria-label={`${m.title}: ${m.says}`}
                    onClick={() => goToModule(m.id)}
                  >
                    {m.numeral}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="plate plate--tr">
            <Readout />
          </div>

          <nav className="dock dock--bl" aria-label="Camera">
            <div className="dock__group" role="radiogroup" aria-label="Camera mode">
              {(['guided', 'exploratory', 'focused'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  className={`btn btn--chip${mode === m ? ' is-on' : ''}`}
                  onClick={() => setMode(m)}
                >
                  {m === 'exploratory' ? 'explore' : m}
                </button>
              ))}
            </div>
            <div className="dock__group">
              <button type="button" className="btn btn--chip" onClick={returnToVantage}>
                return to vantage <kbd>V</kbd>
              </button>
              <button
                type="button"
                className="btn btn--chip"
                onClick={toggleSettings}
                aria-expanded={settingsOpen}
              >
                settings <kbd>,</kbd>
              </button>
              <button type="button" className="btn btn--chip" onClick={toggleChrome}>
                hide <kbd>H</kbd>
              </button>
            </div>
          </nav>

          <nav className="dock dock--br" aria-label="Layers">
            <ul className="layers">
              {LAYER_DEFS.map((def) => (
                <li key={def.id}>
                  <button
                    type="button"
                    className={`btn btn--layer${focus === def.id ? ' is-on' : ''}`}
                    aria-pressed={focus === def.id}
                    aria-label={`${def.id}, ${def.verb.toLowerCase()}`}
                    onClick={() => (focus === def.id ? clearFocus() : focusLayer(def.id))}
                  >
                    <span className="btn__index">{def.index + 1}</span>
                    <span className="btn__name">{def.id}</span>
                    <span className="btn__verb">{def.verb}</span>
                  </button>
                </li>
              ))}
            </ul>
            {focus && (
              <p className="layers__says">{LAYER_DEFS.find((d) => d.id === focus)?.says}</p>
            )}
          </nav>

          {invitation && (
            <button type="button" className="btn btn--onward" onClick={goOnward}>
              follow the ember · {moduleDef(invitation).title.toLowerCase()} <kbd>N</kbd>
            </button>
          )}

          <p className="hint" aria-hidden="true">
            {mode === 'guided'
              ? 'the camera is finding the vantage — drag to take over'
              : focus
                ? 'escape lets go · 1–5 move between layers'
                : 'hold still · drag to turn · V returns to the vantage'}
          </p>
        </>
      )}

      {!chrome && phase === 'entered' && (
        <button type="button" className="btn btn--ghost btn--restore" onClick={toggleChrome}>
          show interface <kbd>H</kbd>
        </button>
      )}

      {settingsOpen && chrome && <Settings />}
    </div>
  );
}
