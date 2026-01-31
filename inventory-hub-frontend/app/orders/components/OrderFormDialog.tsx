'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Order, OrderDetailRow, Inventory, CreateOrderDetail, Category } from '@/types';
import OrderDetailRows from './OrderDetailRows';

interface Props {
  open: boolean;
  order: Order | null;
  inventories: Inventory[];
  categories: Category[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

export default function OrderFormDialog({
  open,
  order,
  inventories,
  categories,
  onClose,
  onSave,
}: Props) {
  const [orderNo, setOrderNo] = useState('');
  const [orderName, setOrderName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [revenue, setRevenue] = useState<number>(0);
  const [transactionTime, setTransactionTime] = useState('');
  const [detailRows, setDetailRows] = useState<OrderDetailRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (order) {
      setOrderNo(order.orderNo);
      setOrderName(order.name);
      setImageUrl(order.imageUrl || '');
      setRevenue(order.revenue);
      setTransactionTime(order.transactionTime.split('T')[0]);
      setDetailRows([]);
    } else {
      resetForm();
    }
  }, [order, open]);

  const resetForm = () => {
    setOrderNo('');
    setOrderName('');
    setImageUrl('');
    setRevenue(0);
    setTransactionTime(new Date().toISOString().split('T')[0]);
    setDetailRows([]);
    setError('');
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
    setDetailRows(detailRows.filter((row) => row.tempId !== tempId));
  };

  const updateDetailRow = (tempId: string, field: keyof OrderDetailRow, value: any) => {
    setDetailRows(
      detailRows.map((row) => {
        if (row.tempId !== tempId) return row;

        const updated = { ...row, [field]: value };

        if (field === 'inventoryId') {
          const inventory = inventories.find((inv) => inv.id === value);
          if (inventory) {
            updated.productId = inventory.productId;
            updated.productName = inventory.productName;
            updated.unitCost = inventory.unitCost;
            updated.availableStock = inventory.stockQuantity;
            updated.unitPrice = inventory.unitCost;
          }
        }

        return updated;
      })
    );
  };

  const calculateTotalCost = (): number => {
    return detailRows.reduce((sum, row) => {
      return sum + row.unitPrice * row.quantity + row.packagingCost + row.otherCost;
    }, 0);
  };

  const calculateProfit = (): number => {
    return revenue - calculateTotalCost();
  };

  const validate = (): boolean => {
    if (!orderNo.trim()) {
      setError('请填写订单号');
      return false;
    }
    if (!orderName.trim()) {
      setError('请填写订单名');
      return false;
    }
    if (revenue <= 0) {
      setError('营业额必须大于0');
      return false;
    }
    if (!transactionTime) {
      setError('请选择交易时间');
      return false;
    }

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

  const handleSave = async () => {
    if (!validate()) return;

    try {
      setError('');

      if (order) {
        // 更新订单
        await onSave({
          id: order.id,
          orderNo,
          name: orderName,
          imageUrl,
          revenue,
          transactionTime: new Date(transactionTime).toISOString(),
        });
      } else {
        // 创建订单
        const details: CreateOrderDetail[] = detailRows.map((row) => ({
          orderId: 0,
          inventoryId: row.inventoryId,
          productId: row.productId,
          unitPrice: row.unitPrice,
          quantity: row.quantity,
          packagingCost: row.packagingCost,
          otherCost: row.otherCost,
          notes: row.notes,
        }));

        await onSave({
          orderNo,
          name: orderName,
          imageUrl,
          revenue,
          transactionTime: new Date(transactionTime).toISOString(),
          details,
        });
      }

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
        setError(err.message || '保存订单失败');
      }
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>{order ? '编辑订单' : '新建订单'}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="订单号"
              value={orderNo}
              onChange={(e) => setOrderNo(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="订单名"
              value={orderName}
              onChange={(e) => setOrderName(e.target.value)}
              fullWidth
              required
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="图片链接"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              fullWidth
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="营业额（日元）"
              type="number"
              value={revenue}
              onChange={(e) => setRevenue(Number(e.target.value))}
              fullWidth
              required
            />
            <TextField
              label="交易时间"
              type="date"
              value={transactionTime}
              onChange={(e) => setTransactionTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
          </Box>

          <Box sx={{ mt: 3 }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography variant="h6">订单详细</Typography>
              {!order && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addDetailRow}
                >
                  添加商品
                </Button>
              )}
            </Box>

            {detailRows.length > 0 && (
              <OrderDetailRows
                rows={detailRows}
                inventories={inventories}
                categories={categories}
                onUpdateRow={updateDetailRow}
                onRemoveRow={removeDetailRow}
              />
            )}

            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2">营业额：¥ {revenue.toFixed(2)}</Typography>
              <Typography variant="body2">总成本：¥ {calculateTotalCost().toFixed(2)}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                利润：¥ {calculateProfit().toFixed(2)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        <Button onClick={handleSave} variant="contained" disabled={order !== null}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
