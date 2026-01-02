'use client';

import React from 'react';
import { Box, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

interface Props {
  onAdd: () => void;
}

export default function CategoriesToolbar({ onAdd }: Props) {
  return (
    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
      <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
        新增分类
      </Button>
    </Box>
  );
}
