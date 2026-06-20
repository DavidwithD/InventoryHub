# Stats Page Design Proposal

> **Status:** Design discussion — not yet in implementation planning.

---

## Database Schema (relevant to stats)

| Table | Key fields |
|---|---|
| Orders | revenue, shipping_fee, transaction_time, order_no, name, image_url |
| OrderDetails | unit_price, quantity, packaging_cost, other_cost, subtotal_cost, inventory_id, product_id, order_id |
| Inventory | price_jpy, price_cny (nullable), purchase_quantity, stock_quantity, supplier_id (nullable, denorm), purchase_date (nullable, denorm), purchase_no (nullable, denorm), product_id |
| Purchases | total_amount, purchase_date, currency_type, exchange_rate, supplier_id, purchase_no |
| Products | name, category_id, image_url (nullable) |
| Categories | name |
| Suppliers | name |

> **Note:** `Inventory` no longer FK's into `Purchases`. Purchase context (supplier, date, no.) is denormalized directly onto each inventory row. The `Purchases` table is now standalone — useful for purchase-level spend tracking, but inventory stats derive everything from the Inventory table itself.

**Key derived metrics:**
- **Unit cost** = `price_jpy / purchase_quantity` (no longer a stored field)
- **Profit per line** = `(unit_price − price_jpy/purchase_quantity) × quantity − packaging_cost − other_cost`
- **Order profit** = `revenue − shipping_fee − sum(line profits)`
- **Stock value** = `sum(stock_quantity × (price_jpy / purchase_quantity))` across all inventory lots
- **Margin %** = profit / revenue

---

## Page Architecture

### Main Dashboard

Single page with a **global date range filter** (presets: 7d / 30d / 3m / 1y / custom).

#### KPI Cards (top row)
Each date-filtered card shows a **period-over-period comparison** (e.g. ↑12% vs prev period) alongside the main value.

| Card | Metric | Note |
|---|---|---|
| Total Revenue | sum of `orders.revenue` | date-filtered + % change |
| Total Profit | revenue − all costs | date-filtered + % change |
| Avg Profit Margin % | profit / revenue | date-filtered + % change |
| Orders Count | count of orders | date-filtered + % change |
| Avg Order Value | revenue / orders count | date-filtered + % change |
| Current Stock Value | sum(stock_qty × unit_cost) | always live, unfiltered |
| Low Stock Items | count of products near zero | always live, unfiltered |

#### Charts
1. **Revenue vs. Profit trend** — dual-line or stacked bar; granularity toggle: daily / weekly / monthly
2. **Top 5 Products by Revenue** — horizontal bar; clickable → navigates to Product Performance page
3. **Sales by Category** — donut or bar chart

---

### Separate Pages

#### 1. Inventory Health
Operational view — not strictly date-filtered like sales.

- Stock level per product — table + visual progress bar
- Stock value ranked by category
- **Turnover rate** per category — `units_sold / avg_stock_quantity` over the period; helps decide between stock value and capital lock-up
- **Dead stock** — `stock_quantity > 0` but zero sales in last N days (default window TBD, user-adjustable: 30 / 60 / 90d)
- **Slow movers** — low sales velocity relative to remaining stock
- **Time to sell** — avg days from `purchase_date` to `transaction_time` per product; shows how long stock typically sits before moving
- Capital lock-up by category (value of dead stock + slow movers only, not total stock)

#### 2. Product Performance
Per-product deep dive with search + filter by category.

- Revenue, profit, margin %, units sold — per product
- Sortable table with optional sparkline trend column
- Best margin vs. worst margin comparison
- Unsold products — in inventory but never appeared in an OrderDetail

#### 3. Purchase & Supply
- Spending over time by supplier — sourced from `Inventory.price_jpy` grouped by `Inventory.supplier_id` (denormalized), or from the `Purchases` table directly for purchase-level totals
- Exchange rate history — from `Purchases.exchange_rate` over `Purchases.purchase_date`
- Average unit cost trend per product — `price_jpy / purchase_quantity` over `Inventory.purchase_date`, grouped by product
- Supplier concentration — % of total spend per supplier

---

## Interactions

| Interaction | Where |
|---|---|
| Global date range filter | All pages (except live stock metrics) |
| Granularity toggle (day/week/month) | Trend charts |
| Hover tooltip with exact values | All charts |
| Click product/category → navigate to detail page | Dashboard charts |
| Sortable columns | All tables |
| Search + filter by category | Product Performance table |
| Section anchor links | Long pages (Inventory Health) |
| Low-stock badge/alert | Dashboard KPI card + Inventory page |

---

## Decisions Made

- **Navigation** — Stats is one top-nav item with sub-tabs: Dashboard | Inventory Health | Product Performance | Purchase & Supply
- **Soft-deleted records** — excluded from all stats calculations

## Open Questions (to resolve before implementation)

1. **Profit definition** — should shipping fee be split across OrderDetails proportionally, or deducted at order level only?
2. **Low stock threshold** — fixed quantity, or % of original purchase quantity?
3. **Exchange rate / profit calculation** — `price_jpy` is the locked-in JPY cost at purchase time; all profit calculations use this. `price_cny` and `exchange_rate` (on Purchases) are available for historical display but not used in profit math. Still confirm this is the intended approach.
4. **Chart library** — already using one (Recharts, Chart.js, ApexCharts)?
5. **Priority** — sales insights vs. inventory health as the primary daily-use view?
