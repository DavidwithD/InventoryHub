'use client';

import { useMemo, useState } from 'react';
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

interface ProductOption {
  productId: number;
  productName: string;
  categoryId?: number;
  totalStock: number;
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

  const productOptions = useMemo(() => {
    const byProduct = new Map<number, ProductOption>();
    for (const inv of inventories) {
      const existing = byProduct.get(inv.productId);
      if (existing) {
        existing.totalStock += inv.stockQuantity;
      } else {
        byProduct.set(inv.productId, {
          productId: inv.productId,
          productName: inv.productName,
          categoryId: inv.categoryId,
          totalStock: inv.stockQuantity,
        });
      }
    }
    return Array.from(byProduct.values());
  }, [inventories]);

  // 处理分类选择变化
  const handleCategoryChange = (tempId: string, categoryId: number) => {
    setCategorySelections({
      ...categorySelections,
      [tempId]: categoryId,
    });
    // 清空该行的商品选择
    onUpdateRow(tempId, 'productId', 0);
  };

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>商品分类</TableCell>
            <TableCell>商品</TableCell>
            <TableCell>数量</TableCell>
            <TableCell>操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => {
            const selectedCategoryId = categorySelections[row.tempId] || 0;
            const filteredOptions = productOptions.filter(
              (option) => selectedCategoryId === 0 || option.categoryId === selectedCategoryId
            );

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
                      value={row.productId}
                      onChange={(e: SelectChangeEvent<number>) =>
                        onUpdateRow(row.tempId, 'productId', Number(e.target.value))
                      }
                    >
                      <MenuItem value={0}>请选择商品</MenuItem>
                      {filteredOptions.map((option) => (
                        <MenuItem key={option.productId} value={option.productId}>
                          {option.productName}（库存：{option.totalStock}）
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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
