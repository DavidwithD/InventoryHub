'use client';

import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import { InventoryImpact } from '@/types';

interface Props {
  open: boolean;
  title: string;
  impact: InventoryImpact | null;
  confirmLabel: string;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

// Shows how a batch change moves past sales before the change is saved.
export default function ImpactConfirmDialog({
  open,
  title,
  impact,
  confirmLabel,
  submitting,
  onClose,
  onConfirm,
}: Props) {
  const costChange = impact?.costChange ?? 0;
  const costText = `${costChange > 0 ? '+' : ''}¥${costChange.toLocaleString()}`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {impact && (
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            <Typography variant="body2">
              {impact.affectedOrders} 个订单的 {impact.affectedLines}{' '}
              条明细将按先进先出原则重新分配。
            </Typography>
            <Typography variant="body2">已匹配部分成本变化：{costText}</Typography>
            {impact.newlyUnmatchedQuantity > 0 && (
              <Alert severity="warning">
                {impact.newlyUnmatchedQuantity} 件将没有匹配批次，成本变为未知。
              </Alert>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button variant="contained" color="warning" onClick={onConfirm} disabled={submitting}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
