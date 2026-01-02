'use client';

import { Box, Paper, Typography, TextField, FormControl, InputLabel, Select, MenuItem, Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

interface Props {
  searchOrderNo: string;
  costStatus: 'all' | 'null' | 'hasValue';
  startDate: string;
  endDate: string;
  onSearchChange: (value: string) => void;
  onCostStatusChange: (value: 'all' | 'null' | 'hasValue') => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onApplyFilter: () => void;
  onClearFilter: () => void;
  onExport: () => void;
}

export default function OrderFilters({
  searchOrderNo,
  costStatus,
  startDate,
  endDate,
  onSearchChange,
  onCostStatusChange,
  onStartDateChange,
  onEndDateChange,
  onApplyFilter,
  onClearFilter,
  onExport,
}: Props) {
  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>筛选条件</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <TextField
          label="订单号/订单名"
          value={searchOrderNo}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="输入订单号或订单名搜索"
          sx={{ minWidth: 200, flex: 1 }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>成本状态</InputLabel>
          <Select
            value={costStatus}
            label="成本状态"
            onChange={(e) => onCostStatusChange(e.target.value as 'all' | 'null' | 'hasValue')}
          >
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="null">未输入成本</MenuItem>
            <MenuItem value="hasValue">已输入成本</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="开始日期"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 150 }}
        />
        <TextField
          label="结束日期"
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 150 }}
        />
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="outlined" onClick={onApplyFilter}>应用筛选</Button>
        <Button variant="text" onClick={onClearFilter}>清除筛选</Button>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={onExport}
          color="success"
          sx={{ ml: 'auto' }}
        >
          导出JSON
        </Button>
      </Box>
    </Paper>
  );
}
