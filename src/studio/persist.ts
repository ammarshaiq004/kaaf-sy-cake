/** Saved studio progress, so a customer can come back to an unfinished design. */
import { load, remove, save } from '../lib/storage';
import { EMPTY_DESIGN, type Design } from './design';

const KEY = 'kaafsycake.design.v1';

export interface Saved {
  design: Design;
  step: number;
  savedAt: number;
}

export function loadSaved(): Saved | null {
  const s = load<Saved>(KEY);
  if (!s || typeof s !== 'object' || !s.design) return null;
  // Merge onto the empty design so older saves gain any new fields.
  return { ...s, design: { ...EMPTY_DESIGN, ...s.design, decorations: Array.isArray(s.design.decorations) ? s.design.decorations : [] } };
}

export function saveProgress(design: Design, step: number): void {
  save(KEY, { design, step, savedAt: Date.now() } satisfies Saved);
}

export function clearSaved(): void {
  remove(KEY);
}

/** True when there is a design worth resuming (at least one choice made). */
export function hasSavedDesign(): boolean {
  const s = loadSaved();
  return !!s && !!(s.design.occasion || s.design.shape || s.design.flavor);
}
