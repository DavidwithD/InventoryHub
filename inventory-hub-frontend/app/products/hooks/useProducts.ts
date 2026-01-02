'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import { Product } from '@/types';

interface ProductFormData {
  categoryId: number;
  name: string;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<Product[]>('/products');
      setProducts(response.data);
      return response.data;
    } catch (error) {
      console.error('加载商品失败:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const createProduct = useCallback(async (data: ProductFormData) => {
    try {
      const response = await api.post('/products', data);
      await loadProducts();
      return response.data;
    } catch (error) {
      console.error('创建商品失败:', error);
      throw error;
    }
  }, [loadProducts]);

  const updateProduct = useCallback(async (id: number, data: ProductFormData) => {
    try {
      const response = await api.put(`/products/${id}`, data);
      await loadProducts();
      return response.data;
    } catch (error) {
      console.error('更新商品失败:', error);
      throw error;
    }
  }, [loadProducts]);

  const deleteProduct = useCallback(async (id: number) => {
    try {
      await api.delete(`/products/${id}`);
      await loadProducts();
    } catch (error) {
      console.error('删除商品失败:', error);
      throw error;
    }
  }, [loadProducts]);

  return {
    products,
    loading,
    loadProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
