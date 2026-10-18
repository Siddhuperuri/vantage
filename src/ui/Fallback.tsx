/* ------------------------------------------------------------------
   Fallback.tsx - the piece without a GPU.

   Not an apology screen. The alphabet is geometry, not a font file, so
   the same strokes that build the world build this: the name drawn
   five times, one per layer, offset and dimmed the way the five sheets
   stand apart when you are not at the vantage. It is a still frame of
   the actual artwork, from the actual data.
   ------------------------------------------------------------------ */

import { LAYER_DEFS } from '../world/layers';
import { svgPath } from '../world/glyphs';
import { SUBJECT_FULL } from '../world/vantage';

const NAME = 'SIDDHARTHA';

export function Fallback() {
  const { d, width } = svgPath(NAME, 100, 0.3);
  const pad = 70;
  const vw = width + pad * 2;
  const vh = 300;

  return (
    <main className="fallback">
      <svg
        className="fallback__art"
        viewBox={`${-pad} ${-pad} ${vw} ${vh}`}
        role="img"
        aria-label={`The name ${NAME}, drawn five times, one for each layer of the artwork`}
      >
        {LAYER_DEFS.map((def, i) => {
          // the further the layer, the further it has slipped: this is
          // what the five sheets look like from anywhere but the vantage
          const k = (LAYER_DEFS.length - 1 - i) / (LAYER_DEFS.length - 1);
          const dx = (k - 0.5) * 46;
          const dy = (0.5 - k) * 26;
          return (
            <g key={def.id} transform={`translate(${dx} ${dy})`} opacity={0.16 + 0.3 * (1 - k)}>
              <path d={d} fill="none" stroke="#e9e2d3" strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
            </g>
          );
        })}
        <circle cx={width * 0.5} cy={100} r={3} fill="#ff5c24" />
      </svg>

      <div className="fallback__text">
        <h1>Siddhartha — Vantage</h1>
        <p>
          This browser cannot give the piece a WebGL context, so here is the artwork as a still
          drawing instead: the name {NAME}, drawn once for each of its five layers, standing apart
          the way they stand apart when you are not at the vantage.
        </p>
        <p>
          The work is about a person, {SUBJECT_FULL}, and the idea underneath it is radiolucence:
          material that lets radiation through. He is never drawn. Five layers each state the same
          name a different way — instrument measures, design arranges, lattice computes, field
          infers, trace sketches — and from one viewpoint, and only from there, they add up into
          the word.
        </p>
        <p>
          One law governs the room: stillness resolves, motion scatters, attention pulls. To see it
          move, open this page in a browser with WebGL enabled and hardware acceleration switched
          on.
        </p>
        <ul>
          {LAYER_DEFS.map((def) => (
            <li key={def.id}>
              <strong>{def.id}</strong> — {def.verb.toLowerCase()}. {def.says}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
