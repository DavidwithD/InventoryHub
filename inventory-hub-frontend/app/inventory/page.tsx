'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Paper } from '@mui/material';
import { Purchase } from '@/types';
import { useInventory } from './hooks/useInventory';
import { useProducts } from './hooks/useProducts';
import { usePurchases } from './hooks/usePurchases';
import InventoryToolbar from './components/InventoryToolbar';
import InventoryTable from './components/InventoryTable';
import InventoryEditTable from './components/InventoryEditTable';

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const { inventories, loadAllInventories } = useInventory();
  const { products, loadProducts } = useProducts();
  const { purchases, loadPurchases } = usePurchases();
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number>(0);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | undefined>(undefined);

  useEffect(() => {
    setSelectedPurchase(purchases.find((p) => p.id === selectedPurchaseId) || undefined);
  }, [selectedPurchaseId, purchases]);

  useEffect(() => {
    loadProducts();
    loadPurchases();
    loadAllInventories();
  }, [loadProducts, loadPurchases, loadAllInventories]);

  // 从 URL 读取 purchaseId 参数并自动选择
  useEffect(() => {
    const purchaseIdParam = searchParams.get('purchaseId');
    if (purchaseIdParam) {
      const id = parseInt(purchaseIdParam, 10);
      if (!isNaN(id)) {
        setSelectedPurchaseId(id);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (selectedPurchaseId === 0) {
      loadAllInventories();
    }
  }, [selectedPurchaseId, loadAllInventories]);

  return (
    <>
      <InventoryToolbar
        purchases={purchases}
        selectedPurchaseId={selectedPurchaseId}
        onSelectPurchase={setSelectedPurchaseId}
      />

      {selectedPurchase ? (
        <Paper sx={{ p: 3 }}>
          <InventoryEditTable
            selectedPurchaseId={selectedPurchaseId}
            products={products}
            selectedPurchase={selectedPurchase}
          />
        </Paper>
      ) : (
        <InventoryTable inventories={inventories} products={products} purchases={purchases} />
      )}
    </>
  );
}
