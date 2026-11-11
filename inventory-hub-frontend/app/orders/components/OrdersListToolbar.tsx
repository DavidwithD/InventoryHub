'use client';

import {
  Box,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ViewModeToggle from '@/components/ViewModeToggle';
import type { ViewMode } from '@/lib/stores/viewModeStore';
import { ORDER_SORT_LABELS, OrderSort, OrderSortField } from '../utils/sortOrders';

interface Props {
  count: number;
  sort: OrderSort;
  onSortChange: (sort: OrderSort) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

/**
 * The row above the order list. It holds the sort controls, the order count and the view toggle.
 * The sort controls show only in card view. The table sorts by its column headers.
 * The toggle stays at the right end in both views.
 */
export default function OrdersListToolbar({
  count,
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
}: Props) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5, minHeight: 40 }}>
      {viewMode === 'card' && (
        <>
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
        </>
      )}
      <Box sx={{ flex: 1 }} />
      <Typography variant="body2" color="text.secondary">
        共 {count} 条订单
      </Typography>
      <ViewModeToggle mode={viewMode} onChange={onViewModeChange} />
    </Stack>
  );
}
