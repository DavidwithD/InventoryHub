'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Button, Alert } from '@mui/material';
import { useOrders } from './hooks/useOrders';
import OrdersTable from './components/OrdersTable';
import OrderFilters from './components/OrderFilters';
import ImportDialog from './components/ImportDialog';
import { useOrderFilterStore } from '@/lib/stores/filterStore';
import OrdersCardList from './components/OrdersCardList';
import OrdersListToolbar from './components/OrdersListToolbar';
import { useViewMode } from '@/lib/stores/viewModeStore';
import { sortOrders } from './utils/sortOrders';
import { filterOrders } from './utils/filterOrders';
import { ordersToCsv } from './utils/ordersCsv';
import { takeOrdersListScroll } from './utils/listScroll';

export default function OrdersPage() {
  const { orders, loading, loadOrders, importFromCurl } = useOrders();

  const [error, setError] = useState('');
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [viewMode, setViewMode, viewModeHydrated] = useViewMode('orders');

  // Filters and sort persist across visits in localStorage (zustand persist).
  const {
    searchOrderNo,
    costStatus,
    startDate,
    endDate,
    sort,
    setSearchOrderNo,
    setCostStatus,
    setStartDate,
    setEndDate,
    setSort,
    reset: resetFilters,
  } = useOrderFilterStore();

  // The page loads all orders. Every filter, the dates too, runs on the client.
  useEffect(() => {
    useOrderFilterStore.persist.rehydrate();
    loadOrders().catch(() => setError('加载订单列表失败'));
  }, [loadOrders]);

  // After the user opens an order and comes back, scroll to where the list was.
  // The rows exist only after the orders load, so this waits for them. It runs once per visit.
  const scrollRestored = useRef(false);
  useEffect(() => {
    if (scrollRestored.current || !viewModeHydrated || loading || orders.length === 0) return;
    scrollRestored.current = true;
    const y = takeOrdersListScroll();
    if (y !== null) window.scrollTo(0, y);
  }, [viewModeHydrated, loading, orders.length]);

  // Memoized so the lists below can memoize their sort on this array.
  const filteredOrders = useMemo(
    () => filterOrders(orders, { search: searchOrderNo, costStatus, startDate, endDate }),
    [orders, searchOrderNo, costStatus, startDate, endDate]
  );

  // The file holds the filtered orders in the sort the list shows.
  const handleExportCsv = () => {
    const csv = ordersToCsv(sortOrders(filteredOrders, sort));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `订单数据_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (curlCommand: string) => {
    const result = await importFromCurl(curlCommand);
    await loadOrders();
    return result;
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Button variant="contained" onClick={() => setOpenImportDialog(true)}>
          批量导入订单
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <OrderFilters
        searchOrderNo={searchOrderNo}
        costStatus={costStatus}
        startDate={startDate}
        endDate={endDate}
        onSearchChange={setSearchOrderNo}
        onCostStatusChange={setCostStatus}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onClearFilter={resetFilters}
        onExport={handleExportCsv}
      />

      {viewModeHydrated && (
        <OrdersListToolbar
          count={filteredOrders.length}
          loading={loading}
          sort={sort}
          onSortChange={setSort}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      )}

      {!viewModeHydrated ? null : viewMode === 'card' ? (
        <OrdersCardList orders={filteredOrders} sort={sort} loading={loading} />
      ) : (
        <OrdersTable orders={filteredOrders} sort={sort} onSortChange={setSort} loading={loading} />
      )}

      <ImportDialog
        open={openImportDialog}
        onClose={() => setOpenImportDialog(false)}
        onImport={handleImport}
      />
    </>
  );
}
