'use client';

import { Box, Button, Stack, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';

export default function InventoryPage() {
  const router = useRouter();

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
          库存管理
        </Typography>
        <Typography variant="body2" color="text.secondary">
          查看和管理库存记录。
        </Typography>
      </Box>

      <Box>
        <Button variant="contained" onClick={() => router.push('/inventory/import')}>
          采购导入
        </Button>
      </Box>
    </Stack>
  );
}
