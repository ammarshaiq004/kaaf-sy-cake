/** Shared behaviour for every page: header, navigation, reveals, WhatsApp shortcut. */
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import { initCandle } from './components/candle';

export function initSite(): void {
  initHeader();
  initNav();
  initReveal();
  initFab();
  initCandle();
}

function initHeader(): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;
  const update = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  update();
  window.addEventListener('scroll', update, { passive: true });
}

function initNav(): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-nav-toggle]');
  const nav = document.getElementById('primary-nav');
  if (!toggle || !nav) return;
  const setOpen = (open: boolean) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  nav.addEventListener('click', (e) => {
    if ((e.target as Element).closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) {
      setOpen(false);
      toggle.focus();
    }
  });
  window.matchMedia('(min-width: 1061px)').addEventListener('change', (e) => {
    if (e.matches) setOpen(false);
  });
}

/** Elements with [data-reveal] fade up when they enter the viewport. */
export function initReveal(root: ParentNode = document): void {
  const els = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-revealed)'));
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-revealed'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-revealed');
        entry.target.dispatchEvent(new CustomEvent('reveal'));
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
  );
  els.forEach((el) => io.observe(el));
}

/** Keep the WhatsApp shortcut out of the way of the footer and order CTAs. */
function initFab(): void {
  const fab = document.querySelector<HTMLElement>('[data-wa-fab]');
  if (!fab || !('IntersectionObserver' in window)) return;
  const blockers = document.querySelectorAll('.site-footer, [data-hide-fab]');
  const visible = new Set<Element>();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) visible.add(e.target);
      else visible.delete(e.target);
    }
    fab.classList.toggle('is-hidden', visible.size > 0);
  });
  blockers.forEach((b) => io.observe(b));
}
