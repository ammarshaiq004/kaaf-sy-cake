/** Line icons for studio option cards (24px grid, currentColor). */
import type { DecorationId, OccasionId, ShapeId } from '../data/bakery';
import { N, unitOutline } from '../cake/geometry';

const wrap = (body: string) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const OCCASION_ICONS: Record<OccasionId, string> = {
  birthday: wrap('<path d="M5 20h14M6 20v-6h12v6M6 16c2 1 4-1 6 0s4 1 6 0M12 14v-3M12 8.5c-1-1-1-2.2 0-3.5 1 1.3 1 2.5 0 3.5Z"/>'),
  anniversary: wrap('<path d="M9.5 19S3 15 3 10a3.5 3.5 0 0 1 6.5-1.8A3.5 3.5 0 0 1 16 10c0 5-6.5 9-6.5 9Z"/><path d="M17 6.5a2.6 2.6 0 0 1 4 2.4c0 2.8-3.4 5-3.4 5"/>'),
  wedding: wrap('<circle cx="9" cy="14" r="5"/><circle cx="15" cy="14" r="5"/><path d="M10 6l2-3 2 3"/>'),
  'baby-shower': wrap('<path d="M7 18a4 4 0 0 1-.5-8A5 5 0 0 1 16 8.5a4.5 4.5 0 0 1 1 9.5Z"/><path d="M10 13h.01M14 13h.01M10.5 15.5c1 .7 2 .7 3 0"/>'),
  kids: wrap('<path d="M12 3c3 0 5 2.4 5 5.2 0 3.5-2.6 6-5 6.3-2.4-.3-5-2.8-5-6.3C7 5.4 9 3 12 3Z"/><path d="M11 14.5 12 16l1-1.5M12 16c0 2-1.5 3-1 5"/>'),
  'just-because': wrap('<path d="M12 21V11"/><path d="M12 11c-3 0-5-2-5-5 3 0 5 2 5 5ZM12 13c3 0 5-2 5-5-3 0-5 2-5 5Z"/><circle cx="12" cy="6" r="1.5"/>'),
  other: wrap('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>'),
};

export const DECORATION_ICONS: Record<DecorationId, string> = {
  butterflies: wrap('<path d="M12 7v11M12 9C10 4 4 4 4.5 8.5 5 12 9 12 12 11ZM12 9c2-5 8-5 7.5-.5C19 12 15 12 12 11ZM12 12c-2 0-6 1-5.5 4s4 2.5 5.5-1M12 12c2 0 6 1 5.5 4s-4 2.5-5.5-1"/>'),
  floral: wrap('<circle cx="12" cy="10" r="2"/><path d="M12 8c-1-3 2-5 2-2.5M14 10c3-1 5 2 2.5 2M12 12c1 3-2 5-2 2.5M10 10c-3 1-5-2-2.5-2M12 12v9M12 18c-2-2-4-1-5 0 1 1 3 2 5 0Z"/>'),
  'piped-border': wrap('<path d="M3 15c1.5-3 3-3 4.5 0s3 3 4.5 0 3-3 4.5 0 3 3 4.5 0"/><path d="M3 19h18"/>'),
  pearls: wrap('<circle cx="5" cy="14" r="2"/><circle cx="10" cy="15.5" r="2"/><circle cx="15" cy="15.5" r="2"/><circle cx="20" cy="14" r="2"/><path d="M4.4 13.4l.3-.3M9.4 14.9l.3-.3"/>'),
  'name-topper': wrap('<path d="M7 20V12M17 20V12"/><path d="M4 9c2-3 4-3 5 0s3 3 5-1 4-2 6 0"/>'),
  chocolate: wrap('<path d="M5 19 9 6l3 13Z"/><circle cx="16" cy="15" r="3.5"/><path d="M15 13.5h.01"/>'),
  minimalist: wrap('<path d="M4 14h16"/><circle cx="16" cy="11" r="1.2"/>'),
  'themed-topper': wrap('<path d="M12 21v-8"/><path d="M12 3l2 4.2 4.5.6-3.3 3.1.8 4.5-4-2.2-4 2.2.8-4.5L5.5 7.8 10 7.2Z"/>'),
};

/** Shape icons drawn from the same geometry the renderer uses. */
export function shapeIcon(id: ShapeId): string {
  if (id === 'custom') {
    return wrap('<path d="M5 12c0-4 3-7 7-6 3 .7 3 3 6 3 2 0 2 3 0 5-2.5 2.5-5 5-9 4s-4-3-4-6Z" stroke-dasharray="2.5 2"/>');
  }
  const o = unitOutline(id);
  let d = '';
  for (let i = 0; i < N; i += 2) d += `${i ? 'L' : 'M'}${(12 + o[i * 2]! * 8.5).toFixed(2)} ${(12 + o[i * 2 + 1]! * 8.5).toFixed(2)}`;
  return wrap(`<path d="${d}Z"/>`);
}
