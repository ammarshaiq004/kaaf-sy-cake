/**
 * Procedural 2.5D cake renderer.
 *
 * The cake is described in plan space (see geometry.ts), rotated, projected to
 * a 3/4 view and extruded. Frosting, colour, decorations and the message are
 * independent layers computed from a CakeSpec, so the picture always matches
 * the configuration. Every change animates through the keyed Animator, so a
 * new choice cancels and replaces the animation it supersedes.
 */
import type { DecorationId, FrostingId } from '../data/bakery';
import { darken, lighten, mix } from '../lib/color';
import { Animator, clamp01, ease, phase, prefersReducedMotion } from '../lib/motion';
import {
  N,
  fmt,
  hash,
  lerpOutline,
  polygonPath,
  project,
  sidePath,
  smoothPath,
  unitOutline,
  type Outline,
  type Projected,
  type ShapeKind,
} from './geometry';
import { motifPath, type Motif } from './motifs';

export interface CakeColors {
  coat: string;
  accent: string;
  detail: string;
  writing: string;
}

export interface CakeSpec {
  shape: ShapeKind;
  tiers: 1 | 2;
  size: number;
  height: number;
  frosting: FrostingId;
  colors: CakeColors;
  decorations: DecorationId[];
  topperName: string;
  message: string;
  motif: Motif;
}

export interface RendererOptions {
  /** Allow dragging to rotate the cake. */
  interactive?: boolean;
  /** Initial view angle in radians. */
  angle?: number;
  label?: string;
}

const SVG = 'http://www.w3.org/2000/svg';
const VIEW = 600;
const BASE_R = 172;
const BASE_H = 128;
const TILT = 0.34;
const BOTTOM_Y = 488;
const LIGHT_X = -0.55;
const LIGHT_Y = 0.83;
const STOPS = 64;

type Finish = 'matte' | 'textured' | 'smooth' | 'smooth-rosettes' | 'glossy';

const FINISH: Record<FrostingId, Finish> = {
  cream: 'matte',
  buttercream: 'textured',
  fondant: 'smooth',
  'buttercream-fondant': 'smooth-rosettes',
  fudge: 'glossy',
};

const LOOK: Record<Finish, { spec: number; sharp: number; rim: number; top: number }> = {
  matte: { spec: 0.14, sharp: 1.6, rim: 0.2, top: 0.16 },
  textured: { spec: 0.18, sharp: 2, rim: 0.24, top: 0.2 },
  smooth: { spec: 0.3, sharp: 3, rim: 0.26, top: 0.26 },
  'smooth-rosettes': { spec: 0.3, sharp: 3, rim: 0.26, top: 0.26 },
  glossy: { spec: 0.5, sharp: 9, rim: 0.36, top: 0.34 },
};

/** How each frosting arrives when it is chosen. */
const ARRIVAL: Record<FrostingId, { kind: 'pour' | 'sweep' | 'drape' | 'soft'; ms: number }> = {
  fudge: { kind: 'pour', ms: 1500 },
  buttercream: { kind: 'sweep', ms: 1200 },
  fondant: { kind: 'drape', ms: 1150 },
  'buttercream-fondant': { kind: 'drape', ms: 1350 },
  cream: { kind: 'soft', ms: 1100 },
};

interface Palette5 {
  top: string;
  side: string;
  accent: string;
  detail: string;
  writing: string;
}

function paletteOf(c: CakeColors): Palette5 {
  return { top: lighten(c.coat, 0.06), side: c.coat, accent: c.accent, detail: c.detail, writing: c.writing };
}

function mixPalette(a: Palette5, b: Palette5, tTop: number, tSide = tTop, tDecor = tSide): Palette5 {
  return {
    top: mix(a.top, b.top, tTop),
    side: mix(a.side, b.side, tSide),
    accent: mix(a.accent, b.accent, tDecor),
    detail: mix(a.detail, b.detail, tDecor),
    writing: mix(a.writing, b.writing, tDecor),
  };
}

interface Layer {
  frosting: FrostingId;
  col: Palette5;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}, parent?: Element): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG, tag);
  for (const k in attrs) node.setAttribute(k, String(attrs[k]));
  parent?.appendChild(node);
  return node;
}

let uidCounter = 0;

/* Decoration layouts, in unit plan coordinates (radius 1). */
const FLOWERS_TOP = [
  { u: -0.46, v: -0.5, s: 0.95 },
  { u: -0.16, v: -0.66, s: 0.72 },
  { u: -0.72, v: -0.2, s: 0.6 },
];
/** Side flowers: outline index (angle) and height fraction down the side. */
const FLOWERS_SIDE = [
  { a: 0.16, h: 0.3, s: 0.85 },
  { a: 0.19, h: 0.62, s: 0.62 },
  { a: 0.13, h: 0.78, s: 0.5 },
];
const CHOCOLATES = [
  { u: 0.32, v: -0.42, kind: 'sphere' as const },
  { u: 0.55, v: -0.15, kind: 'sphere' as const },
  { u: -0.05, v: -0.58, kind: 'sphere' as const },
  { u: 0.12, v: -0.32, kind: 'shard' as const },
  { u: 0.42, v: -0.5, kind: 'shard' as const },
  { u: -0.28, v: -0.48, kind: 'shard' as const },
];

interface TierEls {
  layers: [CoatEls, CoatEls];
  clip: SVGPathElement;
  sideDecor: SVGGElement;
  shells: SVGPathElement;
  shellHi: SVGPathElement;
  baseShells: SVGPathElement;
  baseShellHi: SVGPathElement;
  pearls: SVGPathElement;
  pearlHi: SVGPathElement;
  pearlLo: SVGPathElement;
  band: SVGPathElement;
  bandDots: SVGPathElement;
}

interface CoatEls {
  g: SVGGElement;
  side: SVGPathElement;
  shade: SVGPathElement;
  shadeGrad: SVGLinearGradientElement;
  stops: SVGStopElement[];
  ao: SVGPathElement;
  texture: SVGPathElement;
  textureDark: SVGPathElement;
  drips: SVGPathElement;
  dripHi: SVGPathElement;
  top: SVGPathElement;
  topHi: SVGPathElement;
  topDetail: SVGGElement;
  topSwirl: SVGPathElement;
  topGloss: SVGEllipseElement;
  rosettes: SVGPathElement;
  rosetteLines: SVGPathElement;
}

interface ItemEls {
  g: SVGGElement;
  parts: SVGElement[];
}

export class CakeRenderer {
  readonly svg: SVGSVGElement;
  private id = `cake${++uidCounter}`;
  private anim: Animator;
  private spec: CakeSpec | null = null;

  /* Animated state */
  private unit: Outline = new Float64Array(unitOutline('round'));
  private size = 1;
  private height = 1;
  private tiers = 1;
  private angle = 0;
  private base: Layer | null = null;
  private incoming: Layer | null = null;
  private wipe = 0;
  private decorCol: Palette5 | null = null;
  private decor = new Map<DecorationId, number>();
  private msgReveal = 1;
  private shimmer = -1;

  /* DOM */
  private defs!: SVGDefsElement;
  private shadow!: SVGEllipseElement;
  private boardSide!: SVGPathElement;
  private boardTop!: SVGPathElement;
  private tierEls: TierEls[] = [];
  private msgGroup!: SVGGElement;
  private msgShadow!: SVGTextElement;
  private msgText!: SVGTextElement;
  private msgClipRect!: SVGRectElement;
  private topDecor!: SVGGElement;
  private airDecor!: SVGGElement;
  private shimmerRect!: SVGRectElement;
  private butterflies: ItemEls[] = [];
  private flowers: ItemEls[] = [];
  private chocolates: ItemEls[] = [];
  private themed: ItemEls[] = [];
  private topper!: ItemEls;
  private topperText!: SVGTextElement;
  private currentMotif: Motif | null = null;

  private fittedMessage = { text: '', lines: [] as string[], size: 0 };
  private fittedTopper = { text: '', size: 0 };
  private measureCtx: CanvasRenderingContext2D | null = null;

  private drag: { x: number; angle: number; id: number } | null = null;

  constructor(host: Element, opts: RendererOptions = {}) {
    this.anim = new Animator(() => this.draw());
    this.angle = opts.angle ?? 0;
    this.svg = el('svg', {
      viewBox: `0 0 ${VIEW} ${VIEW}`,
      class: 'cake-svg',
      role: 'img',
      'aria-label': opts.label ?? 'Cake preview',
    });
    this.build();
    host.appendChild(this.svg);
    if (opts.interactive) this.enableDrag();
    if (typeof document !== 'undefined' && document.fonts) {
      void document.fonts.ready.then(() => {
        this.fittedMessage.text = '\u0000';
        this.fittedTopper.text = '\u0000';
        this.anim.request();
      });
    }
  }

  setLabel(text: string): void {
    this.svg.setAttribute('aria-label', text);
  }

  /** Apply a new configuration. Differences animate unless `instant`. */
  update(spec: CakeSpec, { instant = false }: { instant?: boolean } = {}): void {
    const prev = this.spec;
    this.spec = { ...spec, decorations: [...spec.decorations] };
    const snap = instant || !prev || prefersReducedMotion();
    const target = paletteOf(spec.colors);

    // Shape and size morph together.
    const targetUnit = unitOutline(spec.shape);
    if (snap) {
      this.unit = new Float64Array(targetUnit);
      this.size = spec.size;
      this.height = spec.height;
      this.tiers = spec.tiers;
    } else {
      if (prev.shape !== spec.shape) {
        const from = new Float64Array(this.unit);
        this.anim.run('shape', 780, (t) => lerpOutline(from, targetUnit, t, this.unit), ease.inOutCubic);
      }
      if (prev.size !== spec.size || prev.height !== spec.height) {
        const s0 = this.size,
          h0 = this.height;
        this.anim.run(
          'size',
          620,
          (t) => {
            this.size = s0 + (spec.size - s0) * t;
            this.height = h0 + (spec.height - h0) * t;
          },
          ease.outBack,
        );
      }
      this.tiers = spec.tiers;
    }

    // Frosting: a new frosting arrives over the old one through a clip wipe.
    if (snap || !this.base) {
      this.base = { frosting: spec.frosting, col: target };
      this.incoming = null;
      this.wipe = 0;
      this.anim.cancel('wipe');
      this.anim.cancel('color');
    } else if (prev.frosting !== spec.frosting) {
      if (this.incoming) this.base = this.incoming; // finish the superseded arrival
      this.incoming = { frosting: spec.frosting, col: target };
      this.wipe = 0;
      this.anim.cancel('color');
      const { ms } = ARRIVAL[spec.frosting];
      this.anim.run('wipe', ms, (t) => (this.wipe = t), ease.linear, () => {
        if (this.incoming) this.base = this.incoming;
        this.incoming = null;
        this.wipe = 0;
      });
    } else if (!sameColors(prev.colors, spec.colors)) {
      // Colour flows from the top down and across the decorations.
      const layer = this.incoming ?? this.base;
      const from = { ...layer.col };
      this.anim.run(
        'color',
        900,
        (t) => {
          layer.col = mixPalette(from, target, ease.inOutSine(phase(t, 0, 0.6)), ease.inOutSine(phase(t, 0.2, 1)), ease.inOutSine(phase(t, 0.1, 0.8)));
        },
        ease.linear,
      );
    }

    // Decoration colours follow the palette.
    if (snap || !this.decorCol) {
      this.decorCol = target;
    } else if (!sameColors(prev.colors, spec.colors) || prev.frosting !== spec.frosting) {
      const from = { ...this.decorCol };
      this.anim.run('decorColor', 800, (t) => (this.decorCol = mixPalette(from, target, t)), ease.inOutSine);
    }

    // Decorations: each one has its own appear/disappear progress.
    for (const id of ALL_DECOR) {
      const on = spec.decorations.includes(id);
      const cur = this.decor.get(id) ?? 0;
      if (snap) {
        this.decor.set(id, on ? 1 : 0);
        this.anim.cancel(`decor-${id}`);
      } else if (on && cur < 1 && !(prev.decorations.includes(id) && this.anim.isRunning(`decor-${id}`))) {
        this.anim.run(`decor-${id}`, DECOR_MS[id], (t) => this.decor.set(id, cur + (1 - cur) * t), ease.linear);
      } else if (!on && cur > 0) {
        this.anim.run(`decor-${id}`, 260, (t) => this.decor.set(id, cur * (1 - t)), ease.outCubic);
      }
    }

    // The message is "written" left to right when it changes.
    if (!snap && prev.message !== spec.message && spec.message.trim()) {
      const first = !prev.message.trim();
      if (first) {
        this.anim.run('msg', 900, (t) => (this.msgReveal = t), ease.inOutSine);
      } else {
        this.msgReveal = 1;
      }
    } else if (snap) {
      this.msgReveal = 1;
    }

    this.anim.request();
  }

  /** Rotate the cake. */
  setAngle(angle: number): void {
    this.angle = angle;
    this.anim.request();
  }

  getAngle(): number {
    return this.angle;
  }

  /** A full slow turn with a light sweep: the completion moment. */
  orbit(duration = 2600): Promise<void> {
    return new Promise((resolve) => {
      if (prefersReducedMotion()) return resolve();
      const a0 = this.angle;
      this.anim.run('angle', duration, (t) => (this.angle = a0 + t * Math.PI * 2), ease.inOutSine, () => {
        this.angle = a0;
        resolve();
      });
      this.sparkle();
    });
  }

  /** A soft diagonal light sweep across the cake. */
  sparkle(): void {
    this.anim.run('shimmer', 1400, (t) => (this.shimmer = t), ease.inOutSine, () => (this.shimmer = -1));
  }

  /** Ease back to the default angle. */
  resetAngle(): void {
    const a0 = this.angle;
    const target = Math.round(a0 / (Math.PI * 2)) * Math.PI * 2;
    this.anim.run('angle', 600, (t) => (this.angle = a0 + (target - a0) * t), ease.outCubic);
  }

  destroy(): void {
    this.anim.destroy();
    this.svg.remove();
  }

  /* ------------------------------------------------------------------ */
  /* DOM construction                                                    */
  /* ------------------------------------------------------------------ */

  private build(): void {
    const id = this.id;
    this.defs = el('defs', {}, this.svg);

    const shadowGrad = el('radialGradient', { id: `${id}-shadow` }, this.defs);
    el('stop', { offset: 0, 'stop-color': '#351c16', 'stop-opacity': 0.34 }, shadowGrad);
    el('stop', { offset: 0.6, 'stop-color': '#351c16', 'stop-opacity': 0.12 }, shadowGrad);
    el('stop', { offset: 1, 'stop-color': '#351c16', 'stop-opacity': 0 }, shadowGrad);

    const ao = el('linearGradient', { id: `${id}-ao`, x1: 0, y1: 0, x2: 0, y2: 1 }, this.defs);
    el('stop', { offset: 0, 'stop-color': '#000', 'stop-opacity': 0.04 }, ao);
    el('stop', { offset: 0.18, 'stop-color': '#000', 'stop-opacity': 0 }, ao);
    el('stop', { offset: 0.78, 'stop-color': '#000', 'stop-opacity': 0 }, ao);
    el('stop', { offset: 1, 'stop-color': '#000', 'stop-opacity': 0.2 }, ao);

    const topHi = el('radialGradient', { id: `${id}-tophi`, cx: 0.36, cy: 0.28, r: 0.8 }, this.defs);
    el('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 1 }, topHi);
    el('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }, topHi);

    const shine = el('linearGradient', { id: `${id}-shine`, x1: 0, y1: 0, x2: 1, y2: 0 }, this.defs);
    el('stop', { offset: 0, 'stop-color': '#fff', 'stop-opacity': 0 }, shine);
    el('stop', { offset: 0.5, 'stop-color': '#fff', 'stop-opacity': 0.55 }, shine);
    el('stop', { offset: 1, 'stop-color': '#fff', 'stop-opacity': 0 }, shine);

    const sphere = el('radialGradient', { id: `${id}-sphere`, cx: 0.35, cy: 0.3, r: 0.75 }, this.defs);
    el('stop', { offset: 0, 'stop-color': '#8a5236' }, sphere);
    el('stop', { offset: 0.55, 'stop-color': '#4a2416' }, sphere);
    el('stop', { offset: 1, 'stop-color': '#1f0d07' }, sphere);

    this.shadow = el('ellipse', { fill: `url(#${id}-shadow)` }, this.svg);
    const board = el('g', { class: 'cake-board' }, this.svg);
    this.boardSide = el('path', { fill: '#d8c3a5' }, board);
    this.boardTop = el('path', { fill: '#f6ede0' }, board);

    for (let t = 0; t < 2; t++) {
      const tierG = el('g', { class: 'cake-tier' }, this.svg);
      const clip = el('clipPath', { id: `${id}-clip${t}` }, this.defs);
      const clipPath = el('path', {}, clip);
      const a = this.buildCoat(tierG, `${t}a`);
      const b = this.buildCoat(tierG, `${t}b`);
      b.g.setAttribute('clip-path', `url(#${id}-clip${t})`);
      const sideDecor = el('g', { class: 'cake-side-decor' }, tierG);
      const band = el('path', { fill: 'none', 'stroke-width': 2.4, 'stroke-linecap': 'round', pathLength: 1 }, sideDecor);
      const bandDots = el('path', {}, sideDecor);
      const baseShells = el('path', {}, sideDecor);
      const baseShellHi = el('path', { fill: '#fff', 'fill-opacity': 0.35 }, sideDecor);
      const pearlLo = el('path', { fill: '#000', 'fill-opacity': 0.12 }, sideDecor);
      const pearls = el('path', {}, sideDecor);
      const pearlHi = el('path', { fill: '#fff', 'fill-opacity': 0.85 }, sideDecor);
      const shells = el('path', {}, sideDecor);
      const shellHi = el('path', { fill: '#fff', 'fill-opacity': 0.35 }, sideDecor);
      this.tierEls.push({ layers: [a, b], clip: clipPath, sideDecor, shells, shellHi, baseShells, baseShellHi, pearls, pearlHi, pearlLo, band, bandDots });
    }

    // Message, written on the top face through an affine plan transform.
    this.msgGroup = el('g', { class: 'cake-message', 'aria-hidden': 'true' }, this.svg);
    const msgClip = el('clipPath', { id: `${id}-msgclip` }, this.defs);
    this.msgClipRect = el('rect', { x: -200, y: -80, width: 400, height: 160 }, msgClip);
    const msgInner = el('g', { 'clip-path': `url(#${id}-msgclip)` }, this.msgGroup);
    const textAttrs = { 'text-anchor': 'middle', 'font-family': 'Parisienne, cursive', 'dominant-baseline': 'middle' };
    this.msgShadow = el('text', { ...textAttrs, fill: '#000', 'fill-opacity': 0.14 }, msgInner);
    this.msgText = el('text', textAttrs, msgInner);

    this.topDecor = el('g', { class: 'cake-top-decor' }, this.svg);
    this.airDecor = el('g', { class: 'cake-air-decor' }, this.svg);

    for (let i = 0; i < 3; i++) this.butterflies.push(this.buildButterfly());
    for (let i = 0; i < FLOWERS_TOP.length + FLOWERS_SIDE.length; i++) this.flowers.push(this.buildFlower(i));
    for (const c of CHOCOLATES) this.chocolates.push(this.buildChocolate(c.kind));
    for (let i = 0; i < 2; i++) this.themed.push(this.buildThemed());
    this.topper = this.buildTopper();

    const fx = el('g', { class: 'cake-fx', 'pointer-events': 'none' }, this.svg);
    this.shimmerRect = el('rect', { x: 0, y: 0, width: 160, height: VIEW * 1.4, fill: `url(#${id}-shine)`, opacity: 0 }, fx);
  }

  private buildCoat(parent: SVGGElement, key: string): CoatEls {
    const id = this.id;
    const g = el('g', { class: 'cake-coat' }, parent);
    const shadeGrad = el('linearGradient', { id: `${id}-shade${key}`, gradientUnits: 'userSpaceOnUse', x1: 0, y1: 0, x2: VIEW, y2: 0 }, this.defs);
    const stops: SVGStopElement[] = [];
    for (let i = 0; i < STOPS; i++) stops.push(el('stop', { offset: 0, 'stop-color': '#000', 'stop-opacity': 0 }, shadeGrad));
    const side = el('path', { class: 'coat-side' }, g);
    const shade = el('path', { fill: `url(#${id}-shade${key})`, class: 'coat-shade' }, g);
    const ao = el('path', { fill: `url(#${id}-ao)`, class: 'coat-shade' }, g);
    const textureDark = el('path', { fill: 'none', stroke: '#000', 'stroke-opacity': 0.07, 'stroke-width': 1.6, class: 'coat-texture' }, g);
    const texture = el('path', { fill: 'none', stroke: '#fff', 'stroke-opacity': 0.26, 'stroke-width': 1.3, class: 'coat-texture' }, g);
    const drips = el('path', { class: 'coat-drips' }, g);
    const dripHi = el('path', { fill: 'none', stroke: '#fff', 'stroke-opacity': 0.12, 'stroke-width': 1.2, 'stroke-linecap': 'round', class: 'coat-texture' }, g);
    const top = el('path', { class: 'coat-top' }, g);
    const topHi = el('path', { fill: `url(#${id}-tophi)`, class: 'coat-shade' }, g);
    const topDetail = el('g', {}, g);
    const topSwirl = el('path', { fill: 'none', stroke: '#fff', 'stroke-opacity': 0.22, 'stroke-width': 2.2, 'stroke-linecap': 'round', class: 'coat-texture' }, topDetail);
    const topGloss = el('ellipse', { fill: `url(#${id}-tophi)`, 'fill-opacity': 0.5, class: 'coat-texture' }, topDetail);
    const rosettes = el('path', { class: 'coat-rosettes' }, g);
    const rosetteLines = el('path', { fill: 'none', stroke: '#000', 'stroke-opacity': 0.12, 'stroke-width': 1.1, 'stroke-linecap': 'round' }, g);
    return { g, side, shade, shadeGrad, stops, ao, texture, textureDark, drips, dripHi, top, topHi, topDetail, topSwirl, topGloss, rosettes, rosetteLines };
  }

  private buildButterfly(): ItemEls {
    const g = el('g', { class: 'deco-butterfly' }, this.airDecor);
    const right = el('g', {}, g);
    const left = el('g', { transform: 'scale(-1 1)' }, g);
    const wingParts: SVGElement[] = [];
    for (const side of [right, left]) {
      const flap = el('g', {}, side);
      const upper = el('path', { d: 'M0 0C5-15 23-18 21-5C20 2 9 3 0 0Z' }, flap);
      const lower = el('path', { d: 'M0 0C10 1 17 10 10 15C5 18 1 9 0 0Z' }, flap);
      const inner = el('path', { d: 'M2-1C6-10 16-12 15-5C14-1 8 0 2-1Z', 'fill-opacity': 0.7 }, flap);
      const dot = el('circle', { cx: 15, cy: -8, r: 1.6, 'fill-opacity': 0.8 }, flap);
      wingParts.push(flap, upper, lower, inner, dot);
    }
    const body = el('ellipse', { cx: 0, cy: 2, rx: 1.6, ry: 8 }, g);
    const antenna = el('path', { d: 'M0-5C-2-11-4-13-6-14M0-5C2-11 4-13 6-14', fill: 'none', 'stroke-width': 0.8 }, g);
    return { g, parts: [...wingParts, body, antenna] };
  }

  private buildFlower(i: number): ItemEls {
    const parent = i < FLOWERS_TOP.length ? this.topDecor : this.tierEls[0]!.sideDecor;
    const g = el('g', { class: 'deco-flower' }, parent);
    const leaves = el('path', { d: 'M-4 4C-16 6-22 14-24 18C-14 18-8 12-4 4ZM5 5C14 10 18 18 18 22C10 19 6 13 5 5Z', fill: '#9fb08b' }, g);
    const petalsOuter = el('g', {}, g);
    const outer: SVGElement[] = [];
    for (let k = 0; k < 6; k++) {
      outer.push(el('ellipse', { cx: 0, cy: -8, rx: 6.4, ry: 9, transform: `rotate(${k * 60})` }, petalsOuter));
    }
    const petalsInner = el('g', {}, g);
    const inner: SVGElement[] = [];
    for (let k = 0; k < 5; k++) {
      inner.push(el('ellipse', { cx: 0, cy: -4.6, rx: 3.8, ry: 5.6, transform: `rotate(${k * 72 + 36})` }, petalsInner));
    }
    const center = el('circle', { r: 3.4 }, g);
    return { g, parts: [leaves, petalsOuter, petalsInner, center, ...outer, ...inner] };
  }

  private buildChocolate(kind: 'sphere' | 'shard'): ItemEls {
    const g = el('g', { class: 'deco-chocolate' }, this.topDecor);
    if (kind === 'sphere') {
      const ball = el('circle', { cx: 0, cy: -9, r: 9, fill: `url(#${this.id}-sphere)` }, g);
      const dust = el('path', { d: 'M-3-14h1.2v1.2h-1.2ZM2-12h1v1h-1ZM-1-6h1v1h-1ZM4-8h0.9v0.9h-0.9Z', 'fill-opacity': 0.9 }, g);
      const hi = el('ellipse', { cx: -3, cy: -13, rx: 3, ry: 1.8, fill: '#fff', 'fill-opacity': 0.35 }, g);
      return { g, parts: [ball, dust, hi] };
    }
    const shard = el('path', { d: 'M-7 0L9 0L3-38Z', fill: '#2c140b' }, g);
    const edge = el('path', { d: 'M3-38L9 0L5 0Z', fill: '#6b3a29' }, g);
    return { g, parts: [shard, edge] };
  }

  private buildThemed(): ItemEls {
    const g = el('g', { class: 'deco-themed' }, this.topDecor);
    const stick = el('path', { d: 'M0 0V-46', 'stroke-width': 1.6, stroke: '#c9a46a' }, g);
    const motif = el('path', { transform: 'translate(0 -56)' }, g);
    return { g, parts: [stick, motif] };
  }

  private buildTopper(): ItemEls {
    const g = el('g', { class: 'deco-topper' }, this.topDecor);
    const sticks = el('path', { 'stroke-width': 2, 'stroke-linecap': 'round', fill: 'none' }, g);
    this.topperText = el('text', { 'text-anchor': 'middle', 'font-family': 'Parisienne, cursive', 'dominant-baseline': 'alphabetic', 'stroke-width': 0.6, 'paint-order': 'stroke' }, g);
    return { g, parts: [sticks, this.topperText] };
  }

  /* ------------------------------------------------------------------ */
  /* Drawing                                                             */
  /* ------------------------------------------------------------------ */

  private draw(): void {
    const spec = this.spec;
    if (!spec || !this.base || !this.decorCol) return;
    const R = BASE_R * this.size;
    const H = BASE_H * this.height;
    const cx = VIEW / 2;
    const two = this.tiers === 2;

    const tiers: Projected[] = [];
    const tierDims: { r: number; h: number; topY: number }[] = [];
    let bottom = BOTTOM_Y;
    const count = two ? 2 : 1;
    for (let t = 0; t < count; t++) {
      const r = t === 0 ? R : R * 0.66;
      const h = t === 0 ? H : H * 0.84;
      const topY = bottom - h;
      tierDims.push({ r, h, topY });
      tiers.push(project(this.unit, { cx, topY, radius: r, height: h, tilt: TILT, angle: this.angle }));
      bottom = topY + r * 0.02;
    }

    // Board and shadow.
    const boardR = R * 1.15;
    const board = project(this.unit, { cx, topY: BOTTOM_Y, radius: boardR, height: 7, tilt: TILT, angle: this.angle });
    this.boardTop.setAttribute('d', polygonPath(board.top));
    this.boardSide.setAttribute('d', sidePath(board));
    this.shadow.setAttribute('cx', fmt(cx + 10));
    this.shadow.setAttribute('cy', fmt(BOTTOM_Y + 10));
    this.shadow.setAttribute('rx', fmt(boardR * 1.32));
    this.shadow.setAttribute('ry', fmt(boardR * 1.32 * TILT * 0.95));

    for (let t = 0; t < 2; t++) {
      const els = this.tierEls[t]!;
      const visible = t < count;
      els.layers[0].g.parentElement!.setAttribute('display', visible ? 'inline' : 'none');
      if (!visible) continue;
      const pr = tiers[t]!;
      this.drawCoat(els.layers[0], pr, this.base);
      if (this.incoming) {
        els.layers[1].g.setAttribute('display', 'inline');
        this.drawCoat(els.layers[1], pr, this.incoming);
        els.clip.setAttribute('d', this.wipePath(pr, this.incoming.frosting, this.wipe));
      } else {
        els.layers[1].g.setAttribute('display', 'none');
      }
      this.drawSideDecor(els, pr, t === 0, t === count - 1);
    }

    // Side flowers live on the top tier so the upper tier never hides them.
    const sideHost = this.tierEls[count - 1]!.sideDecor;
    for (let i = FLOWERS_TOP.length; i < this.flowers.length; i++) {
      const g = this.flowers[i]!.g;
      if (g.parentNode !== sideHost) sideHost.appendChild(g);
    }

    const topTier = tiers[count - 1]!;
    const topDims = tierDims[count - 1]!;
    this.drawMessage(spec.message, topDims.r, topDims.topY);
    this.drawTopDecor(topTier, topDims.r, topDims.topY, topDims.h);
    this.drawShimmer(tiers[0]!, topTier);
  }

  private drawCoat(c: CoatEls, pr: Projected, layer: Layer): void {
    const finish = FINISH[layer.frosting];
    const look = LOOK[finish];
    const col = layer.col;
    const side = sidePath(pr);
    c.side.setAttribute('d', side);
    c.side.setAttribute('fill', col.side);
    c.shade.setAttribute('d', side);
    c.ao.setAttribute('d', side);
    this.shadeStops(c, pr, look);

    const topD = polygonPath(pr.top);
    c.top.setAttribute('d', topD);
    c.top.setAttribute('fill', col.top);
    c.topHi.setAttribute('d', topD);
    c.topHi.setAttribute('fill-opacity', String(look.top));

    const { front, top, height } = pr;
    const fx: number[] = [];
    const fy: number[] = [];
    for (const i of front) {
      fx.push(top[i * 2]!);
      fy.push(top[i * 2 + 1]!);
    }

    // Side texture.
    let tex = '';
    let texDark = '';
    if (finish === 'textured') {
      // Spatula striations following the curve of the side.
      for (const level of [0.16, 0.32, 0.5, 0.66, 0.82]) {
        const ys = fy.map((y, k) => y + height * level + (hash(k + level * 50, 3) - 0.5) * 1.6);
        tex += smoothPath(fx, ys);
        texDark += smoothPath(fx, ys.map((y) => y + 2));
      }
    } else if (finish === 'smooth' || finish === 'smooth-rosettes') {
      // Rounded fondant edge catching the light.
      tex = smoothPath(fx, fy.map((y) => y + 2.2));
      texDark = smoothPath(fx, fy.map((y) => y + height - 1.5));
    } else if (finish === 'matte') {
      // Soft cream rim with a gentle wave.
      tex = smoothPath(fx, fy.map((y, k) => y + 1.5 + Math.sin(k * 1.3) * 1.2));
    }
    c.texture.setAttribute('d', tex);
    c.texture.setAttribute('stroke-width', finish === 'matte' ? '3' : finish === 'textured' ? '1.3' : '2');
    c.texture.setAttribute('stroke-opacity', finish === 'matte' ? '0.45' : finish === 'textured' ? '0.24' : '0.42');
    c.textureDark.setAttribute('d', texDark);

    // Fudge drips: glossy runs from the rim, anchored to plan positions.
    if (finish === 'glossy') {
      const lens = front.map((i) => dripLength(i) * height);
      const dy = fy.map((y, k) => y + lens[k]!);
      const d = smoothPath(fx, dy) + 'L' + fmt(fx[fx.length - 1]!) + ' ' + fmt(fy[fy.length - 1]! - 1) + smoothPath([...fx].reverse(), [...fy].reverse().map((y) => y - 1), false) + 'Z';
      c.drips.setAttribute('d', d);
      c.drips.setAttribute('fill', darken(col.side, 0.12));
      // A thin glossy edge along the drip line.
      c.dripHi.setAttribute('d', smoothPath(fx, dy.map((y) => y - 2.5)));
    } else {
      c.drips.setAttribute('d', '');
      c.dripHi.setAttribute('d', '');
    }

    // Top surface details in plan space (they rotate with the cake).
    const cxTop = pr.ox;
    const cyTop = pr.oy;
    const radius = (pr.maxX - pr.minX) / 2;
    c.topDetail.setAttribute('transform', `translate(${fmt(cxTop)} ${fmt(cyTop)}) scale(1 ${TILT}) rotate(${fmt((this.angle * 180) / Math.PI)})`);
    if (finish === 'textured') {
      let sw = '';
      for (const k of [0.22, 0.42, 0.62]) {
        const rr = radius * k;
        sw += `M${fmt(-rr)} 0A${fmt(rr)} ${fmt(rr)} 0 1 1 ${fmt(rr * 0.2)} ${fmt(rr * 0.98)}`;
      }
      c.topSwirl.setAttribute('d', sw);
      c.topGloss.setAttribute('rx', '0');
    } else if (finish === 'glossy') {
      c.topSwirl.setAttribute('d', '');
      c.topGloss.setAttribute('cx', fmt(-radius * 0.28));
      c.topGloss.setAttribute('cy', fmt(-radius * 0.22));
      c.topGloss.setAttribute('rx', fmt(radius * 0.42));
      c.topGloss.setAttribute('ry', fmt(radius * 0.13));
      c.topGloss.setAttribute('transform', 'rotate(-18)');
    } else {
      c.topSwirl.setAttribute('d', '');
      c.topGloss.setAttribute('rx', '0');
    }

    // Buttercream rosettes piped along the rim of a fondant cake.
    if (finish === 'smooth-rosettes') {
      const rc = mix(col.side, col.accent, 0.5);
      let body = '';
      let lines = '';
      const rr = Math.max(5, radius * 0.07);
      for (const i of rimOrder(pr)) {
        if (i % 6) continue;
        const x = pr.top[i * 2]!;
        const y = pr.top[i * 2 + 1]! - rr * 0.35;
        body += spiral(x, y, rr);
        lines += spiral(x + 0.6, y + 0.9, rr * 0.92);
      }
      c.rosettes.setAttribute('d', body);
      c.rosettes.setAttribute('fill', 'none');
      c.rosettes.setAttribute('stroke', rc);
      c.rosettes.setAttribute('stroke-width', fmt(rr * 0.62));
      c.rosettes.setAttribute('stroke-linecap', 'round');
      c.rosetteLines.setAttribute('d', lines);
      c.rosetteLines.setAttribute('stroke-width', fmt(rr * 0.18));
    } else {
      c.rosettes.setAttribute('d', '');
      c.rosetteLines.setAttribute('d', '');
    }
  }

  /** Light the side from the front-left using each edge's normal. */
  private shadeStops(c: CoatEls, pr: Projected, look: (typeof LOOK)[Finish]): void {
    const { front, top, nx, ny, minX, maxX } = pr;
    const span = Math.max(1, maxX - minX);
    c.shadeGrad.setAttribute('x1', fmt(minX));
    c.shadeGrad.setAttribute('x2', fmt(maxX));
    const n = Math.min(front.length, STOPS);
    const stride = front.length / n;
    let last = { o: 0, color: '#000', a: 0 };
    for (let s = 0; s < STOPS; s++) {
      const stop = c.stops[s]!;
      if (s >= n) {
        stop.setAttribute('offset', '1');
        stop.setAttribute('stop-color', last.color);
        stop.setAttribute('stop-opacity', fmt3(last.a));
        continue;
      }
      const k = Math.min(front.length - 1, Math.round(s * stride));
      const i = front[k]!;
      const p = (i - 1 + N) % N;
      // Average the two edges meeting at this point.
      let ex = nx[i]! + nx[p]!;
      let ey = ny[i]! + ny[p]!;
      const len = Math.hypot(ex, ey) || 1;
      ex /= len;
      ey /= len;
      const lambert = ex * LIGHT_X + ey * LIGHT_Y;
      const spec = Math.pow(Math.max(0, lambert), look.sharp) * look.spec;
      const facing = Math.max(0, ey);
      const rim = Math.pow(1 - facing, 2.2) * look.rim + Math.max(0, -lambert) * 0.12;
      const o = clamp01((top[i * 2]! - minX) / span);
      const white = spec;
      const black = rim;
      const color = white > black ? '#fff' : '#000';
      const a = white > black ? white - black * 0.5 : black - white * 0.5;
      stop.setAttribute('offset', fmt3(o));
      stop.setAttribute('stop-color', color);
      stop.setAttribute('stop-opacity', fmt3(a));
      last = { o, color, a };
    }
  }

  /** Clip outline for a frosting arriving over the previous one. */
  private wipePath(pr: Projected, frosting: FrostingId, t: number): string {
    const { kind } = ARRIVAL[frosting];
    const { front, top, height, minX, maxX, minY } = pr;
    const pad = 30;
    if (kind === 'sweep') {
      // A turntable scraper pass from left to right.
      const x = minX - pad + (maxX - minX + pad * 2) * ease.inOutSine(t);
      const skew = 26;
      return `M${fmt(minX - pad - skew)} ${fmt(minY - 200)}L${fmt(x + skew)} ${fmt(minY - 200)}L${fmt(x - skew)} ${fmt(pr.maxY + pad)}L${fmt(minX - pad - skew)} ${fmt(pr.maxY + pad)}Z`;
    }
    // Top surface first: grows out from the middle.
    const topPhase = kind === 'drape' ? ease.outCubic(phase(t, 0, 0.3)) : ease.outCubic(phase(t, 0, 0.38));
    const sideT = kind === 'pour' ? ease.inOutSine(phase(t, 0.28, 1)) : ease.inOutSine(phase(t, 0.2, 1));
    const ccx = pr.ox;
    const ccy = pr.oy;
    const sc = kind === 'drape' ? 1.25 - 0.25 * topPhase : topPhase;
    let d = '';
    if (kind === 'drape') {
      // The fondant sheet settles from slightly larger down onto the cake.
      d += scaledPolygon(top, ccx, ccy, sc, topPhase > 0 ? 1 : 0);
    } else {
      d += scaledPolygon(top, ccx, ccy, sc, 1);
    }
    if (sideT <= 0) return d || 'M0 0Z';
    // Side region from the rim down to a moving front.
    const xs: number[] = [];
    const ys: number[] = [];
    front.forEach((i, k) => {
      const x = top[i * 2]!;
      const y = top[i * 2 + 1]!;
      let reach = sideT * (height + 12);
      if (kind === 'pour') reach = sideT * (height + 12) * (0.75 + dripLength(i) * 1.4);
      if (kind === 'soft') reach += Math.sin(k * 1.4) * 4 * (1 - sideT);
      if (kind === 'drape') reach += Math.sin(k * 0.7) * 7 * (1 - sideT);
      xs.push(x);
      ys.push(y - 2 + reach);
    });
    // Rim (left to right), then the moving front back (right to left).
    d += `M${fmt(xs[0]! - 1)} ${fmt(top[front[0]! * 2 + 1]! - 4)}`;
    for (const i of front) d += `L${fmt(top[i * 2]!)} ${fmt(top[i * 2 + 1]! - 4)}`;
    d += `L${fmt(xs[xs.length - 1]! + 1)} ${fmt(top[front[front.length - 1]! * 2 + 1]! - 4)}`;
    d += smoothPath([...xs].reverse().map((x, k, arr) => (k === 0 ? x + 1 : k === arr.length - 1 ? x - 1 : x)), [...ys].reverse(), false) + 'Z';
    return d;
  }

  private drawSideDecor(els: TierEls, pr: Projected, isBottom: boolean, isTop: boolean): void {
    const col = this.decorCol!;
    const { front, top, height } = pr;
    const scale = (pr.maxX - pr.minX) / (BASE_R * 2);

    // Piped shell border: around the top rim, and along the base.
    const border = this.decor.get('piped-border') ?? 0;
    if (border > 0) {
      const order = rimOrder(pr);
      const shells = order.filter((i) => i % 3 === 0);
      let body = '';
      let hi = '';
      const total = shells.length;
      shells.forEach((i, j) => {
        const s = clamp01((border * 1.25 * total - j * 0.9) / 3);
        if (s <= 0) return;
        const a = tangent(top, i);
        const x = top[i * 2]!;
        const y = top[i * 2 + 1]!;
        body += shell(x, y - 1, a, 6.2 * scale * ease.outBack(s));
        hi += shell(x - 1, y - 2.5, a, 3 * scale * ease.outBack(s));
      });
      els.shells.setAttribute('d', body);
      els.shellHi.setAttribute('d', hi);
      els.shells.setAttribute('fill', col.accent);

      let bBody = '';
      let bHi = '';
      if (isBottom) {
        const base = front.filter((_, k) => k % 2 === 0);
        base.forEach((i, j) => {
          const s = clamp01((border * 1.25 * base.length - j * 0.9) / 3);
          if (s <= 0) return;
          const a = tangent(top, i);
          const x = top[i * 2]!;
          const y = top[i * 2 + 1]! + height - 2;
          bBody += shell(x, y, a, 7 * scale * ease.outBack(s));
          bHi += shell(x - 1, y - 1.5, a, 3.4 * scale * ease.outBack(s));
        });
      }
      els.baseShells.setAttribute('d', bBody);
      els.baseShellHi.setAttribute('d', bHi);
      els.baseShells.setAttribute('fill', col.accent);
    } else {
      for (const p of [els.shells, els.shellHi, els.baseShells, els.baseShellHi]) p.setAttribute('d', '');
    }

    // Pearls settle into place along the base, one after another.
    const pearls = this.decor.get('pearls') ?? 0;
    if (pearls > 0) {
      const lift = (this.decor.get('piped-border') ?? 0) > 0.5 && isBottom ? 9 * scale : 0;
      const pts = front.filter((_, k) => k % 2 === 1);
      let body = '';
      let hi = '';
      let lo = '';
      const r = 4.6 * scale;
      pts.forEach((i, j) => {
        const start = (j / pts.length) * 0.55;
        const e = ease.outBack(phase(pearls, start, start + 0.45));
        if (e <= 0) return;
        const x = top[i * 2]!;
        const y = top[i * 2 + 1]! + height - r - lift - (1 - e) * 26;
        body += circlePath(x, y, r);
        hi += circlePath(x - r * 0.35, y - r * 0.38, r * 0.32);
        lo += circlePath(x + r * 0.15, y + r * 0.3, r * 0.75);
      });
      els.pearls.setAttribute('d', body);
      els.pearls.setAttribute('fill', col.detail === '#FFFFFF' || col.detail.toLowerCase() === '#ffffff' ? '#f4efe9' : col.detail);
      els.pearlHi.setAttribute('d', hi);
      els.pearlLo.setAttribute('d', lo);
    } else {
      for (const p of [els.pearls, els.pearlHi, els.pearlLo]) p.setAttribute('d', '');
    }

    // Minimalist: one fine band and a single gold detail.
    const mini = this.decor.get('minimalist') ?? 0;
    if (mini > 0 && isTop) {
      const xs = front.map((i) => top[i * 2]!);
      const ys = front.map((i) => top[i * 2 + 1]! + height * 0.68);
      els.band.setAttribute('d', smoothPath(xs, ys));
      els.band.setAttribute('stroke', col.accent);
      els.band.setAttribute('stroke-dasharray', `${fmt3(ease.inOutSine(mini))} 1`);
      const k = Math.floor(front.length * 0.34);
      const dx = xs[k] ?? 0;
      const dyy = (ys[k] ?? 0) - 8 * scale;
      const dotS = ease.outBack(phase(mini, 0.6, 1));
      els.bandDots.setAttribute('d', dotS > 0 ? circlePath(dx, dyy, 3.2 * dotS) + circlePath(dx + 7, dyy + 4, 2 * dotS) + circlePath(dx - 6, dyy + 5, 1.6 * dotS) : '');
      els.bandDots.setAttribute('fill', '#c9a050');
    } else if (isTop) {
      els.band.setAttribute('d', '');
      els.bandDots.setAttribute('d', '');
    }
  }

  private drawMessage(message: string, radius: number, topY: number): void {
    const text = message.trim();
    if (!text) {
      this.msgGroup.setAttribute('display', 'none');
      return;
    }
    this.msgGroup.setAttribute('display', 'inline');
    const maxW = radius * 1.32;
    const base = Math.max(18, radius * 0.24);
    if (this.fittedMessage.text !== text + '|' + Math.round(radius)) {
      this.fittedMessage = { text: text + '|' + Math.round(radius), ...this.fit(text, maxW, base) };
      for (const node of [this.msgText, this.msgShadow]) {
        node.replaceChildren();
        const lines = this.fittedMessage.lines;
        lines.forEach((ln, k) => {
          const span = el('tspan', { x: 0, dy: k === 0 ? fmt(-((lines.length - 1) * this.fittedMessage.size * 0.55)) : fmt(this.fittedMessage.size * 1.1) });
          span.textContent = ln;
          node.appendChild(span);
        });
      }
    }
    const size = this.fittedMessage.size;
    for (const node of [this.msgText, this.msgShadow]) node.setAttribute('font-size', fmt(size));
    this.msgText.setAttribute('fill', this.decorCol!.writing);
    this.msgShadow.setAttribute('transform', 'translate(0.8 1.6)');
    const g = this.msgGroup;
    g.setAttribute(
      'transform',
      `translate(${fmt(VIEW / 2)} ${fmt(topY)}) scale(1 ${TILT}) rotate(${fmt((this.angle * 180) / Math.PI)}) translate(0 ${fmt(radius * 0.14)})`,
    );
    // Reveal: the writing appears left to right like piping.
    const w = maxW + 40;
    this.msgClipRect.setAttribute('x', fmt(-w / 2));
    this.msgClipRect.setAttribute('width', fmt(w * this.msgReveal));
    this.msgClipRect.setAttribute('y', fmt(-radius));
    this.msgClipRect.setAttribute('height', fmt(radius * 2));
  }

  private drawTopDecor(pr: Projected, radius: number, topY: number, height: number): void {
    const spec = this.spec!;
    const col = this.decorCol!;
    const scale = radius / BASE_R;
    const cx = VIEW / 2;
    const cos = Math.cos(this.angle);
    const sin = Math.sin(this.angle);
    const toScreen = (u: number, v: number) => {
      const x = u * radius * cos - v * radius * sin;
      const y = u * radius * sin + v * radius * cos;
      return { x: cx + x, y: topY + y * TILT, depth: y };
    };
    const sorted: { g: SVGGElement; depth: number }[] = [];

    // Flowers bloom: petals open from the centre.
    const floral = this.decor.get('floral') ?? 0;
    this.flowers.forEach((f, i) => {
      if (floral <= 0) return f.g.setAttribute('display', 'none');
      let x: number, y: number, s: number, depth: number, vis = 1;
      if (i < FLOWERS_TOP.length) {
        const spot = FLOWERS_TOP[i]!;
        const p = toScreen(spot.u, spot.v);
        x = p.x;
        y = p.y;
        depth = p.depth;
        s = spot.s;
      } else {
        const spot = FLOWERS_SIDE[i - FLOWERS_TOP.length]!;
        const tierPr = pr;
        const idx = Math.round(spot.a * N) % N;
        const facing = tierPr.ny[idx]!;
        vis = clamp01(facing * 5);
        x = tierPr.top[idx * 2]!;
        y = tierPr.top[idx * 2 + 1]! + height * spot.h;
        depth = 999;
        s = spot.s;
      }
      const start = i * 0.09;
      const e = phase(floral, start, start + 0.6);
      if (e <= 0 || vis <= 0) return f.g.setAttribute('display', 'none');
      f.g.setAttribute('display', 'inline');
      const bloom = ease.outBack(e);
      f.g.setAttribute('transform', `translate(${fmt(x)} ${fmt(y)}) scale(${fmt3(s * scale * bloom * 1.7)} ${fmt3(s * scale * bloom * 1.7 * 0.86)}) rotate(${fmt((1 - e) * -50)})`);
      f.g.setAttribute('opacity', fmt3(vis * Math.min(1, e * 2)));
      const [leaves, outerG, innerG, center] = f.parts as [SVGElement, SVGElement, SVGElement, SVGElement];
      void leaves;
      outerG.setAttribute('fill', col.accent);
      innerG.setAttribute('fill', mix(col.accent, '#ffffff', 0.35));
      innerG.setAttribute('transform', `scale(${fmt3(0.6 + 0.4 * ease.outCubic(phase(e, 0.3, 1)))})`);
      center.setAttribute('fill', mix(col.detail, '#c58d61', 0.5));
      if (i < FLOWERS_TOP.length) sorted.push({ g: f.g, depth });
    });

    // Chocolate pieces drop into place.
    const choc = this.decor.get('chocolate') ?? 0;
    this.chocolates.forEach((c, i) => {
      if (choc <= 0) return c.g.setAttribute('display', 'none');
      const spot = CHOCOLATES[i]!;
      const p = toScreen(spot.u, spot.v);
      const start = i * 0.08;
      const e = phase(choc, start, start + 0.55);
      if (e <= 0) return c.g.setAttribute('display', 'none');
      c.g.setAttribute('display', 'inline');
      const drop = (1 - ease.outBack(e)) * 50;
      const tilt = spot.kind === 'shard' ? (hash(i, 9) - 0.5) * 30 : 0;
      c.g.setAttribute('transform', `translate(${fmt(p.x)} ${fmt(p.y - drop)}) scale(${fmt3(scale)}) rotate(${fmt(tilt)})`);
      c.g.setAttribute('opacity', fmt3(Math.min(1, e * 3)));
      if (spot.kind === 'sphere') c.parts[1]!.setAttribute('fill', '#d6b06a');
      sorted.push({ g: c.g, depth: p.depth });
    });

    // Themed toppers rise into position behind the message.
    const themed = this.decor.get('themed-topper') ?? 0;
    if (this.currentMotif !== spec.motif) {
      this.currentMotif = spec.motif;
      for (const t of this.themed) t.parts[1]!.setAttribute('d', motifPath(spec.motif));
    }
    this.themed.forEach((t, i) => {
      if (themed <= 0) return t.g.setAttribute('display', 'none');
      const p = toScreen(i === 0 ? -0.4 : 0.42, -0.52);
      const e = phase(themed, i * 0.15, i * 0.15 + 0.7);
      if (e <= 0) return t.g.setAttribute('display', 'none');
      t.g.setAttribute('display', 'inline');
      const rise = (1 - ease.outCubic(e)) * 40;
      const s = scale * (i === 0 ? 1 : 0.85);
      t.g.setAttribute('transform', `translate(${fmt(p.x)} ${fmt(p.y + rise)}) scale(${fmt3(s)})`);
      t.g.setAttribute('opacity', fmt3(Math.min(1, e * 2.5)));
      t.parts[1]!.setAttribute('fill', mix(col.detail, '#c9a050', 0.55));
      sorted.push({ g: t.g, depth: p.depth - 0.01 });
    });

    // Name topper.
    const topper = this.decor.get('name-topper') ?? 0;
    const name = spec.topperName.trim();
    if (topper > 0 && name) {
      const p = toScreen(0, -0.5);
      const e = ease.outCubic(topper);
      const g = this.topper.g;
      g.setAttribute('display', 'inline');
      const maxW = radius * 1.25;
      const key = name + '|' + Math.round(radius);
      if (this.fittedTopper.text !== key) {
        const fitted = this.fit(name, maxW / scale, 40, 1);
        this.fittedTopper = { text: key, size: fitted.size };
        this.topperText.textContent = name;
      }
      const size = this.fittedTopper.size;
      this.topperText.setAttribute('font-size', fmt(size));
      this.topperText.setAttribute('y', fmt(-62));
      const gold = '#b98a3a';
      this.topperText.setAttribute('fill', gold);
      this.topperText.setAttribute('stroke', darken(gold, 0.35));
      const half = Math.min(maxW / scale, this.measure(name, size)) * 0.28;
      const sticks = this.topper.parts[0]!;
      sticks.setAttribute('d', `M${fmt(-half)} -58L${fmt(-half)} 6M${fmt(half)} -58L${fmt(half)} 6`);
      sticks.setAttribute('stroke', '#c9a46a');
      g.setAttribute('transform', `translate(${fmt(p.x)} ${fmt(p.y + (1 - e) * 60)}) scale(${fmt3(scale)})`);
      g.setAttribute('opacity', fmt3(Math.min(1, topper * 2.5)));
      sorted.push({ g, depth: p.depth - 0.02 });
    } else {
      this.topper.g.setAttribute('display', 'none');
    }

    // Keep top items in depth order (back first).
    sorted.sort((a, b) => a.depth - b.depth);
    let prev: Element | null = null;
    for (const item of sorted) {
      if (prev ? prev.nextSibling !== item.g : this.topDecor.firstChild !== item.g) {
        if (prev) prev.after(item.g);
        else this.topDecor.prepend(item.g);
      }
      prev = item.g;
    }

    // Butterflies flutter in and settle.
    const bfly = this.decor.get('butterflies') ?? 0;
    const perches = [
      { ...toScreen(0.62, 0.42), lift: 0, s: 0.9, rest: 0.55 },
      { x: pr.top[Math.round(0.36 * N) * 2]!, y: pr.top[Math.round(0.36 * N) * 2 + 1]! + height * 0.42, depth: 0, lift: 0, s: 0.8, rest: 0.25 },
      { ...toScreen(-0.55, -0.35), lift: 70, s: 0.7, rest: 0.4 },
    ];
    const sideFacing = clamp01(pr.ny[Math.round(0.36 * N)]! * 5);
    this.butterflies.forEach((b, i) => {
      if (bfly <= 0) return b.g.setAttribute('display', 'none');
      const start = i * 0.16;
      const t = phase(bfly, start, start + 0.68);
      if (t <= 0) return b.g.setAttribute('display', 'none');
      const perch = perches[i]!;
      const vis = i === 1 ? sideFacing : 1;
      if (vis <= 0) return b.g.setAttribute('display', 'none');
      b.g.setAttribute('display', 'inline');
      const e = ease.outCubic(t);
      const fromX = 150 - i * 60;
      const fromY = -170 - i * 30;
      const wave = Math.sin(t * Math.PI * 2.2) * 26 * (1 - e);
      const x = perch.x + fromX * (1 - e) + wave;
      const y = perch.y - perch.lift + fromY * (1 - e);
      // Wings beat in flight and slow to rest.
      const flap = Math.abs(Math.sin(t * Math.PI * 9)) * (1 - e);
      const open = perch.rest + (1 - perch.rest) * 0.2;
      const sx = Math.max(0.12, open - flap * 0.75);
      const s = scale * perch.s * 1.75;
      b.g.setAttribute('transform', `translate(${fmt(x)} ${fmt(y)}) scale(${fmt3(s)}) rotate(${fmt(-12 + (1 - e) * 20)})`);
      b.g.setAttribute('opacity', fmt3(vis * Math.min(1, t * 4)));
      const wings = b.parts;
      for (let k = 0; k < 2; k++) {
        const flapG = wings[k * 5]!;
        const upper = wings[k * 5 + 1]!;
        const lower = wings[k * 5 + 2]!;
        const inner = wings[k * 5 + 3]!;
        const dot = wings[k * 5 + 4]!;
        flapG.setAttribute('transform', `scale(${fmt3(sx)} 1)`);
        upper.setAttribute('fill', col.accent);
        lower.setAttribute('fill', mix(col.accent, '#ffffff', 0.18));
        inner.setAttribute('fill', mix(col.accent, '#ffffff', 0.45));
        dot.setAttribute('fill', col.detail);
        upper.setAttribute('stroke', darken(col.accent, 0.3));
        upper.setAttribute('stroke-width', '0.6');
        lower.setAttribute('stroke', darken(col.accent, 0.3));
        lower.setAttribute('stroke-width', '0.6');
      }
      wings[10]!.setAttribute('fill', '#3b2219');
      wings[11]!.setAttribute('stroke', '#3b2219');
    });
  }

  private drawShimmer(bottomTier: Projected, topTier: Projected): void {
    if (this.shimmer < 0) {
      this.shimmerRect.setAttribute('opacity', '0');
      return;
    }
    const minX = Math.min(bottomTier.minX, topTier.minX) - 160;
    const maxX = Math.max(bottomTier.maxX, topTier.maxX) + 40;
    const x = minX + (maxX - minX) * this.shimmer;
    this.shimmerRect.setAttribute('x', fmt(x));
    this.shimmerRect.setAttribute('y', fmt(topTier.minY - 140));
    this.shimmerRect.setAttribute('transform', `rotate(18 ${fmt(x + 80)} ${fmt(VIEW / 2)})`);
    this.shimmerRect.setAttribute('opacity', fmt3(Math.sin(this.shimmer * Math.PI) * 0.55));
  }

  /* ------------------------------------------------------------------ */
  /* Text fitting (the customer's exact words, never altered)            */
  /* ------------------------------------------------------------------ */

  private measure(text: string, size: number): number {
    if (!this.measureCtx) {
      const canvas = document.createElement('canvas');
      this.measureCtx = canvas.getContext('2d');
    }
    const ctx = this.measureCtx;
    if (!ctx) return text.length * size * 0.45;
    ctx.font = `${size}px Parisienne, cursive`;
    return ctx.measureText(text).width;
  }

  private fit(text: string, maxW: number, base: number, maxLines = 2): { lines: string[]; size: number } {
    const one = this.measure(text, base);
    const sizeOne = Math.min(base, (maxW / Math.max(one, 1)) * base);
    if (sizeOne >= base * 0.62 || maxLines === 1 || !text.includes(' ')) {
      return { lines: [text], size: Math.max(9, sizeOne) };
    }
    // Break at the space closest to the middle; words are never changed.
    let best = -1;
    for (let i = 0; i < text.length; i++) {
      if (text[i] === ' ' && (best === -1 || Math.abs(i - text.length / 2) < Math.abs(best - text.length / 2))) best = i;
    }
    const lines = [text.slice(0, best), text.slice(best + 1)];
    const widest = Math.max(...lines.map((l) => this.measure(l, base)));
    const sizeTwo = Math.min(base * 0.86, (maxW / Math.max(widest, 1)) * base);
    return sizeTwo > sizeOne ? { lines, size: Math.max(9, sizeTwo) } : { lines: [text], size: Math.max(9, sizeOne) };
  }

  /* ------------------------------------------------------------------ */
  /* Drag to rotate                                                      */
  /* ------------------------------------------------------------------ */

  private enableDrag(): void {
    const svg = this.svg;
    svg.style.touchAction = 'pan-y';
    svg.style.cursor = 'grab';
    svg.addEventListener('pointerdown', (e) => {
      this.anim.cancel('angle');
      this.drag = { x: e.clientX, angle: this.angle, id: e.pointerId };
      svg.setPointerCapture(e.pointerId);
      svg.style.cursor = 'grabbing';
    });
    svg.addEventListener('pointermove', (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const w = svg.getBoundingClientRect().width || 1;
      this.setAngle(this.drag.angle + ((e.clientX - this.drag.x) / w) * Math.PI * 1.6);
    });
    const end = (e: PointerEvent) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      this.drag = null;
      svg.style.cursor = 'grab';
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
  }
}

/* -------------------------------------------------------------------- */
/* Helpers                                                               */
/* -------------------------------------------------------------------- */

const ALL_DECOR: DecorationId[] = ['butterflies', 'floral', 'piped-border', 'pearls', 'name-topper', 'chocolate', 'minimalist', 'themed-topper'];

const DECOR_MS: Record<DecorationId, number> = {
  butterflies: 2100,
  floral: 1300,
  'piped-border': 1500,
  pearls: 1300,
  'name-topper': 800,
  chocolate: 1100,
  minimalist: 1000,
  'themed-topper': 900,
};

function sameColors(a: CakeColors, b: CakeColors): boolean {
  return a.coat === b.coat && a.accent === b.accent && a.detail === b.detail && a.writing === b.writing;
}

const fmt3 = (n: number) => (Math.round(n * 1000) / 1000).toString();

/** Drip length for outline index i, as a fraction of the side height. */
function dripLength(i: number): number {
  const h = hash(Math.floor(i / 2), 7);
  const long = h > 0.72 ? 0.22 + (h - 0.72) * 1.3 : 0;
  return 0.07 + hash(i, 5) * 0.04 + long;
}

/** Rim indices ordered back-to-front so nearer pieces overlap farther ones. */
function rimOrder(pr: Projected): number[] {
  const idx = Array.from({ length: N }, (_, i) => i);
  return idx.sort((a, b) => pr.top[a * 2 + 1]! - pr.top[b * 2 + 1]!);
}

function tangent(top: Float64Array, i: number): number {
  const a = (i - 1 + N) % N;
  const b = (i + 1) % N;
  return Math.atan2(top[b * 2 + 1]! - top[a * 2 + 1]!, top[b * 2]! - top[a * 2]!);
}

/** A piped rosette: a tightening spiral seen at the cake's tilt. */
function spiral(x: number, y: number, r: number): string {
  let d = '';
  const turns = Math.PI * 3.2;
  for (let k = 0; k <= 18; k++) {
    const t = (k / 18) * turns;
    const rr = r * (0.15 + 0.85 * (t / turns));
    d += (k ? 'L' : 'M') + fmt(x + Math.cos(t) * rr) + ' ' + fmt(y + Math.sin(t) * rr * 0.62);
  }
  return d;
}

function circlePath(x: number, y: number, r: number): string {
  return `M${fmt(x - r)} ${fmt(y)}a${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(r * 2)} 0a${fmt(r)} ${fmt(r)} 0 1 0 ${fmt(-r * 2)} 0Z`;
}

/** A piped shell: a teardrop pointing along the rim direction. */
function shell(x: number, y: number, angle: number, s: number): string {
  if (s <= 0.05) return '';
  const pts: [number, number][] = [
    [-1, 0],
    [-0.9, -0.85],
    [0.6, -0.75],
    [1.2, 0],
    [0.6, 0.65],
    [-0.9, 0.8],
  ];
  const c = Math.cos(angle);
  const sn = Math.sin(angle);
  const tp = pts.map(([px, py]) => [x + (px * c - py * 0.8 * sn) * s, y + (px * sn + py * 0.8 * c) * s * 0.75] as [number, number]);
  const [p0, p1, p2, p3, p4, p5] = tp as [[number, number], [number, number], [number, number], [number, number], [number, number], [number, number]];
  return `M${fmt(p0[0])} ${fmt(p0[1])}C${fmt(p1[0])} ${fmt(p1[1])} ${fmt(p2[0])} ${fmt(p2[1])} ${fmt(p3[0])} ${fmt(p3[1])}C${fmt(p4[0])} ${fmt(p4[1])} ${fmt(p5[0])} ${fmt(p5[1])} ${fmt(p0[0])} ${fmt(p0[1])}Z`;
}

function scaledPolygon(top: Float64Array, cx: number, cy: number, s: number, on: number): string {
  if (s <= 0.001 || !on) return '';
  let d = '';
  for (let i = 0; i < N; i++) {
    const x = cx + (top[i * 2]! - cx) * s;
    const y = cy + (top[i * 2 + 1]! - cy) * s;
    d += (i ? 'L' : 'M') + fmt(x) + ' ' + fmt(y);
  }
  return d + 'Z';
}
