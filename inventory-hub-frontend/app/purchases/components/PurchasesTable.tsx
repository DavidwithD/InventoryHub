'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Tooltip,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Inventory as InventoryIcon } from '@mui/icons-material';
import { Purchase } from '@/types';

interface Props {
  purchases: Purchase[];
  loading: boolean;
  onEdit: (p: Purchase) => void;
  onDelete: (p: Purchase) => void;
}

export default function PurchasesTable({ purchases, loading, onEdit, onDelete }: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [target, setTarget] = React.useState<Purchase | null>(null);

  const openConfirm = (p: Purchase) => {
    setTarget(p);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setTarget(null);
    setConfirmOpen(false);
  };

  const confirmDelete = () => {
    if (target) onDelete(target);
    closeConfirm();
  };

  if (loading) {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>加载中...</TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>
    );
  }

  return (
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
            <TableCell align="center">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {purchases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center">暂无数据</TableCell>
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
                <TableCell align="right">¥{(purchase.totalAmount * purchase.exchangeRate).toFixed(2)} JPY</TableCell>
                <TableCell align="center">
                  <Tooltip title="查看库存明细">
                    <IconButton 
                      size="small" 
                      color="info" 
                      onClick={() => router.push(`/inventory?purchaseId=${purchase.id}`)}
                    >
                      <InventoryIcon />
                    </IconButton>
                  </Tooltip>
                  <IconButton size="small" color="primary" onClick={() => onEdit(purchase)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => openConfirm(purchase)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {
        /* Confirm dialog */
      }
      <Dialog open={confirmOpen} onClose={closeConfirm}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          确定要删除进货单 "{target?.purchaseNo}" 吗？
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm}>取消</Button>
          <Button color="error" onClick={confirmDelete}>删除</Button>
        </DialogActions>
      </Dialog>
    </TableContainer>
  );
}
