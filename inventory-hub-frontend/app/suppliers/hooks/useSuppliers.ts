'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import { Supplier } from '@/types';

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/suppliers');
      setSuppliers(response.data);
    } catch (error) {
      console.error('加载供应商失败:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const createSupplier = useCallback(async (data: { name: string }) => {
    const response = await api.post('/suppliers', data);
    return response.data;
  }, []);

  const updateSupplier = useCallback(async (id: number, data: { name: string }) => {
    const response = await api.put(`/suppliers/${id}`, data);
    return response.data;
  }, []);

  const deleteSupplier = useCallback(async (id: number) => {
    await api.delete(`/suppliers/${id}`);
  }, []);

  return {
    suppliers,
    loading,
    loadSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  };
}
