'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TableCell,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Category, PreviewRow, Product } from '@/types';
import { formatMoney } from '@/lib/formatMoney';
import { apiErrorMessage } from '@/lib/apiErrorMessage';

export interface RegisterInventoryPayload {
  productId: number;
  priceCny: number;
  purchaseQuantity: number;
  conversionFactor: number;
  purchaseNo: string;
  purchaseDate: string;
  thumbUrl?: string;
}

interface Props {
  row: PreviewRow;
  categories: Category[];
  products: Product[];
  selectedProductId: number | null;
  registeredItems: Set<string>;
  factorSuggestions: Record<number, number>;
  onProductSelected: (productName: string, productId: number) => void;
  onProductCreated: (data: { categoryId: number; name: string }) => Promise<Product>;
  /** Rejects when the batch is not saved. Resolves with a warning when the batch saved but a later step failed. */
  onRegister: (payload: RegisterInventoryPayload) => Promise<string | undefined>;
  /** When set, the 登录 button is disabled and shows this reason. */
  registerBlockedReason?: string;
}

export default function ExtractedResultRow({
  row,
  categories,
  products,
  selectedProductId,
  registeredItems,
  factorSuggestions,
  onProductSelected,
  onProductCreated,
  onRegister,
  registerBlockedReason,
}: Props) {
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProductName, setNewProductName] = useState(row.productName);
  const [newProductCategoryId, setNewProductCategoryId] = useState<number>(0);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  // A message under the 登录 button: an error when the save failed, a warning when only a later step failed.
  // `input` records the product and factor of the attempt. An error hides when either one changes.
  const [registerMessage, setRegisterMessage] = useState<{
    text: string;
    severity: 'error' | 'warning';
    input: string;
  } | null>(null);
  const [factorInput, setFactorInput] = useState('1');
  const [factorTouched, setFactorTouched] = useState(false);

  const hasExactMatch = products.some((p) => p.name === row.productName);

  useEffect(() => {
    if (selectedProductId) return;
    const match = products.find((p) => p.name === row.productName);
    if (match) {
      onProductSelected(row.productName, match.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const filteredProducts = categoryFilter
    ? products.filter((p) => p.categoryId === categoryFilter)
    : products;

  const selectedProduct = selectedProductId
    ? (products.find((p) => p.id === selectedProductId) ?? null)
    : null;

  const alreadyRegistered = selectedProductId
    ? registeredItems.has(`${row.purchaseNo}-${selectedProductId}`)
    : false;

  const isRegistered = registered || alreadyRegistered;

  // #3 Option B: prefill the factor from the product's most recent inventory
  // record (stock/purchase ratio). Only a suggestion — never clobbers a manual edit.
  useEffect(() => {
    if (factorTouched) return;
    const suggested = selectedProductId ? factorSuggestions[selectedProductId] : undefined;
    setFactorInput(suggested && suggested > 0 ? String(suggested) : '1');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId, factorSuggestions]);

  const factor = Number(factorInput);
  const factorValid = Number.isFinite(factor) && factor > 0;
  const previewPieces = factorValid ? row.purchaseAmount * factor : 0;
  const previewUnitCny = factorValid ? row.purchasePriceCny / factor : 0;

  const handleProductChange = (_: unknown, value: Product | null) => {
    if (value) {
      onProductSelected(row.productName, value.id);
    }
  };

  const registerInput = `${selectedProductId}-${factorInput}`;
  // A warning belongs to a saved batch, so it stays. An error shows only for the input that failed.
  const shownRegisterMessage =
    registerMessage &&
    (registerMessage.severity === 'warning' || registerMessage.input === registerInput)
      ? registerMessage
      : null;

  const handleRegister = async () => {
    if (!selectedProductId || !factorValid || registerBlockedReason) return;
    const attemptInput = registerInput;
    setRegistering(true);
    setRegisterMessage(null);
    try {
      const warning = await onRegister({
        productId: selectedProductId,
        priceCny: row.purchasePriceCny,
        purchaseQuantity: row.purchaseAmount,
        conversionFactor: factor,
        purchaseNo: row.purchaseNo,
        purchaseDate: row.purchaseDate,
        thumbUrl: row.thumbUrl || undefined,
      });
      setRegistered(true);
      if (warning) setRegisterMessage({ text: warning, severity: 'warning', input: attemptInput });
    } catch (err) {
      setRegisterMessage({
        text: apiErrorMessage(err, '登记失败'),
        severity: 'error',
        input: attemptInput,
      });
    } finally {
      setRegistering(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setNewProductName(row.productName);
    setNewProductCategoryId(0);
    setCreateError('');
    setCreateDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!newProductName.trim() || !newProductCategoryId) return;
    setCreating(true);
    setCreateError('');
    try {
      const created = await onProductCreated({
        categoryId: newProductCategoryId,
        name: newProductName.trim(),
      });
      onProductSelected(row.productName, created.id);
      setCreateDialogOpen(false);
    } catch (err) {
      // The dialog stays open, so the typed name is kept.
      setCreateError(apiErrorMessage(err, '创建商品失败'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <TableRow sx={{ verticalAlign: 'top' }}>
        <TableCell sx={{ p: 1 }}>
          <Tooltip title={`采购单号：${row.purchaseNo}`} arrow placement="right">
            {row.thumbUrl ? (
              <Box component="a" href={row.thumbUrl} target="_blank" rel="noreferrer">
                <Box
                  component="img"
                  src={row.thumbUrl}
                  alt="thumbnail"
                  sx={{
                    width: 96,
                    height: 96,
                    objectFit: 'cover',
                    borderRadius: 1,
                    display: 'block',
                  }}
                />
              </Box>
            ) : (
              <Box sx={{ width: 96, height: 96, bgcolor: 'grey.100', borderRadius: 1 }} />
            )}
          </Tooltip>
        </TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.purchaseDate.split('T')[0]}</TableCell>
        <TableCell sx={{ maxWidth: 200, wordBreak: 'break-word' }}>{row.productName}</TableCell>
        <TableCell align="right">{row.purchasePriceCny.toFixed(2)}</TableCell>
        <TableCell align="right">{row.purchaseAmount}</TableCell>
        <TableCell sx={{ minWidth: 240 }}>
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <FormControl size="small" sx={{ flexGrow: 1 }}>
                <InputLabel>分类</InputLabel>
                <Select
                  value={categoryFilter}
                  label="分类"
                  onChange={(e) => setCategoryFilter(e.target.value as number | '')}
                >
                  <MenuItem value="">全部</MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                size="small"
                variant="outlined"
                onClick={handleOpenCreateDialog}
                disabled={hasExactMatch}
                sx={{ whiteSpace: 'nowrap' }}
              >
                新商品
              </Button>
            </Box>
            <Autocomplete
              size="small"
              options={filteredProducts}
              getOptionLabel={(o) => o.name}
              value={selectedProduct}
              onChange={handleProductChange}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => <TextField {...params} label="商品" />}
            />
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <TextField
                size="small"
                type="number"
                label="换算倍数(件/组)"
                value={factorInput}
                onChange={(e) => {
                  setFactorTouched(true);
                  setFactorInput(e.target.value);
                }}
                error={!factorValid}
                inputProps={{ min: 0, step: 1, style: { width: 70 } }}
              />
              <Typography
                variant="caption"
                color={factorValid ? 'text.secondary' : 'error'}
                sx={{ mt: 1, lineHeight: 1.3 }}
              >
                {factorValid
                  ? `入库 ${previewPieces} 件 · 单价 ${formatMoney(previewUnitCny, 'CNY')}`
                  : '倍数需大于 0'}
              </Typography>
            </Box>
          </Stack>
        </TableCell>
        <TableCell>
          <Tooltip title={!isRegistered && registerBlockedReason ? registerBlockedReason : ''}>
            {/* The span lets the tooltip show on a disabled button. */}
            <span>
              <Button
                size="small"
                variant={isRegistered ? 'outlined' : 'contained'}
                color={isRegistered ? 'success' : 'primary'}
                disabled={
                  !selectedProductId ||
                  !factorValid ||
                  registering ||
                  isRegistered ||
                  !!registerBlockedReason
                }
                onClick={handleRegister}
                sx={{ whiteSpace: 'nowrap' }}
              >
                {isRegistered ? '完成' : '登录'}
              </Button>
            </span>
          </Tooltip>
          {shownRegisterMessage && (
            <Typography
              variant="caption"
              role="alert"
              color={shownRegisterMessage.severity === 'error' ? 'error' : 'warning.main'}
              sx={{ display: 'block', mt: 1, maxWidth: 160 }}
            >
              {shownRegisterMessage.text}
            </Typography>
          )}
        </TableCell>
      </TableRow>

      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>创建商品</DialogTitle>
        <DialogContent>
          {createError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {createError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                autoFocus
                label="商品名称"
                fullWidth
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>分类</InputLabel>
                <Select
                  value={newProductCategoryId}
                  label="分类"
                  onChange={(e) => setNewProductCategoryId(Number(e.target.value))}
                >
                  <MenuItem value={0} disabled>
                    选择分类
                  </MenuItem>
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !newProductName.trim() || !newProductCategoryId}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
