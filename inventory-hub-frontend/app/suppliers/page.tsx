'use client';

import { useState, useEffect } from 'react';
import { Box, Button, Alert, Snackbar } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Supplier } from '@/types';
import { useSuppliers } from './hooks/useSuppliers';
import SuppliersTable from './components/SuppliersTable';
import SupplierDialog from './components/SupplierDialog';

export default function SuppliersPage() {
  const { suppliers, loading, loadSuppliers, createSupplier, updateSupplier, deleteSupplier } = useSuppliers();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadSuppliers().catch(() => showSnackbar('加载供应商列表失败', 'error'));
  }, [loadSuppliers]);

  // 显示提示消息
  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // 打开新增对话框
  const handleAdd = () => {
    setEditingSupplier(null);
    setOpenDialog(true);
  };

  // 打开编辑对话框
  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setOpenDialog(true);
  };

  // 关闭对话框
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSupplier(null);
  };

  const handleSave = async (data: { name: string }) => {
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, data);
        showSnackbar('供应商更新成功');
      } else {
        await createSupplier(data);
        showSnackbar('供应商创建成功');
      }
      await loadSuppliers();
    } catch (error: any) {
      const message = error.response?.data || '操作失败';
      showSnackbar(typeof message === 'string' ? message : JSON.stringify(message), 'error');
      throw error;
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    if (!confirm(`确定要删除供应商"${supplier.name}"吗？`)) {
      return;
    }

    try {
      await deleteSupplier(supplier.id);
      showSnackbar('供应商删除成功');
      await loadSuppliers();
    } catch (error: any) {
      const message = error.response?.data || '删除失败';
      showSnackbar(typeof message === 'string' ? message : JSON.stringify(message), 'error');
    }
  };

  return (
    <>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          新增供应商
        </Button>
      </Box>

      <SuppliersTable
        suppliers={suppliers}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <SupplierDialog
        open={openDialog}
        supplier={editingSupplier}
        onClose={handleCloseDialog}
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
