/* ------------------------------------------------------------------
   Readout.tsx - four numbers that are true.

   LOCK is how close the eye is to the vantage, which is the one thing
   worth knowing in this world. STILL and ENERGY are the two sides of
   the law. DELTA is the actual distance from V* in world units. They
   are written straight into the DOM from a requestAnimationFrame loop,
   so a number changing sixty times a second never re-renders React.
   ------------------------------------------------------------------ */

import { useEffect, useRef } from 'react';
import { sim } from '../engine/sim';

export function Readout() {
  const lock = useRef<HTMLSpanElement>(null);
  const still = useRef<HTMLSpanElement>(null);
  const energy = useRef<HTMLSpanElement>(null);
  const delta = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLElement>(null);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      // twelve times a second is plenty for something being read
      if (t - last < 80) return;
      last = t;
      if (lock.current) lock.current.textContent = sim.lock.toFixed(2);
      if (still.current) still.current.textContent = sim.still.toFixed(2);
      if (energy.current) energy.current.textContent = Math.min(sim.E, 1.4).toFixed(2);
      if (delta.current) delta.current.textContent = sim.err.toFixed(3);
      if (bar.current) bar.current.style.setProperty('--lock', String(sim.lock));
      if (pin.current) {
        pin.current.style.transform = `translateY(${(1 - sim.lock) * 100}%)`;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <dl className="readout" aria-hidden="true">
        <div>
          <dt>lock</dt>
          <dd>
            <span ref={lock}>0.00</span>
          </dd>
        </div>
        <div>
          <dt>still</dt>
          <dd>
            <span ref={still}>0.00</span>
          </dd>
        </div>
        <div>
          <dt>energy</dt>
          <dd>
            <span ref={energy}>0.00</span>
          </dd>
        </div>
        <div>
          <dt>delta</dt>
          <dd>
            <span ref={delta}>0.000</span>
          </dd>
        </div>
      </dl>
      <div className="gauge" ref={bar} aria-hidden="true">
        <i className="gauge__pin" ref={pin} />
      </div>
    </>
  );
}
