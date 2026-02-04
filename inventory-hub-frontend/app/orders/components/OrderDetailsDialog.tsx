'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Alert,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import api from '@/lib/api';
import { OrderDetail, Inventory, Category } from '@/types';
import OrderDetailEditDialog from './OrderDetailEditDialog';

interface Props {
  open: boolean;
  orderId: number | null;
  inventories: Inventory[];
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

export default function OrderDetailsDialog({
  open,
  orderId,
  inventories,
  categories,
  onClose,
  onSaved,
}: Props) {
  const [orderDetails, setOrderDetails] = useState<OrderDetail[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<OrderDetail | null>(null);

  useEffect(() => {
    if (open && orderId) {
      loadDetails();
    }
  }, [open, orderId]);

  const loadDetails = async () => {
    if (!orderId) return;

    try {
      setLoading(true);
      const response = await api.get(`/orders/${orderId}/details`);
      setOrderDetails(response.data);
      setError('');
    } catch (err: any) {
      if (err.response?.data) {
        const errorData = err.response.data;
        setError(typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
      } else {
        setError('加载订单详细失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (detail: OrderDetail) => {
    setSelectedDetail(detail);
    setEditDialogOpen(true);
  };

  const handleAddClick = () => {
    setSelectedDetail(null);
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = () => {
    setEditDialogOpen(false);
    setSelectedDetail(null);
  };

  const handleEditDialogSaved = () => {
    loadDetails();
    onSaved();
  };

  const handleDeleteClick = async (detail: OrderDetail) => {
    if (!confirm(`确定要删除商品 "${detail.productName}" 吗？`)) {
      return;
    }

    try {
      await api.delete(`/orders/details/${detail.id}`);
      loadDetails();
      onSaved();
    } catch (err: any) {
      if (err.response?.data) {
        const errorData = err.response.data;
        setError(typeof errorData === 'string' ? errorData : JSON.stringify(errorData));
      } else {
        setError('删除失败');
      }
    }
  };

  const handleClose = () => {
    setOrderDetails([]);
    setError('');
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>订单详细 - 订单#{orderId}</span>
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddClick}
            >
              添加商品
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            {loading ? (
              <Typography>加载中...</Typography>
            ) : orderDetails.length === 0 ? (
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
                      <TableCell>操作</TableCell>
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
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={() => handleEditClick(detail)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(detail)}
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>关闭</Button>
        </DialogActions>
      </Dialog>

      {orderId && (
        <OrderDetailEditDialog
          open={editDialogOpen}
          orderId={orderId}
          detail={selectedDetail}
          inventories={inventories}
          categories={categories}
          onClose={handleEditDialogClose}
          onSaved={handleEditDialogSaved}
        />
      )}
    </>
  );
}
