/** Run `cb` once when the element first comes near the viewport. */
export function whenVisible(el: Element, cb: () => void, rootMargin = '200px'): void {
  if (!('IntersectionObserver' in window)) return cb();
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        cb();
      }
    },
    { rootMargin },
  );
  io.observe(el);
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function $(sel: string, root: ParentNode = document): HTMLElement {
  const el = root.querySelector<HTMLElement>(sel);
  if (!el) throw new Error(`Missing element: ${sel}`);
  return el;
}
