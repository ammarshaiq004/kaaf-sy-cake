import { initSite } from '../main';
import '../styles/pages/content.css';
import { BAKERY } from '../data/bakery';
import { earliestDate, formatDate } from '../lib/dates';
import { buildInquiryMessage, waLink } from '../lib/whatsapp';

const form = document.querySelector<HTMLFormElement>('[data-inquiry]')!;
const date = form.elements.namedItem('date') as HTMLInputElement;
const hint = form.querySelector<HTMLElement>('[data-q-hint]')!;
const error = form.querySelector<HTMLElement>('[data-q-error]')!;
const min = earliestDate(new Date(), BAKERY.leadTimeDays);
date.min = min;
hint.textContent = `Earliest date for a new order: ${formatDate(min)}.`;

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const when = String(data.get('date') ?? '');
  if (when && when < min) {
    error.textContent = `We need at least ${BAKERY.leadTimeDays} days. Choose ${formatDate(min)} or later, or leave the date empty and ask us about urgent orders.`;
    date.setAttribute('aria-invalid', 'true');
    date.focus();
    return;
  }
  error.textContent = '';
  date.removeAttribute('aria-invalid');
  const text = buildInquiryMessage({
    name: String(data.get('name') ?? ''),
    interest: String(data.get('interest') ?? ''),
    date: when,
    message: String(data.get('message') ?? ''),
  });
  window.open(waLink(text), '_blank', 'noopener');
});

initSite();
