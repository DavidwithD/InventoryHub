'use client';

import { useMemo, useState } from 'react';
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
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Link,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (curlCommand: string) => Promise<any>;
}

const MERCARI_SOLD_URL = 'https://jp.mercari.com/mypage/listings/sold';
const EXPECTED_ENDPOINT = 'api.mercari.jp/sold_histories/list';

type ValidationResult = { ok: true } | { ok: false; message: string };

function validateCurl(curl: string): ValidationResult {
  const trimmed = curl.trim();
  if (!trimmed.toLowerCase().startsWith('curl ')) {
    return { ok: false, message: '内容不是有效的 cURL 命令（应以 "curl" 开头）' };
  }
  const urlMatch = trimmed.match(/curl\s+'([^']+)'/);
  if (!urlMatch) {
    return {
      ok: false,
      message: '无法在 cURL 中找到 URL，请确认使用 Chrome 的 "Copy as cURL (bash)"',
    };
  }
  const url = urlMatch[1];
  if (!url.includes(EXPECTED_ENDPOINT)) {
    const wrongEndpoint = url.match(/api\.mercari\.jp\/[^?\s]+/)?.[0] ?? url;
    return {
      ok: false,
      message: `检测到错误的接口 (${wrongEndpoint})。请在「販売履歴」页面的 Network 面板中过滤 "sold_histories" 后复制该请求。`,
    };
  }
  return { ok: true };
}

export default function ImportDialog({ open, onClose, onImport }: Props) {
  const [curlCommand, setCurlCommand] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validation = useMemo<ValidationResult | null>(
    () => (curlCommand.trim() ? validateCurl(curlCommand) : null),
    [curlCommand],
  );
  const inputError = validation !== null && !validation.ok;

  const handleImport = async () => {
    if (!curlCommand.trim()) {
      setError('请粘贴 cURL 命令');
      return;
    }
    if (validation && !validation.ok) {
      setError(validation.message);
      return;
    }

    setImporting(true);
    setProgress('正在解析 cURL 命令...');
    setError('');
    setSuccess('');

    try {
      const result = await onImport(curlCommand);
      setProgress(
        `导入完成！总计: ${result.total}, 成功: ${result.success}, 跳过: ${result.skipped}, 失败: ${result.failed}`,
      );

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
          <Stepper orientation="vertical" activeStep={-1} sx={{ mb: 2 }}>
            <Step expanded>
              <StepLabel>打开 Mercari 销售历史页面</StepLabel>
              <StepContent>
                <Typography variant="body2">
                  <Link href={MERCARI_SOLD_URL} target="_blank" rel="noopener noreferrer">
                    {MERCARI_SOLD_URL}
                  </Link>
                </Typography>
              </StepContent>
            </Step>
            <Step expanded>
              <StepLabel>打开开发者工具(F12) → Network 面板，过滤 "sold_histories"</StepLabel>
              <StepContent>
                <Accordion
                  disableGutters
                  elevation={0}
                  sx={{ '&:before': { display: 'none' }, bgcolor: 'transparent' }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0 }}>
                    <Typography variant="body2">查看示例截图</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 0 }}>
                    <Box
                      component="a"
                      href="/import-guides/mercari-curl.png"
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ display: 'block' }}
                    >
                      <Box
                        component="img"
                        src="/import-guides/mercari-curl.png"
                        alt="DevTools Network 面板示例"
                        sx={{
                          width: '100%',
                          height: 'auto',
                          border: 1,
                          borderColor: 'divider',
                          borderRadius: 1,
                          cursor: 'zoom-in',
                        }}
                      />
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </StepContent>
            </Step>
            <Step expanded>
              <StepLabel>右键该请求 → Copy → Copy as cURL (bash)，粘贴到下方</StepLabel>
            </Step>
          </Stepper>

          <Alert severity="warning" sx={{ mb: 2 }}>
            cURL 中的 token 仅用于本次导入，不会被保存
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          <TextField
            label="粘贴 cURL 命令"
            multiline
            rows={12}
            fullWidth
            value={curlCommand}
            onChange={(e) => setCurlCommand(e.target.value)}
            placeholder="curl 'https://api.mercari.jp/sold_histories/list?limit=20&offset=0' -H 'authorization: ...' -H 'dpop: ...' ..."
            disabled={importing}
            error={inputError}
            helperText={inputError && validation && !validation.ok ? validation.message : ' '}
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
          disabled={importing || !curlCommand.trim() || inputError}
        >
          {importing ? '导入中...' : '开始导入'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
