'use client';

import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  TextField,
  IconButton,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { OrderDetailRow, Inventory } from '@/types';

interface Props {
  rows: OrderDetailRow[];
  inventories: Inventory[];
  onUpdateRow: (tempId: string, field: keyof OrderDetailRow, value: any) => void;
  onRemoveRow: (tempId: string) => void;
}

export default function OrderDetailRows({ rows, inventories, onUpdateRow, onRemoveRow }: Props) {
  const calculateSubtotal = (row: OrderDetailRow): number => {
    return (row.unitPrice * row.quantity) + row.packagingCost + row.otherCost;
  };

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>库存商品</TableCell>
            <TableCell>单价（¥）</TableCell>
            <TableCell>数量</TableCell>
            <TableCell>可用库存</TableCell>
            <TableCell>包装费（¥）</TableCell>
            <TableCell>其他费用（¥）</TableCell>
            <TableCell>小计（¥）</TableCell>
            <TableCell>备注</TableCell>
            <TableCell>操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.tempId}>
              <TableCell>
                <FormControl fullWidth size="small">
                  <Select
                    value={row.inventoryId}
                    onChange={(e: SelectChangeEvent<number>) =>
                      onUpdateRow(row.tempId, 'inventoryId', Number(e.target.value))
                    }
                  >
                    <MenuItem value={0}>请选择</MenuItem>
                    {inventories
                      .filter(inv => inv.stockQuantity > 0)
                      .map(inv => (
                        <MenuItem key={inv.id} value={inv.id}>
                          {inv.productName}（库存：{inv.stockQuantity}）
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </TableCell>
              <TableCell>
                <TextField
                  type="number"
                  value={row.unitPrice}
                  onChange={(e) =>
                    onUpdateRow(row.tempId, 'unitPrice', Number(e.target.value))
                  }
                  size="small"
                  sx={{ width: 100 }}
                />
              </TableCell>
              <TableCell>
                <TextField
                  type="number"
                  value={row.quantity}
                  onChange={(e) =>
                    onUpdateRow(row.tempId, 'quantity', Number(e.target.value))
                  }
                  size="small"
                  sx={{ width: 80 }}
                />
              </TableCell>
              <TableCell>{row.availableStock || 0}</TableCell>
              <TableCell>
                <TextField
                  type="number"
                  value={row.packagingCost}
                  onChange={(e) =>
                    onUpdateRow(row.tempId, 'packagingCost', Number(e.target.value))
                  }
                  size="small"
                  sx={{ width: 100 }}
                />
              </TableCell>
              <TableCell>
                <TextField
                  type="number"
                  value={row.otherCost}
                  onChange={(e) =>
                    onUpdateRow(row.tempId, 'otherCost', Number(e.target.value))
                  }
                  size="small"
                  sx={{ width: 100 }}
                />
              </TableCell>
              <TableCell>{calculateSubtotal(row).toFixed(2)}</TableCell>
              <TableCell>
                <TextField
                  value={row.notes}
                  onChange={(e) =>
                    onUpdateRow(row.tempId, 'notes', e.target.value)
                  }
                  size="small"
                  sx={{ width: 120 }}
                />
              </TableCell>
              <TableCell>
                <IconButton
                  size="small"
                  onClick={() => onRemoveRow(row.tempId)}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
