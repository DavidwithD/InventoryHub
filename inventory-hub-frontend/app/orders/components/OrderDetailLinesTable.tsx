'use client';

import { useState } from 'react';
import {
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { OrderDetail } from '@/types';

interface Props {
  details: OrderDetail[];
  /** Disables the inputs while a save runs. */
  busy: boolean;
  /** Saves a new quantity. Resolves to false when the save failed. */
  onQuantityChange: (detail: OrderDetail, quantity: number) => Promise<boolean>;
  onDelete: (detail: OrderDetail) => void;
}

/**
 * The quantity input of one line.
 * It saves on blur or Enter. It saves only a whole number of 1 or more that differs from the saved one.
 * Any other value, or a failed save, goes back to the saved quantity.
 */
function QuantityInput({
  detail,
  disabled,
  onCommit,
}: {
  detail: OrderDetail;
  disabled: boolean;
  onCommit: (quantity: number) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(String(detail.quantity));

  const commit = async () => {
    const quantity = Number(draft);
    const valid = Number.isInteger(quantity) && quantity >= 1 && quantity !== detail.quantity;
    if (!valid || !(await onCommit(quantity))) {
      setDraft(String(detail.quantity));
    }
  };

  return (
    <TextField
      size="small"
      type="number"
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
      slotProps={{ htmlInput: { min: 1, 'aria-label': `${detail.productName} 数量` } }}
      sx={{ width: 90 }}
    />
  );
}

/** The saved lines of one order. The quantity can be edited in the row. */
export default function OrderDetailLinesTable({ details, busy, onQuantityChange, onDelete }: Props) {
  if (details.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">暂无订单详细</Typography>
      </Paper>
    );
  }

  return (
    // On a narrow screen the table keeps its width and the container scrolls sideways.
    <TableContainer component={Paper} variant="outlined">
      <Table size="small" sx={{ minWidth: 640, '& th': { whiteSpace: 'nowrap' } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ minWidth: 180 }}>商品名</TableCell>
            <TableCell sx={{ width: 110 }}>数量</TableCell>
            <TableCell>包装费（¥）</TableCell>
            <TableCell>其他费用（¥）</TableCell>
            <TableCell>小计（¥）</TableCell>
            <TableCell>备注</TableCell>
            <TableCell sx={{ width: 60 }}>删除</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {details.map((detail) => (
            <TableRow key={detail.id}>
              <TableCell>{detail.productName}</TableCell>
              <TableCell>
                {/* The key resets the input after the saved quantity changes. */}
                <QuantityInput
                  key={detail.quantity}
                  detail={detail}
                  disabled={busy}
                  onCommit={(quantity) => onQuantityChange(detail, quantity)}
                />
              </TableCell>
              <TableCell>{detail.packagingCost.toFixed(2)}</TableCell>
              <TableCell>{detail.otherCost.toFixed(2)}</TableCell>
              <TableCell>
                {detail.unmatchedQuantity > 0 ? '未知' : detail.subtotalCost.toFixed(2)}
              </TableCell>
              <TableCell>{detail.notes || '-'}</TableCell>
              <TableCell>
                <IconButton
                  size="small"
                  color="error"
                  disabled={busy}
                  aria-label={`删除 ${detail.productName}`}
                  onClick={() => onDelete(detail)}
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
