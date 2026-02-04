# Database Schema

This document describes the database structure, tables, relationships, and constraints in InventoryHub.

## Entity Relationship Diagram

```
┌──────────────┐
│  Categories  │
├──────────────┤
│ PK id        │
│    name      │◄─────────────────────┐
└──────────────┘                      │
                                      │ category_id (FK)
                                      │
┌──────────────┐         ┌────────────┴───┐         ┌──────────────┐
│  Suppliers   │         │    Products    │         │  Purchases   │
├──────────────┤         ├────────────────┤         ├──────────────┤
│ PK id        │◄──┐     │ PK id          │         │ PK id        │◄──┐
│    name      │   │     │ FK category_id │         │ FK supplier_id│   │
└──────────────┘   │     │    name        │         │    purchase_no│   │
                   │     └────────┬───────┘         │    total_amount   │
                   │              │                 │    currency_type  │
                   │              │ product_id (FK) │    exchange_rate  │
                   │              │                 └──────────┬───────┘
                   │              │                            │
                   │              │         purchase_id (FK)   │
                   │              │                            │
                   │              ▼                            ▼
                   │     ┌────────────────────────────────────────┐
                   │     │              Inventory                 │
                   │     ├────────────────────────────────────────┤
                   │     │ PK id                                  │
                   │     │ FK product_id                          │
                   │     │ FK purchase_id                         │
                   │     │    purchase_amount_jpy                 │
                   │     │    purchase_amount_cny                 │
                   │     │    purchase_quantity                   │
                   │     │    unit_cost                           │
                   │     │    stock_quantity                      │
                   └─────┤                                        │
                         └──────────────────┬─────────────────────┘
                                            │
                                            │ inventory_id (FK)
                                            │
┌──────────────┐                            ▼
│    Orders    │         ┌────────────────────────────────────────┐
├──────────────┤         │            OrderDetails                │
│ PK id        │◄────────┤────────────────────────────────────────┤
│    order_no  │         │ PK id                                  │
│    name      │         │ FK order_id                            │
│    image_url │         │ FK inventory_id                        │
│    revenue   │         │ FK product_id                          │
│    total_cost│         │    unit_price (snapshot)               │
│    shipping  │         │    quantity                            │
│    trans_time│         │    packaging_cost                      │
└──────────────┘         │    other_cost                          │
                         │    subtotal_cost                       │
                         │    notes                               │
                         └────────────────────────────────────────┘
```

## Tables

### Categories

Master table for product categories.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE | Category name |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |
| `is_deleted` | BOOLEAN | DEFAULT FALSE | Soft delete flag |

**Indexes:**
- PRIMARY KEY (`id`)
- UNIQUE (`name`)

---

### Suppliers

Master table for suppliers/vendors.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE | Supplier name |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |
| `is_deleted` | BOOLEAN | DEFAULT FALSE | Soft delete flag |

**Indexes:**
- PRIMARY KEY (`id`)
- UNIQUE (`name`)

---

### Products

Product catalog linked to categories.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| `category_id` | INT | FOREIGN KEY → categories.id | Product category |
| `name` | VARCHAR(200) | NOT NULL | Product name |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |
| `is_deleted` | BOOLEAN | DEFAULT FALSE | Soft delete flag |

**Indexes:**
- PRIMARY KEY (`id`)
- INDEX (`category_id`)

**Foreign Keys:**
- `category_id` → `categories.id` (ON DELETE RESTRICT)

---

### Purchases

Purchase orders from suppliers with currency information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| `supplier_id` | INT | FOREIGN KEY → suppliers.id | Supplier reference |
| `purchase_date` | DATE | NOT NULL | Date of purchase |
| `purchase_no` | VARCHAR(100) | NOT NULL, UNIQUE | Purchase order number |
| `total_amount` | DECIMAL(15,2) | NOT NULL | Total purchase amount |
| `currency_type` | VARCHAR(10) | NOT NULL | Currency code (JPY, CNY, USD) |
| `exchange_rate` | DECIMAL(10,4) | NOT NULL | Exchange rate to base currency |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |
| `is_deleted` | BOOLEAN | DEFAULT FALSE | Soft delete flag |

**Indexes:**
- PRIMARY KEY (`id`)
- UNIQUE (`purchase_no`)
- INDEX (`supplier_id`)
- INDEX (`purchase_date`)

**Foreign Keys:**
- `supplier_id` → `suppliers.id` (ON DELETE RESTRICT)

---

### Inventory

Inventory items linked to products and purchases.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| `product_id` | INT | FOREIGN KEY → products.id | Product reference |
| `purchase_id` | INT | FOREIGN KEY → purchases.id | Purchase reference |
| `purchase_amount_jpy` | DECIMAL(15,2) | NOT NULL | Purchase amount in JPY |
| `purchase_amount_cny` | DECIMAL(15,2) | NULL | Purchase amount in CNY |
| `purchase_quantity` | INT | NOT NULL | Quantity purchased |
| `unit_cost` | DECIMAL(15,2) | NOT NULL | Cost per unit (calculated) |
| `stock_quantity` | INT | NOT NULL, CHECK >= 0 | Current available stock |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |
| `is_deleted` | BOOLEAN | DEFAULT FALSE | Soft delete flag |

**Indexes:**
- PRIMARY KEY (`id`)
- INDEX (`product_id`)
- INDEX (`purchase_id`)

**Foreign Keys:**
- `product_id` → `products.id` (ON DELETE RESTRICT)
- `purchase_id` → `purchases.id` (ON DELETE RESTRICT)

**Calculated Field:**
```
unit_cost = (purchase_amount_jpy * exchange_rate) / purchase_quantity
```

---

### Orders

Sales orders with revenue and cost tracking.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| `order_no` | VARCHAR(100) | NOT NULL, UNIQUE | Order number |
| `name` | VARCHAR(200) | NULL | Order/item name |
| `image_url` | VARCHAR(500) | NULL | Product image URL |
| `revenue` | DECIMAL(15,2) | NOT NULL | Sales revenue |
| `total_cost` | DECIMAL(15,2) | NULL | Total cost (calculated) |
| `shipping_fee` | DECIMAL(15,2) | NULL | Shipping fee |
| `transaction_time` | DATETIME | NOT NULL | Transaction timestamp |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |
| `is_deleted` | BOOLEAN | DEFAULT FALSE | Soft delete flag |

**Indexes:**
- PRIMARY KEY (`id`)
- UNIQUE (`order_no`)
- INDEX (`transaction_time`)
- INDEX (`total_cost`, `transaction_time`)

**Business Logic:**
- `total_cost = NULL` indicates order details not yet entered
- `profit = revenue - total_cost - shipping_fee`

---

### OrderDetails

Line items for orders with cost breakdown.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | Unique identifier |
| `order_id` | INT | FOREIGN KEY → orders.id | Order reference |
| `inventory_id` | INT | FOREIGN KEY → inventory.id | Inventory reference |
| `product_id` | INT | FOREIGN KEY → products.id | Product reference |
| `unit_price` | DECIMAL(15,2) | NOT NULL | Unit cost (snapshot) |
| `quantity` | INT | NOT NULL | Quantity ordered |
| `packaging_cost` | DECIMAL(15,2) | DEFAULT 0 | Packaging cost |
| `other_cost` | DECIMAL(15,2) | DEFAULT 0 | Other costs |
| `subtotal_cost` | DECIMAL(15,2) | NOT NULL | Line item total |
| `notes` | TEXT | NULL | Additional notes |
| `created_at` | DATETIME | DEFAULT CURRENT_TIMESTAMP | Creation timestamp |
| `updated_at` | DATETIME | ON UPDATE CURRENT_TIMESTAMP | Last update timestamp |
| `is_deleted` | BOOLEAN | DEFAULT FALSE | Soft delete flag |

**Indexes:**
- PRIMARY KEY (`id`)
- INDEX (`order_id`)
- INDEX (`inventory_id`)
- INDEX (`product_id`)
- INDEX (`order_id`, `inventory_id`)

**Foreign Keys:**
- `order_id` → `orders.id` (ON DELETE CASCADE)
- `inventory_id` → `inventory.id` (ON DELETE RESTRICT)
- `product_id` → `products.id` (ON DELETE RESTRICT)

**Calculated Field:**
```
subtotal_cost = (unit_price * quantity) + packaging_cost + other_cost
```

## Soft Delete Implementation

All tables include an `is_deleted` boolean column that enables soft deletion:

```sql
-- Query pattern (automatically applied by EF Core)
SELECT * FROM products WHERE is_deleted = FALSE;

-- Soft delete operation
UPDATE products SET is_deleted = TRUE WHERE id = 123;
```

Benefits:
- Data recovery capability
- Audit trail preservation
- Referential integrity maintained

## Currency and Exchange Rate Handling

### Storage Strategy

1. **Purchase Level**: Exchange rate captured at purchase time
   ```
   purchases.currency_type = 'CNY'
   purchases.exchange_rate = 21.5 (CNY to JPY)
   ```

2. **Inventory Level**: JPY amount stored for consistency
   ```
   inventory.purchase_amount_jpy = amount * exchange_rate
   inventory.unit_cost = purchase_amount_jpy / purchase_quantity
   ```

3. **Order Detail Level**: Unit cost snapshot preserved
   ```
   order_details.unit_price = inventory.unit_cost (at order time)
   ```

### Supported Currencies

| Code | Currency | Notes |
|------|----------|-------|
| JPY | Japanese Yen | Primary currency |
| CNY | Chinese Yuan | Common purchase currency |
| USD | US Dollar | Optional |

## Database Constraints

### Check Constraints

```sql
-- Inventory stock cannot go negative
ALTER TABLE inventory ADD CONSTRAINT chk_stock_positive
CHECK (stock_quantity >= 0);

-- Order detail quantity must be positive
ALTER TABLE order_details ADD CONSTRAINT chk_quantity_positive
CHECK (quantity > 0);
```

### Unique Constraints

| Table | Column(s) | Purpose |
|-------|-----------|---------|
| categories | name | Prevent duplicate categories |
| suppliers | name | Prevent duplicate suppliers |
| purchases | purchase_no | Unique purchase order numbers |
| orders | order_no | Unique order numbers |

### Foreign Key Behavior

| Relationship | ON DELETE | Reason |
|--------------|-----------|--------|
| products → categories | RESTRICT | Prevent orphaned products |
| purchases → suppliers | RESTRICT | Preserve purchase history |
| inventory → products | RESTRICT | Preserve inventory history |
| inventory → purchases | RESTRICT | Preserve cost tracking |
| order_details → orders | CASCADE | Delete details with order |
| order_details → inventory | RESTRICT | Preserve cost history |

## Sample Data

### Categories
```sql
INSERT INTO categories (name) VALUES
('Electronics'), ('Clothing'), ('Accessories');
```

### Suppliers
```sql
INSERT INTO suppliers (name) VALUES
('Taobao'), ('1688'), ('Amazon JP');
```

### Products
```sql
INSERT INTO products (category_id, name) VALUES
(1, 'Wireless Earbuds'),
(1, 'Phone Case'),
(2, 'T-Shirt'),
(3, 'Watch Band');
```

### Purchases
```sql
INSERT INTO purchases (supplier_id, purchase_date, purchase_no, total_amount, currency_type, exchange_rate)
VALUES (1, '2024-01-15', 'PO-2024-001', 500.00, 'CNY', 21.50);
```

### Inventory
```sql
INSERT INTO inventory (product_id, purchase_id, purchase_amount_jpy, purchase_quantity, unit_cost, stock_quantity)
VALUES (1, 1, 5375.00, 10, 537.50, 10);
-- unit_cost = 500 CNY * 21.50 / 10 = 1075 JPY / 2 = 537.50 JPY per unit
```

## Migration Notes

### Entity Framework Core

Migrations are managed via EF Core:

```bash
# Create migration
dotnet ef migrations add InitialCreate

# Apply migration
dotnet ef database update

# Generate SQL script
dotnet ef migrations script
```

### Schema Changes

When modifying schema:
1. Update entity model in `Models/`
2. Update DbContext configuration if needed
3. Create migration: `dotnet ef migrations add <MigrationName>`
4. Review generated migration
5. Apply: `dotnet ef database update`
