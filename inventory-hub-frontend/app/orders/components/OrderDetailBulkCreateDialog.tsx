'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  IconButton,
  Typography,
  SelectChangeEvent,
} from '@mui/material';
import ReactSelect from 'react-select';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '@/lib/api';
import { Inventory, Category, CreateOrderDetail } from '@/types';

interface InventoryOption {
  value: number;
  label: string;
  inventory: Inventory;
}

interface BulkDetailRow {
  inventoryId: number;
  productId: number;
  categoryName: string;
  productName: string;
  unitPrice: number;
  stockQuantity: number;
  quantity: number;
}

interface Props {
  open: boolean;
  orderId: number;
  inventories: Inventory[];
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

export default function OrderDetailBulkCreateDialog({
  open,
  orderId,
  inventories,
  categories,
  onClose,
  onSaved,
}: Props) {
  const [categoryId, setCategoryId] = useState<number>(0);
  const [rows, setRows] = useState<BulkDetailRow[]>([]);
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (open) {
      setCategoryId(0);
      setRows([]);
      setError('');
    }
  }, [open]);

  const handleCategoryChange = (e: SelectChangeEvent<number>) => {
    setCategoryId(Number(e.target.value));
  };

  const inventoryOptions = useMemo((): InventoryOption[] => {
    const addedInventoryIds = rows.map((r) => r.inventoryId);
    return inventories
      .filter(
        (inv) =>
          inv.stockQuantity > 0 &&
          (categoryId === 0 || inv.categoryId === categoryId) &&
          !addedInventoryIds.includes(inv.id)
      )
      .map((inv) => ({
        value: inv.id,
        label: `${inv.productName}（库存：${inv.stockQuantity}）`,
        inventory: inv,
      }));
  }, [inventories, categoryId, rows]);

  const handleInventorySelect = (option: InventoryOption | null) => {
    if (!option) return;

    const inventory = option.inventory;
    const newRow: BulkDetailRow = {
      inventoryId: inventory.id,
      productId: inventory.productId,
      categoryName: inventory.categoryName || '',
      productName: inventory.productName,
      unitPrice: inventory.unitCost,
      stockQuantity: inventory.stockQuantity,
      quantity: 1,
    };

    setRows([...rows, newRow]);
    setError('');
  };

  const handleDeleteRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleRowChange = (index: number, field: 'quantity', value: number) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const calculateRowSubtotal = (row: BulkDetailRow): number => {
    return row.unitPrice * row.quantity;
  };

  const calculateTotal = (): number => {
    return rows.reduce((sum, row) => sum + calculateRowSubtotal(row), 0);
  };

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
      if (row.quantity > row.stockQuantity) {
        setError(`第${i + 1}行：数量超过可用库存（${row.stockQuantity}）`);
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
      for (const row of rows) {
        const createData: CreateOrderDetail = {
          orderId,
          inventoryId: row.inventoryId,
          productId: row.productId,
          unitPrice: row.unitPrice,
          quantity: row.quantity,
          packagingCost: 0,
          otherCost: 0,
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
        setError(err.message || '保存失败');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setRows([]);
    setCategoryId(0);
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

          {/* Selection Area */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'flex-start' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
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

            <Box sx={{ minWidth: 350, flex: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                库存商品（点击添加，可连续选择）
              </Typography>
              <ReactSelect<InventoryOption>
                options={inventoryOptions}
                onChange={handleInventorySelect}
                value={null}
                placeholder="选择商品..."
                noOptionsMessage={() => '没有可用商品'}
                closeMenuOnSelect={false}
                isClearable={false}
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: 40,
                  }),
                  menu: (base) => ({
                    ...base,
                    zIndex: 9999,
                  }),
                }}
              />
            </Box>
          </Box>

          {/* Selected Products Table */}
          {rows.length > 0 ? (
            <>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                已选商品：
              </Typography>
              <TableContainer sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>分类</TableCell>
                      <TableCell>商品名</TableCell>
                      <TableCell>单价（¥）</TableCell>
                      <TableCell>库存</TableCell>
                      <TableCell sx={{ width: 100 }}>数量</TableCell>
                      <TableCell>小计（¥）</TableCell>
                      <TableCell sx={{ width: 60 }}>操作</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, index) => (
                      <TableRow key={row.inventoryId}>
                        <TableCell>{row.categoryName || '-'}</TableCell>
                        <TableCell>{row.productName}</TableCell>
                        <TableCell>{row.unitPrice.toFixed(2)}</TableCell>
                        <TableCell>{row.stockQuantity}</TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            type="number"
                            value={row.quantity}
                            onChange={(e) =>
                              handleRowChange(index, 'quantity', Number(e.target.value))
                            }
                            slotProps={{ htmlInput: { min: 1, max: row.stockQuantity } }}
                            sx={{ width: 80 }}
                          />
                        </TableCell>
                        <TableCell>{calculateRowSubtotal(row).toFixed(2)}</TableCell>
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
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Total */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="h6">
                    合计：¥{calculateTotal().toFixed(2)}（{rows.length}件商品）
                  </Typography>
                </Box>
              </Box>
            </>
          ) : (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              请从上方选择商品添加
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          取消
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving || rows.length === 0}
        >
          {saving ? '保存中...' : '全部保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
