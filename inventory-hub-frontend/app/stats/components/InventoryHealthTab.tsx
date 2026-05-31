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

  const statusLabel = (s: string) =>
    s === 'healthy' ? '健康' : s === 'low' ? '偏低' : '告急';

  const fmt = (n: number) => `¥${n.toLocaleString()}`;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>库存健康</Typography>
          <Typography variant="body2" color="text.secondary">
            库存水平、滞销库存、资金占用
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">销售周期：</Typography>
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
        {([
          { id: 'stock-levels', label: '库存水平' },
          { id: 'by-category', label: '按分类' },
          { id: 'dead-stock', label: '滞销库存' },
          { id: 'slow-movers', label: '慢动销商品' },
        ]).map(({ id, label }) => (
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
            {label}
          </Link>
        ))}
      </Box>

      {/* ── Stock Levels ── */}
      <Box id="inv-stock-levels" sx={{ scrollMarginTop: 80 }}>
        <Paper sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>各商品库存水平</Typography>
            {inventoryHealth && (
              <Chip
                label={`${inventoryHealth.stockLevels.filter(s => s.status !== 'healthy').length} 个偏低/告急`}
                color="error"
                size="small"
              />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            进度条 = 当前库存占原始采购数量的百分比。阈值：&lt;20% 告急，&lt;50% 偏低。
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
                            {col === 'stockQty' ? '库存数量' : col === 'name' ? '商品' : col === 'category' ? '分类' : '状态'}
                          </TableSortLabel>
                        ) : '库存水平'}
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
                          label={statusLabel(row.status)}
                          size="small"
                          color={statusColor(row.status) as 'success' | 'warning' | 'error'}
                          variant="outlined"
                          sx={{ fontSize: 11 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {stockSort.sorted.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                        暂无库存数据
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
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>按分类</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            库存价值 = 全部库存价值。资金占用 = 仅滞销 + 慢动销库存的价值。
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
                          {col === 'stockValue' ? '库存价值' : col === 'capitalLockup' ? '资金占用' : col === 'turnoverRate' ? '周转率' : '分类'}
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
                        暂无数据
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
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>滞销库存</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            库存数量 &gt; 0，但在所选的 {window} 天周期内零销量
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
                          {col === 'daysSinceLastSale' ? '距上次销售天数' : col === 'qty' ? '数量' : col === 'value' ? '价值' : col === 'name' ? '商品' : '分类'}
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
                          {row.daysSinceLastSale}天
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {deadSort.sorted.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                        无滞销库存
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
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>慢动销商品</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
            有销量，但相对剩余库存动销速度过慢（清空需 &gt;52 周）
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
                          {col === 'velocityPerWeek' ? '动销速度（件/周）' : col === 'weeksToClear' ? '清空所需周数' : col === 'avgDaysToSell' ? '平均售出天数' : col === 'unitsSold' ? '已售件数' : col === 'remainingQty' ? '剩余数量' : col === 'name' ? '商品' : '分类'}
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
                      <TableCell>{row.avgDaysToSell}天</TableCell>
                    </TableRow>
                  ))}
                  {slowSort.sorted.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                        无慢动销商品
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
