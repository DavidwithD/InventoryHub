// PreviewRow (Pinduoduo import)
export interface PreviewRow {
  purchaseNo: string;
  purchaseDate: string;
  productName: string;
  purchasePriceCny: number;
  purchaseAmount: number;
  thumbUrl: string;
}

// Base Entity
export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

// Category
export interface Category extends BaseEntity {
  name: string;
}

// Supplier
export interface Supplier extends BaseEntity {
  name: string;
}

// Product
export interface Product extends BaseEntity {
  categoryId: number;
  categoryName: string;
  name: string;
  imageUrl?: string;
}

// Purchase
export interface Purchase extends BaseEntity {
  supplierId: number;
  supplierName: string;
  purchaseDate: string;
  purchaseNo: string;
  totalAmount: number;
  currencyType: string;
  exchangeRate: number;
}

// Inventory
export interface Inventory extends BaseEntity {
  productId: number;
  purchaseQuantity: number;
  priceJpy: number; // 日元单价
  priceCny?: number; // 人民币单价
  stockQuantity: number;
  isReferenced: boolean;
  productName: string;
  categoryId?: number;
  categoryName?: string;
  supplierId?: number;
  purchaseDate?: string;
  purchaseNo?: string;
  product?: Product;
}

export interface CreateInventory {
  productId: number;
  purchaseQuantity: number;
  stockQuantity: number;
  priceJpy: number; // 日元单价
  priceCny?: number; // 人民币单价
  supplierId?: number;
  purchaseDate?: string;
  purchaseNo?: string;
}

export interface InventoryRow extends CreateInventory {
  tempId: string;
  id?: number; // 已存在的库存记录有id
  isReferenced?: boolean; // 是否被订单引用
  productName?: string;
}

// Order
export interface Order extends BaseEntity {
  orderNo: string;
  name: string;
  imageUrl?: string;
  revenue: number;
  totalCost: number;
  shippingFee: number;
  transactionTime: string;
  hasDetails: boolean;
}

export interface CreateOrder {
  orderNo: string;
  name: string;
  imageUrl?: string;
  revenue: number;
  shippingFee: number;
  transactionTime: string;
}

export interface UpdateOrder {
  orderNo: string;
  name: string;
  imageUrl?: string;
  revenue: number;
  shippingFee: number;
  transactionTime: string;
}

// Order Detail
export interface OrderDetail extends BaseEntity {
  orderId: number;
  inventoryId: number;
  productId: number;
  productName: string;
  unitPrice: number;
  quantity: number;
  packagingCost: number;
  otherCost: number;
  subtotalCost: number;
  notes?: string;
}

export interface CreateOrderDetail {
  orderId: number;
  inventoryId: number;
  productId: number;
  unitPrice: number;
  quantity: number;
  packagingCost: number;
  otherCost: number;
  notes?: string;
}

export interface UpdateOrderDetail {
  inventoryId: number;
  productId: number;
  unitPrice: number;
  quantity: number;
  packagingCost: number;
  otherCost: number;
  notes?: string;
}

// 创建订单和订单详细的组合类型
export interface CreateOrderWithDetails {
  orderNo: string;
  imageUrl?: string;
  revenue: number;
  transactionTime: string;
  details: CreateOrderDetail[];
}

// 订单详细行（用于前端编辑）
export interface OrderDetailRow {
  tempId: string;
  inventoryId: number;
  productId: number;
  productName?: string;
  unitPrice: number;
  quantity: number;
  packagingCost: number;
  otherCost: number;
  availableStock?: number;
  priceJpy?: number;
  notes?: string;
}
