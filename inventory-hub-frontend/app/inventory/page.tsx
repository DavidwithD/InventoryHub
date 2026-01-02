'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
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
import api from '@/lib/api';
import { Inventory, Product, Purchase, CreateInventory, InventoryRow } from '@/types';

export default function InventoryPage() {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<number>(0);
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [expectedTotalJpy, setExpectedTotalJpy] = useState<number>(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadProducts();
    loadPurchases();
  }, []);

  useEffect(() => {
    if (selectedPurchaseId > 0) {
      loadInventories();
      loadExpectedTotal();
    } else {
      setInventories([]);
      setRows([]);
      setExpectedTotalJpy(0);
    }
  }, [selectedPurchaseId]);

  const loadProducts = async () => {
    try {
      const response = await api.get<Product[]>('/products');
      setProducts(response.data);
    } catch (err) {
      setError('加载商品列表失败');
    }
  };

  const loadPurchases = async () => {
    try {
      const response = await api.get<Purchase[]>('/purchases');
      setPurchases(response.data);
    } catch (err) {
      setError('加载进货记录失败');
    }
  };

  const loadInventories = async () => {
    try {
      const response = await api.get<Inventory[]>(`/inventory?purchaseId=${selectedPurchaseId}`);
      setInventories(response.data);
      
      const selectedPurchase = purchases.find(p => p.id === selectedPurchaseId);
      if (!selectedPurchase) return;

      // 转换为编辑行
      if (response.data.length > 0) {
        const editRows: InventoryRow[] = response.data.map((inv, idx) => {
          // 反向计算人民币金额：日元金额 ÷ 汇率
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
      } else {
        // 如果没有库存记录，初始化一个空行
        setRows([createEmptyRow()]);
      }
    } catch (err) {
      setError('加载库存记录失败');
    }
  };

  const loadExpectedTotal = async () => {
    try {
      const response = await api.get<number>(`/inventory/purchase/${selectedPurchaseId}/expected-total-jpy`);
      setExpectedTotalJpy(response.data);
    } catch (err) {
      setExpectedTotalJpy(0);
    }
  };

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
        
        // 如果更新了人民币金额或数量，自动计算日元金额
        if (field === 'purchaseAmountCny' || field === 'purchaseQuantity') {
          const selectedPurchase = purchases.find(p => p.id === selectedPurchaseId);
          if (selectedPurchase) {
            const cnyAmount = field === 'purchaseAmountCny' ? value : updatedRow.purchaseAmountCny;
            const quantity = field === 'purchaseQuantity' ? value : updatedRow.purchaseQuantity;

            updatedRow.purchaseAmountJpy = cnyAmount * selectedPurchase.exchangeRate;
            updatedRow.unitCostJpy = quantity > 0 ? updatedRow.purchaseAmountJpy / quantity : 0;
            // 当用户修改进货数量时，默认将在库数量同步为进货数量（只读）
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

  const calculateCurrentTotalCny = (): number => {
    return rows.reduce((sum, row) => sum + (row.purchaseAmountCny || 0), 0);
  };

  const calculateCurrentTotalJpy = (): number => {
    return rows.reduce((sum, row) => sum + (row.purchaseAmountJpy || 0), 0);
  };

  const getDifferenceCny = (): number => {
    const selectedPurchase = purchases.find(p => p.id === selectedPurchaseId);
    if (!selectedPurchase) return 0;
    return calculateCurrentTotalCny() - selectedPurchase.totalAmount;
  };

    const isValidForSave = (): boolean => {
        if (selectedPurchaseId === 0) return false;
        if (rows.length === 0) return false;
        
        // 检查所有行是否有效
        for (const row of rows) {
            if (row.productId === 0) return false;
            if (row.purchaseQuantity <= 0) return false;
            if (row.purchaseAmountCny <= 0) return false;
            if (row.stockQuantity < 0) return false;
        }
    
    // 检查总金额是否匹配（人民币）
    const selectedPurchase = purchases.find(p => p.id === selectedPurchaseId);
    if (!selectedPurchase) return false;
    const currentTotalCny = calculateCurrentTotalCny();
    return currentTotalCny.toFixed(2) === selectedPurchase.totalAmount.toFixed(2);
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

      // 后端期望 { items: [...] } 格式
      await api.post('/inventory/batch', { items: createData });
      setSuccess('库存记录保存成功');
      loadInventories();
    } catch (err: any) {
      // 处理后端返回的错误对象或字符串
      const errorMessage = typeof err.response?.data === 'string' 
        ? err.response.data 
        : err.response?.data?.title || err.response?.data?.errors || err.message || '保存失败';
      setError(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
    }
  };

  const selectedPurchase = purchases.find(p => p.id === selectedPurchaseId);
  const currentTotalCny = calculateCurrentTotalCny();
  const currentTotalJpy = calculateCurrentTotalJpy();
  const differenceCny = getDifferenceCny();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">库存管理</Typography>
        <Button variant="outlined" href="/">返回首页</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Paper sx={{ p: 3, mb: 3 }}>
        <FormControl fullWidth sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>选择进货单</Typography>
          <Select
            value={selectedPurchaseId}
            onChange={(e: SelectChangeEvent<number>) => setSelectedPurchaseId(Number(e.target.value))}
            displayEmpty
          >
            <MenuItem value={0}>请选择进货单</MenuItem>
            {purchases.map((purchase) => (
              <MenuItem key={purchase.id} value={purchase.id}>
                {purchase.purchaseNo} - {purchase.supplierName} - ¥{purchase.totalAmount.toFixed(2)} CNY (汇率: {purchase.exchangeRate})
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {selectedPurchase && (
          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body2">
              <strong>进货单号:</strong> {selectedPurchase.purchaseNo} | 
              <strong> 供应商:</strong> {selectedPurchase.supplierName}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              <strong>支出金额:</strong> ¥{selectedPurchase.totalAmount.toFixed(2)} CNY | 
              <strong> 汇率:</strong> 1 CNY = {selectedPurchase.exchangeRate} JPY | 
              <strong> 对应日元:</strong> ¥{expectedTotalJpy.toFixed(2)} JPY
            </Typography>
          </Box>
        )}
      </Paper>

      {selectedPurchaseId > 0 && (
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">库存明细</Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addRow}
            >
              添加行
            </Button>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="caption">
              <strong>说明:</strong> 输入人民币金额，系统将自动转换为日元存储到数据库。单位成本为日元单价。
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
                {rows.map((row) => (
                  <TableRow key={row.tempId}>
                    <TableCell>
                      <FormControl fullWidth size="small">
                        <Select
                          value={row.productId}
                          displayEmpty
                          onChange={(e: SelectChangeEvent<number>) => {
                            const productId = Number(e.target.value);
                            const product = products.find(p => p.id === productId);
                            // 一次性更新 productId 和 productName，避免状态覆盖
                            setRows(rows.map(r => {
                              if (r.tempId === row.tempId) {
                                return { ...r, productId, productName: product?.name };
                              }
                              return r;
                            }));
                          }}
                          renderValue={(value) => {
                            if (value === 0) return '请选择商品';
                            const product = products.find(p => p.id === value);
                            return product ? `${product.categoryName} - ${product.name}` : '请选择商品';
                          }}
                        >
                          <MenuItem value={0} disabled>请选择商品</MenuItem>
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
                        onChange={(e) => updateRow(row.tempId, 'purchaseAmountCny', parseFloat(e.target.value) || 0)}
                        inputProps={{ step: 0.01, min: 0 }}
                        placeholder="输入人民币"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: row.purchaseAmountJpy ?? 0 > 0 ? 'primary.main' : 'text.secondary',
                          fontWeight: row.purchaseAmountJpy ?? 0 > 0 ? 'bold' : 'normal'
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
                        onChange={(e) => updateRow(row.tempId, 'purchaseQuantity', parseInt(e.target.value) || 0)}
                        inputProps={{ step: 1, min: 0 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: row.unitCostJpy ?? 0 > 0 ? 'success.main' : 'text.secondary',
                          fontWeight: row.unitCostJpy ?? 0 > 0 ? 'bold' : 'normal'
                        }}
                      >
                        ¥{(row.unitCostJpy || 0).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {/* <TextField
                        fullWidth
                        size="small"
                        type="number"
                        value={row.stockQuantity}
                        InputProps={{ readOnly: true }}
                        inputProps={{ step: 1, min: 0 }}
                        helperText="只读（默认等于进货数量）"
                      /> */}
                            
                      <Typography 
                        variant="body2" 
                      >
                        {(row.stockQuantity || 0)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => deleteRow(row.tempId)}
                        disabled={rows.length === 1}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>人民币汇总:</strong> ¥{currentTotalCny.toFixed(2)} CNY | 
              <strong> 进货总额:</strong> ¥{selectedPurchase?.totalAmount.toFixed(2)} CNY | 
              <strong> 差额:</strong> <span style={{ 
                color: currentTotalCny.toFixed(2) === selectedPurchase?.totalAmount.toFixed(2) ? 'green' : 'red',
                fontWeight: 'bold'
              }}>
                ¥{differenceCny.toFixed(2)} CNY
              </span>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              参考：日元汇总 ¥{currentTotalJpy.toFixed(2)} JPY（期望 ¥{expectedTotalJpy.toFixed(2)} JPY）
            </Typography>
            {currentTotalCny.toFixed(2) !== selectedPurchase?.totalAmount.toFixed(2) && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                注意：人民币总额必须等于进货总额才能保存
              </Alert>
            )}
            {currentTotalCny.toFixed(2) === selectedPurchase?.totalAmount.toFixed(2) && currentTotalCny > 0 && (
              <Alert severity="success" sx={{ mt: 2 }}>
                ✓ 总额验证通过，可以保存
              </Alert>
            )}
          </Box>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!isValidForSave()}
              size="large"
            >
              批量保存
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
}
