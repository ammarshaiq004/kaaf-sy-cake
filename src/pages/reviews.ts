import { initSite } from '../main';
import '../styles/pages/content.css';
import { REVIEWS } from '../data/reviews';
import { escapeHtml as e } from '../lib/dom';

const grid = document.querySelector<HTMLElement>('[data-reviews]')!;
const empty = document.querySelector<HTMLElement>('[data-reviews-empty]')!;
if (REVIEWS.length) {
  grid.innerHTML = REVIEWS.map(
    (r, i) => `<figure class="review-card" data-reveal style="--reveal-i:${i % 3}">
      ${r.photo ? `<img src="${e(r.photo)}" alt="Cake made for ${e(r.name)}" loading="lazy" />` : ''}
      <blockquote>${e(r.text)}</blockquote>
      <figcaption><strong>${e(r.name)}</strong>${r.occasion ? ` · ${e(r.occasion)}` : ''}</figcaption>
    </figure>`,
  ).join('');
} else {
  empty.hidden = false;
}
initSite();
