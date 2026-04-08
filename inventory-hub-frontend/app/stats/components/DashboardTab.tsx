'use client';

import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Skeleton,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  useStats,
  periodToDates,
  Period,
  TrendPoint,
  CategorySales,
  TopProduct,
  DashboardKpi,
} from '../hooks/useStats';

// ── KPI card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  change?: number | null;
  changeLabel?: string;
  isLive?: boolean;
  alert?: string;
  loading?: boolean;
}

function KpiCard({ label, value, change, changeLabel, isLive, alert, loading }: KpiCardProps) {
  const isUp = change !== null && change !== undefined && change > 0;
  const isDown = change !== null && change !== undefined && change < 0;

  return (
    <Paper
      sx={{
        p: 2.5,
        height: '100%',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'text.secondary',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        {label}
        {isLive && (
          <Box component="span" sx={{ color: 'success.main', fontSize: 10 }}>
            ●
          </Box>
        )}
      </Typography>
      {loading ? (
        <Skeleton variant="text" width="60%" height={40} />
      ) : (
        <Typography variant="h5" sx={{ fontWeight: 700, mt: 0.5 }}>
          {value}
        </Typography>
      )}
      {change !== null && change !== undefined && !loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
          {isUp ? (
            <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
          ) : isDown ? (
            <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />
          ) : null}
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: isUp ? 'success.main' : isDown ? 'error.main' : 'text.disabled',
            }}
          >
            {change > 0 ? '+' : ''}
            {change}
            {changeLabel ?? '% vs prev period'}
          </Typography>
        </Box>
      )}
      {alert && !loading && (
        <Chip
          icon={<WarningAmberIcon />}
          label={alert}
          size="small"
          color="error"
          variant="outlined"
          sx={{ mt: 0.5, fontSize: 10 }}
        />
      )}
      {isLive && !alert && !loading && (
        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 0.5 }}>
          Always live
        </Typography>
      )}
    </Paper>
  );
}

// ── Period picker ─────────────────────────────────────────────────────────────

interface PeriodPickerProps {
  value: Period;
  onChange: (p: Period) => void;
}

function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      onChange={(_, v) => v && onChange(v as Period)}
      size="small"
    >
      {(['7d', '30d', '3m', '1y'] as Period[]).map((p) => (
        <ToggleButton key={p} value={p} sx={{ px: 1.5, fontSize: 12 }}>
          {p}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

// ── Category palette ──────────────────────────────────────────────────────────

const CATEGORY_COLORS = [
  '#4f46e5', '#7c3aed', '#db2777', '#ea580c', '#16a34a',
  '#0891b2', '#ca8a04', '#9333ea', '#059669', '#dc2626',
];

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  onNavigateToProduct?: (productId: number) => void;
}

export default function DashboardTab({ onNavigateToProduct }: Props) {
  const {
    kpi, trend, categorySales, topProducts,
    loading,
    loadKpi, loadTrend, loadCategorySales, loadTopProducts,
  } = useStats();

  const [period, setPeriod] = useState<Period>('30d');
  const [trendGranularity, setTrendGranularity] = useState<'day' | 'week' | 'month'>('week');
  const [chartType, setChartType] = useState<'donut' | 'bar'>('donut');

  const { startDate, endDate } = periodToDates(period);

  useEffect(() => {
    loadKpi(startDate, endDate);
    loadCategorySales(startDate, endDate);
    loadTopProducts(startDate, endDate);
  }, [period]);

  useEffect(() => {
    loadTrend(startDate, endDate, trendGranularity);
  }, [period, trendGranularity]);

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `¥${(n / 1_000_000).toFixed(1)}M`
      : `¥${n.toLocaleString()}`;

  return (
    <Box>
      {/* Period picker */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sales &amp; profit overview
          </Typography>
        </Box>
        <PeriodPicker value={period} onChange={setPeriod} />
      </Box>

      {/* KPI row */}
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
        Cards marked with ● are always live — they ignore the date filter.
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
          <KpiCard
            label="Total Revenue"
            value={kpi ? fmt(kpi.totalRevenue) : '—'}
            change={kpi?.revenuePctChange}
            loading={loading && !kpi}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
          <KpiCard
            label="Total Profit"
            value={kpi ? fmt(kpi.totalProfit) : '—'}
            change={kpi?.profitPctChange}
            loading={loading && !kpi}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
          <KpiCard
            label="Avg Margin %"
            value={kpi ? `${kpi.avgMarginPct}%` : '—'}
            change={kpi?.marginPpChange}
            changeLabel="pp vs prev period"
            loading={loading && !kpi}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
          <KpiCard
            label="Orders"
            value={kpi ? kpi.ordersCount.toLocaleString() : '—'}
            change={kpi?.ordersCountPctChange}
            loading={loading && !kpi}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
          <KpiCard
            label="Avg Order Value"
            value={kpi ? fmt(kpi.avgOrderValue) : '—'}
            change={kpi?.avgOrderValuePctChange}
            loading={loading && !kpi}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
          <KpiCard
            label="Stock Value"
            value={kpi ? fmt(kpi.stockValue) : '—'}
            isLive
            loading={loading && !kpi}
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
          <KpiCard
            label="Low Stock Items"
            value={kpi ? kpi.lowStockItems.toString() : '—'}
            isLive
            alert={kpi && kpi.lowStockItems > 0 ? 'Needs reorder' : undefined}
            loading={loading && !kpi}
          />
        </Grid>
      </Grid>

      {/* Charts row */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Revenue vs Profit trend */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Revenue vs. Profit
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Toggle granularity
                </Typography>
              </Box>
              <ToggleButtonGroup
                value={trendGranularity}
                exclusive
                onChange={(_, v) => v && setTrendGranularity(v)}
                size="small"
              >
                <ToggleButton value="day" sx={{ px: 1.5, fontSize: 12 }}>Day</ToggleButton>
                <ToggleButton value="week" sx={{ px: 1.5, fontSize: 12 }}>Week</ToggleButton>
                <ToggleButton value="month" sx={{ px: 1.5, fontSize: 12 }}>Month</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {trend.length === 0 && loading ? (
              <Skeleton variant="rectangular" height={220} />
            ) : trend.length === 0 ? (
              <Box
                sx={{
                  height: 220,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No data for this period
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={trend} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => `¥${Number(v).toLocaleString()}`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name="Profit"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>

        {/* Sales by Category */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}
            >
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>
                  Sales by Category
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Share of total revenue
                </Typography>
              </Box>
              <ToggleButtonGroup
                value={chartType}
                exclusive
                onChange={(_, v) => v && setChartType(v)}
                size="small"
              >
                <ToggleButton value="donut" sx={{ px: 1.5, fontSize: 12 }}>Donut</ToggleButton>
                <ToggleButton value="bar" sx={{ px: 1.5, fontSize: 12 }}>Bar</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {categorySales.length === 0 && loading ? (
              <Skeleton variant="rectangular" height={200} />
            ) : categorySales.length === 0 ? (
              <Box
                sx={{
                  height: 200,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No data for this period
                </Typography>
              </Box>
            ) : chartType === 'donut' ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={categorySales as unknown as Record<string, unknown>[]}
                      dataKey="revenue"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                    >
                      {categorySales.map((_, i) => (
                        <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => `¥${Number(v).toLocaleString()}`} />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ flex: 1 }}>
                  {categorySales.map((c, i) => (
                    <Box key={c.category} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          bgcolor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                          flexShrink: 0,
                        }}
                      />
                      <Typography variant="caption" sx={{ flex: 1 }}>
                        {c.category}
                      </Typography>
                      <Typography variant="caption" fontWeight={600}>
                        {c.pct}%
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  layout="vertical"
                  data={categorySales as unknown as Record<string, unknown>[]}
                  margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
                >
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="category" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip formatter={(v) => `¥${Number(v).toLocaleString()}`} />
                  <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]}>
                    {categorySales.map((_, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Top 5 Products */}
      <Paper sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
          Top 5 Products by Revenue
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          Click a bar to navigate to Product Performance
        </Typography>
        {topProducts.length === 0 && loading ? (
          <Skeleton variant="rectangular" height={160} />
        ) : topProducts.length === 0 ? (
          <Box
            sx={{
              height: 160,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'action.hover',
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              No data for this period
            </Typography>
          </Box>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              layout="vertical"
              data={topProducts as unknown as Record<string, unknown>[]}
              margin={{ top: 0, right: 60, bottom: 0, left: 0 }}
              onClick={(e: unknown) => {
                const payload = (e as { activePayload?: { payload?: { productId?: number } }[] })?.activePayload;
                const productId = payload?.[0]?.payload?.productId;
                if (productId && onNavigateToProduct) onNavigateToProduct(productId);
              }}
            >
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `¥${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
              <Tooltip formatter={(v) => `¥${Number(v).toLocaleString()}`} />
              <Bar dataKey="revenue" name="Revenue" fill="#4f46e5" radius={[0, 4, 4, 0]} cursor="pointer" />
              <Bar dataKey="profit" name="Profit" fill="#22c55e" radius={[0, 4, 4, 0]} cursor="pointer" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Paper>
    </Box>
  );
}
