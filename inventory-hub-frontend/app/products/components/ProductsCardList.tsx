'use client';

import { Box, Card, Chip, IconButton, Paper, Stack, Typography } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import Image from 'next/image';
import { Product } from '@/types';

interface Props {
  products: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

const IMAGE_SIZE = 72;

export default function ProductsCardList({ products, loading, onEdit, onDelete }: Props) {
  if (loading || products.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
        {loading ? '加载中...' : '暂无数据'}
      </Paper>
    );
  }

  return (
    <Stack spacing={1.5} sx={{ maxHeight: 'calc(100vh - 160px)', overflowY: 'auto', pb: 1 }}>
      {products.map((product) => (
        <Card
          key={product.id}
          variant="outlined"
          data-testid="product-card"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 1.5,
            flexShrink: 0,
            transition: 'box-shadow 0.15s',
            '&:hover': { boxShadow: 2 },
          }}
        >
          <Box
            sx={{
              width: IMAGE_SIZE,
              height: IMAGE_SIZE,
              position: 'relative',
              flexShrink: 0,
              borderRadius: 1.5,
              overflow: 'hidden',
              bgcolor: 'grey.200',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'text.disabled',
              fontSize: 12,
            }}
          >
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                style={{ objectFit: 'cover' }}
                unoptimized
              />
            ) : (
              '无图'
            )}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.5, minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 600, minWidth: 0 }}
                noWrap
                title={product.name}
              >
                {product.name}
              </Typography>
              <Chip
                label={product.categoryName}
                size="small"
                variant="outlined"
                sx={{ flexShrink: 0 }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary" component="div">
              #{product.id} · 创建 {new Date(product.createdAt).toLocaleDateString('zh-CN')} · 更新{' '}
              {new Date(product.updatedAt).toLocaleString('zh-CN')}
            </Typography>
          </Box>

          <Stack direction="row" sx={{ flexShrink: 0 }}>
            <IconButton
              size="small"
              color="primary"
              onClick={() => onEdit(product)}
              aria-label="编辑"
            >
              <EditIcon />
            </IconButton>
            <IconButton
              size="small"
              color="error"
              onClick={() => onDelete(product)}
              aria-label="删除"
            >
              <DeleteIcon />
            </IconButton>
          </Stack>
        </Card>
      ))}
    </Stack>
  );
}
