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
import { Supplier } from '@/types';

interface Props {
  suppliers: Supplier[];
  loading: boolean;
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
}

export default function SuppliersTable({ suppliers, loading, onEdit, onDelete }: Props) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>供应商名称</TableCell>
            <TableCell>创建时间</TableCell>
            <TableCell>更新时间</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                加载中...
              </TableCell>
            </TableRow>
          ) : suppliers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">
                暂无数据
              </TableCell>
            </TableRow>
          ) : (
            suppliers.map((supplier) => (
              <TableRow key={supplier.id} hover>
                <TableCell>{supplier.id}</TableCell>
                <TableCell>{supplier.name}</TableCell>
                <TableCell>{new Date(supplier.createdAt).toLocaleString('zh-CN')}</TableCell>
                <TableCell>{new Date(supplier.updatedAt).toLocaleString('zh-CN')}</TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => onEdit(supplier)}
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => onDelete(supplier)}
                  >
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
