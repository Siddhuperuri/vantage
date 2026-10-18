/* ------------------------------------------------------------------
   WorldContext.tsx - the built world, handed to whoever draws it.

   The world is rebuilt only when the quality tier changes or the
   viewport crosses between landscape and stacked portrait framing, so
   this context is stable for the life of a visit in practice.
   ------------------------------------------------------------------ */

import { createContext, useContext, type ReactNode } from 'react';
import type { QualityProfile } from '../engine/quality';
import type { InsideWorld } from '../world/inside';
import type { VantageWorld } from '../world/vantage';

export interface WorldBundle {
  readonly world: VantageWorld;
  readonly inside: InsideWorld;
  readonly profile: QualityProfile;
}

const Ctx = createContext<WorldBundle | null>(null);

export function WorldProvider({ value, children }: { value: WorldBundle; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorld(): WorldBundle {
  const v = useContext(Ctx);
  if (!v) throw new Error('useWorld outside WorldProvider');
  return v;
}
