/* ------------------------------------------------------------------
   App.tsx - the shell: build the world, honour the preferences, and
   put an accessible interface beside the canvas rather than inside it.
   ------------------------------------------------------------------ */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { input } from './engine/input';
import { dprFor, resolveProfile } from './engine/quality';
import { sim } from './engine/sim';
import { registerBuiltinEffects } from './render/effects';
import { GROUND_HEX } from './render/palette';
import { Scene } from './render/Scene';
import { WorldProvider, type WorldBundle } from './render/WorldContext';
import { bindWorld } from './ui/actions';
import { Fallback } from './ui/Fallback';
import { Overlay } from './ui/Overlay';
import { loadPrefs, uiStore, useUi } from './ui/store';
import { buildInsideWorld } from './world/inside';
import { journeyPoint, moduleDef } from './world/journey';
import { buildVantageWorld } from './world/vantage';

registerBuiltinEffects();

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext('webgl2') || c.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

/** the framing only changes kind when the viewport crosses into portrait */
function framingKey(): boolean {
  return window.innerWidth / Math.max(1, window.innerHeight) < 1.05;
}

export function App() {
  const phase = useUi((s) => s.phase);
  const quality = useUi((s) => s.quality);
  const motionPref = useUi((s) => s.motionPref);
  const chrome = useUi((s) => s.chrome);

  const [stacked, setStacked] = useState(framingKey);
  const [bundle, setBundle] = useState<WorldBundle | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  // preferences, and whether this browser can show the piece at all
  useEffect(() => {
    loadPrefs();
    if (!webglAvailable()) uiStore.set({ phase: 'unsupported' });
  }, []);

  // reduced motion: the system preference unless the visitor overrides it
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      sim.reducedMotion = motionPref === 'reduced' || (motionPref === 'auto' && mq.matches);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [motionPref]);

  // A single owner for every global listener, attached once for the
  // life of the stage. Re-attaching it when the phase changed meant
  // there was a moment, right after the visitor pressed Begin, with no
  // listeners on the window at all - and a key pressed in that moment
  // went nowhere.
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    input.attach(el);
    return () => input.detach();
  }, []);

  useEffect(() => {
    const onResize = () => setStacked(framingKey());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const profile = useMemo(() => resolveProfile(quality), [quality]);

  // build the world after the loading state has had a frame to paint
  useEffect(() => {
    if (uiStore.get().phase === 'unsupported') return;
    let cancelled = false;
    // A timer, not requestAnimationFrame: a page opened in a background
    // tab gets no animation frames at all, and the world would never be
    // built. The only reason to defer is to let the loading state paint.
    const id = window.setTimeout(() => {
      if (cancelled) return;
      const aspect = Math.max(0.35, window.innerWidth / Math.max(1, window.innerHeight));
      const world = buildVantageWorld({
        aspect,
        fieldDensity: profile.fieldDensity,
        tracePasses: profile.tracePasses,
        latticePitch: profile.latticePitch,
      });
      const at: [number, number, number] = [0, 0, 0];
      journeyPoint(moduleDef('inside').travel, at);
      const inside = buildInsideWorld(at, 9, profile.fieldDensity > 0.5 ? 1 : 0.5);
      bindWorld(world);
      setBundle({ world, inside, profile });
      uiStore.set({
        phase: uiStore.get().phase === 'entered' ? 'entered' : 'ready',
        samples: Math.round(world.sampleCount + inside.sampleCount),
      });
    });
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [profile, stacked]);

  const dpr = useMemo(
    () => dprFor(profile, window.innerWidth, window.innerHeight),
    [profile, stacked],
  );

  if (phase === 'unsupported') return <Fallback />;

  return (
    <div
      ref={hostRef}
      className={`stage${chrome ? '' : ' stage--bare'}`}
      // the way in removes the button that was focused; focus has to
      // land somewhere deliberate or the keyboard stops working
      tabIndex={-1}
      style={{ background: GROUND_HEX }}
    >
      {bundle && (
        <Canvas
          dpr={dpr}
          shadows={profile.tier !== 'low'}
          frameloop="always"
          camera={{ position: [0, 0, 0], fov: 46, near: 0.08, far: 140 }}
          gl={{
            antialias: true,
            alpha: false,
            stencil: false,
            powerPreference: 'high-performance',
          }}
          onCreated={({ gl }) => {
            gl.setClearColor(GROUND_HEX, 1);
          }}
        >
          <WorldProvider value={bundle}>
            <Scene />
          </WorldProvider>
        </Canvas>
      )}
      <Overlay />
    </div>
  );
}
