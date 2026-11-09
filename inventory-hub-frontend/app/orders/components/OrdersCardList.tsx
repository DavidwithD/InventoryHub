'use client';

import {
  Box,
  Button,
  Card,
  Chip,
  FormControl,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { Order } from '@/types';
import { ORDER_SORT_LABELS, OrderSort, OrderSortField, sortOrders } from '../utils/sortOrders';

interface Props {
  orders: Order[];
  sort: OrderSort;
  onSortChange: (sort: OrderSort) => void;
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

export default function OrdersCardList({ orders, sort, onSortChange, onViewDetails }: Props) {
  const sortedOrders = sortOrders(orders, sort);

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          排序
        </Typography>
        <FormControl size="small">
          <Select
            value={sort.field}
            onChange={(e) => onSortChange({ ...sort, field: e.target.value as OrderSortField })}
            inputProps={{ 'aria-label': '排序字段' }}
          >
            {(Object.keys(ORDER_SORT_LABELS) as OrderSortField[]).map((field) => (
              <MenuItem key={field} value={field}>
                {ORDER_SORT_LABELS[field]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Tooltip title={sort.direction === 'asc' ? '升序' : '降序'}>
          <IconButton
            size="small"
            aria-label="切换排序方向"
            onClick={() =>
              onSortChange({ ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' })
            }
          >
            {sort.direction === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2" color="text.secondary">
          共 {sortedOrders.length} 条订单
        </Typography>
      </Stack>

      {sortedOrders.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>暂无订单数据</Paper>
      ) : (
        <Stack spacing={1.5}>
          {sortedOrders.map((order) => {
            const profit = order.revenue - (order.totalCost || 0);
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
                {order.imageUrl ? (
                  <a
                    href={`https://jp.mercari.com/item/${order.orderNo}`}
                    style={{ flexShrink: 0, lineHeight: 0 }}
                  >
                    <img
                      src={order.imageUrl}
                      alt={order.name}
                      style={{
                        width: IMAGE_SIZE,
                        height: IMAGE_SIZE,
                        objectFit: 'cover',
                        borderRadius: 6,
                      }}
                    />
                  </a>
                ) : (
                  <Box
                    sx={{
                      width: IMAGE_SIZE,
                      height: IMAGE_SIZE,
                      flexShrink: 0,
                      bgcolor: 'grey.200',
                      borderRadius: 1.5,
                    }}
                  />
                )}

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
                        color: order.hasUnknownCost
                          ? 'text.secondary'
                          : profit >= 0
                            ? 'success.main'
                            : 'error.main',
                      }}
                    >
                      {order.hasUnknownCost ? '未知' : profit.toFixed(2)}
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
