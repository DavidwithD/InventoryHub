'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import { Category } from '@/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      setCategories(res.data || []);
      return res.data;
    } catch (err) {
      console.error('loadCategories error', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCategory = useCallback(async (payload: { name: string }) => {
    try {
      const res = await api.post('/categories', payload);
      await loadCategories();
      return res.data;
    } catch (err) {
      console.error('createCategory error', err);
      throw err;
    }
  }, [loadCategories]);

  const updateCategory = useCallback(async (id: number, payload: { name: string }) => {
    try {
      const res = await api.put(`/categories/${id}`, payload);
      await loadCategories();
      return res.data;
    } catch (err) {
      console.error('updateCategory error', err);
      throw err;
    }
  }, [loadCategories]);

  const deleteCategory = useCallback(async (id: number) => {
    try {
      const res = await api.delete(`/categories/${id}`);
      await loadCategories();
      return res.data;
    } catch (err) {
      console.error('deleteCategory error', err);
      throw err;
    }
  }, [loadCategories]);

  return { categories, loading, loadCategories, createCategory, updateCategory, deleteCategory, setCategories };
}
