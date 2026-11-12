'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { Category, CreateOrderDetail, Inventory } from '@/types';
import { apiErrorMessage } from '../utils/apiErrorMessage';
import ProductPicker from './ProductPicker';

interface PendingRow {
  productId: number;
  productName: string;
  totalStock: number;
  quantity: number;
}

interface Props {
  orderId: number;
  inventories: Inventory[];
  categories: Category[];
  /** Product ids of this order's lines. The picker hides them. */
  existingProductIds: number[];
  createOrderDetail: (data: CreateOrderDetail) => Promise<unknown>;
  /** Runs after at least one line was saved. */
  onSaved: () => void | Promise<void>;
}

/**
 * Adds lines to an order.
 * You pick products, set each quantity, and save them all with one button.
 */
export default function OrderDetailAddPanel({
  orderId,
  inventories,
  categories,
  existingProductIds,
  createOrderDetail,
  onSaved,
}: Props) {
  const [rows, setRows] = useState<PendingRow[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const excludeProductIds = useMemo(
    () => [...existingProductIds, ...rows.map((r) => r.productId)],
    [existingProductIds, rows]
  );

  const handleProductPick = (productId: number) => {
    if (excludeProductIds.includes(productId)) return;
    const batches = inventories.filter((inv) => inv.productId === productId);
    if (batches.length === 0) return;
    setRows((prev) => [
      ...prev,
      {
        productId,
        productName: batches[0].productName,
        totalStock: batches.reduce((sum, inv) => sum + inv.stockQuantity, 0),
        quantity: 1,
      },
    ]);
    setError('');
  };

  const handleQuantityChange = (productId: number, quantity: number) => {
    setRows((prev) => prev.map((r) => (r.productId === productId ? { ...r, quantity } : r)));
  };

  const handleRemoveRow = (productId: number) => {
    setRows((prev) => prev.filter((r) => r.productId !== productId));
  };

  const validate = (): boolean => {
    const badIndex = rows.findIndex((r) => !Number.isInteger(r.quantity) || r.quantity <= 0);
    if (badIndex >= 0) {
      setError(`第${badIndex + 1}行：数量必须大于0`);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (rows.length === 0 || !validate()) return;
    setSaving(true);
    setError('');

    // Save one line at a time. Stop at the first failure.
    const savedIds: number[] = [];
    try {
      for (const row of rows) {
        await createOrderDetail({
          orderId,
          productId: row.productId,
          quantity: row.quantity,
          packagingCost: 0,
          otherCost: 0,
        });
        savedIds.push(row.productId);
      }
    } catch (err) {
      setError(apiErrorMessage(err, '保存失败'));
    }

    // Saved rows stay in the list until onSaved has reloaded the order's lines.
    // Until then the picker keeps hiding them, and the save button stays disabled.
    // After that only the unsaved rows remain for a retry.
    try {
      if (savedIds.length > 0) {
        await onSaved();
        setRows((prev) => prev.filter((r) => !savedIds.includes(r.productId)));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
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
      />

      {rows.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
          点击上方商品添加
        </Typography>
      ) : (
        <>
          <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
            已选商品
          </Typography>
          <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
            <Table size="small" sx={{ minWidth: 420, '& th': { whiteSpace: 'nowrap' } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 160 }}>商品名</TableCell>
                  <TableCell>总库存</TableCell>
                  <TableCell sx={{ width: 110 }}>数量</TableCell>
                  <TableCell sx={{ width: 60 }}>移除</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.productId}>
                    <TableCell>{row.productName}</TableCell>
                    <TableCell>{row.totalStock}</TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={row.quantity}
                        disabled={saving}
                        onChange={(e) =>
                          handleQuantityChange(row.productId, Number(e.target.value))
                        }
                        slotProps={{
                          htmlInput: { min: 1, 'aria-label': `${row.productName} 新增数量` },
                        }}
                        sx={{ width: 90 }}
                        helperText={row.quantity > row.totalStock ? '超出库存，成本可能未知' : ''}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={saving}
                        aria-label={`移除 ${row.productName}`}
                        onClick={() => handleRemoveRow(row.productId)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setRows([])} disabled={saving}>
              清空
            </Button>
            <Button variant="contained" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : `保存 ${rows.length} 个商品`}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
