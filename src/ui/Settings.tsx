/* ------------------------------------------------------------------
   Settings.tsx - the four choices worth offering.

   Motion, quality, how the field layer is drawn, and whether the
   in-world labels exist. The field choice is the visible proof that
   the engine separates world data from treatment: the same cloud,
   drawn two ways, swapped without rebuilding the world.
   ------------------------------------------------------------------ */

import { useEffect, useRef } from 'react';
import { FIELD_TREATMENTS } from '../render/effects';
import { TREATMENTS, TREATMENT_LABEL } from '../render/post/chain';
import { getEffect } from '../engine/effects/registry';
import type { QualitySetting } from '../engine/quality';
import { savePrefs, uiStore, useUi, type MotionPref } from './store';
import { announce, toggleSettings } from './actions';

const MOTION: { id: MotionPref; label: string }[] = [
  { id: 'auto', label: 'system' },
  { id: 'reduced', label: 'reduced' },
  { id: 'full', label: 'full' },
];

const QUALITY: QualitySetting[] = ['auto', 'low', 'medium', 'high'];

/** the tiers, in the visitor's words rather than the code's */
const QUALITY_LABEL: Record<QualitySetting, string> = {
  auto: 'auto',
  low: 'low',
  medium: 'balanced',
  high: 'high',
};

export function Settings() {
  const motionPref = useUi((s) => s.motionPref);
  const quality = useUi((s) => s.quality);
  const fieldTreatment = useUi((s) => s.fieldTreatment);
  const treatment = useUi((s) => s.treatment);
  const labels = useUi((s) => s.labels);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('button, input')?.focus();
  }, []);

  return (
    <div className="sheet" role="dialog" aria-modal="false" aria-label="Settings" ref={ref}>
      <div className="sheet__head">
        <p className="sheet__title">settings</p>
        <button type="button" className="btn btn--chip" onClick={toggleSettings}>
          close <kbd>esc</kbd>
        </button>
      </div>

      <fieldset className="field">
        <legend>motion</legend>
        <div className="field__row">
          {MOTION.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={motionPref === m.id}
              className={`btn btn--chip${motionPref === m.id ? ' is-on' : ''}`}
              onClick={() => {
                uiStore.set({ motionPref: m.id });
                savePrefs();
                announce(
                  m.id === 'reduced'
                    ? 'Reduced motion. Drift, camera travel and long transitions are shortened.'
                    : 'Motion set to ' + m.label + '.',
                );
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="field__note">
          Reduced motion shortens the guided path, stops the drift and softens how far movement
          throws the layers apart. The world stays usable and the laws still apply.
        </p>
      </fieldset>

      <fieldset className="field">
        <legend>quality</legend>
        <div className="field__row">
          {QUALITY.map((q) => (
            <button
              key={q}
              type="button"
              role="radio"
              aria-checked={quality === q}
              className={`btn btn--chip${quality === q ? ' is-on' : ''}`}
              onClick={() => {
                uiStore.set({ quality: q });
                savePrefs();
                announce(
                  `Quality ${QUALITY_LABEL[q]}. The world is rebuilt at the new density.`,
                );
              }}
            >
              {QUALITY_LABEL[q]}
            </button>
          ))}
        </div>
        <p className="field__note">
          Changes the density of the field cloud, the number of hand passes in the trace, the
          lattice pitch and the pixel ratio. The world is rebuilt.
        </p>
      </fieldset>

      <fieldset className="field">
        <legend>field layer</legend>
        <div className="field__row">
          {FIELD_TREATMENTS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={fieldTreatment === id}
              className={`btn btn--chip${fieldTreatment === id ? ' is-on' : ''}`}
              onClick={() => {
                uiStore.set({ fieldTreatment: id });
                savePrefs();
                announce(`Field layer drawn as ${getEffect(id).label.toLowerCase()}.`);
              }}
            >
              {getEffect(id).label.toLowerCase()}
            </button>
          ))}
        </div>
        <p className="field__note">
          The same cloud of samples, drawn two ways: soft additive points, or hard screen dots
          sized by the light each sample stands for.
        </p>
      </fieldset>

      <fieldset className="field">
        <legend>print treatment</legend>
        <div className="field__row">
          {(['auto', ...TREATMENTS] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={treatment === id}
              className={`btn btn--chip${treatment === id ? ' is-on' : ''}`}
              onClick={() => {
                uiStore.set({ treatment: id });
                savePrefs();
                announce(
                  id === 'auto'
                    ? 'Print treatment follows the journey: none at the vantage and inside, riso at the edge, and a loss of resolution through the deep.'
                    : `Print treatment held at ${id}.`,
                );
              }}
            >
              {id === 'auto' ? 'auto' : TREATMENT_LABEL[id]}
            </button>
          ))}
        </div>
        <p className="field__note">
          The frame, re-stated through a sampling rule. On auto each place chooses its own: the
          vantage and the inside stay unprinted, the edge is a two-ink riso, and the descent loses
          resolution as it falls &mdash; ascii, halftone, dither, then pixels.
        </p>
      </fieldset>

      <fieldset className="field">
        <legend>in-world labels</legend>
        <div className="field__row">
          <button
            type="button"
            role="switch"
            aria-checked={labels}
            className={`btn btn--chip${labels ? ' is-on' : ''}`}
            onClick={() => {
              uiStore.set({ labels: !labels });
              savePrefs();
            }}
          >
            {labels ? 'on' : 'off'}
          </button>
        </div>
        <p className="field__note">
          The name and verb of a layer, drawn on that layer&rsquo;s own plane, shown only while it
          is attended to.
        </p>
      </fieldset>
    </div>
  );
}
