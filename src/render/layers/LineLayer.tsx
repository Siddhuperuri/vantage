/* ------------------------------------------------------------------
   LineLayer.tsx - the three layers that are drawn with lines.

   INSTRUMENT, DESIGN and TRACE share one material and one draw call
   each. They differ by a mode uniform, because what they do under the
   laws is different in kind, not in degree:

     instrument  extends its guides to measure the disturbance
     design      comes apart into the strokes it was built from
     trace       lags behind the gesture, then converges when still

   A line in WebGL is one pixel wide whatever is asked of it, which
   suits a world made of survey drawings: weight comes from how much
   light a line carries, not from how fat it is.
   ------------------------------------------------------------------ */

import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  LineSegments,
  ShaderMaterial,
  Vector3,
} from 'three';
import { sim } from '../../engine/sim';
import { ORDER, useSystem } from '../../engine/systems';
import { damp } from '../../lib/mathx';
import { layerDef, type LayerId } from '../../world/layers';
import type { LineData } from '../../world/vantage';
import { LINE_FRAG, LINE_VERT } from '../shaders/layers';
import { makeLayerUniforms, syncLayerUniforms } from '../uniforms';

const MODE: Record<string, number> = { instrument: 0, design: 1, trace: 2 };

interface Props {
  id: Extract<LayerId, 'instrument' | 'design' | 'trace'>;
  data: LineData;
}

export function LineLayer({ id, data }: Props) {
  const def = layerDef(id);

  const geometry = useMemo(() => {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(data.position, 3));
    g.setAttribute('aDir', new BufferAttribute(data.dir, 3));
    g.setAttribute('aTangent', new BufferAttribute(data.tangent, 3));
    g.setAttribute('aMeta', new BufferAttribute(data.meta, 4));
    g.computeBoundingSphere();
    return g;
  }, [data]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: LINE_VERT,
        fragmentShader: LINE_FRAG,
        uniforms: {
          ...makeLayerUniforms(def),
          uMode: { value: MODE[id] ?? 0 },
          uMotionGain: { value: def.response.motionGain },
          uSmear: { value: new Vector3() },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [def, id],
  );

  // geometry and material are owned here, so they are released here
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  const object = useMemo(() => {
    const ls = new LineSegments(geometry, material);
    ls.frustumCulled = false;
    ls.name = id;
    return ls;
  }, [geometry, material, id]);

  const smear = useRef(new Vector3());

  useSystem(ORDER.layer, (dt) => {
    const L = sim.layers[id];
    syncLayerUniforms(material.uniforms, L, sim);

    if (id === 'trace') {
      // residual motion: where the gesture was a moment ago. It builds
      // quickly and leaves slowly, which is what makes it read as a
      // trace of a hand rather than a wobble.
      const s = smear.current;
      const k = sim.reducedMotion ? 0.12 : 0.34;
      const target = { x: -sim.layers.trace.motion * k, y: sim.layers.trace.motion * k * 0.6 };
      s.x = damp(s.x, target.x, 7, dt);
      s.y = damp(s.y, target.y, 7, dt);
      s.z = damp(s.z, 0, 2, dt);
      (material.uniforms.uSmear.value as Vector3).copy(s).multiplyScalar(1 - sim.still * 0.8);
    }
  });

  return <primitive object={object} />;
}
