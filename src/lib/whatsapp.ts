import { BAKERY } from '../data/bakery';
import { formatDate } from './dates';
import { label, themeLabel, type Design } from '../studio/design';

/** wa.me deep link. The number must be international format without "+". */
export function waLink(text?: string): string {
  const base = `https://wa.me/${BAKERY.whatsappIntl}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

function line(name: string, value: string | undefined | null): string | null {
  const v = (value ?? '').trim();
  return v ? `${name}: ${v}` : null;
}

/** The full studio order message. Every line comes straight from the design. */
export function buildDesignMessage(d: Design, referenceCount: number): string {
  const occasion = d.occasion === 'other' ? `Other (${d.occasionOther.trim()})` : label.occasion(d.occasion);
  const shape = d.shape === 'custom' ? `Custom (${d.shapeOther.trim()})` : label.shape(d.shape);
  const decorations = d.decorations.length ? d.decorations.map(label.decoration).join(', ') : 'None';

  const lines: (string | null)[] = [
    `Hi ${BAKERY.name}! I'd like to order a customized cake.`,
    '',
    line('Name', d.customerName),
    line('Occasion', occasion),
    line('Shape', shape),
    line('Size', label.size(d.size)),
    line('Flavor', label.flavor(d.flavor)),
    line('Frosting', label.frosting(d.frosting)),
    line('Theme', themeLabel(d)),
    line('Decorations', decorations),
    d.decorations.includes('name-topper') ? line('Topper name', d.topperName) : null,
    line('Message on cake', d.message.trim() ? `"${d.message.trim()}"` : 'None'),
    line('Requested date', d.date ? formatDate(d.date) : ''),
    line('Pickup / delivery', d.fulfilment === 'pickup' ? 'Self-pickup' : `Delivery to ${d.deliveryArea.trim()}`),
    line('Special instructions', d.instructions),
    referenceCount > 0
      ? `Reference photos: I'll attach ${referenceCount} reference photo${referenceCount === 1 ? '' : 's'} in this chat.`
      : null,
    '',
    'Please let me know the price and whether this date is available.',
  ];
  return lines.filter((l): l is string => l !== null).join('\n');
}

export function buildProductMessage(productName: string): string {
  return `Hi ${BAKERY.name}! I'd like to ask about ${productName}. Could you share the available options, sizes and price?`;
}

export interface Inquiry {
  name: string;
  interest: string;
  date: string;
  message: string;
}

export function buildInquiryMessage(q: Inquiry): string {
  const lines: (string | null)[] = [
    `Hi ${BAKERY.name}!`,
    '',
    line('Name', q.name),
    line('Interested in', q.interest),
    line('Date needed', q.date ? formatDate(q.date) : ''),
    q.message.trim() ? `\n${q.message.trim()}` : null,
  ];
  return lines.filter((l): l is string => l !== null).join('\n');
}
