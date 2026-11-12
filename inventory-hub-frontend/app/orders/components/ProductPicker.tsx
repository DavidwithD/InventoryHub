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
  type Theme,
} from '@mui/material';
import Image from 'next/image';
import api from '@/lib/api';
import { Category, Inventory, Product } from '@/types';
import { usePickHistoryStore } from '@/lib/stores/pickHistoryStore';

// Sentinel category values. Real category ids are positive.
const CATEGORY_HISTORY = -1; // 选择历史 — only previously picked products
const CATEGORY_ALL = 0; // 全部分类 — every product

interface ProductPickerProps {
  inventories: Inventory[];
  categories: Category[];
  excludeProductIds?: number[];
  onPick: (productId: number) => void;
}

const CARD_IMAGE_HEIGHT = 96;

/**
 * Sticky position just under the fixed app bar.
 * The app bar height changes with screen size, so the offset copies theme.mixins.toolbar.
 */
function stickyBelowAppBar(theme: Theme) {
  return {
    position: 'sticky',
    ...toolbarHeightAsTop(theme.mixins.toolbar as Record<string, unknown>),
  };
}

/**
 * Copies each minHeight of the toolbar mixin to `top`.
 * Media queries can be nested. The default mixin nests a landscape rule in the xs query.
 */
export function toolbarHeightAsTop(mixin: Record<string, unknown>): Record<string, unknown> {
  const style: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(mixin)) {
    if (key === 'minHeight') style.top = value;
    else if (key.startsWith('@media') && value && typeof value === 'object') {
      style[key] = toolbarHeightAsTop(value as Record<string, unknown>);
    }
  }
  return style;
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
  }, [inventories, excludeProductIds, search, categoryId, history]);

  const pick = (productId: number) => {
    addToHistory(productId);
    onPick(productId);
  };

  const handleCategoryChange = (e: SelectChangeEvent<number>) => {
    setCategoryId(Number(e.target.value));
  };

  return (
    <Box>
      {/* The filter bar stays under the app bar while the page scrolls through the grid. */}
      <Box
        sx={(theme) => ({
          ...stickyBelowAppBar(theme),
          zIndex: 2,
          // Same color as the page background in AppLayout, so the grid does not show through.
          bgcolor: 'grey.100',
          // The top padding leaves room for the select's floating label.
          pt: 1.5,
          pb: 1,
          mb: 1,
          display: 'flex',
          gap: 2,
          flexWrap: 'wrap',
        })}
      >
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

      <Box>
        {items.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            {categoryId === CATEGORY_HISTORY ? '暂无选择历史' : '没有可用商品'}
          </Typography>
        ) : (
          <Grid container spacing={1.5}>
            {items.map((item) => {
              const imageUrl = productImageById.get(item.productId);
              return (
                <Grid key={item.productId} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                  <Card variant="outlined">
                    <CardActionArea
                      onClick={() => pick(item.productId)}
                      sx={{ p: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
                    >
                      <Box
                        sx={{
                          width: '100%',
                          height: CARD_IMAGE_HEIGHT,
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
