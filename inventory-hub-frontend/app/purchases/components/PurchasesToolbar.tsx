'use client';

import { Box, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

interface Props {
  onAdd: () => void;
}

export default function PurchasesToolbar({ onAdd }: Props) {
  return (
    <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
      <Button variant="contained" startIcon={<AddIcon />} onClick={onAdd}>
        新增进货
      </Button>
    </Box>
  );
}
