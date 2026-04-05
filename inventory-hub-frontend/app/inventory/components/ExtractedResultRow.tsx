'use client';

import { useState } from 'react';
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
}

interface Props {
  row: PreviewRow;
  categories: Category[];
  products: Product[];
  selectedProductId: number | null;
  onProductSelected: (productName: string, productId: number) => void;
  onProductCreated: (data: { categoryId: number; name: string }) => Promise<Product>;
  onRegister: (payload: RegisterInventoryPayload) => Promise<void>;
}

export default function ExtractedResultRow({
  row,
  categories,
  products,
  selectedProductId,
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

  const filteredProducts = categoryFilter
    ? products.filter((p) => p.categoryId === categoryFilter)
    : products;

  const selectedProduct = selectedProductId
    ? (products.find((p) => p.id === selectedProductId) ?? null)
    : null;

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
      <TableRow>
        <TableCell>{row.purchaseNo}</TableCell>
        <TableCell>{row.purchaseDate}</TableCell>
        <TableCell>{row.productName}</TableCell>
        <TableCell align="right">{row.purchasePriceCny.toFixed(2)}</TableCell>
        <TableCell align="right">{row.purchaseAmount}</TableCell>
        <TableCell>
          {row.thumbUrl ? (
            <a href={row.thumbUrl} target="_blank" rel="noreferrer">
              View
            </a>
          ) : (
            '-'
          )}
        </TableCell>
        <TableCell sx={{ minWidth: 140 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(e) => setCategoryFilter(e.target.value as number | '')}
            >
              <MenuItem value="">All</MenuItem>
              {categories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </TableCell>
        <TableCell sx={{ minWidth: 220 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Autocomplete
              size="small"
              sx={{ minWidth: 180, flexGrow: 1 }}
              options={filteredProducts}
              getOptionLabel={(o) => o.name}
              value={selectedProduct}
              onChange={handleProductChange}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => <TextField {...params} label="Product" />}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={handleOpenCreateDialog}
              sx={{ whiteSpace: 'nowrap' }}
            >
              New
            </Button>
          </Box>
        </TableCell>
        <TableCell>
          <Button
            size="small"
            variant={registered ? 'outlined' : 'contained'}
            color={registered ? 'success' : 'primary'}
            disabled={!selectedProductId || registering || registered}
            onClick={handleRegister}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {registered ? '完成' : '登录'}
          </Button>
        </TableCell>
      </TableRow>

      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Product</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12 }}>
              <TextField
                autoFocus
                label="Product Name"
                fullWidth
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={newProductCategoryId}
                  label="Category"
                  onChange={(e) => setNewProductCategoryId(Number(e.target.value))}
                >
                  <MenuItem value={0} disabled>
                    Select a category
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
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !newProductName.trim() || !newProductCategoryId}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
