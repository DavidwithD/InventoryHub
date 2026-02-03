'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  Alert,
  SelectChangeEvent,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { Product, Purchase, InventoryRow } from '@/types';
import { useInventory } from '../hooks/useInventory';

interface Props {
  selectedPurchaseId: number;
  products: Product[];
  selectedPurchase: Purchase;
}

export default function InventoryEditTable({
  selectedPurchaseId,
  products,
  selectedPurchase,
}: Props) {
  const {
    loadInventoriesByPurchase,
    loadExpectedTotal,
    loadAllInventories,
    createBatch,
    updateInventory,
    deleteInventory,
  } = useInventory();
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [originalRows, setOriginalRows] = useState<InventoryRow[]>([]);
  const [expectedTotalJpy, setExpectedTotalJpy] = useState<number>(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isCny = selectedPurchase.currencyType === 'CNY';
  // 加载库存数据
  useEffect(() => {
    if (selectedPurchaseId > 0) {
      loadInventoriesByPurchase(selectedPurchaseId)
        .then((inventories) => {
          if (inventories.length > 0) {
            // 已有库存明细：转换为编辑行
            const editRows: InventoryRow[] = inventories.map((inv) => ({
              tempId: `existing-${inv.id}`,
              id: inv.id,
              isReferenced: inv.isReferenced,
              productId: inv.productId,
              purchaseId: inv.purchaseId,
              purchaseAmountCny: inv.purchaseAmountCny,
              purchaseQuantity: inv.purchaseQuantity,
              stockQuantity: inv.stockQuantity,
              productName: inv.productName,
              purchaseAmountJpy: inv.purchaseAmountJpy,
              unitCostJpy: inv.unitCost,
              unitCost: inv.unitCost,
            }));
            setRows(editRows);
            setOriginalRows(editRows);
          } else {
            // 没有库存明细：创建空行并自动填充
            const emptyRow: InventoryRow = {
              tempId: `new-${Date.now()}`,
              productId: 0,
              purchaseId: selectedPurchase.id,
              purchaseAmountCny: isCny ? selectedPurchase.totalAmount : 0,
              purchaseQuantity: 0,
              stockQuantity: 0,
              purchaseAmountJpy: isCny
                ? selectedPurchase.totalAmount * selectedPurchase.exchangeRate
                : selectedPurchase.totalAmount,
              unitCostJpy: 0,
            };
            setRows([emptyRow]);
            setOriginalRows([]);
          }
        })
        .catch((err) => {
          console.error('加载库存记录失败', err);
        });

      loadExpectedTotal(selectedPurchaseId)
        .then((total) => setExpectedTotalJpy(total))
        .catch(() => {});
    }
  }, [selectedPurchaseId, selectedPurchase, loadInventoriesByPurchase, loadExpectedTotal]);

  // 创建空行
  const createEmptyRow = (): InventoryRow => ({
    tempId: `new-${Date.now()}-${Math.random()}`,
    productId: 0,
    purchaseId: selectedPurchase.id,
    purchaseAmountCny: 0,
    purchaseAmountJpy: 0,
    purchaseQuantity: 0,
    stockQuantity: 0,
    unitCostJpy: 0,
  });

  // 添加新行
  const addRow = () => {
    setRows([...rows, createEmptyRow()]);
  };

  // 删除行
  const deleteRow = async (tempId: string) => {
    const rowToDelete = rows.find((r) => r.tempId === tempId);

    // 如果是已存在的记录，调用API删除
    if (rowToDelete?.id) {
      try {
        await deleteInventory(rowToDelete.id);
        setSuccess('库存记录删除成功');
      } catch (err: any) {
        const errorMessage =
          typeof err.response?.data === 'string'
            ? err.response.data
            : err.response?.data?.title || err.response?.data?.errors || err.message || '删除失败';
        setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
        return;
      }
    }

    // 从本地删除
    setRows(rows.filter((r) => r.tempId !== tempId));
  };

  // 更新行
  const updateRow = (tempId: string, field: keyof InventoryRow, value: any) => {
    setRows(
      rows.map((r) => {
        if (r.tempId === tempId) {
          const updatedRow = { ...r, [field]: value };

          // 如果更新productId，同时更新productName
          if (field === 'productId') {
            const product = products.find((p) => p.id === value);
            updatedRow.productName = product?.name;
          }

          // 场景A：人民币进货
          if (isCny) {
            if (field === 'purchaseAmountCny' || field === 'purchaseQuantity') {
              const cnyAmount =
                field === 'purchaseAmountCny' ? value : updatedRow.purchaseAmountCny || 0;
              const quantity = field === 'purchaseQuantity' ? value : updatedRow.purchaseQuantity;

              updatedRow.purchaseAmountJpy = cnyAmount * selectedPurchase.exchangeRate;
              updatedRow.unitCostJpy = quantity > 0 ? updatedRow.purchaseAmountJpy / quantity : 0;

              if (field === 'purchaseQuantity') {
                updatedRow.stockQuantity = quantity;
              }
            }
          }
          // 场景B：日元进货
          else {
            if (field === 'purchaseAmountJpy' || field === 'purchaseQuantity') {
              const jpyAmount =
                field === 'purchaseAmountJpy' ? value : updatedRow.purchaseAmountJpy || 0;
              const quantity = field === 'purchaseQuantity' ? value : updatedRow.purchaseQuantity;

              updatedRow.unitCostJpy = quantity > 0 ? jpyAmount / quantity : 0;
              updatedRow.purchaseAmountCny = 0; // 日元进货不填人民币

              if (field === 'purchaseQuantity') {
                updatedRow.stockQuantity = quantity;
              }
            }
          }

          return updatedRow;
        }
        return r;
      })
    );
  };

  // 保存处理
  const handleSave = async () => {
    try {
      setError('');
      setSuccess('');

      const newRows = rows.filter((row) => !row.id);
      const existingRows = rows.filter((row) => row.id);

      // 批量创建新行
      if (newRows.length > 0) {
        const createData = newRows.map((row) => ({
          productId: row.productId,
          purchaseId: row.purchaseId,
          purchaseAmountCny: row.purchaseAmountCny, // isCny ? row.purchaseAmountCny : 0,
          purchaseAmountJpy: row.purchaseAmountJpy,
          purchaseQuantity: row.purchaseQuantity,
          stockQuantity: row.stockQuantity,
          unitCostJpy: row.unitCostJpy,
        }));
        console.log('update data', createData);
        await createBatch(createData);
      }

      // 更新修改的行
      for (const row of existingRows) {
        if (!row.isReferenced && row.id) {
          const originalRow = originalRows.find((orig) => orig.id === row.id);

          const hasChanges =
            !originalRow ||
            originalRow.productId !== row.productId ||
            originalRow.purchaseAmountCny !== row.purchaseAmountCny ||
            originalRow.purchaseQuantity !== row.purchaseQuantity ||
            originalRow.stockQuantity !== row.stockQuantity;

          if (hasChanges) {
            const updateData = {
              productId: row.productId,
              purchaseId: row.purchaseId,
              purchaseAmountJpy: row.purchaseAmountJpy,
              purchaseAmountCny: isCny ? row.purchaseAmountCny : 0,
              purchaseQuantity: row.purchaseQuantity,
              stockQuantity: row.stockQuantity,
              unitCostJpy: row.unitCostJpy,
            };
            await updateInventory(row.id, updateData);
          }
        }
      }

      setSuccess('库存记录保存成功');

      // 重新加载数据
      await loadAllInventories();
      const inventories = await loadInventoriesByPurchase(selectedPurchaseId);

      // 更新本地状态
      if (inventories.length > 0) {
        const editRows: InventoryRow[] = inventories.map((inv) => ({
          tempId: `existing-${inv.id}`,
          id: inv.id,
          isReferenced: inv.isReferenced,
          productId: inv.productId,
          purchaseId: inv.purchaseId,
          purchaseAmountCny: inv.purchaseAmountCny,
          purchaseQuantity: inv.purchaseQuantity,
          stockQuantity: inv.stockQuantity,
          productName: inv.productName,
          purchaseAmountJpy: inv.purchaseAmountJpy,
          unitCostJpy: inv.unitCost,
        }));
        setRows(editRows);
        setOriginalRows(editRows);
      }
    } catch (err: any) {
      const errorMessage =
        typeof err.response?.data === 'string'
          ? err.response.data
          : err.response?.data?.title || err.response?.data?.errors || err.message || '保存失败';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }
  };

  // 计算是否有未保存的修改
  const hasChanges = () => {
    // 有新行（没有 id）
    if (rows.some((row) => !row.id)) return true;

    // 检查已存在的行是否被修改
    return rows.some((row) => {
      if (!row.id) return false;
      const originalRow = originalRows.find((orig) => orig.id === row.id);
      if (!originalRow) return true; // 找不到原始数据，视为有修改

      return (
        originalRow.productId !== row.productId ||
        originalRow.purchaseAmountCny !== row.purchaseAmountCny ||
        originalRow.purchaseQuantity !== row.purchaseQuantity ||
        originalRow.stockQuantity !== row.stockQuantity
      );
    });
  };

  const calculateCurrentTotalCny = (): number => {
    return rows.reduce((sum, row) => sum + (row.purchaseAmountCny || 0), 0);
  };

  const calculateCurrentTotalJpy = (): number => {
    return rows.reduce((sum, row) => sum + (row.purchaseAmountJpy || 0), 0);
  };

  const getDifferenceCny = (): number => {
    return calculateCurrentTotalCny() - selectedPurchase.totalAmount;
  };

  const isValidForSave = (): boolean => {
    if (rows.length === 0) return false;

    // 检查所有行是否有效
    for (const row of rows) {
      if (row.productId === 0) return false;
      if (row.purchaseQuantity <= 0) return false;
      if (row.purchaseAmountCny < 0) return false;
      if (row.purchaseAmountJpy < 0) return false;
      if (row.stockQuantity < 0) return false;
    }

    // 检查总金额是否匹配
    if (isCny) {
      const currentTotalCny = calculateCurrentTotalCny();
      return currentTotalCny.toFixed(2) === selectedPurchase.totalAmount.toFixed(2);
    } else {
      const currentTotalJpy = calculateCurrentTotalJpy();
      return currentTotalJpy.toFixed(2) === selectedPurchase.totalAmount.toFixed(2);
    }
  };

  // 检查是否有任何可编辑的行
  const hasAnyEditableRow = (): boolean => {
    return rows.some((row) => !row.isReferenced);
  };

  const currentTotalCny = calculateCurrentTotalCny();
  const currentTotalJpy = calculateCurrentTotalJpy();
  const differenceCny = getDifferenceCny();
  const hasReferencedRows = rows.some((row) => row.isReferenced);
  const canAddRows = hasAnyEditableRow() || rows.length === 0;
  const checkAmount = () =>
    (isCny && currentTotalCny.toFixed(2) === selectedPurchase.totalAmount.toFixed(2)) ||
    (!isCny && currentTotalJpy.toFixed(2) === selectedPurchase.totalAmount.toFixed(2));
  return (
    <>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">库存明细</Typography>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={addRow} disabled={!canAddRows}>
          添加行
        </Button>
      </Box>

      {hasReferencedRows && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>提示：</strong>
            灰色背景的行表示已被订单引用，无法修改或删除。白色背景的行可以正常编辑。
          </Typography>
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="caption">
          <strong>说明:</strong>{' '}
          {isCny ? '输入人民币金额，系统将自动转换为日元存储到数据库。' : '直接输入日元金额。'}{' '}
          单位成本为日元单价。
        </Typography>
      </Alert>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width="20%">商品</TableCell>
              <TableCell width="12%">
                进货金额
                <Typography variant="caption" display="block" color="text.secondary">
                  人民币(CNY)
                </Typography>
              </TableCell>
              <TableCell width="12%">
                进货金额
                <Typography variant="caption" display="block" color="text.secondary">
                  日元(JPY)
                </Typography>
              </TableCell>
              <TableCell width="10%">进货数量</TableCell>
              <TableCell width="12%">
                单位成本
                <Typography variant="caption" display="block" color="text.secondary">
                  日元(JPY)
                </Typography>
              </TableCell>
              <TableCell width="10%">库存数量</TableCell>
              <TableCell width="8%">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const isRowLocked = row.isReferenced === true;
              return (
                <TableRow
                  key={row.tempId}
                  sx={{
                    bgcolor: isRowLocked ? 'action.hover' : 'background.paper',
                  }}
                >
                  <TableCell>
                    <FormControl fullWidth size="small">
                      <Select
                        value={row.productId}
                        displayEmpty
                        disabled={isRowLocked}
                        onChange={(e: SelectChangeEvent<number>) => {
                          updateRow(row.tempId, 'productId', Number(e.target.value));
                        }}
                        renderValue={(value) => {
                          if (value === 0) return '请选择商品';
                          const product = products.find((p) => p.id === value);
                          return product
                            ? `${product.categoryName} - ${product.name}`
                            : '请选择商品';
                        }}
                      >
                        <MenuItem value={0} disabled>
                          请选择商品
                        </MenuItem>
                        {products.map((product) => (
                          <MenuItem key={product.id} value={product.id}>
                            {product.categoryName} - {product.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={row.purchaseAmountCny}
                      onChange={(e) =>
                        updateRow(row.tempId, 'purchaseAmountCny', parseFloat(e.target.value) || 0)
                      }
                      inputProps={{ step: 0.01, min: 0 }}
                      placeholder="输入人民币"
                      disabled={isRowLocked || !isCny}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        color: (row.purchaseAmountJpy ?? 0 > 0) ? 'primary.main' : 'text.secondary',
                        fontWeight: (row.purchaseAmountJpy ?? 0 > 0) ? 'bold' : 'normal',
                      }}
                    >
                      ¥{(row.purchaseAmountJpy || 0).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      value={row.purchaseQuantity}
                      onChange={(e) =>
                        updateRow(row.tempId, 'purchaseQuantity', parseInt(e.target.value) || 0)
                      }
                      inputProps={{ step: 1, min: 0 }}
                      disabled={isRowLocked}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body2"
                      sx={{
                        color: (row.unitCostJpy ?? 0 > 0) ? 'success.main' : 'text.secondary',
                        fontWeight: (row.unitCostJpy ?? 0 > 0) ? 'bold' : 'normal',
                      }}
                    >
                      ¥{(row.unitCostJpy || 0).toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.stockQuantity || 0}</Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => deleteRow(row.tempId)}
                      disabled={rows.length === 1 || isRowLocked}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <Typography variant="body1" sx={{ mb: 1 }}>
          <strong> 进货总额:</strong> ¥{selectedPurchase.totalAmount.toFixed(2)}{' '}
          {selectedPurchase.currencyType}
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          <strong>人民币汇总:</strong> ¥{currentTotalCny.toFixed(2)} CNY
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          <strong>日元汇总:</strong> ¥{currentTotalJpy.toFixed(2)} JPY
        </Typography>
        {checkAmount() ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            ✓ 总额验证通过，可以保存
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mt: 2 }}>
            注意：{isCny ? '人民币' : '日元'}
            总额必须等于进货总额才能保存
          </Alert>
        )}
      </Box>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!isValidForSave() || !hasAnyEditableRow() || !hasChanges()}
          size="large"
        >
          批量保存
        </Button>
      </Box>
    </>
  );
}
