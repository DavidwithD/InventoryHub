'use client';

import { useEffect, useState } from 'react';
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
  Chip,
  LinearProgress,
  Skeleton,
  Link,
} from '@mui/material';
import { useStats } from '../hooks/useStats';

type Window = 30 | 60 | 90;

type SortDir = 'asc' | 'desc';

function useSortedRows<T>(rows: T[]) {
  const [orderBy, setOrderBy] = useState<keyof T | null>(null);
  const [dir, setDir] = useState<SortDir>('desc');

  const handleSort = (col: keyof T) => {
    if (orderBy === col) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setOrderBy(col); setDir('desc'); }
  };

  const sorted = orderBy
    ? [...rows].sort((a, b) => {
        const va = a[orderBy] as number | string;
        const vb = b[orderBy] as number | string;
        if (typeof va === 'number' && typeof vb === 'number')
          return dir === 'asc' ? va - vb : vb - va;
        return dir === 'asc'
          ? String(va).localeCompare(String(vb))
          : String(vb).localeCompare(String(va));
      })
    : rows;

  return { sorted, orderBy, dir, handleSort };
}

export default function InventoryHealthTab() {
  const { inventoryHealth, loading, loadInventoryHealth } = useStats();
  const [window, setWindow] = useState<Window>(60);

  useEffect(() => {
    loadInventoryHealth(window);
  }, [window]);

  const stockSort = useSortedRows(inventoryHealth?.stockLevels ?? []);
  const catSort = useSortedRows(inventoryHealth?.byCategory ?? []);
  const deadSort = useSortedRows(inventoryHealth?.deadStock ?? []);
  const slowSort = useSortedRows(inventoryHealth?.slowMovers ?? []);

  const statusColor = (s: string) =>
    s === 'healthy' ? 'success' : s === 'low' ? 'warning' : 'error';

  const fmt = (n: number) => `¥${n.toLocaleString()}`;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Inventory Health</Typography>
          <Typography variant="body2" color="text.secondary">
            Stock levels, dead stock, capital lock-up
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">Sales window:</Typography>
          <ToggleButtonGroup
            value={window}
            exclusive
            onChange={(_, v) => v && setWindow(v as Window)}
            size="small"
          >
            <ToggleButton value={30} sx={{ px: 1.5, fontSize: 12 }}>30d</ToggleButton>
            <ToggleButton value={60} sx={{ px: 1.5, fontSize: 12 }}>60d</ToggleButton>
            <ToggleButton value={90} sx={{ px: 1.5, fontSize: 12 }}>90d</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Anchor links */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 3 }}>
        {['stock-levels', 'by-category', 'dead-stock', 'slow-movers'].map((id) => (
          <Link
            key={id}
            href={`#inv-${id}`}
            underline="hover"
            sx={{
              fontSize: 12,
              px: 1.5,
              py: 0.5,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 20,
              bgcolor: 'background.paper',
            }}
          >
            {id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </Link>
        ))}
      </Box>

      {/* ── Stock Levels ── */}
      <Box id="inv-stock-levels" sx={{ scrollMarginTop: 80 }}>
        <Paper sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>Stock Levels per Product</Typography>
            {inventoryHealth && (
              <Chip
                label={`${inventoryHealth.stockLevels.filter(s => s.status !== 'healthy').length} low/critical`}
                color="error"
                size="small"
              />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            Progress bar = current stock as % of original purchase quantity. Threshold: &lt;20% critical, &lt;50% low.
          </Typography>
          {loading && !inventoryHealth ? (
            <Skeleton variant="rectangular" height={200} />
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {(['name', 'category', 'stockQty', null, 'status'] as const).map((col, i) => (
                      <TableCell key={i} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {col ? (
                          <TableSortLabel
                            active={stockSort.orderBy === col}
                            direction={stockSort.orderBy === col ? stockSort.dir : 'desc'}
                            onClick={() => stockSort.handleSort(col)}
                          >
                            {col === 'stockQty' ? 'Stock Qty' : col.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                          </TableSortLabel>
                        ) : 'Stock Level'}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stockSort.sorted.map((row) => (
                    <TableRow key={row.productId} hover>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{row.stockQty}</TableCell>
                      <TableCell sx={{ minWidth: 160 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(row.stockPct, 100)}
                            color={statusColor(row.status) as 'success' | 'warning' | 'error'}
                            sx={{ flex: 1, height: 6, borderRadius: 3 }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 36 }}>
                            {row.stockPct}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={row.status}
                          size="small"
                          color={statusColor(row.status) as 'success' | 'warning' | 'error'}
                          variant="outlined"
                          sx={{ textTransform: 'capitalize', fontSize: 11 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {stockSort.sorted.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                        No inventory data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>
      </Box>

      {/* ── By Category ── */}
      <Box id="inv-by-category" sx={{ scrollMarginTop: 80 }}>
        <Paper sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>By Category</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            Stock value = total inventory value. Capital lock-up = value of dead + slow stock only.
          </Typography>
          {loading && !inventoryHealth ? (
            <Skeleton variant="rectangular" height={160} />
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {(['category', 'stockValue', 'capitalLockup', 'turnoverRate'] as const).map((col) => (
                      <TableCell key={col} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        <TableSortLabel
                          active={catSort.orderBy === col}
                          direction={catSort.orderBy === col ? catSort.dir : 'desc'}
                          onClick={() => catSort.handleSort(col)}
                        >
                          {col === 'stockValue' ? 'Stock Value' : col === 'capitalLockup' ? 'Capital Lock-up' : col === 'turnoverRate' ? 'Turnover Rate' : 'Category'}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {catSort.sorted.map((row) => (
                    <TableRow key={row.category} hover>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{fmt(row.stockValue)}</TableCell>
                      <TableCell>{fmt(row.capitalLockup)}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ color: row.turnoverRate >= 2 ? 'success.main' : row.turnoverRate >= 1 ? 'warning.main' : 'error.main', fontWeight: 600 }}
                        >
                          {row.turnoverRate.toFixed(1)}×
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {catSort.sorted.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                        No data
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>
      </Box>

      {/* ── Dead Stock ── */}
      <Box id="inv-dead-stock" sx={{ scrollMarginTop: 80 }}>
        <Paper sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Dead Stock</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            stock_quantity &gt; 0, but zero sales in the selected {window}-day window
          </Typography>
          {loading && !inventoryHealth ? (
            <Skeleton variant="rectangular" height={160} />
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {(['name', 'category', 'qty', 'value', 'daysSinceLastSale'] as const).map((col) => (
                      <TableCell key={col} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        <TableSortLabel
                          active={deadSort.orderBy === col}
                          direction={deadSort.orderBy === col ? deadSort.dir : 'desc'}
                          onClick={() => deadSort.handleSort(col)}
                        >
                          {col === 'daysSinceLastSale' ? 'Days Since Last Sale' : col === 'qty' ? 'Qty' : col.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deadSort.sorted.map((row) => (
                    <TableRow key={row.productId} hover>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{row.qty}</TableCell>
                      <TableCell>{fmt(row.value)}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{ color: row.daysSinceLastSale > 90 ? 'error.main' : 'warning.main', fontWeight: 600 }}
                        >
                          {row.daysSinceLastSale}d
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {deadSort.sorted.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                        No dead stock
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>
      </Box>

      {/* ── Slow Movers ── */}
      <Box id="inv-slow-movers" sx={{ scrollMarginTop: 80 }}>
        <Paper sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>Slow Movers</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            Has sales, but velocity is low relative to remaining stock (&gt;52 weeks to clear)
          </Typography>
          {loading && !inventoryHealth ? (
            <Skeleton variant="rectangular" height={160} />
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {(['name', 'category', 'unitsSold', 'remainingQty', 'velocityPerWeek', 'weeksToClear', 'avgDaysToSell'] as const).map((col) => (
                      <TableCell key={col} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
                        <TableSortLabel
                          active={slowSort.orderBy === col}
                          direction={slowSort.orderBy === col ? slowSort.dir : 'desc'}
                          onClick={() => slowSort.handleSort(col)}
                        >
                          {col === 'velocityPerWeek' ? 'Velocity (units/wk)' : col === 'weeksToClear' ? 'Weeks to Clear' : col === 'avgDaysToSell' ? 'Avg Days to Sell' : col === 'unitsSold' ? 'Units Sold' : col === 'remainingQty' ? 'Remaining Qty' : col.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {slowSort.sorted.map((row) => (
                    <TableRow key={row.productId} hover>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{row.unitsSold}</TableCell>
                      <TableCell>{row.remainingQty}</TableCell>
                      <TableCell>{row.velocityPerWeek}</TableCell>
                      <TableCell>~{row.weeksToClear}</TableCell>
                      <TableCell>{row.avgDaysToSell}d</TableCell>
                    </TableRow>
                  ))}
                  {slowSort.sorted.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                        No slow movers
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
}
