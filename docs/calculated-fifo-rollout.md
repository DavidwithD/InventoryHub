# Calculated FIFO Rollout

Migration `CalculatedFifo` removes stored batch links, line costs and stock counters. It cannot be reversed by `dotnet ef`.

## Steps

1. Stop the API.
2. Back up the database:

   ```bash
   mysqldump --no-tablespaces --single-transaction inventory_hub > inventory_hub_backup.sql
   ```

3. Deploy the new code.
4. Apply the migration:

   ```bash
   cd InventoryHub.API
   dotnet ef database update
   ```

5. Start the API.

## Checks

Run these checks after the migration:

- `SELECT SUM(initial_stock) FROM inventory WHERE is_deleted = 0` equals the old stock plus the units sold.
- `SELECT SUM(quantity) FROM order_details WHERE is_deleted = 0` equals the old total.
- The orders page shows "未知" only for sales with no matching batch.

## Old data

The migration copies the old rows to `order_details_pre_fifo` and `inventory_pre_fifo`. Drop these tables after you accept the new numbers.

## Rollback

Stop the API. Restore the backup. Deploy the previous code.
