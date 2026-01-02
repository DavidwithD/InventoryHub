'use client';

import { useState, useEffect } from 'react';
import { Paper, Alert } from '@mui/material';
import { CreateInventory, InventoryRow } from '@/types';
import { useInventory } from './hooks/useInventory';
import { useProducts } from './hooks/useProducts';
import { usePurchases } from './hooks/usePurchases';
import InventoryToolbar from './components/InventoryToolbar';
import InventoryTable from './components/InventoryTable';
import InventoryEditTable from './components/InventoryEditTable';

export default function InventoryPage() {
  const { inventories, expectedTotalJpy, loadAllInventories, loadInventoriesByPurchase, loadExpectedTotal, createBatch } = useInventory();
  const { products, loadProducts } = useProducts();
  const { purchases, loadPurchases } = usePurchases();
  
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number>(0);
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [hasExistingInventories, setHasExistingInventories] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProducts().catch(() => setError('加载商品列表失败'));
    loadPurchases().catch(() => setError('加载进货记录失败'));
    loadAllInventories().catch(() => setError('加载库存记录失败'));
  }, [loadProducts, loadPurchases, loadAllInventories]);

  useEffect(() => {
    if (selectedPurchaseId > 0) {
      loadInventoriesByPurchase(selectedPurchaseId)
        .then((data) => {
          const selectedPurchase = purchases.find(p => p.id === selectedPurchaseId);
          if (!selectedPurchase) return;

          // 检查是否已有库存明细
          if (data.length > 0) {
            // 已有库存明细：转换为只读行
            const editRows: InventoryRow[] = data.map((inv, idx) => {
              const purchaseAmountCny = inv.purchaseAmount / selectedPurchase.exchangeRate;
              const purchaseAmountJpy = inv.purchaseAmount;
              const unitCostJpy = inv.unitCost;
              
              return {
                tempId: `existing-${idx}`,
                productId: inv.productId,
                purchaseId: inv.purchaseId,
                purchaseAmountCny: purchaseAmountCny,
                purchaseQuantity: inv.purchaseQuantity,
                stockQuantity: inv.stockQuantity,
                productName: inv.productName,
                purchaseAmountJpy: purchaseAmountJpy,
                unitCostJpy: unitCostJpy,
              };
            });
            setRows(editRows);
            setHasExistingInventories(true); // 标记为只读模式
          } else {
            // 没有库存明细：创建新的可编辑行
            setRows([createEmptyRow()]);
            setHasExistingInventories(false); // 标记为编辑模式
          }
        })
        .catch(() => setError('加载库存记录失败'));
      
      loadExpectedTotal(selectedPurchaseId).catch(() => {});
    } else {
      loadAllInventories().catch(() => setError('加载库存记录失败'));
      setRows([]);
      setHasExistingInventories(false);
    }
  }, [selectedPurchaseId, loadInventoriesByPurchase, loadExpectedTotal, loadAllInventories, purchases]);

  const createEmptyRow = (): InventoryRow => ({
    tempId: `new-${Date.now()}-${Math.random()}`,
    productId: 0,
    purchaseId: selectedPurchaseId,
    purchaseAmountCny: 0,
    purchaseQuantity: 0,
    stockQuantity: 0,
    purchaseAmountJpy: 0,
    unitCostJpy: 0,
  });

  const addRow = () => {
    setRows([...rows, createEmptyRow()]);
  };

  const deleteRow = (tempId: string) => {
    setRows(rows.filter(r => r.tempId !== tempId));
  };

  const updateRow = (tempId: string, field: keyof InventoryRow, value: any) => {
    setRows(rows.map(r => {
      if (r.tempId === tempId) {
        const updatedRow = { ...r, [field]: value };
        
        // 如果更新productId，同时更新productName
        if (field === 'productId') {
          const product = products.find(p => p.id === value);
          updatedRow.productName = product?.name;
        }
        
        // 如果更新了人民币金额或数量，自动计算日元金额
        if (field === 'purchaseAmountCny' || field === 'purchaseQuantity') {
          const selectedPurchase = purchases.find(p => p.id === selectedPurchaseId);
          if (selectedPurchase) {
            const cnyAmount = field === 'purchaseAmountCny' ? value : updatedRow.purchaseAmountCny;
            const quantity = field === 'purchaseQuantity' ? value : updatedRow.purchaseQuantity;

            updatedRow.purchaseAmountJpy = cnyAmount * selectedPurchase.exchangeRate;
            updatedRow.unitCostJpy = quantity > 0 ? updatedRow.purchaseAmountJpy / quantity : 0;
            
            if (field === 'purchaseQuantity') {
              updatedRow.stockQuantity = quantity;
            }
          }
        }
        
        return updatedRow;
      }
      return r;
    }));
  };

  const handleSave = async () => {
    try {
      setError('');
      setSuccess('');

      const createData: CreateInventory[] = rows.map(row => ({
        productId: row.productId,
        purchaseId: row.purchaseId,
        purchaseAmountCny: row.purchaseAmountCny,
        purchaseQuantity: row.purchaseQuantity,
        stockQuantity: row.stockQuantity,
      }));

      await createBatch(createData);
      setSuccess('库存记录保存成功');
      
      // 保存成功后重新加载（会自动设置为只读模式）
      if (selectedPurchaseId > 0) {
        await loadInventoriesByPurchase(selectedPurchaseId);
      }
      await loadAllInventories();
    } catch (err: any) {
      const errorMessage = typeof err.response?.data === 'string' 
        ? err.response.data 
        : err.response?.data?.title || err.response?.data?.errors || err.message || '保存失败';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }
  };

  const selectedPurchase = purchases.find(p => p.id === selectedPurchaseId);

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <InventoryToolbar
        purchases={purchases}
        selectedPurchaseId={selectedPurchaseId}
        onSelectPurchase={setSelectedPurchaseId}
        expectedTotalJpy={expectedTotalJpy}
      />

      {selectedPurchaseId === 0 ? (
        <InventoryTable
          inventories={inventories}
          products={products}
          purchases={purchases}
        />
      ) : selectedPurchase ? (
        <Paper sx={{ p: 3 }}>
          <InventoryEditTable
            rows={rows}
            products={products}
            selectedPurchase={selectedPurchase}
            expectedTotalJpy={expectedTotalJpy}
            isReadOnly={hasExistingInventories}
            onAddRow={addRow}
            onDeleteRow={deleteRow}
            onUpdateRow={updateRow}
            onSave={handleSave}
          />
        </Paper>
      ) : null}
    </>
  );
}
