import { describe, expect, it } from 'vitest';
import type { Order } from '@/types';
import { formatMoney } from '@/lib/formatMoney';
import { filterOrders } from '@/app/orders/utils/filterOrders';
import { ordersToCsv } from '@/app/orders/utils/ordersCsv';

const order = (overrides: Partial<Order> = {}): Order => ({
  id: 1,
  orderNo: 'm1',
  name: 'Card',
  revenue: 1000,
  totalCost: 350,
  shippingFee: 200,
  transactionTime: '2026-02-01T10:00:00',
  hasDetails: true,
  hasUnknownCost: false,
  createdAt: '',
  updatedAt: '',
  isDeleted: false,
  ...overrides,
});

describe('formatMoney', () => {
  it('shows whole yen with 円', () => {
    expect(formatMoney(1234.6, 'JPY')).toBe('1,235円');
    expect(formatMoney(-50, 'JPY')).toBe('-50円');
  });

  it('shows yuan with two decimals and 元', () => {
    expect(formatMoney(12.5, 'CNY')).toBe('12.50元');
  });
});

describe('filterOrders', () => {
  const none = { search: '', costStatus: 'all' as const, startDate: '', endDate: '' };
  const orders = [
    order({ id: 1, transactionTime: '2026-01-31T23:00:00' }),
    order({ id: 2, transactionTime: '2026-02-01T10:00:00', hasDetails: false, totalCost: 0 }),
    order({ id: 3, transactionTime: '2026-02-28T23:59:00', hasUnknownCost: true }),
    order({ id: 4, transactionTime: '2026-03-01T00:00:00' }),
  ];
  const ids = (list: Order[]) => list.map((o) => o.id);

  it('includes the start day and the end day', () => {
    expect(
      ids(filterOrders(orders, { ...none, startDate: '2026-02-01', endDate: '2026-02-28' }))
    ).toEqual([2, 3]);
  });

  it('keeps orders without lines or with an unknown cost under 未输入成本', () => {
    expect(ids(filterOrders(orders, { ...none, costStatus: 'null' }))).toEqual([2, 3]);
    expect(ids(filterOrders(orders, { ...none, costStatus: 'hasValue' }))).toEqual([1, 4]);
  });

  it('matches the order number or the name, ignoring case', () => {
    const list = [order({ id: 1, orderNo: 'M123' }), order({ id: 2, name: 'Blue card' })];
    expect(ids(filterOrders(list, { ...none, search: 'm12' }))).toEqual([1]);
    expect(ids(filterOrders(list, { ...none, search: 'BLUE' }))).toEqual([2]);
  });
});

describe('ordersToCsv', () => {
  it('starts with a BOM and a header row', () => {
    const csv = ordersToCsv([]);
    expect(
      csv.startsWith('﻿订单号,订单名,图片URL,营业额(円),运费(円),总成本(円),利润(円),交易时间\r\n')
    ).toBe(true);
  });

  it('writes amounts without units and marks missing and unknown costs', () => {
    const lines = ordersToCsv([
      order({ orderNo: 'a' }),
      order({ orderNo: 'b', hasDetails: false, totalCost: 0 }),
      order({ orderNo: 'c', hasUnknownCost: true }),
    ]).split('\r\n');
    expect(lines[1]).toMatch(/^a,Card,,1000\.00,200\.00,350\.00,650\.00,/);
    expect(lines[2]).toMatch(/^b,Card,,1000\.00,200\.00,未输入,未输入,/);
    expect(lines[3]).toMatch(/^c,Card,,1000\.00,200\.00,未知,未知,/);
  });

  it('quotes fields that hold a comma, a quote or a line break', () => {
    const line = ordersToCsv([order({ name: 'Card, "rare"\nset' })]).split('\r\n')[1];
    expect(line).toContain('"Card, ""rare""\nset"');
  });
});
