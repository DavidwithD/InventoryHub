import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { Seed, unique } from './seed';

// The order page asks before the user leaves with picked products that are not saved.
// These tests check the browser history around that question.
// Each test opens a new order from the list, so the history is: list, order.
// A pick adds one copy of the order entry on top.

const LEAVE_QUESTION = '有 1 个已选商品尚未保存。确定离开吗？';

/** Answers every dialog with the current value of answer.accept. Returns the messages it saw. */
function answerDialogs(page: Page, answer: { accept: boolean }): string[] {
  const messages: string[] = [];
  page.on('dialog', async (dialog) => {
    messages.push(dialog.message());
    if (answer.accept) await dialog.accept();
    else await dialog.dismiss();
  });
  return messages;
}

const historyLength = (page: Page) => page.evaluate(() => window.history.length);

// history.back() goes through popstate like the Back button.
// page.goBack() waits for a load event, and a same-page history step has none.
const pressBack = (page: Page) => page.evaluate(() => window.history.back());

async function seedOrder(request: APIRequestContext) {
  const seed = new Seed(request);
  const id = unique();
  const productName = `E2E leave ${id}`;
  const product = await seed.product(productName, `E2E leave cat ${id}`);
  await seed.batch(product.id, '2026-01-01T00:00:00', 5, 100);
  const order = await seed.emptyOrder(`E2E-LEAVE-${id}`, '2026-02-01T00:00:00', 1000);
  return { productName, orderNo: `E2E-LEAVE-${id}`, orderUrl: `/orders/${order.id}` };
}

/** Opens the order from the list with an in-app link, so the list is the entry before it. */
async function openFromList(page: Page, orderNo: string, orderUrl: string) {
  await page.goto('/orders');
  await page.getByRole('row').filter({ hasText: orderNo }).getByRole('link', { name: '添加' }).click();
  await expect(page).toHaveURL(orderUrl);
  await expect(page.getByText('暂无订单详细')).toBeVisible();
}

async function pick(page: Page, productName: string) {
  await page.getByLabel('搜索商品').fill(productName);
  await page.getByText(productName, { exact: true }).click();
  await expect(page.getByRole('button', { name: '保存 1 个商品' })).toBeVisible();
}

test('the back link replaces the history copy, so one Back returns to the order', async ({ page, request }) => {
  const { productName, orderNo, orderUrl } = await seedOrder(request);
  const asked = answerDialogs(page, { accept: true });
  await openFromList(page, orderNo, orderUrl);
  const beforePick = await historyLength(page);
  await pick(page, productName);
  await expect.poll(() => historyLength(page)).toBe(beforePick + 1);

  await page.getByRole('link', { name: '返回订单列表' }).click();
  await expect(page).toHaveURL('/orders');
  expect(asked).toEqual([LEAVE_QUESTION]);
  expect(await historyLength(page)).toBe(beforePick + 1);

  await pressBack(page);
  await expect(page).toHaveURL(orderUrl);
  await pressBack(page);
  await expect(page).toHaveURL('/orders');
});

test('a side menu item replaces the history copy, so one Back returns to the order', async ({ page, request }) => {
  const { productName, orderNo, orderUrl } = await seedOrder(request);
  const asked = answerDialogs(page, { accept: true });
  await openFromList(page, orderNo, orderUrl);
  await pick(page, productName);
  const afterPick = await historyLength(page);

  await page.getByRole('button', { name: '商品管理' }).click();
  await expect(page).toHaveURL('/products');
  expect(asked).toEqual([LEAVE_QUESTION]);
  expect(await historyLength(page)).toBe(afterPick);

  await pressBack(page);
  await expect(page).toHaveURL(orderUrl);
});

test('Back asks first: cancel keeps the picks, confirm leaves with one press', async ({ page, request }) => {
  const { productName, orderNo, orderUrl } = await seedOrder(request);
  const answer = { accept: false };
  const asked = answerDialogs(page, answer);
  await openFromList(page, orderNo, orderUrl);
  await pick(page, productName);

  await pressBack(page);
  await expect.poll(() => asked.length).toBe(1);
  await expect(page).toHaveURL(orderUrl);
  await expect(page.getByRole('button', { name: '保存 1 个商品' })).toBeVisible();

  answer.accept = true;
  await pressBack(page);
  await expect(page).toHaveURL('/orders');
  expect(asked).toEqual([LEAVE_QUESTION, LEAVE_QUESTION]);
});

test('a Back jump past the order asks nothing and adds no history entry', async ({ page, request }) => {
  const { productName, orderNo, orderUrl } = await seedOrder(request);
  const asked = answerDialogs(page, { accept: false });
  await page.goto('/');
  await page.getByText('订单管理', { exact: true }).first().click();
  await expect(page).toHaveURL('/orders');
  await page.getByRole('row').filter({ hasText: orderNo }).getByRole('link', { name: '添加' }).click();
  await expect(page).toHaveURL(orderUrl);
  await pick(page, productName);
  const afterPick = await historyLength(page);

  // Skips the copy and the order. Lands on the list.
  // The list entry came from an in-app link, so the step stays on the same document and fires popstate.
  await page.evaluate(() => window.history.go(-2));
  await expect(page).toHaveURL('/orders');
  await page.waitForTimeout(500);
  expect(asked).toEqual([]);
  expect(await historyLength(page)).toBe(afterPick);
});

test('removing the last pick removes the copy, so one Back leaves without a question', async ({ page, request }) => {
  const { productName, orderNo, orderUrl } = await seedOrder(request);
  const asked = answerDialogs(page, { accept: false });
  await openFromList(page, orderNo, orderUrl);
  await pick(page, productName);

  await page.getByRole('button', { name: `移除 ${productName}` }).click();
  await expect(page.getByRole('button', { name: '保存 1 个商品' })).toHaveCount(0);

  await pressBack(page);
  await expect(page).toHaveURL('/orders');
  expect(asked).toEqual([]);
});

test('an order opened in a new tab adds no history copy', async ({ page, context, request }) => {
  const { productName, orderNo, orderUrl } = await seedOrder(request);
  await page.goto('/orders');
  const row = page.getByRole('row').filter({ hasText: orderNo });

  const [tab] = await Promise.all([
    context.waitForEvent('page'),
    row.getByRole('cell', { name: orderNo }).click({ modifiers: ['ControlOrMeta'] }),
  ]);
  await expect(page).toHaveURL('/orders');
  await expect(tab).toHaveURL(orderUrl);
  await expect(tab.getByText('暂无订单详细')).toBeVisible();
  expect(await historyLength(tab)).toBe(1);

  await pick(tab, productName);
  await tab.waitForTimeout(500);
  expect(await historyLength(tab)).toBe(1);
});
