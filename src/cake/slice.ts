/**
 * Flavor cross-section: a cake slice showing sponge and filling layers under
 * the chosen frosting. Layers slide in one after another when the flavor
 * changes; crumbs come from a fixed pattern so they stay put between renders.
 */
import type { Flavor } from '../data/bakery';
import { darken, lighten } from '../lib/color';
import { animate, EASE } from '../lib/motion';

const SVG = 'http://www.w3.org/2000/svg';
let uid = 0;

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>, parent?: Element) {
  const n = document.createElementNS(SVG, tag);
  for (const k in attrs) n.setAttribute(k, String(attrs[k]));
  parent?.appendChild(n);
  return n;
}

// Cut face spans x 30..170; layers listed top to bottom with heights.
const X0 = 30;
const X1 = 168;
const TOP = 62;
const LAYERS: { kind: 'frost' | 'sponge' | 'fill'; h: number }[] = [
  { kind: 'frost', h: 9 },
  { kind: 'sponge', h: 24 },
  { kind: 'fill', h: 8 },
  { kind: 'sponge', h: 24 },
  { kind: 'fill', h: 8 },
  { kind: 'sponge', h: 24 },
];

export class SliceView {
  readonly svg: SVGSVGElement;
  private id = `slice${++uid}`;
  private layerEls: { g: SVGGElement; face: SVGPathElement; kind: string }[] = [];
  private crumbs: SVGCircleElement[] = [];
  private speckles: SVGCircleElement[] = [];
  private topFace: SVGPathElement;
  private outer: SVGPathElement;
  private current = '';

  constructor(host: Element, label = 'Cake slice showing the inside') {
    this.svg = el('svg', { viewBox: '0 0 220 190', class: 'slice-svg', role: 'img', 'aria-label': label });
    const defs = el('defs', {}, this.svg);
    const grad = el('linearGradient', { id: `${this.id}-sh`, x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    el('stop', { offset: 0, 'stop-color': '#000', 'stop-opacity': 0 }, grad);
    el('stop', { offset: 1, 'stop-color': '#000', 'stop-opacity': 0.22 }, grad);
    const clip = el('clipPath', { id: `${this.id}-face` }, defs);
    el('rect', { x: X0, y: TOP, width: X1 - X0, height: 120 }, clip);

    el('ellipse', { cx: 104, cy: 172, rx: 92, ry: 12, fill: '#351c16', 'fill-opacity': 0.12 }, this.svg);
    el('ellipse', { cx: 104, cy: 166, rx: 96, ry: 15, fill: '#fffaf3', stroke: '#e6d6c0' }, this.svg);

    const bottom = TOP + LAYERS.reduce((a, l) => a + l.h, 0);
    // Outer crust: the frosted back edge of the wedge.
    this.outer = el('path', { d: `M${X1} ${TOP}L198 ${TOP - 26}L198 ${bottom - 26}L${X1} ${bottom}Z` }, this.svg);
    el('path', { d: `M${X1} ${TOP}L198 ${TOP - 26}L198 ${bottom - 26}L${X1} ${bottom}Z`, fill: `url(#${this.id}-sh)` }, this.svg);
    this.topFace = el('path', { d: `M${X0} ${TOP}L${X1} ${TOP}L198 ${TOP - 26}L74 ${TOP - 26}Z` }, this.svg);

    const face = el('g', { 'clip-path': `url(#${this.id}-face)` }, this.svg);
    let y = TOP;
    LAYERS.forEach((layer, i) => {
      const g = el('g', { class: `slice-layer slice-${layer.kind}` }, face);
      const p = el('path', { d: `M${X0} ${y}H${X1}V${y + layer.h}H${X0}Z` }, g);
      if (layer.kind === 'sponge') {
        for (let k = 0; k < 26; k++) {
          const r = 0.6 + ((k * 37 + i * 11) % 10) / 9;
          const cx = X0 + 4 + ((k * 53 + i * 29) % (X1 - X0 - 8));
          const cy = y + 3 + ((k * 31 + i * 17) % (layer.h - 6));
          this.crumbs.push(el('circle', { cx, cy, r }, g));
        }
        for (let k = 0; k < 6; k++) {
          const cx = X0 + 8 + ((k * 61 + i * 23) % (X1 - X0 - 16));
          const cy = y + 5 + ((k * 13 + i * 7) % (layer.h - 9));
          this.speckles.push(el('circle', { cx, cy, r: 1.6 }, g));
        }
      }
      if (layer.kind === 'fill') {
        // A soft wavy boundary so the filling reads as spread, not ruled.
        p.setAttribute('d', `M${X0} ${y + 1}C${X0 + 40} ${y - 1.5} ${X1 - 50} ${y + 2.5} ${X1} ${y}V${y + layer.h}C${X1 - 40} ${y + layer.h + 1.5} ${X0 + 50} ${y + layer.h - 2} ${X0} ${y + layer.h}Z`);
      }
      this.layerEls.push({ g, face: p, kind: layer.kind });
      y += layer.h;
    });
    host.appendChild(this.svg);
  }

  set(flavor: Flavor, coat: string, { animated = true } = {}): void {
    const sponge = flavor.sponge;
    for (const l of this.layerEls) {
      l.face.setAttribute('fill', l.kind === 'frost' ? coat : l.kind === 'fill' ? flavor.filling : sponge);
    }
    this.topFace.setAttribute('fill', lighten(coat, 0.05));
    this.outer.setAttribute('fill', coat);
    this.crumbs.forEach((c, i) => {
      c.setAttribute('fill', i % 3 ? darken(sponge, 0.16) : lighten(sponge, 0.18));
      c.setAttribute('fill-opacity', '0.7');
    });
    this.speckles.forEach((s) => {
      s.setAttribute('fill', flavor.speckle ?? 'transparent');
    });
    this.svg.setAttribute('aria-label', `Inside a ${flavor.label} cake: ${flavor.description.toLowerCase()}`);
    const key = flavor.id;
    if (animated && key !== this.current) {
      this.layerEls.forEach((l, i) => {
        animate(l.g, [{ transform: 'translateX(-42px)', opacity: 0 }, { transform: 'none', opacity: 1 }], {
          duration: 620,
          delay: 70 * (this.layerEls.length - 1 - i),
          easing: EASE.out,
          id: 'slice',
        });
      });
    }
    this.current = key;
  }

  /** Play the layer reveal again (e.g. on hover). */
  replay(): void {
    this.layerEls.forEach((l, i) => {
      animate(l.g, [{ transform: 'translateX(-42px)', opacity: 0 }, { transform: 'none', opacity: 1 }], {
        duration: 620,
        delay: 70 * (this.layerEls.length - 1 - i),
        easing: EASE.out,
        id: 'slice',
      });
    });
  }
}
