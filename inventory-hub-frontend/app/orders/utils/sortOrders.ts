import { Order } from '@/types';
import { orderProfit } from './orderProfit';

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
      const aProfit = orderProfit(a);
      const bProfit = orderProfit(b);
      // Orders with an unknown profit go last in both directions.
      if (aProfit === null || bProfit === null) {
        return (aProfit === null ? 1 : 0) - (bProfit === null ? 1 : 0);
      }
      aValue = aProfit;
      bValue = bProfit;
    } else if (field === 'totalCost') {
      // A null or zero cost goes first in ascending order and last in descending order.
      const aMissing = a.totalCost === null || a.totalCost === 0;
      const bMissing = b.totalCost === null || b.totalCost === 0;
      if (aMissing || bMissing) {
        const diff = (bMissing ? 1 : 0) - (aMissing ? 1 : 0);
        return direction === 'asc' ? diff : -diff;
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
