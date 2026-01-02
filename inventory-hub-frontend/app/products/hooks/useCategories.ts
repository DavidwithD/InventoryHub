'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import { Category } from '@/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<Category[]>('/categories');
      setCategories(response.data);
      return response.data;
    } catch (error) {
      console.error('加载分类失败:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    categories,
    loading,
    loadCategories,
  };
}
