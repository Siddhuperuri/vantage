/* ------------------------------------------------------------------
   Inside.tsx - MODULE II, the inside of the name.

   A hundred and ten letters wrapped around the visitor, in one draw
   call each for the lines and the cloud. Per-letter state lives in a
   texture, one texel per letter, so a letter can be at a different
   stage from its neighbour without costing a draw.

   Three behaviours, all of them the laws of this world applied to
   typography rather than new rules:

     ATTENTION PULLS     resting on a letter raises its resolution,
                         and the rise spreads along its word and
                         through the letters two words share
     STILLNESS RESOLVES  attention only counts while still, so you
                         cannot read this room while thrashing about
     MOTION SCATTERS     and the opposite of a word you are attending
                         to recoils: its resolution falls and it is
                         stirred off its axis
   ------------------------------------------------------------------ */

import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DataTexture,
  FloatType,
  Group,
  LineSegments,
  NearestFilter,
  Points,
  RGBAFormat,
  ShaderMaterial,
  Vector2,
} from 'three';
import { sim } from '../../engine/sim';
import { ORDER, useSystem } from '../../engine/systems';
import { clamp, damp } from '../../lib/mathx';
import { RESTING_STAGE } from '../../world/inside';
import {
  INSIDE_CLOUD_FRAG,
  INSIDE_CLOUD_VERT,
  INSIDE_LINE_FRAG,
  INSIDE_LINE_VERT,
} from '../shaders/inside';
import { EMBER, PAPER } from '../palette';
import { useWorld } from '../WorldContext';

const sizeScratch = new Vector2();

export function Inside() {
  const { inside } = useWorld();
  const gl = useThree((s) => s.gl);

  const built = useMemo(() => {
    const n = inside.letterCount;

    // one texel per letter: r resolution, g attention, b recoil
    const data = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) data[i * 4] = 0.12;
    const state = new DataTexture(data, n, 1, RGBAFormat, FloatType);
    state.minFilter = NearestFilter;
    state.magFilter = NearestFilter;
    state.needsUpdate = true;

    const shared = {
      uState: { value: state },
      uLetters: { value: n },
      uTime: { value: 0 },
      uStill: { value: 0 },
      uReveal: { value: 0 },
      uPresence: { value: 0 },
      uColor: { value: PAPER.clone() },
    };

    const lineGeo = new BufferGeometry();
    lineGeo.setAttribute('position', new BufferAttribute(inside.line.position, 3));
    lineGeo.setAttribute('aMeta', new BufferAttribute(inside.line.meta, 4));
    lineGeo.setAttribute('aNormal', new BufferAttribute(inside.line.normal, 3));
    lineGeo.computeBoundingSphere();

    const lineMat = new ShaderMaterial({
      vertexShader: INSIDE_LINE_VERT,
      fragmentShader: INSIDE_LINE_FRAG,
      uniforms: { ...shared, uEmber: { value: EMBER.clone() } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    const cloudGeo = new BufferGeometry();
    cloudGeo.setAttribute('position', new BufferAttribute(inside.cloud.position, 3));
    cloudGeo.setAttribute('aJitter', new BufferAttribute(inside.cloud.jitter, 3));
    cloudGeo.setAttribute('aMeta', new BufferAttribute(inside.cloud.meta, 4));
    cloudGeo.computeBoundingSphere();

    const cloudMat = new ShaderMaterial({
      vertexShader: INSIDE_CLOUD_VERT,
      fragmentShader: INSIDE_CLOUD_FRAG,
      uniforms: {
        ...shared,
        uViewportH: { value: gl.getDrawingBufferSize(sizeScratch).y },
        uSize: { value: 1.7 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    const lines = new LineSegments(lineGeo, lineMat);
    lines.frustumCulled = false;
    lines.name = 'inside-wall';
    const cloud = new Points(cloudGeo, cloudMat);
    cloud.frustumCulled = false;
    cloud.name = 'inside-cloud';

    const group = new Group();
    group.name = 'inside';
    group.add(lines, cloud);

    // per-letter simulation state, preallocated: the frame allocates nothing
    const resolution = new Float32Array(n);
    const attention = new Float32Array(n);
    const recoil = new Float32Array(n);
    const want = new Float32Array(n);
    const resting = new Float32Array(n);
    const wordAttention = new Float32Array(inside.words.length);

    for (const L of inside.letters) {
      const first = inside.words[L.words[0]];
      resting[L.index] = RESTING_STAGE[first?.temper ?? 'middle'];
      resolution[L.index] = resting[L.index];
    }

    return {
      group,
      lineGeo,
      lineMat,
      cloudGeo,
      cloudMat,
      state,
      data,
      resolution,
      attention,
      recoil,
      want,
      resting,
      wordAttention,
    };
  }, [inside, gl]);

  useEffect(
    () => () => {
      built.lineGeo.dispose();
      built.lineMat.dispose();
      built.cloudGeo.dispose();
      built.cloudMat.dispose();
      built.state.dispose();
    },
    [built],
  );

  const hoveredRef = useRef(-1);

  useSystem(ORDER.layer, (dt) => {
    const presence = sim.weights.inside;
    built.group.visible = presence > 0.01 && sim.reveal > 0.01;
    // a module that is not here costs nothing at all
    if (!built.group.visible) return;

    const {
      data,
      state,
      resolution,
      attention,
      recoil,
      want,
      resting,
      wordAttention,
      lineMat,
      cloudMat,
    } = built;
    const n = inside.letterCount;

    /* ---- what is being looked at ---------------------------------- */
    let hovered = -1;
    if (sim.pointerPresent) {
      const [ox, oy, oz] = sim.rayOrigin;
      const [dx, dy, dz] = sim.rayDir;
      const cx = inside.center[0];
      const cz = inside.center[2];
      const px = ox - cx;
      const pz = oz - cz;
      const a = dx * dx + dz * dz;
      const b = 2 * (px * dx + pz * dz);
      const c = px * px + pz * pz - inside.radius * inside.radius;
      const disc = b * b - 4 * a * c;
      if (a > 1e-6 && disc > 0) {
        // the far root: the visitor is standing inside the room
        const t = (-b + Math.sqrt(disc)) / (2 * a);
        if (t > 0) {
          const hx = ox + dx * t;
          const hy = oy + dy * t;
          const hz = oz + dz * t;
          const az = Math.atan2(hx - cx, -(hz - cz));
          let best = Infinity;
          for (let i = 0; i < n; i++) {
            const L = inside.letters[i];
            let daz = L.azimuth - az;
            daz = daz - Math.PI * 2 * Math.floor((daz + Math.PI) / (Math.PI * 2));
            const dxx = daz * inside.radius;
            const dyy = L.y - hy;
            const d2 = dxx * dxx + dyy * dyy;
            if (d2 < best) {
              best = d2;
              hovered = i;
            }
          }
          // only if the pointer is actually on a letter, not between them
          if (best > 0.7 * 0.7) hovered = -1;
        }
      }
    }
    hoveredRef.current = hovered;

    /* ---- attention, and how it spreads ---------------------------- */
    want.fill(0);
    if (hovered >= 0) {
      want[hovered] = 1;
      const L = inside.letters[hovered];
      for (const wi of L.words) {
        const word = inside.words[wi];
        for (const li of word.letters) want[li] = Math.max(want[li], 0.52);
        // and on through the letters two words share
        for (const li of word.letters) {
          const other = inside.letters[li];
          if (other.words.length < 2) continue;
          for (const wj of other.words) {
            if (wj === wi) continue;
            for (const lj of inside.words[wj].letters) {
              want[lj] = Math.max(want[lj], 0.22);
            }
          }
        }
      }
    }

    const still = sim.still;
    for (let i = 0; i < n; i++) {
      const target = want[i] * still;
      attention[i] = damp(attention[i], target, target > attention[i] ? 4 : 1.3, dt);
    }

    /* ---- the contradictions recoil -------------------------------- */
    wordAttention.fill(0);
    for (let i = 0; i < n; i++) {
      for (const wi of inside.letters[i].words) {
        if (attention[i] > wordAttention[wi]) wordAttention[wi] = attention[i];
      }
    }
    for (let i = 0; i < n; i++) {
      let r = 0;
      for (const wi of inside.letters[i].words) {
        const opp = inside.words[wi].opposes;
        if (opp >= 0 && wordAttention[opp] > r) r = wordAttention[opp];
      }
      recoil[i] = damp(recoil[i], r * still, 2.5, dt);
    }

    /* ---- resolution: attention raises, neglect relaxes ------------ */
    for (let i = 0; i < n; i++) {
      const rest = resting[i];
      const target = clamp(rest + attention[i] * (1 - rest) - recoil[i] * 0.34, 0, 1);
      resolution[i] = damp(resolution[i], target, target > resolution[i] ? 2.6 : 1.1, dt);

      data[i * 4] = resolution[i];
      data[i * 4 + 1] = attention[i];
      data[i * 4 + 2] = recoil[i];
    }
    state.needsUpdate = true;

    for (const u of [lineMat.uniforms, cloudMat.uniforms]) {
      u.uTime.value = sim.t;
      u.uStill.value = still;
      u.uReveal.value = sim.reveal;
      u.uPresence.value = presence;
    }
    cloudMat.uniforms.uViewportH.value = gl.getDrawingBufferSize(sizeScratch).y;
  });

  return <primitive object={built.group} />;
}
