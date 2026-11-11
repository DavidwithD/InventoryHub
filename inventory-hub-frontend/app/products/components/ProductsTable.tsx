'use client';

import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Product } from '@/types';
import ProductThumbnail from './ProductThumbnail';

interface Props {
  products: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export default function ProductsTable({ products, loading, onEdit, onDelete }: Props) {
  return (
    <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 160px)' }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>图片</TableCell>
            <TableCell>商品名称</TableCell>
            <TableCell>分类</TableCell>
            <TableCell>创建时间</TableCell>
            <TableCell>更新时间</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                加载中...
              </TableCell>
            </TableRow>
          ) : products.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                暂无数据
              </TableCell>
            </TableRow>
          ) : (
            products.map((product) => (
              <TableRow key={product.id} hover>
                <TableCell>{product.id}</TableCell>
                <TableCell sx={{ width: 64, p: 1 }}>
                  <ProductThumbnail product={product} size={48} radius={4} />
                </TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.categoryName}</TableCell>
                <TableCell>{new Date(product.createdAt).toLocaleString('zh-CN')}</TableCell>
                <TableCell>{new Date(product.updatedAt).toLocaleString('zh-CN')}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="primary" onClick={() => onEdit(product)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => onDelete(product)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
