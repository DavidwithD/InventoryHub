'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Skeleton,
  Chip,
} from '@mui/material';
import { Order } from '@/types';
import { OrderSort, OrderSortField, nextOrderSort, sortOrders } from '../utils/sortOrders';
import { formatOrderCost, formatOrderProfit, orderCostState } from '../utils/orderProfit';
import { formatMoney } from '@/lib/formatMoney';
import OrderThumbnail from './OrderThumbnail';

interface Props {
  orders: Order[];
  sort: OrderSort;
  onSortChange: (sort: OrderSort) => void;
  /** True while the orders load. The table shows placeholder rows. */
  loading?: boolean;
}

const COLUMN_COUNT = 9;
const SKELETON_ROWS = 8;

export default function OrdersTable({ orders, sort, onSortChange, loading = false }: Props) {
  const router = useRouter();
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
            {loading &&
              sortedOrders.length === 0 &&
              Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <TableRow key={`skeleton-${i}`} data-testid="order-row-skeleton">
                  <TableCell>
                    <Skeleton variant="rounded" width={60} height={60} />
                  </TableCell>
                  {Array.from({ length: COLUMN_COUNT - 1 }, (_, j) => (
                    <TableCell key={j}>
                      <Skeleton />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {sortedOrders.map((order) => {
              const missing = orderCostState(order) === 'missing';
              return (
                // A click anywhere on the row opens the order. The link in the last cell is for the keyboard.
                <TableRow
                  key={order.id}
                  hover
                  onClick={() => router.push(`/orders/${order.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
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
                  <TableCell>{formatMoney(order.revenue, 'JPY')}</TableCell>
                  <TableCell>
                    {missing ? (
                      <Chip label="未输入" size="small" color="default" variant="outlined" />
                    ) : (
                      formatOrderCost(order)
                    )}
                  </TableCell>
                  <TableCell>{formatMoney(order.shippingFee, 'JPY')}</TableCell>
                  <TableCell>{formatOrderProfit(order)}</TableCell>
                  <TableCell>{new Date(order.transactionTime).toLocaleDateString('zh-CN')}</TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      component={Link}
                      href={`/orders/${order.id}`}
                      onClick={(e: { stopPropagation: () => void }) => e.stopPropagation()}
                      color="info"
                      className=" font-normal"
                    >
                      {order.hasDetails ? '查看' : '添加'}
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
            {!loading && sortedOrders.length === 0 && (
              <TableRow>
                <TableCell colSpan={COLUMN_COUNT} align="center">
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
