import { expect, test, type Page } from '@playwright/test';

async function pick(page: Page, name: string, value: string) {
  await page.locator(`label:has(input[name="${name}"][value="${value}"])`).click();
}

async function next(page: Page) {
  await page.locator('[data-next]').click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('studio.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('a customer can design a cake and send it on WhatsApp', async ({ page }) => {
  await next(page);
  await expect(page.locator('[data-error]')).toHaveText('Choose an occasion to continue.');

  await pick(page, 'occasion', 'birthday');
  await next(page);
  await expect(page.getByRole('heading', { name: 'Choose shape & size' })).toBeFocused();

  await pick(page, 'shape', 'round');
  await pick(page, 'size', '2lb');
  await next(page);
  await pick(page, 'flavor', 'chocolate-fudge');
  await expect(page.locator('[data-slice]')).toBeVisible();
  await next(page);
  await pick(page, 'frosting', 'buttercream');
  await next(page);
  await pick(page, 'palette', 'lavender');
  await next(page);
  await pick(page, 'decorations', 'butterflies');
  await next(page);
  await page.getByLabel('Message on the cake').fill('Happy Birthday Ayesha');
  // The preview writes the exact message.
  await expect
    .poll(() => page.locator('.cake-message text').last().evaluate((t) => Array.from(t.querySelectorAll('tspan'), (s) => s.textContent).join(' ')))
    .toBe('Happy Birthday Ayesha');
  await next(page);
  await expect(page.locator('[data-next]')).toHaveText('Skip');
  await next(page);

  await expect(page.getByRole('heading', { name: 'Review your cake' })).toBeVisible();
  await expect(page.locator('[data-review]')).toContainText('Lavender Dreams');
  await next(page);
  await expect(page.locator('[data-error]')).toContainText('date');
  const min = await page.locator('#date').getAttribute('min');
  await page.locator('#date').fill(min!);
  await next(page);

  await expect(page.getByText("Let's Bring Your Cake to Life")).toBeVisible();
  const href = await page.locator('[data-wa-send]').getAttribute('href');
  expect(href).toMatch(/^https:\/\/wa\.me\/923107666604\?text=/);
  const text = new URL(href!).searchParams.get('text')!;
  expect(text).toContain("Hi Kaaf sy Cake! I'd like to order a customized cake.");
  expect(text).toContain('Flavor: Chocolate Fudge');
  expect(text).toContain('Decorations: Butterflies');
  expect(text).toContain('Message on cake: "Happy Birthday Ayesha"');
  await expect(page.locator('body')).not.toContainText('Order Confirmed');
});

test('sizes follow the shape and unsupported options are explained', async ({ page }) => {
  await pick(page, 'occasion', 'kids');
  await next(page);
  await pick(page, 'shape', 'square');
  await expect(page.locator('[data-size="bento"]')).toBeHidden();
  await expect(page.locator('[data-size="4lb"]')).toBeVisible();
  await pick(page, 'shape', 'round');
  await pick(page, 'size', 'bento');
  await next(page);
  await pick(page, 'flavor', 'vanilla');
  await next(page);
  await expect(page.locator('input[name="frosting"][value="fondant"]')).toBeDisabled();
  await expect(page.locator('[data-reason="frosting:fondant"]')).toContainText('Bento cakes');
});

test('progress is restored after a reload', async ({ page }) => {
  await pick(page, 'occasion', 'wedding');
  await next(page);
  await pick(page, 'shape', 'heart');
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.locator('[data-resume-banner]')).toBeVisible();
  await expect(page.locator('input[name="shape"][value="heart"]')).toBeChecked();
  await page.getByRole('button', { name: 'Start a new design' }).first().click();
  await expect(page.locator('input[name="occasion"]:checked')).toHaveCount(0);
});

test('catalog links pre-fill the studio', async ({ page }) => {
  await page.goto('studio.html?frosting=fudge&flavor=chocolate-fudge');
  await expect(page.locator('input[name="frosting"][value="fudge"]')).toBeChecked();
  await expect(page.locator('input[name="flavor"][value="chocolate-fudge"]')).toBeChecked();
});

test('options are keyboard operable', async ({ page }) => {
  await page.locator('input[name="occasion"][value="birthday"]').focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('input[name="occasion"][value="anniversary"]')).toBeChecked();
});

test('works with reduced motion', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('studio.html');
  await pick(page, 'occasion', 'birthday');
  await next(page);
  await pick(page, 'shape', 'heart');
  await expect(page.locator('.cake-svg')).toBeVisible();
  await ctx.close();
});
