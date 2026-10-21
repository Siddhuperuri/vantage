/* ------------------------------------------------------------------
   post/chain.ts - a bounded post chain.

   At most: one scene target, two half-resolution targets for the glow,
   and two full-screen passes on screen during a crossfade. That is the
   whole budget, and it is a budget rather than a composer so that the
   cost of this file is something you can state rather than measure.

   When nothing is active the chain renders straight to the canvas and
   allocates no targets at all, so a visitor on the low tier pays
   nothing for a feature they are not getting.
   ------------------------------------------------------------------ */

import {
  BufferAttribute,
  BufferGeometry,
  Mesh,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { damp } from '../../lib/mathx';
import { EMBER, PAPER } from '../palette';
import { buildAsciiAtlas, type AsciiAtlas } from './atlas';
import {
  ASCII_FRAG,
  BLUR_FRAG,
  BRIGHT_FRAG,
  COMPOSITE_FRAG,
  COPY_FRAG,
  DITHER_FRAG,
  GLITCH_FRAG,
  HALFTONE_FRAG,
  PIXEL_FRAG,
  POST_VERT,
  RISO_FRAG,
} from './shaders';

export const TREATMENTS = [
  'none',
  'ascii',
  'dither',
  'halftone',
  'riso',
  'pixel',
  'glitch',
] as const;
export type TreatmentId = (typeof TREATMENTS)[number];

export const TREATMENT_LABEL: Record<TreatmentId, string> = {
  none: 'none',
  ascii: 'ascii',
  dither: 'dither',
  halftone: 'halftone',
  riso: 'riso',
  pixel: 'pixel',
  glitch: 'glitch',
};

interface Pass {
  material: ShaderMaterial;
  mesh: Mesh;
}

/** a clip-space triangle: the only geometry the whole chain needs */
function triangle(): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute(
    'position',
    new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3),
  );
  return g;
}

export class PostChain {
  private geometry = triangle();
  private scene = new Scene();
  private camera: Camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private passes = new Map<TreatmentId, Pass>();
  private sceneTarget: WebGLRenderTarget | null = null;
  private glowA: WebGLRenderTarget | null = null;
  private glowB: WebGLRenderTarget | null = null;
  private bright: Pass | null = null;
  private blur: Pass | null = null;
  private composite: Pass | null = null;
  private atlas: AsciiAtlas | null = null;
  private size = new Vector2(1, 1);

  /** what is being applied, and what is fading out behind it */
  private current: TreatmentId = 'none';
  private previous: TreatmentId = 'none';
  private mix = 1;

  /** 0..1 strength of the treatment itself, independent of the crossfade */
  amount = 1;
  /** 0..1 selective glow; 0 disables the three extra passes entirely */
  bloom = 0;
  /** 0..1, driven by events: a glitch has a trigger and a duration */
  glitch = 0;

  private disposed = false;

  get treatment(): TreatmentId {
    return this.current;
  }

  /** is any pass needed at all this frame? */
  get active(): boolean {
    return this.current !== 'none' || this.previous !== 'none' || this.bloom > 0.002 || this.glitch > 0.002;
  }

  setTreatment(id: TreatmentId): void {
    if (id === this.current) return;
    this.previous = this.mix > 0.5 ? this.current : this.previous;
    this.current = id;
    this.mix = 0;
  }

  private makePass(id: TreatmentId): Pass {
    const existing = this.passes.get(id);
    if (existing) return existing;

    const base = {
      uScene: { value: null as Texture | null },
      uResolution: { value: new Vector2(1, 1) },
      uTime: { value: 0 },
      uAmount: { value: 1 },
      uOpacity: { value: 1 },
    };

    let fragmentShader = COPY_FRAG;
    let extra: Record<string, { value: unknown }> = {};

    switch (id) {
      case 'ascii': {
        this.atlas ??= buildAsciiAtlas(32);
        fragmentShader = ASCII_FRAG;
        extra = {
          uAtlas: { value: this.atlas.texture },
          uGlyphs: { value: this.atlas.count },
          uCell: { value: 11 },
          uInk: { value: PAPER.clone() },
        };
        break;
      }
      case 'dither':
        fragmentShader = DITHER_FRAG;
        extra = { uLevels: { value: 6 }, uScale: { value: 1 }, uBlue: { value: 0 } };
        break;
      case 'halftone':
        fragmentShader = HALFTONE_FRAG;
        // a bigger cell reads as a screen; a small one reads as noise
        extra = { uCell: { value: 7.5 }, uAngle: { value: 0.4 } };
        break;
      case 'riso':
        fragmentShader = RISO_FRAG;
        extra = {
          // paper is the heavy plate and ember the light one, here as
          // everywhere else: two inks, and the second one is the one
          // that is curious
          uInkA: { value: PAPER.clone() },
          uInkB: { value: EMBER.clone() },
          uRegistration: { value: 2.4 },
          uGrain: { value: 0.04 },
        };
        break;
      case 'pixel':
        fragmentShader = PIXEL_FRAG;
        extra = { uSize: { value: 5 }, uLevels: { value: 6 } };
        break;
      case 'glitch':
        fragmentShader = GLITCH_FRAG;
        extra = { uShift: { value: 7 }, uBlocks: { value: 0.35 } };
        break;
      default:
        fragmentShader = COPY_FRAG;
    }

    const material = new ShaderMaterial({
      vertexShader: POST_VERT,
      fragmentShader,
      uniforms: { ...base, ...extra },
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    const mesh = new Mesh(this.geometry, material);
    mesh.frustumCulled = false;
    const pass: Pass = { material, mesh };
    this.passes.set(id, pass);
    return pass;
  }

  private ensureTargets(w: number, h: number): void {
    if (!this.sceneTarget) {
      this.sceneTarget = new WebGLRenderTarget(w, h, { depthBuffer: true, stencilBuffer: false });
    } else if (this.sceneTarget.width !== w || this.sceneTarget.height !== h) {
      this.sceneTarget.setSize(w, h);
    }
    if (this.bloom > 0.002) {
      const hw = Math.max(1, Math.floor(w / 2));
      const hh = Math.max(1, Math.floor(h / 2));
      if (!this.glowA) {
        this.glowA = new WebGLRenderTarget(hw, hh, { depthBuffer: false, stencilBuffer: false });
        this.glowB = new WebGLRenderTarget(hw, hh, { depthBuffer: false, stencilBuffer: false });
      } else if (this.glowA.width !== hw || this.glowA.height !== hh) {
        this.glowA.setSize(hw, hh);
        this.glowB?.setSize(hw, hh);
      }
    }
  }

  private simplePass(frag: string, extra: Record<string, { value: unknown }>): Pass {
    const material = new ShaderMaterial({
      vertexShader: POST_VERT,
      fragmentShader: frag,
      uniforms: {
        uScene: { value: null },
        uResolution: { value: new Vector2(1, 1) },
        uTime: { value: 0 },
        uAmount: { value: 1 },
        uOpacity: { value: 1 },
        ...extra,
      },
      depthTest: false,
      depthWrite: false,
      transparent: false,
    });
    const mesh = new Mesh(this.geometry, material);
    mesh.frustumCulled = false;
    return { material, mesh };
  }

  private draw(gl: WebGLRenderer, pass: Pass, target: WebGLRenderTarget | null): void {
    this.scene.clear();
    this.scene.add(pass.mesh);
    gl.setRenderTarget(target);
    gl.render(this.scene, this.camera);
  }

  /** advance the crossfade; called once per frame before render */
  update(dt: number, t: number): void {
    this.mix = damp(this.mix, 1, 5.5, dt);
    if (this.mix > 0.995 && this.previous !== this.current) this.previous = this.current;
    for (const pass of this.passes.values()) pass.material.uniforms.uTime.value = t;
    this.bright && (this.bright.material.uniforms.uTime.value = t);
  }

  /**
   * Render the world. If nothing is active this is exactly the same
   * single call the piece made before the chain existed.
   */
  render(gl: WebGLRenderer, world: Scene, camera: Camera): void {
    if (this.disposed || !this.active) {
      gl.setRenderTarget(null);
      gl.render(world, camera);
      return;
    }

    gl.getDrawingBufferSize(this.size);
    const w = Math.max(1, Math.floor(this.size.x));
    const h = Math.max(1, Math.floor(this.size.y));
    this.ensureTargets(w, h);
    const target = this.sceneTarget!;

    gl.setRenderTarget(target);
    gl.clear();
    gl.render(world, camera);

    let source: Texture = target.texture;

    /* ---- selective glow, only when asked for --------------------- */
    if (this.bloom > 0.002 && this.glowA && this.glowB) {
      // only genuinely bright things glow: the ember, and the name
      this.bright ??= this.simplePass(BRIGHT_FRAG, { uThreshold: { value: 0.74 } });
      this.blur ??= this.simplePass(BLUR_FRAG, { uDirection: { value: new Vector2(1, 0) } });
      this.composite ??= this.simplePass(COMPOSITE_FRAG, {
        uGlow: { value: null },
        uStrength: { value: 1 },
      });

      const hw = this.glowA.width;
      const hh = this.glowA.height;
      this.bright.material.uniforms.uScene.value = target.texture;
      (this.bright.material.uniforms.uResolution.value as Vector2).set(hw, hh);
      this.draw(gl, this.bright, this.glowA);

      const blurU = this.blur.material.uniforms;
      blurU.uScene.value = this.glowA.texture;
      (blurU.uResolution.value as Vector2).set(hw, hh);
      (blurU.uDirection.value as Vector2).set(1, 0);
      this.draw(gl, this.blur, this.glowB);

      blurU.uScene.value = this.glowB.texture;
      (blurU.uDirection.value as Vector2).set(0, 1);
      this.draw(gl, this.blur, this.glowA);

      // composited back into the scene target so the treatments that
      // follow are printing the lit image, not the unlit one
      const comp = this.composite.material.uniforms;
      comp.uScene.value = target.texture;
      comp.uGlow.value = this.glowA.texture;
      comp.uStrength.value = this.bloom;
      (comp.uResolution.value as Vector2).set(w, h);
      comp.uOpacity.value = 1;
      // the composite writes sRGB, so when it is the last thing to run
      // it goes straight to the canvas
      if (this.current === 'none' && this.previous === 'none' && this.glitch <= 0.002) {
        this.draw(gl, this.composite, null);
        gl.setRenderTarget(null);
        return;
      }
      this.draw(gl, this.composite, this.glowB);
      source = this.glowB.texture;
    }

    /* ---- the treatment, and whatever it is replacing ------------- */
    const order: { id: TreatmentId; opacity: number }[] = [];
    if (this.previous !== this.current && this.mix < 0.995) {
      order.push({ id: this.previous, opacity: 1 });
      order.push({ id: this.current, opacity: this.mix });
    } else {
      order.push({ id: this.current, opacity: 1 });
    }
    // a glitch runs on top of whatever treatment is in force
    if (this.glitch > 0.002 && this.current !== 'glitch') {
      order.push({ id: 'glitch', opacity: 1 });
    }

    gl.setRenderTarget(null);
    for (let i = 0; i < order.length; i++) {
      const { id, opacity } = order[i];
      const pass = this.makePass(id);
      const u = pass.material.uniforms;
      u.uScene.value = source;
      (u.uResolution.value as Vector2).set(w, h);
      u.uOpacity.value = opacity;
      u.uAmount.value = id === 'glitch' && id !== this.current ? this.glitch : this.amount;
      pass.material.blending = i === 0 ? 1 /* NormalBlending */ : 1;
      pass.material.transparent = i > 0;
      this.draw(gl, pass, null);
    }
    gl.setRenderTarget(null);
  }

  dispose(): void {
    this.disposed = true;
    for (const pass of this.passes.values()) pass.material.dispose();
    this.passes.clear();
    this.bright?.material.dispose();
    this.blur?.material.dispose();
    this.composite?.material.dispose();
    this.bright = this.blur = this.composite = null;
    this.sceneTarget?.dispose();
    this.glowA?.dispose();
    this.glowB?.dispose();
    this.sceneTarget = this.glowA = this.glowB = null;
    this.atlas?.dispose();
    this.atlas = null;
    this.geometry.dispose();
  }
}

export const postChain = new PostChain();
