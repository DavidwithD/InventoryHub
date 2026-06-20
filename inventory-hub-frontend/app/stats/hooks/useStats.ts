'use client';

import { useCallback, useState } from 'react';
import api from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardKpi {
  totalRevenue: number;
  totalProfit: number;
  avgMarginPct: number;
  ordersCount: number;
  avgOrderValue: number;
  stockValue: number;
  lowStockItems: number;
  revenuePctChange: number | null;
  profitPctChange: number | null;
  marginPpChange: number | null;
  ordersCountPctChange: number | null;
  avgOrderValuePctChange: number | null;
}

export interface TrendPoint {
  label: string;
  revenue: number;
  profit: number;
}

export interface CategorySales {
  category: string;
  revenue: number;
  pct: number;
}

export interface TopProduct {
  productId: number;
  name: string;
  category: string;
  revenue: number;
  profit: number;
  marginPct: number;
  unitsSold: number;
}

export interface StockLevel {
  productId: number;
  name: string;
  category: string;
  stockQty: number;
  purchaseQty: number;
  stockPct: number;
  status: 'healthy' | 'low' | 'critical';
}

export interface CategoryStock {
  category: string;
  stockValue: number;
  capitalLockup: number;
  turnoverRate: number;
}

export interface DeadStock {
  productId: number;
  name: string;
  category: string;
  qty: number;
  value: number;
  daysSinceLastSale: number;
}

export interface SlowMover {
  productId: number;
  name: string;
  category: string;
  unitsSold: number;
  remainingQty: number;
  velocityPerWeek: number;
  weeksToClear: number;
  avgDaysToSell: number;
}

export interface InventoryHealth {
  stockLevels: StockLevel[];
  byCategory: CategoryStock[];
  deadStock: DeadStock[];
  slowMovers: SlowMover[];
}

export interface ProductPerformance {
  productId: number;
  name: string;
  category: string;
  revenue: number;
  profit: number;
  marginPct: number;
  unitsSold: number;
}

export interface UnsoldProduct {
  productId: number;
  name: string;
  category: string;
  stockQty: number;
  stockValue: number;
  purchaseDate: string | null;
}

export interface ProductsPage {
  products: ProductPerformance[];
  unsoldProducts: UnsoldProduct[];
}

export interface SpendingPeriod {
  period: string;
  bySupplier: { supplier: string; amount: number }[];
}

export interface ExchangeRatePoint {
  date: string;
  rate: number;
  supplier: string;
}

export interface UnitCostPoint {
  purchaseNo: string;
  date: string;
  unitCost: number;
}

export interface SupplierConcentration {
  supplierName: string;
  totalSpend: number;
  pct: number;
}

export interface PurchasesPage {
  spendingTrend: SpendingPeriod[];
  supplierNames: string[];
  exchangeRates: ExchangeRatePoint[];
  unitCostTrend: UnitCostPoint[];
  supplierConcentration: SupplierConcentration[];
  products: string[];
}

// ── Date helpers ──────────────────────────────────────────────────────────────

export type Period = '7d' | '30d' | '3m' | '1y';

export function periodToDates(period: Period): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  if (period === '7d') start.setDate(end.getDate() - 6);
  else if (period === '30d') start.setDate(end.getDate() - 29);
  else if (period === '3m') start.setMonth(end.getMonth() - 3);
  else if (period === '1y') start.setFullYear(end.getFullYear() - 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useStats() {
  const [kpi, setKpi] = useState<DashboardKpi | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [inventoryHealth, setInventoryHealth] = useState<InventoryHealth | null>(null);
  const [productsPage, setProductsPage] = useState<ProductsPage | null>(null);
  const [purchasesPage, setPurchasesPage] = useState<PurchasesPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const withLoading = async (fn: () => Promise<void>) => {
    setLoading(true);
    setError('');
    try {
      await fn();
    } catch {
      setError('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const loadKpi = useCallback(
    (startDate: string, endDate: string) =>
      withLoading(async () => {
        const { data } = await api.get<DashboardKpi>('/stats/dashboard/kpi', {
          params: { startDate, endDate },
        });
        setKpi(data);
      }),
    []
  );

  const loadTrend = useCallback(
    (startDate: string, endDate: string, granularity: string) =>
      withLoading(async () => {
        const { data } = await api.get<TrendPoint[]>('/stats/dashboard/trend', {
          params: { startDate, endDate, granularity },
        });
        setTrend(data);
      }),
    []
  );

  const loadCategorySales = useCallback(
    (startDate: string, endDate: string) =>
      withLoading(async () => {
        const { data } = await api.get<CategorySales[]>('/stats/dashboard/category-sales', {
          params: { startDate, endDate },
        });
        setCategorySales(data);
      }),
    []
  );

  const loadTopProducts = useCallback(
    (startDate: string, endDate: string) =>
      withLoading(async () => {
        const { data } = await api.get<TopProduct[]>('/stats/dashboard/top-products', {
          params: { startDate, endDate },
        });
        setTopProducts(data);
      }),
    []
  );

  const loadInventoryHealth = useCallback(
    (windowDays: number) =>
      withLoading(async () => {
        const { data } = await api.get<InventoryHealth>('/stats/inventory', {
          params: { windowDays },
        });
        setInventoryHealth(data);
      }),
    []
  );

  const loadProductsPage = useCallback(
    (startDate: string, endDate: string) =>
      withLoading(async () => {
        const { data } = await api.get<ProductsPage>('/stats/products', {
          params: { startDate, endDate },
        });
        setProductsPage(data);
      }),
    []
  );

  const loadPurchasesPage = useCallback(
    (startDate: string, endDate: string, granularity: string, productId?: number) =>
      withLoading(async () => {
        const { data } = await api.get<PurchasesPage>('/stats/purchases', {
          params: { startDate, endDate, granularity, productId },
        });
        setPurchasesPage(data);
      }),
    []
  );

  return {
    kpi,
    trend,
    categorySales,
    topProducts,
    inventoryHealth,
    productsPage,
    purchasesPage,
    loading,
    error,
    loadKpi,
    loadTrend,
    loadCategorySales,
    loadTopProducts,
    loadInventoryHealth,
    loadProductsPage,
    loadPurchasesPage,
  };
}
