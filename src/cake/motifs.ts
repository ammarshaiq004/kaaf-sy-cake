/** Small occasion motifs for themed toppers and stage atmosphere, ~24px, centred. */
export type Motif = 'confetti' | 'hearts' | 'petals' | 'clouds' | 'stars' | 'leaves' | 'none';

const STAR = 'M0-12L3.5-4L12-3.6L5.4 2L7.4 10.6L0 6L-7.4 10.6L-5.4 2L-12-3.6L-3.5-4Z';
const HEART = 'M0 10C-9 3-12-2-12-6C-12-10-9-12-6-12C-3-12-1-10 0-8C1-10 3-12 6-12C9-12 12-10 12-6C12-2 9 3 0 10Z';
const RINGS =
  'M-5-7A7 7 0 1 0-5 7A7 7 0 1 0-5-7ZM-5-4.6A4.6 4.6 0 1 1-5 4.6A4.6 4.6 0 1 1-5-4.6ZM5-7A7 7 0 1 0 5 7A7 7 0 1 0 5-7ZM5-4.6A4.6 4.6 0 1 1 5 4.6A4.6 4.6 0 1 1 5-4.6Z';
const CLOUD = 'M-11 6C-15 6-15 0-11-1C-11-6-5-8-2-5C0-9 7-9 8-4C12-4 14 1 11 4C11 6 9 6 8 6Z';
const LEAF = 'M0 12C-9 4-9-6 0-12C9-6 9 4 0 12ZM0 10V-9';
const BALLOON = 'M0-12C6-12 9-7 9-3C9 3 4 7 0 8C-4 7-9 3-9-3C-9-7-6-12 0-12ZM-1.5 8L0 11L1.5 8Z';

export function motifPath(m: Motif): string {
  switch (m) {
    case 'hearts':
      return HEART;
    case 'petals':
      return RINGS;
    case 'clouds':
      return CLOUD;
    case 'leaves':
      return LEAF;
    case 'stars':
      return BALLOON;
    case 'confetti':
    case 'none':
    default:
      return STAR;
  }
}
