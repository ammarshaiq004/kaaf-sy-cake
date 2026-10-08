/**
 * Motion system. One place for durations, easing and the reduced-motion rule.
 * UI elements use the Web Animations API; geometry that WAAPI can't
 * interpolate (SVG paths, gradient stops) uses the keyed Animator below. Both
 * are cancellable: starting an animation on a key replaces the old one.
 */

export const DURATION = {
  fast: 160,
  base: 280,
  slow: 520,
  deliberate: 900,
} as const;

export const EASE = {
  out: 'cubic-bezier(0.22, 1, 0.36, 1)',
  inOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  soft: 'cubic-bezier(0.33, 1, 0.68, 1)',
} as const;

const query = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

export function prefersReducedMotion(): boolean {
  return query?.matches ?? false;
}

export const ease = {
  linear: (t: number) => t,
  outCubic: (t: number) => 1 - (1 - t) ** 3,
  outQuint: (t: number) => 1 - (1 - t) ** 5,
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t: number) => {
    const c1 = 1.5;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};

export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/** Map t from [a, b] to [0, 1], clamped. Handy for staggered sub-phases. */
export const phase = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));

interface Track {
  start: number;
  duration: number;
  easing: (t: number) => number;
  step: (v: number) => void;
  done?: () => void;
}

/**
 * Keyed tween runner on a single rAF loop. After each frame's tweens update,
 * `onFrame` runs once, so a renderer redraws exactly once per frame.
 */
export class Animator {
  private tracks = new Map<string, Track>();
  private raf = 0;

  constructor(private onFrame: () => void) {}

  /** Start (or replace) the tween on `key`. step receives eased progress. */
  run(key: string, duration: number, step: (v: number) => void, easing = ease.inOutCubic, done?: () => void): void {
    this.tracks.delete(key);
    if (duration <= 0 || prefersReducedMotion()) {
      step(1);
      done?.();
      this.request();
      return;
    }
    this.tracks.set(key, { start: performance.now(), duration, easing, step, done });
    this.request();
  }

  cancel(key: string): void {
    this.tracks.delete(key);
  }

  isRunning(key?: string): boolean {
    return key ? this.tracks.has(key) : this.tracks.size > 0;
  }

  /** Ask for a redraw without a tween (e.g. after a direct state change). */
  request(): void {
    if (!this.raf) this.raf = requestAnimationFrame(this.tick);
  }

  destroy(): void {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.tracks.clear();
  }

  private tick = (now: number) => {
    this.raf = 0;
    const finished: Track[] = [];
    for (const [key, t] of this.tracks) {
      const p = clamp01((now - t.start) / t.duration);
      t.step(t.easing(p));
      if (p >= 1) {
        this.tracks.delete(key);
        finished.push(t);
      }
    }
    this.onFrame();
    for (const t of finished) t.done?.();
    if (this.tracks.size) this.request();
  };
}

/** WAAPI helper that respects reduced motion and replaces prior animations. */
export function animate(el: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation | null {
  if (prefersReducedMotion() || typeof el.animate !== 'function') return null;
  for (const a of el.getAnimations()) {
    if (a.id === options.id && options.id) a.cancel();
  }
  return el.animate(keyframes, { fill: 'both', ...options });
}
