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
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  IconButton,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '@/lib/api';
import { Inventory, Category, CreateOrderDetail } from '@/types';
import ProductPicker from './ProductPicker';
import { pickBatchesFIFO, totalStockForProduct } from '../utils/fifoPick';

interface BulkRow {
  productId: number;
  productName: string;
  totalStock: number;
  quantity: number;
}

interface Props {
  open: boolean;
  orderId: number;
  inventories: Inventory[];
  categories: Category[];
  saleDate?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function OrderDetailBulkCreateDialog({
  open,
  orderId,
  inventories,
  categories,
  saleDate,
  onClose,
  onSaved,
}: Props) {
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setRows([]);
      setError('');
    }
  }, [open]);

  const excludeProductIds = useMemo(() => rows.map((r) => r.productId), [rows]);

  const handleProductPick = (productId: number) => {
    if (rows.some((r) => r.productId === productId)) return;
    const sample = inventories.find((inv) => inv.productId === productId);
    if (!sample) return;
    const totalStock = totalStockForProduct(productId, inventories, saleDate);
    setRows((prev) => [
      ...prev,
      {
        productId,
        productName: sample.productName,
        totalStock,
        quantity: 1,
      },
    ]);
    setError('');
  };

  const handleDeleteRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuantityChange = (index: number, value: number) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], quantity: value };
      return next;
    });
  };

  const rowAllocations = useMemo(() => {
    return rows.map((row) => pickBatchesFIFO(row.productId, row.quantity, inventories, saleDate));
  }, [rows, inventories, saleDate]);

  const rowSubtotal = (index: number): number => {
    return rowAllocations[index].allocations.reduce(
      (sum, a) => sum + a.unitPrice * a.quantity,
      0,
    );
  };

  const total = useMemo(() => {
    return rowAllocations.reduce(
      (sum, r) => sum + r.allocations.reduce((s, a) => s + a.unitPrice * a.quantity, 0),
      0,
    );
  }, [rowAllocations]);

  const validate = (): boolean => {
    if (rows.length === 0) {
      setError('请至少添加一个商品');
      return false;
    }
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.quantity <= 0) {
        setError(`第${i + 1}行：数量必须大于0`);
        return false;
      }
      const { shortfall } = rowAllocations[i];
      if (shortfall > 0) {
        setError(`${row.productName} 库存不足，缺 ${shortfall} 件`);
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    setError('');

    try {
      for (let i = 0; i < rows.length; i++) {
        const { allocations } = rowAllocations[i];
        for (const a of allocations) {
          const createData: CreateOrderDetail = {
            orderId,
            inventoryId: a.inventoryId,
            productId: a.productId,
            unitPrice: a.unitPrice,
            quantity: a.quantity,
            packagingCost: 0,
            otherCost: 0,
          };
          await api.post('/orders/details', createData);
        }
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
        setError(err.message || '保存失败');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setRows([]);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>批量添加订单详细</DialogTitle>
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
            excludeProductIds={excludeProductIds}
            onPick={handleProductPick}
            mode="grid"
            saleDate={saleDate}
          />

          {rows.length > 0 ? (
            <>
              <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
                已选商品：
              </Typography>
              <TableContainer sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>商品名</TableCell>
                      <TableCell>总库存</TableCell>
                      <TableCell sx={{ width: 110 }}>数量</TableCell>
                      <TableCell>批次分配（FIFO）</TableCell>
                      <TableCell>小计（¥）</TableCell>
                      <TableCell sx={{ width: 60 }}>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, index) => {
                      const { allocations, shortfall } = rowAllocations[index];
                      return (
                        <TableRow key={row.productId}>
                          <TableCell>{row.productName}</TableCell>
                          <TableCell>{row.totalStock}</TableCell>
                          <TableCell>
                            <TextField
                              size="small"
                              type="number"
                              value={row.quantity}
                              onChange={(e) =>
                                handleQuantityChange(index, Number(e.target.value))
                              }
                              slotProps={{ htmlInput: { min: 1, max: row.totalStock } }}
                              sx={{ width: 90 }}
                            />
                          </TableCell>
                          <TableCell>
                            {allocations.length === 0 ? (
                              <Typography variant="caption" color="text.disabled">
                                —
                              </Typography>
                            ) : (
                              <Box>
                                {allocations.map((a) => (
                                  <Typography
                                    key={a.inventoryId}
                                    variant="caption"
                                    sx={{ display: 'block' }}
                                  >
                                    {a.quantity} 件 · ¥{a.unitPrice.toFixed(2)} ·{' '}
                                    {a.purchaseDate
                                      ? new Date(a.purchaseDate).toLocaleDateString('zh-CN')
                                      : '无日期'}
                                  </Typography>
                                ))}
                                {shortfall > 0 && (
                                  <Typography variant="caption" color="error">
                                    缺 {shortfall} 件
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>{rowSubtotal(index).toFixed(2)}</TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteRow(index)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="h6">
                    合计：¥{total.toFixed(2)}（{rows.length}件商品）
                  </Typography>
                </Box>
              </Box>
            </>
          ) : (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              点击上方商品图片添加
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          取消
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || rows.length === 0}>
          {saving ? '保存中...' : '全部保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
