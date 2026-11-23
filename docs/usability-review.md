# Usability review

Date: 2026-11-22. Branch: `feat/order-detail-page` at `a226241`.

Scope: the frontend in `inventory-hub-frontend/`. I read the code. I also ran the app against the local MySQL database and clicked through each page at 1440 px and 375 px wide. I did not save, edit or delete any data.

The product owner answered the open questions on 2026-11-23. Section 7 lists the answers. The findings below are updated to match them.

One person uses the app, on a Mac. I inferred the main task from the data. The home page shows 1258 of 1289 orders with no cost. So I assume the most frequent job is to open an order and add its products. Nobody confirmed this.

Evidence paths are relative to `inventory-hub-frontend/` unless they start with `InventoryHub.API/`.

## 1. Summary

- The order list draws all 1289 orders and 1289 images at once. The page is 120,372 px tall. Rows appear after about 1.5 s. Before that the list says 暂无订单数据.
- The cost backfill loop is slow. After each order page, the list returns to the top and the sort resets. The product search on the order page finds nothing on a new browser. Orders without cost show cost 0.00 and a profit equal to revenue.
- The same actions behave differently on each page. Examples are success messages, delete confirmation, loading text, error text, currency symbols and the product picker. There are no shared components for these.

## 2. System map

**Stack.** Next.js 16 App Router with React 19. All pages are client components (`'use client'`). The UI uses MUI 7 with `sx` props. Tailwind is installed but almost unused. Data comes from Axios (`lib/api.ts`) in per-page hooks (`app/*/hooks/`). There is no cache layer. Zustand with `persist` stores filters, view mode, pick history and factors in localStorage (`lib/stores/`). Tests use Vitest (`tests/unit/`) and Playwright (`e2e/`).

**Layout.** `components/layout/AppLayout.tsx` holds a fixed app bar and a side drawer with 7 links. The drawer is temporary below 900 px.

**Pages.**

| Route | Page | Main actions |
|---|---|---|
| `/` | 主页 | 4 stat cards, 5 navigation cards, 2 alerts |
| `/stats` | 数据统计 | 4 tabs of charts and KPIs |
| `/orders` | 订单管理 | Filter, sort, table or card view, export JSON, Mercari import dialog, new order dialog |
| `/orders/[id]` | Order page | Summary, edit line quantity, delete line, pick and add products |
| `/products` | 商品管理 | Table or card view, add, edit, delete in a dialog |
| `/inventory` | 库存管理 | Batch table, search, category, stock filter, sort, change conversion factor |
| `/inventory/import` | 采购导入 | Fetch Pinduoduo or Taobao orders, match products, register batches |
| `/categories` | 分类管理 | Add, edit, delete in a dialog |
| `/suppliers` | 渠道管理 | Add, edit, delete in a dialog |

**Main flows.**

| Flow | Steps today |
|---|---|
| Add cost to an order | Orders list → find the row → 添加 → pick a category or use history → click a product card → set quantity → 保存 N 个商品 → 返回订单列表. The best case is 5 clicks and 1 field. The list then starts at the top again. |
| Change a line quantity | Order page → type in 数量 → Enter or blur. 1 field. It saves with no visible confirmation. |
| Add stock | 库存管理 → 采购导入 → choose supplier → 一键获取订单 or paste a fetch command → per row: choose product, check factor → 登记. |
| Fix a stock conversion | 库存管理 → click the stock chip → enter factor → confirm. A second dialog appears if sales are affected. |
| Remove stock | There is no flow. Stock goes down only through order lines. |
| Edit an order's revenue or shipping fee | There is no flow. This is intended (Q2). |
| Find an item | 库存管理 search works per batch. 商品管理 has no search. |

## 3. Findings

Impact means user impact. Effort is S (under half a day), M (one to three days) or L (more).

| ID | Page or flow | Problem | Evidence | User impact | Fix | Impact | Effort |
|---|---|---|---|---|---|---|---|
| F1 | Orders list | All orders render at once. There is no paging and no lazy image loading. | `app/orders/components/OrdersTable.tsx:101`. `app/orders/components/OrderThumbnail.tsx:29` has no `loading="lazy"`. In the app: 1289 rows, 1289 `<img>`, page height 120,372 px, rows visible about 1.5 s after the click. The API answered in 25–85 ms. | Slow first view. Scrolling to an order takes long. The count will grow with each import. | Add `loading="lazy"` to the thumbnail now. Then page the list with MUI `TablePagination` (50 rows) or virtualize it. Keep the page number in the filter store. | H | S (lazy) / M (paging) |
| F2 | Orders list | The list says 暂无订单数据 while it loads. The hook has a `loading` flag. The page does not use it. | `app/orders/page.tsx:22` takes no `loading`. `app/orders/hooks/useOrders.ts:26`. `OrdersTable.tsx:146`. Measured: empty text at 0.2 s, rows at 1.5 s. | Users think their orders are gone. | Pass `loading` to `OrdersTable` and `OrdersCardList`. Show skeleton rows while it is true. | M | S |
| F3 | Order page → orders list | Going back resets the scroll to the top and resets the sort. | Measured: scrollY 30000 → 0 after 返回订单列表 and after browser Back. `app/orders/page.tsx:31` keeps the sort in `useState`. | Each backfilled order costs a long scroll to find the next one. This is the main task (inferred). | Add a 下一个 button on the order page. It opens the next order of the current filtered and sorted list. Also keep the sort in `useOrderFilterStore` and restore the scroll on return. | H | M |
| F4 | Orders list, cards, order page | An order with no cost shows 总成本 0.00 and 利润 equal to revenue. | `OrdersTable.tsx:120-124`. `OrdersCardList.tsx:80`. `app/orders/utils/orderProfit.ts:6`. In the app, the first row shows 总成本 0.00, 利润 3385.00. This applies to 1258 orders. The README order list section says these should show 未输入. | Profit looks real when it is not. Exports carry the same wrong profit (`app/orders/page.tsx:89-90`). | When `!order.hasDetails`, show 未输入 for cost and — for profit. Add a 未输入成本 chip like the 成本未知 chip. Apply the same rule in `orderProfit` and in the export. | H | S |
| F5 | Order page, 添加商品 | The search box searches only the selected category. The default category is 选择历史. It is empty on a new browser. The empty text then says 暂无选择历史 even when the search has no match. | `app/orders/components/ProductPicker.tsx:49`, `:93-98`, `:160`. In the app, typing 袜 showed 暂无选择历史. The order already had a 袜子 product. | The user thinks the product does not exist. They must find the category menu first. | When the search has text, search all products. Start on 全部分类 when history is empty. Show 没有匹配的商品 for an empty search result. | H | S |
| F6 | Home | The 待补成本 card and the warning alert are not links. | `app/page.tsx:129-143`, `:169-173`. | The user must open 订单管理 and set the 成本状态 filter by hand. | Make the card and the alert link to `/orders`. Set `costStatus` to `null` in the filter store before you navigate. | M | S |
| F7 | Home | Stat cards show ¥ 0 and 0 while loading and after an error. | `app/page.tsx:90`, `:106`, `:122`, `:138`. | A zero looks like real data. | Show a `Skeleton` while `stats` is null, as `app/stats/components/DashboardTab.tsx:87` does. Show — after an error. | M | S |
| F8 | Home, stats | "186 个商品库存不足" counts batches, not products. Q4 says low stock belongs to a product. | `InventoryHub.API/Services/DashboardService.cs:58` calls `LowStockBatchCount()` (`InventoryHub.API/Services/FifoCalculator.cs:50`). `InventoryHub.API/Services/StatsService.cs:124` uses the same count. The inventory page shows 低库存 186 out of 353 batches. | The user gets a wrong count of products to reorder. | Add a per-product count to `FifoCalculator`: products whose summed remaining stock is above 0 and under 5. Use it in `DashboardService` and `StatsService`. | M | M |
| F9 | Orders list | After an import, the list reloads without the date range. The date fields still show the range. | `app/orders/page.tsx:151` calls `loadOrders()` with no arguments. The same call at `:119` and `:133` (save and delete) goes away with F12 and F16. Code only. I did not save data. | The list and the filter disagree. Counts and exports are wrong until the user clicks 应用筛选 again. | Pass `{ startDate, endDate }` from the store in each reload. | M | S |
| F10 | Orders list | Search and 成本状态 apply at once. The dates apply only after 应用筛选. | `app/orders/components/OrderFilters.tsx:37-75`. `app/orders/page.tsx:59-81` and `:140-142`. | Users change a date and see no change. The inventory page filters apply at once. | Apply the dates on change and remove 应用筛选. Filter the dates on the client, because all orders are already loaded. | M | S |
| F11 | Orders list | A click on the image leaves the app. It opens Mercari in the same tab. The row is not a link. Only the small 查看/添加 text opens the order. | `app/orders/components/OrderThumbnail.tsx:25-27` has no `target`. `OrdersTable.tsx:128-136` puts the link text inside an `IconButton`. | Users lose their place in the app and in the list. The open target is small. | Make the whole row and the whole card open `/orders/{id}`. On the order page, add a separate Mercari link with `target="_blank"`. | M | S |
| F12 | Orders | Q2 says orders are never edited or deleted. The edit and delete code is still there but cannot be reached. | Commented-out buttons in `OrdersTable.tsx:137-142`. Unused `onEdit` and `onDelete` props (`OrdersTable.tsx:25-26`). `handleDeleteOrder` in `app/orders/page.tsx:127-138`. Edit mode with a disabled save button in `app/orders/components/OrderFormDialog.tsx:263`. | No effect on the user. The code suggests a feature that does not exist. | Delete this code. Do it together with F16. | L | S |
| F13 | Order page | 包装费, 其他费用 and 备注 show on every line. Q3 says they are not needed. | Headers at `app/orders/components/OrderDetailLinesTable.tsx:92-93` and `:95`. Cells at `:112-113` and `:117`. The columns set the table's 640 px minimum width (`:87`). | Three columns of 0.00, 0.00 and - take space on the page the user works on most. | Remove the three columns. Keep sending 0 to the API (`app/orders/components/OrderDetailAddPanel.tsx:112-113`). | M | S |
| F14 | Order page | Picked products that are not saved are lost on leaving the page. There is no warning. | `OrderDetailAddPanel.tsx:57` keeps rows in local state. The back link is at `app/orders/[id]/page.tsx:19-25`. | Work is lost without notice. | Warn when rows are not saved (`beforeunload` and a check on the back link). Or save each pick at once with quantity 1. | M | S |
| F15 | Order page | A quantity change saves with no visible result. An invalid value goes back without a message. | `OrderDetailLinesTable.tsx:44-50`. | Users cannot tell if a change saved. | Show a short 已保存 helper text or a check icon after a save. Show 数量必须大于0 for an invalid value. | L | S |
| F16 | Orders list | Q6 says the manual 新建订单 flow is not used. Its button is still the main button at the top of the list. | `app/orders/page.tsx:175-177` and `:228-235`. The dialog has its own product selector (`app/orders/components/OrderDetailRows.tsx`). | An unused main button sits next to 批量导入订单. | Remove the button, `OrderFormDialog.tsx` and `OrderDetailRows.tsx`. Git keeps them if the flow comes back. | L | S |
| F17 | All pages | Success and error messages look and behave differently on each page. | Inline `Alert` that stays: `app/orders/page.tsx:181-190`, `app/orders/[id]/page.tsx:164-168`. Top snackbar for 3 s: `app/products/page.tsx:117-130`, `app/categories/page.tsx:74-87`, `app/suppliers/page.tsx:102-115`. Bottom snackbar for errors only: `app/inventory/page.tsx:334-343`. | Users look for feedback in a different place on each page. Old success alerts stay on the orders page. | Add one shared toast (`components/feedback/ToastProvider.tsx` with a `useToast()` hook). Use it on every page. | M | M |
| F18 | Products, suppliers, order page | Delete confirmation uses the browser `confirm()`. Categories use an MUI dialog. No delete has undo. | `app/products/page.tsx:69`. `app/suppliers/page.tsx:62`. `app/orders/[id]/page.tsx:135`. `app/categories/components/CategoriesTable.tsx:100-109`. | Inconsistent look. The native box cannot show what the delete affects. | Add one `ConfirmDialog` component. Use it for every delete. Name the item and the effect, for example 库存将恢复. | L | S |
| F19 | Products, categories | Error text is `error.response.data` without a check. If the API returns an object, React cannot render it. | `app/products/page.tsx:62`, `:77`. `app/categories/page.tsx:51`, `:61`. `lib/apiErrorMessage.ts` already handles this. Unverified: I did not cause an API error. | A failed save could show a broken page in place of a message. | Use `apiErrorMessage(err, '操作失败')` on these pages and on suppliers (`app/suppliers/page.tsx:55-56`). | M | S |
| F20 | Categories | The dialog closes even when the save fails, so the input is lost. An empty name shows a browser `alert()`. | `app/categories/page.tsx:50-53` catches and does not rethrow. `app/categories/components/CategoryDialog.tsx:25`, `:28-29`. | The user must type the name again. | Rethrow the error, as `app/products/page.tsx:64` does. Show the empty-name error as helper text under the field. | L | S |
| F21 | Products | 167 products with no search, no category filter and no sort. There is no stock column. | `app/products/page.tsx:84-107`. In the app: 167 rows, 0 inputs. | Finding a product to edit means scrolling or using the browser search. | Reuse the inventory search and category filter (`app/inventory/page.tsx:243-272`). Add a total stock column. | M | S |
| F22 | Products table, suppliers table | Edit and delete icon buttons have no accessible name. | `app/products/components/ProductsTable.tsx:64-69`. `app/suppliers/components/SuppliersTable.tsx:57-70`. In the app: 334 unlabeled buttons on 商品管理. The card view has labels (`ProductsCardList.tsx:73`, `:81`). | Screen readers say only "button". | Add `aria-label={`编辑 ${name}`}` and `aria-label={`删除 ${name}`}`. | L | S |
| F23 | Inventory | Low stock and out of stock are marked per batch. A product with many small batches is marked low even when its total is high. Empty batches stay in the list. | `app/inventory/components/InventoryTable.tsx:38-43`. `app/inventory/page.tsx:139-143`, `:193-200`. | Reorder decisions are based on the wrong number. | Q4 says low stock belongs to a product. Show the product total next to the batch stock. Filter 低库存 and 缺货 by the product total. Count the header chips per product. Hide empty batches by default. | M | M |
| F24 | Inventory | The only way to change a conversion factor is a click on the stock chip. Only a tooltip tells you this. | `InventoryTable.tsx:114-121`. | Users do not find the action. | Add an 操作 column with a labelled 调整换算 button. | L | S |
| F25 | All money fields | ¥ is used for both yen and yuan. The order list shows no unit at all. | `InventoryTable.tsx:123-125` (¥ for JPY and for CNY). `OrderDetailLinesTable.tsx:92-94` (包装费（¥）). `app/page.tsx:90`. `OrderFormDialog.tsx:210` vs `:256`. | In a Chinese UI ¥ reads as 元. Users can mix up the two currencies. | Q5 says order amounts are JPY. Add `lib/formatMoney.ts` with `formatMoney(value, 'JPY' \| 'CNY')`. Show order and home amounts as 円. Keep 元 only for the CNY price column in inventory and import. | M | S |
| F26 | Purchase import | A batch can be registered when the exchange rate failed to load. It then saves `priceJpy = 0`. | `app/inventory/import/page.tsx:139`, `:205-207`. `lib/exchangeRate.ts:9-19` has no fallback. `getCurrentExchangeRate` at `:21-35` has one. `app/inventory/components/ExtractedResultRow.tsx:250` does not check the rate. Code only. | Batches with cost 0 make later profits wrong. Nothing tells the user. | Disable 登记 while the rate is 0 and show why. Fall back to the last saved rate. | H | S |
| F27 | Purchase import | A failed registration shows no message. | `ExtractedResultRow.tsx:114-130` has `try/finally` and no `catch`. | The user thinks it worked, or clicks again with no information. | Catch the error and show it on the row. | M | S |
| F28 | Purchase import | The supplier choice is not remembered. The platform is guessed from the supplier name. | `app/inventory/import/page.tsx:55`. `app/inventory/import/taobaoService.ts:142-146`. | One extra step on each visit. A supplier name without 淘宝 or taobao is treated as Pinduoduo. | Remember the last supplier in localStorage. Show the detected platform next to the supplier field. | L | S |
| F29 | Orders list, phone | At 375 px the filter panel fills the first screen. The default table is 940 px wide in a 327 px box. | Measured in the app. `lib/stores/viewModeStore.ts:18` defaults to table. | Closed. Q1 says the app is used only on a Mac. | No change. | — | — |
| F30 | Navigation | One page has three names: 渠道管理, 供应商管理 and 供应商. | `components/layout/AppLayout.tsx:47`. `app/page.tsx:59`. `app/suppliers/page.tsx:84`. | Users are not sure these are the same page. | Pick one name and use it in the menu, the home card, the page and the import page. | L | S |
| F31 | Home | The 快速导航 cards repeat the side menu. The app bar has both a home icon and a home link on the title. | `app/page.tsx:146-166`. `AppLayout.tsx:151-169`. | Space on the first screen goes to links the user already has. | Replace the navigation cards with the action links from F6. Remove the home icon. | L | S |
| F32 | Stats | The default period shows only zeros because the newest order is from 2026/5/30. One empty message is in English. | Page text in the app. `app/stats/components/DashboardTab.tsx:489` "No data for this period". | The page looks broken. | Translate the message. Show the date of the newest order next to the empty state. | L | S |
| F33 | Orders list | Each visit also loads all inventory and categories. Only the new order dialog uses them. | `app/orders/page.tsx:54-55`. | Extra requests on the most visited page. | Removing the dialog (F16) removes these requests. | L | S |
| F34 | Code | Two `useCategories` hooks exist. | `app/products/hooks/useCategories.ts:7`. `app/categories/hooks/useCategories.ts:7`. | Fixes in one hook do not reach the other. | Keep one hook in `lib/hooks/`. | L | S |
| F35 | Inventory | React reports invalid HTML: a `Chip` (div) inside `Typography` (p). | `app/inventory/page.tsx:210-223`. Console error in the app. | No visible effect today. It can cause hydration bugs. | Render the count line with `component="div"`. | L | S |
| F36 | Tests | The main flows of F3–F10 have no tests. Orders list filters, product picker search, home page, products page, inventory page and purchase registration have no tests. | `tests/unit/` and `e2e/` (listed in section 8). | Regressions in daily flows go unnoticed. | Add unit tests for `ProductPicker` search, the orders filter and reload, and `formatMoney`. Add one e2e test for the backfill loop. | M | M |
| F37 | Orders list | The export writes JSON. Q7 says the user needs CSV. | `app/orders/page.tsx:83-103` builds a JSON file. The button says 导出JSON (`app/orders/components/OrderFilters.tsx:83`). | The file does not open as a table in a spreadsheet app. | Write CSV with the same columns and rows. Quote each field that holds a comma, a quote or a line break. Start the file with a UTF-8 BOM. Without it, Excel on Mac can show the Chinese headers as broken text. I did not test this. Rename the button 导出CSV. Use 未输入 for orders without cost (F4). | H | S |

## 4. Quick wins

High impact or clear value, small effort. Ordered by value.

1. **F4** Show 未输入 for orders without cost. It affects 1258 orders and every export.
2. **F5** Make the product search look in all products. It fixes the first step of the main task.
3. **F37** Export CSV in place of JSON. The user asked for it.
4. **F26** Block purchase registration when there is no exchange rate. It prevents wrong costs in the database.
5. **F1 (lazy part)** Add `loading="lazy"` to the order thumbnail. One attribute. It cuts the image load on the largest page.
6. **F2** Use the existing `loading` flag on the orders list.
7. **F13** Remove the 包装费, 其他费用 and 备注 columns from the order page.
8. **F6** Link the 待补成本 card and alert to the filtered order list.
9. **F11** Make the whole row open the order. Move the Mercari link.
10. **F14** Warn before losing picked products.
11. **F10** Apply the date filter at once.
12. **F25** Add `formatMoney`. Show order amounts as 円.
13. **F16 and F12** Remove the unused new order dialog and the order edit and delete code. This also closes F33.
14. **F9** Keep the date range after an import.
15. **F7** Show skeletons on the home stat cards.

## 5. Bigger changes

Suggested order:

1. **Backfill loop (F3, F15).** Add 下一个 on the order page. Keep the sort and the scroll. This comes first. It is the task the user repeats over 1000 times (inferred from the data).
2. **List size and loading (F1, F2, F7, F21).** Page the orders list. Add search to products. Use one loading pattern. This comes second. Every list gets slower as data grows, and F3 is easier with paging state in the store.
3. **Low stock per product (F8, F23).** Q4 settled the rule. Add a per-product count in the API. Use it on home, stats and the inventory filter. This comes third. It needs an API change and a test of the FIFO numbers.
4. **Shared feedback components (F17, F18, F19, F20, F27).** Add a toast, a confirm dialog and one error helper. Then replace the per-page versions. This comes fourth. It touches every page, so it is best done after the order flows settle.
5. **Small fixes and tests (F22, F24, F28, F30, F31, F32, F34, F35, F36).** Fix the supplier name and the labels. Tidy the home, stats and import pages. Merge the duplicate hook. Add tests for the changed flows. This comes last. Each item is small, and the tests should cover the flows as they are after themes 1–4.

## 6. Inconsistencies

| Element | Variant A | Variant B | Variant C |
|---|---|---|---|
| Success and error messages | Inline alert that stays (`app/orders/page.tsx:181-190`) | Top snackbar, 3 s (`app/products/page.tsx:117-130`) | Bottom snackbar, errors only (`app/inventory/page.tsx:334-343`) |
| Delete confirmation | Browser `confirm()` (`app/products/page.tsx:69`) | MUI dialog (`CategoriesTable.tsx:100-109`) | — |
| Loading state | Zeros (`app/page.tsx:90`) | Empty text (`OrdersTable.tsx:146`) | 加载中... text (`ProductsTable.tsx:43`, `app/orders/[id]/page.tsx:178`) or skeleton (`DashboardTab.tsx:87`) |
| Error text from the API | `apiErrorMessage` (orders) | Raw `response.data` (products, categories) | `JSON.stringify` (suppliers) |
| Product selection | Card picker with history (`ProductPicker.tsx`) | Two dropdowns (`OrderDetailRows.tsx`) | Autocomplete (`ExtractedResultRow.tsx`) |
| Filter timing | At once (inventory, order search) | After 应用筛选 (order dates) | — |
| Saved list state | Inventory keeps filters and sort | Orders keep filters, not sort | Products keep nothing but view mode |
| Unknown cost marker | Chip 成本未知 (cards, order page) | No chip (table) | — |
| Profit color | Green or red (cards, order page) | Plain (table) | — |
| Date format | Date only (`OrdersTable.tsx:126`) | Date and time with seconds (`OrderSummaryCard.tsx:36`, `ProductsTable.tsx:61`) | — |
| Currency | ¥ for JPY | ¥ for CNY | No unit (order list) |
| Page title | Only in app bar (orders, products, categories, suppliers) | h5 in page and app bar (inventory, import) | h3 (home) |
| Supplier page name | 渠道管理 (menu) | 供应商管理 (home) | 供应商 (page, import) |
| Icon button labels | Labelled (categories, product cards) | Not labelled (products table, suppliers) | — |
| Empty state text | 暂无数据 | 暂无订单数据 | No data for this period |

## 7. Open questions and answers

The product owner answered these on 2026-11-23.

| ID | Question | Answer | Findings changed |
|---|---|---|---|
| Q1 | Who uses the app, and on which device? | One person manages the inventory, on a Mac. No phone or tablet for now. | F29 closed. |
| Q2 | Should orders be editable or deletable? | No deletes. No edits to revenue, shipping fee or time. | F12 becomes a code cleanup. F9 and F18 narrowed. |
| Q3 | Are 包装费, 其他费用 and 备注 used? | No. | F13: remove the columns. |
| Q4 | Is low stock a property of a product or of a batch? | Of a product. | F8 and F23 fixes set. |
| Q5 | Which currency are order amounts in? | JPY. | F25 fix set. |
| Q6 | Is the manual 新建订单 flow used? | Not for now. | F16: remove the flow. F33 closes with it. |
| Q7 | Which export format? | CSV. | F37 added. |

Still open:

- **Q8.** Is 5 the right low-stock limit for every product? The API uses one fixed limit (`InventoryHub.API/Services/FifoCalculator.cs:19`).

## 8. What I did not check, and why

- **Saving, editing, deleting and importing.** The app runs against your real local database, so I did not write data. F9, F19, F20, F26 and F27 come from the code only.
- **Mercari import and purchase import with real data.** They need live tokens and the browser extension.
- **Production build.** I ran `next dev`. Each page loaded its API data twice. I assume that is React Strict Mode in development. I did not check a production build.
- **Screen reader and contrast.** I did not use a screen reader or a contrast tool. Accessibility findings come from code and from counting labels in the DOM.
- **Keyboard-only use.** I did not walk each flow with the keyboard.
- **Dark mode.** I did not test it. Tablet width is out of scope after Q1. `app/globals.css` has dark mode colors left over from the project template. I did not check their effect next to the MUI theme.
- **Stats tabs 库存健康, 商品表现 and 采购与供应.** I only skimmed their code.
- **Tests.** I read the test names and did not run them. Current coverage: `tests/unit/` covers the order page, order list components, sorting, stores and import parsers. `e2e/` covers the order page, categories and FIFO cost.
