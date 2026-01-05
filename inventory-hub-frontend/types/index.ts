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
  purchaseId: number;
  purchaseAmount: number;
  purchaseQuantity: number;
  unitCost: number;
  stockQuantity: number;
  isReferenced: boolean;
  productName?: string;
  purchaseNo?: string;
  product?: Product;
  purchase?: Purchase;
}

export interface CreateInventory {
  productId: number;
  purchaseId: number;
  purchaseAmountCny: number; // 人民币金额
  purchaseQuantity: number;
  stockQuantity: number;
}

export interface InventoryRow extends CreateInventory {
  tempId: string;
  id?: number; // 已存在的库存记录有id
  isReferenced?: boolean; // 是否被订单引用
  productName?: string;
  purchaseAmountJpy?: number; // 计算得到的日元金额
  unitCostJpy?: number; // 计算得到的日元单位成本
}

// Order
export interface Order extends BaseEntity {
  orderNo: string;
  name: string;
  imageUrl?: string;
  revenue: number;
  totalCost: number;
  transactionTime: string;
}

export interface CreateOrder {
  orderNo: string;
  name: string;
  imageUrl?: string;
  revenue: number;
  transactionTime: string;
}

export interface UpdateOrder {
  orderNo: string;
  name: string;
  imageUrl?: string;
  revenue: number;
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
  unitCost?: number;
  notes?: string;
}
  quantity: number;
  packagingCost: number;
  otherCost: number;
  subtotalCost: number;
  notes?: string;
  order?: Order;
  inventory?: Inventory;
  product?: Product;
}
