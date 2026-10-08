import { describe, expect, it } from 'vitest';
import {
  EMPTY_DESIGN,
  decorationAvailability,
  firstIncompleteStep,
  frostingAvailability,
  normalize,
  resolveColors,
  sizesFor,
  stepError,
  type Design,
} from '../../src/studio/design';
import { FUDGE_COAT, SHAPES } from '../../src/data/bakery';
import { designToSpec } from '../../src/studio/spec';

const today = new Date(2026, 9, 8); // 8 Oct 2026

const complete: Design = {
  ...EMPTY_DESIGN,
  occasion: 'anniversary',
  shape: 'heart',
  size: '2lb',
  flavor: 'vanilla',
  frosting: 'fondant',
  palette: 'blush-pink',
  date: '2026-10-10',
};

describe('sizes', () => {
  it('only offers sizes configured for each shape', () => {
    expect(sizesFor('square')).toEqual(['2lb', '3lb', '4lb']);
    expect(sizesFor('heart')).not.toContain('4lb');
    expect(sizesFor(null)).toEqual([]);
    for (const s of SHAPES) expect(s.sizes.length).toBeGreaterThan(0);
  });

  it('clears a size the new shape cannot be baked in, and says why', () => {
    const { design, removed } = normalize({ ...complete, frosting: 'cream', shape: 'round', size: 'bento' } as Design);
    expect(design.size).toBe('bento');
    const switched = normalize({ ...design, shape: 'square' });
    expect(switched.design.size).toBeNull();
    expect(switched.removed[0]).toMatch(/isn't offered for a square cake/);
    expect(removed).toEqual([]);
  });
});

describe('unsupported combinations', () => {
  it('blocks fondant on bento cakes and removes it if the size changes', () => {
    const bento = { ...complete, shape: 'round', size: 'bento' } as Design;
    expect(frostingAvailability('fondant', bento).ok).toBe(false);
    expect(frostingAvailability('cream', bento).ok).toBe(true);
    const { design, removed } = normalize(bento);
    expect(design.frosting).toBeNull();
    expect(removed.join(' ')).toMatch(/Fondant was removed/);
  });

  it('keeps minimalist apart from heavy decorations', () => {
    const withButterflies = { ...complete, decorations: ['butterflies'] } as Design;
    expect(decorationAvailability('minimalist', withButterflies).ok).toBe(false);
    expect(decorationAvailability('piped-border', withButterflies).ok).toBe(true);
    const minimal = { ...complete, decorations: ['minimalist'] } as Design;
    expect(decorationAvailability('floral', minimal).ok).toBe(false);
    expect(decorationAvailability('name-topper', minimal).ok).toBe(true);
    // The earlier choice wins when both are present.
    expect(normalize({ ...complete, decorations: ['minimalist', 'pearls'] }).design.decorations).toEqual(['minimalist']);
  });

  it('drops the topper name when the topper is removed', () => {
    expect(normalize({ ...complete, decorations: [], topperName: 'Ali' }).design.topperName).toBe('');
  });
});

describe('step validation', () => {
  it('requires the core choices in order', () => {
    expect(stepError('occasion', EMPTY_DESIGN, today)).toMatch(/occasion/);
    expect(firstIncompleteStep(EMPTY_DESIGN, today)).toBe(0);
    expect(firstIncompleteStep(complete, today)).toBe(9);
  });

  it('enforces the two-day lead time', () => {
    expect(stepError('review', { ...complete, date: '2026-10-09' }, today)).toMatch(/at least 2 days/);
    expect(stepError('review', { ...complete, date: '2026-10-10' }, today)).toBeNull();
    expect(stepError('review', { ...complete, date: '' }, today)).toMatch(/date/);
  });

  it('asks for the delivery area when delivery is chosen', () => {
    expect(stepError('review', { ...complete, fulfilment: 'delivery' }, today)).toMatch(/delivery area/);
  });

  it('needs a name for a name topper', () => {
    expect(stepError('decorations', { ...complete, decorations: ['name-topper'] }, today)).toMatch(/name/);
  });
});

describe('preview spec', () => {
  it('keeps the fudge coat chocolate whatever the palette', () => {
    expect(resolveColors({ ...complete, frosting: 'fudge', palette: 'lavender' }).coat).toBe(FUDGE_COAT);
  });

  it('derives custom colours from the picked hex', () => {
    const c = resolveColors({ ...complete, palette: 'custom', customColor: '#336699' });
    expect(c.coat).toBe('#336699');
  });

  it('draws custom shapes as round and carries the exact message', () => {
    const spec = designToSpec({ ...complete, shape: 'custom', message: 'Happy 5th, Zoë!' });
    expect(spec.shape).toBe('round');
    expect(spec.message).toBe('Happy 5th, Zoë!');
  });
});
