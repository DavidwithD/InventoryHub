'use client';

import { Box, Chip, Link, Paper, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Order } from '@/types';
import {
  formatOrderCost,
  formatOrderProfit,
  orderCostState,
  orderProfit,
} from '../utils/orderProfit';
import { formatMoney } from '@/lib/formatMoney';
import OrderThumbnail, { mercariItemUrl } from './OrderThumbnail';
import OrderMetric from './OrderMetric';

interface Props {
  order: Order;
}

/** The order's own fields and its totals, shown at the top of the order page. */
export default function OrderSummaryCard({ order }: Props) {
  const profit = orderProfit(order);
  const costState = orderCostState(order);
  const profitColor =
    profit === null ? 'text.secondary' : profit >= 0 ? 'success.main' : 'error.main';

  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      <OrderThumbnail order={order} size={112} radius={6} linkToMercari />
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
          <Link
            href={mercariItemUrl(order)}
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}
          >
            在 Mercari 查看
            <OpenInNewIcon sx={{ fontSize: 14 }} />
          </Link>
          {costState === 'missing' && <Chip label="未输入成本" size="small" variant="outlined" />}
          {costState === 'unknown' && (
            <Chip label="成本未知" size="small" color="warning" variant="outlined" />
          )}
        </Stack>
        <Stack direction="row" useFlexGap spacing={3} sx={{ mt: 2, flexWrap: 'wrap', rowGap: 1 }}>
          <OrderMetric size="large" label="营业额" value={formatMoney(order.revenue, 'JPY')} />
          <OrderMetric size="large" label="运费" value={formatMoney(order.shippingFee, 'JPY')} />
          <OrderMetric size="large" label="总成本" value={formatOrderCost(order)} />
          <OrderMetric
            size="large"
            label="利润"
            value={formatOrderProfit(order)}
            color={profitColor}
          />
        </Stack>
      </Box>
    </Paper>
  );
}
