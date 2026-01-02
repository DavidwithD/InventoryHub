'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import { Supplier } from '@/types';

interface Props {
  open: boolean;
  supplier: Supplier | null;
  onClose: () => void;
  onSave: (data: { name: string }) => Promise<void>;
}

export default function SupplierDialog({ open, supplier, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (supplier) {
      setName(supplier.name);
    } else {
      setName('');
    }
    setError('');
  }, [supplier, open]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('请输入供应商名称');
      return;
    }

    try {
      setSaving(true);
      setError('');
      await onSave({ name: name.trim() });
      handleClose();
    } catch (err: any) {
      const message = err.response?.data || '操作失败';
      setError(typeof message === 'string' ? message : JSON.stringify(message));
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setName('');
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {supplier ? '编辑供应商' : '新增供应商'}
      </DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="供应商名称"
          type="text"
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={Boolean(error)}
          helperText={error}
          sx={{ mt: 2 }}
          disabled={saving}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>
          取消
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          {saving ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
