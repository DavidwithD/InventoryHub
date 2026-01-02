'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import { Purchase } from '@/types';

export function usePurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const loadPurchases = useCallback(async () => {
    try {
      const res = await api.get<Purchase[]>('/purchases');
      setPurchases(res.data || []);
      return res.data;
    } catch (err) {
      console.error('loadPurchases error', err);
      throw err;
    }
  }, []);

  return { purchases, loadPurchases, setPurchases };
}
