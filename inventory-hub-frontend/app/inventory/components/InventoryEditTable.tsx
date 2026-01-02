'use client';

import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  Alert,
  SelectChangeEvent,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { Product, Purchase, InventoryRow } from '@/types';

interface Props {
  rows: InventoryRow[];
  products: Product[];
  selectedPurchase: Purchase;
  expectedTotalJpy: number;
  isReadOnly: boolean;
  onAddRow: () => void;
  onDeleteRow: (tempId: string) => void;
  onUpdateRow: (tempId: string, field: keyof InventoryRow, value: any) => void;
  onSave: () => void;
}

export default function InventoryEditTable({
  rows,
  products,
  selectedPurchase,
  expectedTotalJpy,
  isReadOnly,
  onAddRow,
  onDeleteRow,
  onUpdateRow,
  onSave,
}: Props) {
  const calculateCurrentTotalCny = (): number => {
    return rows.reduce((sum, row) => sum + (row.purchaseAmountCny || 0), 0);
  };

  const calculateCurrentTotalJpy = (): number => {
    return rows.reduce((sum, row) => sum + (row.purchaseAmountJpy || 0), 0);
  };

  const getDifferenceCny = (): number => {
    return calculateCurrentTotalCny() - selectedPurchase.totalAmount;
  };

  const isValidForSave = (): boolean => {
    if (rows.length === 0) return false;
    
    // 检查所有行是否有效
    for (const row of rows) {
      if (row.productId === 0) return false;
      if (row.purchaseQuantity <= 0) return false;
      if (row.purchaseAmountCny <= 0) return false;
      if (row.stockQuantity < 0) return false;
    }

    // 检查总金额是否匹配（人民币）
    const currentTotalCny = calculateCurrentTotalCny();
    return currentTotalCny.toFixed(2) === selectedPurchase.totalAmount.toFixed(2);
  };

  const currentTotalCny = calculateCurrentTotalCny();
  const currentTotalJpy = calculateCurrentTotalJpy();
  const differenceCny = getDifferenceCny();

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">库存明细</Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={onAddRow}
          disabled={isReadOnly}
        >
          添加行
        </Button>
      </Box>

      {isReadOnly && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>只读模式：</strong>该进货单的库存明细已生成，不允许修改或删除。如需调整，请联系管理员。
          </Typography>
        </Alert>
      )}

      {!isReadOnly && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="caption">
            <strong>说明:</strong> 输入人民币金额，系统将自动转换为日元存储到数据库。单位成本为日元单价。
          </Typography>
        </Alert>
      )}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width="20%">商品</TableCell>
              <TableCell width="12%">
                进货金额
                <Typography variant="caption" display="block" color="text.secondary">
                  人民币(CNY)
                </Typography>
              </TableCell>
              <TableCell width="12%">
                进货金额
                <Typography variant="caption" display="block" color="text.secondary">
                  日元(JPY)
                </Typography>
              </TableCell>
              <TableCell width="10%">进货数量</TableCell>
              <TableCell width="12%">
                单位成本
                <Typography variant="caption" display="block" color="text.secondary">
                  日元(JPY)
                </Typography>
              </TableCell>
              <TableCell width="10%">库存数量</TableCell>
              <TableCell width="8%">操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.tempId}>
                <TableCell>
                  <FormControl fullWidth size="small">
                    <Select
                      value={row.productId}
                      displayEmpty
                      disabled={isReadOnly}
                      onChange={(e: SelectChangeEvent<number>) => {
                        onUpdateRow(row.tempId, 'productId', Number(e.target.value));
                      }}
                      renderValue={(value) => {
                        if (value === 0) return '请选择商品';
                        const product = products.find(p => p.id === value);
                        return product ? `${product.categoryName} - ${product.name}` : '请选择商品';
                      }}
                    >
                      <MenuItem value={0} disabled>请选择商品</MenuItem>
                      {products.map((product) => (
                        <MenuItem key={product.id} value={product.id}>
                          {product.categoryName} - {product.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={row.purchaseAmountCny}
                    onChange={(e) => onUpdateRow(row.tempId, 'purchaseAmountCny', parseFloat(e.target.value) || 0)}
                    inputProps={{ step: 0.01, min: 0 }}
                    placeholder="输入人民币"
                    disabled={isReadOnly}
                  />
                </TableCell>
                <TableCell>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: row.purchaseAmountJpy ?? 0 > 0 ? 'primary.main' : 'text.secondary',
                      fontWeight: row.purchaseAmountJpy ?? 0 > 0 ? 'bold' : 'normal'
                    }}
                  >
                    ¥{(row.purchaseAmountJpy || 0).toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    value={row.purchaseQuantity}
                    onChange={(e) => onUpdateRow(row.tempId, 'purchaseQuantity', parseInt(e.target.value) || 0)}
                    inputProps={{ step: 1, min: 0 }}
                    disabled={isReadOnly}
                  />
                </TableCell>
                <TableCell>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: row.unitCostJpy ?? 0 > 0 ? 'success.main' : 'text.secondary',
                      fontWeight: row.unitCostJpy ?? 0 > 0 ? 'bold' : 'normal'
                    }}
                  >
                    ¥{(row.unitCostJpy || 0).toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {(row.stockQuantity || 0)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => onDeleteRow(row.tempId)}
                    disabled={rows.length === 1 || isReadOnly}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <Typography variant="body1" sx={{ mb: 1 }}>
          <strong>人民币汇总:</strong> ¥{currentTotalCny.toFixed(2)} CNY | 
          <strong> 进货总额:</strong> ¥{selectedPurchase.totalAmount.toFixed(2)} CNY | 
          <strong> 差额:</strong> <span style={{ 
            color: currentTotalCny.toFixed(2) === selectedPurchase.totalAmount.toFixed(2) ? 'green' : 'red',
            fontWeight: 'bold'
          }}>
            ¥{differenceCny.toFixed(2)} CNY
          </span>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          参考：日元汇总 ¥{currentTotalJpy.toFixed(2)} JPY（期望 ¥{expectedTotalJpy.toFixed(2)} JPY）
        </Typography>
        {currentTotalCny.toFixed(2) !== selectedPurchase.totalAmount.toFixed(2) && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            注意：人民币总额必须等于进货总额才能保存
          </Alert>
        )}
        {currentTotalCny.toFixed(2) === selectedPurchase.totalAmount.toFixed(2) && currentTotalCny > 0 && (
          <Alert severity="success" sx={{ mt: 2 }}>
            ✓ 总额验证通过，可以保存
          </Alert>
        )}
      </Box>

      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={!isValidForSave() || isReadOnly}
          size="large"
        >
          批量保存
        </Button>
      </Box>
    </>
  );
}
