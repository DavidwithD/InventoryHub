'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import { Supplier } from '@/types';

export function useSuppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/suppliers');
      setSuppliers(res.data || []);
      return res.data;
    } catch (err) {
      console.error('useSuppliers load error', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { suppliers, loading, loadSuppliers, setSuppliers };
}
