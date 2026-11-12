import { expect, test } from '@playwright/test';
import { Seed, unique } from './seed';

// One batch: 5 units at ¥100. The order has revenue 1000 and no lines yet.
// The test adds 2 units (cost 200), then changes the quantity to 1 (cost 100).
test('the order page adds a line and edits its quantity', async ({ page, request }) => {
  const seed = new Seed(request);
  const id = unique();
  const productName = `E2E page ${id}`;
  const product = await seed.product(productName, `E2E page cat ${id}`);
  await seed.batch(product.id, '2026-01-01T00:00:00', 5, 100);
  const order = await seed.emptyOrder(`E2E-PAGE-${id}`, '2026-02-01T00:00:00', 1000);

  await page.goto('/orders');
  const orderRow = page.getByRole('row').filter({ hasText: `E2E-PAGE-${id}` });
  await orderRow.getByRole('link', { name: '添加' }).click();
  await expect(page).toHaveURL(`/orders/${order.id}`);
  await expect(page.getByText('暂无订单详细')).toBeVisible();

  // The picker opens on 选择历史, which is empty in a new browser. Show every product.
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: '全部分类' }).click();
  await page.getByLabel('搜索商品').fill(productName);
  await page.getByText(productName, { exact: true }).click();
  await page.getByLabel(`${productName} 新增数量`).fill('2');
  await page.getByRole('button', { name: '保存 1 个商品' }).click();

  const quantity = page.getByLabel(`${productName} 数量`);
  await expect(quantity).toHaveValue('2');
  const line = page.getByRole('row').filter({ has: quantity });
  await expect(line.getByRole('cell', { name: '200.00', exact: true })).toBeVisible();
  await expect(page.getByText('800.00', { exact: true })).toBeVisible();

  await quantity.fill('1');
  await quantity.press('Enter');
  await expect(line.getByRole('cell', { name: '100.00', exact: true })).toBeVisible();
  await expect(page.getByText('900.00', { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByLabel(`${productName} 数量`)).toHaveValue('1');
  await expect(page.getByText('900.00', { exact: true })).toBeVisible();
});

test('an unknown order id shows a not-found message', async ({ page }) => {
  await page.goto('/orders/999999');

  await expect(page.getByText('订单不存在')).toBeVisible();
  await expect(page.getByRole('link', { name: '返回订单列表' })).toHaveAttribute('href', '/orders');
});
