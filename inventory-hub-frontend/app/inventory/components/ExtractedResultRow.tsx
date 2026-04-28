'use client';

import { useEffect, useState } from 'react';
import {
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
} from '@mui/material';
import { Category, PreviewRow, Product } from '@/types';

export interface RegisterInventoryPayload {
  productId: number;
  priceCny: number;
  purchaseQuantity: number;
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
  onProductSelected: (productName: string, productId: number) => void;
  onProductCreated: (data: { categoryId: number; name: string }) => Promise<Product>;
  onRegister: (payload: RegisterInventoryPayload) => Promise<void>;
}

export default function ExtractedResultRow({
  row,
  categories,
  products,
  selectedProductId,
  registeredItems,
  onProductSelected,
  onProductCreated,
  onRegister,
}: Props) {
  const [categoryFilter, setCategoryFilter] = useState<number | ''>('');
  const [registering, setRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newProductName, setNewProductName] = useState(row.productName);
  const [newProductCategoryId, setNewProductCategoryId] = useState<number>(0);
  const [creating, setCreating] = useState(false);

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

  const handleProductChange = (_: unknown, value: Product | null) => {
    if (value) {
      onProductSelected(row.productName, value.id);
    }
  };

  const handleRegister = async () => {
    if (!selectedProductId) return;
    setRegistering(true);
    try {
      await onRegister({
        productId: selectedProductId,
        priceCny: row.purchasePriceCny,
        purchaseQuantity: row.purchaseAmount,
        purchaseNo: row.purchaseNo,
        purchaseDate: row.purchaseDate,
        thumbUrl: row.thumbUrl || undefined,
      });
      setRegistered(true);
    } finally {
      setRegistering(false);
    }
  };

  const handleOpenCreateDialog = () => {
    setNewProductName(row.productName);
    setNewProductCategoryId(0);
    setCreateDialogOpen(true);
  };

  const handleCreate = async () => {
    if (!newProductName.trim() || !newProductCategoryId) return;
    setCreating(true);
    try {
      const created = await onProductCreated({
        categoryId: newProductCategoryId,
        name: newProductName.trim(),
      });
      onProductSelected(row.productName, created.id);
      setCreateDialogOpen(false);
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <TableRow sx={{ verticalAlign: 'top' }}>
        <TableCell sx={{ p: 1 }}>
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
        </TableCell>
        <TableCell>{row.purchaseNo}</TableCell>
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
          </Stack>
        </TableCell>
        <TableCell>
          <Button
            size="small"
            variant={isRegistered ? 'outlined' : 'contained'}
            color={isRegistered ? 'success' : 'primary'}
            disabled={!selectedProductId || registering || isRegistered}
            onClick={handleRegister}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {isRegistered ? '完成' : '登录'}
          </Button>
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
