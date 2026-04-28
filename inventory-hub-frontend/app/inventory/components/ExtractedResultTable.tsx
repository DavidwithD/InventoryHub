'use client';

import {
  Box,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { Category, PreviewRow, Product } from '@/types';
import ExtractedResultRow, { RegisterInventoryPayload } from './ExtractedResultRow';

interface Props {
  rows: PreviewRow[];
  categories: Category[];
  products: Product[];
  productMap: Record<string, number>;
  registeredItems: Set<string>;
  loading: boolean;
  hasMore: boolean;
  onProductSelected: (productName: string, productId: number) => void;
  onProductCreated: (data: { categoryId: number; name: string }) => Promise<Product>;
  onRegister: (payload: RegisterInventoryPayload) => Promise<void>;
  onLoadMore: () => void;
}

export default function ExtractedResultTable({
  rows,
  categories,
  products,
  productMap,
  registeredItems,
  loading,
  hasMore,
  onProductSelected,
  onProductCreated,
  onRegister,
  onLoadMore,
}: Props) {
  if (rows.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {'暂无数据。请选择供应商后点击"解析并预览"。'}
      </Typography>
    );
  }

  return (
    <>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>缩略图</TableCell>
              <TableCell>采购单号</TableCell>
              <TableCell>采购日期</TableCell>
              <TableCell>商品名称</TableCell>
              <TableCell align="right">价格（元）</TableCell>
              <TableCell align="right">数量</TableCell>
              <TableCell>分类 / 商品</TableCell>
              <TableCell>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, idx) => (
              <ExtractedResultRow
                key={row.purchaseNo + '-' + idx}
                row={row}
                categories={categories}
                products={products}
                selectedProductId={productMap[row.productName] ?? null}
                registeredItems={registeredItems}
                onProductSelected={onProductSelected}
                onProductCreated={onProductCreated}
                onRegister={onRegister}
              />
            ))}
          </TableBody>
        </Table>
      </Box>
      {hasMore && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" onClick={onLoadMore} disabled={loading}>
            加载下一批
          </Button>
          {loading && <CircularProgress size={22} />}
        </Box>
      )}
    </>
  );
}
