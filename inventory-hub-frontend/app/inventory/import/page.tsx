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

export default function InventoryImportPage() {
  const { suppliers, loading: supplierLoading, loadSuppliers } = useSuppliers();

  const [supplierId, setSupplierId] = useState('');
  const STORAGE_KEY = 'pinduoduo_fetch_command';
  const [fetchCommand, setFetchCommand] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) ?? '';
    }
    return '';
  });
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
  const [registeredPurchaseNos, setRegisteredPurchaseNos] = useState<Set<string>>(new Set());
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
    const priceJpy = exchangeRate > 0 ? Math.round(payload.priceCny * exchangeRate) : 0;
    await createInventory({
      productId: payload.productId,
      purchaseQuantity: payload.purchaseQuantity,
      stockQuantity: payload.purchaseQuantity,
      priceJpy,
      priceCny: payload.priceCny,
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
      setRegisteredPurchaseNos((prev) => new Set(prev).add(payload.purchaseNo));
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
        const nos = new Set((data ?? []).map((inv) => inv.purchaseNo ?? '').filter(Boolean));
        setRegisteredPurchaseNos(nos);
      })
      .catch(() => {
        // non-critical, ignore
      });
    fetchExchangeRate()
      .then((rate) => setExchangeRate(rate))
      .catch(() => setError('获取汇率失败'));
  }, [loadSuppliers, loadCategories, loadProducts, loadAllInventories]);

  const selectedSupplier = useMemo(
    () => suppliers.find((s) => String(s.id) === supplierId)?.name ?? '',
    [supplierId, suppliers]
  );

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

    setLoading(true);
    setError('');
    setInfo('正在获取并解析数据...');

    try {
      const { rows: extracted, nextOffset: offset } = await fetchPinduoduoOrders(fetchCommand);
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
    const nextCommand = buildNextFetchCommand(fetchCommand, nextOffset);
    setLoading(true);
    setError('');
    setInfo('正在获取下一批数据...');
    try {
      const { rows: extracted, nextOffset: offset } = await fetchPinduoduoOrders(nextCommand);
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

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" sx={{ mb: 1, fontWeight: 600 }}>
          采购导入预览
        </Typography>
        <Typography variant="body2" color="text.secondary">
          选择供应商并粘贴拼多多 fetch 命令，以获取并提取库存字段。
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

          <TextField
            label="fetch 命令"
            multiline
            minRows={1}
            maxRows={5}
            value={fetchCommand}
            onChange={(e) => {
              setFetchCommand(e.target.value);
              localStorage.setItem(STORAGE_KEY, e.target.value);
            }}
            placeholder="粘贴从浏览器开发者工具复制的完整 fetch 命令"
            disabled={loading}
            fullWidth
          />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleParseFetch}
              disabled={loading || supplierLoading}
            >
              {'解析并预览'}
            </Button>
            {loading && <CircularProgress size={22} />}
          </Box>
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
          registeredPurchaseNos={registeredPurchaseNos}
          loading={loading}
          hasMore={!!nextOffset}
          onProductSelected={handleProductSelected}
          onProductCreated={handleProductCreated}
          onRegister={handleRegister}
          onLoadMore={handleNextPage}
        />
      </Paper>
    </Stack>
  );
}
