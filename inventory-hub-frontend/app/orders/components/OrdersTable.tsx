'use client';

import { useMemo } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TableSortLabel,
} from '@mui/material';
import { Order } from '@/types';
import { OrderSort, OrderSortField, nextOrderSort, sortOrders } from '../utils/sortOrders';
import { orderProfit } from '../utils/orderProfit';
import OrderThumbnail from './OrderThumbnail';

interface Props {
  orders: Order[];
  sort: OrderSort;
  onSortChange: (sort: OrderSort) => void;
  onEdit: (order: Order) => void;
  onDelete: (id: number) => void;
  onViewDetails: (orderId: number) => void;
}

export default function OrdersTable({
  orders,
  sort,
  onSortChange,
  onEdit,
  onDelete,
  onViewDetails,
}: Props) {
  const handleRequestSort = (field: OrderSortField) => onSortChange(nextOrderSort(sort, field));
  const sortedOrders = useMemo(() => sortOrders(orders, sort), [orders, sort]);

  return (
    <Paper>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 80 }}>图片</TableCell>
              <TableCell sx={{ width: 250, maxWidth: 250 }}>订单名</TableCell>
              <TableCell sx={{ width: 140 }}>
                <TableSortLabel
                  active={sort.field === 'orderNo'}
                  direction={sort.field === 'orderNo' ? sort.direction : 'asc'}
                  onClick={() => handleRequestSort('orderNo')}
                >
                  订单号
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: 110 }}>
                <TableSortLabel
                  active={sort.field === 'revenue'}
                  direction={sort.field === 'revenue' ? sort.direction : 'asc'}
                  onClick={() => handleRequestSort('revenue')}
                >
                  营业额
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: 110 }}>
                <TableSortLabel
                  active={sort.field === 'totalCost'}
                  direction={sort.field === 'totalCost' ? sort.direction : 'asc'}
                  onClick={() => handleRequestSort('totalCost')}
                >
                  总成本
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: 110 }}>
                <TableSortLabel
                  active={sort.field === 'shippingFee'}
                  direction={sort.field === 'shippingFee' ? sort.direction : 'asc'}
                  onClick={() => handleRequestSort('shippingFee')}
                >
                  运费
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: 110 }}>
                <TableSortLabel
                  active={sort.field === 'profit'}
                  direction={sort.field === 'profit' ? sort.direction : 'asc'}
                  onClick={() => handleRequestSort('profit')}
                >
                  利润
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ width: 120 }}>
                <TableSortLabel
                  active={sort.field === 'transactionTime'}
                  direction={sort.field === 'transactionTime' ? sort.direction : 'asc'}
                  onClick={() => handleRequestSort('transactionTime')}
                >
                  交易时间
                </TableSortLabel>
              </TableCell>
              <TableCell align="center" sx={{ width: 140 }}>
                操作
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedOrders.map((order) => (
              <TableRow key={order.id}>
                <TableCell>
                  <OrderThumbnail order={order} size={60} radius={4} />
                </TableCell>
                <TableCell
                  sx={{
                    maxWidth: 250,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={order.name}
                >
                  {order.name}
                </TableCell>
                <TableCell>{order.orderNo}</TableCell>
                <TableCell>{order.revenue.toFixed(2)}</TableCell>
                <TableCell>
                  {order.hasUnknownCost ? '未知' : order.totalCost?.toFixed(2) || '0.00'}
                </TableCell>
                <TableCell>{order.shippingFee.toFixed(2)}</TableCell>
                <TableCell>
                  {orderProfit(order)?.toFixed(2) ?? '未知'}
                </TableCell>
                <TableCell>{new Date(order.transactionTime).toLocaleDateString('zh-CN')}</TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    onClick={() => onViewDetails(order.id)}
                    color="info"
                    className=" font-normal"
                  >
                    {order.hasDetails ? '查看' : '添加'}
                  </IconButton>
                  {/* <IconButton size="small" onClick={() => onEdit(order)} color="primary">
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" onClick={() => onDelete(order.id)} color="error">
                    <DeleteIcon />
                  </IconButton> */}
                </TableCell>
              </TableRow>
            ))}
            {sortedOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  暂无订单数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

    </Paper>
  );
}
