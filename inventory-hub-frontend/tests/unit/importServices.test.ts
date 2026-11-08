import { describe, expect, it, vi } from 'vitest';
import { buildNextFetchCommand, fetchPinduoduoOrders } from '@/app/inventory/import/pinduoduoService';
import {
  buildNextTaobaoFetchCommand,
  detectPlatform,
  fetchTaobaoOrders,
} from '@/app/inventory/import/taobaoService';

// Makes /api/fetch answer with the given platform response.
function stubFetch(data: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    json: async () => (ok ? { data } : data),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('pinduoduo import', () => {
  it('turns each goods line into a row with the price in yuan', async () => {
    stubFetch({
      orders: [
        {
          order_sn: 'P1',
          order_time: 1767225600,
          offset: 'off-1',
          order_goods: [
            { goods_name: 'Card A', goods_price: 1250, goods_number: 2, thumb_url: 'https://img/a.jpg' },
            { goods_name: 'Card B', goods_price: 99, goods_number: 1 },
          ],
        },
      ],
    });

    const { rows, nextOffset } = await fetchPinduoduoOrders('fetch(...)');

    expect(rows).toEqual([
      {
        purchaseNo: 'P1',
        purchaseDate: '2026-01-01T00:00:00.000Z',
        productName: 'Card A',
        purchasePriceCny: 12.5,
        purchaseAmount: 2,
        thumbUrl: 'https://img/a.jpg',
        offset: 'off-1',
      },
      expect.objectContaining({ productName: 'Card B', purchasePriceCny: 0.99, thumbUrl: '' }),
    ]);
    expect(nextOffset).toBe('off-1');
  });

  it('posts the fetch command to the local proxy route', async () => {
    const fetchMock = stubFetch({ orders: [] });

    await fetchPinduoduoOrders('fetch("x")');

    expect(fetchMock).toHaveBeenCalledWith('/api/fetch', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ fetchCommand: 'fetch("x")' });
  });

  it('returns no next offset when the page is empty', async () => {
    stubFetch({ orders: [] });

    expect(await fetchPinduoduoOrders('cmd')).toEqual({ rows: [], nextOffset: null });
  });

  it('throws the proxy error message', async () => {
    stubFetch({ message: 'cookie expired' }, false);

    await expect(fetchPinduoduoOrders('cmd')).rejects.toThrow('cookie expired');
  });

  it('replaces only the offset in the escaped JSON body', () => {
    const command = 'fetch("u", {"body": "{\\"size\\":10,\\"offset\\":\\"old\\"}"})';

    expect(buildNextFetchCommand(command, 'new')).toBe(
      'fetch("u", {"body": "{\\"size\\":10,\\"offset\\":\\"new\\"}"})'
    );
  });
});

describe('taobao import', () => {
  const shop = (orderId: string, tradeTitle = '交易成功') => ({
    tag: 'shopInfo',
    fields: { orderId, createTime: '2026-01-01T09:00:00Z', tradeTitle },
  });
  const item = (orderId: string, itemId: string, quantity: string, extra: object = {}) => ({
    tag: 'orderItemInfo',
    fields: {
      orderId,
      item: { title: `Item ${itemId}`, itemId, quantity, pic: '//img/x.jpg', priceInfo: { actualTotalFee: '￥1,234.50' }, ...extra },
    },
  });

  it('merges lines of the same item in one order and parses the price', async () => {
    stubFetch({
      data: {
        data: { s1: shop('T1'), a: item('T1', 'I1', '1'), b: item('T1', 'I1', '2') },
        global: { pageControl: { hasMore: true, nextPageIndex: 2 } },
      },
    });

    const { rows, nextOffset } = await fetchTaobaoOrders('cmd');

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      purchaseNo: 'T1',
      purchaseAmount: 3,
      purchasePriceCny: 1234.5,
      thumbUrl: 'https://img/x.jpg',
      purchaseDate: '2026-01-01T09:00:00.000Z',
      offset: '2',
    });
    expect(nextOffset).toBe('2');
  });

  it('skips refunded items and closed orders', async () => {
    stubFetch({
      data: {
        data: {
          s1: shop('T1'),
          s2: shop('T2', '交易关闭'),
          a: item('T1', 'I1', '1', { refundStatus: 'REFUNDED' }),
          b: item('T2', 'I2', '1'),
          c: item('T1', 'I3', '1'),
        },
      },
    });

    const { rows, nextOffset } = await fetchTaobaoOrders('cmd');

    expect(rows.map((r) => r.productName)).toEqual(['Item I3']);
    expect(nextOffset).toBeNull();
  });

  it('replaces the page number in the URL-encoded body', () => {
    expect(buildNextTaobaoFetchCommand('body=%7B%22page%22%3A1%2C%22x%22%3A1%7D', '3')).toBe(
      'body=%7B%22page%22%3A3%2C%22x%22%3A1%7D'
    );
  });

  it.each([
    ['淘宝旗舰店', 'taobao'],
    ['Taobao Shop', 'taobao'],
    ['拼多多', 'pinduoduo'],
    ['', 'pinduoduo'],
  ])('detects %s as %s', (name, platform) => {
    expect(detectPlatform(name)).toBe(platform);
  });
});
