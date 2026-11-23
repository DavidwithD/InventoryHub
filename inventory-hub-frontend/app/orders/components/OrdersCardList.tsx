'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, Button, Card, Chip, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { Order } from '@/types';
import { OrderSort, sortOrders } from '../utils/sortOrders';
import {
  formatOrderCost,
  formatOrderProfit,
  orderCostState,
  orderProfit,
} from '../utils/orderProfit';
import { formatMoney } from '@/lib/formatMoney';
import { isNewTabClick, openOnClick } from '../utils/openOnClick';
import OrderThumbnail from './OrderThumbnail';
import OrderMetric from './OrderMetric';
import { saveOrdersListScroll } from '../utils/listScroll';

interface Props {
  orders: Order[];
  sort: OrderSort;
  /** True while the orders load. The list shows placeholder cards. */
  loading?: boolean;
}

const IMAGE_SIZE = 96;

export default function OrdersCardList({ orders, sort, loading = false }: Props) {
  const router = useRouter();
  const sortedOrders = useMemo(() => sortOrders(orders, sort), [orders, sort]);

  return (
    <Box>
      {loading && sortedOrders.length === 0 ? (
        <Stack spacing={1.5}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={IMAGE_SIZE + 24}
              data-testid="order-card-skeleton"
            />
          ))}
        </Stack>
      ) : sortedOrders.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>暂无订单数据</Paper>
      ) : (
        <Stack spacing={1.5}>
          {sortedOrders.map((order) => {
            const profit = orderProfit(order);
            const costState = orderCostState(order);
            return (
              // A click anywhere on the card opens the order. The button is for the keyboard.
              <Card
                key={order.id}
                variant="outlined"
                data-testid="order-card"
                onClick={(e) =>
                  openOnClick(e, `/orders/${order.id}`, (href) => {
                    // Save the scroll only when the list leaves. A Cmd or Ctrl click opens a new tab.
                    saveOrdersListScroll();
                    router.push(href);
                  })
                }
                sx={{
                  cursor: 'pointer',
                  display: 'flex',
                  gap: 2,
                  p: 1.5,
                  flexWrap: { xs: 'wrap', sm: 'nowrap' },
                  transition: 'box-shadow 0.15s',
                  '&:hover': { boxShadow: 2 },
                }}
              >
                <OrderThumbnail order={order} size={IMAGE_SIZE} radius={6} />

                <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                  <Typography
                    variant="subtitle1"
                    title={order.name}
                    sx={{
                      fontWeight: 600,
                      lineHeight: 1.35,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {order.name}
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', mt: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {order.orderNo}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      · {new Date(order.transactionTime).toLocaleDateString('zh-CN')}
                    </Typography>
                    {costState === 'missing' && (
                      <Chip label="未输入成本" size="small" variant="outlined" />
                    )}
                    {costState === 'unknown' && (
                      <Chip label="成本未知" size="small" color="warning" variant="outlined" />
                    )}
                  </Stack>
                  <Stack direction="row" spacing={2} sx={{ mt: 'auto', pt: 1, flexWrap: 'wrap' }}>
                    <OrderMetric label="营业额" value={formatMoney(order.revenue, 'JPY')} />
                    <OrderMetric label="总成本" value={formatOrderCost(order)} />
                    <OrderMetric label="运费" value={formatMoney(order.shippingFee, 'JPY')} />
                  </Stack>
                </Box>

                <Box
                  sx={{
                    flexShrink: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    justifyContent: 'space-between',
                    ml: { xs: 'auto', sm: 0 },
                  }}
                >
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="caption" color="text.secondary" component="div">
                      利润
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                        color:
                          profit === null
                            ? 'text.secondary'
                            : profit >= 0
                              ? 'success.main'
                              : 'error.main',
                      }}
                    >
                      {formatOrderProfit(order)}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant={order.hasDetails ? 'outlined' : 'contained'}
                    component={Link}
                    href={`/orders/${order.id}`}
                    onClick={(e: {
                      stopPropagation: () => void;
                      metaKey: boolean;
                      ctrlKey: boolean;
                      shiftKey: boolean;
                    }) => {
                      e.stopPropagation();
                      // A Cmd, Ctrl or Shift click opens a new tab. The list stays, so it saves nothing.
                      if (!isNewTabClick(e)) saveOrdersListScroll();
                    }}
                  >
                    {order.hasDetails ? '查看' : '添加'}
                  </Button>
                </Box>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
