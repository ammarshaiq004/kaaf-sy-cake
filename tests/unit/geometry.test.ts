import { describe, expect, it } from 'vitest';
import { N, project, unitOutline } from '../../src/cake/geometry';
import { earliestDate, formatDate, parseISODate } from '../../src/lib/dates';

describe('cake outlines', () => {
  it('samples every shape with the same number of points so shapes can morph', () => {
    for (const k of ['round', 'square', 'heart'] as const) {
      const o = unitOutline(k);
      expect(o.length).toBe(N * 2);
      expect(Array.from(o).every(Number.isFinite)).toBe(true);
    }
  });

  it('builds a heart that is mirror-symmetric with its point toward the viewer', () => {
    const o = unitOutline('heart');
    const front = o[(N / 4) * 2 + 1]!; // angle 90deg: +y, toward the viewer
    const back = o[((3 * N) / 4) * 2 + 1]!;
    expect(front).toBeGreaterThan(Math.abs(back));
    for (let i = 1; i < N / 2; i++) {
      const j = N / 2 - i; // mirror across the y axis
      expect(o[i * 2]!).toBeCloseTo(-o[j * 2]!, 1);
    }
  });

  it('finds a front silhouette running left to right', () => {
    const pr = project(unitOutline('square'), { cx: 300, topY: 300, radius: 150, height: 100, tilt: 0.34, angle: 0.3 });
    const xs = pr.front.map((i) => pr.top[i * 2]!);
    expect(xs[0]).toBeCloseTo(pr.minX);
    expect(xs[xs.length - 1]).toBeCloseTo(pr.maxX);
    for (let k = 1; k < xs.length; k++) expect(xs[k]!).toBeGreaterThanOrEqual(xs[k - 1]! - 1e-6);
  });
});

describe('dates', () => {
  it('adds the lead time across month ends', () => {
    expect(earliestDate(new Date(2026, 9, 30), 2)).toBe('2026-11-01');
  });

  it('formats without depending on locale', () => {
    expect(formatDate('2026-12-25')).toBe('Fri, 25 Dec 2026');
  });

  it('rejects impossible dates', () => {
    expect(parseISODate('2026-02-30')).toBeNull();
  });
});
