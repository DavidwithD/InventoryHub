'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Product, Category } from '@/types';

interface ProductFormData {
  categoryId: number;
  name: string;
}

interface Props {
  open: boolean;
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSave: (data: ProductFormData) => Promise<void>;
}

export default function ProductDialog({ open, product, categories, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<ProductFormData>({
    categoryId: 0,
    name: '',
  });
  const [errors, setErrors] = useState({ name: '', categoryId: '' });

  useEffect(() => {
    if (product) {
      setFormData({
        categoryId: product.categoryId,
        name: product.name,
      });
    } else {
      setFormData({
        categoryId: 0,
        name: '',
      });
    }
    setErrors({ name: '', categoryId: '' });
  }, [product, open]);

  const validate = (): boolean => {
    const newErrors = { name: '', categoryId: '' };
    let isValid = true;

    if (!formData.name.trim()) {
      newErrors.name = '请输入商品名称';
      isValid = false;
    }

    if (!formData.categoryId) {
      newErrors.categoryId = '请选择分类';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validate()) {
      return;
    }

    try {
      await onSave(formData);
      handleClose();
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const handleClose = () => {
    setFormData({ categoryId: 0, name: '' });
    setErrors({ name: '', categoryId: '' });
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {product ? '编辑商品' : '新增商品'}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12 }}>
            <TextField
              autoFocus
              label="商品名称"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              error={!!errors.name}
              helperText={errors.name}
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <FormControl fullWidth error={!!errors.categoryId}>
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
              {errors.categoryId && (
                <span style={{ color: '#d32f2f', fontSize: '0.75rem', marginTop: '3px', marginLeft: '14px' }}>
                  {errors.categoryId}
                </span>
              )}
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        <Button onClick={handleSave} variant="contained">
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
