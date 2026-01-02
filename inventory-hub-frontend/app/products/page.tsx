'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Container,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { Product, Category } from '@/types';
import api from '@/lib/api';

interface ProductFormData {
  categoryId: number;
  name: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    categoryId: 0,
    name: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // 加载商品列表
  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error('加载商品失败:', error);
      showSnackbar('加载商品列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 加载分类列表
  const loadCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('加载分类失败:', error);
      showSnackbar('加载分类列表失败', 'error');
    }
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  // 显示提示消息
  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // 打开新增对话框
  const handleAdd = () => {
    setEditingProduct(null);
    setFormData({
      categoryId: 0,
      name: '',
    });
    setOpenDialog(true);
  };

  // 打开编辑对话框
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      categoryId: product.categoryId,
      name: product.name,
    });
    setOpenDialog(true);
  };

  // 关闭对话框
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProduct(null);
    setFormData({
      categoryId: 0,
      name: '',
    });
  };

  // 保存商品
  const handleSave = async () => {
    if (!formData.name.trim()) {
      showSnackbar('请输入商品名称', 'error');
      return;
    }
    if (!formData.categoryId) {
      showSnackbar('请选择分类', 'error');
      return;
    }

    try {
      if (editingProduct) {
        // 更新
        await api.put(`/products/${editingProduct.id}`, formData);
        showSnackbar('商品更新成功');
      } else {
        // 新增
        await api.post('/products', formData);
        showSnackbar('商品创建成功');
      }
      handleCloseDialog();
      loadProducts();
    } catch (error: any) {
      const message = error.response?.data || '操作失败';
      showSnackbar(message, 'error');
    }
  };

  // 删除商品
  const handleDelete = async (product: Product) => {
    if (!confirm(`确定要删除商品"${product.name}"吗？`)) {
      return;
    }

    try {
      await api.delete(`/products/${product.id}`);
      showSnackbar('商品删除成功');
      loadProducts();
    } catch (error: any) {
      const message = error.response?.data || '删除失败';
      showSnackbar(message, 'error');
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          商品管理
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          新增商品
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>商品名称</TableCell>
              <TableCell>分类</TableCell>
              <TableCell>创建时间</TableCell>
              <TableCell>更新时间</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  加载中...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id} hover>
                  <TableCell>{product.id}</TableCell>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.categoryName}</TableCell>
                  <TableCell>{new Date(product.createdAt).toLocaleString('zh-CN')}</TableCell>
                  <TableCell>{new Date(product.updatedAt).toLocaleString('zh-CN')}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEdit(product)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(product)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 新增/编辑对话框 */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingProduct ? '编辑商品' : '新增商品'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                label="商品名称"
                type="text"
                fullWidth
                variant="outlined"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>分类</InputLabel>
                <Select
                  value={formData.categoryId}
                  label="分类"
                  onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                >
                  <MenuItem value={0}>请选择分类</MenuItem>
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.id}>
                      {category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button onClick={handleSave} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 提示消息 */}
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
    </Container>
  );
}

