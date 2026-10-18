/* ------------------------------------------------------------------
   PickProxies.tsx - how the pointer touches a sheet of light.

   You cannot raycast a line made of one-pixel segments, so each layer
   gets one invisible quad standing on its own plane, sized to its
   sheet. Hovering one is ATTENTION; clicking or tapping one focuses
   the layer. Everything these do is also reachable from the layer
   buttons in the interface and from the number keys, so nothing here
   is the only way to operate the piece.
   ------------------------------------------------------------------ */

import { useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { sim } from '../engine/sim';
import { LAYER_DEFS } from '../world/layers';
import { clearFocus, focusLayer } from '../ui/actions';
import { uiStore } from '../ui/store';
import { useWorld } from './WorldContext';

export function PickProxies() {
  const { world } = useWorld();
  const quads = useMemo(
    () =>
      LAYER_DEFS.map((def) => {
        const b = world.bounds[def.index];
        return { def, b };
      }),
    [world],
  );

  return (
    <group name="pick">
      {quads.map(({ def, b }) => (
        <mesh
          key={def.id}
          position={[b.center[0], b.center[1], b.center[2]]}
          onPointerOver={(e: ThreeEvent<PointerEvent>) => {
            e.stopPropagation();
            sim.hovered = def.id;
          }}
          onPointerOut={() => {
            if (sim.hovered === def.id) sim.hovered = null;
          }}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            if (uiStore.get().phase !== 'entered') return;
            if (uiStore.get().focus === def.id) clearFocus();
            else focusLayer(def.id);
          }}
        >
          <planeGeometry args={[b.width, b.height]} />
          {/* present to the raycaster, absent to the eye */}
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
