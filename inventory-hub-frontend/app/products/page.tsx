'use client';

import { useState, useEffect } from 'react';
import { Box, Button, Alert, Snackbar } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { Product } from '@/types';
import { useProducts } from './hooks/useProducts';
import { useCategories } from './hooks/useCategories';
import ProductsTable from './components/ProductsTable';
import ProductDialog from './components/ProductDialog';

interface ProductFormData {
  categoryId: number;
  name: string;
}

export default function ProductsPage() {
  const { products, loading, loadProducts, createProduct, updateProduct, deleteProduct } = useProducts();
  const { categories, loadCategories } = useCategories();
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadProducts().catch(() => showSnackbar('加载商品列表失败', 'error'));
    loadCategories().catch(() => showSnackbar('加载分类列表失败', 'error'));
  }, [loadProducts, loadCategories]);

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setOpenDialog(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProduct(null);
  };

  const handleSave = async (formData: ProductFormData) => {
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData);
        showSnackbar('商品更新成功');
      } else {
        await createProduct(formData);
        showSnackbar('商品创建成功');
      }
    } catch (error: any) {
      const message = error.response?.data || '操作失败';
      showSnackbar(message, 'error');
      throw error;
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`确定要删除商品"${product.name}"吗？`)) {
      return;
    }

    try {
      await deleteProduct(product.id);
      showSnackbar('商品删除成功');
    } catch (error: any) {
      const message = error.response?.data || '删除失败';
      showSnackbar(message, 'error');
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
          新增商品
        </Button>
      </Box>

      <ProductsTable
        products={products}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ProductDialog
        open={openDialog}
        product={editingProduct}
        categories={categories}
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

