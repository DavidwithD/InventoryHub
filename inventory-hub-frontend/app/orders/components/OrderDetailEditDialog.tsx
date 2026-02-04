'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Box,
  Grid,
  SelectChangeEvent,
} from '@mui/material';
import api from '@/lib/api';
import { OrderDetail, Inventory, Category, CreateOrderDetail, UpdateOrderDetail } from '@/types';

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
  const [categoryId, setCategoryId] = useState<number>(0);
  const [inventoryId, setInventoryId] = useState<number>(0);
  const [productId, setProductId] = useState<number>(0);
  const [productName, setProductName] = useState<string>('');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [packagingCost, setPackagingCost] = useState<number>(0);
  const [otherCost, setOtherCost] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [availableStock, setAvailableStock] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  const isEditMode = detail !== null;

  useEffect(() => {
    if (open) {
      if (detail) {
        const inventory = inventories.find((inv) => inv.id === detail.inventoryId);
        setCategoryId(inventory?.categoryId || 0);
        setInventoryId(detail.inventoryId);
        setProductId(detail.productId);
        setProductName(detail.productName);
        setUnitPrice(detail.unitPrice);
        setQuantity(detail.quantity);
        setPackagingCost(detail.packagingCost);
        setOtherCost(detail.otherCost);
        setNotes(detail.notes || '');
        setAvailableStock(inventory?.stockQuantity || 0);
      } else {
        resetForm();
      }
      setError('');
    }
  }, [open, detail, inventories]);

  const resetForm = () => {
    setCategoryId(0);
    setInventoryId(0);
    setProductId(0);
    setProductName('');
    setUnitPrice(0);
    setQuantity(1);
    setPackagingCost(0);
    setOtherCost(0);
    setNotes('');
    setAvailableStock(0);
  };

  const handleCategoryChange = (e: SelectChangeEvent<number>) => {
    const newCategoryId = Number(e.target.value);
    setCategoryId(newCategoryId);
    setInventoryId(0);
    setProductId(0);
    setProductName('');
    setAvailableStock(0);
  };

  const handleInventoryChange = (e: SelectChangeEvent<number>) => {
    const newInventoryId = Number(e.target.value);
    setInventoryId(newInventoryId);

    const inventory = inventories.find((inv) => inv.id === newInventoryId);
    if (inventory) {
      setProductId(inventory.productId);
      setProductName(inventory.productName);
      setUnitPrice(inventory.unitCost);
      setAvailableStock(inventory.stockQuantity);
      if (inventory.categoryId && categoryId === 0) {
        setCategoryId(inventory.categoryId);
      }
    }
  };

  const getFilteredInventories = () => {
    return inventories.filter(
      (inv) =>
        inv.stockQuantity > 0 && (categoryId === 0 || inv.categoryId === categoryId)
    );
  };

  const calculateSubtotal = (): number => {
    return unitPrice * quantity + packagingCost + otherCost;
  };

  const validate = (): boolean => {
    if (inventoryId === 0) {
      setError('请选择库存商品');
      return false;
    }
    if (quantity <= 0) {
      setError('数量必须大于0');
      return false;
    }
    if (unitPrice <= 0) {
      setError('单价必须大于0');
      return false;
    }
    if (!isEditMode && quantity > availableStock) {
      setError(`库存不足（可用：${availableStock}）`);
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
          inventoryId,
          productId,
          unitPrice,
          quantity,
          packagingCost,
          otherCost,
          notes: notes || undefined,
        };
        await api.put(`/orders/details/${detail.id}`, updateData);
      } else {
        const createData: CreateOrderDetail = {
          orderId,
          inventoryId,
          productId,
          unitPrice,
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditMode ? '编辑订单详细' : '添加订单详细'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>商品分类</InputLabel>
                <Select
                  value={categoryId}
                  label="商品分类"
                  onChange={handleCategoryChange}
                >
                  <MenuItem value={0}>全部分类</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>库存商品</InputLabel>
                <Select
                  value={inventoryId}
                  label="库存商品"
                  onChange={handleInventoryChange}
                >
                  <MenuItem value={0}>请选择商品</MenuItem>
                  {getFilteredInventories().map((inv) => (
                    <MenuItem key={inv.id} value={inv.id}>
                      {inv.productName}（库存：{inv.stockQuantity}）
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {productName && (
              <Grid size={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="商品名"
                  value={productName}
                  disabled
                />
              </Grid>
            )}

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="单价（¥）"
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="数量"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                slotProps={{ htmlInput: { min: 1 } }}
                helperText={availableStock > 0 ? `可用库存：${availableStock}` : ''}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="包装费（¥）"
                type="number"
                value={packagingCost}
                onChange={(e) => setPackagingCost(Number(e.target.value))}
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="其他费用（¥）"
                type="number"
                value={otherCost}
                onChange={(e) => setOtherCost(Number(e.target.value))}
                slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              />
            </Grid>

            <Grid size={12}>
              <TextField
                fullWidth
                size="small"
                label="备注"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                multiline
                rows={2}
              />
            </Grid>

            <Grid size={12}>
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <strong>小计：¥{calculateSubtotal().toFixed(2)}</strong>
              </Box>
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
