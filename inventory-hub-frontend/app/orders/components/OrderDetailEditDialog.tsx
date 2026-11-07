'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Box,
  Grid,
} from '@mui/material';
import api from '@/lib/api';
import { OrderDetail, Inventory, Category, CreateOrderDetail, UpdateOrderDetail } from '@/types';
import ProductPicker from './ProductPicker';

interface Props {
  open: boolean;
  orderId: number;
  detail: OrderDetail | null;
  inventories: Inventory[];
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

export default function OrderDetailEditDialog({
  open,
  orderId,
  detail,
  inventories,
  categories,
  onClose,
  onSaved,
}: Props) {
  const [productId, setProductId] = useState<number>(0);
  const [productName, setProductName] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [packagingCost, setPackagingCost] = useState<number>(0);
  const [otherCost, setOtherCost] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const isEditMode = detail !== null;

  useEffect(() => {
    if (open) {
      if (detail) {
        setProductId(detail.productId);
        setProductName(detail.productName);
        setQuantity(detail.quantity);
        setPackagingCost(detail.packagingCost);
        setOtherCost(detail.otherCost);
        setNotes(detail.notes || '');
      } else {
        resetForm();
      }
      setError('');
    }
  }, [open, detail]);

  const resetForm = () => {
    setProductId(0);
    setProductName('');
    setQuantity(1);
    setPackagingCost(0);
    setOtherCost(0);
    setNotes('');
  };

  const totalStock = useMemo(
    () =>
      inventories
        .filter((inv) => inv.productId === productId)
        .reduce((sum, inv) => sum + inv.stockQuantity, 0),
    [productId, inventories]
  );

  const handleProductPick = (pickedProductId: number) => {
    const batch = inventories.find((inv) => inv.productId === pickedProductId);
    if (!batch) return;
    setProductId(pickedProductId);
    setProductName(batch.productName);
  };

  const validate = (): boolean => {
    if (productId === 0) {
      setError('请选择商品');
      return false;
    }
    if (quantity <= 0) {
      setError('数量必须大于0');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    setError('');

    try {
      if (isEditMode && detail) {
        const updateData: UpdateOrderDetail = {
          productId,
          quantity,
          packagingCost,
          otherCost,
          notes: notes || undefined,
        };
        await api.put(`/orders/details/${detail.id}`, updateData);
      } else {
        const createData: CreateOrderDetail = {
          orderId,
          productId,
          quantity,
          packagingCost,
          otherCost,
          notes: notes || undefined,
        };
        await api.post('/orders/details', createData);
      }
      onSaved();
      onClose();
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
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    resetForm();
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{ sx: { minHeight: '80vh' } }}
    >
      <DialogTitle>{isEditMode ? '编辑订单详细' : '添加订单详细'}</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <ProductPicker
            inventories={inventories}
            categories={categories}
            onPick={handleProductPick}
            mode="compact"
          />

          <Grid container spacing={2} sx={{ mt: 1 }}>
            {productName && (
              <Grid size={12}>
                <TextField fullWidth size="small" label="商品名" value={productName} disabled />
              </Grid>
            )}

            <Grid size={12}>
              <TextField
                fullWidth
                size="small"
                label="数量"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                slotProps={{ htmlInput: { min: 1 } }}
                helperText={productId > 0 ? `当前库存：${totalStock}。成本按 FIFO 自动计算。` : ''}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          取消
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
