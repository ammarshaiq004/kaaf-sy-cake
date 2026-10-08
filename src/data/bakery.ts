/**
 * Bakery configuration: the single source of truth for what the studio,
 * catalog and order messages offer. Edit this file to change what customers
 * can choose. Anything marked CONFIRM is a sensible default that the bakery
 * should check; nothing here is a price or a promise.
 */

export const BAKERY = {
  name: 'Kaaf sy Cake',
  tagline: 'Freshly Made, Beautifully Crafted.',
  city: 'Lahore',
  whatsappDisplay: '0310 7666604',
  whatsappIntl: '923107666604',
  phoneIntl: '+923107666604',
  instagram: 'kaafsycake',
  /** Minimum days between today and the requested date. */
  leadTimeDays: 2,
} as const;

export type OccasionId = 'birthday' | 'anniversary' | 'wedding' | 'baby-shower' | 'kids' | 'just-because' | 'other';
export type ShapeId = 'round' | 'square' | 'heart' | 'custom';
export type FlavorId = 'vanilla' | 'chocolate' | 'chocolate-fudge' | 'caramel' | 'lotus-biscoff';
export type FrostingId = 'cream' | 'buttercream' | 'fondant' | 'buttercream-fondant' | 'fudge';
export type PaletteId = 'classic-cream' | 'chocolate-elegance' | 'blush-pink' | 'lavender' | 'pastel-garden' | 'gold' | 'custom';
export type DecorationId =
  | 'butterflies'
  | 'floral'
  | 'piped-border'
  | 'pearls'
  | 'name-topper'
  | 'chocolate'
  | 'minimalist'
  | 'themed-topper';
export type SizeId = 'bento' | '1lb' | '2lb' | '3lb' | '4lb';

export interface Occasion {
  id: OccasionId;
  label: string;
  blurb: string;
  /** Stage atmosphere: two warm light tints and a motif. */
  atmosphere: { light: string; glow: string; motif: 'confetti' | 'hearts' | 'petals' | 'clouds' | 'stars' | 'leaves' | 'none' };
}

export const OCCASIONS: Occasion[] = [
  { id: 'birthday', label: 'Birthday', blurb: 'Candles, wishes and a cake to remember', atmosphere: { light: '#FFF1DC', glow: '#F4C99A', motif: 'confetti' } },
  { id: 'anniversary', label: 'Anniversary', blurb: 'Celebrate the years together', atmosphere: { light: '#FCEDE8', glow: '#E9B8AB', motif: 'hearts' } },
  { id: 'wedding', label: 'Wedding / Engagement', blurb: 'Elegant, timeless and refined', atmosphere: { light: '#FFF8EE', glow: '#EBD8C1', motif: 'petals' } },
  { id: 'baby-shower', label: 'Baby Shower', blurb: 'Soft, sweet and gentle', atmosphere: { light: '#F6F2F8', glow: '#D9CDE8', motif: 'clouds' } },
  { id: 'kids', label: 'Kids Celebration', blurb: 'Playful colours, happy faces', atmosphere: { light: '#FFF4E2', glow: '#F2D29C', motif: 'stars' } },
  { id: 'just-because', label: 'Just Because', blurb: 'No reason needed for cake', atmosphere: { light: '#FBF3E6', glow: '#DCC6A6', motif: 'leaves' } },
  { id: 'other', label: 'Other', blurb: 'Tell us what you are celebrating', atmosphere: { light: '#FFF5E8', glow: '#EBD8C1', motif: 'none' } },
];

export interface SizeOption {
  id: SizeId;
  label: string;
  note: string;
  /** Preview scale: radius and height multipliers. */
  scale: number;
  height: number;
}

/** CONFIRM: sizes the bakery can fulfil for each shape. */
export const SIZES: Record<SizeId, SizeOption> = {
  bento: { id: 'bento', label: 'Bento (mini)', note: 'A small cake for one or two', scale: 0.62, height: 0.86 },
  '1lb': { id: '1lb', label: '1 pound', note: 'Small gatherings', scale: 0.78, height: 0.92 },
  '2lb': { id: '2lb', label: '2 pounds', note: 'Family celebrations', scale: 0.9, height: 1 },
  '3lb': { id: '3lb', label: '3 pounds', note: 'Larger parties', scale: 1, height: 1.04 },
  '4lb': { id: '4lb', label: '4 pounds', note: 'Big celebrations', scale: 1.08, height: 1.08 },
};

export interface Shape {
  id: ShapeId;
  label: string;
  blurb: string;
  sizes: SizeId[];
}

export const SHAPES: Shape[] = [
  { id: 'round', label: 'Round', blurb: 'The timeless classic', sizes: ['bento', '1lb', '2lb', '3lb', '4lb'] },
  { id: 'square', label: 'Square', blurb: 'Clean, modern lines', sizes: ['2lb', '3lb', '4lb'] },
  { id: 'heart', label: 'Heart', blurb: 'Made for love', sizes: ['1lb', '2lb', '3lb'] },
  { id: 'custom', label: 'Other / Custom', blurb: 'Describe it and we will discuss', sizes: ['1lb', '2lb', '3lb', '4lb'] },
];

export interface Flavor {
  id: FlavorId;
  label: string;
  description: string;
  sponge: string;
  filling: string;
  /** Optional speckle colour for crumbs or biscuit pieces in the slice. */
  speckle?: string;
}

/** CONFIRM: flavours currently baked. */
export const FLAVORS: Flavor[] = [
  { id: 'vanilla', label: 'Vanilla', description: 'Soft golden vanilla sponge with vanilla cream', sponge: '#F1D9A7', filling: '#FFF4E0' },
  { id: 'chocolate', label: 'Chocolate', description: 'Moist chocolate sponge with chocolate cream', sponge: '#6E3D27', filling: '#A26B4C' },
  { id: 'chocolate-fudge', label: 'Chocolate Fudge', description: 'Deep chocolate sponge layered with glossy fudge', sponge: '#4C281A', filling: '#2C130B' },
  { id: 'caramel', label: 'Caramel', description: 'Buttery sponge with layers of caramel', sponge: '#E7C48F', filling: '#C58D61' },
  { id: 'lotus-biscoff', label: 'Lotus Biscoff', description: 'Spiced biscuit sponge with Biscoff spread and crumbs', sponge: '#D9A56A', filling: '#B5733C', speckle: '#8E5428' },
];

export interface Frosting {
  id: FrostingId;
  label: string;
  description: string;
  finish: 'matte' | 'textured' | 'smooth' | 'smooth-rosettes' | 'glossy';
}

/** CONFIRM: frostings currently offered. */
export const FROSTINGS: Frosting[] = [
  { id: 'cream', label: 'Cream', description: 'Light whipped cream with a soft finish', finish: 'matte' },
  { id: 'buttercream', label: 'Buttercream', description: 'Silky buttercream with a hand-smoothed texture', finish: 'textured' },
  { id: 'fondant', label: 'Fondant', description: 'A perfectly smooth, sculpted covering', finish: 'smooth' },
  { id: 'buttercream-fondant', label: 'Buttercream + Fondant', description: 'Fondant covering with buttercream details', finish: 'smooth-rosettes' },
  { id: 'fudge', label: 'Chocolate Fudge', description: 'Rich glossy chocolate fudge coating', finish: 'glossy' },
];

export interface Palette {
  id: PaletteId;
  label: string;
  /** frosting = main coat; accent = borders, flowers; detail = pearls, writing highlights. */
  frosting: string;
  accent: string;
  detail: string;
  writing: string;
}

export const PALETTES: Palette[] = [
  { id: 'classic-cream', label: 'Classic Cream', frosting: '#F7ECDC', accent: '#E3CBAA', detail: '#C58D61', writing: '#633325' },
  { id: 'chocolate-elegance', label: 'Chocolate Elegance', frosting: '#6B3A29', accent: '#3E2018', detail: '#D2A56E', writing: '#F3DDB8' },
  { id: 'blush-pink', label: 'Blush Pink', frosting: '#F3D2C8', accent: '#E3A497', detail: '#FFF5E8', writing: '#8E4A3C' },
  { id: 'lavender', label: 'Lavender Dreams', frosting: '#E2D7EE', accent: '#B39DD3', detail: '#FFFFFF', writing: '#5E4785' },
  { id: 'pastel-garden', label: 'Pastel Garden', frosting: '#F5F0DF', accent: '#B9D2AE', detail: '#F1BEB1', writing: '#5B7350' },
  { id: 'gold', label: 'Gold Celebration', frosting: '#FBF4E6', accent: '#D4AD66', detail: '#B98A3A', writing: '#8C6524' },
  { id: 'custom', label: 'Custom Color', frosting: '#F3D2C8', accent: '#E3A497', detail: '#FFF5E8', writing: '#633325' },
];

/** The fudge coat is always chocolate; the palette only colours accents. */
export const FUDGE_COAT = '#4A2418';

export interface Decoration {
  id: DecorationId;
  label: string;
  blurb: string;
}

export const DECORATIONS: Decoration[] = [
  { id: 'butterflies', label: 'Butterflies', blurb: 'Delicate butterflies resting on the cake' },
  { id: 'floral', label: 'Floral', blurb: 'Hand-piped or sugar flowers' },
  { id: 'piped-border', label: 'Piped Borders', blurb: 'Shell borders along the edges' },
  { id: 'pearls', label: 'Pearls', blurb: 'Sugar pearls around the base' },
  { id: 'name-topper', label: 'Name Topper', blurb: 'A topper with a name' },
  { id: 'chocolate', label: 'Chocolate Decorations', blurb: 'Chocolate shards and spheres' },
  { id: 'minimalist', label: 'Minimalist', blurb: 'A clean band and a single detail' },
  { id: 'themed-topper', label: 'Themed Topper', blurb: 'A topper that matches your occasion' },
];

export const MESSAGE_MAX = 40;
export const TOPPER_NAME_MAX = 16;
export const MAX_REFERENCES = 5;
