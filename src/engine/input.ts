/* ------------------------------------------------------------------
   input.ts - the visitor as a physical quantity.

   One owner for every global listener in the piece. Nothing else in
   the codebase calls addEventListener on window, so there is no
   possibility of two systems fighting over the same gesture. The state
   is a mutable struct read inside the frame loop; it is never React
   state, because it changes faster than React should re-render.

   Intent is separated from motion on purpose:
     move          disturbs the world (the law MOTION SCATTERS)
     drag / wheel  moves the camera   (exploration)
     keys          move the camera and operate the piece
   so moving the pointer never secretly orbits the camera.
   ------------------------------------------------------------------ */

export interface InputState {
  /** viewport, css px */
  w: number;
  h: number;
  /** pointer in css px */
  px: number;
  py: number;
  /** pointer in -1..1, y down */
  nx: number;
  ny: number;
  /** smoothed pointer velocity in viewport-heights per second */
  vx: number;
  vy: number;
  speed: number;
  present: boolean;
  down: boolean;
  dragging: boolean;
  touch: boolean;
  everMoved: boolean;
  lastMoveAt: number;
  /** drag accumulated since the last read, css px */
  dragX: number;
  dragY: number;
  /** wheel accumulated since the last read, normalised */
  wheel: number;
  /** held keys, by code */
  keys: Set<string>;
  /** true while any of the look keys is held */
  keyLook: boolean;
}

export type InputCommand =
  | { kind: 'explore' }
  | { kind: 'vantage' }
  | { kind: 'cycle-focus'; delta: number }
  | { kind: 'focus-index'; index: number }
  | { kind: 'onward' }
  | { kind: 'back' }
  | { kind: 'clear-focus' }
  | { kind: 'toggle-chrome' }
  | { kind: 'toggle-settings' }
  | { kind: 'guided' };

type CommandSink = (c: InputCommand) => void;

const LOOK_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyQ',
  'KeyE',
]);

export class InputSystem {
  readonly state: InputState = {
    w: 1,
    h: 1,
    px: 0,
    py: 0,
    nx: 0,
    ny: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    present: false,
    down: false,
    dragging: false,
    touch: false,
    everMoved: false,
    lastMoveAt: 0,
    dragX: 0,
    dragY: 0,
    wheel: 0,
    keys: new Set<string>(),
    keyLook: false,
  };

  private sink: CommandSink | null = null;
  private el: HTMLElement | null = null;
  private lastT = 0;
  private lastX = 0;
  private lastY = 0;
  private downX = 0;
  private downY = 0;
  private attached = false;
  /** a gesture that began on a control belongs to that control, not the camera */
  private ignoreDrag = false;

  onCommand(sink: CommandSink): void {
    this.sink = sink;
  }

  attach(el: HTMLElement): void {
    if (this.attached) this.detach();
    this.el = el;
    this.attached = true;
    const s = this.state;
    s.w = window.innerWidth;
    s.h = window.innerHeight;

    window.addEventListener('pointermove', this.onMove, { passive: true });
    window.addEventListener('pointerdown', this.onDown, { passive: true });
    window.addEventListener('pointerup', this.onUp, { passive: true });
    window.addEventListener('pointercancel', this.onCancel, { passive: true });
    document.documentElement.addEventListener('pointerleave', this.onLeave);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('resize', this.onResize);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  detach(): void {
    if (!this.attached) return;
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onCancel);
    document.documentElement.removeEventListener('pointerleave', this.onLeave);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('resize', this.onResize);
    this.el?.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.state.keys.clear();
    this.state.keyLook = false;
    this.attached = false;
    this.el = null;
  }

  /** read and clear the accumulated drag and wheel: called once per frame */
  takeDrag(out: { x: number; y: number; wheel: number }): void {
    out.x = this.state.dragX;
    out.y = this.state.dragY;
    out.wheel = this.state.wheel;
    this.state.dragX = 0;
    this.state.dragY = 0;
    this.state.wheel = 0;
  }

  /** decay pointer velocity by time, so a 1000 Hz mouse and a trackpad feel the same */
  decay(dt: number): void {
    const s = this.state;
    const k = Math.exp(-7 * dt);
    s.vx *= k;
    s.vy *= k;
    s.speed = Math.hypot(s.vx, s.vy);
  }

  private onResize = (): void => {
    this.state.w = window.innerWidth;
    this.state.h = window.innerHeight;
  };

  private onMove = (e: PointerEvent): void => {
    const s = this.state;
    const now = e.timeStamp || performance.now();
    const x = e.clientX;
    const y = e.clientY;
    if (s.down && this.lastT && !this.ignoreDrag) {
      s.dragX += x - this.lastX;
      s.dragY += y - this.lastY;
      if (!s.dragging && Math.hypot(x - this.downX, y - this.downY) > 4) s.dragging = true;
    }
    if (s.present && this.lastT) {
      const dt = Math.max(0.004, (now - this.lastT) / 1000);
      const rx = (x - this.lastX) / s.h / dt;
      const ry = (y - this.lastY) / s.h / dt;
      const kv = 1 - Math.exp(-dt * 26);
      s.vx += (rx - s.vx) * kv;
      s.vy += (ry - s.vy) * kv;
    }
    this.lastT = now;
    this.lastX = x;
    this.lastY = y;
    s.px = x;
    s.py = y;
    s.nx = (x / s.w) * 2 - 1;
    s.ny = (y / s.h) * 2 - 1;
    s.present = true;
    s.everMoved = true;
    s.lastMoveAt = performance.now();
    s.touch = e.pointerType === 'touch';
  };

  private onDown = (e: PointerEvent): void => {
    const s = this.state;
    // A press is not a drag. Clearing lastT here stops the gap between
    // the last move and the press from being read as one large drag,
    // which would otherwise knock the camera out of its mode on a click.
    this.lastT = 0;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    const target = e.target as HTMLElement | null;
    this.ignoreDrag = !!target?.closest?.('button, a, input, select, textarea, [role="dialog"]');
    s.down = true;
    s.dragging = false;
    this.downX = e.clientX;
    this.downY = e.clientY;
    this.onMove(e);
  };

  private onUp = (e: PointerEvent): void => {
    const s = this.state;
    s.down = false;
    s.dragging = false;
    this.ignoreDrag = false;
    if (e.pointerType === 'touch') this.onLeave();
  };

  private onCancel = (): void => {
    this.state.down = false;
    this.state.dragging = false;
    this.ignoreDrag = false;
    this.onLeave();
  };

  private onLeave = (): void => {
    this.state.present = false;
    this.lastT = 0;
  };

  private onBlur = (): void => {
    this.onLeave();
    this.state.keys.clear();
    this.state.keyLook = false;
  };

  private onWheel = (e: WheelEvent): void => {
    // the wheel is the only way in: it is dolly, not page scroll
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? this.state.h : 1;
    this.state.wheel += (e.deltaY * unit) / 420;
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    const tag = target?.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target?.isContentEditable;
    if (typing) return;

    this.state.keys.add(e.code);
    if (LOOK_KEYS.has(e.code)) {
      this.state.keyLook = true;
      e.preventDefault();
    }

    const send = (c: InputCommand) => {
      e.preventDefault();
      this.sink?.(c);
    };
    switch (e.code) {
      case 'KeyV':
      case 'Home':
        send({ kind: 'vantage' });
        break;
      case 'Escape':
        send({ kind: 'clear-focus' });
        break;
      case 'KeyG':
        send({ kind: 'guided' });
        break;
      case 'KeyN':
        send({ kind: 'onward' });
        break;
      case 'KeyB':
        send({ kind: 'back' });
        break;
      case 'KeyH':
        send({ kind: 'toggle-chrome' });
        break;
      case 'Comma':
        send({ kind: 'toggle-settings' });
        break;
      case 'BracketRight':
        send({ kind: 'cycle-focus', delta: 1 });
        break;
      case 'BracketLeft':
        send({ kind: 'cycle-focus', delta: -1 });
        break;
      case 'Digit1':
      case 'Digit2':
      case 'Digit3':
      case 'Digit4':
      case 'Digit5':
        send({ kind: 'focus-index', index: Number(e.code.slice(5)) - 1 });
        break;
      default:
        break;
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.state.keys.delete(e.code);
    this.state.keyLook = Array.from(this.state.keys).some((k) => LOOK_KEYS.has(k));
  };
}

export const input = new InputSystem();
