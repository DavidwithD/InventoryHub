'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Alert,
  Typography,
  Box,
} from '@mui/material';

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (curlCommand: string) => Promise<any>;
}

export default function ImportDialog({ open, onClose, onImport }: Props) {
  const [curlCommand, setCurlCommand] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleImport = async () => {
    if (!curlCommand.trim()) {
      setError('请粘贴 cURL 命令');
      return;
    }

    setImporting(true);
    setProgress('正在解析 cURL 命令...');
    setError('');
    setSuccess('');

    try {
      const result = await onImport(curlCommand);
      setProgress(`导入完成！总计: ${result.total}, 成功: ${result.success}, 跳过: ${result.skipped}, 失败: ${result.failed}`);
      
      if (result.errors && result.errors.length > 0) {
        setError(`部分错误: ${result.errors.slice(0, 3).join('; ')}`);
      } else {
        setSuccess(`成功导入 ${result.success} 条订单`);
      }

      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (err: any) {
      if (err.response?.data) {
        const errorData = err.response.data;
        if (typeof errorData === 'string') {
          setError(errorData);
        } else if (errorData.errors && Array.isArray(errorData.errors)) {
          setError(errorData.errors.join('; '));
        } else {
          setError(JSON.stringify(errorData));
        }
      } else {
        setError(err.message || '导入失败');
      }
      setProgress('');
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setCurlCommand('');
    setProgress('');
    setError('');
    setSuccess('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>批量导入订单</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              请从浏览器开发者工具的 Network 标签中复制 Mercari API 的 cURL 命令。
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              系统将自动：
            </Typography>
            <Typography variant="body2" component="div">
              • 解析 cURL 并调用 Mercari API<br />
              • 获取所有销售历史记录<br />
              • 根据订单号去重（跳过已存在的订单）<br />
              • 批量创建订单
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold', color: 'warning.main' }}>
              ⚠️ 注意：cURL 中的 token 仅用于本次导入，不会被保存
            </Typography>
          </Alert>

          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

          <TextField
            label="粘贴 cURL 命令"
            multiline
            rows={12}
            fullWidth
            value={curlCommand}
            onChange={(e) => setCurlCommand(e.target.value)}
            placeholder="curl 'https://api.mercari.jp/sold_histories/list?limit=20&offset=0' ..."
            disabled={importing}
          />

          {progress && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="primary">
                {progress}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={importing}>
          {progress ? '关闭' : '取消'}
        </Button>
        <Button 
          onClick={handleImport} 
          variant="contained" 
          disabled={importing || !curlCommand.trim()}
        >
          {importing ? '导入中...' : '开始导入'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
