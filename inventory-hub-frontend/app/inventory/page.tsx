'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useInventory } from './hooks/useInventory';
import { useCategories } from '../products/hooks/useCategories';
import InventoryTable, { SortField, SortOrder } from './components/InventoryTable';
import { Inventory } from '@/types';

type StockFilter = 'all' | 'low' | 'out';

export default function InventoryPage() {
  const router = useRouter();
  const { inventories, loadAllInventories } = useInventory();
  const { categories, loadCategories } = useCategories();

  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    setLoading(true);
    Promise.all([loadAllInventories(), loadCategories()]).finally(() => setLoading(false));
  }, [loadAllInventories, loadCategories]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const filtered = useMemo(() => {
    let result: Inventory[] = inventories;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((inv) => inv.productName.toLowerCase().includes(q));
    }

    if (categoryId !== '') {
      result = result.filter((inv) => inv.categoryId === categoryId);
    }

    if (stockFilter === 'out') {
      result = result.filter((inv) => inv.stockQuantity === 0);
    } else if (stockFilter === 'low') {
      result = result.filter((inv) => inv.stockQuantity > 0 && inv.stockQuantity < 5);
    }

    result = [...result].sort((a, b) => {
      let aVal: string | number | null | undefined;
      let bVal: string | number | null | undefined;

      switch (sortField) {
        case 'productName':
          aVal = a.productName;
          bVal = b.productName;
          break;
        case 'categoryName':
          aVal = a.categoryName ?? '';
          bVal = b.categoryName ?? '';
          break;
        case 'purchaseDate':
          aVal = a.purchaseDate ?? '';
          bVal = b.purchaseDate ?? '';
          break;
        case 'purchaseQuantity':
          aVal = a.purchaseQuantity;
          bVal = b.purchaseQuantity;
          break;
        case 'stockQuantity':
          aVal = a.stockQuantity;
          bVal = b.stockQuantity;
          break;
        case 'priceJpy':
          aVal = a.priceJpy;
          bVal = b.priceJpy;
          break;
        case 'priceCny':
          aVal = a.priceCny ?? -1;
          bVal = b.priceCny ?? -1;
          break;
        default:
          aVal = a.id;
          bVal = b.id;
      }

      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [inventories, search, categoryId, stockFilter, sortField, sortOrder]);

  const outOfStockCount = useMemo(
    () => inventories.filter((i) => i.stockQuantity === 0).length,
    [inventories]
  );
  const lowStockCount = useMemo(
    () => inventories.filter((i) => i.stockQuantity > 0 && i.stockQuantity < 5).length,
    [inventories]
  );

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            库存管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            共 {filtered.length} 条记录
            {outOfStockCount > 0 && (
              <Chip label={`缺货 ${outOfStockCount}`} color="error" size="small" sx={{ ml: 1 }} />
            )}
            {lowStockCount > 0 && (
              <Chip
                label={`低库存 ${lowStockCount}`}
                color="warning"
                size="small"
                sx={{ ml: 0.5 }}
              />
            )}
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => router.push('/inventory/import')}>
          采购导入
        </Button>
      </Box>

      {/* Filters */}
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
          alignItems: 'center',
          p: 2,
          bgcolor: 'background.paper',
          borderRadius: 1,
          boxShadow: 1,
        }}
      >
        <TextField
          size="small"
          placeholder="搜索商品名称…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>分类</InputLabel>
          <Select
            label="分类"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value as number | '')}
          >
            <MenuItem value="">全部分类</MenuItem>
            {categories.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <ToggleButtonGroup
          size="small"
          exclusive
          value={stockFilter}
          onChange={(_, v) => {
            if (v) setStockFilter(v);
          }}
        >
          <ToggleButton value="all">全部</ToggleButton>
          <ToggleButton value="low" sx={{ color: 'warning.main' }}>
            低库存
          </ToggleButton>
          <ToggleButton value="out" sx={{ color: 'error.main' }}>
            缺货
          </ToggleButton>
        </ToggleButtonGroup>

        {(search || categoryId !== '' || stockFilter !== 'all') && (
          <Button
            size="small"
            onClick={() => {
              setSearch('');
              setCategoryId('');
              setStockFilter('all');
            }}
          >
            清除筛选
          </Button>
        )}
      </Box>

      {/* Table */}
      <InventoryTable
        inventories={filtered}
        loading={loading}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
      />
    </Stack>
  );
}
