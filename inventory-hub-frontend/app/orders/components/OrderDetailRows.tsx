'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TextField,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  Box,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { OrderDetailRow, Inventory, Category } from '@/types';

interface Props {
  rows: OrderDetailRow[];
  inventories: Inventory[];
  categories: Category[];
  onUpdateRow: (tempId: string, field: keyof OrderDetailRow, value: any) => void;
  onRemoveRow: (tempId: string) => void;
}

export default function OrderDetailRows({
  rows,
  inventories,
  categories,
  onUpdateRow,
  onRemoveRow,
}: Props) {
  // 为每一行维护分类选择状态
  const [categorySelections, setCategorySelections] = useState<Record<string, number>>({});

  const calculateSubtotal = (row: OrderDetailRow): number => {
    return row.unitPrice * row.quantity + row.packagingCost + row.otherCost;
  };

  // 当选择商品后，自动设置该行的分类
  useEffect(() => {
    const newSelections: Record<string, number> = { ...categorySelections };
    let changed = false;

    rows.forEach((row) => {
      if (row.inventoryId > 0) {
        const inventory = inventories.find((inv) => inv.id === row.inventoryId);
        if (inventory && inventory.categoryId) {
          if (newSelections[row.tempId] !== inventory.categoryId) {
            newSelections[row.tempId] = inventory.categoryId;
            changed = true;
          }
        }
      }
    });

    if (changed) {
      setCategorySelections(newSelections);
    }
  }, [rows, inventories]);

  // 处理分类选择变化
  const handleCategoryChange = (tempId: string, categoryId: number) => {
    setCategorySelections({
      ...categorySelections,
      [tempId]: categoryId,
    });
    // 清空该行的商品选择
    onUpdateRow(tempId, 'inventoryId', 0);
  };

  // 获取指定分类下的库存商品
  const getFilteredInventories = (selectedCategoryId: number) => {
    return inventories.filter(
      (inv) =>
        inv.stockQuantity > 0 && (selectedCategoryId === 0 || inv.categoryId === selectedCategoryId)
    );
  };

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>商品分类</TableCell>
            <TableCell>库存商品</TableCell>
            <TableCell>单价（¥）</TableCell>
            <TableCell>数量</TableCell>
            <TableCell>可用库存</TableCell>
            <TableCell>包装费（¥）</TableCell>
            <TableCell>其他费用（¥）</TableCell>
            <TableCell>小计（¥）</TableCell>
            <TableCell>备注</TableCell>
            <TableCell>操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const selectedCategoryId = categorySelections[row.tempId] || 0;
            const filteredInventories = getFilteredInventories(selectedCategoryId);

            return (
              <TableRow key={row.tempId}>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 120 }}>
                    <Select
                      value={selectedCategoryId}
                      onChange={(e: SelectChangeEvent<number>) =>
                        handleCategoryChange(row.tempId, Number(e.target.value))
                      }
                    >
                      <MenuItem value={0}>全部分类</MenuItem>
                      {categories.map((cat) => (
                        <MenuItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <Select
                      value={row.inventoryId}
                      onChange={(e: SelectChangeEvent<number>) =>
                        onUpdateRow(row.tempId, 'inventoryId', Number(e.target.value))
                      }
                    >
                      <MenuItem value={0}>请选择商品</MenuItem>
                      {filteredInventories.map((inv) => (
                        <MenuItem key={inv.id} value={inv.id}>
                          {inv.productName}（库存：{inv.stockQuantity}）
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.unitPrice}
                    onChange={(e) => onUpdateRow(row.tempId, 'unitPrice', Number(e.target.value))}
                    size="small"
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.quantity}
                    onChange={(e) => onUpdateRow(row.tempId, 'quantity', Number(e.target.value))}
                    size="small"
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>{row.availableStock || 0}</TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.packagingCost}
                    onChange={(e) =>
                      onUpdateRow(row.tempId, 'packagingCost', Number(e.target.value))
                    }
                    size="small"
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.otherCost}
                    onChange={(e) => onUpdateRow(row.tempId, 'otherCost', Number(e.target.value))}
                    size="small"
                    sx={{ width: 100 }}
                  />
                </TableCell>
                <TableCell>{calculateSubtotal(row).toFixed(2)}</TableCell>
                <TableCell>
                  <TextField
                    value={row.notes}
                    onChange={(e) => onUpdateRow(row.tempId, 'notes', e.target.value)}
                    size="small"
                    sx={{ width: 120 }}
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => onRemoveRow(row.tempId)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
