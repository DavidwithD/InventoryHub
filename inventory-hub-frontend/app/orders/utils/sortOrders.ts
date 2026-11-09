import { Order } from '@/types';

export type OrderSortField =
  | 'orderNo'
  | 'revenue'
  | 'totalCost'
  | 'shippingFee'
  | 'profit'
  | 'transactionTime';

export type SortDirection = 'asc' | 'desc';

export interface OrderSort {
  field: OrderSortField;
  direction: SortDirection;
}

export const ORDER_SORT_LABELS: Record<OrderSortField, string> = {
  orderNo: '订单号',
  revenue: '营业额',
  totalCost: '总成本',
  shippingFee: '运费',
  profit: '利润',
  transactionTime: '交易时间',
};

export const DEFAULT_ORDER_SORT: OrderSort = { field: 'transactionTime', direction: 'desc' };

/** Clicking the active field flips the direction. Clicking another field sorts it ascending. */
export function nextOrderSort(current: OrderSort, field: OrderSortField): OrderSort {
  const isAsc = current.field === field && current.direction === 'asc';
  return { field, direction: isAsc ? 'desc' : 'asc' };
}

export function sortOrders(orders: Order[], { field, direction }: OrderSort): Order[] {
  const sorted = [...orders];

  sorted.sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    if (field === 'profit') {
      aValue = a.revenue - (a.totalCost || 0);
      bValue = b.revenue - (b.totalCost || 0);
    } else if (field === 'totalCost') {
      if (a.totalCost === null || a.totalCost === 0) {
        return direction === 'asc' ? -1 : 1;
      }
      if (b.totalCost === null || b.totalCost === 0) {
        return direction === 'asc' ? 1 : -1;
      }
      aValue = a.totalCost;
      bValue = b.totalCost;
    } else {
      aValue = a[field];
      bValue = b[field];
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
    }

    if (field === 'transactionTime') {
      const aTime = new Date(aValue).getTime();
      const bTime = new Date(bValue).getTime();
      return direction === 'asc' ? aTime - bTime : bTime - aTime;
    }

    return direction === 'asc'
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number);
  });

  return sorted;
}
