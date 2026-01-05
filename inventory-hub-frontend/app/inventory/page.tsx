'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Paper, Alert } from '@mui/material';
import { CreateInventory, InventoryRow } from '@/types';
import { useInventory } from './hooks/useInventory';
import { useProducts } from './hooks/useProducts';
import { usePurchases } from './hooks/usePurchases';
import InventoryToolbar from './components/InventoryToolbar';
import InventoryTable from './components/InventoryTable';
import InventoryEditTable from './components/InventoryEditTable';

export default function InventoryPage() {
  const searchParams = useSearchParams();
  const { inventories, expectedTotalJpy, loadAllInventories, loadInventoriesByPurchase, loadExpectedTotal, createBatch, updateInventory, deleteInventory } = useInventory();
  const { products, loadProducts } = useProducts();
  const { purchases, loadPurchases } = usePurchases();
  
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number>(0);
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProducts().catch(() => setError('加载商品列表失败'));
    loadPurchases().catch(() => setError('加载进货记录失败'));
    loadAllInventories().catch(() => setError('加载库存记录失败'));
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
    if (selectedPurchaseId > 0) {
      loadInventoriesByPurchase(selectedPurchaseId)
        .then((data) => {
          const selectedPurchase = purchases.find(p => p.id === selectedPurchaseId);
          if (!selectedPurchase) return;

          if (data.length > 0) {
            // 已有库存明细：转换为编辑行，每行独立的 isReferenced 状态
            const editRows: InventoryRow[] = data.map((inv) => {
              const purchaseAmountCny = inv.purchaseAmount / selectedPurchase.exchangeRate;
              const purchaseAmountJpy = inv.purchaseAmount;
              const unitCostJpy = inv.unitCost;
              
              return {
                tempId: `existing-${inv.id}`,
                id: inv.id, // 保存数据库ID
                isReferenced: inv.isReferenced, // 保存引用状态
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
          } else {
            // 没有库存明细：创建新的可编辑行
            setRows([createEmptyRow()]);
          }
        })
        .catch(() => setError('加载库存记录失败'));
      
      loadExpectedTotal(selectedPurchaseId).catch(() => {});
    } else {
      loadAllInventories().catch(() => setError('加载库存记录失败'));
      setRows([]);
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
    const rowToDelete = rows.find(r => r.tempId === tempId);
    
    // 如果是已存在的记录，调用API删除
    if (rowToDelete?.id) {
      deleteInventory(rowToDelete.id)
        .then(() => {
          setSuccess('库存记录删除成功');
          setRows(rows.filter(r => r.tempId !== tempId));
        })
        .catch((err: any) => {
          const errorMessage = typeof err.response?.data === 'string' 
            ? err.response.data 
            : err.response?.data?.title || err.response?.data?.errors || err.message || '删除失败';
          setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
        });
    } else {
      // 新行直接从本地删除
      setRows(rows.filter(r => r.tempId !== tempId));
    }
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

      // 分离新行和已存在的行
      const newRows = rows.filter(row => !row.id);
      const existingRows = rows.filter(row => row.id);

      // 批量创建新行
      if (newRows.length > 0) {
        const createData: CreateInventory[] = newRows.map(row => ({
          productId: row.productId,
          purchaseId: row.purchaseId,
          purchaseAmountCny: row.purchaseAmountCny,
          purchaseQuantity: row.purchaseQuantity,
          stockQuantity: row.stockQuantity,
        }));
        await createBatch(createData);
      }

      // 更新已存在的未引用的行
      for (const row of existingRows) {
        if (!row.isReferenced && row.id) {
          const updateData: CreateInventory = {
            productId: row.productId,
            purchaseId: row.purchaseId,
            purchaseAmountCny: row.purchaseAmountCny,
            purchaseQuantity: row.purchaseQuantity,
            stockQuantity: row.stockQuantity,
          };
          await updateInventory(row.id, updateData);
        }
      }

      setSuccess('库存记录保存成功');
      
      // 保存成功后重新加载
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
