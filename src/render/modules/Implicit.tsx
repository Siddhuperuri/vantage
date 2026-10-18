/* ------------------------------------------------------------------
   Implicit.tsx - the two things in this world with no geometry at all.

      2 METABALLS            an implicit surface: six centres, a
                             smooth minimum, one surface. They merge
                             because the distance function says so,
                             not because spheres overlap.
     20 RAY-MARCHED FRACTAL  a distance-field Menger fold, bounded
                             iterations, bounded steps, drawn at a
                             quality the tier chooses.

   Both are marched inside a bounded box on a single billboarded quad.
   That bound is the whole cost control: the marcher only runs on the
   pixels the quad covers, it stops at a fixed step count, and it
   leaves the frame alone everywhere else. Nothing here runs at full
   resolution over the whole screen.
   ------------------------------------------------------------------ */

import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  Group,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from 'three';
import { sim } from '../../engine/sim';
import { ORDER, useSystem } from '../../engine/systems';
import { clamp } from '../../lib/mathx';
import { moduleDef, TRAVEL_MAX } from '../../world/journey';
import { EMBER, PAPER } from '../palette';
import { useWorld } from '../WorldContext';

const VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform vec3  uCentre;      // where the object lives, world space
  uniform float uRadius;      // the bound: nothing is marched outside it
  uniform float uTime;
  uniform float uMode;        // 0 metaballs, 1 fractal
  uniform float uPresence;
  uniform float uStill;
  uniform float uEnergy;
  uniform int   uSteps;       // the quality tier's whole contribution
  uniform int   uIters;
  uniform vec3  uColor;
  uniform vec3  uEmber;
  uniform vec3  uEye;

  varying vec3 vWorld;

  // the smooth minimum: this is what makes two surfaces one surface
  float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
  }

  float metaballs(vec3 p) {
    float d = 1e9;
    // six centres on slow, non-commensurate orbits, so the cluster
    // never repeats a pose and never flies apart
    for (int i = 0; i < 6; i++) {
      float f = float(i);
      vec3 c = vec3(
        sin(uTime * (0.17 + f * 0.031) + f * 2.1),
        cos(uTime * (0.13 + f * 0.027) + f * 1.3),
        sin(uTime * (0.11 + f * 0.023) + f * 3.7)
      ) * (0.95 + 0.35 * sin(f));
      float r = 0.46 + 0.1 * sin(f * 2.0);
      d = smin(d, length(p - c) - r, 0.55 + 0.25 * uStill);
    }
    return d;
  }

  // a Menger fold: four iterations is a fractal, forty is a hang
  float fractal(vec3 p) {
    float scale = 1.0;
    float d = max(abs(p.x), max(abs(p.y), abs(p.z))) - 1.25;
    for (int i = 0; i < 5; i++) {
      if (i >= uIters) break;
      p = abs(p);
      if (p.x < p.y) p.xy = p.yx;
      if (p.x < p.z) p.xz = p.zx;
      if (p.y < p.z) p.yz = p.zy;
      p = p * 3.0 - vec3(2.0, 2.0, 0.0);
      p.z -= 2.0 * step(1.0, p.z);
      scale *= 3.0;
      float box = (max(abs(p.x), max(abs(p.y), abs(p.z))) - 1.25) / scale;
      d = max(d, -box * 0.9);
    }
    return d;
  }

  float map(vec3 p) {
    vec3 q = p - uCentre;
    // energy swells the field: the laws reach here too
    q /= (1.0 + uEnergy * 0.12);
    return uMode < 0.5 ? metaballs(q) : fractal(q * 0.75) / 0.75;
  }

  void main() {
    vec3 ro = uEye;
    vec3 rd = normalize(vWorld - uEye);

    // enter the bounding sphere, march inside it, leave. The marcher
    // has no business outside the bound and never looks there.
    vec3 oc = ro - uCentre;
    float b = dot(oc, rd);
    float c = dot(oc, oc) - uRadius * uRadius;
    float h = b * b - c;
    if (h < 0.0) discard;
    h = sqrt(h);
    float tNear = max(-b - h, 0.0);
    float tFar = -b + h;
    if (tFar < 0.0) discard;

    float t = tNear;
    float hit = -1.0;
    for (int i = 0; i < 64; i++) {
      if (i >= uSteps) break;
      vec3 p = ro + rd * t;
      float d = map(p);
      if (d < 0.0025 * t + 0.002) { hit = t; break; }
      t += d;
      if (t > tFar) break;
    }
    if (hit < 0.0) discard;

    vec3 p = ro + rd * hit;
    // the normal, from the field itself
    vec2 e = vec2(0.0035, 0.0);
    vec3 n = normalize(vec3(
      map(p + e.xyy) - map(p - e.xyy),
      map(p + e.yxy) - map(p - e.yxy),
      map(p + e.yyx) - map(p - e.yyx)
    ));

    float fres = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 2.4);
    float key = clamp(dot(n, normalize(vec3(-0.5, 0.8, 0.3))), 0.0, 1.0);
    float depth = 1.0 - clamp((hit - tNear) / max(0.001, tFar - tNear), 0.0, 1.0);

    vec3 col = uColor * (0.06 + key * 0.3) + uEmber * fres * 0.22;
    float a = uPresence * (0.18 + fres * 0.5) * (0.35 + 0.65 * depth);

    if (a < 0.004) discard;
    gl_FragColor = vec4(col, a);
  }
`;

interface Props {
  /** 'metaballs' or 'fractal' */
  mode: 'metaballs' | 'fractal';
  /** where it sits in the shaft */
  position: [number, number, number];
  radius: number;
  /** the stretch of the descent over which it is present */
  from: number;
  to: number;
}

export function Implicit({ mode, position, radius, from, to }: Props) {
  const { profile } = useWorld();
  const camera = useThree((s) => s.camera);

  const built = useMemo(() => {
    const geometry = new PlaneGeometry(radius * 2.2, radius * 2.2);
    const steps = profile.tier === 'high' ? 56 : profile.tier === 'medium' ? 36 : 22;
    const iters = profile.tier === 'high' ? 4 : profile.tier === 'medium' ? 3 : 2;
    const material = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uCentre: { value: new Vector3(...position) },
        uRadius: { value: radius },
        uTime: { value: 0 },
        uMode: { value: mode === 'metaballs' ? 0 : 1 },
        uPresence: { value: 0 },
        uStill: { value: 0 },
        uEnergy: { value: 0 },
        uSteps: { value: steps },
        uIters: { value: iters },
        uColor: { value: PAPER.clone() },
        uEmber: { value: EMBER.clone() },
        uEye: { value: new Vector3() },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const mesh = new Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.frustumCulled = false;
    mesh.name = `implicit-${mode}`;
    const group = new Group();
    group.add(mesh);
    return { group, mesh, geometry, material };
  }, [mode, position, radius, profile]);

  useEffect(
    () => () => {
      built.geometry.dispose();
      built.material.dispose();
    },
    [built],
  );

  useSystem(ORDER.layer, () => {
    const edge = moduleDef('edge').travel;
    const descent = clamp((sim.travel - edge) / (TRAVEL_MAX - edge), 0, 1);
    // present only over its own stretch of the fall, and faded at both
    // ends so it is never switched on in front of the visitor
    const band =
      clamp((descent - from) / 0.12, 0, 1) * clamp((to - descent) / 0.12, 0, 1);
    const presence = band * sim.weights.deep * sim.reveal;
    built.group.visible = presence > 0.01;
    if (!built.group.visible) return;

    const u = built.material.uniforms;
    u.uTime.value = sim.t;
    u.uPresence.value = presence;
    u.uStill.value = sim.still;
    u.uEnergy.value = clamp(sim.E, 0, 1);
    (u.uEye.value as Vector3).copy(camera.position);
    // the quad always faces the visitor, so the bound is never seen
    built.mesh.quaternion.copy(camera.quaternion);
  });

  return <primitive object={built.group} />;
}
