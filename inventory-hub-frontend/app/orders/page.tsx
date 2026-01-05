'use client';

import { useState, useEffect } from 'react';
import { Box, Button, Alert } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Order, Inventory } from '@/types';
import { useOrders } from './hooks/useOrders';
import { useProducts } from '../products/hooks/useProducts';
import { useInventory } from '../inventory/hooks/useInventory';
import OrdersTable from './components/OrdersTable';
import OrderFilters from './components/OrderFilters';
import OrderFormDialog from './components/OrderFormDialog';
import OrderDetailsDialog from './components/OrderDetailsDialog';
import ImportDialog from './components/ImportDialog';

export default function OrdersPage() {
  const { orders, loadOrders, createOrder, updateOrder, deleteOrder, importFromCurl } = useOrders();
  const { products, loadProducts } = useProducts();
  const { inventories, loadAllInventories } = useInventory();
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [viewingOrderId, setViewingOrderId] = useState<number | null>(null);

  // 筛选状态
  const [searchOrderNo, setSearchOrderNo] = useState('');
  const [costStatus, setCostStatus] = useState<'all' | 'null' | 'hasValue'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadOrders().catch(() => setError('加载订单列表失败'));
    loadProducts().catch(() => setError('加载商品列表失败'));
    loadAllInventories().catch(() => setError('加载库存列表失败'));
  }, [loadOrders, loadProducts, loadAllInventories]);

  const getFilteredOrders = () => {
    let filtered = [...orders];

    if (searchOrderNo.trim()) {
      filtered = filtered.filter(order => 
        order.orderNo.toLowerCase().includes(searchOrderNo.toLowerCase()) ||
        order.name.toLowerCase().includes(searchOrderNo.toLowerCase())
      );
    }

    if (costStatus === 'null') {
      filtered = filtered.filter(order => order.totalCost === null || order.totalCost === 0);
    } else if (costStatus === 'hasValue') {
      filtered = filtered.filter(order => order.totalCost !== null && order.totalCost > 0);
    }

    return filtered;
  };

  const handleExportJSON = () => {
    const filtered = getFilteredOrders();
    const exportData = filtered.map(order => ({
      订单号: order.orderNo,
      订单名: order.name,
      图片URL: order.imageUrl || '',
      营业额: order.revenue,
      总成本: order.totalCost || 0,
      利润: order.revenue - (order.totalCost || 0),
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
    } catch (err: any) {
      const message = err.response?.data || err.message || '保存订单失败';
      setError(typeof message === 'string' ? message : JSON.stringify(message));
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
    } catch (err: any) {
      const message = err.response?.data || '删除订单失败';
      setError(typeof message === 'string' ? message : JSON.stringify(message));
    }
  };

  const handleViewDetails = (orderId: number) => {
    setViewingOrderId(orderId);
    setOpenDetailsDialog(true);
  };

  const handleDetailsSaved = async () => {
    setSuccess('订单详细更新成功');
    await loadOrders();
    await loadAllInventories();
  };

  const handleApplyFilter = () => {
    loadOrders({ startDate, endDate }).catch(() => setError('加载订单列表失败'));
  };

  const handleClearFilter = () => {
    setSearchOrderNo('');
    setCostStatus('all');
    setStartDate('');
    setEndDate('');
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

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
    setViewingOrderId(null);
  };

  const handleOpenImportDialog = () => {
    setOpenImportDialog(true);
  };

  const handleCloseImportDialog = () => {
    setOpenImportDialog(false);
  };

  const filteredOrders = getFilteredOrders();

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleOpenImportDialog}
          >
            批量导入订单
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            新建订单
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

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

      <OrdersTable
        orders={filteredOrders}
        onViewDetails={handleViewDetails}
        onEdit={handleOpenDialog}
        onDelete={handleDeleteOrder}
      />

      <OrderFormDialog
        open={openDialog}
        order={editingOrder}
        inventories={inventories}
        onClose={handleCloseDialog}
        onSave={handleSaveOrder}
      />

      <OrderDetailsDialog
        open={openDetailsDialog}
        orderId={viewingOrderId}
        inventories={inventories}
        onClose={handleCloseDetailsDialog}
        onSaved={handleDetailsSaved}
      />

      <ImportDialog
        open={openImportDialog}
        onClose={handleCloseImportDialog}
        onImport={handleImport}
      />
    </>
  );
}
