import {
  BAKERY,
  DECORATIONS,
  FLAVORS,
  FROSTINGS,
  FUDGE_COAT,
  MESSAGE_MAX,
  OCCASIONS,
  PALETTES,
  SHAPES,
  SIZES,
  TOPPER_NAME_MAX,
  type DecorationId,
  type FlavorId,
  type FrostingId,
  type OccasionId,
  type Palette,
  type PaletteId,
  type ShapeId,
  type SizeId,
} from '../data/bakery';
import { darken, isHex, lighten, readableOn } from '../lib/color';
import { earliestDate, formatDate, parseISODate } from '../lib/dates';

export interface Design {
  occasion: OccasionId | null;
  occasionOther: string;
  shape: ShapeId | null;
  shapeOther: string;
  size: SizeId | null;
  flavor: FlavorId | null;
  frosting: FrostingId | null;
  palette: PaletteId | null;
  customColor: string;
  customColorNote: string;
  decorations: DecorationId[];
  topperName: string;
  message: string;
  date: string;
  fulfilment: 'pickup' | 'delivery';
  deliveryArea: string;
  instructions: string;
  customerName: string;
}

export const EMPTY_DESIGN: Design = {
  occasion: null,
  occasionOther: '',
  shape: null,
  shapeOther: '',
  size: null,
  flavor: null,
  frosting: null,
  palette: null,
  customColor: '#d9a7c7',
  customColorNote: '',
  decorations: [],
  topperName: '',
  message: '',
  date: '',
  fulfilment: 'pickup',
  deliveryArea: '',
  instructions: '',
  customerName: '',
};

export type StepId =
  | 'occasion'
  | 'shape'
  | 'flavor'
  | 'frosting'
  | 'color'
  | 'decorations'
  | 'message'
  | 'references'
  | 'review'
  | 'send';

export interface StepDef {
  id: StepId;
  title: string;
  short: string;
  optional?: boolean;
}

export const STEPS: StepDef[] = [
  { id: 'occasion', title: 'Choose your occasion', short: 'Occasion' },
  { id: 'shape', title: 'Choose shape & size', short: 'Shape' },
  { id: 'flavor', title: 'Choose your flavor', short: 'Flavor' },
  { id: 'frosting', title: 'Choose your frosting', short: 'Frosting' },
  { id: 'color', title: 'Choose color & theme', short: 'Color' },
  { id: 'decorations', title: 'Add decorations', short: 'Decor', optional: true },
  { id: 'message', title: 'Personalized message', short: 'Message', optional: true },
  { id: 'references', title: 'Reference photos', short: 'Photos', optional: true },
  { id: 'review', title: 'Review your cake', short: 'Review' },
  { id: 'send', title: 'Order through WhatsApp', short: 'Send' },
];

/** Decorations that a minimalist design leaves out. */
export const HEAVY_DECORATIONS: DecorationId[] = ['butterflies', 'floral', 'pearls', 'chocolate', 'themed-topper'];

export interface Availability {
  ok: boolean;
  reason?: string;
}

const OK: Availability = { ok: true };

export const label = {
  occasion: (id: OccasionId | null) => OCCASIONS.find((o) => o.id === id)?.label ?? '',
  shape: (id: ShapeId | null) => SHAPES.find((s) => s.id === id)?.label ?? '',
  size: (id: SizeId | null) => (id ? SIZES[id].label : ''),
  flavor: (id: FlavorId | null) => FLAVORS.find((f) => f.id === id)?.label ?? '',
  frosting: (id: FrostingId | null) => FROSTINGS.find((f) => f.id === id)?.label ?? '',
  palette: (id: PaletteId | null) => PALETTES.find((p) => p.id === id)?.label ?? '',
  decoration: (id: DecorationId) => DECORATIONS.find((d) => d.id === id)?.label ?? id,
};

export function sizesFor(shape: ShapeId | null): SizeId[] {
  return SHAPES.find((s) => s.id === shape)?.sizes ?? [];
}

export function frostingAvailability(id: FrostingId, d: Design): Availability {
  if (d.size === 'bento' && (id === 'fondant' || id === 'buttercream-fondant')) {
    return { ok: false, reason: 'Bento cakes are finished in cream, buttercream or fudge.' };
  }
  return OK;
}

export function decorationAvailability(id: DecorationId, d: Design): Availability {
  if (d.size === 'bento' && (id === 'name-topper' || id === 'themed-topper')) {
    return { ok: false, reason: 'Toppers are too tall for a bento cake. Add the name as your message instead.' };
  }
  if (id === 'minimalist') {
    const clash = d.decorations.filter((x) => HEAVY_DECORATIONS.includes(x));
    if (clash.length) {
      return { ok: false, reason: `Minimalist keeps it simple. Remove ${clash.map(label.decoration).join(', ')} to choose it.` };
    }
  } else if (HEAVY_DECORATIONS.includes(id) && d.decorations.includes('minimalist')) {
    return { ok: false, reason: 'Not part of a minimalist design. Remove Minimalist to add it.' };
  }
  return OK;
}

/**
 * Repair a design after an upstream change so it never holds a combination
 * the bakery doesn't offer. Returns human-readable notes for anything removed.
 */
export function normalize(input: Design): { design: Design; removed: string[] } {
  const d: Design = { ...input, decorations: [...input.decorations] };
  const removed: string[] = [];

  if (d.size && d.shape && !sizesFor(d.shape).includes(d.size)) {
    removed.push(`${label.size(d.size)} isn't offered for a ${label.shape(d.shape).toLowerCase()} cake, so please pick a size again.`);
    d.size = null;
  }
  if (d.frosting) {
    const a = frostingAvailability(d.frosting, d);
    if (!a.ok) {
      removed.push(`${label.frosting(d.frosting)} was removed. ${a.reason}`);
      d.frosting = null;
    }
  }
  // Check decorations in order, so the earliest choice wins a conflict.
  const kept: DecorationId[] = [];
  for (const id of d.decorations) {
    const a = decorationAvailability(id, { ...d, decorations: kept });
    if (a.ok) kept.push(id);
    else removed.push(`${label.decoration(id)} was removed. ${a.reason}`);
  }
  d.decorations = kept;
  if (!d.decorations.includes('name-topper')) d.topperName = '';
  d.message = d.message.slice(0, MESSAGE_MAX);
  d.topperName = d.topperName.slice(0, TOPPER_NAME_MAX);
  return { design: d, removed };
}

/** Error for a step, or null when the customer may move on. */
export function stepError(step: StepId, d: Design, today = new Date()): string | null {
  switch (step) {
    case 'occasion':
      if (!d.occasion) return 'Choose an occasion to continue.';
      if (d.occasion === 'other' && !d.occasionOther.trim()) return 'Tell us what you are celebrating.';
      return null;
    case 'shape':
      if (!d.shape) return 'Choose a shape to continue.';
      if (d.shape === 'custom' && !d.shapeOther.trim()) return 'Describe the shape you have in mind.';
      if (!d.size) return 'Choose a size to continue.';
      return null;
    case 'flavor':
      return d.flavor ? null : 'Choose a flavor to continue.';
    case 'frosting':
      return d.frosting ? null : 'Choose a frosting to continue.';
    case 'color':
      if (!d.palette) return 'Choose a color theme to continue.';
      if (d.palette === 'custom' && !isHex(d.customColor)) return 'Pick a custom color.';
      return null;
    case 'decorations':
      if (d.decorations.includes('name-topper') && !d.topperName.trim()) return 'Add the name for your topper.';
      return null;
    case 'message':
    case 'references':
      return null;
    case 'review': {
      if (!d.date) return 'Choose the date you need your cake.';
      const picked = parseISODate(d.date);
      const min = earliestDate(today, BAKERY.leadTimeDays);
      if (!picked) return 'Enter a valid date.';
      if (d.date < min) return `We need at least ${BAKERY.leadTimeDays} days to bake your cake. Please choose ${formatDate(min)} or later, or message us about urgent requests.`;
      if (d.fulfilment === 'delivery' && !d.deliveryArea.trim()) return 'Tell us the delivery area so we can confirm charges.';
      return null;
    }
    case 'send':
      return null;
  }
}

export function firstIncompleteStep(d: Design, today = new Date()): number {
  const i = STEPS.findIndex((s) => stepError(s.id, d, today) !== null);
  return i === -1 ? STEPS.length - 1 : i;
}

export interface ResolvedColors extends Palette {
  /** Main coat colour actually applied, after the fudge rule. */
  coat: string;
}

export function resolveColors(d: Design): ResolvedColors {
  const base = PALETTES.find((p) => p.id === (d.palette ?? 'classic-cream')) ?? PALETTES[0]!;
  let palette: Palette = base;
  if (d.palette === 'custom' && isHex(d.customColor)) {
    const c = d.customColor.startsWith('#') ? d.customColor : `#${d.customColor}`;
    palette = {
      ...base,
      frosting: c,
      accent: darken(c, 0.18),
      detail: lighten(c, 0.75),
      writing: readableOn(c, ['#351c16', '#fff5e8']),
    };
  }
  const coat = d.frosting === 'fudge' ? FUDGE_COAT : palette.frosting;
  const writing = d.frosting === 'fudge' ? '#F6E3C6' : palette.writing;
  return { ...palette, writing, coat };
}

/** Plain-language theme name for summaries and the order message. */
export function themeLabel(d: Design): string {
  if (!d.palette) return '';
  if (d.palette === 'custom') {
    const note = d.customColorNote.trim();
    return `Custom color ${d.customColor.toUpperCase()}${note ? ` (${note})` : ''}`;
  }
  const name = label.palette(d.palette);
  return d.frosting === 'fudge' ? `${name} accents on chocolate fudge` : name;
}
