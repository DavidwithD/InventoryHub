'use client';

import { useState, useCallback } from 'react';
import { fetchExchangeRate as fetchRateFromLib } from '@/lib/exchangeRate';

export function useExchangeRate() {
  const [fetchingRate, setFetchingRate] = useState(false);

  const fetchExchangeRate = useCallback(async () => {
    setFetchingRate(true);
    try {
      const rate = await fetchRateFromLib();
      return rate;
    } finally {
      setFetchingRate(false);
    }
  }, []);

  return { fetchingRate, fetchExchangeRate };
}
