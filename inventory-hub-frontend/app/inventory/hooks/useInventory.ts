'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import { Inventory, CreateInventory } from '@/types';

export function useInventory() {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [expectedTotalJpy, setExpectedTotalJpy] = useState<number>(0);

  const loadAllInventories = useCallback(async () => {
    try {
      const res = await api.get<Inventory[]>('/inventory');
      setInventories(res.data || []);
      return res.data;
    } catch (err) {
      console.error('loadAllInventories error', err);
      throw err;
    }
  }, []);

  const loadInventoriesByPurchase = useCallback(async (purchaseId: number) => {
    try {
      const res = await api.get<Inventory[]>(`/inventory?purchaseId=${purchaseId}`);
      setInventories(res.data || []);
      return res.data;
    } catch (err) {
      console.error('loadInventoriesByPurchase error', err);
      throw err;
    }
  }, []);

  const loadExpectedTotal = useCallback(async (purchaseId: number) => {
    try {
      const res = await api.get<number>(`/inventory/purchase/${purchaseId}/expected-total-jpy`);
      setExpectedTotalJpy(res.data || 0);
      return res.data;
    } catch (err) {
      console.error('loadExpectedTotal error', err);
      setExpectedTotalJpy(0);
      throw err;
    }
  }, []);

  const createBatch = useCallback(async (items: CreateInventory[]) => {
    try {
      const res = await api.post('/inventory/batch', { items });
      // refresh list after creation
      await loadAllInventories();
      return res.data;
    } catch (err) {
      console.error('createBatch error', err);
      throw err;
    }
  }, [loadAllInventories]);

  return {
    inventories,
    expectedTotalJpy,
    loadAllInventories,
    loadInventoriesByPurchase,
    loadExpectedTotal,
    createBatch,
    setInventories,
  };
}
