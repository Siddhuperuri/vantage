/* ------------------------------------------------------------------
   Armature.tsx - the matter the light is mounted in.

   Five sheets of light alone would float in nothing. The armature is
   what makes the void a room: a datum plate engraved on the floor, four
   posts and two rails standing around the word volume like a specimen
   holder, and a scatter of shards between the layers.

   None of it is emissive. It is lit only by a dim fill and by the
   ember, so most of the time it is barely there - and when the ember
   passes, a post or a shard is suddenly a real object with a lit side
   and a dark one. That is the whole reason it exists.
   ------------------------------------------------------------------ */

import { useEffect, useMemo } from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  Euler,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  Vector3,
} from 'three';
import { rng } from '../lib/mathx';
import { LAYER_DEFS } from '../world/layers';
import { PAPER } from './palette';
import { useWorld } from './WorldContext';

const FLOOR = -2.95;

export function Armature() {
  const { world, profile } = useWorld();

  const { mesh, geometry, material } = useMemo(() => {
    const halfW = ((world.word.bbox.x1 - world.word.bbox.x0) / 2) * world.scale;
    const r = rng(4201);
    const g = new BoxGeometry(1, 1, 1);
    const m = new MeshStandardMaterial({
      color: new Color('#39332c'),
      roughness: 0.82,
      metalness: 0.12,
    });

    const items: { p: Vector3; s: Vector3; q: Quaternion }[] = [];
    const q0 = new Quaternion();

    // four posts standing at the corners of the word volume, and two rails
    const postX = halfW * 1.1;
    const postZ = [-LAYER_DEFS[0].depth * 1.04, -LAYER_DEFS[4].depth * 0.86];
    for (const sx of [-1, 1]) {
      for (const z of postZ) {
        items.push({
          p: new Vector3(sx * postX * (Math.abs(z) / 10), FLOOR + 2.6, z),
          s: new Vector3(0.055, 5.5, 0.055),
          q: q0,
        });
      }
      items.push({
        p: new Vector3(sx * postX * 1.0, FLOOR + 0.02, (postZ[0] + postZ[1]) / 2),
        s: new Vector3(0.05, 0.05, Math.abs(postZ[0] - postZ[1])),
        q: q0,
      });
    }
    // two rails across the top, at the far and near edges of the volume
    for (const z of postZ) {
      items.push({
        p: new Vector3(0, FLOOR + 5.3, z),
        s: new Vector3(postX * 2 * (Math.abs(z) / 10), 0.045, 0.045),
        q: q0,
      });
    }

    // Shards between the layers: thin plates, each facing a little
    // differently. They are opaque matter, so anywhere they overlap the
    // word they punch a black hole through additive light - which is
    // why they are kept strictly out of the subject's silhouette, in
    // the void below it and off to the sides.
    if (profile.matter) {
      const shards = profile.tier === 'high' ? 34 : 20;
      for (let i = 0; i < shards; i++) {
        const depth = 5.2 + r() * 11.6;
        const k = depth / 10;
        // either below the baseline, or beyond the ends of the word
        const low = r() < 0.62;
        const y = low
          ? FLOOR + 0.12 + r() * r() * 1.45
          : FLOOR + 1.9 + r() * 3.2;
        const side = r() < 0.5 ? -1 : 1;
        const x = low
          ? (r() * 2 - 1) * halfW * 1.1 * k
          : side * halfW * k * (1.08 + r() * 0.5);
        const q = new Quaternion().setFromEuler(
          new Euler((r() - 0.5) * 1.2, (r() - 0.5) * 2.4, (r() - 0.5) * 0.9),
        );
        const w = 0.06 + r() * 0.2;
        items.push({
          p: new Vector3(x, y, -depth),
          s: new Vector3(w, w * (0.3 + r()), 0.01),
          q,
        });
      }
    }

    const inst = new InstancedMesh(g, m, items.length);
    const mat = new Matrix4();
    items.forEach((it, i) => {
      mat.compose(it.p, it.q, it.s);
      inst.setMatrixAt(i, mat);
    });
    inst.instanceMatrix.needsUpdate = true;
    // nothing here moves after this point: there is no per-frame work at all
    inst.frustumCulled = false;
    inst.name = 'armature';
    return { mesh: inst, geometry: g, material: m };
  }, [world, profile]);

  const datum = useMemo(() => {
    const halfW = ((world.word.bbox.x1 - world.word.bbox.x0) / 2) * world.scale;
    const pts: number[] = [];
    const push = (
      ax: number,
      ay: number,
      az: number,
      bx: number,
      by: number,
      bz: number,
    ): void => {
      pts.push(ax, ay, az, bx, by, bz);
    };

    // the engraved circle on the floor, centred under the axis of the word
    const R = halfW * 1.02;
    const cz = -10;
    const N = 180;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2;
      const a1 = ((i + 1) / N) * Math.PI * 2;
      push(
        Math.cos(a0) * R,
        FLOOR,
        cz + Math.sin(a0) * R,
        Math.cos(a1) * R,
        FLOOR,
        cz + Math.sin(a1) * R,
      );
    }
    // graduations every ten degrees, longer every ninety
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const len = i % 9 === 0 ? 0.42 : 0.17;
      push(
        Math.cos(a) * R,
        FLOOR,
        cz + Math.sin(a) * R,
        Math.cos(a) * (R + len),
        FLOOR,
        cz + Math.sin(a) * (R + len),
      );
    }
    // the horizon: one datum line that leaves the frame on both sides
    push(-R * 4, FLOOR, cz, R * 4, FLOOR, cz);
    // and the axis of the piece, dropped to the floor
    push(0, FLOOR, cz - R * 1.4, 0, FLOOR, cz + R * 1.4);

    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(pts), 3));
    const mat = new LineBasicMaterial({
      color: PAPER.clone(),
      transparent: true,
      opacity: 0.085,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const ls = new LineSegments(geo, mat);
    ls.frustumCulled = false;
    ls.name = 'datum';
    return { ls, geo, mat };
  }, [world]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
      mesh.dispose();
      datum.geo.dispose();
      datum.mat.dispose();
    },
    [geometry, material, mesh, datum],
  );

  return (
    <>
      <primitive object={mesh} />
      <primitive object={datum.ls} />
    </>
  );
}
