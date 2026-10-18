/* ------------------------------------------------------------------
   Director.tsx - the only useFrame in the piece.

   Order matters and is therefore written down rather than left to the
   order components happened to mount in:

     input decay -> camera -> laws -> systems -> render

   Because this callback takes a render priority, R3F hands rendering
   over to it, which is what makes the order above a guarantee instead
   of a hope.
   ------------------------------------------------------------------ */

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, type PerspectiveCamera } from 'three';
import { input } from '../engine/input';
import { sim } from '../engine/sim';
import { systems } from '../engine/systems';
import { D0 } from '../world/layers';
import {
  clearFocus,
  cycleFocus,
  focusIndex,
  goBack,
  goOnward,
  returnToVantage,
  setMode,
  toggleChrome,
  toggleSettings,
} from '../ui/actions';
import { uiStore } from '../ui/store';
import { rig } from './camera';
import { postChain } from './post/chain';
import { useWorld } from './WorldContext';

const drag = { x: 0, y: 0, wheel: 0 };
const rayPoint = new Vector3();
const rayDir = new Vector3();

export function Director() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  const { world } = useWorld();
  const guidedAnnounced = useRef(false);

  // framing survives a resize by changing the lens, never the eye
  useEffect(() => {
    rig.fit(world, Math.max(0.35, width / Math.max(1, height)));
  }, [world, width, height]);

  // every keyboard command in the piece lands here
  useEffect(() => {
    input.onCommand((c) => {
      switch (c.kind) {
        case 'vantage':
          returnToVantage();
          break;
        case 'clear-focus':
          clearFocus();
          break;
        case 'guided':
          setMode('guided');
          break;
        case 'explore':
          setMode('exploratory');
          break;
        case 'cycle-focus':
          cycleFocus(c.delta);
          break;
        case 'focus-index':
          focusIndex(c.index);
          break;
        case 'toggle-chrome':
          toggleChrome();
          break;
        case 'toggle-settings':
          toggleSettings();
          break;
        case 'onward':
          goOnward();
          break;
        case 'back':
          goBack();
          break;
      }
    });
  }, []);

  // The whole frame, as one function. useFrame calls it with the real
  // delta; in development the dev handle below can call it with a fixed
  // one, which makes the camera path and the laws reproducible to test
  // rather than something you have to watch at the right moment.
  const frameRef = useRef<(dt: number, render?: boolean) => void>(() => {});

  frameRef.current = (dt: number, render = true) => {
    const t = sim.t;
    const ui = uiStore.get();
    const entered = ui.phase === 'entered';

    /* --- 1. input --------------------------------------------------- */
    input.decay(dt);
    input.takeDrag(drag);
    const st = input.state;

    /* --- 2. camera: the only writer of the transform ---------------- */
    if (entered) {
      if (drag.x !== 0 || drag.y !== 0) rig.drag(drag.x, drag.y);
      if (drag.wheel !== 0) rig.dolly(drag.wheel);
      if (st.present && !st.dragging) {
        // MOTION SCATTERS: the pointer is a mass that knocks the eye off V*
        rig.disturb(st.vx, st.vy, dt, ui.mode === 'focused' ? 0.3 : 1);
      }
    }
    rig.update(camera, dt, t, st.keys);

    if (sim.module !== ui.module || sim.invitation !== ui.invitation) {
      uiStore.set({ module: sim.module, invitation: sim.invitation });
    }
    if (rig.mode !== ui.mode) {
      // taking the camera over by hand is also how you let a layer go
      if (rig.mode === 'exploratory' && ui.focus) {
        sim.focused = null;
        uiStore.set({ mode: 'exploratory', focus: null });
      } else {
        uiStore.set({ mode: rig.mode });
      }
    }
    if (entered && rig.mode === 'guided' && rig.progress >= 1 && !guidedAnnounced.current) {
      guidedAnnounced.current = true;
      rig.release();
      uiStore.set({
        mode: 'exploratory',
        message:
          'The vantage. From here the five layers sum into the name. Hold still to let it resolve; move to break it.',
      });
    }
    if (rig.progress < 1) guidedAnnounced.current = false;

    /* --- 3. the laws ------------------------------------------------ */
    sim.pathSpeed = rig.telemetry.pathSpeed;
    sim.err = rig.telemetry.err;
    sim.travel = rig.travelled;

    // where the visitor is looking, as a point on the word plane
    sim.pointerPresent = st.present;
    if (st.present) {
      rayPoint.set((st.px / st.w) * 2 - 1, -((st.py / st.h) * 2 - 1), 0.5).unproject(camera);
      rayDir.copy(rayPoint).sub(camera.position).normalize();
      sim.rayOrigin[0] = camera.position.x;
      sim.rayOrigin[1] = camera.position.y;
      sim.rayOrigin[2] = camera.position.z;
      sim.rayDir[0] = rayDir.x;
      sim.rayDir[1] = rayDir.y;
      sim.rayDir[2] = rayDir.z;
      if (Math.abs(rayDir.z) > 1e-4) {
        const hit = (-D0 - camera.position.z) / rayDir.z;
        if (hit > 0 && hit < 400) {
          sim.attentionPoint[0] = camera.position.x + rayDir.x * hit;
          sim.attentionPoint[1] = camera.position.y + rayDir.y * hit;
          sim.attentionPoint[2] = camera.position.z + rayDir.z * hit;
        }
      }
    }

    sim.revealTarget = entered ? 1 : ui.phase === 'ready' ? 0.3 : 0;
    sim.update(dt, entered ? st.speed : 0, st.down && !st.dragging);

    /* --- 4. everything else, in declared order ---------------------- */
    systems.run(dt, sim.t);

    /* --- 5. one render, through the post chain if anything is on --- */
    if (render) postChain.render(gl, scene, camera);
  };

  useFrame((_, delta) => {
    // a backgrounded tab returns with a delta of seconds: step, do not leap
    frameRef.current(Math.min(Math.max(delta, 1 / 480), 0.05));
  }, 1);

  // a handle for inspecting and stepping the running world from a console
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__vantage = {
      rig,
      sim,
      input,
      gl,
      scene,
      camera,
      ui: uiStore,
      post: postChain,
      /**
       * Advance the real frame function n times. `renderEvery` lets a
       * test skip GPU submission on most frames: the simulation, the
       * camera and every uniform still run on all of them, which is
       * what the assertions are about, but a headless browser drawing
       * through a software rasteriser no longer sets the pace.
       */
      step: (dt = 1 / 60, n = 1, renderEvery = 1) => {
        for (let i = 0; i < n; i++) {
          frameRef.current(dt, renderEvery <= 1 || i % renderEvery === renderEvery - 1 || i === n - 1);
        }
      },
    };
  }, [gl, scene, camera]);

  return null;
}
