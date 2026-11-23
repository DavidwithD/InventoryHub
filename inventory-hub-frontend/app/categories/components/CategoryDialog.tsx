'use client';

import React, { useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { Category } from '@/types';
import { apiErrorMessage } from '@/lib/apiErrorMessage';

interface Props {
  open: boolean;
  onClose: () => void;
  initialCategory?: Category | null;
  /** Rejects when the save fails. The dialog then stays open and shows the error. */
  onSave: (payload: { name: string }) => Promise<void>;
}

export default function CategoryDialog({ open, onClose, initialCategory, onSave }: Props) {
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  useEffect(() => {
    if (open) {
      setName(initialCategory?.name || '');
      setError('');
    }
  }, [open, initialCategory]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('请输入分类名称');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({ name: name.trim() });
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, '操作失败'));
    } finally {
      setSaving(false);
    }
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
          error={Boolean(error)}
          helperText={error}
          disabled={saving}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          取消
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
