/* ------------------------------------------------------------------
   effects/lattice.ts - the subject as a machine holds it.

   One instanced quad per cell, so a few thousand cells cost one draw
   call and no per-frame allocation. The cell pitch is a uniform: when
   the visitor moves, the grid the subject is held on gets cruder and
   the letters survive as blocks before they survive as letters.
   ------------------------------------------------------------------ */

import {
  AdditiveBlending,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  PlaneGeometry,
  ShaderMaterial,
} from 'three';
import type { EffectDefinition, EffectEnv, EffectInstance } from '../../engine/effects/registry';
import { layerDef } from '../../world/layers';
import { LATTICE_FRAG, LATTICE_VERT } from '../shaders/layers';
import { makeLayerUniforms, syncLayerUniforms } from '../uniforms';

export interface LatticeCellsParams {
  /** multiplier on the resting cell pitch */
  pitchScale: number;
}

export const latticeCellsEffect: EffectDefinition<LatticeCellsParams> = {
  id: 'lattice.cells',
  label: 'Cells',
  category: 'representation',
  layer: 'lattice',
  defaults: { pitchScale: 1 },
  quality: { low: { pitchScale: 1.25 } },
  create(env: EffectEnv): EffectInstance<LatticeCellsParams> {
    const def = layerDef('lattice');
    const cells = env.world.lattice;

    const base = new PlaneGeometry(1, 1);
    const geometry = new InstancedBufferGeometry();
    geometry.index = base.index;
    geometry.attributes.position = base.attributes.position;
    geometry.setAttribute('aCenter', new InstancedBufferAttribute(cells.center, 3));
    geometry.setAttribute('aMeta', new InstancedBufferAttribute(cells.meta, 4));
    geometry.instanceCount = cells.count;

    const material = new ShaderMaterial({
      vertexShader: LATTICE_VERT,
      fragmentShader: LATTICE_FRAG,
      uniforms: {
        ...makeLayerUniforms(def),
        uPitch: { value: cells.pitch },
        uPitchScale: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    const mesh = new Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.name = 'lattice';
    const L = env.sim.layers.lattice;

    return {
      object: mesh,
      update(frame, params) {
        const u = material.uniforms;
        syncLayerUniforms(u, L, env.sim, frame.weight);
        u.uPitchScale.value = params.pitchScale;
      },
      dispose() {
        // the instanced geometry borrows the plane's position attribute and
        // index, so the plane is what actually owns them: dispose both.
        geometry.dispose();
        base.dispose();
        material.dispose();
      },
    };
  },
};
