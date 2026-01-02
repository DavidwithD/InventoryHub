'use client';

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { Category } from '@/types';

interface Props {
  categories: Category[];
  loading: boolean;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
}

export default function CategoriesTable({ categories, loading, onEdit, onDelete }: Props) {
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [target, setTarget] = React.useState<Category | null>(null);

  const openConfirm = (c: Category) => {
    setTarget(c);
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setTarget(null);
    setConfirmOpen(false);
  };

  const confirmDelete = () => {
    if (target) onDelete(target);
    closeConfirm();
  };

  if (loading) {
    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>加载中...</TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>分类名称</TableCell>
            <TableCell>创建时间</TableCell>
            <TableCell>更新时间</TableCell>
            <TableCell align="right">操作</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {categories.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} align="center">暂无数据</TableCell>
            </TableRow>
          ) : (
            categories.map((category) => (
              <TableRow key={category.id} hover>
                <TableCell>{category.id}</TableCell>
                <TableCell>{category.name}</TableCell>
                <TableCell>{new Date(category.createdAt).toLocaleString('zh-CN')}</TableCell>
                <TableCell>{new Date(category.updatedAt).toLocaleString('zh-CN')}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" color="primary" onClick={() => onEdit(category)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => openConfirm(category)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={confirmOpen} onClose={closeConfirm}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          确定要删除分类 "{target?.name}" 吗？
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConfirm}>取消</Button>
          <Button color="error" onClick={confirmDelete}>删除</Button>
        </DialogActions>
      </Dialog>
    </TableContainer>
  );
}
