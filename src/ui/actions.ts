/* ------------------------------------------------------------------
   actions.ts - the only place the interface, the camera and the laws
   are changed together.

   A button, a key and a click on an object in the world all come
   through here, so there is one definition of what "focus a layer"
   means and no two paths that disagree.
   ------------------------------------------------------------------ */

import { sim } from '../engine/sim';
import { rig } from '../render/camera';
import { LAYER_DEFS, LAYER_IDS, layerDef, type LayerId } from '../world/layers';
import {
  moduleDef,
  nextModule,
  prevModule,
  type ModuleId,
} from '../world/journey';
import type { VantageWorld } from '../world/vantage';
import { savePrefs, uiStore, type CameraMode, type MotionPref } from './store';

let world: VantageWorld | null = null;

export function bindWorld(w: VantageWorld): void {
  world = w;
}

export function announce(message: string): void {
  uiStore.set({ message });
}

export function enter(): void {
  const s = uiStore.get();
  if (s.phase === 'entered') return;
  uiStore.set({ phase: 'entered', mode: 'guided' });
  rig.begin(sim.reducedMotion);
  // Begin is unmounted by that state change. Without this the focused
  // element is a detached node and every keyboard control is dead until
  // the visitor clicks or tabs somewhere.
  document.querySelector<HTMLElement>('.stage')?.focus({ preventScroll: true });
  announce(
    'Entering VANTAGE. The camera is travelling to the one viewpoint from which the five layers resolve. Press Escape or drag to take over.',
  );
}

export function setMode(mode: CameraMode): void {
  if (mode === 'guided') {
    rig.begin(sim.reducedMotion);
    uiStore.set({ mode: 'guided', focus: null });
    sim.focused = null;
    announce('Guided. The camera is revealing the composition; any drag or key takes over.');
    return;
  }
  if (mode === 'exploratory') {
    rig.release();
    uiStore.set({ mode: 'exploratory', focus: null });
    sim.focused = null;
    announce('Exploring. Drag to turn, wheel or Q and E to move closer, arrow keys to look.');
    return;
  }
  // focused with no argument focuses the first layer
  focusLayer(uiStore.get().focus ?? 'instrument');
}

export function focusLayer(id: LayerId): void {
  if (!world) return;
  const def = layerDef(id);
  rig.focusOn(def, world);
  sim.focused = id;
  const first = sim.discover(id);
  uiStore.set({ mode: 'focused', focus: id });
  announce(
    `${def.id.toUpperCase()}: ${def.verb}. ${def.says}${first ? ' The figure in the trace layer has grown.' : ''}`,
  );
}

export function cycleFocus(delta: number): void {
  const cur = uiStore.get().focus;
  const i = cur ? LAYER_IDS.indexOf(cur) : -1;
  const next = (i + delta + LAYER_IDS.length * 2) % LAYER_IDS.length;
  focusLayer(LAYER_IDS[next]);
}

export function focusIndex(i: number): void {
  const def = LAYER_DEFS[i];
  if (def) focusLayer(def.id);
}

export function clearFocus(): void {
  if (uiStore.get().settingsOpen) {
    uiStore.set({ settingsOpen: false });
    return;
  }
  sim.focused = null;
  rig.release();
  uiStore.set({ mode: 'exploratory', focus: null });
  announce('Released. Back to exploring.');
}

export function returnToVantage(): void {
  sim.focused = null;
  rig.toVantage();
  uiStore.set({ mode: 'exploratory', focus: null });
  announce('Returning to the vantage. Hold still and the five layers will sum into the name.');
}

/** fly to one of the four places. The flight is a flight, not a cut. */
export function goToModule(id: ModuleId): void {
  const def = moduleDef(id);
  sim.focused = null;
  rig.toModule(def);
  uiStore.set({ mode: 'exploratory', focus: null });
  announce(`${def.numeral}. ${def.title}. ${def.says}`);
}

export function goOnward(): void {
  const next = nextModule(uiStore.get().module);
  if (next) goToModule(next.id);
  else announce('This is the end of the journey. V returns to the vantage.');
}

export function goBack(): void {
  const prev = prevModule(uiStore.get().module);
  if (prev) goToModule(prev.id);
  else returnToVantage();
}

export function toggleChrome(): void {
  const chrome = !uiStore.get().chrome;
  uiStore.set({ chrome, settingsOpen: false });
  announce(chrome ? 'Interface shown.' : 'Interface hidden. Press H to show it again.');
}

export function toggleSettings(): void {
  uiStore.set({ settingsOpen: !uiStore.get().settingsOpen });
}

export function setMotionPref(motionPref: MotionPref): void {
  uiStore.set({ motionPref });
  savePrefs();
}
