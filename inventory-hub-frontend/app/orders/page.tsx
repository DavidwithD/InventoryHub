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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  SelectChangeEvent,
  TableSortLabel,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import api from '@/lib/api';
import { Order, OrderDetailRow, Product, Inventory, CreateOrderDetail } from '@/types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [viewingOrderId, setViewingOrderId] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [editingDetailsMode, setEditingDetailsMode] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 批量导入
  const [openImportDialog, setOpenImportDialog] = useState(false);
  const [curlCommand, setCurlCommand] = useState('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');

  // 订单表单字段
  const [orderNo, setOrderNo] = useState('');
  const [orderName, setOrderName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [revenue, setRevenue] = useState<number>(0);
  const [transactionTime, setTransactionTime] = useState('');
  const [detailRows, setDetailRows] = useState<OrderDetailRow[]>([]);

  // 日期筛选
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 排序状态
  type OrderByType = 'orderNo' | 'revenue' | 'totalCost' | 'profit' | 'transactionTime';
  const [orderBy, setOrderBy] = useState<OrderByType>('totalCost');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  // 筛选状态
  const [searchOrderNo, setSearchOrderNo] = useState('');
  const [costStatus, setCostStatus] = useState<'all' | 'null' | 'hasValue'>('all');

  useEffect(() => {
    loadOrders();
    loadProducts();
    loadInventories();
  }, []);

  const loadOrders = async () => {
    try {
      let url = '/orders';
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await api.get<Order[]>(url);
      setOrders(response.data);
      setError('');
    } catch (err) {
      setError('加载订单列表失败');
    }
  };

  // 排序函数
  const handleRequestSort = (property: OrderByType) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // 筛选和排序订单
  const getFilteredAndSortedOrders = () => {
    let filtered = [...orders];

    // 订单号搜索
    if (searchOrderNo.trim()) {
      filtered = filtered.filter(order => 
        order.orderNo.toLowerCase().includes(searchOrderNo.toLowerCase()) ||
        order.name.toLowerCase().includes(searchOrderNo.toLowerCase())
      );
    }

    // 成本状态筛选
    if (costStatus === 'null') {
      filtered = filtered.filter(order => order.totalCost === null || order.totalCost === 0);
    } else if (costStatus === 'hasValue') {
      filtered = filtered.filter(order => order.totalCost !== null && order.totalCost > 0);
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (orderBy === 'profit') {
        aValue = a.revenue - (a.totalCost || 0);
        bValue = b.revenue - (b.totalCost || 0);
      } else if (orderBy === 'totalCost') {
        // NULL 值排序处理：NULL 默认排在最前面（asc）或最后面（desc）
        if (a.totalCost === null || a.totalCost === 0) {
          return order === 'asc' ? -1 : 1;
        }
        if (b.totalCost === null || b.totalCost === 0) {
          return order === 'asc' ? 1 : -1;
        }
        aValue = a.totalCost;
        bValue = b.totalCost;
      } else {
        aValue = a[orderBy];
        bValue = b[orderBy];
      }

      // 字符串比较
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      // 日期比较
      if (orderBy === 'transactionTime') {
        const aTime = new Date(aValue).getTime();
        const bTime = new Date(bValue).getTime();
        return order === 'asc' ? aTime - bTime : bTime - aTime;
      }

      // 数值比较
      return order === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  };

  // 导出为 JSON
  const handleExportJSON = () => {
    const filtered = getFilteredAndSortedOrders();
    const exportData = filtered.map(order => ({
      订单号: order.orderNo,
      订单名: order.name,
      图片URL: order.imageUrl || '',
      营业额: order.revenue,
      总成本: order.totalCost || 0,
      利润: order.revenue - (order.totalCost || 0),
      交易时间: new Date(order.transactionTime).toLocaleString('zh-CN'),
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `订单数据_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadProducts = async () => {
    try {
      const response = await api.get<Product[]>('/products');
      setProducts(response.data);
    } catch (err) {
      setError('加载商品列表失败');
    }
  };

  const loadInventories = async () => {
    try {
      const response = await api.get<Inventory[]>('/inventory');
      setInventories(response.data);
    } catch (err) {
      setError('加载库存列表失败');
    }
  };

  const handleOpenDialog = (order?: Order) => {
    if (order) {
      setEditingOrder(order);
      setOrderNo(order.orderNo);
      setImageUrl(order.imageUrl || '');
      setRevenue(order.revenue);
      setTransactionTime(order.transactionTime.split('T')[0]);
      // 编辑时暂不加载详细，需要从API获取
      setDetailRows([]);
    } else {
      setEditingOrder(null);
      setOrderNo('');
      setImageUrl('');
      setRevenue(0);
      setTransactionTime(new Date().toISOString().split('T')[0]);
      setDetailRows([]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingOrder(null);
    setOrderNo('');
    setOrderName('');
    setImageUrl('');
    setRevenue(0);
    setTransactionTime('');
    setDetailRows([]);
    setError('');
  };

  const addDetailRow = () => {
    const newRow: OrderDetailRow = {
      tempId: `new-${Date.now()}`,
      inventoryId: 0,
      productId: 0,
      productName: '',
      unitPrice: 0,
      quantity: 1,
      packagingCost: 0,
      otherCost: 0,
      availableStock: 0,
      unitCost: 0,
      notes: '',
    };
    setDetailRows([...detailRows, newRow]);
  };

  const removeDetailRow = (tempId: string) => {
    setDetailRows(detailRows.filter(row => row.tempId !== tempId));
  };

  const updateDetailRow = (tempId: string, field: keyof OrderDetailRow, value: any) => {
    setDetailRows(detailRows.map(row => {
      if (row.tempId !== tempId) return row;

      const updated = { ...row, [field]: value };

      // 当选择库存时，自动填充相关信息
      if (field === 'inventoryId') {
        const inventory = inventories.find(inv => inv.id === value);
        if (inventory) {
          updated.productId = inventory.productId;
          updated.productName = inventory.productName;
          updated.unitCost = inventory.unitCost;
          updated.availableStock = inventory.stockQuantity;
          updated.unitPrice = inventory.unitCost; // 默认售价等于成本
        }
      }

      return updated;
    }));
  };

  const calculateSubtotal = (row: OrderDetailRow): number => {
    return (row.unitPrice * row.quantity) + row.packagingCost + row.otherCost;
  };

  const calculateTotalCost = (): number => {
    return detailRows.reduce((sum, row) => sum + calculateSubtotal(row), 0);
  };

  const calculateProfit = (): number => {
    return revenue - calculateTotalCost();
  };

  const handleSaveOrder = async () => {
    try {
      setError('');

      // 验证表单
      if (!orderNo.trim()) {
        setError('请填写订单号');
        return;
      }
      if (!orderName.trim()) {
        setError('请填写订单名');
        return;
      }
      if (revenue <= 0) {
        setError('营业额必须大于0');
        return;
      }
      if (!transactionTime) {
        setError('请选择交易时间');
        return;
      }

      // 验证订单详细（如果有的话）
      for (const row of detailRows) {
        if (row.inventoryId === 0) {
          setError('请选择库存商品');
          return;
        }
        if (row.quantity <= 0) {
          setError('数量必须大于0');
          return;
        }
        if (row.unitPrice <= 0) {
          setError('单价必须大于0');
          return;
        }
        if (row.availableStock !== undefined && row.quantity > row.availableStock) {
          setError(`${row.productName} 库存不足（可用：${row.availableStock}）`);
          return;
        }
      }

      if (editingOrder) {
        // 更新订单（暂不支持修改详细）
        await api.put(`/orders/${editingOrder.id}`, {
          orderNo,
          name: orderName,
          imageUrl,
          revenue,
          transactionTime: new Date(transactionTime).toISOString(),
        });
        setSuccess('订单更新成功');
      } else {
        // 创建订单
        const details: CreateOrderDetail[] = detailRows.map(row => ({
          orderId: 0, // 后端会自动设置
          inventoryId: row.inventoryId,
          productId: row.productId,
          unitPrice: row.unitPrice,
          quantity: row.quantity,
          packagingCost: row.packagingCost,
          otherCost: row.otherCost,
          notes: row.notes,
        }));

        await api.post('/orders', {
          orderNo,
          name: orderName,
          imageUrl,
          revenue,
          transactionTime: new Date(transactionTime).toISOString(),
          details,
        });
        setSuccess('订单创建成功');
      }

      handleCloseDialog();
      loadOrders();
      loadInventories(); // 刷新库存数量
    } catch (err: any) {
      // 处理错误响应
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          setError(errorData);
        } else if (errorData.title || errorData.errors) {
          setError(errorData.title || JSON.stringify(errorData.errors));
        } else {
          setError(JSON.stringify(errorData));
        }
      } else {
        setError(err.message || '保存订单失败');
      }
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (!confirm('确定要删除此订单吗？删除后库存数量将恢复。')) return;

    try {
      await api.delete(`/orders/${id}`);
      setSuccess('订单删除成功，库存已恢复');
      loadOrders();
      loadInventories(); // 刷新库存数量
    } catch (err: any) {
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          setError(errorData);
        } else {
          setError(JSON.stringify(errorData));
        }
      } else {
        setError('删除订单失败');
      }
    }
  };

  const handleViewDetails = async (orderId: number) => {
    try {
      const response = await api.get(`/orders/${orderId}/details`);
      setOrderDetails(response.data);
      setViewingOrderId(orderId);
      setEditingDetailsMode(false);
      setOpenDetailsDialog(true);
    } catch (err: any) {
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          setError(errorData);
        } else {
          setError(JSON.stringify(errorData));
        }
      } else {
        setError('加载订单详细失败');
      }
    }
  };

  const handleEditDetails = () => {
    // 转换为可编辑的行
    const editableRows: OrderDetailRow[] = orderDetails.map((detail, idx) => ({
      tempId: `existing-${idx}`,
      inventoryId: detail.inventoryId,
      productId: detail.productId,
      productName: detail.productName,
      unitPrice: detail.unitPrice,
      quantity: detail.quantity,
      packagingCost: detail.packagingCost,
      otherCost: detail.otherCost,
      notes: detail.notes || '',
      availableStock: undefined,
      unitCost: undefined,
    }));
    setDetailRows(editableRows);
    setEditingDetailsMode(true);
  };

  const handleSaveDetails = async () => {
    try {
      setError('');

      // 验证订单详细
      for (const row of detailRows) {
        if (row.inventoryId === 0) {
          setError('请选择库存商品');
          return;
        }
        if (row.quantity <= 0) {
          setError('数量必须大于0');
          return;
        }
        if (row.unitPrice <= 0) {
          setError('单价必须大于0');
          return;
        }
        if (row.availableStock !== undefined && row.quantity > row.availableStock) {
          setError(`${row.productName} 库存不足（可用：${row.availableStock}）`);
          return;
        }
      }

      // 删除旧的详细
      for (const detail of orderDetails) {
        await api.delete(`/orders/details/${detail.id}`);
      }

      // 创建新的详细
      for (const row of detailRows) {
        await api.post('/orders/details', {
          orderId: viewingOrderId,
          inventoryId: row.inventoryId,
          productId: row.productId,
          unitPrice: row.unitPrice,
          quantity: row.quantity,
          packagingCost: row.packagingCost,
          otherCost: row.otherCost,
          notes: row.notes,
        });
      }

      setSuccess('订单详细更新成功');
      setOpenDetailsDialog(false);
      setEditingDetailsMode(false);
      setDetailRows([]);
      loadOrders();
      loadInventories();
    } catch (err: any) {
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          setError(errorData);
        } else if (errorData.title || errorData.errors) {
          setError(errorData.title || JSON.stringify(errorData.errors));
        } else {
          setError(JSON.stringify(errorData));
        }
      } else {
        setError(err.message || '保存订单详细失败');
      }
    }
  };

  const handleCloseDetailsDialog = () => {
    setOpenDetailsDialog(false);
    setViewingOrderId(null);
    setOrderDetails([]);
    setDetailRows([]);
    setEditingDetailsMode(false);
    setError('');
  };

  const handleOpenImportDialog = () => {
    setCurlCommand('');
    setImportProgress('');
    setOpenImportDialog(true);
  };

  const handleCloseImportDialog = () => {
    setOpenImportDialog(false);
    setCurlCommand('');
    setImportProgress('');
  };

  const handleImportFromCurl = async () => {
    if (!curlCommand.trim()) {
      setError('请粘贴 cURL 命令');
      return;
    }

    setImporting(true);
    setImportProgress('正在解析 cURL 命令...');
    setError('');

    try {
      const response = await api.post('/orders/import-from-curl', {
        curlCommand: curlCommand,
        skipExisting: true,
      });

      const result = response.data;
      setImportProgress(`导入完成！总计: ${result.total}, 成功: ${result.success}, 跳过: ${result.skipped}, 失败: ${result.failed}`);
      
      if (result.errors && result.errors.length > 0) {
        setError(`部分错误: ${result.errors.slice(0, 3).join('; ')}`);
      } else {
        setSuccess(`成功导入 ${result.success} 条订单`);
      }

      // 刷新订单列表
      loadOrders();

      // 3秒后自动关闭对话框
      setTimeout(() => {
        handleCloseImportDialog();
      }, 3000);
    } catch (err: any) {
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          setError(errorData);
        } else if (errorData.errors && Array.isArray(errorData.errors)) {
          setError(errorData.errors.join('; '));
        } else {
          setError(JSON.stringify(errorData));
        }
      } else {
        setError(err.message || '导入失败');
      }
      setImportProgress('');
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            onClick={handleOpenImportDialog}
          >
            批量导入订单
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            新建订单
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {/* 筛选区域 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>筛选条件</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <TextField
              label="订单号/订单名"
              value={searchOrderNo}
              onChange={(e) => setSearchOrderNo(e.target.value)}
              placeholder="输入订单号或订单名搜索"
              sx={{ minWidth: 200, flex: 1 }}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>成本状态</InputLabel>
              <Select
                value={costStatus}
                label="成本状态"
                onChange={(e) => setCostStatus(e.target.value as 'all' | 'null' | 'hasValue')}
              >
                <MenuItem value="all">全部</MenuItem>
                <MenuItem value="null">未输入成本</MenuItem>
                <MenuItem value="hasValue">已输入成本</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="开始日期"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />
            <TextField
              label="结束日期"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" onClick={loadOrders}>应用筛选</Button>
            <Button
              variant="text"
              onClick={() => {
                setSearchOrderNo('');
                setCostStatus('all');
                setStartDate('');
                setEndDate('');
                loadOrders();
              }}
            >
              清除筛选
            </Button>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleExportJSON}
              color="success"
              sx={{ ml: 'auto' }}
            >
              导出JSON
            </Button>
          </Box>
        </Paper>

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
              <TableRow>
                <TableCell>图片</TableCell>
                <TableCell>订单名</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'orderNo'}
                    direction={orderBy === 'orderNo' ? order : 'asc'}
                    onClick={() => handleRequestSort('orderNo')}
                  >
                    订单号
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'revenue'}
                    direction={orderBy === 'revenue' ? order : 'asc'}
                    onClick={() => handleRequestSort('revenue')}
                  >
                    营业额（¥）
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'totalCost'}
                    direction={orderBy === 'totalCost' ? order : 'asc'}
                    onClick={() => handleRequestSort('totalCost')}
                  >
                    总成本（¥）
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'profit'}
                    direction={orderBy === 'profit' ? order : 'asc'}
                    onClick={() => handleRequestSort('profit')}
                  >
                    利润（¥）
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={orderBy === 'transactionTime'}
                    direction={orderBy === 'transactionTime' ? order : 'asc'}
                    onClick={() => handleRequestSort('transactionTime')}
                  >
                    交易时间
                  </TableSortLabel>
                </TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getFilteredAndSortedOrders().map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    {order.imageUrl ? (
                      <img 
                        src={order.imageUrl} 
                        alt={order.name} 
                        style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4 }} 
                      />
                    ) : (
                      <Box sx={{ width: 60, height: 60, bgcolor: 'grey.200', borderRadius: 1 }} />
                    )}
                  </TableCell>
                  <TableCell>{order.name}</TableCell>
                  <TableCell>{order.orderNo}</TableCell>
                  <TableCell>{order.revenue.toFixed(2)}</TableCell>
                  <TableCell>{order.totalCost?.toFixed(2) || '0.00'}</TableCell>
                  <TableCell>
                    {((order.revenue - (order.totalCost || 0))).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {new Date(order.transactionTime).toLocaleDateString('zh-CN')}
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleViewDetails(order.id)}
                      sx={{ mr: 1 }}
                    >
                      查看详细
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(order)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteOrder(order.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {getFilteredAndSortedOrders().length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    暂无订单数据
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <Box sx={{ mt: 2, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            共 {getFilteredAndSortedOrders().length} 条订单
            {(searchOrderNo || costStatus !== 'all' || startDate || endDate) && ` (已筛选，总共 ${orders.length} 条)`}
          </Typography>
        </Box>
      </Paper>

      {/* 订单表单对话框 */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>{editingOrder ? '编辑订单' : '新建订单'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="订单号"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                fullWidth
                required
              />
              <TextField
                label="订单名"
                value={orderName}
                onChange={(e) => setOrderName(e.target.value)}
                fullWidth
                required
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="图片链接"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                fullWidth
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                label="营业额（日元）"
                type="number"
                value={revenue}
                onChange={(e) => setRevenue(Number(e.target.value))}
                fullWidth
                required
              />
              <TextField
                label="交易时间"
                type="date"
                value={transactionTime}
                onChange={(e) => setTransactionTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                required
              />
            </Box>

            {/* 订单详细 */}
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">订单详细</Typography>
                {!editingOrder && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={addDetailRow}
                  >
                    添加商品
                  </Button>
                )}
              </Box>

              {detailRows.length > 0 && (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>库存商品</TableCell>
                        <TableCell>单价（¥）</TableCell>
                        <TableCell>数量</TableCell>
                        <TableCell>可用库存</TableCell>
                        <TableCell>包装费（¥）</TableCell>
                        <TableCell>其他费用（¥）</TableCell>
                        <TableCell>小计（¥）</TableCell>
                        <TableCell>备注</TableCell>
                        <TableCell>操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detailRows.map((row) => (
                        <TableRow key={row.tempId}>
                          <TableCell>
                            <FormControl fullWidth size="small">
                              <Select
                                value={row.inventoryId}
                                onChange={(e: SelectChangeEvent<number>) =>
                                  updateDetailRow(row.tempId, 'inventoryId', Number(e.target.value))
                                }
                              >
                                <MenuItem value={0}>请选择</MenuItem>
                                {inventories
                                  .filter(inv => inv.stockQuantity > 0)
                                  .map(inv => (
                                    <MenuItem key={inv.id} value={inv.id}>
                                      {inv.productName}（库存：{inv.stockQuantity}）
                                    </MenuItem>
                                  ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={row.unitPrice}
                              onChange={(e) =>
                                updateDetailRow(row.tempId, 'unitPrice', Number(e.target.value))
                              }
                              size="small"
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={row.quantity}
                              onChange={(e) =>
                                updateDetailRow(row.tempId, 'quantity', Number(e.target.value))
                              }
                              size="small"
                              sx={{ width: 80 }}
                            />
                          </TableCell>
                          <TableCell>{row.availableStock || 0}</TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={row.packagingCost}
                              onChange={(e) =>
                                updateDetailRow(row.tempId, 'packagingCost', Number(e.target.value))
                              }
                              size="small"
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="number"
                              value={row.otherCost}
                              onChange={(e) =>
                                updateDetailRow(row.tempId, 'otherCost', Number(e.target.value))
                              }
                              size="small"
                              sx={{ width: 100 }}
                            />
                          </TableCell>
                          <TableCell>{calculateSubtotal(row).toFixed(2)}</TableCell>
                          <TableCell>
                            <TextField
                              value={row.notes}
                              onChange={(e) =>
                                updateDetailRow(row.tempId, 'notes', e.target.value)
                              }
                              size="small"
                              sx={{ width: 120 }}
                            />
                          </TableCell>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => removeDetailRow(row.tempId)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* 汇总信息 */}
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2">
                  营业额：¥ {revenue.toFixed(2)}
                </Typography>
                <Typography variant="body2">
                  总成本：¥ {calculateTotalCost().toFixed(2)}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  利润：¥ {calculateProfit().toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button onClick={handleSaveOrder} variant="contained" disabled={editingOrder !== null}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 订单详细对话框 */}
      <Dialog open={openDetailsDialog} onClose={handleCloseDetailsDialog} maxWidth="lg" fullWidth>
        <DialogTitle>
          订单详细 - 订单#{viewingOrderId}
          {!editingDetailsMode && (
            <Button
              variant="outlined"
              size="small"
              onClick={handleEditDetails}
              sx={{ ml: 2 }}
            >
              编辑详细
            </Button>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            {!editingDetailsMode ? (
              // 只读模式
              <>
                {orderDetails.length === 0 ? (
                  <Typography>暂无订单详细</Typography>
                ) : (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>商品名</TableCell>
                          <TableCell>单价（¥）</TableCell>
                          <TableCell>数量</TableCell>
                          <TableCell>包装费（¥）</TableCell>
                          <TableCell>其他费用（¥）</TableCell>
                          <TableCell>小计（¥）</TableCell>
                          <TableCell>备注</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {orderDetails.map((detail) => (
                          <TableRow key={detail.id}>
                            <TableCell>{detail.productName}</TableCell>
                            <TableCell>{detail.unitPrice.toFixed(2)}</TableCell>
                            <TableCell>{detail.quantity}</TableCell>
                            <TableCell>{detail.packagingCost.toFixed(2)}</TableCell>
                            <TableCell>{detail.otherCost.toFixed(2)}</TableCell>
                            <TableCell>{detail.subtotalCost.toFixed(2)}</TableCell>
                            <TableCell>{detail.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            ) : (
              // 编辑模式
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">编辑订单详细</Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={addDetailRow}
                  >
                    添加商品
                  </Button>
                </Box>

                {detailRows.length > 0 && (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>库存商品</TableCell>
                          <TableCell>单价（¥）</TableCell>
                          <TableCell>数量</TableCell>
                          <TableCell>可用库存</TableCell>
                          <TableCell>包装费（¥）</TableCell>
                          <TableCell>其他费用（¥）</TableCell>
                          <TableCell>小计（¥）</TableCell>
                          <TableCell>备注</TableCell>
                          <TableCell>操作</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {detailRows.map((row) => (
                          <TableRow key={row.tempId}>
                            <TableCell>
                              <FormControl fullWidth size="small">
                                <Select
                                  value={row.inventoryId}
                                  onChange={(e: SelectChangeEvent<number>) =>
                                    updateDetailRow(row.tempId, 'inventoryId', Number(e.target.value))
                                  }
                                >
                                  <MenuItem value={0}>请选择</MenuItem>
                                  {inventories
                                    .filter(inv => inv.stockQuantity > 0)
                                    .map(inv => (
                                      <MenuItem key={inv.id} value={inv.id}>
                                        {inv.productName}（库存：{inv.stockQuantity}）
                                      </MenuItem>
                                    ))}
                                </Select>
                              </FormControl>
                            </TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                value={row.unitPrice}
                                onChange={(e) =>
                                  updateDetailRow(row.tempId, 'unitPrice', Number(e.target.value))
                                }
                                size="small"
                                sx={{ width: 100 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                value={row.quantity}
                                onChange={(e) =>
                                  updateDetailRow(row.tempId, 'quantity', Number(e.target.value))
                                }
                                size="small"
                                sx={{ width: 80 }}
                              />
                            </TableCell>
                            <TableCell>{row.availableStock || 0}</TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                value={row.packagingCost}
                                onChange={(e) =>
                                  updateDetailRow(row.tempId, 'packagingCost', Number(e.target.value))
                                }
                                size="small"
                                sx={{ width: 100 }}
                              />
                            </TableCell>
                            <TableCell>
                              <TextField
                                type="number"
                                value={row.otherCost}
                                onChange={(e) =>
                                  updateDetailRow(row.tempId, 'otherCost', Number(e.target.value))
                                }
                                size="small"
                                sx={{ width: 100 }}
                              />
                            </TableCell>
                            <TableCell>{calculateSubtotal(row).toFixed(2)}</TableCell>
                            <TableCell>
                              <TextField
                                value={row.notes}
                                onChange={(e) =>
                                  updateDetailRow(row.tempId, 'notes', e.target.value)
                                }
                                size="small"
                                sx={{ width: 120 }}
                              />
                            </TableCell>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => removeDetailRow(row.tempId)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailsDialog}>关闭</Button>
          {editingDetailsMode && (
            <Button onClick={handleSaveDetails} variant="contained">
              保存修改
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* 批量导入对话框 */}
      <Dialog open={openImportDialog} onClose={handleCloseImportDialog} maxWidth="md" fullWidth>
        <DialogTitle>批量导入订单</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                请从浏览器开发者工具的 Network 标签中复制 Mercari API 的 cURL 命令。
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                系统将自动：
              </Typography>
              <Typography variant="body2" component="div">
                • 解析 cURL 并调用 Mercari API<br />
                • 获取所有销售历史记录<br />
                • 根据订单号去重（跳过已存在的订单）<br />
                • 批量创建订单
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold', color: 'warning.main' }}>
                ⚠️ 注意：cURL 中的 token 仅用于本次导入，不会被保存
              </Typography>
            </Alert>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

            <TextField
              label="粘贴 cURL 命令"
              multiline
              rows={12}
              fullWidth
              value={curlCommand}
              onChange={(e) => setCurlCommand(e.target.value)}
              placeholder="curl 'https://api.mercari.jp/sold_histories/list?limit=20&offset=0' ..."
              disabled={importing}
            />

            {importProgress && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="primary">
                  {importProgress}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImportDialog} disabled={importing}>
            {importProgress ? '关闭' : '取消'}
          </Button>
          <Button 
            onClick={handleImportFromCurl} 
            variant="contained" 
            disabled={importing || !curlCommand.trim()}
          >
            {importing ? '导入中...' : '开始导入'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
