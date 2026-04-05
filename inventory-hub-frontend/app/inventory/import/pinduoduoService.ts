import { PreviewRow } from '@/types';

type PinduoduoGoods = {
  goods_name?: string;
  goods_price?: number;
  goods_number?: number;
  thumb_url?: string;
};

type PinduoduoOrder = {
  order_sn?: string;
  order_time?: number;
  order_goods?: PinduoduoGoods[];
};

type PinduoduoResponse = {
  orders?: PinduoduoOrder[];
};

function unixToLocalDateTime(unixSeconds?: number): string {
  if (!unixSeconds) return '';
  return new Date(unixSeconds * 1000).toISOString();
}

function fenToYuan(value?: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return value / 100;
}

function parseRows(data: unknown): { rows: PreviewRow[]; nextOffset: string | null } {
  if (!data || typeof data !== 'object') return { rows: [], nextOffset: null };
  const response = data as PinduoduoResponse;
  const orders = Array.isArray(response.orders) ? response.orders : [];
  const rows: PreviewRow[] = [];
  for (const order of orders) {
    const goodsList = Array.isArray(order.order_goods) ? order.order_goods : [];
    for (const goods of goodsList) {
      rows.push({
        purchaseNo: order.order_sn ?? '',
        purchaseDate: unixToLocalDateTime(order.order_time),
        productName: goods.goods_name ?? '',
        purchasePriceCny: fenToYuan(goods.goods_price),
        purchaseAmount: goods.goods_number ?? 0,
        thumbUrl: goods.thumb_url ?? '',
      });
    }
  }
  const lastOrderSn = orders.length > 0 ? (orders[orders.length - 1].order_sn ?? null) : null;
  return { rows, nextOffset: lastOrderSn };
}

/** Replace the offset value inside the body JSON string of a fetch command. */
export function buildNextFetchCommand(originalCommand: string, nextOffset: string): string {
  // The body is a JSON string literal with escaped quotes: \"offset\":\"VALUE\"
  return originalCommand.replace(
    /\\"offset\\":\\"[^"\\]*\\"/,
    `\\"offset\\":\\"${nextOffset}\\"`
  );
}

export async function fetchPinduoduoOrders(
  fetchCommand: string
): Promise<{ rows: PreviewRow[]; nextOffset: string | null }> {
  const response = await fetch('/api/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fetchCommand }),
  });
  const result = await response.json();
  if (!response.ok) {
    const msg = result?.message || 'Request failed';
    throw new Error(typeof msg === 'string' ? msg : 'Request failed');
  }
  return parseRows(result.data);
}
