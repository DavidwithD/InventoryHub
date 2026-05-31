'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Skeleton,
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useStats, periodToDates, Period } from '../hooks/useStats';

const SUPPLIER_COLORS = [
  '#4f46e5', '#7c3aed', '#db2777', '#ea580c', '#16a34a',
  '#0891b2', '#ca8a04', '#9333ea', '#059669', '#dc2626',
];

export default function PurchaseSupplyTab() {
  const { purchasesPage, loading, loadPurchasesPage } = useStats();
  const [period, setPeriod] = useState<Period>('1y');
  const [granularity, setGranularity] = useState<'week' | 'month' | 'quarter'>('month');
  const [selectedProduct, setSelectedProduct] = useState<string>('');

  const { startDate, endDate } = periodToDates(period);

  useEffect(() => {
    loadPurchasesPage(startDate, endDate, granularity);
  }, [period, granularity]);

  // Transform stacked spending data for Recharts
  const spendingData = useMemo(() => {
    if (!purchasesPage) return [];
    const suppliers = purchasesPage.supplierNames;
    return purchasesPage.spendingTrend.map((pt) => {
      const row: Record<string, number | string> = { period: pt.period };
      suppliers.forEach((s) => {
        const found = pt.bySupplier.find((x) => x.supplier === s);
        row[s] = found?.amount ?? 0;
      });
      return row;
    });
  }, [purchasesPage]);

  // Filter unit cost trend by product name
  const filteredCostTrend = useMemo(() => {
    if (!purchasesPage) return [];
    if (!selectedProduct) return purchasesPage.unitCostTrend;
    return purchasesPage.unitCostTrend.filter((p) =>
      p.purchaseNo.toLowerCase().includes(selectedProduct.toLowerCase())
    );
  }, [purchasesPage, selectedProduct]);

  const fmt = (n: number) => `¥${n.toLocaleString()}`;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>采购与供应</Typography>
          <Typography variant="body2" color="text.secondary">
            支出历史、成本趋势、供应商集中度
          </Typography>
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

      {/* Spending over time by supplier */}
      <Paper sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>支出趋势 —— 按供应商</Typography>
            <Typography variant="caption" color="text.secondary">堆叠柱状图；每种颜色代表一家供应商</Typography>
          </Box>
          <ToggleButtonGroup
            value={granularity}
            exclusive
            onChange={(_, v) => v && setGranularity(v)}
            size="small"
          >
            <ToggleButton value="week" sx={{ px: 1.5, fontSize: 12 }}>周</ToggleButton>
            <ToggleButton value="month" sx={{ px: 1.5, fontSize: 12 }}>月</ToggleButton>
            <ToggleButton value="quarter" sx={{ px: 1.5, fontSize: 12 }}>季度</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        {loading && !purchasesPage ? (
          <Skeleton variant="rectangular" height={220} />
        ) : spendingData.length === 0 ? (
          <Box sx={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">该时间段暂无采购数据</Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={spendingData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => fmt(Number(v))} />
              <Legend />
              {(purchasesPage?.supplierNames ?? []).map((s, i) => (
                <Bar key={s} dataKey={s} stackId="a" fill={SUPPLIER_COLORS[i % SUPPLIER_COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Paper>

      {/* Exchange rate + Unit cost side by side */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
        {/* Exchange rate history */}
        <Paper sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" fontWeight={700}>汇率历史</Typography>
            <Typography variant="caption" color="text.secondary">日元/人民币随时间变化 —— 成本趋势参考</Typography>
          </Box>
          {loading && !purchasesPage ? (
            <Skeleton variant="rectangular" height={200} />
          ) : (purchasesPage?.exchangeRates ?? []).length === 0 ? (
            <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">暂无人民币采购数据</Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={purchasesPage?.exchangeRates} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="rate" name="日元/人民币" stroke="#4f46e5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Paper>

        {/* Unit cost trend */}
        <Paper sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>平均单位成本趋势</Typography>
              <Typography variant="caption" color="text.secondary">按采购批次 —— 成本是否在上涨？</Typography>
            </Box>
            {(purchasesPage?.products?.length ?? 0) > 0 && (
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>商品</InputLabel>
                <Select
                  label="商品"
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                >
                  <MenuItem value="">全部</MenuItem>
                  {(purchasesPage?.products ?? []).map((p) => (
                    <MenuItem key={p} value={p}>{p}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
          {loading && !purchasesPage ? (
            <Skeleton variant="rectangular" height={200} />
          ) : filteredCostTrend.length === 0 ? (
            <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">暂无采购批次数据</Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={filteredCostTrend} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmt(v)} />
                <Tooltip formatter={(v) => fmt(Number(v))} />
                <Line type="monotone" dataKey="unitCost" name="单位成本" stroke="#16a34a" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Paper>
      </Box>

      {/* Supplier concentration */}
      <Paper sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>供应商集中度</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          各供应商占总支出的百分比 —— 集中度过高 = 供应风险
        </Typography>
        {loading && !purchasesPage ? (
          <Skeleton variant="rectangular" height={160} />
        ) : (purchasesPage?.supplierConcentration ?? []).length === 0 ? (
          <Typography variant="body2" color="text.secondary">暂无数据</Typography>
        ) : (
          <Box>
            {(purchasesPage?.supplierConcentration ?? []).map((s, i) => (
              <Box key={s.supplierName} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ width: 130, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'text.secondary' }}
                >
                  {s.supplierName}
                </Typography>
                <Box sx={{ flex: 1, bgcolor: 'action.hover', borderRadius: 1, overflow: 'hidden' }}>
                  <Box
                    sx={{
                      width: `${s.pct}%`,
                      height: 16,
                      bgcolor: SUPPLIER_COLORS[i % SUPPLIER_COLORS.length],
                      borderRadius: 1,
                    }}
                  />
                </Box>
                <Typography variant="caption" sx={{ width: 38, textAlign: 'right', color: 'text.secondary', flexShrink: 0 }}>
                  {s.pct}%
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Paper>
    </Box>
  );
}
