/**
 * Cake geometry in "plan space": the cake footprint seen from directly above,
 * centred on the origin, +y pointing toward the viewer. Every shape is sampled
 * at the same N polar angles, so any two shapes can be morphed point by point.
 */

export const N = 96;

export type ShapeKind = 'round' | 'square' | 'heart';

/** Flat [x0, y0, x1, y1, ...] array of N points. */
export type Outline = Float64Array;

const cache = new Map<ShapeKind, Outline>();

function angleAt(i: number): number {
  return (i / N) * Math.PI * 2;
}

function circle(): Outline {
  const out = new Float64Array(N * 2);
  for (let i = 0; i < N; i++) {
    const a = angleAt(i);
    out[i * 2] = Math.cos(a);
    out[i * 2 + 1] = Math.sin(a);
  }
  return out;
}

/** Rounded square as a superellipse, sized to read as the same cake. */
function square(): Outline {
  const out = new Float64Array(N * 2);
  const p = 9;
  const s = 0.9;
  for (let i = 0; i < N; i++) {
    const a = angleAt(i);
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const r = s / Math.pow(Math.pow(Math.abs(c), p) + Math.pow(Math.abs(sn), p), 1 / p);
    out[i * 2] = r * c;
    out[i * 2 + 1] = r * sn;
  }
  return out;
}

/**
 * Heart with its point toward the viewer. The classic parametric heart is
 * resampled by polar angle: for each angle we cast a ray from the centre and
 * keep the outermost intersection with the curve.
 */
function heart(): Outline {
  const M = 1440;
  const xs = new Float64Array(M);
  const ys = new Float64Array(M);
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (let j = 0; j < M; j++) {
    const t = (j / M) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    // Negate so the point (t = pi) faces +y, toward the viewer.
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    xs[j] = x;
    ys[j] = y;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2 + 1.2;
  const scale = 2.08 / (maxX - minX);

  const out = new Float64Array(N * 2);
  for (let i = 0; i < N; i++) {
    const a = angleAt(i);
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let best = 0;
    for (let j = 0; j < M; j++) {
      const k = (j + 1) % M;
      const ax = xs[j]! - cx,
        ay = ys[j]! - cy;
      const bx = xs[k]! - cx,
        by = ys[k]! - cy;
      // Ray (t*dx, t*dy), t>0, against segment a + u(b - a), 0<=u<=1.
      const ex = bx - ax,
        ey = by - ay;
      const den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-12) continue;
      const t = (ax * ey - ay * ex) / den;
      const u = (ax * dy - ay * dx) / den;
      if (t > 0 && u >= 0 && u <= 1 && t > best) best = t;
    }
    out[i * 2] = dx * best * scale;
    out[i * 2 + 1] = dy * best * scale;
  }
  return out;
}

export function unitOutline(kind: ShapeKind): Outline {
  let o = cache.get(kind);
  if (!o) {
    o = kind === 'round' ? circle() : kind === 'square' ? square() : heart();
    cache.set(kind, o);
  }
  return o;
}

export function lerpOutline(a: Outline, b: Outline, t: number, out: Outline = new Float64Array(N * 2)): Outline {
  for (let i = 0; i < N * 2; i++) out[i] = a[i]! + (b[i]! - a[i]!) * t;
  return out;
}

export interface Projection {
  cx: number;
  /** Screen y of the top face's plan origin. */
  topY: number;
  radius: number;
  height: number;
  /** Vertical foreshortening of the top face (0 = edge-on, 1 = overhead). */
  tilt: number;
  /** Rotation around the vertical axis, radians. */
  angle: number;
}

export interface Projected {
  /** Top rim in screen space, N points. */
  top: Float64Array;
  /** Outward unit normals of each edge i -> i+1, in rotated plan space. */
  nx: Float64Array;
  ny: Float64Array;
  /** Indices of the front silhouette chain, left to right. */
  front: number[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  height: number;
  /** Screen position of the plan origin on the top face. */
  ox: number;
  oy: number;
}

export function project(unit: Outline, p: Projection): Projected {
  const top = new Float64Array(N * 2);
  const nx = new Float64Array(N);
  const ny = new Float64Array(N);
  const cos = Math.cos(p.angle);
  const sin = Math.sin(p.angle);
  const rx = new Float64Array(N);
  const ry = new Float64Array(N);
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  let iL = 0,
    iR = 0,
    iB = 0;
  for (let i = 0; i < N; i++) {
    const ux = unit[i * 2]! * p.radius;
    const uy = unit[i * 2 + 1]! * p.radius;
    const x = ux * cos - uy * sin;
    const y = ux * sin + uy * cos;
    rx[i] = x;
    ry[i] = y;
    const sx = p.cx + x;
    const sy = p.topY + y * p.tilt;
    top[i * 2] = sx;
    top[i * 2 + 1] = sy;
    if (sx < minX) {
      minX = sx;
      iL = i;
    }
    if (sx > maxX) {
      maxX = sx;
      iR = i;
    }
    if (sy > maxY) {
      maxY = sy;
      iB = i;
    }
    if (sy < minY) minY = sy;
  }
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    // Points run counter-clockwise in a y-down plan, so (dy, -dx) points out.
    const dx = rx[j]! - rx[i]!;
    const dy = ry[j]! - ry[i]!;
    const len = Math.hypot(dx, dy) || 1;
    nx[i] = dy / len;
    ny[i] = -dx / len;
  }
  // Fix orientation if the outline happens to run the other way.
  let area = 0;
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    area += rx[i]! * ry[j]! - rx[j]! * ry[i]!;
  }
  if (area < 0) {
    for (let i = 0; i < N; i++) {
      nx[i] = -nx[i]!;
      ny[i] = -ny[i]!;
    }
  }

  // Front chain: the path from leftmost to rightmost point that passes through
  // the lowest screen point (closest to the viewer).
  const walk = (step: 1 | -1): number[] => {
    const chain: number[] = [];
    let i = iL;
    let hitBottom = false;
    for (let n = 0; n <= N; n++) {
      chain.push(i);
      if (i === iB) hitBottom = true;
      if (i === iR) break;
      i = (i + step + N) % N;
    }
    return hitBottom ? chain : [];
  };
  let front = walk(1);
  if (!front.length) front = walk(-1);

  return { top, nx, ny, front, minX, maxX, minY, maxY: maxY + p.height, height: p.height, ox: p.cx, oy: p.topY };
}

const f = (n: number) => (Math.round(n * 10) / 10).toString();

export function polygonPath(pts: Float64Array, close = true): string {
  let d = '';
  for (let i = 0; i < pts.length; i += 2) d += (i ? 'L' : 'M') + f(pts[i]!) + ' ' + f(pts[i + 1]!);
  return close ? d + 'Z' : d;
}

/**
 * The visible side wall: the outline extruded downward by `height`. Each edge
 * becomes a quad wound the same way, so with a nonzero fill they union cleanly
 * for any shape, convex or not.
 */
export function sidePath(pr: Projected, dy = 0): string {
  const { top, height } = pr;
  let d = '';
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N;
    const ax = top[i * 2]!,
      ay = top[i * 2 + 1]! + dy;
    const bx = top[j * 2]!,
      by = top[j * 2 + 1]! + dy;
    // Quad a, b, b+h, a+h is clockwise on screen when b is right of a.
    if (bx >= ax) {
      d += `M${f(ax)} ${f(ay)}L${f(bx)} ${f(by)}L${f(bx)} ${f(by + height)}L${f(ax)} ${f(ay + height)}Z`;
    } else {
      d += `M${f(bx)} ${f(by)}L${f(ax)} ${f(ay)}L${f(ax)} ${f(ay + height)}L${f(bx)} ${f(by + height)}Z`;
    }
  }
  return d;
}

/** Smooth path through points (Catmull-Rom as cubic Béziers). */
export function smoothPath(xs: number[], ys: number[], moveTo = true): string {
  const n = xs.length;
  if (!n) return '';
  let d = (moveTo ? 'M' : 'L') + f(xs[0]!) + ' ' + f(ys[0]!);
  for (let i = 0; i < n - 1; i++) {
    const x0 = xs[Math.max(0, i - 1)]!,
      y0 = ys[Math.max(0, i - 1)]!;
    const x1 = xs[i]!,
      y1 = ys[i]!;
    const x2 = xs[i + 1]!,
      y2 = ys[i + 1]!;
    const x3 = xs[Math.min(n - 1, i + 2)]!,
      y3 = ys[Math.min(n - 1, i + 2)]!;
    const c1x = x1 + (x2 - x0) / 6,
      c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6,
      c2y = y2 - (y3 - y1) / 6;
    d += `C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(x2)} ${f(y2)}`;
  }
  return d;
}

/** Deterministic pseudo-random in [0, 1) for stable decoration layouts. */
export function hash(i: number, seed = 1): number {
  const s = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export { f as fmt };
