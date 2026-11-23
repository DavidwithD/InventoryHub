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
  Tooltip,
} from '@mui/material';
import { Inventory } from '@/types';
import { formatMoney } from '@/lib/formatMoney';
import { stockStatus } from '../utils/productStock';

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
  /** Total remaining stock of each product over all its batches. */
  productStock: Map<number, number>;
  loading: boolean;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
  onAdjustFactor: (inv: Inventory) => void;
}

/** Stock of one batch. A click opens the factor dialog. */
function BatchStockChip({ qty, onClick }: { qty: number; onClick: () => void }) {
  return (
    <Chip
      label={String(qty)}
      size="small"
      variant="outlined"
      onClick={onClick}
      data-testid="batch-stock"
      sx={{ cursor: 'pointer' }}
    />
  );
}

/** Total stock of the product. The color shows low stock and out of stock. */
function ProductStockChip({ total }: { total: number }) {
  const status = stockStatus(total);
  if (status === 'out') {
    return <Chip label="缺货" color="error" size="small" data-testid="product-stock" />;
  }
  if (status === 'low') {
    return <Chip label={String(total)} color="warning" size="small" data-testid="product-stock" />;
  }
  return (
    <Chip
      label={String(total)}
      color="success"
      size="small"
      variant="outlined"
      data-testid="product-stock"
    />
  );
}

const columns: { id: SortField | null; label: string; align?: 'right' | 'center' }[] = [
  { id: 'id', label: 'ID' },
  { id: 'productName', label: '商品名称' },
  { id: 'categoryName', label: '分类' },
  { id: null, label: '进货批次' },
  { id: 'purchaseDate', label: '进货日期' },
  { id: 'purchaseQuantity', label: '进货数量', align: 'right' },
  { id: 'stockQuantity', label: '批次库存', align: 'center' },
  { id: null, label: '商品库存', align: 'center' },
  { id: 'priceJpy', label: '日元单价', align: 'right' },
  { id: 'priceCny', label: '人民币单价', align: 'right' },
];

export default function InventoryTable({
  inventories,
  productStock,
  loading,
  sortField,
  sortOrder,
  onSort,
  onAdjustFactor,
}: Props) {
  return (
    <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 280px)' }}>
      <Table stickyHeader size="small" sx={{ '& .MuiTableCell-root': { px: 1 } }}>
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
                  <Tooltip title="调整换算">
                    <span>
                      <BatchStockChip qty={inv.stockQuantity} onClick={() => onAdjustFactor(inv)} />
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell align="center">
                  <ProductStockChip total={productStock.get(inv.productId) ?? inv.stockQuantity} />
                </TableCell>
                <TableCell align="right">{formatMoney(inv.priceJpy, 'JPY')}</TableCell>
                <TableCell align="right">
                  {inv.priceCny != null ? formatMoney(inv.priceCny, 'CNY') : '—'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
