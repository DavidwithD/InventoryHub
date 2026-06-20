'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Inventory } from '@/types';
import { useFactorStore } from '@/lib/stores/factorStore';

interface Props {
  open: boolean;
  inventory: Inventory | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: (factor: number) => void;
}

export default function FactorAdjustDialog({
  open,
  inventory,
  submitting,
  onClose,
  onConfirm,
}: Props) {
  const getFactor = useFactorStore((s) => s.getFactor);
  const setStoredFactor = useFactorStore((s) => s.setFactor);

  // Parent remounts this dialog per target via `key`, so the initializer runs fresh
  // each open, recalling the product's last applied factor from the store.
  const [factorInput, setFactorInput] = useState(() =>
    inventory ? String(getFactor(inventory.productId)) : '1'
  );

  const factor = Number(factorInput);
  const factorValid = Number.isFinite(factor) && factor > 0;

  const newStock = inventory && factorValid ? inventory.purchaseQuantity * factor : 0;
  const newCny =
    inventory && factorValid && inventory.priceCny != null ? inventory.priceCny / factor : null;
  const newJpy = inventory && factorValid ? Math.round(inventory.priceJpy / factor) : 0;

  const handleConfirm = () => {
    if (!factorValid) return;
    if (inventory) {
      setStoredFactor(inventory.productId, factor);
    }
    onConfirm(factor);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>调整换算倍数</DialogTitle>
      <DialogContent>
        {inventory && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="subtitle2">{inventory.productName}</Typography>
            <Typography variant="body2" color="text.secondary">
              进货数量 {inventory.purchaseQuantity} · 当前库存 {inventory.stockQuantity} · 单价 ¥
              {inventory.priceCny != null ? inventory.priceCny.toLocaleString() : '—'} / ¥
              {inventory.priceJpy.toLocaleString()}
            </Typography>

            <TextField
              size="small"
              type="number"
              label="换算倍数(件/组)"
              value={factorInput}
              onChange={(e) => setFactorInput(e.target.value)}
              error={!factorValid}
              helperText={factorValid ? ' ' : '倍数需大于 0'}
              inputProps={{ min: 0, step: 1 }}
              autoFocus
              fullWidth
            />

            <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
              <Typography variant="body2" color={factorValid ? 'text.primary' : 'error'}>
                {factorValid
                  ? `入库 ${newStock} 件 · 单价 ¥${newCny != null ? newCny.toFixed(2) : '—'} / ¥${newJpy.toLocaleString()}`
                  : '请输入有效倍数'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                进货数量保持 {inventory.purchaseQuantity}（组数不变）
              </Typography>
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          取消
        </Button>
        <Button variant="contained" onClick={handleConfirm} disabled={!factorValid || submitting}>
          应用
        </Button>
      </DialogActions>
    </Dialog>
  );
}
