'use client';

import { useState, useEffect } from 'react';
import { apiErrorMessage } from '@/lib/apiErrorMessage';
import CategoriesTable from './components/CategoriesTable';
import CategoriesToolbar from './components/CategoriesToolbar';
import CategoryDialog from './components/CategoryDialog';
import { useCategories } from './hooks/useCategories';
import { Category } from '@/types';
import { Alert, Snackbar } from '@mui/material';

export default function CategoriesPage() {
  const { categories, loading, loadCategories, createCategory, updateCategory, deleteCategory } = useCategories();

  const [openDialog, setOpenDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  useEffect(() => {
    loadCategories().catch(() => showSnackbar('加载分类列表失败', 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = () => {
    setEditingCategory(null);
    setOpenDialog(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCategory(null);
  };

  // A failed save rejects. The dialog then stays open and shows the error.
  const handleSave = async (payload: { name: string }) => {
    if (editingCategory) {
      await updateCategory(editingCategory.id, payload);
      showSnackbar('分类更新成功');
    } else {
      await createCategory(payload);
      showSnackbar('分类创建成功');
    }
  };

  const handleDelete = async (category: Category) => {
    try {
      await deleteCategory(category.id);
      showSnackbar('分类删除成功');
    } catch (error) {
      const message = apiErrorMessage(error, '删除失败');
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
