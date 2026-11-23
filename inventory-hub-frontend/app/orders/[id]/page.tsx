'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Order, OrderDetail } from '@/types';
import { useInventory } from '@/app/inventory/hooks/useInventory';
import { useCategories } from '@/app/categories/hooks/useCategories';
import { useOrders } from '../hooks/useOrders';
import { apiErrorMessage } from '@/lib/apiErrorMessage';
import OrderSummaryCard from '../components/OrderSummaryCard';
import OrderDetailLinesTable from '../components/OrderDetailLinesTable';
import OrderDetailAddPanel from '../components/OrderDetailAddPanel';

type LoadState = 'loading' | 'ready' | 'notFound' | 'failed';

/** The back link. When picked products are not saved, it asks before it leaves. */
function BackLink({ pendingCount = 0 }: { pendingCount?: number }) {
  const handleClick = (e: { preventDefault: () => void }) => {
    if (pendingCount > 0 && !confirm(`有 ${pendingCount} 个已选商品尚未保存。确定离开吗？`)) {
      e.preventDefault();
    }
  };
  return (
    <Button
      component={Link}
      href="/orders"
      startIcon={<ArrowBackIcon />}
      onClick={handleClick}
      sx={{ mb: 2 }}
    >
      返回订单列表
    </Button>
  );
}

export default function OrderPage() {
  const params = useParams<{ id: string }>();
  // The key gives each order id a fresh component.
  // Old state and old requests of the previous id cannot reach the new page.
  return <OrderPageContent key={params.id} idParam={params.id} />;
}

function OrderPageContent({ idParam }: { idParam: string }) {
  // Only the plain form of an id is valid. "1e3", "0x10" or "007" would load another order's URL.
  const validId = /^[1-9]\d*$/.test(idParam);
  const orderId = Number(idParam);

  const { getOrder, getOrderDetails, createOrderDetail, updateOrderDetail, deleteOrderDetail } =
    useOrders();
  const { inventories, loadAllInventories } = useInventory();
  const { categories, loadCategories } = useCategories();

  const [order, setOrder] = useState<Order | null>(null);
  const [details, setDetails] = useState<OrderDetail[]>([]);
  const [loadState, setLoadState] = useState<LoadState>(validId ? 'loading' : 'notFound');
  // Ids of the lines with a save or delete running. Only those lines are disabled.
  // A click on another line still works while a save runs.
  const [busyIds, setBusyIds] = useState<number[]>([]);
  const [error, setError] = useState('');
  // Number of picked products that are not saved yet.
  const [pendingCount, setPendingCount] = useState(0);
  // Number of the newest reload. An older reload that ends later does not write its data.
  const latestReload = useRef(0);
  // Promise of the newest reload.
  const latestReloadPromise = useRef<Promise<void>>(Promise.resolve());

  const existingProductIds = useMemo(() => details.map((d) => d.productId), [details]);

  const markBusy = (id: number) => setBusyIds((prev) => [...prev, id]);
  const unmarkBusy = (id: number) => setBusyIds((prev) => prev.filter((x) => x !== id));

  // Reloads the order and its lines. A line change changes the order's cost and profit.
  // The returned promise ends after the newest reload has written its data.
  // A caller can then rely on the page showing the change it just saved.
  const reload = useCallback(() => {
    if (!validId) return Promise.resolve();
    const requestNo = ++latestReload.current;
    const run = async (): Promise<void> => {
      try {
        const [o, d] = await Promise.all([getOrder(orderId), getOrderDetails(orderId)]);
        // A newer reload started. Wait for it in place of writing old data.
        if (requestNo !== latestReload.current) return latestReloadPromise.current;
        setOrder(o);
        setDetails(d);
        setLoadState('ready');
      } catch (err) {
        if (requestNo !== latestReload.current) return latestReloadPromise.current;
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setLoadState('notFound');
        } else {
          setError(apiErrorMessage(err, '加载订单失败'));
          // Data from an earlier load stays on screen. Without it, the page offers a retry.
          setLoadState((prev) => (prev === 'ready' ? 'ready' : 'failed'));
        }
      }
    };
    const promise = run();
    latestReloadPromise.current = promise;
    return promise;
  }, [validId, orderId, getOrder, getOrderDetails]);

  // The picker shows the stock of products without a line.
  // Only a delete changes that stock, so inventories load on start and after a delete.
  const loadInventories = useCallback(
    () => loadAllInventories().catch(() => setError('加载库存列表失败')),
    [loadAllInventories]
  );

  useEffect(() => {
    reload();
    loadInventories();
    loadCategories().catch(() => setError('加载分类列表失败'));
  }, [reload, loadInventories, loadCategories]);

  const handleRetry = () => {
    setError('');
    setLoadState('loading');
    reload();
    // The first inventory load can fail too. Retry loads it again.
    loadInventories();
  };

  const handleQuantityChange = async (detail: OrderDetail, quantity: number) => {
    markBusy(detail.id);
    setError('');
    try {
      await updateOrderDetail(detail.id, {
        productId: detail.productId,
        quantity,
        packagingCost: detail.packagingCost,
        otherCost: detail.otherCost,
        notes: detail.notes,
      });
    } catch (err) {
      setError(apiErrorMessage(err, '更新数量失败'));
      unmarkBusy(detail.id);
      return false;
    }
    // The save worked. The line shows the saved quantity even if the reload below fails.
    setDetails((prev) => prev.map((d) => (d.id === detail.id ? { ...d, quantity } : d)));
    await reload();
    unmarkBusy(detail.id);
    return true;
  };

  const handleDelete = async (detail: OrderDetail) => {
    if (!confirm(`确定要删除商品 "${detail.productName}" 吗？`)) return;
    markBusy(detail.id);
    setError('');
    try {
      await deleteOrderDetail(detail.id);
      loadInventories();
      await reload();
    } catch (err) {
      setError(apiErrorMessage(err, '删除失败'));
    } finally {
      unmarkBusy(detail.id);
    }
  };

  if (loadState === 'notFound') {
    return (
      <Box>
        <BackLink />
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography>订单不存在</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <BackLink pendingCount={pendingCount} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loadState === 'failed' ? (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography sx={{ mb: 2 }}>订单加载失败</Typography>
          <Button variant="outlined" onClick={handleRetry}>
            重试
          </Button>
        </Paper>
      ) : loadState === 'loading' || !order ? (
        <Typography color="text.secondary">加载中...</Typography>
      ) : (
        <>
          <OrderSummaryCard order={order} />

          <Typography variant="h6" sx={{ mt: 4, mb: 1.5 }}>
            订单详细
          </Typography>
          <OrderDetailLinesTable
            details={details}
            busyIds={busyIds}
            onQuantityChange={handleQuantityChange}
            onDelete={handleDelete}
          />

          <Typography variant="h6" sx={{ mt: 4, mb: 1.5 }}>
            添加商品
          </Typography>
          <OrderDetailAddPanel
            orderId={order.id}
            inventories={inventories}
            categories={categories}
            existingProductIds={existingProductIds}
            createOrderDetail={createOrderDetail}
            onSaved={reload}
            onPendingChange={setPendingCount}
          />
        </>
      )}
    </Box>
  );
}
