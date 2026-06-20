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
import { usePickHistoryStore } from '@/lib/stores/pickHistoryStore';
import { isBatchEligible, totalStockForProduct } from '../utils/fifoPick';

// Sentinel category values. Real category ids are positive.
const CATEGORY_HISTORY = -1; // 选择历史 — only previously picked products
const CATEGORY_ALL = 0; // 全部分类 — every product

interface ProductPickerProps {
  inventories: Inventory[];
  categories: Category[];
  excludeProductIds?: number[];
  onPick: (productId: number) => void;
  mode?: 'grid' | 'compact';
  saleDate?: string;
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
  saleDate,
}: ProductPickerProps) {
  const [categoryId, setCategoryId] = useState<number>(CATEGORY_HISTORY);
  const [search, setSearch] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const fetchedRef = useRef<boolean>(false);
  const history = usePickHistoryStore((s) => s.history);
  const addToHistory = usePickHistoryStore((s) => s.addToHistory);

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
      if (!isBatchEligible(inv, saleDate)) continue;
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
    const historyRank = new Map(history.map((id, i) => [id, i]));

    const result = Array.from(byProduct.values())
      .filter((it) => it.totalStock > 0)
      .filter((it) => !excluded.has(it.productId))
      .filter((it) => term === '' || it.productName.toLowerCase().includes(term))
      .filter((it) => {
        if (categoryId === CATEGORY_HISTORY) return historyRank.has(it.productId);
        if (categoryId === CATEGORY_ALL) return true;
        return it.categoryId === categoryId;
      });

    // History view keeps most-recent-first; other views sort alphabetically.
    if (categoryId === CATEGORY_HISTORY) {
      result.sort((a, b) => historyRank.get(a.productId)! - historyRank.get(b.productId)!);
    } else {
      result.sort((a, b) => a.productName.localeCompare(b.productName));
    }
    return result;
  }, [inventories, excludeProductIds, search, categoryId, history, saleDate]);

  const pick = (productId: number) => {
    addToHistory(productId);
    onPick(productId);
  };

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
            <MenuItem value={CATEGORY_HISTORY}>选择历史</MenuItem>
            <MenuItem value={CATEGORY_ALL}>全部分类</MenuItem>
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
            {categoryId === CATEGORY_HISTORY ? '暂无选择历史' : '没有可用商品'}
          </Typography>
        ) : (
          <Grid container spacing={1.5}>
            {items.map((item) => {
              const imageUrl = productImageById.get(item.productId);
              return (
                <Grid key={item.productId} size={gridSize}>
                  <Card variant="outlined">
                    <CardActionArea
                      onClick={() => pick(item.productId)}
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
