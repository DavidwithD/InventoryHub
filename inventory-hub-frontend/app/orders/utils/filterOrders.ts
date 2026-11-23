import { Order } from '@/types';
import { needsCost } from './orderProfit';

export type CostStatus = 'all' | 'null' | 'hasValue';

export interface OrderFilter {
  search: string;
  costStatus: CostStatus;
  /** YYYY-MM-DD or ''. The day is included. */
  startDate: string;
  /** YYYY-MM-DD or ''. The day is included. */
  endDate: string;
}

/** The local calendar day of a time, as YYYY-MM-DD. The list shows this day. */
export function localDateKey(time: string): string {
  const d = new Date(time);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/**
 * Filters orders by text, cost status and date range.
 * 'null' keeps the orders that need cost work: no lines, or an unknown cost.
 * The home page 待补成本 count uses the same rule.
 */
export function filterOrders(orders: Order[], filter: OrderFilter): Order[] {
  const term = filter.search.trim().toLowerCase();
  return orders.filter((order) => {
    if (
      term &&
      !order.orderNo.toLowerCase().includes(term) &&
      !order.name.toLowerCase().includes(term)
    ) {
      return false;
    }
    if (filter.costStatus === 'null' && !needsCost(order)) return false;
    if (filter.costStatus === 'hasValue' && needsCost(order)) return false;
    if (filter.startDate || filter.endDate) {
      const day = localDateKey(order.transactionTime);
      if (filter.startDate && day < filter.startDate) return false;
      if (filter.endDate && day > filter.endDate) return false;
    }
    return true;
  });
}
