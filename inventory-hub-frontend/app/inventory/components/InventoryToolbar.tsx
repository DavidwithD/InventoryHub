'use client';

import { Box, Paper, Typography, FormControl, Select, MenuItem, InputLabel } from '@mui/material';
import { Purchase } from '@/types';

interface Props {
  purchases: Purchase[];
  selectedPurchaseId: number;
  onSelectPurchase: (id: number) => void;
  expectedTotalJpy: number;
}

export default function InventoryToolbar({ purchases, selectedPurchaseId, onSelectPurchase, expectedTotalJpy }: Props) {
  const selectedPurchase = purchases.find(p => p.id === selectedPurchaseId);

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <Typography>选择进货单（可选）</Typography>
        <Select
          value={selectedPurchaseId}
          onChange={(e) => onSelectPurchase(Number(e.target.value))}
          displayEmpty
        >
          <MenuItem value={0}>查看所有库存</MenuItem>
          {purchases.map((purchase) => (
            <MenuItem key={purchase.id} value={purchase.id}>
              {purchase.purchaseNo} - {purchase.supplierName} - ¥{purchase.totalAmount.toFixed(2)} CNY (汇率: {purchase.exchangeRate})
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {selectedPurchase && (
        <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
          <Typography variant="body2">
            <strong>进货单号:</strong> {selectedPurchase.purchaseNo} | 
            <strong> 供应商:</strong> {selectedPurchase.supplierName}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <strong>支出金额:</strong> ¥{selectedPurchase.totalAmount.toFixed(2)} CNY | 
            <strong> 汇率:</strong> 1 CNY = {selectedPurchase.exchangeRate} JPY | 
            <strong> 对应日元:</strong> ¥{expectedTotalJpy.toFixed(2)} JPY
          </Typography>
        </Box>
      )}
    </Paper>
  );
}
