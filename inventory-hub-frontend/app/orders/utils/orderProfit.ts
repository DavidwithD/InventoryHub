import { Order } from '@/types';
import { formatMoney } from '@/lib/formatMoney';

/**
 * The cost state of one order.
 * - missing: the order has no lines yet.
 * - unknown: some units have no purchase batch to take a cost from.
 * - known: the cost is complete.
 */
export type OrderCostState = 'missing' | 'unknown' | 'known';

export function orderCostState(order: Order): OrderCostState {
  if (!order.hasDetails) return 'missing';
  if (order.hasUnknownCost) return 'unknown';
  return 'known';
}

/** True when the order needs cost work: it has no lines, or its cost is unknown. */
export function needsCost(order: Order): boolean {
  return orderCostState(order) !== 'known';
}

/** Profit of one order. Returns null when the cost is missing or unknown. */
export function orderProfit(order: Order): number | null {
  if (orderCostState(order) !== 'known') return null;
  return order.revenue - (order.totalCost || 0);
}

/** The cost as text: 未输入, 未知 or an amount in 円. */
export function formatOrderCost(order: Order): string {
  const state = orderCostState(order);
  if (state === 'missing') return '未输入';
  if (state === 'unknown') return '未知';
  return formatMoney(order.totalCost || 0, 'JPY');
}

/** The profit as text: — when the cost is missing, 未知 when it is unknown, or an amount in 円. */
export function formatOrderProfit(order: Order): string {
  const state = orderCostState(order);
  if (state === 'missing') return '—';
  if (state === 'unknown') return '未知';
  return formatMoney(orderProfit(order) ?? 0, 'JPY');
}
