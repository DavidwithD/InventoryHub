# Stats Page Design Proposal

> **Status:** Design discussion — not yet in implementation planning.

---

## Database Schema (relevant to stats)

See [Database Schema](database-schema.md) for the tables and columns.

Stock and line costs are not stored. See [FIFO Calculation](architecture.md#6-fifo-calculation).

**Key derived metrics:**
- **Unit cost** = `price_jpy`
- **Line cost** = FIFO batch cost + `packaging_cost` + `other_cost`
- **Order profit** = `revenue − sum(line costs)`. Profit totals skip orders with unmatched units.
- **Line revenue** = order `revenue × line quantity / order quantity`. Category and product revenue add up line revenue.
- **Product profit** = `sum(line revenue − line cost)` over lines with no unmatched units
- **Stock value** = `sum(calculated stock × price_jpy)` across all inventory lots
- **Margin %** = profit / revenue of the orders that profit counts

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
| Current Stock Value | sum(calculated stock × price_jpy) | always live, unfiltered |
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
- **Turnover rate** per category — `units_sold / avg calculated stock` over the period; helps decide between stock value and capital lock-up
- **Dead stock** — calculated stock > 0 but zero sales in last N days (default window TBD, user-adjustable: 30 / 60 / 90d)
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
- Spending over time by supplier — `price_jpy × purchase_quantity` from `Inventory`, grouped by `Inventory.supplier_id`
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
