'use client';

import { useState, useEffect } from 'react';
import CategoriesTable from './components/CategoriesTable';
import CategoriesToolbar from './components/CategoriesToolbar';
import CategoryDialog from './components/CategoryDialog';
import { useCategories } from './hooks/useCategories';
import { Alert, Snackbar } from '@mui/material';

export default function CategoriesPage() {
  const { categories, loading, loadCategories, createCategory, updateCategory, deleteCategory } = useCategories();

  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadCategories().catch((e) => showSnackbar('加载分类列表失败', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setOpenDialog(true);
  };

  const handleEdit = (category: any) => {
    setEditingCategory(category);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCategory(null);
  };

  const handleSave = async (payload: { name: string }) => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
        showSnackbar('分类更新成功');
      } else {
        await createCategory(payload);
        showSnackbar('分类创建成功');
      }
    } catch (error: any) {
      const message = error.response?.data || '操作失败';
      showSnackbar(message, 'error');
    }
  };

  const handleDelete = async (category: any) => {
    try {
      await deleteCategory(category.id);
      showSnackbar('分类删除成功');
    } catch (error: any) {
      const message = error.response?.data || '删除失败';
      showSnackbar(message, 'error');
    }
  };

  return (
    <>
      <CategoriesToolbar onAdd={handleAdd} />

      <CategoriesTable categories={categories} loading={loading} onEdit={handleEdit} onDelete={handleDelete} />

      <CategoryDialog open={openDialog} onClose={handleCloseDialog} initialCategory={editingCategory || undefined} onSave={handleSave} />

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
