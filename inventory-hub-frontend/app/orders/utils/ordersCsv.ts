import { Order } from '@/types';
import { formatOrderCost, formatOrderProfit, orderCostState, orderProfit } from './orderProfit';

/** Quotes a field when it holds a comma, a double quote or a line break. */
function csvField(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * A text field for the file.
 * A spreadsheet runs a cell that starts with =, +, - or @ as a formula.
 * A leading single quote makes the spreadsheet show it as text.
 */
function csvText(value: string): string {
  return csvField(/^[=+\-@]/.test(value) ? `'${value}` : value);
}

/** An amount for the file. It keeps two decimals and has no unit, so a spreadsheet can sum it. */
function csvAmount(value: number): string {
  return value.toFixed(2);
}

const HEADER = [
  '订单号',
  '订单名',
  '图片URL',
  '营业额(円)',
  '运费(円)',
  '总成本(円)',
  '利润(円)',
  '交易时间',
];

/**
 * Builds a CSV file from orders, in the given order.
 * The text starts with a UTF-8 BOM. Excel needs it to read the Chinese headers.
 * Lines end with CRLF.
 * A missing or unknown cost uses the same text as the orders page.
 */
export function ordersToCsv(orders: Order[]): string {
  const lines = [HEADER.map(csvText).join(',')];
  for (const order of orders) {
    const known = orderCostState(order) === 'known';
    const cost = known ? csvAmount(order.totalCost || 0) : csvText(formatOrderCost(order));
    const profit = known ? csvAmount(orderProfit(order) ?? 0) : csvText(formatOrderProfit(order));
    lines.push(
      [
        csvText(order.orderNo),
        csvText(order.name),
        csvText(order.imageUrl || ''),
        csvAmount(order.revenue),
        csvAmount(order.shippingFee),
        cost,
        profit,
        csvText(new Date(order.transactionTime).toLocaleString('zh-CN')),
      ].join(',')
    );
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}
