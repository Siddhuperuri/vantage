/* ------------------------------------------------------------------
   ModuleGroup.tsx - a place on the journey, drawn only when near it.

   Presence is a number, not a boolean, so a module fades in as the
   visitor approaches rather than appearing. Below a threshold the
   group is switched off entirely and costs nothing to draw.
   ------------------------------------------------------------------ */

import { useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import { sim } from '../engine/sim';
import { ORDER, useSystem } from '../engine/systems';
import { moduleDef, type ModuleId } from '../world/journey';
import { SafeModule } from './SafeModule';

export function ModuleGroup({ id, children }: { id: ModuleId; children: ReactNode }) {
  const ref = useRef<Group>(null);
  useSystem(ORDER.layer - 1, () => {
    const g = ref.current;
    if (g) g.visible = sim.weights[id] > 0.012 && sim.reveal > 0.01;
  });
  return (
    <group ref={ref} name={`module-${id}`}>
      <SafeModule name={moduleDef(id).title}>{children}</SafeModule>
    </group>
  );
}
