/* ------------------------------------------------------------------
   effects/atmosphere.ts - the air in the room.

   Two full-screen draws and no render targets: a vignette that
   multiplies the corners down, and a grain that adds a stepped film
   speckle. Both are drawn from a clip-space triangle, so the camera
   cannot knock them out of alignment and resizing is one uniform.

   Bounded on purpose. There is no bloom pass: the layers are additive
   light already, and a blur would turn a measured drawing into a glow,
   which is the opposite of what this world is about.
   ------------------------------------------------------------------ */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Group,
  Mesh,
  MultiplyBlending,
  ShaderMaterial,
  Vector2,
} from 'three';
import type { EffectDefinition, EffectEnv, EffectInstance } from '../../engine/effects/registry';
import { FULLSCREEN_VERT, GRAIN_FRAG, VIGNETTE_FRAG } from '../shaders/layers';
import { postChain } from '../post/chain';

export interface AtmosphereParams {
  /** grain strength, 0..0.3 */
  grain: number;
  /** how far the corners fall away, 0..1 */
  vignette: number;
}

/** a clip-space triangle that covers the viewport with three vertices */
function fullscreenTriangle(): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
  );
  return g;
}

export const atmosphereEffect: EffectDefinition<AtmosphereParams> = {
  id: 'atmos.film',
  label: 'Film',
  category: 'atmosphere',
  defaults: { grain: 0.1, vignette: 0.62 },
  quality: { low: { grain: 0 }, medium: { grain: 0.085 } },
  create(env: EffectEnv): EffectInstance<AtmosphereParams> {
    const size = new Vector2();
    env.gl.getDrawingBufferSize(size);

    const geometry = fullscreenTriangle();

    const vignetteMat = new ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: VIGNETTE_FRAG,
      uniforms: {
        uResolution: { value: new Vector2(size.x, size.y) },
        uAmount: { value: 0.62 },
      },
      depthTest: false,
      depthWrite: false,
      blending: MultiplyBlending,
      // three refuses to multiply without this, and silently draws the
      // quad unblended - which paints the whole frame white
      premultipliedAlpha: true,
      transparent: true,
    });

    const grainMat = new ShaderMaterial({
      vertexShader: FULLSCREEN_VERT,
      fragmentShader: GRAIN_FRAG,
      uniforms: {
        uResolution: { value: new Vector2(size.x, size.y) },
        uTime: { value: 0 },
        uAmount: { value: 0.1 },
      },
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
      transparent: true,
    });

    const group = new Group();
    group.name = 'atmosphere';
    const vignette = new Mesh(geometry, vignetteMat);
    const grain = new Mesh(geometry, grainMat);
    for (const m of [vignette, grain]) {
      m.frustumCulled = false;
      m.matrixAutoUpdate = false;
    }
    vignette.renderOrder = 900;
    grain.renderOrder = 901;
    group.add(vignette, grain);

    return {
      object: group,
      update(frame, params) {
        env.gl.getDrawingBufferSize(size);
        (vignetteMat.uniforms.uResolution.value as Vector2).set(size.x, size.y);
        (grainMat.uniforms.uResolution.value as Vector2).set(size.x, size.y);
        vignetteMat.uniforms.uAmount.value = params.vignette * frame.weight;
        grainMat.uniforms.uTime.value = env.sim.reducedMotion ? 0 : frame.t;
        // a print treatment has a texture of its own; the film grain
        // stands down rather than being screened along with the image
        const printing = postChain.treatment !== 'none';
        const amount = params.grain * frame.weight * (printing ? 0.12 : 1);
        grainMat.uniforms.uAmount.value = amount;
        grain.visible = amount > 0.001;
      },
      dispose() {
        geometry.dispose();
        vignetteMat.dispose();
        grainMat.dispose();
      },
    };
  },
};
