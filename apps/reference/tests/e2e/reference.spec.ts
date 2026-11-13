import { expect, test } from '@playwright/test';

// Chromium uses software WebGL so these checks also run on machines without a physical GPU.
test('renders, animates, resizes, and releases the scene without page errors', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  const canvas = page.getByRole('img', { name: 'An orange interwoven sculpture on a circular platform' });
  await expect(canvas).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Animating');
  await page.getByRole('button', { name: 'Pause animation' }).click();
  const still = await canvas.screenshot();
  await page.getByRole('button', { name: 'Resume animation' }).click();
  await expect.poll(async () => (await canvas.screenshot()).equals(still)).toBe(false);
  await page.getByRole('button', { name: 'Pause animation' }).click();
  await page.screenshot({ path: testInfo.outputPath('reference-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(async () => canvas.evaluate((node: HTMLCanvasElement) => {
    const width = node.parentElement?.clientWidth ?? 0;
    return Math.abs(node.width - width * Math.min(window.devicePixelRatio, 2)) < 1;
  })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('reference-mobile.png'), fullPage: true });
  for (let cycle = 0; cycle < 2; cycle++) {
    await page.getByRole('button', { name: 'Stop scene' }).click();
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(page.getByRole('status')).toHaveText('Stopped');
    await page.getByRole('button', { name: 'Start scene' }).click();
    await expect(page.locator('canvas')).toHaveCount(1);
  }
  expect(errors).toEqual([]);
});

test('starts paused when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Paused');
  await expect(page.getByRole('button', { name: 'Resume animation' })).toBeEnabled();
  await expect(page.locator('canvas')).toBeVisible();
});

test('shows useful feedback when WebGL cannot initialise', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', { value: () => null });
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('3D view unavailable');
  await expect(page.getByRole('status')).toHaveText('Unavailable');
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('handles context loss and lets the user recreate the scene', async ({ page }) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  await canvas.evaluate((node: HTMLCanvasElement) => {
    const extension = node.getContext('webgl2')?.getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('Chromium WebGL context-loss support is missing');
    extension.loseContext();
  });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByRole('status')).toHaveText('Animating');
});

test('cleans up on page departure and recreates the application after a persisted page return', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.getByRole('status')).toHaveText('Animating');
});
