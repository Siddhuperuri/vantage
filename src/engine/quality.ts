/* ------------------------------------------------------------------
   quality.ts - what to spend, and where.

   One profile decides everything expensive: how dense the field cloud
   is, how many hand passes the trace draws, how fine the lattice is,
   the device pixel ratio, and whether the atmosphere effect runs. A
   tier change rebuilds the world arrays, which is why it is a setting
   and not a per-frame decision.
   ------------------------------------------------------------------ */

export type QualityTier = 'low' | 'medium' | 'high';
export type QualitySetting = QualityTier | 'auto';

export interface QualityProfile {
  readonly tier: QualityTier;
  readonly fieldDensity: number;
  readonly tracePasses: number;
  readonly latticePitch: number;
  /** hard cap on device pixel ratio */
  readonly maxDpr: number;
  /** cap on total pixels of additive light per frame */
  readonly maxPixels: number;
  readonly grain: boolean;
  /** draw the fragments and armature that only exist to catch the ember */
  readonly matter: boolean;
}

export const PROFILES: Record<QualityTier, QualityProfile> = {
  low: {
    tier: 'low',
    fieldDensity: 0.35,
    tracePasses: 1,
    latticePitch: 0.075,
    maxDpr: 1,
    maxPixels: 2.2e6,
    grain: false,
    matter: false,
  },
  medium: {
    tier: 'medium',
    fieldDensity: 0.7,
    tracePasses: 2,
    latticePitch: 0.06,
    maxDpr: 1.5,
    maxPixels: 4.5e6,
    grain: true,
    matter: true,
  },
  high: {
    tier: 'high',
    fieldDensity: 1.25,
    tracePasses: 3,
    latticePitch: 0.05,
    maxDpr: 2,
    maxPixels: 8.4e6,
    grain: true,
    matter: true,
  },
};

/**
 * A guess from what the browser will tell us, used only when the
 * setting is 'auto'. Deliberately conservative: a visitor on a laptop
 * GPU should get a world that holds 60 fps, not one that looks best in
 * a screenshot.
 */
export function detectTier(): QualityTier {
  if (typeof window === 'undefined') return 'medium';
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const area = window.innerWidth * window.innerHeight * Math.min(window.devicePixelRatio ?? 1, 2);
  if (coarse && area > 2.4e6) return 'low';
  if (cores <= 4 || mem === 1) return 'low';
  if (cores >= 8 && area < 5.5e6) return 'high';
  return 'medium';
}

export function resolveProfile(setting: QualitySetting): QualityProfile {
  return PROFILES[setting === 'auto' ? detectTier() : setting];
}

/** the dpr to hand the renderer: capped by tier and by total pixel budget */
export function dprFor(profile: QualityProfile, w: number, h: number): number {
  const byArea = Math.sqrt(profile.maxPixels / Math.max(1, w * h));
  return Math.max(0.75, Math.min(window.devicePixelRatio ?? 1, profile.maxDpr, byArea));
}
