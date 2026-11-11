import { Order } from '@/types';

/** Profit of one order. Returns null when the order has an unknown cost. */
export function orderProfit(order: Order): number | null {
  if (order.hasUnknownCost) return null;
  return order.revenue - (order.totalCost || 0);
}
