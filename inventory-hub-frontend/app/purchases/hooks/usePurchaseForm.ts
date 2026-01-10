'use client';

import { useState } from 'react';
import { PurchaseFormData } from '@/app/purchases/types/purchaseForm';

export function usePurchaseForm(initial?: Partial<PurchaseFormData>) {
  const [formData, setFormData] = useState<PurchaseFormData>({
    supplierId: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseNo: '',
    totalAmount: '',
    currencyType: 'CNY',
    exchangeRate: '',
    ...(initial || {}),
  });

  const reset = (overrides?: Partial<PurchaseFormData>) => {
    setFormData({
      supplierId: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseNo: '',
      totalAmount: '',
      currencyType: 'CNY',
      exchangeRate: '',
      ...(overrides || {}),
    });
  };

  return { formData, setFormData, reset };
}
