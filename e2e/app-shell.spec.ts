import { expect, test } from '@playwright/test';

test('loads the app shell without runtime errors', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/');

  await expect(page).toHaveTitle('DFM Terminal');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('DFM Terminal');
  expect(pageErrors).toEqual([]);
});
