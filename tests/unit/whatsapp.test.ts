import { describe, expect, it } from 'vitest';
import { buildDesignMessage, buildInquiryMessage, waLink } from '../../src/lib/whatsapp';
import { EMPTY_DESIGN, type Design } from '../../src/studio/design';

const design: Design = {
  ...EMPTY_DESIGN,
  occasion: 'birthday',
  shape: 'round',
  size: '2lb',
  flavor: 'chocolate-fudge',
  frosting: 'buttercream',
  palette: 'lavender',
  decorations: ['butterflies', 'name-topper'],
  topperName: 'Ayesha',
  message: 'Happy Birthday Ayesha',
  date: '2026-10-12',
  instructions: 'Eggless please',
};

describe('buildDesignMessage', () => {
  it('lists every selection in the agreed order', () => {
    const msg = buildDesignMessage(design, 0);
    expect(msg).toBe(
      [
        "Hi Kaaf sy Cake! I'd like to order a customized cake.",
        '',
        'Occasion: Birthday',
        'Shape: Round',
        'Size: 2 pounds',
        'Flavor: Chocolate Fudge',
        'Frosting: Buttercream',
        'Theme: Lavender Dreams',
        'Decorations: Butterflies, Name Topper',
        'Topper name: Ayesha',
        'Message on cake: "Happy Birthday Ayesha"',
        'Requested date: Mon, 12 Oct 2026',
        'Pickup / delivery: Self-pickup',
        'Special instructions: Eggless please',
        '',
        'Please let me know the price and whether this date is available.',
      ].join('\n'),
    );
  });

  it('asks the customer to attach reference photos manually', () => {
    expect(buildDesignMessage(design, 1)).toContain("Reference photos: I'll attach 1 reference photo in this chat.");
    expect(buildDesignMessage(design, 3)).toContain('3 reference photos');
  });

  it('describes custom answers and delivery', () => {
    const msg = buildDesignMessage(
      { ...design, occasion: 'other', occasionOther: 'Graduation', shape: 'custom', shapeOther: 'Number 5', fulfilment: 'delivery', deliveryArea: 'DHA Phase 5', message: '' },
      0,
    );
    expect(msg).toContain('Occasion: Other (Graduation)');
    expect(msg).toContain('Shape: Custom (Number 5)');
    expect(msg).toContain('Pickup / delivery: Delivery to DHA Phase 5');
    expect(msg).toContain('Message on cake: None');
  });

  it('notes that fudge keeps its colour and the palette is for accents', () => {
    expect(buildDesignMessage({ ...design, frosting: 'fudge' }, 0)).toContain('Theme: Lavender Dreams accents on chocolate fudge');
  });

  it('never says the order is confirmed', () => {
    expect(buildDesignMessage(design, 0).toLowerCase()).not.toContain('confirmed');
  });
});

describe('waLink', () => {
  it('uses the international number without a plus sign', () => {
    expect(waLink()).toBe('https://wa.me/923107666604');
  });

  it('URL-encodes the whole message, including newlines, quotes, ampersands and emoji', () => {
    const text = 'Line 1\nCake & "Love" 🤎';
    const url = waLink(text);
    expect(url).toBe(`https://wa.me/923107666604?text=${encodeURIComponent(text)}`);
    expect(decodeURIComponent(new URL(url).searchParams.get('text') ?? '')).toBe(text);
    expect(new URL(url).searchParams.get('text')).toBe(text);
  });
});

describe('buildInquiryMessage', () => {
  it('skips empty fields', () => {
    expect(buildInquiryMessage({ name: '', interest: 'Brownies', date: '', message: '' })).toBe('Hi Kaaf sy Cake!\n\nInterested in: Brownies');
  });
});
