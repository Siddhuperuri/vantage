/* ------------------------------------------------------------------
   store.ts - the interface state, and nothing else.

   About forty lines instead of a state-management dependency, because
   there are nine fields and they only change when the visitor does
   something. Everything that changes per frame lives in engine/sim.ts
   and never passes through React at all.
   ------------------------------------------------------------------ */

import { useSyncExternalStore } from 'react';
import type { QualitySetting } from '../engine/quality';
import type { LayerId } from '../world/layers';
import type { ModuleId } from '../world/journey';
import type { FieldTreatment } from '../render/effects';
import type { TreatmentId } from '../render/post/chain';

export type Phase = 'loading' | 'ready' | 'entered' | 'unsupported';
export type CameraMode = 'guided' | 'exploratory' | 'focused';
export type MotionPref = 'auto' | 'reduced' | 'full';

export interface UiState {
  phase: Phase;
  mode: CameraMode;
  focus: LayerId | null;
  /** which of the four places the visitor is in */
  module: ModuleId;
  /** the module the ember is inviting them toward, if any */
  invitation: ModuleId | null;
  motionPref: MotionPref;
  quality: QualitySetting;
  fieldTreatment: FieldTreatment;
  /** print treatment: 'auto' lets each module choose its own */
  treatment: TreatmentId | 'auto';
  /** in-world layer labels */
  labels: boolean;
  /** the html interface: hidden with H, so the artwork can be seen alone */
  chrome: boolean;
  settingsOpen: boolean;
  /** what the live region says */
  message: string;
  /** samples built, for the loading state */
  samples: number;
}

const initial: UiState = {
  phase: 'loading',
  mode: 'guided',
  focus: null,
  module: 'vantage',
  invitation: null,
  motionPref: 'auto',
  quality: 'auto',
  fieldTreatment: 'field.points',
  treatment: 'auto',
  labels: true,
  chrome: true,
  settingsOpen: false,
  message: '',
  samples: 0,
};

let state: UiState = initial;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

export const uiStore = {
  get(): UiState {
    return state;
  },
  set(patch: Partial<UiState>): void {
    let changed = false;
    for (const k of Object.keys(patch) as (keyof UiState)[]) {
      if (state[k] !== patch[k]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    state = { ...state, ...patch };
    emit();
  },
  subscribe(l: () => void): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useUi<T>(select: (s: UiState) => T): T {
  return useSyncExternalStore(uiStore.subscribe, () => select(state), () => select(initial));
}

/** the saved preference, if the visitor has one. Nothing is sent anywhere. */
const KEY = 'miracle.spatial.prefs';

export function loadPrefs(): void {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return;
    const p = JSON.parse(raw) as Partial<UiState>;
    uiStore.set({
      motionPref: p.motionPref ?? 'auto',
      quality: p.quality ?? 'auto',
      fieldTreatment: p.fieldTreatment ?? 'field.points',
      treatment: p.treatment ?? 'auto',
      labels: p.labels ?? true,
    });
  } catch {
    // a visitor with storage disabled simply gets the defaults
  }
}

export function savePrefs(): void {
  try {
    const { motionPref, quality, fieldTreatment, treatment, labels } = state;
    localStorage.setItem(
      KEY,
      JSON.stringify({ motionPref, quality, fieldTreatment, treatment, labels }),
    );
  } catch {
    // nothing to do: the preference is a convenience, not state the piece needs
  }
}
