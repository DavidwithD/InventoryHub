'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Purchase } from '@/types';
import PurchasesTable from '@/app/purchases/components/PurchasesTable';
import PurchasesToolbar from '@/app/purchases/components/PurchasesToolbar';
import PurchaseDialog from '@/app/purchases/components/PurchaseDialog';
import { usePurchases } from '@/app/purchases/hooks/usePurchases';
import { useSuppliers } from '@/app/purchases/hooks/useSuppliers';
import { Alert, Snackbar } from '@mui/material';

const EXCHANGE_RATE_KEY = 'lastExchangeRate';

export default function PurchasesPage() {
  const { purchases, loading, loadPurchases, deletePurchase, createPurchase, updatePurchase } =
    usePurchases();
  const { suppliers, loadSuppliers } = useSuppliers();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filters, setFilters] = useState({
    purchaseNo: '',
    supplierId: 0,
    dateRange: 'all',
    startDate: '',
    endDate: '',
    sortBy: 'id',
    sortOrder: 'desc',
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  // 初始化：加载供应商和从 URL 读取筛选参数
  useEffect(() => {
    loadSuppliers().catch(() => showSnackbar('加载供应商列表失败', 'error'));

    const purchaseNoFromUrl = searchParams.get('purchaseNo');
    if (purchaseNoFromUrl) {
      setFilters((prev) => ({ ...prev, purchaseNo: purchaseNoFromUrl }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 筛选条件变化时重新加载数据
  useEffect(() => {
    loadPurchases(filters).catch(() => showSnackbar('加载进货列表失败', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleAdd = () => {
    setEditingPurchase(null);
    setOpenDialog(true);
  };

  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPurchase(null);
  };

  const handleSave = async (payload: {
    supplierId: number;
    purchaseDate: string;
    purchaseNo: string;
    totalAmount: number;
    currencyType: string;
    exchangeRate: number;
  }) => {
    try {
      localStorage.setItem(EXCHANGE_RATE_KEY, String(payload.exchangeRate));
      if (editingPurchase) {
        await updatePurchase(editingPurchase.id, payload);
        showSnackbar('进货更新成功');
      } else {
        await createPurchase(payload);
        showSnackbar('进货创建成功');
      }
    } catch (error: any) {
      const message = error.response?.data || '操作失败';
      showSnackbar(message, 'error');
    }
  };

  const handleDelete = async (purchase: Purchase) => {
    if (!confirm(`确定要删除进货单"${purchase.purchaseNo}"吗？`)) return;
    try {
      await deletePurchase(purchase.id);
      showSnackbar('进货删除成功');
    } catch (err: any) {
      const message = err.response?.data || '删除失败';
      showSnackbar(message, 'error');
    }
  };

  return (
    <>
      <PurchasesToolbar
        onAdd={handleAdd}
        suppliers={suppliers}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      <PurchasesTable
        purchases={purchases}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <PurchaseDialog
        open={openDialog}
        onClose={handleCloseDialog}
        initialPurchase={editingPurchase || undefined}
        onSave={handleSave}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
