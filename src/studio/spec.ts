/** Turn a (possibly incomplete) design into what the preview should draw. */
import { OCCASIONS, SIZES } from '../data/bakery';
import type { CakeSpec } from '../cake/renderer';
import { label, resolveColors, themeLabel, type Design } from './design';

/** Before a frosting is chosen the cake shows a plain crumb coat. */
const CRUMB_COAT = { coat: '#F1DFC2', accent: '#E3CBAA', detail: '#C58D61', writing: '#633325' };

export function designToSpec(d: Design): CakeSpec {
  const size = SIZES[d.size ?? '2lb'];
  const colors = d.frosting ? resolveColors(d) : CRUMB_COAT;
  const motif = OCCASIONS.find((o) => o.id === d.occasion)?.atmosphere.motif ?? 'confetti';
  return {
    shape: d.shape === 'square' || d.shape === 'heart' ? d.shape : 'round',
    tiers: 1,
    size: size.scale,
    height: size.height,
    frosting: d.frosting ?? 'cream',
    colors: { coat: colors.coat, accent: colors.accent, detail: colors.detail, writing: colors.writing },
    decorations: d.decorations,
    topperName: d.topperName,
    message: d.message,
    motif,
  };
}

/** Screen-reader description of the preview, kept in sync with the design. */
export function describeDesign(d: Design): string {
  const parts: string[] = [];
  const shape = d.shape ? label.shape(d.shape).toLowerCase() : 'round';
  parts.push(`Concept preview of a ${d.size ? label.size(d.size) + ' ' : ''}${shape} cake`);
  if (d.flavor) parts.push(`${label.flavor(d.flavor)} flavor`);
  if (d.frosting) parts.push(`${label.frosting(d.frosting)} frosting`);
  if (d.palette) parts.push(themeLabel(d));
  if (d.decorations.length) parts.push(`decorated with ${d.decorations.map(label.decoration).join(', ').toLowerCase()}`);
  if (d.message.trim()) parts.push(`with the message "${d.message.trim()}"`);
  return parts.join(', ');
}
