'use client';

import { useState, useEffect, useMemo } from 'react';
import { Box, Button, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Order } from '@/types';
import { useInventory } from '@/app/inventory/hooks/useInventory';
import { useOrders } from './hooks/useOrders';
import { useCategories } from '../categories/hooks/useCategories';
import OrdersTable from './components/OrdersTable';
import OrderFilters from './components/OrderFilters';
import OrderFormDialog from './components/OrderFormDialog';
import ImportDialog from './components/ImportDialog';
import { useOrderFilterStore } from '@/lib/stores/filterStore';
import OrdersCardList from './components/OrdersCardList';
import { apiErrorMessage } from './utils/apiErrorMessage';
import OrdersListToolbar from './components/OrdersListToolbar';
import { useViewMode } from '@/lib/stores/viewModeStore';
import { DEFAULT_ORDER_SORT, OrderSort } from './utils/sortOrders';

export default function OrdersPage() {
  const { orders, loadOrders, createOrder, updateOrder, deleteOrder, importFromCurl } = useOrders();
  const { inventories, loadAllInventories } = useInventory();
  const { categories, loadCategories } = useCategories();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [sort, setSort] = useState<OrderSort>(DEFAULT_ORDER_SORT);
  const [viewMode, setViewMode, viewModeHydrated] = useViewMode('orders');

  // 筛选状态 — persisted across visits via localStorage (zustand persist).
  const {
    searchOrderNo,
    costStatus,
    startDate,
    endDate,
    setSearchOrderNo,
    setCostStatus,
    setStartDate,
    setEndDate,
    reset: resetFilters,
  } = useOrderFilterStore();

  useEffect(() => {
    // Load persisted filters first, then fetch using any saved date range.
    useOrderFilterStore.persist.rehydrate();
    const { startDate: sd, endDate: ed } = useOrderFilterStore.getState();
    loadOrders(sd || ed ? { startDate: sd, endDate: ed } : undefined).catch(() =>
      setError('加载订单列表失败')
    );
    loadAllInventories().catch(() => setError('加载库存列表失败'));
    loadCategories().catch(() => setError('加载分类列表失败'));
  }, [loadOrders, loadAllInventories, loadCategories]);

  // Memoized so the lists below can memoize their sort on this array.
  const filteredOrders = useMemo(() => {
    let filtered = [...orders];

    if (searchOrderNo.trim()) {
      filtered = filtered.filter(
        (order) =>
          order.orderNo.toLowerCase().includes(searchOrderNo.toLowerCase()) ||
          order.name.toLowerCase().includes(searchOrderNo.toLowerCase())
      );
    }

    if (costStatus === 'null') {
      filtered = filtered.filter(
        (order) => order.totalCost === null || order.totalCost === 0 || order.hasUnknownCost
      );
    } else if (costStatus === 'hasValue') {
      filtered = filtered.filter(
        (order) => order.totalCost !== null && order.totalCost > 0 && !order.hasUnknownCost
      );
    }

    return filtered;
  }, [orders, searchOrderNo, costStatus]);

  const handleExportJSON = () => {
    const exportData = filteredOrders.map((order) => ({
      订单号: order.orderNo,
      订单名: order.name,
      图片URL: order.imageUrl || '',
      营业额: order.revenue,
      总成本: order.hasUnknownCost ? '未知' : order.totalCost || 0,
      利润: order.hasUnknownCost ? '未知' : order.revenue - (order.totalCost || 0),
      交易时间: new Date(order.transactionTime).toLocaleString('zh-CN'),
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `订单数据_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleOpenDialog = (order?: Order) => {
    setEditingOrder(order || null);
    setOpenDialog(true);
  };

  const handleSaveOrder = async (data: any) => {
    try {
      if (data.id) {
        await updateOrder(data.id, data);
        setSuccess('订单更新成功');
      } else {
        await createOrder(data);
        setSuccess('订单创建成功');
      }
      await loadOrders();
      await loadAllInventories();
    } catch (err) {
      setError(apiErrorMessage(err, '保存订单失败'));
      throw err;
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (!confirm('确定要删除此订单吗？删除后库存数量将恢复。')) return;

    try {
      await deleteOrder(id);
      setSuccess('订单删除成功，库存已恢复');
      await loadOrders();
      await loadAllInventories();
    } catch (err) {
      setError(apiErrorMessage(err, '删除订单失败'));
    }
  };

  const handleApplyFilter = () => {
    loadOrders({ startDate, endDate }).catch(() => setError('加载订单列表失败'));
  };

  const handleClearFilter = () => {
    resetFilters();
    loadOrders().catch(() => setError('加载订单列表失败'));
  };

  const handleImport = async (curlCommand: string) => {
    const result = await importFromCurl(curlCommand);
    await loadOrders();
    return result;
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingOrder(null);
  };

  const handleOpenImportDialog = () => {
    setOpenImportDialog(true);
  };

  const handleCloseImportDialog = () => {
    setOpenImportDialog(false);
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" onClick={handleOpenImportDialog}>
            批量导入订单
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenDialog()}>
            新建订单
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <OrderFilters
        searchOrderNo={searchOrderNo}
        costStatus={costStatus}
        startDate={startDate}
        endDate={endDate}
        onSearchChange={setSearchOrderNo}
        onCostStatusChange={setCostStatus}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onApplyFilter={handleApplyFilter}
        onClearFilter={handleClearFilter}
        onExport={handleExportJSON}
      />

      {viewModeHydrated && (
        <OrdersListToolbar
          count={filteredOrders.length}
          sort={sort}
          onSortChange={setSort}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      )}

      {!viewModeHydrated ? null : viewMode === 'card' ? (
        <OrdersCardList orders={filteredOrders} sort={sort} />
      ) : (
        <OrdersTable
          orders={filteredOrders}
          sort={sort}
          onSortChange={setSort}
          onEdit={handleOpenDialog}
          onDelete={handleDeleteOrder}
        />
      )}

      <OrderFormDialog
        open={openDialog}
        order={editingOrder}
        inventories={inventories}
        categories={categories}
        onClose={handleCloseDialog}
        onSave={handleSaveOrder}
      />

      <ImportDialog
        open={openImportDialog}
        onClose={handleCloseImportDialog}
        onImport={handleImport}
      />
    </>
  );
}
