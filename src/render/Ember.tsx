/* ------------------------------------------------------------------
   Ember.tsx - the only colour in the world, and the only guide.

   It is a point of ember with a real light attached, and it has three
   places to be:

     before you arrive  it waits AT the vantage - it is the place you
                        are being drawn toward, visible from the first
                        frame as a single warm point in a cold room
     at the vantage     it moves into the counter of the shared A, the
                        axis the whole composition is built on
     while focused      it goes to the layer you are inspecting, where
                        its light finds the posts and shards that are
                        otherwise almost invisible

   It leans a little toward where the visitor is pointing, slowly and
   never far, and only while they are still. It is not a cursor: it
   cannot be dragged around, it lags by design, and if the visitor
   thrashes the pointer it stops paying attention and holds its place.
   ------------------------------------------------------------------ */

import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import {
  AdditiveBlending,
  Mesh,
  PlaneGeometry,
  PointLight,
  ShaderMaterial,
  Vector3,
  type PerspectiveCamera,
} from 'three';
import { sim } from '../engine/sim';
import { ORDER, useSystem } from '../engine/systems';
import { clamp, damp } from '../lib/mathx';
import { D0 } from '../world/layers';
import { journeyPoint, moduleDef } from '../world/journey';
import { EMBER, EMBER_CORE } from './palette';
import { uiStore } from '../ui/store';
import { useWorld } from './WorldContext';

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv - 0.5;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform vec3  uEmber;
  uniform vec3  uCore;
  uniform float uAmount;
  uniform float uStreak;
  varying vec2 vUv;

  void main() {
    // the core: small, hot, almost white
    float r = length(vUv * vec2(1.0, 1.0));
    float core = exp(-r * r * 2600.0);
    // the halo: what the light does to the air around it
    float halo = exp(-r * r * 76.0) * 0.42 + exp(-r * r * 13.0) * 0.085;
    // the anamorphic streak: the lens of the piece, horizontal only
    float streak = exp(-abs(vUv.y) * 220.0) * exp(-abs(vUv.x) * 5.4) * uStreak;

    vec3 c = mix(uEmber, uCore, clamp(core * 1.4, 0.0, 1.0));
    float a = (core * 0.9 + halo + streak) * uAmount;
    if (a < 0.003) discard;
    gl_FragColor = vec4(c, a);
  }
`;

/** scratch, so the frame loop allocates nothing */
const scratch = new Vector3();
const ahead: [number, number, number] = [0, 0, 0];

export function Ember() {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const { world, profile } = useWorld();

  const { quad, geometry, material, light } = useMemo(() => {
    const g = new PlaneGeometry(1, 1);
    const m = new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uEmber: { value: EMBER.clone() },
        uCore: { value: EMBER_CORE.clone() },
        uAmount: { value: 0 },
        uStreak: { value: 0.5 },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: AdditiveBlending,
    });
    const mesh = new Mesh(g, m);
    mesh.frustumCulled = false;
    mesh.renderOrder = 20;
    mesh.name = 'ember';
    // a real light, with a short reach: it reveals the armature nearby
    // and leaves the rest of the room alone
    const l = new PointLight(EMBER.clone(), profile.matter ? 9 : 5, 8.5, 2.2);
    l.name = 'ember-light';
    return { quad: mesh, geometry: g, material: m, light: l };
  }, [profile]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const pos = useRef(new Vector3(0, 0, 0));
  const vel = useRef(new Vector3());
  const target = useRef(new Vector3());
  const lean = useRef(new Vector3());
  const flash = useRef(0);
  const found = useRef(0);
  const amount = useRef(0);

  useSystem(ORDER.follow, (dt, t) => {
    const ui = uiStore.get();
    const focused = ui.focus;

    // --- where it wants to be -------------------------------------
    if (focused) {
      const b = world.bounds.find((x) => x.id === focused);
      if (b) {
        target.current.set(
          b.center[0] + b.width * 0.34,
          b.center[1] + b.height * 0.14,
          b.center[2] + 0.5,
        );
      }
    } else if (ui.invitation && ui.phase === 'entered' && ui.mode !== 'guided') {
      // It has seen what this place is for, so it looks onward: nine
      // units ahead along the journey, never further than the place it
      // is pointing at. Following it is the way to the next module.
      const next = moduleDef(ui.invitation);
      journeyPoint(Math.min(sim.travel + 9, next.travel), ahead);
      target.current.set(ahead[0], ahead[1], ahead[2]);
    } else if (ui.phase === 'entered' && sim.reveal > 0.7 && ui.mode !== 'guided') {
      // the counter of the shared A: the axis of the composition
      target.current.set(0, 0, -D0);
    } else if (ui.phase === 'entered') {
      // during the guided approach it slides from the vantage to the axis
      const k = clamp((sim.reveal - 0.3) / 0.6, 0, 1);
      target.current.set(0, 0, -D0 * k);
    } else {
      // before the visitor begins, it waits exactly where they should stand
      target.current.set(0, 0, 0);
    }

    if (!sim.reducedMotion) {
      target.current.x += Math.sin(t * 0.9 + 1.7) * 0.05;
      target.current.y += Math.cos(t * 0.7 + 1.7) * 0.06;
    }

    // --- curiosity: a slow lean toward where the visitor points ----
    const want = scratch.set(0, 0, 0);
    if (sim.attentionStrength > 0.01 && ui.phase === 'entered') {
      const reach = (0.42 + 0.3 * sim.press) * sim.still;
      want
        .set(sim.attentionPoint[0], sim.attentionPoint[1], sim.attentionPoint[2])
        .sub(target.current)
        .clampLength(0, 2.2)
        .multiplyScalar(reach * 0.5);
    }
    lean.current.x = damp(lean.current.x, want.x, 1.6, dt);
    lean.current.y = damp(lean.current.y, want.y, 1.6, dt);
    lean.current.z = damp(lean.current.z, want.z, 1.6, dt);
    target.current.add(lean.current);

    // --- a spring with weight, not a cursor ------------------------
    const k = 9;
    const d = 4.6;
    const p = pos.current;
    const v = vel.current;
    v.x += ((target.current.x - p.x) * k - v.x * d) * dt;
    v.y += ((target.current.y - p.y) * k - v.y * d) * dt;
    v.z += ((target.current.z - p.z) * k - v.z * d) * dt;
    p.addScaledVector(v, dt);

    // --- a response to a discovery, and nothing else ---------------
    if (sim.discovered.size > found.current) {
      found.current = sim.discovered.size;
      flash.current = 1;
    }
    flash.current = damp(flash.current, 0, 2.2, dt);

    // --- what it looks like ----------------------------------------
    const pulse = sim.reducedMotion ? 1 : 0.88 + 0.12 * Math.sin(t * 1.6);
    const near = clamp(p.distanceTo(camera.position) / 1.6, 0, 1);
    const want2 = sim.reveal * near * pulse * (0.8 + 0.5 * flash.current);
    amount.current = damp(amount.current, want2, 4, dt);

    quad.position.copy(p);
    quad.quaternion.copy(camera.quaternion);
    // the quad is sized in world units so the ember keeps its real
    // place in depth instead of being a screen-space decal
    const scale = 1.5 + flash.current * 0.6;
    quad.scale.set(scale, scale, 1);
    material.uniforms.uAmount.value = amount.current;
    material.uniforms.uStreak.value =
      0.26 + 0.5 * (1 - sim.lock) + 0.5 * clamp(sim.E, 0, 1) + flash.current * 0.4;

    light.position.copy(p);
    light.intensity = (profile.matter ? 9 : 5) * amount.current * (0.7 + 0.6 * flash.current);
  });

  return (
    <>
      <primitive object={quad} />
      <primitive object={light} />
    </>
  );
}
