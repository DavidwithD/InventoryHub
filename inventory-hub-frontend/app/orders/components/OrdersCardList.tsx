'use client';

import { useMemo } from 'react';
import { Box, Button, Card, Chip, Paper, Stack, Typography } from '@mui/material';
import { Order } from '@/types';
import { OrderSort, sortOrders } from '../utils/sortOrders';
import { orderProfit } from '../utils/orderProfit';
import OrderThumbnail from './OrderThumbnail';

interface Props {
  orders: Order[];
  sort: OrderSort;
  onViewDetails: (orderId: number) => void;
}

const IMAGE_SIZE = 96;

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ minWidth: 72 }}>
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function OrdersCardList({ orders, sort, onViewDetails }: Props) {
  const sortedOrders = useMemo(() => sortOrders(orders, sort), [orders, sort]);

  return (
    <Box>
      {sortedOrders.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>暂无订单数据</Paper>
      ) : (
        <Stack spacing={1.5}>
          {sortedOrders.map((order) => {
            const profit = orderProfit(order);
            return (
              <Card
                key={order.id}
                variant="outlined"
                data-testid="order-card"
                sx={{
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
                    {order.hasUnknownCost && (
                      <Chip label="成本未知" size="small" color="warning" variant="outlined" />
                    )}
                  </Stack>
                  <Stack direction="row" spacing={2} sx={{ mt: 'auto', pt: 1, flexWrap: 'wrap' }}>
                    <Metric label="营业额" value={order.revenue.toFixed(2)} />
                    <Metric
                      label="总成本"
                      value={order.hasUnknownCost ? '未知' : order.totalCost?.toFixed(2) || '0.00'}
                    />
                    <Metric label="运费" value={order.shippingFee.toFixed(2)} />
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
                      {profit === null ? '未知' : profit.toFixed(2)}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant={order.hasDetails ? 'outlined' : 'contained'}
                    onClick={() => onViewDetails(order.id)}
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
