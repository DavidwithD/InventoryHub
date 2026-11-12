'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Alert, Box, Button, Paper, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Order, OrderDetail } from '@/types';
import { useInventory } from '@/app/inventory/hooks/useInventory';
import { useCategories } from '@/app/categories/hooks/useCategories';
import { useOrders } from '../hooks/useOrders';
import { apiErrorMessage } from '../utils/apiErrorMessage';
import OrderSummaryCard from '../components/OrderSummaryCard';
import OrderDetailLinesTable from '../components/OrderDetailLinesTable';
import OrderDetailAddPanel from '../components/OrderDetailAddPanel';

type LoadState = 'loading' | 'ready' | 'notFound';

function BackLink() {
  return (
    <Button component={Link} href="/orders" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
      返回订单列表
    </Button>
  );
}

export default function OrderPage() {
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);
  const validId = Number.isInteger(orderId) && orderId > 0;

  const { getOrder, getOrderDetails, createOrderDetail, updateOrderDetail, deleteOrderDetail } =
    useOrders();
  const { inventories, loadAllInventories } = useInventory();
  const { categories, loadCategories } = useCategories();

  const [order, setOrder] = useState<Order | null>(null);
  const [details, setDetails] = useState<OrderDetail[]>([]);
  const [loadState, setLoadState] = useState<LoadState>(validId ? 'loading' : 'notFound');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Reloads the order and its lines. A line change moves the order's cost and profit.
  // Stock changes too, so inventories reload as well.
  const reload = useCallback(async () => {
    if (!validId) return;
    try {
      const [o, d] = await Promise.all([getOrder(orderId), getOrderDetails(orderId)]);
      setOrder(o);
      setDetails(d);
      setLoadState('ready');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) setLoadState('notFound');
      else setError(apiErrorMessage(err, '加载订单失败'));
    }
    loadAllInventories().catch(() => setError('加载库存列表失败'));
  }, [validId, orderId, getOrder, getOrderDetails, loadAllInventories]);

  useEffect(() => {
    reload();
    loadCategories().catch(() => setError('加载分类列表失败'));
  }, [reload, loadCategories]);

  const handleQuantityChange = async (detail: OrderDetail, quantity: number) => {
    setBusy(true);
    setError('');
    try {
      await updateOrderDetail(detail.id, {
        productId: detail.productId,
        quantity,
        packagingCost: detail.packagingCost,
        otherCost: detail.otherCost,
        notes: detail.notes,
      });
      await reload();
      return true;
    } catch (err) {
      setError(apiErrorMessage(err, '更新数量失败'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (detail: OrderDetail) => {
    if (!confirm(`确定要删除商品 "${detail.productName}" 吗？`)) return;
    setBusy(true);
    setError('');
    try {
      await deleteOrderDetail(detail.id);
      await reload();
    } catch (err) {
      setError(apiErrorMessage(err, '删除失败'));
    } finally {
      setBusy(false);
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
      <BackLink />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loadState === 'loading' || !order ? (
        <Typography color="text.secondary">加载中...</Typography>
      ) : (
        <>
          <OrderSummaryCard order={order} />

          <Typography variant="h6" sx={{ mt: 4, mb: 1.5 }}>
            订单详细
          </Typography>
          <OrderDetailLinesTable
            details={details}
            busy={busy}
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
            existingProductIds={details.map((d) => d.productId)}
            createOrderDetail={createOrderDetail}
            onSaved={reload}
          />
        </>
      )}
    </Box>
  );
}
