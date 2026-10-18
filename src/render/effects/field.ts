/* ------------------------------------------------------------------
   effects/field.ts - two treatments of one cloud.

   The FIELD layer's world data is a PointCloud: homes, a direction of
   uncertainty, and four numbers per sample. Nothing in it knows how it
   will be drawn. These two definitions prove that: `field.points`
   draws soft additive samples, `field.halftone` draws hard screen dots
   sized by the light each sample stands for. Swapping them rebuilds
   nothing but a material and a geometry of the same arrays.

   Phase 2's dither, ASCII and pixel treatments are more definitions
   here, not more branches inside a component.
   ------------------------------------------------------------------ */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Points,
  ShaderMaterial,
  Vector2,
} from 'three';
import type { EffectDefinition, EffectEnv, EffectInstance } from '../../engine/effects/registry';
import { layerDef } from '../../world/layers';
import type { PointCloud } from '../../world/vantage';
import {
  FIELD_HALFTONE_FRAG,
  FIELD_HALFTONE_VERT,
  FIELD_POINTS_FRAG,
  FIELD_POINTS_VERT,
} from '../shaders/layers';
import { makeLayerUniforms, syncLayerUniforms } from '../uniforms';

export interface FieldPointsParams {
  /** base point size in px at the word plane */
  size: number;
  /** how far the cloud spreads when fully dispersed, world units */
  dispersion: number;
  /** radius of the attention collapse, world units */
  attnRadius: number;
  /** the private shimmer that never stops */
  idle: number;
}

export interface FieldHalftoneParams extends FieldPointsParams {
  /** dot grid size in px */
  cell: number;
  /** contrast of the screen */
  gamma: number;
}

/** scratch for reading the drawing buffer size without allocating */
const sizeScratch = new Vector2();

/** one geometry per instance: ownership is unambiguous, so dispose is too */
function buildGeometry(cloud: PointCloud): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(cloud.home, 3));
  g.setAttribute('aJitter', new BufferAttribute(cloud.jitter, 3));
  g.setAttribute('aMeta', new BufferAttribute(cloud.meta, 4));
  g.computeBoundingSphere();
  return g;
}

function createField(
  env: EffectEnv,
  vert: string,
  frag: string,
  extraUniforms: Record<string, { value: number }>,
): { points: Points; material: ShaderMaterial; geometry: BufferGeometry } {
  const def = layerDef('field');
  const geometry = buildGeometry(env.world.field);
  const material = new ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: {
      ...makeLayerUniforms(def),
      uDispersion: { value: 1 },
      uSize: { value: 2 },
      uViewportH: { value: env.gl.getDrawingBufferSize(new Vector2()).y },
      uIdle: { value: def.response.idle },
      ...extraUniforms,
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.name = 'field';
  return { points, material, geometry };
}

export const fieldPointsEffect: EffectDefinition<FieldPointsParams> = {
  id: 'field.points',
  label: 'Points',
  category: 'representation',
  layer: 'field',
  defaults: { size: 2.1, dispersion: 1, attnRadius: 1.7, idle: 0.55 },
  quality: {
    low: { size: 2.6, dispersion: 0.8 },
    high: { size: 1.9 },
  },
  create(env: EffectEnv): EffectInstance<FieldPointsParams> {
    const { points, material, geometry } = createField(env, FIELD_POINTS_VERT, FIELD_POINTS_FRAG, {});
    const L = env.sim.layers.field;
    return {
      object: points,
      update(frame, params) {
        const u = material.uniforms;
        syncLayerUniforms(u, L, env.sim, frame.weight);
        u.uDispersion.value = params.dispersion;
        u.uSize.value = params.size;
        u.uAttnRadius.value = params.attnRadius;
        u.uIdle.value = env.sim.reducedMotion ? params.idle * 0.25 : params.idle;
        u.uViewportH.value = env.gl.getDrawingBufferSize(sizeScratch).y;
      },
      dispose() {
        geometry.dispose();
        material.dispose();
      },
    };
  },
};

export const fieldHalftoneEffect: EffectDefinition<FieldHalftoneParams> = {
  id: 'field.halftone',
  label: 'Halftone',
  category: 'representation',
  layer: 'field',
  defaults: { size: 2.1, dispersion: 1, attnRadius: 1.7, idle: 0.55, cell: 3.6, gamma: 0.72 },
  quality: {
    low: { cell: 4.4 },
    high: { cell: 3.2 },
  },
  create(env: EffectEnv): EffectInstance<FieldHalftoneParams> {
    const { points, material, geometry } = createField(
      env,
      FIELD_HALFTONE_VERT,
      FIELD_HALFTONE_FRAG,
      { uCell: { value: 3.6 }, uGamma: { value: 0.72 } },
    );
    // a screen is not light: normal blending, so dots occlude rather than sum
    material.blending = AdditiveBlending;
    const L = env.sim.layers.field;
    return {
      object: points,
      update(frame, params) {
        const u = material.uniforms;
        syncLayerUniforms(u, L, env.sim, frame.weight);
        u.uDispersion.value = params.dispersion;
        u.uAttnRadius.value = params.attnRadius;
        u.uIdle.value = env.sim.reducedMotion ? params.idle * 0.25 : params.idle;
        u.uCell.value = params.cell;
        u.uGamma.value = params.gamma;
        u.uViewportH.value = env.gl.getDrawingBufferSize(sizeScratch).y;
      },
      dispose() {
        geometry.dispose();
        material.dispose();
      },
    };
  },
};
