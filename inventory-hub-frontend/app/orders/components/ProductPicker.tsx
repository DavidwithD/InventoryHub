'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Card,
  CardActionArea,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from '@mui/material';
import Image from 'next/image';
import api from '@/lib/api';
import { Category, Inventory, Product } from '@/types';
import { totalStockForProduct } from '../utils/fifoPick';

interface ProductPickerProps {
  inventories: Inventory[];
  categories: Category[];
  excludeProductIds?: number[];
  onPick: (productId: number) => void;
  mode?: 'grid' | 'compact';
}

interface PickerItem {
  productId: number;
  productName: string;
  categoryId?: number;
  totalStock: number;
}

export default function ProductPicker({
  inventories,
  categories,
  excludeProductIds = [],
  onPick,
  mode = 'grid',
}: ProductPickerProps) {
  const [categoryId, setCategoryId] = useState<number>(0);
  const [search, setSearch] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const fetchedRef = useRef<boolean>(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    api
      .get<Product[]>('/products')
      .then((res) => setProducts(res.data))
      .catch(() => setProducts([]));
  }, []);

  const productImageById = useMemo(() => {
    const map = new Map<number, string | undefined>();
    for (const p of products) map.set(p.id, p.imageUrl);
    return map;
  }, [products]);

  const items = useMemo((): PickerItem[] => {
    const byProduct = new Map<number, PickerItem>();
    for (const inv of inventories) {
      if (!inv.productId) continue;
      const existing = byProduct.get(inv.productId);
      if (existing) {
        existing.totalStock += inv.stockQuantity;
      } else {
        byProduct.set(inv.productId, {
          productId: inv.productId,
          productName: inv.productName,
          categoryId: inv.categoryId,
          totalStock: inv.stockQuantity,
        });
      }
    }
    const excluded = new Set(excludeProductIds);
    const term = search.trim().toLowerCase();
    return Array.from(byProduct.values())
      .filter((it) => it.totalStock > 0)
      .filter((it) => !excluded.has(it.productId))
      .filter((it) => categoryId === 0 || it.categoryId === categoryId)
      .filter((it) => term === '' || it.productName.toLowerCase().includes(term))
      .sort((a, b) => a.productName.localeCompare(b.productName));
  }, [inventories, excludeProductIds, categoryId, search]);

  const handleCategoryChange = (e: SelectChangeEvent<number>) => {
    setCategoryId(Number(e.target.value));
  };

  const cardSize = mode === 'compact' ? 72 : 96;
  const gridSize = mode === 'compact'
    ? { xs: 6, sm: 4, md: 3 }
    : { xs: 6, sm: 4, md: 3, lg: 2 };
  const gridMaxHeight = mode === 'compact' ? 220 : 360;

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>商品分类</InputLabel>
          <Select value={categoryId} label="商品分类" onChange={handleCategoryChange}>
            <MenuItem value={0}>全部分类</MenuItem>
            {categories.map((cat) => (
              <MenuItem key={cat.id} value={cat.id}>
                {cat.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          size="small"
          label="搜索商品"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, minWidth: 200 }}
        />
      </Box>

      <Box sx={{ maxHeight: gridMaxHeight, overflowY: 'auto', pr: 1 }}>
        {items.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            没有可用商品
          </Typography>
        ) : (
          <Grid container spacing={1.5}>
            {items.map((item) => {
              const imageUrl = productImageById.get(item.productId);
              return (
                <Grid key={item.productId} size={gridSize}>
                  <Card variant="outlined">
                    <CardActionArea
                      onClick={() => onPick(item.productId)}
                      sx={{ p: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          height: cardSize,
                          position: 'relative',
                          bgcolor: 'grey.100',
                          borderRadius: 1,
                          overflow: 'hidden',
                        }}
                      >
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={item.productName}
                            fill
                            style={{ objectFit: 'cover' }}
                            unoptimized
                          />
                        ) : (
                          <Box
                            sx={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'text.disabled',
                              fontSize: 12,
                            }}
                          >
                            无图
                          </Box>
                        )}
                      </Box>
                      <Typography variant="body2" noWrap sx={{ mt: 0.5 }}>
                        {item.productName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        库存：{item.totalStock}
                      </Typography>
                    </CardActionArea>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>
    </Box>
  );
}

export { totalStockForProduct };
