/** Catalog page: filter chips, product cards and the quick-view dialog. */
import { PRODUCTS, TAGS, type Product, type ProductGroup } from '../data/products';
import { escapeHtml as e, $ } from '../lib/dom';
import { animate, EASE } from '../lib/motion';
import { buildProductMessage, waLink } from '../lib/whatsapp';
import { hydrateCakeArt, mediaHtml } from './media';

const WA_ICON =
  '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z"/></svg>';

function priceLine(p: Product): string {
  return p.startingPrice
    ? `<p class="price-line">${e(p.startingPrice)}</p>`
    : `<p class="price-line price-line--ask">Price confirmed on WhatsApp</p>`;
}

function card(p: Product, i: number): string {
  const studio = p.studio !== undefined ? `<a class="btn btn-primary btn-sm" href="/studio.html${p.studio ? `?${p.studio}` : ''}">Customize</a>` : '';
  return `<article class="product-card" id="${p.id}" data-product="${p.id}" data-tags="${p.tags.join(' ')}" data-reveal style="--reveal-i:${i % 3}">
    <button type="button" class="product-card__open" data-quickview="${p.id}" aria-label="Quick view: ${e(p.name)}">
      <div class="product-media">${mediaHtml(p)}</div>
    </button>
    <div class="product-card__body">
      <div class="product-card__tags">${p.tags.map((t) => `<span class="tag">${e(TAGS[t] ?? t)}</span>`).join('')}</div>
      <h2>${e(p.name)}</h2>
      <p>${e(p.summary)}</p>
      ${priceLine(p)}
      <div class="product-card__actions">
        ${studio}
        <a class="btn ${studio ? 'btn-ghost' : 'btn-whatsapp'} btn-sm" href="${waLink(buildProductMessage(p.name))}" target="_blank" rel="noopener">${studio ? '' : WA_ICON} Order on WhatsApp</a>
        <button type="button" class="link-btn" data-quickview="${p.id}">View details</button>
      </div>
    </div>
  </article>`;
}

export function initCatalog(group: ProductGroup): void {
  const products = PRODUCTS.filter((p) => p.group === group);
  const grid = $('[data-products]');
  const chips = $('[data-filters]');
  const count = $('[data-count]');

  const tags = Array.from(new Set(products.flatMap((p) => p.tags)));
  chips.innerHTML = [`<button type="button" class="chip" aria-pressed="true" data-filter="all">All</button>`, ...tags.map((t) => `<button type="button" class="chip" aria-pressed="false" data-filter="${t}">${e(TAGS[t] ?? t)}</button>`)].join('');
  grid.innerHTML = products.map(card).join('');
  hydrateCakeArt(grid);

  const applyFilter = (tag: string) => {
    let shown = 0;
    chips.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.filter === tag)));
    grid.querySelectorAll<HTMLElement>('[data-product]').forEach((el) => {
      const on = tag === 'all' || (el.dataset.tags ?? '').split(' ').includes(tag);
      if (on) {
        shown++;
        if (el.hidden) {
          el.hidden = false;
          el.classList.add('is-revealed');
          animate(el, [{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: EASE.out });
        }
      } else {
        el.hidden = true;
      }
    });
    count.textContent = `${shown} ${shown === 1 ? 'item' : 'items'}`;
  };
  chips.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest<HTMLButtonElement>('[data-filter]');
    if (b) applyFilter(b.dataset.filter!);
  });
  applyFilter('all');

  // Quick view.
  const dialog = $('[data-quickview-dialog]') as HTMLDialogElement;
  let opener: HTMLElement | null = null;
  grid.addEventListener('click', (ev) => {
    const b = (ev.target as Element).closest<HTMLElement>('[data-quickview]');
    if (!b) return;
    const p = products.find((x) => x.id === b.dataset.quickview);
    if (p) {
      opener = b;
      openQuickView(dialog, p);
    }
  });
  dialog.addEventListener('close', () => opener?.focus());
  dialog.addEventListener('click', (ev) => {
    if (ev.target === dialog) dialog.close();
  });

  // Deep link: /cakes.html#bento highlights that card.
  const hash = decodeURIComponent(window.location.hash.slice(1));
  const target = hash ? document.getElementById(hash) : null;
  if (target?.matches('[data-product]')) {
    target.classList.add('is-highlighted');
    window.setTimeout(() => target.classList.remove('is-highlighted'), 2400);
  }
}

function openQuickView(dialog: HTMLDialogElement, p: Product): void {
  const gallery = p.images.length > 1;
  const studio = p.studio !== undefined ? `<a class="btn btn-primary btn-lg" href="/studio.html${p.studio ? `?${p.studio}` : ''}">Customize in the Cake Studio</a>` : '';
  dialog.innerHTML = `<button type="button" class="dialog__close" data-close aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
  <div class="qv">
    <div class="qv__gallery">
      <div class="product-media qv__main" data-qv-main>${mediaHtml(p)}</div>
      ${gallery ? `<div class="qv__thumbs" role="group" aria-label="Photos">${p.images.map((src, i) => `<button type="button" data-qv-img="${i}" aria-current="${i === 0}" aria-label="Photo ${i + 1}"><img src="${e(src)}" alt="" loading="lazy"/></button>`).join('')}</div>` : ''}
    </div>
    <div class="qv__body">
      <p class="eyebrow">${p.group === 'cakes' ? 'Our cakes' : 'Sweet treats'}</p>
      <h2 id="qv-title">${e(p.name)}</h2>
      <p class="lead">${e(p.summary)}</p>
      <ul class="qv__details">${p.details.map((d) => `<li>${e(d)}</li>`).join('')}</ul>
      ${priceLine(p)}
      <div class="qv__actions">
        ${studio}
        <a class="btn btn-whatsapp btn-lg" href="${waLink(buildProductMessage(p.name))}" target="_blank" rel="noopener">${WA_ICON} Ask on WhatsApp</a>
      </div>
      <p class="hint">Order at least 2 days ahead. Orders are confirmed on WhatsApp, subject to availability. Self-pickup preferred; delivery may cost extra.</p>
    </div>
  </div>`;
  dialog.setAttribute('aria-labelledby', 'qv-title');
  hydrateCakeArt(dialog);
  dialog.querySelector('[data-close]')!.addEventListener('click', () => dialog.close());
  dialog.querySelectorAll<HTMLButtonElement>('[data-qv-img]').forEach((b) =>
    b.addEventListener('click', () => {
      const i = Number(b.dataset.qvImg);
      dialog.querySelector('[data-qv-main]')!.innerHTML = mediaHtml(p, i);
      dialog.querySelectorAll('[data-qv-img]').forEach((x) => x.setAttribute('aria-current', String(x === b)));
    }),
  );
  dialog.showModal();
}
