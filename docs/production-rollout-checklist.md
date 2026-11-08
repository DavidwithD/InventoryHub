# Remove Purchases — Phase 2 Checklist

## Status

**Phase 1 — DONE.** Inventory fields restructured and deployed:

- Old fields removed from `inventory`: `purchase_id`, `purchase_amount`, `purchase_amount_cny`, `unit_cost`
- New fields added: `price_jpy`, `price_cny`
- Purchase fields added to `inventory`: `supplier_id`, `purchase_date`, `purchase_no`
- Migrations applied: `20260405055617_RemovePurchaseFieldsAddPriceFields`, `20260405070413_RemoveCurrencyTypeAndExchangeRateFromInventory`

**Phase 2 — CODE DONE, NOT DEPLOYED.** The purchase backend code is removed. The migration `DropPurchasesTable` drops the `purchases` table. Run the steps below to deploy it.

The Purchase & Supply stats tab now reads from `inventory`. See [Stats page design](stats-page-design.md#3-purchase--supply).

---

## Before the migration

### 1. Take a DB backup

```bash
mysqldump -u <user> -p <dbname> purchases inventory > pre_drop_purchases.sql
```

### 2. Check that inventory rows have purchase data

Phase 1 dropped `inventory.purchase_id`. There is no column left to copy data from `purchases` into `inventory`. Rows with empty fields stay empty.

```sql
-- Should return 0
SELECT COUNT(*) AS missing
FROM inventory
WHERE is_deleted = 0 AND (supplier_id IS NULL OR purchase_date IS NULL);
```

If the count is above 0, fix those rows by hand before you continue. A batch with no `purchase_date` goes last in the FIFO order.

---

## Deploy

1. Deploy the API and the frontend.
2. Apply the migration:

```bash
dotnet ef database update
```

### Verification

- `GET /api/inventory` returns `priceJpy`, `priceCny`, `supplierId`, `purchaseDate` and `purchaseNo`
- `GET /api/stats/purchases` returns data, and the Purchase & Supply tab shows charts
- Dashboard, orders and inventory pages load
- `/api/purchases` returns 404

### Rollback

If the migration fails, roll back the app.

If the migration was applied:

1. Roll back the app.
2. Restore the tables:

```bash
mysql -u <user> -p <dbname> < pre_drop_purchases.sql
```

3. Remove the migration from the EF history. Without this step, EF still treats the table as dropped.

```sql
DELETE FROM __EFMigrationsHistory WHERE MigrationId = '20261108115107_DropPurchasesTable';
```

The restore also resets `inventory` to the backup. Batches added after the backup are lost.

---

## Success criteria

- No backend endpoints serve `purchases`
- The `purchases` table is dropped
- All inventory rows have `supplier_id` and `purchase_date`
- Orders, dashboard and stats work
