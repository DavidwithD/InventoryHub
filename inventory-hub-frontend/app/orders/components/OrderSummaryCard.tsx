'use client';

import { Box, Chip, Paper, Stack, Typography } from '@mui/material';
import { Order } from '@/types';
import { orderProfit } from '../utils/orderProfit';
import OrderThumbnail from './OrderThumbnail';
import OrderMetric from './OrderMetric';

interface Props {
  order: Order;
}

/** The order's own fields and its totals, shown at the top of the order page. */
export default function OrderSummaryCard({ order }: Props) {
  const profit = orderProfit(order);
  const profitColor =
    profit === null ? 'text.secondary' : profit >= 0 ? 'success.main' : 'error.main';

  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <OrderThumbnail order={order} size={112} radius={6} />
      <Box sx={{ flex: 1, minWidth: 200 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
          {order.name || '（无订单名）'}
        </Typography>
        <Stack
          direction="row"
          useFlexGap
          spacing={1}
          sx={{ alignItems: 'center', mt: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}
        >
          <Typography variant="body2" color="text.secondary">
            {order.orderNo}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            · {new Date(order.transactionTime).toLocaleString('zh-CN')}
          </Typography>
          {order.hasUnknownCost && (
            <Chip label="成本未知" size="small" color="warning" variant="outlined" />
          )}
        </Stack>
        <Stack direction="row" useFlexGap spacing={3} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
          <OrderMetric size="large" label="营业额" value={order.revenue.toFixed(2)} />
          <OrderMetric size="large" label="运费" value={order.shippingFee.toFixed(2)} />
          <OrderMetric
            size="large"
            label="总成本"
            value={order.hasUnknownCost ? '未知' : order.totalCost?.toFixed(2) || '0.00'}
          />
          <OrderMetric
            size="large"
            label="利润"
            value={profit === null ? '未知' : profit.toFixed(2)}
            color={profitColor}
          />
        </Stack>
      </Box>
    </Paper>
  );
}
