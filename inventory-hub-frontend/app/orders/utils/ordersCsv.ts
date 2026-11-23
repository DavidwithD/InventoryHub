import { Order } from '@/types';
import { orderCostState, orderProfit } from './orderProfit';

/** Quotes a field when it holds a comma, a double quote or a line break. */
function csvField(value: string | number): string {
  const text = String(value);
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
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
 */
export function ordersToCsv(orders: Order[]): string {
  const lines = [HEADER.map(csvField).join(',')];
  for (const order of orders) {
    const state = orderCostState(order);
    const cost =
      state === 'missing'
        ? '未输入'
        : state === 'unknown'
          ? '未知'
          : csvAmount(order.totalCost || 0);
    const profit = orderProfit(order);
    lines.push(
      [
        order.orderNo,
        order.name,
        order.imageUrl || '',
        csvAmount(order.revenue),
        csvAmount(order.shippingFee),
        cost,
        profit === null ? cost : csvAmount(profit),
        new Date(order.transactionTime).toLocaleString('zh-CN'),
      ]
        .map(csvField)
        .join(',')
    );
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}
