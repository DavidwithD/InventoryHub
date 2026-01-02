'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import api from '@/lib/api';
import { OrderDetailRow, Inventory } from '@/types';
import OrderDetailRows from './OrderDetailRows';

interface Props {
  open: boolean;
  orderId: number | null;
  inventories: Inventory[];
  onClose: () => void;
  onSaved: () => void;
}

export default function OrderDetailsDialog({ open, orderId, inventories, onClose, onSaved }: Props) {
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [editingMode, setEditingMode] = useState(false);
  const [detailRows, setDetailRows] = useState<OrderDetailRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && orderId) {
      loadDetails();
    }
  }, [open, orderId]);

  const loadDetails = async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      const response = await api.get(`/orders/${orderId}/details`);
      setOrderDetails(response.data);
      setEditingMode(false);
      setDetailRows([]);
      setError('');
    } catch (err: any) {
      if (err.response?.data) {
        const errorData = err.response.data;
        setError(typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
      } else {
        setError('加载订单详细失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditDetails = () => {
    const editableRows: OrderDetailRow[] = orderDetails.map((detail, idx) => ({
      tempId: `existing-${idx}`,
      inventoryId: detail.inventoryId,
      productId: detail.productId,
      productName: detail.productName,
      unitPrice: detail.unitPrice,
      quantity: detail.quantity,
      packagingCost: detail.packagingCost,
      otherCost: detail.otherCost,
      notes: detail.notes || '',
      availableStock: undefined,
      unitCost: undefined,
    }));
    setDetailRows(editableRows);
    setEditingMode(true);
  };

  const createEmptyRow = (): OrderDetailRow => ({
    tempId: `new-${Date.now()}`,
    inventoryId: 0,
    productId: 0,
    productName: '',
    unitPrice: 0,
    quantity: 1,
    packagingCost: 0,
    otherCost: 0,
    availableStock: 0,
    unitCost: 0,
    notes: '',
  });

  const addDetailRow = () => {
    setDetailRows([...detailRows, createEmptyRow()]);
  };

  const removeDetailRow = (tempId: string) => {
    setDetailRows(detailRows.filter(row => row.tempId !== tempId));
  };

  const updateDetailRow = (tempId: string, field: keyof OrderDetailRow, value: any) => {
    setDetailRows(detailRows.map(row => {
      if (row.tempId !== tempId) return row;

      const updated = { ...row, [field]: value };

      if (field === 'inventoryId') {
        const inventory = inventories.find(inv => inv.id === value);
        if (inventory) {
          updated.productId = inventory.productId;
          updated.productName = inventory.productName;
          updated.unitCost = inventory.unitCost;
          updated.availableStock = inventory.stockQuantity;
          updated.unitPrice = inventory.unitCost;
        }
      }

      return updated;
    }));
  };

  const validate = (): boolean => {
    for (const row of detailRows) {
      if (row.inventoryId === 0) {
        setError('请选择库存商品');
        return false;
      }
      if (row.quantity <= 0) {
        setError('数量必须大于0');
        return false;
      }
      if (row.unitPrice <= 0) {
        setError('单价必须大于0');
        return false;
      }
      if (row.availableStock !== undefined && row.quantity > row.availableStock) {
        setError(`${row.productName} 库存不足（可用：${row.availableStock}）`);
        return false;
      }
    }
    return true;
  };

  const handleSaveDetails = async () => {
    if (!validate()) return;

    try {
      setError('');

      // 删除旧的详细
      for (const detail of orderDetails) {
        await api.delete(`/orders/details/${detail.id}`);
      }

      // 创建新的详细
      for (const row of detailRows) {
        await api.post('/orders/details', {
          orderId: orderId,
          inventoryId: row.inventoryId,
          productId: row.productId,
          unitPrice: row.unitPrice,
          quantity: row.quantity,
          packagingCost: row.packagingCost,
          otherCost: row.otherCost,
          notes: row.notes,
        });
      }

      onSaved();
      handleClose();
    } catch (err: any) {
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          setError(errorData);
        } else if (errorData.title || errorData.errors) {
          setError(errorData.title || JSON.stringify(errorData.errors));
        } else {
          setError(JSON.stringify(errorData));
        }
      } else {
        setError(err.message || '保存订单详细失败');
      }
    }
  };

  const handleClose = () => {
    setOrderDetails([]);
    setDetailRows([]);
    setEditingMode(false);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        订单详细 - 订单#{orderId}
        {!editingMode && (
          <Button
            variant="outlined"
            size="small"
            onClick={handleEditDetails}
            sx={{ ml: 2 }}
          >
            编辑详细
          </Button>
        )}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

          {loading ? (
            <Typography>加载中...</Typography>
          ) : !editingMode ? (
            <>
              {orderDetails.length === 0 ? (
                <Typography>暂无订单详细</Typography>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>商品名</TableCell>
                        <TableCell>单价（¥）</TableCell>
                        <TableCell>数量</TableCell>
                        <TableCell>包装费（¥）</TableCell>
                        <TableCell>其他费用（¥）</TableCell>
                        <TableCell>小计（¥）</TableCell>
                        <TableCell>备注</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orderDetails.map((detail) => (
                        <TableRow key={detail.id}>
                          <TableCell>{detail.productName}</TableCell>
                          <TableCell>{detail.unitPrice.toFixed(2)}</TableCell>
                          <TableCell>{detail.quantity}</TableCell>
                          <TableCell>{detail.packagingCost.toFixed(2)}</TableCell>
                          <TableCell>{detail.otherCost.toFixed(2)}</TableCell>
                          <TableCell>{detail.subtotalCost.toFixed(2)}</TableCell>
                          <TableCell>{detail.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">编辑订单详细</Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addDetailRow}
                >
                  添加商品
                </Button>
              </Box>

              {detailRows.length > 0 && (
                <OrderDetailRows
                  rows={detailRows}
                  inventories={inventories}
                  onUpdateRow={updateDetailRow}
                  onRemoveRow={removeDetailRow}
                />
              )}
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>关闭</Button>
        {editingMode && (
          <Button onClick={handleSaveDetails} variant="contained">
            保存修改
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
