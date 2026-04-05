'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import { Inventory, CreateInventory } from '@/types';

export function useInventory() {
  const [inventories, setInventories] = useState<Inventory[]>([]);

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

  const create = useCallback(async (item: CreateInventory) => {
    try {
      const res = await api.post<Inventory>('/inventory', item);
      return res.data;
    } catch (err) {
      console.error('create inventory error', err);
      throw err;
    }
  }, []);

  const createBatch = useCallback(async (items: CreateInventory[]) => {
    try {
      const res = await api.post('/inventory/batch', { items });
      await loadAllInventories();
      return res.data;
    } catch (err) {
      console.error('createBatch error', err);
      throw err;
    }
  }, [loadAllInventories]);

  const updateInventory = useCallback(async (id: number, data: CreateInventory) => {
    try {
      const res = await api.put(`/inventory/${id}`, data);
      await loadAllInventories();
      return res.data;
    } catch (err) {
      console.error('updateInventory error', err);
      throw err;
    }
  }, [loadAllInventories]);

  const deleteInventory = useCallback(async (id: number) => {
    try {
      await api.delete(`/inventory/${id}`);
      await loadAllInventories();
    } catch (err) {
      console.error('deleteInventory error', err);
      throw err;
    }
  }, [loadAllInventories]);

  return {
    inventories,
    loadAllInventories,
    create,
    createBatch,
    updateInventory,
    deleteInventory,
    setInventories,
  };
}