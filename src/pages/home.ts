import { initSite } from '../main';
import '../styles/stage.css';
import '../styles/pages/home.css';
import '../styles/pages/catalog.css';
import { CakeRenderer } from '../cake/renderer';
import { PRESETS } from '../cake/presets';
import { SliceView } from '../cake/slice';
import { FLAVORS, PALETTES } from '../data/bakery';
import { PRODUCTS } from '../data/products';
import { hydrateCakeArt, mediaHtml } from '../catalog/media';
import { animate, EASE, prefersReducedMotion } from '../lib/motion';
import { escapeHtml, whenVisible } from '../lib/dom';
import { hasSavedDesign } from '../studio/persist';

initHero();
initJourney();
initFlavors();
initCollections();
initSite();

function initHero(): void {
  const title = document.querySelector<HTMLElement>('[data-split]');
  const stage = document.querySelector<HTMLElement>('[data-hero-stage]');
  const host = document.querySelector<HTMLElement>('[data-hero-cake]');
  const resume = document.querySelector<HTMLElement>('[data-resume]');
  if (resume && hasSavedDesign()) resume.hidden = false;

  // Split the headline into masked words, keeping the <em> styling.
  const words: HTMLElement[] = [];
  if (title) {
    const label = title.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    title.setAttribute('aria-label', label);
    const wrap = (node: Node) => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          for (const part of (child.textContent ?? '').split(/(\s+)/)) {
            if (!part) continue;
            if (/^\s+$/.test(part)) {
              frag.append(' ');
              continue;
            }
            const outer = document.createElement('span');
            outer.className = 'split-word';
            outer.setAttribute('aria-hidden', 'true');
            const inner = document.createElement('span');
            inner.textContent = part;
            outer.append(inner);
            words.push(inner);
            frag.append(outer);
          }
          child.replaceWith(frag);
        } else {
          wrap(child);
        }
      }
    };
    wrap(title);
  }

  let cake: CakeRenderer | null = null;
  if (host) {
    cake = new CakeRenderer(host, { angle: 0.2, label: 'An illustrated two-tier blush buttercream cake with flowers, butterflies and pearls' });
    cake.update(PRESETS.hero, { instant: true });
  }

  if (!prefersReducedMotion()) {
    words.forEach((w, i) => {
      animate(w, [{ transform: 'translateY(110%)' }, { transform: 'none' }], { duration: 1000, delay: 120 + i * 70, easing: EASE.out });
    });
    document.querySelectorAll<HTMLElement>('[data-hero-seq]').forEach((el, i) => {
      animate(el, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: 520 + i * 110, easing: EASE.out });
    });
    if (stage) {
      // The cake is revealed through a rising arched mask.
      animate(stage, [{ clipPath: 'inset(100% 0 0 0 round 999px 999px 40px 40px)' }, { clipPath: 'inset(0 0 0 0 round 999px 999px 40px 40px)' }], {
        duration: 1300,
        delay: 250,
        easing: EASE.inOut,
      });
    }
    if (host) {
      animate(host, [{ transform: 'translateY(8%) scale(0.94)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 1400, delay: 650, easing: EASE.out });
      window.setTimeout(() => cake?.sparkle(), 1700);
    }
    const sprig = document.querySelector<SVGSVGElement>('[data-sprig]');
    sprig?.querySelectorAll('path').forEach((p, i) => {
      const len = p.getTotalLength();
      p.style.strokeDasharray = `${len}`;
      animate(p, [{ strokeDashoffset: `${len}` }, { strokeDashoffset: '0' }], { duration: 1600, delay: 900 + i * 140, easing: EASE.inOut });
    });

    // Subtle life: the cake turns slightly toward the pointer and drifts on scroll.
    if (cake && stage && window.matchMedia('(hover: hover)').matches) {
      let target = 0.2;
      let current = 0.2;
      let raf = 0;
      const step = () => {
        current += (target - current) * 0.08;
        cake!.setAngle(current);
        raf = Math.abs(target - current) > 0.001 ? requestAnimationFrame(step) : 0;
      };
      stage.addEventListener('pointermove', (e) => {
        const r = stage.getBoundingClientRect();
        target = 0.2 + ((e.clientX - r.left) / r.width - 0.5) * 0.5;
        if (!raf) raf = requestAnimationFrame(step);
      });
      stage.addEventListener('pointerleave', () => {
        target = 0.2;
        if (!raf) raf = requestAnimationFrame(step);
      });
    }
    if (stage) {
      let ticking = false;
      window.addEventListener(
        'scroll',
        () => {
          if (ticking) return;
          ticking = true;
          requestAnimationFrame(() => {
            const y = Math.min(window.scrollY, 800);
            stage.style.setProperty('--parallax', `${(y * 0.06).toFixed(1)}px`);
            ticking = false;
          });
        },
        { passive: true },
      );
    }
  }
}

function initJourney(): void {
  document.querySelectorAll<HTMLElement>('[data-journey]').forEach((host) => {
    whenVisible(host, () => {
      const mode = host.dataset.journey;
      const r = new CakeRenderer(host, { angle: 0.2, label: mode === 'sketch' ? 'A sketched cake idea' : mode === 'flat' ? 'The cake design in colour' : 'The finished cake' });
      r.svg.classList.add(`cake-svg--${mode}`);
      const spec = mode === 'sketch' ? { ...PRESETS.sketch, message: '' } : { ...PRESETS.sketch, message: '' };
      r.update({ ...spec, decorations: mode === 'full' ? ['floral', 'piped-border', 'pearls', 'butterflies'] : spec.decorations }, { instant: true });
      if (mode === 'full') host.closest('[data-reveal]')?.addEventListener('reveal', () => window.setTimeout(() => r.sparkle(), 500), { once: true });
    });
  });
}

function initFlavors(): void {
  const rail = document.querySelector<HTMLElement>('[data-flavor-rail]');
  if (!rail) return;
  const coat = PALETTES.find((p) => p.id === 'classic-cream')!.frosting;
  FLAVORS.forEach((f, i) => {
    const card = document.createElement('article');
    card.className = 'flavor-card';
    card.dataset.reveal = '';
    card.style.setProperty('--reveal-i', String(i));
    card.innerHTML = `<div class="flavor-card__slice"></div><h3>${escapeHtml(f.label)}</h3><p>${escapeHtml(f.description)}</p>`;
    rail.append(card);
    const view = new SliceView(card.querySelector('.flavor-card__slice')!);
    view.set(f, f.id === 'chocolate-fudge' ? '#4A2418' : coat, { animated: false });
    card.addEventListener('reveal', () => view.set(f, f.id === 'chocolate-fudge' ? '#4A2418' : coat, { animated: true }), { once: true });
    // Re-run the layer reveal on hover so the card feels responsive.
    card.addEventListener('pointerenter', () => view.replay());
  });
}

function initCollections(): void {
  const grid = document.querySelector<HTMLElement>('[data-collections]');
  if (!grid) return;
  const picks = ['customized', 'chocolate-fudge', 'bento', 'cupcakes', 'brownies'];
  grid.innerHTML = picks
    .map((id, i) => {
      const p = PRODUCTS.find((x) => x.id === id)!;
      const href = `${p.group}.html#${p.id}`;
      return `<a class="collection-card" href="${href}" data-reveal style="--reveal-i:${i}">
        <div class="collection-card__media product-media">${mediaHtml(p)}</div>
        <div class="collection-card__body"><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.summary)}</p></div>
      </a>`;
    })
    .join('');
  hydrateCakeArt(grid);
}
