'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Container,
  Grid,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Purchase, Supplier } from '@/types';
import api from '@/lib/api';
import { fetchExchangeRate } from '@/lib/exchangeRate';

interface PurchaseFormData {
  supplierId: number;
  purchaseDate: string;
  purchaseNo: string;
  totalAmount: string;
  currencyType: string;
  exchangeRate: string;
}

const EXCHANGE_RATE_KEY = 'lastExchangeRate';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [formData, setFormData] = useState<PurchaseFormData>({
    supplierId: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    purchaseNo: '',
    totalAmount: '',
    currencyType: 'JPY',
    exchangeRate: '',
  });
  const [fetchingRate, setFetchingRate] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // 加载进货列表
  const loadPurchases = async () => {
    try {
      setLoading(true);
      const response = await api.get('/purchases');
      setPurchases(response.data);
    } catch (error) {
      console.error('加载进货失败:', error);
      showSnackbar('加载进货列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 加载供应商列表
  const loadSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      setSuppliers(response.data);
    } catch (error) {
      console.error('加载供应商失败:', error);
      showSnackbar('加载供应商列表失败', 'error');
    }
  };

  useEffect(() => {
    loadPurchases();
    loadSuppliers();
    // 从 localStorage 加载上次的汇率
    const savedRate = localStorage.getItem(EXCHANGE_RATE_KEY);
    if (savedRate) {
      setFormData(prev => ({ ...prev, exchangeRate: savedRate }));
    }
  }, []);

  // 显示提示消息
  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  // 获取汇率
  const handleFetchExchangeRate = async () => {
    setFetchingRate(true);
    try {
      const cnyToJpyRate = await fetchExchangeRate();
      const rateStr = cnyToJpyRate.toFixed(4);
      setFormData(prev => ({ ...prev, exchangeRate: rateStr }));
      localStorage.setItem(EXCHANGE_RATE_KEY, rateStr);
      showSnackbar(`汇率获取成功: 1 CNY = ${rateStr} JPY`);
    } catch (error) {
      showSnackbar('汇率获取失败，请手动输入', 'error');
    } finally {
      setFetchingRate(false);
    }
  };

  // 打开新增对话框
  const handleAdd = () => {
    setEditingPurchase(null);
    const savedRate = localStorage.getItem(EXCHANGE_RATE_KEY) || '';
    setFormData({
      supplierId: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      purchaseNo: '',
      totalAmount: '',
      currencyType: 'JPY',
      exchangeRate: savedRate,
    });
    setOpenDialog(true);
  };

  // 打开编辑对话框
  const handleEdit = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setFormData({
      supplierId: purchase.supplierId,
      purchaseDate: purchase.purchaseDate.split('T')[0],
      purchaseNo: purchase.purchaseNo,
      totalAmount: purchase.totalAmount.toString(),
      currencyType: purchase.currencyType,
      exchangeRate: purchase.exchangeRate.toString(),
    });
    setOpenDialog(true);
  };

  // 关闭对话框
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingPurchase(null);
  };

  // 保存进货
  const handleSave = async () => {
    if (!formData.supplierId) {
      showSnackbar('请选择供应商', 'error');
      return;
    }
    if (!formData.purchaseNo.trim()) {
      showSnackbar('请输入进货单号', 'error');
      return;
    }
    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
      showSnackbar('请输入有效的支出金额', 'error');
      return;
    }
    if (!formData.exchangeRate || parseFloat(formData.exchangeRate) <= 0) {
      showSnackbar('请输入有效的汇率', 'error');
      return;
    }

    try {
      const payload = {
        supplierId: formData.supplierId,
        purchaseDate: new Date(formData.purchaseDate).toISOString(),
        purchaseNo: formData.purchaseNo,
        totalAmount: parseFloat(formData.totalAmount),
        currencyType: formData.currencyType,
        exchangeRate: parseFloat(formData.exchangeRate),
      };

      // 保存汇率到 localStorage
      localStorage.setItem(EXCHANGE_RATE_KEY, formData.exchangeRate);

      if (editingPurchase) {
        // 更新
        await api.put(`/purchases/${editingPurchase.id}`, payload);
        showSnackbar('进货更新成功');
      } else {
        // 新增
        await api.post('/purchases', payload);
        showSnackbar('进货创建成功');
      }
      handleCloseDialog();
      loadPurchases();
    } catch (error: any) {
      const message = error.response?.data || '操作失败';
      showSnackbar(message, 'error');
    }
  };

  // 删除进货
  const handleDelete = async (purchase: Purchase) => {
    if (!confirm(`确定要删除进货单"${purchase.purchaseNo}"吗？`)) {
      return;
    }

    try {
      await api.delete(`/purchases/${purchase.id}`);
      showSnackbar('进货删除成功');
      loadPurchases();
    } catch (error: any) {
      const message = error.response?.data || '删除失败';
      showSnackbar(message, 'error');
    }
  };

  // 计算日元金额: CNY × 汇率 = JPY
  const calculateJPY = (cnyAmount: number, cnyToJpyRate: number) => {
    return (cnyAmount * cnyToJpyRate).toFixed(2);
  };

  return (
    <>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
        >
          新增进货
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>进货单号</TableCell>
              <TableCell>供应商</TableCell>
              <TableCell>进货日期</TableCell>
              <TableCell align="right">支出 (CNY)</TableCell>
              <TableCell align="right">汇率 (CNY→JPY)</TableCell>
              <TableCell align="right">对应日元 (JPY)</TableCell>
              <TableCell align="right">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  加载中...
                </TableCell>
              </TableRow>
            ) : purchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              purchases.map((purchase) => (
                <TableRow key={purchase.id} hover>
                  <TableCell>{purchase.id}</TableCell>
                  <TableCell>{purchase.purchaseNo}</TableCell>
                  <TableCell>{purchase.supplierName}</TableCell>
                  <TableCell>{new Date(purchase.purchaseDate).toLocaleDateString('zh-CN')}</TableCell>
                  <TableCell align="right">¥{purchase.totalAmount.toLocaleString()} CNY</TableCell>
                  <TableCell align="right">{purchase.exchangeRate.toFixed(4)}</TableCell>
                  <TableCell align="right">
                    ¥{calculateJPY(purchase.totalAmount, purchase.exchangeRate)} JPY
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleEdit(purchase)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(purchase)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 新增/编辑对话框 */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPurchase ? '编辑进货' : '新增进货'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>供应商</InputLabel>
                <Select
                  value={formData.supplierId}
                  label="供应商"
                  onChange={(e) => setFormData({ ...formData, supplierId: Number(e.target.value) })}
                >
                  <MenuItem value={0}>请选择供应商</MenuItem>
                  {suppliers.map((supplier) => (
                    <MenuItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="进货日期"
                type="date"
                fullWidth
                variant="outlined"
                value={formData.purchaseDate}
                onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="进货单号"
                type="text"
                fullWidth
                variant="outlined"
                value={formData.purchaseNo}
                onChange={(e) => setFormData({ ...formData, purchaseNo: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="支出金额 (CNY 人民币)"
                type="number"
                fullWidth
                variant="outlined"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                // helperText="输入人民币金额"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>货币类型</InputLabel>
                <Select
                  value={formData.currencyType}
                  label="货币类型"
                  onChange={(e) => setFormData({ ...formData, currencyType: e.target.value })}
                >
                  <MenuItem value="JPY">JPY (日元)</MenuItem>
                  <MenuItem value="CNY">CNY (人民币)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  label="汇率 (CNY→JPY)"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={formData.exchangeRate}
                  onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
                />
                <Button
                  variant="outlined"
                  onClick={handleFetchExchangeRate}
                  disabled={fetchingRate}
                  startIcon={<RefreshIcon />}
                  sx={{ minWidth: '120px' }}
                >
                  {fetchingRate ? '获取中...' : '获取汇率'}
                </Button>
              </Box>
            </Grid>
            {formData.totalAmount && formData.exchangeRate && (
              <Grid item xs={12}>
                <Alert severity="info">
                  对应日元：¥{calculateJPY(parseFloat(formData.totalAmount), parseFloat(formData.exchangeRate))} JPY
                </Alert>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button onClick={handleSave} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 提示消息 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
