import { expect, test } from '@playwright/test';
import { unique } from './seed';

test('create, rename and delete a category', async ({ page }) => {
  const name = `E2E category ${unique()}`;
  await page.goto('/categories');

  await page.getByRole('button', { name: '新增分类' }).click();
  await page.getByLabel('分类名称').fill(name);
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.getByText('分类创建成功')).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: name });
  await expect(row).toBeVisible();

  await row.getByRole('button').first().click();
  await expect(page.getByText('编辑分类')).toBeVisible();
  await page.getByLabel('分类名称').fill(`${name} v2`);
  await page.getByRole('button', { name: '保存' }).click();
  const renamed = page.getByRole('row').filter({ hasText: `${name} v2` });
  await expect(renamed).toBeVisible();

  await renamed.getByRole('button').last().click();
  await page.getByRole('dialog').getByRole('button', { name: '删除' }).click();
  await expect(page.getByText('分类删除成功')).toBeVisible();
  await expect(renamed).toHaveCount(0);
});

test('a duplicate category name shows the API error', async ({ page }) => {
  const name = `E2E duplicate ${unique()}`;
  await page.goto('/categories');

  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: '新增分类' }).click();
    await page.getByLabel('分类名称').fill(name);
    await page.getByRole('button', { name: '保存' }).click();
  }

  await expect(page.getByRole('alert').filter({ hasText: '已存在' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(1);
});
