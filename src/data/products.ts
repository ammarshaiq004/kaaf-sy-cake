/**
 * Catalog. Only descriptive copy lives here: no prices, availability or
 * reviews are invented. Add a `startingPrice` only once the bakery confirms
 * it, and list real photos in `images` (see docs/ASSETS.md); until then the
 * card shows an illustration labelled as such.
 */
import type { PRESETS } from '../cake/presets';
import { FLAVORS } from './bakery';
import type { TreatKind } from '../catalog/art';

export type ProductGroup = 'cakes' | 'treats';

export interface Product {
  id: string;
  name: string;
  group: ProductGroup;
  tags: string[];
  summary: string;
  details: string[];
  art: { type: 'cake'; preset: keyof typeof PRESETS } | { type: 'treat'; kind: TreatKind };
  /** Real product photos, e.g. '/images/products/bento-1.webp'. */
  images: string[];
  /** Query string that pre-fills the cake studio. */
  studio?: string;
  /** Only set once confirmed by the bakery, e.g. 'From Rs 3,500'. */
  startingPrice?: string;
}

const flavorList = FLAVORS.map((f) => f.label).join(', ');

export const TAGS: Record<string, string> = {
  customizable: 'Customizable',
  celebration: 'Celebration',
  chocolate: 'Chocolate',
  mini: 'Mini',
  gifting: 'Gifting',
  'tea-time': 'Tea-time',
  party: 'Party',
};

export const PRODUCTS: Product[] = [
  {
    id: 'customized',
    name: 'Customized Cakes',
    group: 'cakes',
    tags: ['customizable', 'celebration'],
    summary: 'Designed around your occasion, your colours and your story.',
    details: [
      'Choose the shape, size, flavor, frosting and decorations in our Cake Studio',
      `Flavors: ${flavorList}`,
      'Round 1 to 4 pounds, square 2 to 4 pounds, heart 1 to 3 pounds',
      'Every design is confirmed with you on WhatsApp before baking',
    ],
    art: { type: 'cake', preset: 'customized' },
    images: [],
    studio: '',
  },
  {
    id: 'bento',
    name: 'Bento Cakes',
    group: 'cakes',
    tags: ['customizable', 'mini', 'gifting'],
    summary: 'A little cake in a box with your message, made for small celebrations and sweet surprises.',
    details: ['Mini size for one or two', 'Finished in cream, buttercream or fudge', 'A short message written on top', `Flavors: ${flavorList}`],
    art: { type: 'cake', preset: 'bento' },
    images: [],
    studio: 'shape=round&size=bento',
  },
  {
    id: 'chocolate-fudge',
    name: 'Chocolate Fudge Cakes',
    group: 'cakes',
    tags: ['chocolate', 'celebration', 'customizable'],
    summary: 'Glossy chocolate fudge over deep chocolate sponge, for true chocolate lovers.',
    details: ['Chocolate fudge coating with chocolate or chocolate fudge sponge', 'Add chocolate decorations, a message or a topper', 'Available in round, square and heart shapes'],
    art: { type: 'cake', preset: 'fudge' },
    images: [],
    studio: 'frosting=fudge&flavor=chocolate-fudge',
  },
  {
    id: 'buttercream',
    name: 'Buttercream Cakes',
    group: 'cakes',
    tags: ['customizable', 'celebration'],
    summary: 'Silky buttercream finishes, from smooth and simple to piped florals.',
    details: ['Hand-smoothed buttercream in your choice of colour', 'Piped borders, florals, pearls and more', `Flavors: ${flavorList}`],
    art: { type: 'cake', preset: 'buttercream' },
    images: [],
    studio: 'frosting=buttercream',
  },
  {
    id: 'fondant',
    name: 'Fondant Cakes',
    group: 'cakes',
    tags: ['customizable', 'celebration'],
    summary: 'Smooth, sculpted fondant for elegant and themed designs.',
    details: ['Perfectly smooth fondant covering', 'Ideal for themed designs, toppers and fine details', 'Fondant alone or with buttercream details'],
    art: { type: 'cake', preset: 'fondant' },
    images: [],
    studio: 'frosting=fondant',
  },
  {
    id: 'cupcakes',
    name: 'Cupcakes',
    group: 'treats',
    tags: ['gifting', 'party'],
    summary: 'Bite-sized cakes with a swirl of frosting, made for parties and gift boxes.',
    details: ['Frosting colours can match your theme', 'Box quantities confirmed on WhatsApp', `Flavors: ${flavorList}`],
    art: { type: 'treat', kind: 'cupcakes' },
    images: [],
  },
  {
    id: 'brownies',
    name: 'Brownies',
    group: 'treats',
    tags: ['chocolate', 'gifting', 'party'],
    summary: 'Dense, fudgy chocolate squares with a crackly top.',
    details: ['Baked fresh to order', 'Lovely as a gift box or a party platter', 'Box quantities confirmed on WhatsApp'],
    art: { type: 'treat', kind: 'brownies' },
    images: [],
  },
  {
    id: 'naan-khatai',
    name: 'Naan Khatai',
    group: 'treats',
    tags: ['tea-time', 'gifting'],
    summary: 'Classic crumbly, melt-in-the-mouth biscuits for chai time.',
    details: ['A traditional favourite with tea', 'Made in small batches', 'Box quantities confirmed on WhatsApp'],
    art: { type: 'treat', kind: 'naan-khatai' },
    images: [],
  },
  {
    id: 'tea-cakes',
    name: 'Tea Cakes',
    group: 'treats',
    tags: ['tea-time'],
    summary: 'Simple, comforting loaf cakes to slice and share with tea.',
    details: ['Soft crumb with a golden crust', 'Made for evening tea and guests', 'Ask about current flavors on WhatsApp'],
    art: { type: 'treat', kind: 'tea-cake' },
    images: [],
  },
  {
    id: 'mini-loaves',
    name: 'Mini Loaves',
    group: 'treats',
    tags: ['tea-time', 'gifting'],
    summary: 'Little individual loaves, easy to share and lovely to gift.',
    details: ['Individually sized', 'Perfect for gift boxes and get-togethers', 'Ask about current flavors on WhatsApp'],
    art: { type: 'treat', kind: 'mini-loaves' },
    images: [],
  },
];
