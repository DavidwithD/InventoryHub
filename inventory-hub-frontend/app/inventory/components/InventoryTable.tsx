'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableSortLabel,
} from '@mui/material';
import { Inventory, Product, Purchase } from '@/types';

type OrderByType = 'productName' | 'purchaseNo' | 'stockQuantity' | 'unitCost' | 'purchaseAmount';

interface Props {
  inventories: Inventory[];
  products: Product[];
  purchases: Purchase[];
}

export default function InventoryTable({ inventories, products, purchases }: Props) {
  const [orderBy, setOrderBy] = useState<OrderByType>('productName');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [searchProductName, setSearchProductName] = useState('');
  const [filterCategory, setFilterCategory] = useState<number>(0);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const handleRequestSort = (property: OrderByType) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const getCategories = () => {
    const categoryMap = new Map<number, string>();
    products.forEach((p) => {
      if (p.categoryId && p.categoryName) {
        categoryMap.set(p.categoryId, p.categoryName);
      }
    });
    return Array.from(categoryMap.entries()).map(([id, name]) => ({ id, name }));
  };

  const getFilteredAndSortedInventories = () => {
    let filtered = [...inventories];

    // 商品名搜索
    if (searchProductName.trim()) {
      filtered = filtered.filter((inv) =>
        inv.productName?.toLowerCase().includes(searchProductName.toLowerCase())
      );
    }

    // 分类筛选
    if (filterCategory > 0) {
      const categoryProducts = products
        .filter((p) => p.categoryId === filterCategory)
        .map((p) => p.id);
      filtered = filtered.filter((inv) => categoryProducts.includes(inv.productId));
    }

    // 低库存筛选
    if (lowStockOnly) {
      filtered = filtered.filter((inv) => inv.stockQuantity > 0 && inv.stockQuantity < 5);
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (orderBy) {
        case 'productName':
          aValue = a.productName || '';
          bValue = b.productName || '';
          return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        case 'purchaseNo':
          aValue = purchases.find((p) => p.id === a.purchaseId)?.purchaseNo || '';
          bValue = purchases.find((p) => p.id === b.purchaseId)?.purchaseNo || '';
          return order === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        case 'stockQuantity':
          aValue = a.stockQuantity;
          bValue = b.stockQuantity;
          break;
        case 'unitCost':
          aValue = a.unitCost;
          bValue = b.unitCost;
          break;
        case 'purchaseAmount':
          aValue = a.purchaseAmountJpy;
          bValue = b.purchaseAmountJpy;
          break;
        default:
          return 0;
      }

      return order === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  };

  const filteredData = getFilteredAndSortedInventories();
  const hasFilters = searchProductName || filterCategory > 0 || lowStockOnly;

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        所有库存
      </Typography>

      {/* 筛选区域 */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <TextField
          label="搜索商品名"
          value={searchProductName}
          onChange={(e) => setSearchProductName(e.target.value)}
          placeholder="输入商品名搜索"
          sx={{ minWidth: 200, flex: 1 }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>分类筛选</InputLabel>
          <Select
            value={filterCategory}
            label="分类筛选"
            onChange={(e) => setFilterCategory(Number(e.target.value))}
          >
            <MenuItem value={0}>全部分类</MenuItem>
            {getCategories().map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>库存状态</InputLabel>
          <Select
            value={lowStockOnly ? 'low' : 'all'}
            label="库存状态"
            onChange={(e) => setLowStockOnly(e.target.value === 'low')}
          >
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="low">低库存 (&lt; 5)</MenuItem>
          </Select>
        </FormControl>
        <Button
          variant="text"
          onClick={() => {
            setSearchProductName('');
            setFilterCategory(0);
            setLowStockOnly(false);
          }}
        >
          清除筛选
        </Button>
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'productName'}
                  direction={orderBy === 'productName' ? order : 'asc'}
                  onClick={() => handleRequestSort('productName')}
                >
                  商品名
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'purchaseNo'}
                  direction={orderBy === 'purchaseNo' ? order : 'asc'}
                  onClick={() => handleRequestSort('purchaseNo')}
                >
                  进货单号
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'purchaseAmount'}
                  direction={orderBy === 'purchaseAmount' ? order : 'asc'}
                  onClick={() => handleRequestSort('purchaseAmount')}
                >
                  进货金额（¥）
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">进货数量</TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'unitCost'}
                  direction={orderBy === 'unitCost' ? order : 'asc'}
                  onClick={() => handleRequestSort('unitCost')}
                >
                  单位成本（¥）
                </TableSortLabel>
              </TableCell>
              <TableCell align="right">
                <TableSortLabel
                  active={orderBy === 'stockQuantity'}
                  direction={orderBy === 'stockQuantity' ? order : 'asc'}
                  onClick={() => handleRequestSort('stockQuantity')}
                >
                  库存数量
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((inv) => {
              const purchase = purchases.find((p) => p.id === inv.purchaseId);
              return (
                <TableRow
                  key={inv.id}
                  sx={{
                    bgcolor: inv.stockQuantity === 0 ? 'action.hover' : 'inherit',
                  }}
                >
                  <TableCell>{inv.productName}</TableCell>
                  <TableCell>{purchase?.purchaseNo || '-'}</TableCell>
                  <TableCell align="right">¥{inv.purchaseAmountJpy.toFixed(2)}</TableCell>
                  <TableCell align="right">{inv.purchaseQuantity}</TableCell>
                  <TableCell align="right">¥{inv.unitCost.toFixed(2)}</TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color:
                        inv.stockQuantity === 0
                          ? 'error.main'
                          : inv.stockQuantity < 5
                            ? 'warning.main'
                            : 'success.main',
                      fontWeight: 'bold',
                    }}
                  >
                    {inv.stockQuantity}
                    {inv.stockQuantity === 0 && ' (售罄)'}
                    {inv.stockQuantity > 0 && inv.stockQuantity < 5 && ' (低库存)'}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredData.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  暂无库存数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          共 {filteredData.length} 条库存记录
          {hasFilters && ` (已筛选，总共 ${inventories.length} 条)`}
        </Typography>
      </Box>
    </Paper>
  );
}
