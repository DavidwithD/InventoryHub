import { expect, test, type Locator, type Page } from '@playwright/test';
import { Seed, unique } from './seed';

// The ID is in the first cell. Other cells also hold bare numbers, so match only the first cell.
const batchRow = (page: Page, id: number) =>
  page.getByRole('row').filter({ has: page.locator('td:first-child', { hasText: new RegExp(`^${id}$`) }) });

// The stock column shows a chip with the remaining quantity, or 缺货 at zero.
const stockChip = (row: Locator) => row.locator('.MuiChip-label');

// Two batches: 2 units at ¥100, then 5 units at ¥150. One order sells 3 units.
// FIFO takes both units of the first batch and 1 unit of the second: cost 350, 4 units left.
test('inventory and orders pages show FIFO stock and cost', async ({ page, request }) => {
  const seed = new Seed(request);
  const id = unique();
  const product = await seed.product(`E2E card ${id}`, `E2E cards ${id}`);
  const first = await seed.batch(product.id, '2026-01-01T00:00:00', 2, 100);
  const second = await seed.batch(product.id, '2026-01-02T00:00:00', 5, 150);
  await seed.order(`E2E-${id}`, '2026-02-01T00:00:00', 1000, product.id, 3);

  await page.goto('/inventory');
  await expect(stockChip(batchRow(page, first.id))).toHaveText('缺货');
  await expect(stockChip(batchRow(page, second.id))).toHaveText('4');

  await page.goto('/orders');
  const orderRow = page.getByRole('row').filter({ hasText: `E2E-${id}` });
  await expect(orderRow.getByRole('cell', { name: '350.00', exact: true })).toBeVisible();
  await expect(orderRow.getByRole('cell', { name: '650.00', exact: true })).toBeVisible();
});

test('an order sold before any purchase shows unknown cost', async ({ page, request }) => {
  const seed = new Seed(request);
  const id = unique();
  const product = await seed.product(`E2E early ${id}`, `E2E early ${id}`);
  await seed.batch(product.id, '2026-03-01T00:00:00', 5, 100);
  await seed.order(`E2E-EARLY-${id}`, '2026-01-01T00:00:00', 1000, product.id, 1);

  await page.goto('/orders');

  const orderRow = page.getByRole('row').filter({ hasText: `E2E-EARLY-${id}` });
  await expect(orderRow.getByText('未知')).toHaveCount(2);
});

test('home page loads dashboard stats from the API', async ({ page }) => {
  const stats = page.waitForResponse((r) => new URL(r.url()).pathname === '/api/dashboard/stats');

  await page.goto('/');

  expect((await stats).status()).toBe(200);
  await expect(page.getByText('订单管理').first()).toBeVisible();
});
