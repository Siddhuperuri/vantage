/* ------------------------------------------------------------------
   camera.ts - where the visitor stands, and who is allowed to move it.

   The rig is three numbers around a pivot: yaw, pitch, radius. The
   vantage V* is not a special case in the code - it is simply
   (yaw 0, pitch 0, radius D0) about the centre of the word plane,
   which puts the eye exactly at the origin, where the five layers sum.
   That is why "return to the vantage" is exact rather than
   approximately right.

   One object owns the camera transform. The three modes write targets;
   a critically damped spring integrates them; nothing else touches
   camera.position. Framing survives a change of viewport by changing
   the LENS, never the position, because moving the eye would break the
   resolve the whole piece is about.
   ------------------------------------------------------------------ */

import { Vector3, type PerspectiveCamera } from 'three';
import { clamp, crit, damp, lerp, wrapPi } from '../lib/mathx';
import { D0, type LayerDef } from '../world/layers';
import {
  journeyPoint,
  TRAVEL_MAX,
  type ModuleDef,
} from '../world/journey';
import type { VantageWorld } from '../world/vantage';

export type CameraMode = 'guided' | 'exploratory' | 'focused';

const DEG = Math.PI / 180;

/** the guided path, in rig space. The last key is a true rest. */
interface PathKey {
  s: number;
  yaw: number;
  pitch: number;
  radius: number;
  /** multiplier on the fitted fov: the lens opens wide and closes in */
  fov: number;
  hold?: boolean;
}

const PATH: PathKey[] = [
  { s: 0.0, yaw: -71, pitch: 14, radius: 24.0, fov: 1.42 },
  { s: 0.16, yaw: -58, pitch: 11, radius: 20.0, fov: 1.34 },
  { s: 0.4, yaw: -32, pitch: 6, radius: 15.0, fov: 1.18 },
  { s: 0.7, yaw: -11, pitch: 2, radius: 11.8, fov: 1.06 },
  { s: 1.0, yaw: 0, pitch: 0, radius: D0, fov: 1.0, hold: true },
];

function hermite(p0: number, p1: number, m0: number, m1: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1;
}

function evalPath(s: number, get: (k: PathKey) => number): number {
  let i = 0;
  while (i < PATH.length - 2 && s > PATH[i + 1].s) i++;
  const a = PATH[i];
  const b = PATH[i + 1];
  const h = b.s - a.s;
  const t = clamp((s - a.s) / h, 0, 1);
  const tan = (idx: number): number => {
    const k = PATH[idx];
    if (k.hold || idx === 0 || idx === PATH.length - 1) return 0;
    return (get(PATH[idx + 1]) - get(PATH[idx - 1])) / (PATH[idx + 1].s - PATH[idx - 1].s);
  };
  return hermite(get(a), get(b), tan(i) * h, tan(i + 1) * h, t);
}

export interface RigTelemetry {
  /** world units per second the eye is travelling */
  pathSpeed: number;
  /** distance from the vantage */
  err: number;
}

export class CameraRig {
  mode: CameraMode = 'guided';
  /** 0..1 along the guided path */
  progress = 0;
  /** seconds the guided path takes */
  guidedDuration = 17;

  private yaw = PATH[0].yaw * DEG;
  private pitch = PATH[0].pitch * DEG;
  private radius = PATH[0].radius;
  private tYaw = PATH[0].yaw * DEG;
  private tPitch = PATH[0].pitch * DEG;
  private tRadius = PATH[0].radius;
  private vYaw = 0;
  private vPitch = 0;
  private vRadius = 0;

  private pivot = new Vector3(0, 0, -D0);
  private tPivot = new Vector3(0, 0, -D0);

  private fov = 46;
  private tFov = 46;
  private vFov = 0;
  /** the fov that frames the word at the current viewport */
  private fitFov = 46;
  private fovMul = PATH[0].fov;

  /**
   * How far along the journey the pivot has moved. The four modules
   * are four places on this one number, so travelling between them is
   * the same gesture as moving within one of them, and there is never
   * a cut.
   */
  private travel = 0;
  private tTravel = 0;
  private vTravel = 0;

  /** the visitor's disturbance, in the camera's own axes */
  private offX = 0;
  private offY = 0;
  private vOffX = 0;
  private vOffY = 0;

  /** composition: the word sits above centre, so the void below it is deliberate */
  private compose = 0.92;

  reducedMotion = false;

  private readonly spring: [number, number] = [0, 0];
  private readonly prevPos = new Vector3();
  private readonly tmp = new Vector3();
  private readonly lookTarget = new Vector3();
  private readonly journeyAt: [number, number, number] = [0, 0, -D0];
  private started = false;

  readonly telemetry: RigTelemetry = { pathSpeed: 0, err: 0 };

  /** the lens that frames this world at this aspect. Called on resize. */
  fit(world: VantageWorld, aspect: number): void {
    const halfW = ((world.word.bbox.x1 - world.word.bbox.x0) / 2) * world.scale;
    const halfH = ((world.word.bbox.y1 - world.word.bbox.y0) / 2) * world.scale;
    const fillW = 0.84;
    const fillH = world.stacked ? 0.46 : 0.34;
    // vertical half-angle needed to contain the word horizontally, and vertically
    const fromW = Math.atan(halfW / fillW / D0) / Math.max(0.35, aspect);
    const fromH = Math.atan((halfH / fillH + this.compose * 0.5) / D0);
    this.fitFov = clamp((Math.max(fromW, fromH) * 2) / DEG, 32, 76);
    this.tFov = this.fitFov * this.fovMul;
    if (!this.started) this.fov = this.tFov;
  }

  /** jump the rig to the start of the guided path */
  begin(reduced: boolean): void {
    this.reducedMotion = reduced;
    this.mode = 'guided';
    this.progress = reduced ? 0.55 : 0;
    this.guidedDuration = reduced ? 6 : 17;
    this.travel = 0;
    this.tTravel = 0;
    this.vTravel = 0;
    this.started = true;
  }

  /** adopt the current state as the target: used when guided motion is interrupted */
  release(): void {
    this.tYaw = this.yaw;
    this.tPitch = this.pitch;
    this.tRadius = this.radius;
    this.tTravel = this.travel;
    this.tPivot.copy(this.pivot);
    this.fovMul = this.fov / this.fitFov;
    this.tFov = this.fov;
    this.mode = 'exploratory';
  }

  /** the known viewpoint: the one place the layers sum, at the start of the journey */
  toVantage(): void {
    this.mode = 'exploratory';
    this.tYaw = 0;
    this.tPitch = 0;
    this.tRadius = D0;
    this.tTravel = 0;
    this.tPivot.set(0, 0, -D0);
    this.fovMul = 1;
    this.tFov = this.fitFov;
  }

  /** fly to a module: a flight along the same axis, interruptible like any other */
  toModule(def: ModuleDef): void {
    this.mode = 'exploratory';
    this.tTravel = def.travel;
    this.tRadius = def.radius;
    this.tYaw = 0;
    this.tPitch = def.pitch * DEG;
    this.fovMul = 1;
    this.tFov = this.fitFov;
  }

  /** move along the journey by hand, in travel units */
  travelBy(amount: number): void {
    this.takeOver();
    this.tTravel = clamp(this.tTravel + amount, 0, TRAVEL_MAX);
  }

  get travelled(): number {
    return this.travel;
  }

  get travelTarget(): number {
    return this.tTravel;
  }

  /** a useful viewpoint on one layer: off-axis, so it reads as a separate sheet */
  focusOn(def: LayerDef, world: VantageWorld): void {
    this.mode = 'focused';
    const b = world.bounds[def.index];
    this.tPivot.set(b.center[0], b.center[1], b.center[2]);
    this.tYaw = (-30 - def.index * 5) * DEG;
    this.tPitch = (9 - def.index * 2.2) * DEG;
    // close enough that the sheet fills the frame, far enough to see it is a sheet
    this.tRadius = clamp(b.width * 0.62, 3.4, 14);
    this.fovMul = 1.04;
    this.tFov = this.fitFov * this.fovMul;
  }

  /**
   * Hand the camera over before applying input, never after. Written
   * the other way round, release() overwrites the targets the input
   * just set with the current values, and the visitor's first drag or
   * first turn of the wheel does nothing at all.
   */
  private takeOver(): void {
    if (this.mode !== 'exploratory') this.release();
  }

  /** a drag turns the head; dx, dy in css px */
  drag(dx: number, dy: number): void {
    this.takeOver();
    this.tYaw = wrapPi(this.tYaw - dx * 0.0042);
    this.tPitch = clamp(this.tPitch - dy * 0.0032, -40 * DEG, 48 * DEG);
  }

  /**
   * The wheel is a dolly, not a page scroll - and once it has nothing
   * left to give, it becomes travel. Pushing in past the near limit
   * carries the visitor along the journey; pulling out past the far
   * limit carries them back. One gesture, no mode, no cut.
   */
  dolly(amount: number): void {
    this.takeOver();
    const near = 2.4;
    const far = 34;
    let r = this.tRadius * (1 + amount * 0.16);
    if (r < near) {
      this.tTravel = clamp(this.tTravel + ((near - r) / near) * 34, 0, TRAVEL_MAX);
      r = near;
    } else if (r > far) {
      this.tTravel = clamp(this.tTravel - ((r - far) / far) * 34, 0, TRAVEL_MAX);
      r = far;
    }
    this.tRadius = r;
  }

  /** held keys, in the frame they are held */
  keyLook(dt: number, keys: Set<string>): void {
    const rate = 0.85 * dt;
    const before = this.mode;
    let moved = false;
    const turn = (y: number, p: number) => {
      this.tYaw = wrapPi(this.tYaw + y * rate);
      this.tPitch = clamp(this.tPitch + p * rate, -40 * DEG, 48 * DEG);
      moved = true;
    };
    if (keys.has('ArrowLeft') || keys.has('KeyA')) turn(-1, 0);
    if (keys.has('ArrowRight') || keys.has('KeyD')) turn(1, 0);
    if (keys.has('ArrowUp') || keys.has('KeyW')) turn(0, 0.72);
    if (keys.has('ArrowDown') || keys.has('KeyS')) turn(0, -0.72);
    if (keys.has('KeyQ')) {
      this.tRadius = clamp(this.tRadius * (1 - dt * 0.7), 2.0, 34);
      moved = true;
    }
    if (keys.has('KeyE')) {
      this.tRadius = clamp(this.tRadius * (1 + dt * 0.7), 2.0, 34);
      moved = true;
    }
    // the same ordering problem: hand over, then re-apply what the
    // keys asked for, because release() resets the targets
    if (moved && before !== 'exploratory') {
      const yaw = this.tYaw;
      const pitch = this.tPitch;
      const radius = this.tRadius;
      this.release();
      this.tYaw = yaw;
      this.tPitch = pitch;
      this.tRadius = radius;
    }
  }

  /** motion kicks the eye off the vantage; stillness lets a spring carry it home */
  disturb(vx: number, vy: number, dt: number, gain: number): void {
    const kick = (this.reducedMotion ? 3 : 15) * gain;
    this.vOffX -= vx * kick * dt;
    this.vOffY += vy * kick * dt;
  }

  /**
   * One step. The only place camera.position, .quaternion and .fov are
   * written in the whole piece.
   */
  update(camera: PerspectiveCamera, dt: number, t: number, keys: Set<string>): void {
    this.prevPos.copy(camera.position);

    // The journey first: travel decides where the pivot wants to be,
    // unless a focused object has claimed it. Travelling is slower than
    // looking, so arriving somewhere reads as having gone there.
    crit(this.travel, this.vTravel, this.tTravel, this.reducedMotion ? 3.2 : 1.9, dt, this.spring);
    this.travel = this.spring[0];
    this.vTravel = this.spring[1];
    journeyPoint(this.travel, this.journeyAt);
    if (this.mode !== 'focused') {
      this.tPivot.set(this.journeyAt[0], this.journeyAt[1], this.journeyAt[2]);
    }

    if (this.mode === 'guided') {
      // the path only runs once the visitor has chosen to begin: before
      // that the world is held at the first key, breathing
      if (this.started) this.progress = clamp(this.progress + dt / this.guidedDuration, 0, 1);
      this.yaw = evalPath(this.progress, (k) => k.yaw) * DEG;
      this.pitch = evalPath(this.progress, (k) => k.pitch) * DEG;
      this.radius = evalPath(this.progress, (k) => k.radius);
      this.fovMul = evalPath(this.progress, (k) => k.fov);
      this.fov = this.fitFov * this.fovMul;
      this.tYaw = this.yaw;
      this.tPitch = this.pitch;
      this.tRadius = this.radius;
      this.tFov = this.fov;
      this.vYaw = this.vPitch = this.vRadius = this.vFov = 0;
      this.pivot.lerp(this.tPivot, 1);
    } else {
      this.keyLook(dt, keys);
      const w = this.reducedMotion ? 7.5 : 5.2;
      crit(this.yaw, this.vYaw, this.yaw + wrapPi(this.tYaw - this.yaw), w, dt, this.spring);
      this.yaw = this.spring[0];
      this.vYaw = this.spring[1];
      crit(this.pitch, this.vPitch, this.tPitch, w, dt, this.spring);
      this.pitch = this.spring[0];
      this.vPitch = this.spring[1];
      crit(this.radius, this.vRadius, this.tRadius, w, dt, this.spring);
      this.radius = this.spring[0];
      this.vRadius = this.spring[1];
      crit(this.fov, this.vFov, this.tFov, w, dt, this.spring);
      this.fov = this.spring[0];
      this.vFov = this.spring[1];
      this.pivot.x = damp(this.pivot.x, this.tPivot.x, w, dt);
      this.pivot.y = damp(this.pivot.y, this.tPivot.y, w, dt);
      this.pivot.z = damp(this.pivot.z, this.tPivot.z, w, dt);
    }

    // the disturbance spring, solved every frame whatever the mode
    const w0 = 4.4;
    const zeta = 0.86;
    this.vOffX += (-w0 * w0 * this.offX - 2 * zeta * w0 * this.vOffX) * dt;
    this.vOffY += (-w0 * w0 * this.offY - 2 * zeta * w0 * this.vOffY) * dt;
    this.offX += this.vOffX * dt;
    this.offY += this.vOffY * dt;
    const ol = Math.hypot(this.offX, this.offY);
    if (ol > 1.7) {
      this.offX *= 1.7 / ol;
      this.offY *= 1.7 / ol;
    }

    // The world breathes before it is found, and not at all once it is.
    // "Found" has to mean arrived, not "the guided path ran to the end":
    // a visitor who takes the camera over early would otherwise be left
    // with a world that never settles, and so with a name that never
    // quite resolves.
    const settled = 1 - Math.min(1, this.telemetry.err / 1.2);
    const drift = this.reducedMotion
      ? 0
      : 0.5 *
        (1 - clamp(this.progress, 0, 1)) *
        (this.mode === 'guided' ? 1 : 0.2) *
        (1 - settled);
    const dx = Math.sin(t * 0.21) * drift + Math.sin(t * 0.53 + 1.3) * drift * 0.35;
    const dy = Math.cos(t * 0.17 + 0.6) * drift * 0.6;

    // place the eye
    const cp = Math.cos(this.pitch);
    this.tmp.set(
      Math.sin(this.yaw) * cp * this.radius,
      Math.sin(this.pitch) * this.radius,
      Math.cos(this.yaw) * cp * this.radius,
    );
    camera.position.copy(this.pivot).add(this.tmp);

    // look at the pivot, held a little below centre so the word sits high
    this.lookTarget.copy(this.pivot);
    // The composition offset is an ANGLE, not a distance. Written as a
    // distance it is correct at the vantage's radius of 10 and aims the
    // camera at the floor when the visitor is standing inside a room
    // 0.6 units from its own centre.
    this.lookTarget.y -=
      this.radius * (this.compose / D0) * lerp(0.4, 1, clamp(this.progress, 0, 1));
    camera.lookAt(this.lookTarget);

    // the disturbance acts in the camera's own axes, after the look basis exists
    if (Math.abs(this.offX) + Math.abs(this.offY) + Math.abs(dx) + Math.abs(dy) > 1e-5) {
      this.tmp.set(1, 0, 0).applyQuaternion(camera.quaternion).multiplyScalar(this.offX + dx);
      camera.position.add(this.tmp);
      this.tmp.set(0, 1, 0).applyQuaternion(camera.quaternion).multiplyScalar(this.offY + dy);
      camera.position.add(this.tmp);
    }

    if (Math.abs(camera.fov - this.fov) > 1e-4) {
      camera.fov = this.fov;
      camera.updateProjectionMatrix();
    }

    this.telemetry.pathSpeed = dt > 1e-5 ? camera.position.distanceTo(this.prevPos) / dt : 0;
    this.telemetry.err = camera.position.length();
  }

  get currentFov(): number {
    return this.fov;
  }
}

/**
 * There is one camera in this world, so there is one rig. The UI sets
 * targets on it; only render/Director.tsx ever integrates it and
 * writes the camera transform.
 */
export const rig = new CameraRig();
