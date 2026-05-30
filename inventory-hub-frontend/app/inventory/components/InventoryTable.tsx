'use client';

import {
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
} from '@mui/material';
import { Inventory } from '@/types';

export type SortField =
  | 'id'
  | 'productName'
  | 'categoryName'
  | 'purchaseDate'
  | 'purchaseQuantity'
  | 'stockQuantity'
  | 'priceJpy'
  | 'priceCny';

export type SortOrder = 'asc' | 'desc';

interface Props {
  inventories: Inventory[];
  loading: boolean;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}

function StockChip({ qty }: { qty: number }) {
  if (qty === 0) return <Chip label="缺货" color="error" size="small" />;
  if (qty < 5) return <Chip label={String(qty)} color="warning" size="small" />;
  return <Chip label={String(qty)} color="success" size="small" variant="outlined" />;
}

const columns: { id: SortField | null; label: string; align?: 'right' | 'center' }[] = [
  { id: 'id', label: 'ID' },
  { id: 'productName', label: '商品名称' },
  { id: 'categoryName', label: '分类' },
  { id: null, label: '进货批次' },
  { id: 'purchaseDate', label: '进货日期' },
  { id: 'purchaseQuantity', label: '进货数量', align: 'right' },
  { id: 'stockQuantity', label: '库存数量', align: 'center' },
  { id: 'priceJpy', label: '日元单价', align: 'right' },
  { id: 'priceCny', label: '人民币单价', align: 'right' },
];

export default function InventoryTable({
  inventories,
  loading,
  sortField,
  sortOrder,
  onSort,
}: Props) {
  return (
    <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 280px)' }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col.label} align={col.align}>
                {col.id ? (
                  <TableSortLabel
                    active={sortField === col.id}
                    direction={sortField === col.id ? sortOrder : 'asc'}
                    onClick={() => onSort(col.id as SortField)}
                  >
                    {col.label}
                  </TableSortLabel>
                ) : (
                  col.label
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center">
                加载中...
              </TableCell>
            </TableRow>
          ) : inventories.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center">
                暂无数据
              </TableCell>
            </TableRow>
          ) : (
            inventories.map((inv) => (
              <TableRow key={inv.id} hover>
                <TableCell>{inv.id}</TableCell>
                <TableCell>{inv.productName}</TableCell>
                <TableCell>{inv.categoryName || '—'}</TableCell>
                <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                  {inv.purchaseNo || '—'}
                </TableCell>
                <TableCell>
                  {inv.purchaseDate ? new Date(inv.purchaseDate).toLocaleDateString('zh-CN') : '—'}
                </TableCell>
                <TableCell align="right">{inv.purchaseQuantity}</TableCell>
                <TableCell align="center">
                  <StockChip qty={inv.stockQuantity} />
                </TableCell>
                <TableCell align="right">¥{inv.priceJpy.toLocaleString()}</TableCell>
                <TableCell align="right">
                  {inv.priceCny != null ? `¥${inv.priceCny.toLocaleString()}` : '—'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
