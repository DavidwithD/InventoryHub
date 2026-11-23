'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useInventory } from './hooks/useInventory';
import { useCategories } from '../products/hooks/useCategories';
import InventoryTable, { SortField } from './components/InventoryTable';
import FactorAdjustDialog from './components/FactorAdjustDialog';
import ImpactConfirmDialog from './components/ImpactConfirmDialog';
import { Inventory, CreateInventory, InventoryImpact } from '@/types';
import { useInventoryFilterStore } from '@/lib/stores/filterStore';
import { countProductsByStatus, filterByStock, productStockTotals } from './utils/productStock';

export default function InventoryPage() {
  const router = useRouter();
  const { inventories, loadAllInventories, updateInventory, previewUpdate } = useInventory();
  const { categories, loadCategories } = useCategories();

  const [loading, setLoading] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<Inventory | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState('');
  const [pendingAdjust, setPendingAdjust] = useState<{
    id: number;
    payload: CreateInventory;
    impact: InventoryImpact;
  } | null>(null);

  // Filters persist across visits via localStorage (zustand persist).
  const {
    search,
    categoryId,
    stockFilter,
    showEmptyBatches,
    sortField,
    sortOrder,
    setSearch,
    setCategoryId,
    setStockFilter,
    setShowEmptyBatches,
    setSortField,
    setSortOrder,
  } = useInventoryFilterStore();

  useEffect(() => {
    useInventoryFilterStore.persist.rehydrate();
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadAllInventories(), loadCategories()]).finally(() => setLoading(false));
  }, [loadAllInventories, loadCategories]);

  const applyAdjust = async (id: number, payload: CreateInventory) => {
    setAdjusting(true);
    try {
      await updateInventory(id, payload);
      setAdjustTarget(null);
      setPendingAdjust(null);
    } catch {
      setAdjustError('调整失败');
    } finally {
      setAdjusting(false);
    }
  };

  const handleConfirmFactor = async (factor: number) => {
    if (!adjustTarget) return;
    setAdjustError('');
    const payload: CreateInventory = {
      productId: adjustTarget.productId,
      purchaseQuantity: adjustTarget.purchaseQuantity,
      initialStock: adjustTarget.purchaseQuantity * factor,
      priceJpy: Math.round(adjustTarget.priceJpy / factor),
      priceCny:
        adjustTarget.priceCny != null
          ? Math.round((adjustTarget.priceCny / factor) * 100) / 100
          : undefined,
      supplierId: adjustTarget.supplierId,
      purchaseDate: adjustTarget.purchaseDate,
      purchaseNo: adjustTarget.purchaseNo,
    };

    // 先查看对已有销售的影响。没有影响时直接保存。
    setAdjusting(true);
    let impact: InventoryImpact;
    try {
      impact = await previewUpdate(adjustTarget.id, payload);
    } catch {
      setAdjustError('无法计算调整影响');
      setAdjusting(false);
      return;
    }
    setAdjusting(false);

    if (impact.affectedLines === 0) {
      await applyAdjust(adjustTarget.id, payload);
    } else {
      setPendingAdjust({ id: adjustTarget.id, payload, impact });
    }
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const productStock = useMemo(() => productStockTotals(inventories), [inventories]);

  const filtered = useMemo(() => {
    let result: Inventory[] = inventories;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((inv) => inv.productName.toLowerCase().includes(q));
    }

    if (categoryId !== '') {
      result = result.filter((inv) => inv.categoryId === categoryId);
    }

    result = filterByStock(result, productStock, stockFilter, showEmptyBatches);

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
  }, [
    inventories,
    productStock,
    search,
    categoryId,
    stockFilter,
    showEmptyBatches,
    sortField,
    sortOrder,
  ]);

  // The header chips count products, not batches.
  const productCounts = useMemo(() => countProductsByStatus(productStock), [productStock]);

  return (
    <Stack spacing={2}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            库存管理
          </Typography>
          <Typography variant="body2" color="text.secondary" component="div">
            共 {filtered.length} 条记录
            {productCounts.out > 0 && (
              <Chip
                label={`缺货商品 ${productCounts.out}`}
                color="error"
                size="small"
                sx={{ ml: 1 }}
              />
            )}
            {productCounts.low > 0 && (
              <Chip
                label={`低库存商品 ${productCounts.low}`}
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

        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={showEmptyBatches || stockFilter === 'out'}
              disabled={stockFilter === 'out'}
              onChange={(e) => setShowEmptyBatches(e.target.checked)}
            />
          }
          label="显示空批次"
        />

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
        productStock={productStock}
        loading={loading}
        sortField={sortField}
        sortOrder={sortOrder}
        onSort={handleSort}
        onAdjustFactor={setAdjustTarget}
      />

      <FactorAdjustDialog
        key={adjustTarget?.id ?? 'none'}
        open={adjustTarget !== null}
        inventory={adjustTarget}
        submitting={adjusting}
        onClose={() => setAdjustTarget(null)}
        onConfirm={handleConfirmFactor}
      />

      <ImpactConfirmDialog
        open={pendingAdjust !== null}
        title="调整将影响已有销售"
        impact={pendingAdjust?.impact ?? null}
        confirmLabel="仍然应用"
        submitting={adjusting}
        onClose={() => setPendingAdjust(null)}
        onConfirm={() => pendingAdjust && applyAdjust(pendingAdjust.id, pendingAdjust.payload)}
      />

      <Snackbar
        open={!!adjustError}
        autoHideDuration={4000}
        onClose={() => setAdjustError('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setAdjustError('')}>
          {adjustError}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
