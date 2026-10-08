/** Product media: real photos when listed, otherwise a labelled illustration. */
import { CakeRenderer } from '../cake/renderer';
import { PRESETS } from '../cake/presets';
import type { Product } from '../data/products';
import { escapeHtml, whenVisible } from '../lib/dom';
import { treatArt } from './art';

export function mediaHtml(p: Product, index = 0): string {
  const src = p.images[index];
  if (src) {
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async" width="800" height="600" />`;
  }
  const label = '<span class="media-label">Illustration</span>';
  if (p.art.type === 'treat') return treatArt(p.art.kind) + label;
  return `<div class="cake-art" data-cake-art="${p.art.preset}"></div>${label}`;
}

/** Draw any cake illustrations inside root once they scroll into view. */
export function hydrateCakeArt(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-cake-art]:not([data-drawn])').forEach((host) => {
    host.dataset.drawn = '1';
    whenVisible(host, () => {
      const key = host.dataset.cakeArt as keyof typeof PRESETS;
      const r = new CakeRenderer(host, { angle: 0.25, label: 'Illustration of the cake' });
      r.update(PRESETS[key], { instant: true });
    });
  });
}
