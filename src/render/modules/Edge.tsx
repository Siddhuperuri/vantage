/* ------------------------------------------------------------------
   Edge.tsx - MODULE III, the edge of the piece.

   Everything is put down. The density drops, the camera slows, and
   what is left is residue: three drafts of the subject lying in
   layers, a survey of the ground they are lying on, a composed
   arrangement of the plainest shapes there are, and three small
   solids that exist only to show what light does to matter.

   This is where four of the twenty treatments live, because this is
   the only place in the journey quiet enough for them to be read:

     17 PAPER CUTOUT   the drafts: real separation, real shadows,
                       real parallax as the camera moves
      9 TOPOGRAPHIC    contours of an actual scalar field - the
                       ground the five layers stood on
     16 BAUHAUS        circle, square, triangle, arc, composed
      3 CLAY   4 GLASS   5 FOIL   three solids, in contact, lit
   ------------------------------------------------------------------ */

import { useEffect, useMemo } from 'react';
import {
  AdditiveBlending,
  BackSide,
  DirectionalLight,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  HemisphereLight,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  ShaderMaterial,
  SphereGeometry,
} from 'three';
import { sim } from '../../engine/sim';
import { ORDER, useSystem } from '../../engine/systems';
import { clamp, damp, noise } from '../../lib/mathx';
import { moduleDef, journeyPoint } from '../../world/journey';
import { EMBER, PAPER } from '../palette';
import { segmentsGeometry, textSegments } from '../text3d';
import { useWorld } from '../WorldContext';

/** a sentence the original piece ends on; not invented here */
const SENTENCE = 'JACK OF ALL  MASTER OF NONE';
const WISH = 'BUT OFTEN TIMES BETTER THAN MASTER OF ONE';

/* ---- 5. HOLOGRAPHIC FOIL: thin-film interference, not a rainbow ---- */
const FOIL_VERT = /* glsl */ `
  varying vec3 vNormalW;
  varying vec3 vViewW;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vViewW = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FOIL_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3 uPaper;
  uniform vec3 uEmber;
  uniform float uOpacity;
  varying vec3 vNormalW;
  varying vec3 vViewW;

  // a thin film shifts which wavelengths survive with the angle you
  // look at it, so the colour is a function of view, not of position
  vec3 film(float thickness, float cosTheta) {
    float d = thickness / max(0.12, cosTheta);
    return vec3(
      0.5 + 0.5 * cos(d * 10.9 + 0.0),
      0.5 + 0.5 * cos(d * 12.7 + 2.1),
      0.5 + 0.5 * cos(d * 15.1 + 4.2)
    );
  }

  void main() {
    vec3 n = normalize(vNormalW);
    float ndv = clamp(dot(n, normalize(vViewW)), 0.0, 1.0);
    float fres = pow(1.0 - ndv, 3.0);

    vec3 c = film(1.35, ndv);
    // held inside this world's palette: a warm sheet, not a rainbow
    c = mix(uPaper * 0.5, c, 0.42);
    c = mix(c, uEmber, fres * 0.33);

    float a = (0.3 + fres * 0.65) * uOpacity;
    gl_FragColor = vec4(c * (0.3 + fres), a);
  }
`;

/* ---- 4. GLASSMORPHISM: a pane that is read by its edges ---------- */
const GLASS_FRAG = /* glsl */ `
  precision highp float;
  uniform vec3  uTint;
  uniform float uOpacity;
  varying vec3 vNormalW;
  varying vec3 vViewW;

  void main() {
    vec3 n = normalize(vNormalW);
    float ndv = clamp(dot(n, normalize(vViewW)), 0.0, 1.0);
    // a pane in a dark room is read by its edges, not by its face
    float fres = pow(1.0 - ndv, 2.3);
    float edge = smoothstep(0.55, 1.0, fres);

    vec3 c = mix(uTint * 0.4, uTint, fres);
    // selective: the face stays translucent so what is behind it keeps
    // its contrast, and only the edge carries weight
    float a = (0.085 + fres * 0.55 + edge * 0.3) * uOpacity;
    gl_FragColor = vec4(c, a);
  }
`;

/** the scalar field the contours are contours OF: this is the ground */
function groundHeight(x: number, z: number): number {
  return (
    noise(x * 0.11, 0, z * 0.11, 17) * 1.0 +
    noise(x * 0.27, 0, z * 0.27, 23) * 0.42 +
    // a dip where the subject stood
    -1.25 * Math.exp(-(x * x + z * z) / 70)
  );
}

export function Edge() {
  const { world, profile } = useWorld();

  const built = useMemo(() => {
    const at: [number, number, number] = [0, 0, 0];
    journeyPoint(moduleDef('edge').travel, at);
    const group = new Group();
    group.name = 'edge';
    const disposables: { dispose(): void }[] = [];
    // arriving here by travelling keeps a level camera, so the whole
    // composition is built around eye level rather than on a far floor
    const floorY = -1.95;

    /* ---- 17. PAPER CUTOUT: three drafts, separated in depth ------ */
    const drafts = new Group();
    const design = world.design;
    // one in three strokes, so a draft reads as a draft
    const stride = 3;
    const kept: number[] = [];
    for (let i = 0; i < design.position.length; i += 6 * stride) {
      for (let k = 0; k < 6; k++) kept.push(design.position[i + k] ?? 0);
    }
    const draftGeo = new BufferGeometry();
    draftGeo.setAttribute('position', new BufferAttribute(new Float32Array(kept), 3));
    disposables.push(draftGeo);

    const sheetGeo = new PlaneGeometry(5.6, 1.95);
    const sheetMat = new MeshStandardMaterial({
      // light enough to read as paper against the ground, dark enough
      // to still be this world
      color: new Color('#262019'),
      roughness: 0.94,
      metalness: 0,
      side: DoubleSide,
    });
    disposables.push(sheetGeo, sheetMat);

    // The print is module I's design layer, which carries ABSOLUTE world
    // coordinates from the vantage: the word sits at z = -12.6 there.
    // Dropped into a group it would be drawn twelve units behind its own
    // sheet, so it is scaled to the sheet and brought back onto it.
    const PRINT_SCALE = 0.38;
    const PRINT_Z = 12.6 * PRINT_SCALE;

    for (let i = 0; i < 3; i++) {
      const layer = new Group();
      // real separation, so the parallax between them is real too
      layer.position.set(at[0] - 5.4 + i * 5.3, at[1] + 0.35 - i * 0.3, at[2] - 4.6 - i * 1.6);
      layer.rotation.set(-0.38 + i * 0.06, 0.5 - i * 0.5, -0.05 + i * 0.05);

      const sheet = new Mesh(sheetGeo, sheetMat);
      sheet.receiveShadow = true;
      sheet.castShadow = true;
      layer.add(sheet);

      const printMat = new LineBasicMaterial({
        color: PAPER.clone(),
        transparent: true,
        opacity: 0.2 + i * 0.08,
        depthWrite: false,
        blending: AdditiveBlending,
      });
      disposables.push(printMat);
      const print = new LineSegments(draftGeo, printMat);
      print.scale.setScalar(PRINT_SCALE);
      print.position.z = PRINT_Z + 0.03;
      layer.add(print);
      drafts.add(layer);
    }
    group.add(drafts);

    // One light for this module, with a bounded shadow camera around
    // the drafts and the still life. Without it the sheets are unlit
    // and the separation between them cannot be seen at all.
    if (profile.tier !== 'low') {
      const key = new DirectionalLight(new Color('#ffe8d2'), 0.85);
      key.position.set(at[0] - 6, at[1] + 8, at[2] + 9);
      key.target.position.set(at[0], floorY + 0.4, at[2] - 3);
      key.castShadow = true;
      key.shadow.mapSize.set(profile.tier === 'high' ? 1024 : 512, profile.tier === 'high' ? 1024 : 512);
      const cam = key.shadow.camera;
      cam.left = -11;
      cam.right = 11;
      cam.top = 11;
      cam.bottom = -11;
      cam.near = 1;
      cam.far = 30;
      cam.updateProjectionMatrix();
      key.shadow.bias = -0.0014;
      group.add(key, key.target);

      // a low fill from above: without it an unlit sheet is a hole in
      // the frame rather than a piece of paper in a dark room
      const fill = new HemisphereLight(new Color('#5a4e42'), new Color('#0a0908'), 0.5);
      fill.position.set(at[0], at[1] + 6, at[2]);
      group.add(fill);
    }

    /* ---- 9. TOPOGRAPHIC LINES: contours of a real field ---------- */
    const contourPts: number[] = [];
    const levels = profile.tier === 'low' ? 7 : 13;
    const extent = 26;
    const step = 0.55;
    // marching squares on the scalar field, one pass per level
    for (let li = 0; li < levels; li++) {
      const level = -1.3 + (li / (levels - 1)) * 2.3;
      for (let x = -extent; x < extent; x += step) {
        for (let z = -extent; z < extent; z += step) {
          const a = groundHeight(x, z) - level;
          const b = groundHeight(x + step, z) - level;
          const c = groundHeight(x + step, z + step) - level;
          const d = groundHeight(x, z + step) - level;
          const seg: number[][] = [];
          const lerpEdge = (
            x1: number,
            z1: number,
            v1: number,
            x2: number,
            z2: number,
            v2: number,
          ) => {
            const t = v1 / (v1 - v2);
            return [x1 + (x2 - x1) * t, z1 + (z2 - z1) * t];
          };
          if (a * b < 0) seg.push(lerpEdge(x, z, a, x + step, z, b));
          if (b * c < 0) seg.push(lerpEdge(x + step, z, b, x + step, z + step, c));
          if (c * d < 0) seg.push(lerpEdge(x + step, z + step, c, x, z + step, d));
          if (d * a < 0) seg.push(lerpEdge(x, z + step, d, x, z, a));
          if (seg.length >= 2) {
            contourPts.push(
              at[0] + seg[0][0],
              floorY + level * 0.16,
              at[2] + seg[0][1],
              at[0] + seg[1][0],
              floorY + level * 0.16,
              at[2] + seg[1][1],
            );
          }
        }
      }
    }
    const contourGeo = new BufferGeometry();
    contourGeo.setAttribute('position', new BufferAttribute(new Float32Array(contourPts), 3));
    const contourMat = new LineBasicMaterial({
      color: PAPER.clone(),
      transparent: true,
      opacity: 0.085,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    disposables.push(contourGeo, contourMat);
    const contours = new LineSegments(contourGeo, contourMat);
    contours.frustumCulled = false;
    group.add(contours);

    /* ---- 16. BAUHAUS: four shapes, composed, not scattered ------- */
    const bauhaus = new Group();
    bauhaus.position.set(at[0] + 4.9, at[1] + 0.5, at[2] - 5.2);
    const circleGeo = new CircleGeometry(1.25, 64);
    const squareGeo = new PlaneGeometry(1.9, 1.9);
    const triGeo = new BufferGeometry();
    triGeo.setAttribute(
      'position',
      new BufferAttribute(new Float32Array([-1.1, -0.95, 0, 1.1, -0.95, 0, 0, 1.05, 0]), 3),
    );
    const arcPts: number[] = [];
    for (let i = 0; i <= 48; i++) {
      const a0 = Math.PI * (i / 48);
      const a1 = Math.PI * ((i + 1) / 48);
      arcPts.push(Math.cos(a0) * 2.3, Math.sin(a0) * 2.3, 0, Math.cos(a1) * 2.3, Math.sin(a1) * 2.3, 0);
    }
    const arcGeo = new BufferGeometry();
    arcGeo.setAttribute('position', new BufferAttribute(new Float32Array(arcPts), 3));
    const flat = (hex: string, opacity: number) =>
      new MeshStandardMaterial({
        color: new Color(hex),
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity,
        side: DoubleSide,
      });
    const mCircle = flat('#ff5c24', 0.32);
    const mSquare = flat('#e9e2d3', 0.12);
    const mTri = flat('#e9e2d3', 0.2);
    const mArc = new LineBasicMaterial({ color: PAPER.clone(), transparent: true, opacity: 0.3 });
    disposables.push(circleGeo, squareGeo, triGeo, arcGeo, mCircle, mSquare, mTri, mArc);

    const circle = new Mesh(circleGeo, mCircle);
    circle.position.set(-0.9, 0.4, -0.3);
    const square = new Mesh(squareGeo, mSquare);
    square.position.set(0.55, -0.35, -0.6);
    square.rotation.z = 0.0;
    const tri = new Mesh(triGeo, mTri);
    tri.position.set(1.1, 1.05, -0.15);
    tri.rotation.z = Math.PI;
    const arc = new LineSegments(arcGeo, mArc);
    arc.position.set(0.1, -1.1, -0.9);
    bauhaus.add(circle, square, tri, arc);
    group.add(bauhaus);

    /* ---- 3 / 4 / 5: three solids, in contact ---------------------- */
    const still = new Group();
    still.position.set(at[0] - 0.4, floorY, at[2] + 0.9);

    // CLAY: rounded, soft, unglazed, sitting ON the plinth, not in it
    const plinthGeo = new BoxGeometry(4.0, 0.26, 2.1);
    const plinthMat = new MeshStandardMaterial({
      color: new Color('#1b1713'),
      roughness: 0.96,
      metalness: 0,
    });
    const plinth = new Mesh(plinthGeo, plinthMat);
    plinth.position.y = 0.13;
    plinth.receiveShadow = true;
    const clayGeo = new SphereGeometry(0.62, 48, 32);
    const clayMat = new MeshStandardMaterial({
      color: new Color('#7a6c5a'),
      roughness: 0.92,
      metalness: 0,
      flatShading: false,
    });
    const clay = new Mesh(clayGeo, clayMat);
    // squashed where it meets the plinth: a contact, not a float
    clay.scale.set(1, 0.86, 1);
    clay.position.set(-1.05, 0.26 + 0.62 * 0.86, 0.1);
    clay.castShadow = true;
    disposables.push(plinthGeo, plinthMat, clayGeo, clayMat);

    // GLASS: selective translucency. MeshPhysicalMaterial's transmission
    // does not resolve in this renderer setup, and a transmissive slab
    // in a dark room transmits darkness anyway, so the pane is written
    // out: a translucent face that keeps the contrast of what is behind
    // it, and an edge that carries the light.
    const glassGeo = new BoxGeometry(0.95, 1.35, 0.12);
    const glassMat = new ShaderMaterial({
      vertexShader: FOIL_VERT,
      fragmentShader: GLASS_FRAG,
      uniforms: {
        uTint: { value: new Color('#cfdbd6') },
        uOpacity: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
    });
    const glass = new Mesh(glassGeo, glassMat);
    glass.position.set(0.15, 0.26 + 0.68, -0.15);
    glass.rotation.y = -0.34;
    disposables.push(glassGeo, glassMat);

    // FOIL: a disc that changes colour with where you stand
    const foilGeo = new CylinderGeometry(0.62, 0.62, 0.04, 64);
    const foilMat = new ShaderMaterial({
      vertexShader: FOIL_VERT,
      fragmentShader: FOIL_FRAG,
      uniforms: {
        uPaper: { value: PAPER.clone() },
        uEmber: { value: EMBER.clone() },
        uOpacity: { value: 1 },
      },
      transparent: true,
      side: DoubleSide,
    });
    const foil = new Mesh(foilGeo, foilMat);
    foil.castShadow = true;
    foil.position.set(1.22, 0.26 + 0.1, 0.3);
    foil.rotation.set(-0.72, 0.35, 0.22);
    disposables.push(foilGeo, foilMat);

    const displayLight = new PointLight(new Color('#ffd9b4'), 2.6, 5.2, 2);
    displayLight.position.set(0.1, 1.7, 1.8);

    // Transmission samples the scene behind the slab, and a light is
    // not geometry: behind the glass there was nothing to see, so it
    // rendered as a correct black rectangle. This is the thing it
    // refracts - a pale card standing just behind it, lit by the same
    // display light, which is also what a still life would do.
    const cardGeo = new PlaneGeometry(1.35, 1.5);
    const cardMat = new MeshStandardMaterial({
      color: new Color('#cdbfa6'),
      roughness: 1,
      metalness: 0,
      side: DoubleSide,
    });
    disposables.push(cardGeo, cardMat);
    const card = new Mesh(cardGeo, cardMat);
    card.position.set(0.17, 0.26 + 0.76, -0.82);
    card.rotation.y = 0.12;
    card.receiveShadow = true;

    still.add(plinth, clay, card, glass, foil, displayLight);
    group.add(still);

    /* ---- restrained typography: one sentence, lying flat --------- */
    const typo = new Group();
    const line1 = segmentsGeometry(
      textSegments(SENTENCE, { x: -2.5, y: 0, z: 0, size: 0.19, track: 0.34 }),
    );
    const line2 = segmentsGeometry(
      textSegments(WISH, { x: -2.5, y: -0.38, z: 0, size: 0.11, track: 0.3 }),
    );
    const typoMat = new LineBasicMaterial({
      color: PAPER.clone(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    disposables.push(line1, line2, typoMat);
    const t1 = new LineSegments(line1, typoMat);
    const t2 = new LineSegments(line2, typoMat);
    typo.add(t1, t2);
    typo.position.set(at[0] + 0.2, at[1] - 1.5, at[2] + 3.4);
    typo.rotation.x = -0.86;
    group.add(typo);

    /* ---- a horizon, so the quiet has an edge --------------------- */
    const horizonGeo = new CylinderGeometry(42, 42, 0.02, 96, 1, true);
    const horizonMat = new MeshStandardMaterial({
      color: new Color('#14110e'),
      side: BackSide,
      roughness: 1,
      metalness: 0,
      transparent: true,
      opacity: 0.5,
    });
    disposables.push(horizonGeo, horizonMat);
    const horizon = new Mesh(horizonGeo, horizonMat);
    horizon.position.set(at[0], floorY, at[2]);
    group.add(horizon);

    return { group, disposables, typoMat, foilMat, glassMat, contourMat, drafts, bauhaus, still, at };
  }, [world, profile]);

  useEffect(
    () => () => {
      for (const d of built.disposables) d.dispose();
    },
    [built],
  );

  useSystem(ORDER.layer, (dt) => {
    const presence = sim.weights.edge;
    built.group.visible = presence > 0.012 && sim.reveal > 0.01;
    if (!built.group.visible) return;

    const show = presence * sim.reveal;
    // the sentence is only legible once the visitor has stopped: this
    // place rewards slowing down, which is the whole point of it
    built.typoMat.opacity = damp(
      built.typoMat.opacity,
      clamp(show * (0.08 + 0.42 * sim.still), 0, 0.5),
      1.6,
      dt,
    );
    built.contourMat.opacity = 0.085 * show;
    built.foilMat.uniforms.uOpacity.value = show;
    built.glassMat.uniforms.uOpacity.value = show;
  });

  return <primitive object={built.group} />;
}
