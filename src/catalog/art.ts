/**
 * Illustrations for treats that have no photography yet. They share the cake
 * renderer's light (from the front-left) and palette so the catalog reads as
 * one set. Cards label them as illustrations; real photos replace them.
 */
export type TreatKind = 'cupcakes' | 'brownies' | 'naan-khatai' | 'tea-cake' | 'mini-loaves';

let n = 0;

function plate(id: string): string {
  return `
    <ellipse cx="200" cy="262" rx="150" ry="22" fill="#351c16" opacity=".14"/>
    <ellipse cx="200" cy="250" rx="160" ry="34" fill="url(#${id}-plate)"/>
    <ellipse cx="200" cy="246" rx="132" ry="25" fill="none" stroke="#e5d3bb" stroke-width="1.5"/>`;
}

function defs(id: string, extra = ''): string {
  return `<defs>
    <linearGradient id="${id}-plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf3"/><stop offset="1" stop-color="#eadcc8"/></linearGradient>
    <radialGradient id="${id}-hi" cx=".3" cy=".25" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    ${extra}
  </defs>`;
}

function cupcake(id: string, x: number, y: number, s: number, frost: string): string {
  const pleats = Array.from({ length: 7 }, (_, i) => {
    const t = i / 6;
    const tx = -26 + t * 52;
    const bx = -20 + t * 40;
    return `<path d="M${tx} 0L${bx} 46" stroke="#000" stroke-opacity=".12" stroke-width="1.4"/>`;
  }).join('');
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-28 0L28 0L21 48Q0 54-21 48Z" fill="url(#${id}-liner)"/>${pleats}
    <path d="M-34 2C-40-10-26-22-16-20C-18-36 4-44 14-32C26-38 38-24 30-12C40-6 34 6 24 4C10 10-12 10-34 2Z" fill="${frost}"/>
    <path d="M-20-6C-6-2 10-2 22-8" stroke="#000" stroke-opacity=".08" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M-12-20C-2-16 8-17 16-24" stroke="#000" stroke-opacity=".08" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M-34 2C-40-10-26-22-16-20C-18-36 4-44 14-32C26-38 38-24 30-12C40-6 34 6 24 4C10 10-12 10-34 2Z" fill="url(#${id}-hi)"/>
    <circle cx="4" cy="-38" r="5" fill="#fff8ee"/><circle cx="2.6" cy="-39.4" r="1.6" fill="#fff"/>
  </g>`;
}

function brownie(x: number, y: number, s: number): string {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-48 0L48 0L48 34L-48 34Z" fill="#4a2416"/>
    <path d="M48 0L70-16L70 18L48 34Z" fill="#2d140b"/>
    <path d="M-48 0L-26-16L70-16L48 0Z" fill="#3a1c10"/>
    <path d="M-30-8L-6-11L12-6M20-12L40-9L52-13M-10-4L10-2" stroke="#6b3a29" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <path d="M-48 0L-26-16L70-16L48 0Z" fill="#fff" opacity=".08"/>
    <g fill="#2a120a" opacity=".55"><circle cx="-34" cy="12" r="2"/><circle cx="-10" cy="22" r="1.6"/><circle cx="14" cy="10" r="2.2"/><circle cx="34" cy="24" r="1.6"/></g>
  </g>`;
}

function khatai(x: number, y: number, s: number): string {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="8" rx="34" ry="12" fill="#c99358"/>
    <path d="M-34 6C-34-14 34-14 34 6C34 14-34 14-34 6Z" fill="#e7c48f"/>
    <path d="M-34 6C-34-14 34-14 34 6" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>
    <path d="M-14-4L-4-1L2-6L12-2M-6 3L4 4" stroke="#b07a44" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <circle cx="0" cy="-5" r="3" fill="#d4a46a"/>
  </g>`;
}

function loaf(id: string, x: number, y: number, s: number, glaze: boolean): string {
  return `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-50 0L40 0L40 36L-50 36Z" fill="#c8894d"/>
    <path d="M40 0L58-12L58 24L40 36Z" fill="#9d6534"/>
    <path d="M-50 0C-50-22-30-30-6-30L46-30C58-30 62-20 58-12L40 0Z" fill="url(#${id}-crust)"/>
    <path d="M-40-12C-20-22 10-24 40-14" stroke="#7d4a22" stroke-width="2" fill="none" stroke-linecap="round" opacity=".6"/>
    ${glaze ? `<path d="M-46-10C-30-26 30-30 52-18L50-8C46-2 44 6 42 2C40-4 36 4 32 8C30 2 26 0 22 4C16-2 4 0-2 6C-6 0-14-2-18 4C-22-2-34 0-40 6C-44 2-48-4-46-10Z" fill="#fff6e8" opacity=".92"/>` : ''}
  </g>`;
}

export function treatArt(kind: TreatKind): string {
  const id = `art${++n}`;
  let body = '';
  let extra = '';
  switch (kind) {
    case 'cupcakes':
      extra = `<linearGradient id="${id}-liner" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a5530"/><stop offset=".4" stop-color="#c58d61"/><stop offset="1" stop-color="#7a4628"/></linearGradient>`;
      body = cupcake(id, 140, 196, 1.15, '#f3d2c8') + cupcake(id, 262, 192, 1.1, '#f7ecdc') + cupcake(id, 200, 226, 1.35, '#e9c9a8');
      break;
    case 'brownies':
      body = brownie(170, 222, 1.2) + brownie(200, 186, 1.05) + brownie(250, 226, 0.9);
      break;
    case 'naan-khatai':
      body = khatai(132, 236, 1.05) + khatai(268, 236, 1.05) + khatai(200, 250, 1.15) + khatai(166, 206, 0.95) + khatai(236, 204, 0.95);
      break;
    case 'tea-cake':
      extra = `<linearGradient id="${id}-crust" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8763e"/><stop offset="1" stop-color="#8e5428"/></linearGradient>`;
      body = `${loaf(id, 176, 222, 1.6, false)}
        <g transform="translate(290 236)"><path d="M-14-40L10-40L10 22L-14 22Z" fill="#f1d9a7"/><path d="M-14-40C-14-48 10-48 10-40" fill="#b8763e"/><g fill="#d9b27a"><circle cx="-6" cy="-24" r="1.4"/><circle cx="2" cy="-10" r="1.2"/><circle cx="-4" cy="6" r="1.4"/><circle cx="4" cy="-30" r="1"/></g></g>`;
      break;
    case 'mini-loaves':
      extra = `<linearGradient id="${id}-crust" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c8894d"/><stop offset="1" stop-color="#9d6534"/></linearGradient>`;
      body = loaf(id, 140, 214, 0.85, true) + loaf(id, 262, 210, 0.82, true) + loaf(id, 200, 240, 0.95, true);
      break;
  }
  return `<svg viewBox="0 0 400 300" class="treat-art" role="img" aria-label="Illustration of ${kind.replace('-', ' ')}">${defs(id, extra)}${plate(id)}${body}</svg>`;
}
