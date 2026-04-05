# Remove Purchases — Phase 2 Checklist

## Status

**Phase 1 — DONE.** Inventory fields restructured and deployed:

- Old fields removed from `inventory`: `purchase_id`, `purchase_amount`, `purchase_amount_cny`, `unit_cost`
- New fields added: `price_jpy`, `price_cny`
- Denormalized purchase fields added to `inventory`: `supplier_id`, `purchase_date`, `purchase_no`, `currency_type`, `exchange_rate`
- Migration applied: `20260405055617_RemovePurchaseFieldsAddPriceFields`

**Phase 2 — PENDING.** Drop the `purchases` table and remove all purchase backend code.

---

## Before Phase 2: Backfill production data

The denormalized fields on `inventory` rows that were created before the migration will be `NULL`. Run the backfill to populate them from the `purchases` table (while it still exists).

### 1. Take a DB backup

```bash
mysqldump -u <user> -p <dbname> purchases inventory > pre_drop_purchases.sql
```

### 2. Run the backfill SQL

```bash
mysql -u <user> -p <dbname> < docs/backfill-purchases-to-inventory.sql
```

### 3. Verify backfill completeness

```sql
-- Should return 0
SELECT COUNT(*) AS missing_backfill
FROM inventory
WHERE (supplier_id IS NULL OR purchase_date IS NULL);
```

Check per-purchase total consistency (investigate rows > tolerance):

```sql
SELECT p.id, p.total_amount, IFNULL(SUM(i.price_jpy * i.purchase_quantity), 0) AS inventory_sum_jpy
FROM purchases p
LEFT JOIN inventory i ON i.purchase_no = p.purchase_no
GROUP BY p.id
HAVING ABS(p.total_amount - IFNULL(SUM(i.price_jpy * i.purchase_quantity), 0)) > 1;
```

---

## Phase 2: Destructive cleanup

Only after the backfill is verified:

### Backend

1. Delete `PurchasesController.cs`
2. Delete `Services/PurchaseService.cs` and `Services/IPurchaseService.cs`
3. Delete `DTOs/PurchaseDto.cs`
4. Delete `Models/Purchase.cs`
5. Remove `IPurchaseService` registration from `Program.cs`
6. Remove `Purchases` DbSet and any purchase mappings from `AppDbContext.cs`
7. Remove purchase mapping entries from `MappingProfile.cs`
8. Create and apply a new EF migration to drop the `purchases` table

```bash
dotnet ef migrations add DropPurchasesTable
dotnet ef database update
```

### Frontend

9. Remove the `purchases` route/page if still present
10. Remove any remaining `Purchase`-related types from `types/index.ts`
11. Remove navigation links pointing to `/purchases`

### Verification after Phase 2

- `dotnet build` — no compile errors
- `npm run build` — no TypeScript errors
- `GET /api/inventory` — returns `priceJpy`, `priceCny`, denormalized purchase fields
- Dashboard, orders, and inventory pages load
- No `/api/purchases` endpoints respond (404)

### Rollback

If Phase 2 fails before migration, roll back the app. If migration was applied, restore from `pre_drop_purchases.sql`.

---

## Success criteria

- No backend endpoints serving `purchases`
- `purchases` table dropped
- All inventory rows have `supplier_id` and `purchase_date` populated (where applicable)
- Orders and dashboard continue to function correctly
