# API Reference

This document provides a complete reference for the InventoryHub REST API.

## Base URL

```
http://localhost:5022/api
```

## Common Response Formats

### Success Response

```json
{
  "id": 1,
  "field": "value"
}
```

### List Response

```json
[
  { "id": 1, "field": "value" },
  { "id": 2, "field": "value" }
]
```

### Error Response

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "Error description"
}
```

## HTTP Status Codes

| Code | Description                    |
| ---- | ------------------------------ |
| 200  | Success                        |
| 201  | Created                        |
| 204  | No Content (successful delete) |
| 400  | Bad Request (validation error) |
| 404  | Not Found                      |
| 500  | Internal Server Error          |

---

## Orders

### List Orders

```http
GET /api/orders
```

**Query Parameters:**

| Parameter   | Type | Description                               |
| ----------- | ---- | ----------------------------------------- |
| `startDate` | date | Filter orders from this date (inclusive)  |
| `endDate`   | date | Filter orders until this date (inclusive) |

**Response:**

```json
[
  {
    "id": 1,
    "orderNo": "m12345678",
    "name": "Wireless Earbuds",
    "imageUrl": "https://example.com/image.jpg",
    "revenue": 3500.0,
    "totalCost": 1200.0,
    "shippingFee": 200.0,
    "transactionTime": "2024-01-15T10:30:00"
  }
]
```

---

### Get Order

```http
GET /api/orders/{id}
```

**Response:**

```json
{
  "id": 1,
  "orderNo": "m12345678",
  "name": "Wireless Earbuds",
  "imageUrl": "https://example.com/image.jpg",
  "revenue": 3500.0,
  "totalCost": 1200.0,
  "shippingFee": 200.0,
  "transactionTime": "2024-01-15T10:30:00"
}
```

---

### Create Order

```http
POST /api/orders
```

**Request Body:**

```json
{
  "orderNo": "m12345678",
  "name": "Wireless Earbuds",
  "imageUrl": "https://example.com/image.jpg",
  "revenue": 3500.0,
  "shippingFee": 200.0,
  "transactionTime": "2024-01-15T10:30:00",
  "details": [
    {
      "inventoryId": 1,
      "productId": 1,
      "quantity": 2,
      "packagingCost": 50.0,
      "otherCost": 0
    }
  ]
}
```

**Response:** `201 Created` with created order

---

### Update Order

```http
PUT /api/orders/{id}
```

**Request Body:**

```json
{
  "name": "Updated Name",
  "revenue": 4000.0,
  "shippingFee": 250.0
}
```

**Response:** Updated order object

---

### Delete Order

```http
DELETE /api/orders/{id}
```

**Response:** `204 No Content`

---

### Get Order Details

```http
GET /api/orders/{orderId}/details
```

**Response:**

```json
[
  {
    "id": 1,
    "orderId": 1,
    "inventoryId": 5,
    "productId": 3,
    "productName": "Wireless Earbuds",
    "categoryName": "Electronics",
    "unitPrice": 537.5,
    "quantity": 2,
    "packagingCost": 50.0,
    "otherCost": 0,
    "subtotalCost": 1125.0,
    "notes": null,
    "availableStock": 8
  }
]
```

---

### Create Order Detail

```http
POST /api/orders/details
```

**Request Body:**

```json
{
  "orderId": 1,
  "inventoryId": 5,
  "productId": 3,
  "quantity": 2,
  "packagingCost": 50.0,
  "otherCost": 0,
  "notes": "Gift wrap"
}
```

**Response:** `201 Created` with created detail

**Note:** This will automatically:

- Snapshot `unit_price` from inventory
- Calculate `subtotal_cost`
- Deduct `stock_quantity` from inventory
- Update order's `total_cost`

---

### Update Order Detail

```http
PUT /api/orders/details/{id}
```

**Request Body:**

```json
{
  "inventoryId": 5,
  "productId": 3,
  "quantity": 3,
  "packagingCost": 75.0,
  "otherCost": 0,
  "notes": "Updated notes"
}
```

**Response:** Updated detail object

**Note:** Stock will be adjusted (rollback old quantity, apply new quantity)

---

### Delete Order Detail

```http
DELETE /api/orders/details/{id}
```

**Response:** `204 No Content`

**Note:** Stock will be returned to inventory

---

### Import Orders from Mercari

```http
POST /api/orders/import-from-curl
```

**Request Body:**

```json
{
  "curlCommand": "curl 'https://api.mercari.jp/...' -H 'Authorization: Bearer ...'"
}
```

**Response:**

```json
{
  "total": 150,
  "success": 145,
  "skipped": 5,
  "failed": 0,
  "errors": []
}
```

---

## Inventory

### List Inventory

```http
GET /api/inventory
```

**Query Parameters:** None

**Response:**

```json
[
  {
    "id": 1,
    "productId": 3,
    "productName": "Wireless Earbuds",
    "categoryId": 1,
    "categoryName": "Electronics",
    "purchaseNo": "PO-2024-001",
    "purchaseQuantity": 10,
    "priceJpy": 537.5,
    "priceCny": 25.0,
    "stockQuantity": 8,
    "supplierId": 1,
    "purchaseDate": "2024-01-15T00:00:00",
    "currencyType": "JPY",
    "exchangeRate": 1.0,
    "isReferenced": true,
    "createdAt": "2024-01-15T10:00:00",
    "updatedAt": "2024-01-16T09:00:00"
  }
]
```

---

### Get Inventory Item

```http
GET /api/inventory/{id}
```

**Response:** Single inventory object (same shape as list item)

---

### Create Inventory Item

```http
POST /api/inventory
```

**Request Body:**

```json
{
  "productId": 3,
  "purchaseQuantity": 10,
  "stockQuantity": 10,
  "priceJpy": 537.5,
  "priceCny": 25.0,
  "supplierId": 1,
  "purchaseDate": "2024-01-15T00:00:00",
  "purchaseNo": "PO-2024-001",
  "currencyType": "JPY",
  "exchangeRate": 1.0
}
```

**Response:** `201 Created` with created inventory item

---

### Batch Create Inventory

```http
POST /api/inventory/batch
```

**Request Body:**

```json
{
  "items": [
    {
      "productId": 3,
      "purchaseQuantity": 10,
      "stockQuantity": 10,
      "priceJpy": 537.5,
      "purchaseNo": "PO-2024-001"
    },
    {
      "productId": 4,
      "purchaseQuantity": 5,
      "stockQuantity": 5,
      "priceJpy": 430.0
    }
  ]
}
```

**Response:** Array of created inventory items

---

### Update Inventory Item

```http
PUT /api/inventory/{id}
```

**Request Body:**

```json
{
  "productId": 3,
  "purchaseQuantity": 10,
  "stockQuantity": 7,
  "priceJpy": 550.0,
  "priceCny": 26.0
}
```

**Response:** Updated inventory object

**Note:** Updates may be restricted if the item is referenced in order details

---

### Delete Inventory Item

```http
DELETE /api/inventory/{id}
```

**Response:** `204 No Content` or `400 Bad Request` if referenced

---

## Purchases

### List Purchases

```http
GET /api/purchases
```

**Response:**

```json
[
  {
    "id": 1,
    "supplierId": 1,
    "supplierName": "Taobao",
    "purchaseDate": "2024-01-15",
    "purchaseNo": "PO-2024-001",
    "totalAmount": 500.0,
    "currencyType": "CNY",
    "exchangeRate": 21.5
  }
]
```

---

### Get Purchase

```http
GET /api/purchases/{id}
```

**Response:** Single purchase object

---

### Create Purchase

```http
POST /api/purchases
```

**Request Body:**

```json
{
  "supplierId": 1,
  "purchaseDate": "2024-01-15",
  "purchaseNo": "PO-2024-001",
  "totalAmount": 500.0,
  "currencyType": "CNY",
  "exchangeRate": 21.5
}
```

**Response:** `201 Created`

---

### Update Purchase

```http
PUT /api/purchases/{id}
```

**Request Body:**

```json
{
  "supplierId": 1,
  "purchaseDate": "2024-01-16",
  "totalAmount": 550.0,
  "currencyType": "CNY",
  "exchangeRate": 21.75
}
```

**Response:** Updated purchase object

---

### Delete Purchase

```http
DELETE /api/purchases/{id}
```

**Response:** `204 No Content` or `400 Bad Request` if has inventory

---

## Products

### List Products

```http
GET /api/products
```

**Response:**

```json
[
  {
    "id": 1,
    "categoryId": 1,
    "categoryName": "Electronics",
    "name": "Wireless Earbuds"
  }
]
```

---

### Get Product

```http
GET /api/products/{id}
```

**Response:** Single product object

---

### Create Product

```http
POST /api/products
```

**Request Body:**

```json
{
  "categoryId": 1,
  "name": "Wireless Earbuds"
}
```

**Response:** `201 Created`

---

### Update Product

```http
PUT /api/products/{id}
```

**Request Body:**

```json
{
  "categoryId": 1,
  "name": "Bluetooth Earbuds"
}
```

**Response:** Updated product object

---

### Delete Product

```http
DELETE /api/products/{id}
```

**Response:** `204 No Content` or `400 Bad Request` if has inventory

---

## Categories

### List Categories

```http
GET /api/categories
```

**Response:**

```json
[
  {
    "id": 1,
    "name": "Electronics",
    "productCount": 15
  }
]
```

---

### Get Category

```http
GET /api/categories/{id}
```

**Response:** Single category object

---

### Create Category

```http
POST /api/categories
```

**Request Body:**

```json
{
  "name": "Electronics"
}
```

**Response:** `201 Created`

---

### Update Category

```http
PUT /api/categories/{id}
```

**Request Body:**

```json
{
  "name": "Consumer Electronics"
}
```

**Response:** Updated category object

---

### Delete Category

```http
DELETE /api/categories/{id}
```

**Response:** `204 No Content` or `400 Bad Request` if has products

---

## Suppliers

### List Suppliers

```http
GET /api/suppliers
```

**Response:**

```json
[
  {
    "id": 1,
    "name": "Taobao",
    "purchaseCount": 25
  }
]
```

---

### Get Supplier

```http
GET /api/suppliers/{id}
```

**Response:** Single supplier object

---

### Create Supplier

```http
POST /api/suppliers
```

**Request Body:**

```json
{
  "name": "Taobao"
}
```

**Response:** `201 Created`

---

### Update Supplier

```http
PUT /api/suppliers/{id}
```

**Request Body:**

```json
{
  "name": "Taobao Global"
}
```

**Response:** Updated supplier object

---

### Delete Supplier

```http
DELETE /api/suppliers/{id}
```

**Response:** `204 No Content` or `400 Bad Request` if has purchases

---

## Dashboard

### Get Statistics

```http
GET /api/dashboard/stats
```

**Response:**

```json
{
  "totalInventoryValue": 125000.0,
  "monthlyProfit": 45000.0,
  "totalOrdersCount": 350,
  "ordersWithoutCostCount": 12,
  "lowStockProductsCount": 5,
  "monthlyOrdersCount": 45
}
```

**Calculations:**

- `totalInventoryValue`: Sum of (stock_quantity × unit_cost) for all inventory
- `monthlyProfit`: Sum of (revenue - total_cost - shipping_fee) for current month orders
- `lowStockProductsCount`: Products with stock_quantity < 5

---

## Error Handling

### Validation Errors

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "One or more validation errors occurred.",
  "status": 400,
  "errors": {
    "Name": ["The Name field is required."],
    "Quantity": ["Quantity must be greater than 0."]
  }
}
```

### Not Found

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.4",
  "title": "Not Found",
  "status": 404,
  "detail": "Order with ID 999 not found"
}
```

### Business Rule Violation

```json
{
  "type": "https://tools.ietf.org/html/rfc7231#section-6.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "Cannot delete category with existing products"
}
```

---

## Rate Limiting

Currently, no rate limiting is implemented. For production use, consider adding rate limiting middleware.

## Authentication

Currently, the API is unauthenticated. For production use, implement JWT or OAuth 2.0 authentication.

## CORS

CORS is configured to allow requests from the frontend application. Update `Program.cs` to modify allowed origins.
