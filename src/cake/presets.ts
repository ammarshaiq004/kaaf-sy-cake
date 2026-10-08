/** Ready-made cake looks used on the homepage and in the catalog. */
import { FUDGE_COAT, PALETTES, type PaletteId } from '../data/bakery';
import type { CakeColors, CakeSpec } from './renderer';

export function paletteColors(id: PaletteId, fudge = false): CakeColors {
  const p = PALETTES.find((x) => x.id === id) ?? PALETTES[0]!;
  return { coat: fudge ? FUDGE_COAT : p.frosting, accent: p.accent, detail: p.detail, writing: fudge ? '#F6E3C6' : p.writing };
}

const base: CakeSpec = {
  shape: 'round',
  tiers: 1,
  size: 1,
  height: 1,
  frosting: 'buttercream',
  colors: paletteColors('blush-pink'),
  decorations: [],
  topperName: '',
  message: '',
  motif: 'confetti',
};

export const PRESETS = {
  hero: { ...base, tiers: 2, size: 1.02, decorations: ['floral', 'butterflies', 'pearls', 'piped-border'] },
  customized: { ...base, colors: paletteColors('lavender'), frosting: 'fondant', decorations: ['butterflies', 'pearls'] },
  bento: { ...base, size: 0.66, height: 0.9, frosting: 'cream', colors: paletteColors('pastel-garden'), decorations: ['piped-border'], message: 'Just for you' },
  fudge: { ...base, frosting: 'fudge', colors: paletteColors('chocolate-elegance', true), decorations: ['chocolate'] },
  buttercream: { ...base, colors: paletteColors('blush-pink'), decorations: ['piped-border', 'floral'] },
  fondant: { ...base, shape: 'square', size: 0.92, frosting: 'fondant', colors: paletteColors('gold'), decorations: ['pearls', 'minimalist'] },
  sketch: { ...base, decorations: ['floral', 'piped-border'], message: 'Your idea' },
} satisfies Record<string, CakeSpec>;
