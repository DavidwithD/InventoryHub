'use client';

import React, { useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { Category } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  initialCategory?: Category | null;
  onSave: (payload: { name: string }) => Promise<void>;
}

export default function CategoryDialog({ open, onClose, initialCategory, onSave }: Props) {
  const [name, setName] = React.useState('');

  useEffect(() => {
    if (open) {
      setName(initialCategory?.name || '');
    }
  }, [open, initialCategory]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('请输入分类名称');
      return;
    }
    await onSave({ name: name.trim() });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initialCategory ? '编辑分类' : '新增分类'}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="分类名称"
          type="text"
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleSave} variant="contained">保存</Button>
      </DialogActions>
    </Dialog>
  );
}
