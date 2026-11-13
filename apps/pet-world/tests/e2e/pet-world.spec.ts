import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

const habitatName = /Sprout, a round mint-green creature/;

// Samples a screenshot of the canvas so tests can tell a drawn habitat from a blank buffer.
async function canvasColours(page: Page, canvas: Locator) {
  const image = (await canvas.screenshot()).toString('base64');
  return page.evaluate(async (source) => {
    const picture = new Image();
    picture.src = `data:image/png;base64,${source}`;
    await picture.decode();
    const copy = document.createElement('canvas');
    copy.width = 96;
    copy.height = 96;
    const context = copy.getContext('2d');
    if (!context) throw new Error('2D canvas is unavailable');
    context.drawImage(picture, 0, 0, 96, 96);
    const { data } = context.getImageData(0, 0, 96, 96);
    const colours = new Set<string>();
    let mint = 0;
    for (let index = 0; index < data.length; index += 4) {
      const red = data[index] ?? 0;
      const green = data[index + 1] ?? 0;
      const blue = data[index + 2] ?? 0;
      colours.add(`${red >> 4}-${green >> 4}-${blue >> 4}`);
      // Mint body pixels: blue-leaning green, unlike the yellow-green ground and darker bushes.
      if (blue > 140 && blue > red + 20 && green > blue + 15) mint++;
    }
    return { distinct: colours.size, mint };
  }, image);
}

async function stillFor(page: Page, canvas: Locator, milliseconds: number) {
  const before = await canvas.screenshot();
  await page.waitForTimeout(milliseconds);
  return (await canvas.screenshot()).equals(before);
}

// Chromium uses software WebGL so these checks also run on machines without a physical GPU.
test('renders Sprout in a lit habitat and animates idle motion without page errors', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const canvas = page.getByRole('img', { name: habitatName });
  await expect(canvas).toBeVisible();
  await expect(page.locator('#viewport')).toHaveAttribute('data-state', 'ready');
  const colours = await canvasColours(page, canvas);
  expect(colours.distinct).toBeGreaterThan(12);
  expect(colours.mint).toBeGreaterThan(40);
  await expect.poll(async () => stillFor(page, canvas, 250)).toBe(false);
  await expect(page.getByText('Fullness', { exact: true })).toBeVisible();
  await expect(page.getByRole('meter', { name: 'Fullness' })).toHaveJSProperty('value', 60);
  await expect(page.getByRole('meter', { name: 'Happiness' })).toHaveJSProperty('value', 60);
  await page.screenshot({ path: testInfo.outputPath('pet-world-desktop.png'), fullPage: true });
  expect(errors).toEqual([]);
});

test('feeds and plays through the keyboard and announces each result', async ({ page }) => {
  await page.goto('/');
  const feed = page.getByRole('button', { name: 'Feed' });
  const status = page.getByRole('status');
  const reaction = page.locator('.reaction');
  await expect(status).toHaveCount(1);
  await feed.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('meter', { name: 'Fullness' })).toHaveJSProperty('value', 80);
  await expect(status).toHaveText('Sprout eats a snack. Fullness rises to 80.');
  await expect(reaction).toHaveText('Sprout is eating');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Play' })).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.getByRole('meter', { name: 'Happiness' })).toHaveJSProperty('value', 75);
  await expect(page.getByRole('meter', { name: 'Fullness' })).toHaveJSProperty('value', 70);
  await expect(status).toHaveText('Sprout hops with joy. Happiness rises to 75. Fullness falls to 70.');
  await expect(reaction).toHaveText('Sprout is hopping');
  await expect(reaction).toHaveText('Sprout is relaxing', { timeout: 2000 });
  for (let count = 0; count < 3; count++) await feed.press('Enter');
  await expect(page.locator('[data-stat="fullness"]')).toHaveText('100 / 100');
  await expect(status).toHaveText('Sprout eats a snack. Fullness stays at 100.');
});

test('keeps the habitat and controls usable on a mobile viewport', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const canvas = page.getByRole('img', { name: habitatName });
  await expect(canvas).toBeVisible();
  await expect.poll(async () => canvas.evaluate((node: HTMLCanvasElement) => {
    const width = node.parentElement?.clientWidth ?? 0;
    return Math.abs(node.width - width * Math.min(window.devicePixelRatio, 2)) < 1;
  })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect((await canvasColours(page, canvas)).mint).toBeGreaterThan(20);
  for (const name of ['Feed', 'Play']) {
    const box = await page.getByRole('button', { name }).boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('meter', { name: 'Happiness' })).toHaveJSProperty('value', 75);
  await expect(page.locator('.reaction')).toHaveText('Sprout is relaxing', { timeout: 2000 });
  await page.screenshot({ path: testInfo.outputPath('pet-world-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect.poll(async () => canvas.evaluate((node: HTMLCanvasElement) => node.width > 700)).toBe(true);
});

test('reduced motion stops decorative movement and preserves actions and feedback', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const canvas = page.getByRole('img', { name: habitatName });
  await expect(canvas).toBeVisible();
  await expect(page.locator('#viewport')).toHaveAttribute('data-motion', 'reduced');
  expect(await stillFor(page, canvas, 1200)).toBe(true);
  await page.getByRole('button', { name: 'Play' }).press('Enter');
  await expect(page.getByRole('status')).toHaveText('Sprout hops with joy. Happiness rises to 75. Fullness falls to 50.');
  await expect(page.locator('.reaction')).toHaveText('Sprout is hopping');
  expect(await stillFor(page, canvas, 400)).toBe(true);
  await expect(page.locator('.reaction')).toHaveText('Sprout is relaxing', { timeout: 2000 });
});

test('shows a useful fallback when WebGL cannot initialise and keeps care actions available', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null });
  });
  await page.goto('/');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText("Sprout's habitat could not load");
  await expect(alert).toContainText('You can still feed and play with Sprout.');
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'Feed' }).click();
  await expect(page.getByRole('meter', { name: 'Fullness' })).toHaveJSProperty('value', 80);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(alert).toBeVisible();
});

test('recovers from context loss and cleans up across page lifecycle events', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveCount(1);
  await canvas.evaluate((node: HTMLCanvasElement) => {
    const extension = node.getContext('webgl2')?.getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('Chromium WebGL context-loss support is missing');
    extension.loseContext();
  });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(canvas).toHaveCount(0);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(canvas).toHaveCount(1);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await expect(canvas).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Feed' })).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(canvas).toHaveCount(1);
  await expect(page.getByRole('meter', { name: 'Fullness' })).toHaveJSProperty('value', 60);
});
