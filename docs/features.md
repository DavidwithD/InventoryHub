# Features

This document provides detailed descriptions of InventoryHub's features and how to use them.

## Overview

InventoryHub provides comprehensive inventory and order management with the following core capabilities:

| Feature | Description |
|---------|-------------|
| Inventory Management | Track stock levels across multiple products and purchase sources |
| Purchase Processing | Record purchases with multi-currency support |
| Order Management | Create and manage sales orders with cost tracking |
| Batch Import | Import orders from Mercari marketplace |
| Analytics Dashboard | View key metrics and statistics |
| Data Export | Export data to Excel/CSV formats |

---

## Dashboard

The dashboard provides an at-a-glance view of your business metrics.

### Statistics Cards

| Metric | Description | Calculation |
|--------|-------------|-------------|
| Total Inventory Value | Total value of current inventory | Sum of (stock_quantity × unit_cost) |
| Monthly Profit | Profit for current month | Sum of (revenue - total_cost - shipping_fee) |
| Total Orders | Total number of orders | Count of all orders |
| Orders Without Cost | Orders missing cost data | Count where total_cost is NULL |
| Low Stock Products | Products with low inventory | Count where stock_quantity < 5 |
| Monthly Orders | Orders this month | Count of orders in current month |

### Quick Navigation

The dashboard provides quick access to all modules:
- Orders
- Inventory
- Purchases
- Products
- Categories
- Suppliers

---

## Inventory Management

### Viewing Inventory

The inventory page displays all inventory items with:
- Product name and category
- Purchase information
- Cost per unit
- Current stock quantity
- Reference status (used in orders)

### Filtering Options

| Filter | Description |
|--------|-------------|
| Purchase | Filter by specific purchase order |
| Category | Filter products by category |
| Stock Status | Filter by low stock, in stock, out of stock |

### Creating Inventory Items

When creating inventory, you specify:

| Field | Description | Required |
|-------|-------------|----------|
| Product | Select from existing products | Yes |
| Purchase | Select the purchase order | Yes |
| Purchase Amount (JPY) | Cost in Japanese Yen | Yes |
| Purchase Amount (CNY) | Cost in Chinese Yuan | No |
| Quantity | Number of units | Yes |

**Automatic Calculations:**
- `unit_cost = purchase_amount_jpy / quantity`
- `stock_quantity = quantity` (initially equals purchase quantity)

### Batch Creation

For purchases with multiple products:
1. Select the purchase order
2. Add multiple rows with different products
3. Allocate amounts to each product
4. Save all items at once

**Validation:**
- Sum of all item amounts should equal purchase total
- Warning shown if amounts don't match

### Stock Updates

Stock is automatically updated when:
- Order details are created (stock decreases)
- Order details are updated (stock adjusts)
- Order details are deleted (stock restores)
- Orders are deleted (all detail stock restores)

### Reference Protection

Inventory items referenced by order details have restrictions:
- Cannot be deleted
- Stock cannot be reduced below used amount
- Warning displayed on edit

---

## Purchase Management

### Creating Purchases

Record new purchases with:

| Field | Description | Required |
|-------|-------------|----------|
| Supplier | Select from existing suppliers | Yes |
| Purchase Date | Date of purchase | Yes |
| Purchase No | Unique identifier (e.g., PO-2024-001) | Yes |
| Total Amount | Total purchase cost | Yes |
| Currency | JPY, CNY, USD, etc. | Yes |
| Exchange Rate | Rate to convert to JPY | Yes |

### Currency Support

| Currency | Code | Typical Use |
|----------|------|-------------|
| Japanese Yen | JPY | Primary currency |
| Chinese Yuan | CNY | Common purchase currency |
| US Dollar | USD | International purchases |

**Exchange Rate Handling:**
- Rate is captured at purchase time
- Used to calculate JPY equivalent for inventory
- Historical rates preserved for accuracy

### Purchase-Inventory Workflow

1. Create purchase with total amount and currency
2. Navigate to inventory
3. Add inventory items for this purchase
4. Allocate purchase amount to each product
5. System validates total allocation

---

## Order Management

### Order List

The orders page displays:
- Order number
- Item name and image
- Revenue
- Total cost
- Profit (revenue - cost - shipping)
- Transaction date

### Filtering and Search

| Filter | Description |
|--------|-------------|
| Date Range | Filter by transaction date |
| Search | Search by order number |
| Cost Status | Filter orders with/without cost data |

### Creating Orders

Basic order information:

| Field | Description | Required |
|-------|-------------|----------|
| Order No | Unique identifier | Yes |
| Name | Item/order name | No |
| Image URL | Product image | No |
| Revenue | Sales amount | Yes |
| Shipping Fee | Shipping cost | No |
| Transaction Time | When order occurred | Yes |

### Order Details (Line Items)

Each order can have multiple line items:

| Field | Description |
|-------|-------------|
| Category | Filter products by category |
| Product | Select the product |
| Inventory | Select specific inventory item |
| Quantity | Number of units |
| Packaging Cost | Additional packaging cost |
| Other Cost | Miscellaneous costs |
| Notes | Additional notes |

**Automatic Values:**
- `unit_price`: Snapshot from inventory.unit_cost
- `subtotal_cost`: (unit_price × quantity) + packaging_cost + other_cost

### Order Detail Editor

The order detail editor provides:
1. Order info card (read-only)
2. Multi-row editable table
3. Add/Remove row buttons
4. Real-time validation
5. Save all changes at once

**Validation Rules:**
- Quantity cannot exceed available stock
- At least one detail required
- Inventory item must be selected

### Stock Deduction

When order details are saved:
1. System validates stock availability
2. Deducts quantity from inventory
3. Snapshots unit cost to unit price
4. Calculates subtotal
5. Updates order total cost

---

## Mercari Import

### Overview

Import sold orders from Mercari marketplace using the browser's network request.

### How to Get cURL Command

1. Open Mercari seller dashboard
2. Go to transaction history (sold items)
3. Open browser developer tools (F12)
4. Go to Network tab
5. Find the API request for sold items
6. Right-click → Copy as cURL

### Import Process

1. Click "Import from Mercari" button
2. Paste the cURL command
3. Click "Import"
4. System processes all pages automatically

**Field Mapping:**

| Mercari Field | InventoryHub Field |
|--------------|-------------------|
| item.item_id | order_no |
| item.name | name |
| photo_thumbnail_url | image_url |
| sales_profit | revenue |
| transaction_finished_at | transaction_time |

### Import Results

After import, you'll see:
- Total orders found
- Successfully imported
- Skipped (already exist)
- Failed (with error details)

**Note:** Imported orders have no cost data. You'll need to add order details manually.

---

## Product Management

### Creating Products

| Field | Description | Required |
|-------|-------------|----------|
| Category | Product category | Yes |
| Name | Product name | Yes |

### Product-Category Relationship

- Each product belongs to one category
- Categories group related products
- Product selection shows category hierarchy

### Deletion Rules

- Cannot delete products with inventory
- Must delete/reassign inventory first
- Soft delete preserves history

---

## Category Management

### Creating Categories

| Field | Description | Required |
|-------|-------------|----------|
| Name | Category name (unique) | Yes |

### Category Usage

Categories are used for:
- Organizing products
- Filtering product selection
- Reporting and analytics

### Deletion Rules

- Cannot delete categories with products
- Must delete/reassign products first

---

## Supplier Management

### Creating Suppliers

| Field | Description | Required |
|-------|-------------|----------|
| Name | Supplier name (unique) | Yes |

### Supplier Usage

Suppliers/channels represent:
- Purchase sources (Taobao, 1688, Amazon)
- Vendors or wholesalers
- Platforms for procurement

### Deletion Rules

- Cannot delete suppliers with purchases
- Must delete/reassign purchases first

---

## Data Export

### Excel Export

Export data to Excel format (.xlsx):

1. Go to the desired page (Orders, Inventory, etc.)
2. Apply any filters
3. Click "Export to Excel"
4. File downloads automatically

**Exported Fields (Orders):**
- Order No
- Name
- Revenue
- Total Cost
- Profit
- Shipping Fee
- Transaction Date

### CSV Export

Export to CSV format for compatibility:

1. Click "Export" dropdown
2. Select "CSV"
3. File downloads with UTF-8 encoding

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl/Cmd + S | Save current form |
| Escape | Close dialog/cancel |
| Enter | Submit form |

---

## Mobile Support

InventoryHub is responsive and works on mobile devices:

- Collapsible sidebar navigation
- Touch-friendly buttons and inputs
- Responsive data tables
- Mobile-optimized dialogs

---

## Tips and Best Practices

### Inventory Management

1. **Create purchases first** - Always record the purchase before adding inventory
2. **Accurate exchange rates** - Use the rate at time of purchase
3. **Allocate carefully** - Ensure inventory amounts match purchase total

### Order Processing

1. **Check stock first** - Verify availability before creating orders
2. **Add details promptly** - Don't leave orders without cost data
3. **Use categories** - Filter products by category for faster selection

### Data Integrity

1. **Don't delete referenced items** - System prevents orphaned records
2. **Use soft delete** - Data can be recovered if needed
3. **Regular backups** - Back up your database regularly
