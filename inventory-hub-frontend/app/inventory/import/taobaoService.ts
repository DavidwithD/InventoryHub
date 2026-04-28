import { PreviewRow } from '@/types';

type TaobaoEntry = {
  tag: string;
  id?: string;
  fields?: Record<string, unknown>;
};

type TaobaoItem = {
  title?: string;
  itemId?: string;
  pic?: string;
  quantity?: string;
  priceInfo?: { actualTotalFee?: string };
  refundStatus?: string;
};

type TaobaoItemInfoFields = {
  orderId?: string;
  item?: TaobaoItem;
};

type TaobaoShopInfoFields = {
  createTime?: string;
  orderId?: string;
  tradeTitle?: string;
};

type TaobaoPageControl = {
  hasMore?: boolean;
  nextPageIndex?: number;
};

type TaobaoResponse = {
  data?: {
    data?: Record<string, TaobaoEntry>;
    global?: { pageControl?: TaobaoPageControl };
  };
};

function yenStringToFloat(value?: string): number {
  if (!value) return 0;
  const stripped = value.replace(/[￥¥,\s]/g, '');
  const parsed = parseFloat(stripped);
  return isNaN(parsed) ? 0 : parsed;
}

function toISOString(createTime?: string): string {
  if (!createTime) return '';
  return new Date(createTime).toISOString();
}

function parseRows(data: unknown): { rows: PreviewRow[]; nextOffset: string | null } {
  if (!data || typeof data !== 'object') return { rows: [], nextOffset: null };
  const response = data as TaobaoResponse;
  const componentDict = response.data?.data ?? {};
  const pageControl = response.data?.global?.pageControl;

  // Build shopInfo lookup: orderId → { createTime, tradeTitle }
  const shopInfoMap: Record<string, { createTime?: string; tradeTitle?: string }> = {};
  for (const entry of Object.values(componentDict)) {
    if (entry.tag === 'shopInfo' && entry.fields) {
      const fields = entry.fields as TaobaoShopInfoFields;
      if (fields.orderId) {
        shopInfoMap[fields.orderId] = {
          createTime: fields.createTime,
          tradeTitle: fields.tradeTitle,
        };
      }
    }
  }

  // Extract and group PreviewRows by orderId + itemId when available
  const groupedRows = new Map<string, PreviewRow>();
  const ungroupedRows: PreviewRow[] = [];
  const nextPageIndex = pageControl?.nextPageIndex;
  const hasMore = pageControl?.hasMore ?? false;
  const offsetValue = hasMore && nextPageIndex != null ? String(nextPageIndex) : '';

  for (const entry of Object.values(componentDict)) {
    if (entry.tag === 'orderItemInfo' && entry.fields) {
      const fields = entry.fields as TaobaoItemInfoFields;
      const orderId = fields.orderId ?? '';
      const item = fields.item ?? {};
      const shopInfo = shopInfoMap[orderId];
      if (item.refundStatus || shopInfo?.tradeTitle === '交易关闭') continue;

      const pic = typeof item.pic === 'string' ? item.pic : '';
      const purchaseAmount = Number(item.quantity ?? 0);
      const row: PreviewRow = {
        purchaseNo: orderId,
        purchaseDate: toISOString(shopInfo?.createTime),
        productName: item.title ?? '',
        purchasePriceCny: yenStringToFloat(item.priceInfo?.actualTotalFee),
        purchaseAmount,
        thumbUrl: pic.startsWith('//') ? 'https:' + pic : pic,
        offset: offsetValue,
      };

      const itemId = typeof item.itemId === 'string' ? item.itemId : '';
      const groupKey = orderId && itemId ? `${orderId}|${itemId}` : '';

      if (groupKey) {
        const existing = groupedRows.get(groupKey);
        if (existing) {
          existing.purchaseAmount += purchaseAmount;
        } else {
          groupedRows.set(groupKey, row);
        }
      } else {
        ungroupedRows.push(row);
      }
    }
  }

  const rows = [...groupedRows.values(), ...ungroupedRows];
  const nextOffset = hasMore && nextPageIndex != null ? String(nextPageIndex) : null;
  return { rows, nextOffset };
}

/** Replace the page number in the URL-encoded body of a Taobao fetch command. */
export function buildNextTaobaoFetchCommand(originalCommand: string, nextPage: string): string {
  return originalCommand.replace(/%22page%22%3A\d+/, `%22page%22%3A${nextPage}`);
}

export async function fetchTaobaoOrders(
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

export function detectPlatform(supplierName: string): 'pinduoduo' | 'taobao' {
  const lower = supplierName.toLowerCase();
  if (lower.includes('taobao') || lower.includes('淘宝')) return 'taobao';
  return 'pinduoduo';
}
