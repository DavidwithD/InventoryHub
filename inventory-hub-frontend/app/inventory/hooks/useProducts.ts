'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import { Product } from '@/types';

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);

  const loadProducts = useCallback(async () => {
    try {
      const res = await api.get<Product[]>('/products');
      setProducts(res.data || []);
      return res.data;
    } catch (err) {
      console.error('loadProducts error', err);
      throw err;
    }
  }, []);

  return { products, loadProducts, setProducts };
}
