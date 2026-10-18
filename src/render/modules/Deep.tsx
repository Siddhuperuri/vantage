/* ------------------------------------------------------------------
   Deep.tsx - MODULE IV, the deep.

   The floor lets go. What was a room becomes a shaft, and the five
   layers meet again in a different relationship: not stacked in front
   of the visitor but falling past them.

   Four of the twenty treatments live here, and each has a reason:

     10 VAPORWAVE GRID  a descent needs scale. The grid is what tells
                        you how fast you are falling and how far it is
                        to the next thing. It is a context, not a look.
      7 FLOW FIELDS     the field layer, which inferred a name in
                        module I, is here let go: its samples follow a
                        coherent vector field instead of a stroke.
      6 PARTICLE SWARM  and they still answer the laws - they gather
                        toward attention and scatter with energy.
      1 LIQUID MORPH    the subject's own geometry, carried down and
                        folded from the flat word into a closed form
                        and back, driven by depth rather than by time.
     18 KINETIC TYPE    at the bottom the name reassembles, and each
                        letter answers where the visitor is standing.
   ------------------------------------------------------------------ */

import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  LineSegments,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import { sim } from '../../engine/sim';
import { ORDER, useSystem } from '../../engine/systems';
import { clamp } from '../../lib/mathx';
import { gauss, rng } from '../../lib/mathx';
import { journeyPoint, moduleDef, TRAVEL_MAX } from '../../world/journey';
import { layout } from '../../world/glyphs';
import { EMBER, PAPER } from '../palette';
import { segmentsGeometry, textSegments } from '../text3d';
import { useWorld } from '../WorldContext';

const sizeScratch = new Vector2();

/* ---- the shaft the whole module hangs in -------------------------- */
const SHAFT_RADIUS = 15;
const TOP = 2;
const BOTTOM = -82;

/* ---- 10. VAPORWAVE GRID ------------------------------------------ */
const GRID_VERT = /* glsl */ `
  uniform float uPresence;
  uniform vec3 uEye;
  varying float vFade;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    // a grid is only useful where you are: it fades with distance so
    // the shaft reads as deep rather than as a wall of lines
    float d = length(world.xyz - uEye);
    vFade = (1.0 - smoothstep(10.0, 46.0, d)) * smoothstep(1.5, 6.0, d) * uPresence;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const GRID_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vFade;
  void main() {
    float a = vFade * uOpacity;
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor, a);
  }
`;

/* ---- 6 + 7. SWARM ON A FLOW FIELD -------------------------------- */
const FLOW_VERT = /* glsl */ `
  attribute vec4 aMeta;     // x phase, y seed, z size, w band
  attribute float aEnd;     // 0 the tail of the streak, 1 its head
  uniform float uTime;
  uniform float uPresence;
  uniform float uEnergy;
  uniform float uStill;
  uniform vec3  uAttract;
  uniform float uAttractStrength;
  uniform float uViewportH;
  uniform float uSize;
  uniform float uSpan;
  uniform float uBottom;

  varying float vAlpha;
  varying float vBand;

  // A coherent, smooth vector field. Structured on purpose: particles
  // that follow it move together, which is what separates a flow from
  // a drift.
  vec3 field(vec3 p, float t) {
    float s = 0.085;
    return vec3(
      sin(p.y * s + t * 0.21) + 0.55 * cos(p.z * s * 1.7 - t * 0.17),
      0.30 * sin(p.x * s * 1.3 + t * 0.19) - 0.55,
      cos(p.x * s - t * 0.15) + 0.55 * sin(p.y * s * 1.5 + t * 0.13)
    );
  }

  void main() {
    float phase = aMeta.x;
    float seed = aMeta.y;

    // Integrate along the field for a few steps. The phase staggers
    // the particles along the same streamlines, so the field itself
    // becomes visible rather than just its effect.
    vec3 p = position;
    float t = uTime + phase * 12.0;
    float h = 0.55;
    for (int i = 0; i < 5; i++) {
      // the head of the streak takes one more step than its tail, so
      // the segment between them IS a piece of the streamline
      if (float(i) >= 4.0 + aEnd) break;
      p += field(p, t) * h;
      t += h * 0.4;
    }

    // ATTENTION PULLS: the swarm gathers where the visitor is looking
    vec3 toA = uAttract - p;
    float d = length(toA);
    float pull = uAttractStrength * (1.0 - smoothstep(0.0, 14.0, d));
    p += normalize(toA + vec3(0.0001)) * pull * min(d, 7.0) * 0.55;

    // MOTION SCATTERS: energy throws them off their streamline
    p += vec3(
      sin(seed * 41.0 + uTime * 1.7),
      cos(seed * 27.0 + uTime * 1.3),
      sin(seed * 63.0 + uTime * 2.1)
    ) * uEnergy * 1.9;

    // The shaft is a loop: a particle that falls out of the bottom
    // comes back in at the top, so the fall never runs out. The wrap
    // has to be anchored to the shaft, not to the origin, or half of
    // the swarm is teleported above the ceiling.
    p.y = uBottom + mod(p.y - uBottom, uSpan);

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    // quiet on purpose: this is a field being traced, not a storm
    vAlpha = uPresence * (0.085 + 0.14 * uStill + pull * 0.8) * aMeta.z;
    vBand = aMeta.w;
    gl_Position = projectionMatrix * mv;
  }
`;

const FLOW_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform vec3 uEmber;
  varying float vAlpha;
  varying float vBand;
  void main() {
    if (vAlpha < 0.004) discard;
    gl_FragColor = vec4(mix(uColor, uEmber, vBand * 0.55), vAlpha);
  }
`;

/* ---- 1. LIQUID MORPH --------------------------------------------- */
const MORPH_VERT = /* glsl */ `
  attribute vec3 aClosed;   // the same point, on a closed form
  attribute vec2 aMeta;     // x seed, y sweep across the word
  uniform float uMorph;     // 0 the word, 1 the closed form
  uniform float uPresence;
  uniform float uTime;
  uniform float uStill;
  varying float vAlpha;

  void main() {
    // Each point crosses at its own moment, left to right, so the
    // change reads as a fold rather than a scale. Smootherstep keeps
    // the velocity continuous at both ends: no snap, no overshoot.
    float local = clamp((uMorph - aMeta.y * 0.35) / 0.65, 0.0, 1.0);
    local = local * local * local * (local * (local * 6.0 - 15.0) + 10.0);

    vec3 p = mix(position, aClosed, local);

    // a slow swell while it is between forms, gone once it settles
    float between = sin(local * 3.14159);
    p += normalize(p + vec3(0.001)) * between * 0.22 * (1.0 - uStill * 0.6)
         * sin(uTime * 0.7 + aMeta.x * 31.0);

    vAlpha = uPresence * (0.10 + 0.22 * uStill);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const MORPH_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    if (vAlpha < 0.004) discard;
    gl_FragColor = vec4(uColor, vAlpha);
  }
`;

/* ---- 18. KINETIC TYPOGRAPHY -------------------------------------- */
const KINETIC_VERT = /* glsl */ `
  attribute vec3 aAnchor;   // the letter's home, so a letter moves as one
  attribute vec2 aMeta;     // x letter index, y letter count
  uniform vec3  uEye;
  uniform float uPresence;
  uniform float uStill;
  uniform float uAssemble;  // 0 scattered, 1 the name
  uniform float uTime;
  varying float vAlpha;

  void main() {
    float idx = aMeta.x;

    // where this letter waits before the name exists: out on the wall
    // of the shaft, each at its own angle
    float a = idx * 2.399963;
    vec3 away = aAnchor + vec3(cos(a) * 11.0, sin(a * 1.7) * 7.0, sin(a) * 11.0);

    float t = clamp(uAssemble * 1.35 - idx / max(1.0, aMeta.y) * 0.35, 0.0, 1.0);
    t = t * t * (3.0 - 2.0 * t);
    vec3 home = mix(away, aAnchor, t);
    vec3 p = position + (home - aAnchor);

    // ATTENTION: a letter leans toward the visitor as they come to it,
    // which is the whole of its behaviour - no spin, no bounce
    vec3 toEye = uEye - home;
    float d = length(toEye);
    float near = 1.0 - smoothstep(4.0, 20.0, d);
    p += normalize(toEye + vec3(0.001)) * near * 0.55 * (0.3 + 0.7 * uStill);

    // and drifts a little while it is still on its way
    p += vec3(sin(uTime * 0.6 + idx), cos(uTime * 0.5 + idx * 1.7), 0.0) * (1.0 - t) * 0.35;

    vAlpha = uPresence * t * (0.25 + 0.65 * uStill + near * 0.5);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const KINETIC_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uColor;
  uniform vec3 uEmber;
  uniform float uEmberMix;
  varying float vAlpha;
  void main() {
    if (vAlpha < 0.004) discard;
    gl_FragColor = vec4(mix(uColor, uEmber, uEmberMix), vAlpha);
  }
`;

export function Deep() {
  const { world, profile } = useWorld();
  const gl = useThree((s) => s.gl);

  const built = useMemo(() => {
    const at: [number, number, number] = [0, 0, 0];
    journeyPoint(moduleDef('deep').travel, at);
    const axisZ = at[2];
    const group = new Group();
    group.name = 'deep';
    const disposables: { dispose(): void }[] = [];
    const span = TOP - BOTTOM;

    /* ---- the grid that gives the fall a scale ------------------- */
    const gridPts: number[] = [];
    const rings = Math.round(span / 3);
    for (let i = 0; i <= rings; i++) {
      const y = TOP - i * 3;
      const seg = 72;
      for (let k = 0; k < seg; k++) {
        const a0 = (k / seg) * Math.PI * 2;
        const a1 = ((k + 1) / seg) * Math.PI * 2;
        gridPts.push(
          Math.cos(a0) * SHAFT_RADIUS,
          y,
          axisZ + Math.sin(a0) * SHAFT_RADIUS,
          Math.cos(a1) * SHAFT_RADIUS,
          y,
          axisZ + Math.sin(a1) * SHAFT_RADIUS,
        );
      }
    }
    // the verticals: the part that actually reads as perspective
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2;
      gridPts.push(
        Math.cos(a) * SHAFT_RADIUS,
        TOP,
        axisZ + Math.sin(a) * SHAFT_RADIUS,
        Math.cos(a) * SHAFT_RADIUS,
        BOTTOM,
        axisZ + Math.sin(a) * SHAFT_RADIUS,
      );
    }
    const gridGeo = new BufferGeometry();
    gridGeo.setAttribute('position', new BufferAttribute(new Float32Array(gridPts), 3));
    const gridMat = new ShaderMaterial({
      vertexShader: GRID_VERT,
      fragmentShader: GRID_FRAG,
      uniforms: {
        uColor: { value: PAPER.clone() },
        uOpacity: { value: 0.15 },
        uPresence: { value: 0 },
        uEye: { value: new Vector3() },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    disposables.push(gridGeo, gridMat);
    const grid = new LineSegments(gridGeo, gridMat);
    grid.frustumCulled = false;
    grid.name = 'deep-grid';
    group.add(grid);

    /* ---- the swarm on the flow field ---------------------------- */
    const count = Math.round(
      profile.tier === 'high' ? 15000 : profile.tier === 'medium' ? 8000 : 3200,
    );
    const r = rng(777);
    const verts = count * 2;
    const fpos = new Float32Array(verts * 3);
    const fmeta = new Float32Array(verts * 4);
    const fend = new Float32Array(verts);
    for (let i = 0; i < count; i++) {
      // a hollow-ish column: denser near the wall, so the shaft has sides
      const a = r() * Math.PI * 2;
      const rad = SHAFT_RADIUS * (0.25 + 0.75 * Math.sqrt(r()));
      const x = Math.cos(a) * rad;
      const y = BOTTOM + r() * span;
      const z = axisZ + Math.sin(a) * rad;
      const phase = r();
      const seed = r();
      const size = 0.45 + Math.abs(gauss(r)) * 0.5;
      const band = r() < 0.035 ? 1 : 0;
      for (let e = 0; e < 2; e++) {
        const v = i * 2 + e;
        fpos[v * 3] = x;
        fpos[v * 3 + 1] = y;
        fpos[v * 3 + 2] = z;
        fmeta[v * 4] = phase;
        fmeta[v * 4 + 1] = seed;
        fmeta[v * 4 + 2] = size;
        fmeta[v * 4 + 3] = band;
        fend[v] = e;
      }
    }
    const flowGeo = new BufferGeometry();
    flowGeo.setAttribute('position', new BufferAttribute(fpos, 3));
    flowGeo.setAttribute('aMeta', new BufferAttribute(fmeta, 4));
    flowGeo.setAttribute('aEnd', new BufferAttribute(fend, 1));
    const flowMat = new ShaderMaterial({
      vertexShader: FLOW_VERT,
      fragmentShader: FLOW_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uPresence: { value: 0 },
        uEnergy: { value: 0 },
        uStill: { value: 0 },
        uAttract: { value: new Vector3() },
        uAttractStrength: { value: 0 },
        uViewportH: { value: gl.getDrawingBufferSize(sizeScratch).y },
        uSize: { value: 1.9 },
        uSpan: { value: span },
        uBottom: { value: BOTTOM },
        uColor: { value: PAPER.clone() },
        uEmber: { value: EMBER.clone() },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    disposables.push(flowGeo, flowMat);
    const swarm = new LineSegments(flowGeo, flowMat);
    swarm.frustumCulled = false;
    swarm.name = 'deep-swarm';
    group.add(swarm);

    /* ---- the subject's own geometry, folded --------------------- */
    const src = world.design.position;
    const n = src.length / 3;
    const mpos = new Float32Array(n * 3);
    const mclosed = new Float32Array(n * 3);
    const mmeta = new Float32Array(n * 2);
    const rr = rng(313);
    const morphY = -26;
    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i < n; i++) {
      if (src[i * 3] < minX) minX = src[i * 3];
      if (src[i * 3] > maxX) maxX = src[i * 3];
    }
    for (let i = 0; i < n; i++) {
      const x = src[i * 3];
      const y = src[i * 3 + 1];
      const z = src[i * 3 + 2];
      // the word, carried down the shaft
      mpos[i * 3] = x * 0.85;
      mpos[i * 3 + 1] = morphY + y * 0.85;
      mpos[i * 3 + 2] = axisZ + (z + 10) * 0.85;
      // the closed form: the same points wrapped onto a sphere, so no
      // point ever has to travel through the middle of the figure
      const u = (x - minX) / Math.max(0.001, maxX - minX);
      const theta = u * Math.PI * 2;
      const phi = Math.acos(clamp(y / 1.6, -1, 1));
      const R = 3.1;
      mclosed[i * 3] = Math.sin(phi) * Math.cos(theta) * R;
      mclosed[i * 3 + 1] = morphY + Math.cos(phi) * R;
      mclosed[i * 3 + 2] = axisZ + Math.sin(phi) * Math.sin(theta) * R;
      mmeta[i * 2] = rr();
      mmeta[i * 2 + 1] = u;
    }
    const morphGeo = new BufferGeometry();
    morphGeo.setAttribute('position', new BufferAttribute(mpos, 3));
    morphGeo.setAttribute('aClosed', new BufferAttribute(mclosed, 3));
    morphGeo.setAttribute('aMeta', new BufferAttribute(mmeta, 2));
    const morphMat = new ShaderMaterial({
      vertexShader: MORPH_VERT,
      fragmentShader: MORPH_FRAG,
      uniforms: {
        uMorph: { value: 0 },
        uPresence: { value: 0 },
        uTime: { value: 0 },
        uStill: { value: 0 },
        uColor: { value: PAPER.clone() },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    disposables.push(morphGeo, morphMat);
    const morph = new LineSegments(morphGeo, morphMat);
    morph.frustumCulled = false;
    morph.name = 'deep-morph';
    group.add(morph);

    /* ---- the name, reassembling at the bottom ------------------- */
    const word = layout(['SIDDHARTHA']);
    const kpos: number[] = [];
    const kanchor: number[] = [];
    const kmeta: number[] = [];
    const letters = word.glyphs.length;
    const scale = 1.05;
    const baseY = BOTTOM + 9;
    word.glyphs.forEach((g) => {
      const anchor: [number, number, number] = [
        g.cx * scale,
        baseY + (g.cy - 0.5) * scale,
        axisZ + 1.5,
      ];
      const data = textSegments(g.ch, {
        x: anchor[0] - (g.w * scale) / 2,
        y: anchor[1] - 0.5 * scale,
        z: anchor[2],
        size: scale,
        ticks: false,
      });
      for (let i = 0; i < data.length; i += 3) {
        kpos.push(data[i], data[i + 1], data[i + 2]);
        kanchor.push(anchor[0], anchor[1], anchor[2]);
        kmeta.push(g.idx, letters);
      }
    });
    const kGeo = new BufferGeometry();
    kGeo.setAttribute('position', new BufferAttribute(new Float32Array(kpos), 3));
    kGeo.setAttribute('aAnchor', new BufferAttribute(new Float32Array(kanchor), 3));
    kGeo.setAttribute('aMeta', new BufferAttribute(new Float32Array(kmeta), 2));
    const kMat = new ShaderMaterial({
      vertexShader: KINETIC_VERT,
      fragmentShader: KINETIC_FRAG,
      uniforms: {
        uEye: { value: new Vector3() },
        uPresence: { value: 0 },
        uStill: { value: 0 },
        uAssemble: { value: 0 },
        uTime: { value: 0 },
        uColor: { value: PAPER.clone() },
        uEmber: { value: EMBER.clone() },
        uEmberMix: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    disposables.push(kGeo, kMat);
    const kinetic = new LineSegments(kGeo, kMat);
    kinetic.frustumCulled = false;
    kinetic.name = 'deep-name';
    group.add(kinetic);

    /* ---- the last line, at the very bottom ---------------------- */
    const lastGeo = segmentsGeometry(
      textSegments('YOU KNOW A LITTLE ABOUT ME  I KNOW NOTHING ABOUT YOU  GOOD', {
        x: -5.4,
        y: 0,
        z: 0,
        size: 0.2,
        track: 0.32,
      }),
    );
    const lastMat = new ShaderMaterial({
      vertexShader: KINETIC_VERT,
      fragmentShader: KINETIC_FRAG,
      uniforms: {
        uEye: { value: new Vector3() },
        uPresence: { value: 0 },
        uStill: { value: 0 },
        uAssemble: { value: 1 },
        uTime: { value: 0 },
        uColor: { value: PAPER.clone() },
        uEmber: { value: EMBER.clone() },
        uEmberMix: { value: 0.5 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    // the same shader wants these attributes, so give it flat ones
    const lastCount = (lastGeo.getAttribute('position') as BufferAttribute).count;
    const lastAnchor = new Float32Array(lastCount * 3);
    const lastMeta = new Float32Array(lastCount * 2);
    for (let i = 0; i < lastCount; i++) lastMeta[i * 2 + 1] = 1;
    lastGeo.setAttribute('aAnchor', new BufferAttribute(lastAnchor, 3));
    lastGeo.setAttribute('aMeta', new BufferAttribute(lastMeta, 2));
    disposables.push(lastGeo, lastMat);
    const last = new LineSegments(lastGeo, lastMat);
    last.position.set(0, BOTTOM + 2.5, axisZ + 2.5);
    last.frustumCulled = false;
    last.name = 'deep-last';
    group.add(last);

    return {
      group,
      disposables,
      gridMat,
      flowMat,
      morphMat,
      kMat,
      lastMat,
      axisZ,
      span,
    };
  }, [world, profile, gl]);

  useEffect(
    () => () => {
      for (const d of built.disposables) d.dispose();
    },
    [built],
  );

  const eye = useMemo(() => new Vector3(), []);
  const camera = useThree((s) => s.camera);

  useSystem(ORDER.layer, () => {
    const presence = sim.weights.deep;
    built.group.visible = presence > 0.012 && sim.reveal > 0.01;
    if (!built.group.visible) return;

    const show = presence * sim.reveal;
    const from = moduleDef('edge').travel;
    const descent = clamp((sim.travel - from) / (TRAVEL_MAX - from), 0, 1);
    eye.copy(camera.position);

    built.gridMat.uniforms.uPresence.value = show;
    (built.gridMat.uniforms.uEye.value as Vector3).copy(eye);

    const fu = built.flowMat.uniforms;
    fu.uTime.value = sim.t;
    fu.uPresence.value = show;
    fu.uEnergy.value = clamp(sim.E, 0, 1);
    fu.uStill.value = sim.still;
    fu.uViewportH.value = gl.getDrawingBufferSize(sizeScratch).y;
    fu.uAttractStrength.value = sim.attentionStrength * 0.6;
    (fu.uAttract.value as Vector3).set(
      sim.attentionPoint[0],
      sim.attentionPoint[1],
      sim.attentionPoint[2],
    );

    const mu = built.morphMat.uniforms;
    // the fold is driven by depth, so it is the visitor who performs it
    mu.uMorph.value = clamp((descent - 0.1) / 0.45, 0, 1);
    mu.uPresence.value = show;
    mu.uTime.value = sim.t;
    mu.uStill.value = sim.still;

    const ku = built.kMat.uniforms;
    ku.uPresence.value = show;
    ku.uStill.value = sim.still;
    ku.uTime.value = sim.t;
    ku.uAssemble.value = clamp((descent - 0.55) / 0.35, 0, 1);
    (ku.uEye.value as Vector3).copy(eye);

    const lu = built.lastMat.uniforms;
    lu.uPresence.value = show * clamp((descent - 0.88) / 0.1, 0, 1) * sim.still;
    lu.uStill.value = sim.still;
    lu.uTime.value = sim.t;
    (lu.uEye.value as Vector3).copy(eye);
  });

  return <primitive object={built.group} />;
}
