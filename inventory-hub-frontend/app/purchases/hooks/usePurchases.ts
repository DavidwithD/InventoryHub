'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import { Purchase } from '@/types';

export function usePurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/purchases');
      setPurchases(res.data || []);
      return res.data;
    } catch (err) {
      console.error('loadPurchases error', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createPurchase = useCallback(async (payload: {
    supplierId: number;
    purchaseDate: string;
    purchaseNo: string;
    totalAmount: number;
    currencyType: string;
    exchangeRate: number;
  }) => {
    try {
      const res = await api.post('/purchases', payload);
      await loadPurchases();
      return res.data;
    } catch (err) {
      console.error('createPurchase error', err);
      throw err;
    }
  }, [loadPurchases]);

  const updatePurchase = useCallback(async (id: number, payload: {
    supplierId: number;
    purchaseDate: string;
    purchaseNo: string;
    totalAmount: number;
    currencyType: string;
    exchangeRate: number;
  }) => {
    try {
      const res = await api.put(`/purchases/${id}`, payload);
      await loadPurchases();
      return res.data;
    } catch (err) {
      console.error('updatePurchase error', err);
      throw err;
    }
  }, [loadPurchases]);

  const deletePurchase = useCallback(async (id: number) => {
    try {
      const res = await api.delete(`/purchases/${id}`);
      await loadPurchases();
      return res.data;
    } catch (err) {
      console.error('deletePurchase error', err);
      throw err;
    }
  }, [loadPurchases]);

  return { purchases, loading, loadPurchases, setPurchases, createPurchase, updatePurchase, deletePurchase };
}
