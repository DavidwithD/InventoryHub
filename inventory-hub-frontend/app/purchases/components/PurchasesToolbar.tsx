'use client';

import { Box, Button, TextField, Select, MenuItem, FormControl, InputLabel, Grid, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { Supplier } from '@/types';

interface Props {
  onAdd: () => void;
  suppliers: Supplier[];
  filters: {
    purchaseNo: string;
    supplierId: number;
    dateRange: string;
    startDate: string;
    endDate: string;
    sortBy: string;
    sortOrder: string;
  };
  onFilterChange: (key: string, value: any) => void;
}

export default function PurchasesToolbar({ onAdd, suppliers, filters, onFilterChange }: Props) {
  const handleDateRangeChange = (value: string) => {
    onFilterChange('dateRange', value);
    
    const today = new Date();
    let start = '';
    let end = '';
    
    if (value === 'thisMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    } else if (value === 'lastMonth') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split('T')[0];
      end = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0];
    } else if (value === 'last7Days') {
      start = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      end = today.toISOString().split('T')[0];
    } else if (value === 'all') {
      start = '';
      end = '';
    }
    
    onFilterChange('startDate', start);
    onFilterChange('endDate', end);
  };

  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <TextField
            fullWidth
            size="small"
            label="进货单号"
            placeholder="模糊搜索"
            value={filters.purchaseNo}
            onChange={(e) => onFilterChange('purchaseNo', e.target.value)}
            slotProps={{
              input: {
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
              }
            }}
          />
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel>供应商</InputLabel>
            <Select
              value={filters.supplierId}
              label="供应商"
              onChange={(e) => onFilterChange('supplierId', e.target.value)}
            >
              <MenuItem value={0}>全部供应商</MenuItem>
              {suppliers.map((s) => (
                <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel>排序方式</InputLabel>
            <Select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              label="排序方式"
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                onFilterChange('sortBy', sortBy);
                onFilterChange('sortOrder', sortOrder);
              }}
            >
              <MenuItem value="purchaseDate-desc">日期 ↓ (最新)</MenuItem>
              <MenuItem value="purchaseDate-asc">日期 ↑ (最旧)</MenuItem>
              <MenuItem value="purchaseNo-asc">单号 ↑ (A-Z)</MenuItem>
              <MenuItem value="purchaseNo-desc">单号 ↓ (Z-A)</MenuItem>
              <MenuItem value="totalAmount-desc">总额 ↓ (高到低)</MenuItem>
              <MenuItem value="totalAmount-asc">总额 ↑ (低到高)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Button 
            fullWidth 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={onAdd}
            sx={{ height: '40px' }}
          >
            新增进货
          </Button>
        </Grid>
      </Grid>
      
      <Box sx={{ mb: 2 }}>
        <ToggleButtonGroup
          value={filters.dateRange}
          exclusive
          onChange={(e, val) => val && handleDateRangeChange(val)}
          size="small"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="all">全部</ToggleButton>
          <ToggleButton value="thisMonth">本月</ToggleButton>
          <ToggleButton value="lastMonth">上月</ToggleButton>
          <ToggleButton value="last7Days">最近7天</ToggleButton>
          <ToggleButton value="custom">自定义</ToggleButton>
        </ToggleButtonGroup>
        
        {filters.dateRange === 'custom' && (
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="开始日期"
                type="date"
                value={filters.startDate}
                onChange={(e) => onFilterChange('startDate', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="结束日期"
                type="date"
                value={filters.endDate}
                onChange={(e) => onFilterChange('endDate', e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </Grid>
        )}
      </Box>
    </Box>
  );
}
