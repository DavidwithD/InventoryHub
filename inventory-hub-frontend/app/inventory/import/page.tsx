'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useSuppliers } from '../../suppliers/hooks/useSuppliers';
import { useCategories } from '../../categories/hooks/useCategories';
import { useProducts } from '../../products/hooks/useProducts';
import ExtractedResultTable from '../components/ExtractedResultTable';
import { RegisterInventoryPayload } from '../components/ExtractedResultRow';
import { PreviewRow, Product } from '@/types';
import { useInventory } from '../hooks/useInventory';
import { fetchExchangeRate } from '@/lib/exchangeRate';
import { fetchPinduoduoOrders, buildNextFetchCommand } from './pinduoduoService';
import { fetchTaobaoOrders, buildNextTaobaoFetchCommand, detectPlatform } from './taobaoService';
import FetchCommandGuide, {
  getPlaceholderForPlatform,
  validateFetchCommand,
} from './FetchCommandGuide';

function storageKey(platform: 'pinduoduo' | 'taobao'): string {
  return platform === 'taobao' ? 'taobao_fetch_command' : 'pinduoduo_fetch_command';
}

export default function InventoryImportPage() {
  const { suppliers, loading: supplierLoading, loadSuppliers } = useSuppliers();

  const [supplierId, setSupplierId] = useState('');
  const [fetchCommand, setFetchCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [productMap, setProductMap] = useState<Record<string, number>>({});
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [nextOffset, setNextOffset] = useState<string | null>(null);
  const { categories, loadCategories } = useCategories();
  const { products, loadProducts, createProduct, updateProduct } = useProducts();
  const { create: createInventory, loadAllInventories } = useInventory();
  const [registeredItems, setRegisteredItems] = useState<Set<string>>(new Set());
  const [factorSuggestions, setFactorSuggestions] = useState<Record<number, number>>({});

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => String(s.id) === supplierId)?.name ?? '',
    [supplierId, suppliers]
  );
  const platform = detectPlatform(selectedSupplier);

  const validation = useMemo(
    () => (fetchCommand.trim() ? validateFetchCommand(fetchCommand, platform) : null),
    [fetchCommand, platform],
  );
  const inputError = validation !== null && !validation.ok;

  // Load per-platform saved fetch command when supplier changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setFetchCommand(localStorage.getItem(storageKey(platform)) ?? '');
    }
    setRows([]);
    setNextOffset(null);
  }, [platform]);

  const handleProductSelected = (productName: string, productId: number) => {
    setProductMap((prev) => ({ ...prev, [productName]: productId }));
  };

  const handleProductCreated = async (data: {
    categoryId: number;
    name: string;
  }): Promise<Product> => {
    return createProduct(data);
  };

  const handleRegister = async (payload: RegisterInventoryPayload) => {
    const factor = payload.conversionFactor > 0 ? payload.conversionFactor : 1;
    // priceCny on the row is per purchase unit (set); convert to a per-stock-unit price.
    const unitPriceCny = payload.priceCny / factor;
    const priceJpy = exchangeRate > 0 ? Math.round(unitPriceCny * exchangeRate) : 0;
    await createInventory({
      productId: payload.productId,
      purchaseQuantity: payload.purchaseQuantity,
      stockQuantity: payload.purchaseQuantity * factor,
      priceJpy,
      priceCny: Math.round(unitPriceCny * 100) / 100,
      supplierId: supplierId ? Number(supplierId) : undefined,
      purchaseDate: payload.purchaseDate || undefined,
      purchaseNo: payload.purchaseNo || undefined,
    });
    if (payload.thumbUrl) {
      const product = products.find((p) => p.id === payload.productId);
      if (product && !product.imageUrl) {
        await updateProduct(payload.productId, {
          categoryId: product.categoryId,
          name: product.name,
          imageUrl: payload.thumbUrl,
        });
      }
    }
    if (payload.purchaseNo) {
      const key = `${payload.purchaseNo}-${payload.productId}`;
      setRegisteredItems((prev) => new Set(prev).add(key));
    }
  };

  useEffect(() => {
    loadSuppliers().catch(() => {
      setError('加载供应商失败');
    });
    loadCategories().catch(() => {
      setError('加载分类失败');
    });
    loadProducts().catch(() => {
      setError('加载商品失败');
    });
    loadAllInventories()
      .then((data) => {
        const items = new Set(
          (data ?? [])
            .filter((inv) => inv.purchaseNo && inv.productId)
            .map((inv) => `${inv.purchaseNo}-${inv.productId}`)
        );
        setRegisteredItems(items);

        // #3 Option B: derive a suggested conversion factor per product from its
        // most recent inventory record (stockQuantity / purchaseQuantity).
        const latest: Record<number, { createdAt: string; factor: number }> = {};
        for (const inv of data ?? []) {
          if (!inv.productId || inv.purchaseQuantity <= 0 || inv.stockQuantity <= 0) continue;
          const factor = Math.round((inv.stockQuantity / inv.purchaseQuantity) * 100) / 100;
          const prev = latest[inv.productId];
          if (!prev || inv.createdAt > prev.createdAt) {
            latest[inv.productId] = { createdAt: inv.createdAt, factor };
          }
        }
        const suggestions: Record<number, number> = {};
        for (const [productId, { factor }] of Object.entries(latest)) {
          if (factor > 0 && factor !== 1) suggestions[Number(productId)] = factor;
        }
        setFactorSuggestions(suggestions);
      })
      .catch(() => {
        // non-critical, ignore
      });
    fetchExchangeRate()
      .then((rate) => setExchangeRate(rate))
      .catch(() => setError('获取汇率失败'));
  }, [loadSuppliers, loadCategories, loadProducts, loadAllInventories]);

  const handleSupplierChange = (event: SelectChangeEvent<string>) => {
    setSupplierId(event.target.value);
  };

  const handleParseFetch = async () => {
    if (!supplierId) {
      setError('请先选择供应商');
      return;
    }
    if (!fetchCommand.trim()) {
      setError('请粘贴 fetch 命令');
      return;
    }
    if (validation && !validation.ok) {
      setError(validation.message);
      return;
    }

    setLoading(true);
    setError('');
    setInfo('正在获取并解析数据...');

    try {
      const fetcher = platform === 'taobao' ? fetchTaobaoOrders : fetchPinduoduoOrders;
      const { rows: extracted, nextOffset: offset } = await fetcher(fetchCommand);
      setRows(extracted);
      setNextOffset(offset);
      setInfo('从响应中解析出 ' + extracted.length + ' 条商品记录');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Parse failed';
      setError(msg);
      setInfo('');
      setRows([]);
      setNextOffset(null);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = async () => {
    if (!nextOffset) return;
    const nextCommand =
      platform === 'taobao'
        ? buildNextTaobaoFetchCommand(fetchCommand, nextOffset)
        : buildNextFetchCommand(fetchCommand, nextOffset);
    setLoading(true);
    setError('');
    setInfo('正在获取下一批数据...');
    try {
      const fetcher = platform === 'taobao' ? fetchTaobaoOrders : fetchPinduoduoOrders;
      const { rows: extracted, nextOffset: offset } = await fetcher(nextCommand);
      setRows((prev) => [...prev, ...extracted]);
      setNextOffset(offset);
      setInfo('共加载 ' + (rows.length + extracted.length) + ' 条商品记录');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Parse failed';
      setError(msg);
      setInfo('');
      setNextOffset(null);
    } finally {
      setLoading(false);
    }
  };

  const platformLabel = platform === 'taobao' ? '淘宝' : '拼多多';

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
          采购导入预览
        </Typography>
        <Typography variant="body2" color="text.secondary">
          选择供应商后按下方步骤复制粘贴 fetch 命令，即可解析并提取库存字段。
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          当前汇率：1 CNY ≈ {exchangeRate > 0 ? exchangeRate.toFixed(2) : '加载中...'} JPY
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {info && <Alert severity="info">{info}</Alert>}

      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <FormControl fullWidth>
            <InputLabel id="supplier-select-label">供应商</InputLabel>
            <Select
              labelId="supplier-select-label"
              value={supplierId}
              label="供应商"
              onChange={handleSupplierChange}
              disabled={supplierLoading || loading}
            >
              {suppliers.map((supplier) => (
                <MenuItem key={supplier.id} value={String(supplier.id)}>
                  {supplier.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {supplierId ? (
            <>
              <FetchCommandGuide platform={platform} />

              <TextField
                label={`fetch 命令（${platformLabel}）`}
                multiline
                minRows={1}
                maxRows={5}
                value={fetchCommand}
                onChange={(e) => {
                  setFetchCommand(e.target.value);
                  localStorage.setItem(storageKey(platform), e.target.value);
                }}
                placeholder={getPlaceholderForPlatform(platform)}
                disabled={loading}
                fullWidth
                error={inputError}
                helperText={
                  inputError && validation && !validation.ok ? validation.message : ' '
                }
              />

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={handleParseFetch}
                  disabled={loading || supplierLoading || inputError}
                >
                  {'解析并预览'}
                </Button>
                {loading && <CircularProgress size={22} />}
              </Box>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              请先选择供应商以继续。
            </Typography>
          )}
        </Stack>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          提取结果
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          供应商：{selectedSupplier || '-'}
        </Typography>

        <ExtractedResultTable
          rows={rows}
          categories={categories}
          products={products}
          productMap={productMap}
          registeredItems={registeredItems}
          factorSuggestions={factorSuggestions}
          loading={loading}
          hasMore={platform == 'pinduoduo' && !!nextOffset}
          onProductSelected={handleProductSelected}
          onProductCreated={handleProductCreated}
          onRegister={handleRegister}
          onLoadMore={handleNextPage}
        />
      </Paper>
    </Stack>
  );
}
