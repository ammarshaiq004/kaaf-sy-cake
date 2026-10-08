import { expect, test } from '@playwright/test';

const PAGES = [
  { path: '/', title: /Kaaf sy Cake/, h1: 'Your Dream Cake, Beautifully Crafted.' },
  { path: '/cakes.html', title: /Our Cakes/, h1: 'Cakes for every celebration' },
  { path: '/studio.html', title: /Cake Studio/, h1: 'Cake Studio: design your cake' },
  { path: '/treats.html', title: /Sweet Treats/, h1: 'Brownies, cupcakes & sweet treats' },
  { path: '/story.html', title: /Our Story/, h1: 'A little home bakery, baked with a lot of heart' },
  { path: '/reviews.html', title: /Reviews/, h1: 'Kind words from our customers' },
  { path: '/contact.html', title: /Contact/, h1: "Let's talk cake" },
];

for (const p of PAGES) {
  test(`${p.path} loads cleanly`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('fonts.g')) errors.push(m.text());
    });
    await page.goto(p.path);
    await expect(page).toHaveTitle(p.title);
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toHaveAccessibleName(p.h1);
    // The original circular logo is present in the header and footer.
    await expect(page.locator('.site-header .logo-badge')).toBeVisible();
    await expect(page.locator('.site-footer .logo-badge')).toBeVisible();
    // No horizontal scrolling at any width.
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

test('every internal link points at a real page', async ({ page, request }) => {
  await page.goto('/');
  const hrefs = await page.$$eval('a[href^="/"]', (as) => Array.from(new Set(as.map((a) => (a as HTMLAnchorElement).getAttribute('href')!.split('#')[0]!))));
  for (const href of hrefs) {
    const res = await request.get(href);
    expect(res.status(), href).toBe(200);
  }
});

test('navigation marks the current page', async ({ page, isMobile }) => {
  await page.goto('/cakes.html');
  if (isMobile) {
    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.locator('#primary-nav')).toHaveClass(/is-open/);
  }
  await expect(page.locator('#primary-nav a[aria-current="page"]')).toHaveText('Our Cakes');
  await page.locator('#primary-nav').getByRole('link', { name: 'Our Story' }).click();
  await expect(page).toHaveURL(/story\.html/);
});

test('WhatsApp links use the bakery number', async ({ page }) => {
  await page.goto('/');
  const hrefs = await page.$$eval('a[href*="wa.me"]', (as) => as.map((a) => (a as HTMLAnchorElement).href));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const h of hrefs) expect(h).toMatch(/^https:\/\/wa\.me\/923107666604/);
});

test('catalog filters and quick view work', async ({ page }) => {
  await page.goto('/treats.html');
  await expect(page.locator('[data-product]')).toHaveCount(5);
  await page.getByRole('button', { name: 'Tea-time' }).click();
  await expect(page.locator('[data-product]:visible')).toHaveCount(3);
  await expect(page.locator('[data-count]')).toHaveText('3 items');
  await page.getByRole('button', { name: 'All' }).click();
  await page.getByRole('button', { name: 'Quick view: Brownies' }).click();
  const dialog = page.locator('dialog[open]');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Brownies' })).toBeVisible();
  await expect(dialog.getByText('Price confirmed on WhatsApp')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('no prices or testimonials are invented', async ({ page }) => {
  for (const path of ['/cakes.html', '/treats.html', '/reviews.html']) {
    await page.goto(path);
    await expect(page.locator('body')).not.toContainText(/Rs\.?\s?\d|PKR|★/);
  }
  await page.goto('/reviews.html');
  await expect(page.getByRole('heading', { name: 'Our first reviews are on their way' })).toBeVisible();
});

test('contact form opens WhatsApp with the inquiry', async ({ page }) => {
  await page.goto('/contact.html');
  // Capture the URL instead of leaving the site.
  await page.evaluate(() => {
    (window as unknown as { opened: string[] }).opened = [];
    window.open = ((url: string) => {
      (window as unknown as { opened: string[] }).opened.push(url);
      return null;
    }) as typeof window.open;
  });
  await page.getByLabel('Your name').fill('Sara');
  await page.getByLabel("I'm interested in").selectOption('Brownies');
  await page.getByLabel('Message').fill('A box for 12 people');
  await page.getByRole('button', { name: 'Continue on WhatsApp' }).click();
  const opened = await page.evaluate(() => (window as unknown as { opened: string[] }).opened);
  expect(opened).toHaveLength(1);
  const url = new URL(opened[0]!);
  expect(url.origin + url.pathname).toBe('https://wa.me/923107666604');
  expect(url.searchParams.get('text')).toBe('Hi Kaaf sy Cake!\n\nName: Sara\nInterested in: Brownies\n\nA box for 12 people');
});
