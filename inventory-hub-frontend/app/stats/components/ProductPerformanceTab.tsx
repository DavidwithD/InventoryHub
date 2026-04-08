'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableSortLabel,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Skeleton,
  Chip,
} from '@mui/material';
import { useStats, periodToDates, Period } from '../hooks/useStats';

type SortDir = 'asc' | 'desc';

export default function ProductPerformanceTab() {
  const { productsPage, loading, loadProductsPage } = useStats();
  const [period, setPeriod] = useState<Period>('30d');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [orderBy, setOrderBy] = useState<string>('revenue');
  const [dir, setDir] = useState<SortDir>('desc');

  const { startDate, endDate } = periodToDates(period);

  useEffect(() => {
    loadProductsPage(startDate, endDate);
  }, [period]);

  const handleSort = (col: string) => {
    if (orderBy === col) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setOrderBy(col); setDir('desc'); }
  };

  const categories = useMemo(() => {
    if (!productsPage) return ['All'];
    return ['All', ...Array.from(new Set(productsPage.products.map((p) => p.category))).sort()];
  }, [productsPage]);

  const filteredProducts = useMemo(() => {
    if (!productsPage) return [];
    return productsPage.products
      .filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchCat = categoryFilter === 'All' || p.category === categoryFilter;
        return matchSearch && matchCat;
      })
      .sort((a, b) => {
        const va = a[orderBy as keyof typeof a] as number | string;
        const vb = b[orderBy as keyof typeof b] as number | string;
        if (typeof va === 'number' && typeof vb === 'number')
          return dir === 'asc' ? va - vb : vb - va;
        return dir === 'asc'
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      });
  }, [productsPage, search, categoryFilter, orderBy, dir]);

  const best = productsPage?.products.reduce((a, b) => (a.marginPct > b.marginPct ? a : b), productsPage.products[0]);
  const worst = productsPage?.products.reduce((a, b) => (a.marginPct < b.marginPct ? a : b), productsPage.products[0]);

  const fmt = (n: number) => `¥${n.toLocaleString()}`;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Product Performance</Typography>
          <Typography variant="body2" color="text.secondary">Per-product deep dive</Typography>
        </Box>
        <ToggleButtonGroup
          value={period}
          exclusive
          onChange={(_, v) => v && setPeriod(v as Period)}
          size="small"
        >
          {(['7d', '30d', '3m', '1y'] as Period[]).map((p) => (
            <ToggleButton key={p} value={p} sx={{ px: 1.5, fontSize: 12 }}>{p}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Best / Worst margin */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 3 }}>
        <Paper
          sx={{
            p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider',
            borderLeft: '4px solid', borderLeftColor: 'success.main',
          }}
        >
          <Typography variant="caption" fontWeight={700} textTransform="uppercase" color="text.secondary">
            Best Margin
          </Typography>
          {loading && !productsPage ? (
            <Skeleton width="60%" height={32} />
          ) : best ? (
            <>
              <Typography variant="h6" fontWeight={700}>{best.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {best.marginPct}% margin · {fmt(best.revenue)} revenue
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">No data</Typography>
          )}
        </Paper>
        <Paper
          sx={{
            p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider',
            borderLeft: '4px solid', borderLeftColor: 'error.main',
          }}
        >
          <Typography variant="caption" fontWeight={700} textTransform="uppercase" color="text.secondary">
            Worst Margin
          </Typography>
          {loading && !productsPage ? (
            <Skeleton width="60%" height={32} />
          ) : worst && worst !== best ? (
            <>
              <Typography variant="h6" fontWeight={700}>{worst.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {worst.marginPct}% margin · {fmt(worst.revenue)} revenue
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">No data</Typography>
          )}
        </Paper>
      </Box>

      {/* Search + filter */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search product name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 220 }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Category</InputLabel>
          <Select
            label="Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Product table */}
      <Paper sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>All Products</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
          Sortable by any column
        </Typography>
        {loading && !productsPage ? (
          <Skeleton variant="rectangular" height={200} />
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {([
                    { key: 'name', label: 'Product' },
                    { key: 'category', label: 'Category' },
                    { key: 'revenue', label: 'Revenue' },
                    { key: 'profit', label: 'Profit' },
                    { key: 'marginPct', label: 'Margin %' },
                    { key: 'unitsSold', label: 'Units Sold' },
                  ] as const).map((col) => (
                    <TableCell key={col.key} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                      <TableSortLabel
                        active={orderBy === col.key}
                        direction={orderBy === col.key ? dir : 'desc'}
                        onClick={() => handleSort(col.key)}
                      >
                        {col.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredProducts.map((row) => (
                  <TableRow key={row.productId} hover>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.category}</TableCell>
                    <TableCell>{fmt(row.revenue)}</TableCell>
                    <TableCell>{fmt(row.profit)}</TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        sx={{
                          color: row.marginPct >= 30 ? 'success.main' : row.marginPct >= 10 ? 'text.primary' : 'error.main',
                        }}
                      >
                        {row.marginPct}%
                      </Typography>
                    </TableCell>
                    <TableCell>{row.unitsSold}</TableCell>
                  </TableRow>
                ))}
                {filteredProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                      No products match your filter
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>

      {/* Unsold products */}
      <Paper sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Unsold Products</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
          In inventory but never appeared in an order — may need pricing or promotion review
        </Typography>
        {loading && !productsPage ? (
          <Skeleton variant="rectangular" height={160} />
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Product</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Stock Qty</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Stock Value</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Purchased</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(productsPage?.unsoldProducts ?? []).map((row) => (
                  <TableRow key={row.productId} hover>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.category}</TableCell>
                    <TableCell>{row.stockQty}</TableCell>
                    <TableCell>{fmt(row.stockValue)}</TableCell>
                    <TableCell>{row.purchaseDate ? row.purchaseDate.slice(0, 10) : '—'}</TableCell>
                  </TableRow>
                ))}
                {(productsPage?.unsoldProducts ?? []).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                      All stocked products have had at least one sale
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
