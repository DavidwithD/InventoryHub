'use client';

import { useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Alert,
  SelectChangeEvent,
} from '@mui/material';
import { Purchase, Supplier } from '@/types';
import { usePurchaseForm } from '@/app/purchases/hooks/usePurchaseForm';
import { useExchangeRate } from '@/app/purchases/hooks/useExchangeRate';
import { useSuppliers } from '@/app/purchases/hooks/useSuppliers';

interface Props {
  open: boolean;
  onClose: () => void;
  initialPurchase?: Purchase | null;
  onSave: (payload: {
    supplierId: number;
    purchaseDate: string;
    purchaseNo: string;
    totalAmount: number;
    currencyType: string;
    exchangeRate: number;
  }) => Promise<void>;
}

export default function PurchaseDialog({ open, onClose, initialPurchase, onSave }: Props) {
  const { formData, setFormData, reset } = usePurchaseForm();
  const { fetchingRate, fetchExchangeRate } = useExchangeRate();
  const { suppliers, loadSuppliers } = useSuppliers();

  useEffect(() => {
    if (open) {
      // initialize form from initialPurchase or reset
      if (initialPurchase) {
        setFormData({
          supplierId: initialPurchase.supplierId,
          purchaseDate: initialPurchase.purchaseDate.split('T')[0],
          purchaseNo: initialPurchase.purchaseNo,
          totalAmount: initialPurchase.totalAmount.toString(),
          currencyType: initialPurchase.currencyType,
          exchangeRate: initialPurchase.exchangeRate.toString(),
        });
      } else {
        void getExchangeRate().then((savedRate) => reset({ exchangeRate: savedRate }));
      }

      // load suppliers when dialog opens
      loadSuppliers().catch((e) => console.error(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialPurchase]);

  const getExchangeRate = async () => {
    const rate = await fetchExchangeRate();
    const rateStr = rate.toFixed(4);
    return rateStr;
  };

  const handleFetchRate = useCallback(async () => {
    try {
      if (formData.currencyType === 'JPY') {
        setFormData({ ...formData, exchangeRate: '1' });
        return;
      }
      const rateStr = await getExchangeRate();
      setFormData({ ...formData, exchangeRate: rateStr });
    } catch (err) {
      // caller can show notification
      console.error('fetch rate failed', err);
    }
  }, [fetchExchangeRate, formData, setFormData]);

  const handleChangeCurrencyType = async (event: SelectChangeEvent) => {
    const newCurrencyType = event.target.value as string;
    const rateStr = newCurrencyType === 'JPY' ? '1' : await getExchangeRate();
    setFormData({ ...formData, currencyType: newCurrencyType, exchangeRate: rateStr });
  };

  const handleSave = async () => {
    if (!formData.supplierId) {
      alert('请选择供应商');
      return;
    }
    if (!formData.purchaseNo.trim()) {
      alert('请输入进货单号');
      return;
    }
    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
      alert('请输入有效的支出金额');
      return;
    }
    if (!formData.exchangeRate || parseFloat(formData.exchangeRate) <= 0) {
      alert('请输入有效的汇率');
      return;
    }

    const payload = {
      supplierId: formData.supplierId,
      purchaseDate: new Date(formData.purchaseDate).toISOString(),
      purchaseNo: formData.purchaseNo,
      totalAmount: parseFloat(formData.totalAmount),
      currencyType: formData.currencyType,
      exchangeRate: parseFloat(formData.exchangeRate),
    };

    await onSave(payload);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialPurchase ? '编辑进货' : '新增进货'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>供应商</InputLabel>
              <Select
                value={formData.supplierId}
                label="供应商"
                onChange={(e) => setFormData({ ...formData, supplierId: Number(e.target.value) })}
              >
                <MenuItem value={0}>请选择供应商</MenuItem>
                {suppliers.map((s: Supplier) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="进货日期"
              type="date"
              fullWidth
              variant="outlined"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              label="进货单号"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.purchaseNo}
              onChange={(e) => setFormData({ ...formData, purchaseNo: e.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel>货币类型</InputLabel>
              <Select
                value={formData.currencyType}
                label="货币类型"
                onChange={handleChangeCurrencyType}
              >
                <MenuItem value="CNY">CNY (人民币)</MenuItem>
                <MenuItem value="JPY">JPY (日元)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label={`支出金额 ${formData.currencyType}`}
              type="number"
              fullWidth
              variant="outlined"
              value={formData.totalAmount}
              onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label={`汇率 (${formData.currencyType}→JPY)`}
                type="number"
                fullWidth
                variant="outlined"
                value={formData.exchangeRate}
                onChange={(e) => setFormData({ ...formData, exchangeRate: e.target.value })}
              />
              <Button
                variant="outlined"
                onClick={handleFetchRate}
                disabled={fetchingRate}
                sx={{ minWidth: '120px' }}
              >
                {fetchingRate ? '获取中...' : '获取汇率'}
              </Button>
            </Box>
          </Grid>

          {formData.totalAmount && formData.exchangeRate && (
            <Grid size={{ xs: 12 }}>
              <Alert severity="info">
                对应日元：¥
                {(Number(formData.totalAmount) * Number(formData.exchangeRate)).toFixed(2)} JPY
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleSave} variant="contained">
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
