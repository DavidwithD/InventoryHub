'use client';

import { useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  TableSortLabel,
  Typography,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Order } from '@/types';

type OrderByType = 'orderNo' | 'revenue' | 'totalCost' | 'profit' | 'transactionTime';

interface Props {
  orders: Order[];
  onEdit: (order: Order) => void;
  onDelete: (id: number) => void;
  onViewDetails: (orderId: number) => void;
}

export default function OrdersTable({ orders, onEdit, onDelete, onViewDetails }: Props) {
  const [orderBy, setOrderBy] = useState<OrderByType>('transactionTime');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');

  const handleRequestSort = (property: OrderByType) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const getSortedOrders = () => {
    const sorted = [...orders];
    
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (orderBy === 'profit') {
        aValue = a.revenue - (a.totalCost || 0);
        bValue = b.revenue - (b.totalCost || 0);
      } else if (orderBy === 'totalCost') {
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

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return order === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (orderBy === 'transactionTime') {
        const aTime = new Date(aValue).getTime();
        const bTime = new Date(bValue).getTime();
        return order === 'asc' ? aTime - bTime : bTime - aTime;
      }

      return order === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return sorted;
  };

  const sortedOrders = getSortedOrders();

  return (
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
            {sortedOrders.map((order) => (
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
                    onClick={() => onViewDetails(order.id)}
                    sx={{ mr: 1 }}
                  >
                    查看详细
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => onEdit(order)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onDelete(order.id)}
                    color="error"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {sortedOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  暂无订单数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box sx={{ mt: 2, p: 2 }}>
        <Typography variant="body2" color="text.secondary">
          共 {sortedOrders.length} 条订单
        </Typography>
      </Box>
    </Paper>
  );
}
