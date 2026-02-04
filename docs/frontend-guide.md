# Frontend Guide

This document describes the frontend architecture, components, and development patterns used in InventoryHub.

## Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.1 | React framework with App Router |
| React | 19.2.3 | UI library |
| TypeScript | 5.x | Type safety |
| Material-UI | 7.3.6 | Component library |
| Tailwind CSS | 4.x | Utility-first CSS |
| Zustand | 5.0.9 | State management |
| React Hook Form | 7.69.0 | Form handling |
| Zod | 4.3.4 | Schema validation |
| Axios | 1.13.2 | HTTP client |
| Recharts | 3.6.0 | Charts and graphs |
| XLSX | 0.18.5 | Excel export |

## Project Structure

```
inventory-hub-frontend/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout with navigation
│   ├── page.tsx                  # Dashboard (home page)
│   ├── orders/
│   │   ├── page.tsx              # Order list
│   │   └── [orderId]/
│   │       └── edit/
│   │           └── page.tsx      # Order detail editor
│   ├── inventory/
│   │   └── page.tsx              # Inventory management
│   ├── purchases/
│   │   └── page.tsx              # Purchase management
│   ├── products/
│   │   └── page.tsx              # Product management
│   ├── categories/
│   │   └── page.tsx              # Category management
│   └── suppliers/
│       └── page.tsx              # Supplier management
│
├── components/                   # Reusable components
│   ├── Navbar.tsx                # Top navigation bar
│   ├── Sidebar.tsx               # Side navigation drawer
│   ├── DataTable.tsx             # Generic data table wrapper
│   ├── ImportDialog.tsx          # Mercari import dialog
│   ├── OrderDetailRows.tsx       # Multi-row order detail editor
│   ├── OrderFiltersDialog.tsx    # Date range filter dialog
│   └── ProductSelect.tsx         # Category → Product dropdown
│
├── lib/                          # Utilities and helpers
│   ├── api.ts                    # Axios instance configuration
│   ├── theme.ts                  # MUI theme customization
│   ├── exchangeRate.ts           # Exchange rate utilities
│   └── hooks/                    # Custom React hooks
│       ├── useOrders.ts
│       ├── useInventory.ts
│       ├── usePurchases.ts
│       ├── useProducts.ts
│       ├── useCategories.ts
│       └── useSuppliers.ts
│
├── types/                        # TypeScript interfaces
│   ├── order.ts
│   ├── inventory.ts
│   ├── purchase.ts
│   ├── product.ts
│   ├── category.ts
│   └── supplier.ts
│
├── public/                       # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

## Page Structure

### Dashboard (`/`)

The home page displays key statistics and navigation:

```tsx
// app/page.tsx
export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>();

  useEffect(() => {
    fetchDashboardStats().then(setStats);
  }, []);

  return (
    <Grid container spacing={3}>
      {/* Statistics Cards */}
      <StatCard title="Total Inventory Value" value={stats?.totalInventoryValue} />
      <StatCard title="Monthly Profit" value={stats?.monthlyProfit} />
      <StatCard title="Orders Without Cost" value={stats?.ordersWithoutCostCount} />

      {/* Navigation Cards */}
      <NavigationCard href="/orders" title="Orders" />
      <NavigationCard href="/inventory" title="Inventory" />
      {/* ... */}
    </Grid>
  );
}
```

### Order List (`/orders`)

Features:
- DataGrid with sorting and filtering
- Date range filter
- Search by order number
- Batch import from Mercari
- Export to Excel/CSV

```tsx
// Key features
const columns = [
  { field: 'orderNo', headerName: 'Order No' },
  { field: 'revenue', headerName: 'Revenue', type: 'number' },
  { field: 'totalCost', headerName: 'Cost', type: 'number' },
  {
    field: 'profit',
    headerName: 'Profit',
    valueGetter: (params) => params.row.revenue - params.row.totalCost
  },
  { field: 'transactionTime', headerName: 'Date', type: 'dateTime' }
];
```

### Order Detail Editor (`/orders/[orderId]/edit`)

Multi-row editor for order details:

```tsx
// app/orders/[orderId]/edit/page.tsx
export default function OrderEditPage({ params }) {
  const { orderId } = params;
  const [order, setOrder] = useState<Order>();
  const [details, setDetails] = useState<OrderDetail[]>([]);

  return (
    <Box>
      {/* Order Info Card (read-only) */}
      <OrderInfoCard order={order} />

      {/* Editable Details Table */}
      <OrderDetailRows
        details={details}
        onAdd={handleAddRow}
        onUpdate={handleUpdateRow}
        onDelete={handleDeleteRow}
        onSave={handleSave}
      />
    </Box>
  );
}
```

## Components

### Navbar

Responsive top navigation bar:

```tsx
// components/Navbar.tsx
export function Navbar() {
  return (
    <AppBar position="fixed">
      <Toolbar>
        <IconButton onClick={toggleDrawer}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h6">InventoryHub</Typography>
      </Toolbar>
    </AppBar>
  );
}
```

### Sidebar

Navigation drawer with menu items:

```tsx
// components/Sidebar.tsx
const menuItems = [
  { text: 'Dashboard', href: '/', icon: <DashboardIcon /> },
  { text: 'Orders', href: '/orders', icon: <OrderIcon /> },
  { text: 'Inventory', href: '/inventory', icon: <InventoryIcon /> },
  { text: 'Purchases', href: '/purchases', icon: <PurchaseIcon /> },
  { text: 'Products', href: '/products', icon: <ProductIcon /> },
  { text: 'Categories', href: '/categories', icon: <CategoryIcon /> },
  { text: 'Suppliers', href: '/suppliers', icon: <SupplierIcon /> },
];
```

### ProductSelect

Hierarchical dropdown (Category → Product):

```tsx
// components/ProductSelect.tsx
export function ProductSelect({ value, onChange, categoryId }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(categoryId);

  // Filter products by selected category
  const filteredProducts = products.filter(p => p.categoryId === selectedCategory);

  return (
    <Box sx={{ display: 'flex', gap: 2 }}>
      <FormControl>
        <InputLabel>Category</InputLabel>
        <Select value={selectedCategory} onChange={handleCategoryChange}>
          {categories.map(cat => (
            <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl>
        <InputLabel>Product</InputLabel>
        <Select value={value} onChange={onChange}>
          {filteredProducts.map(prod => (
            <MenuItem key={prod.id} value={prod.id}>{prod.name}</MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
}
```

### ImportDialog

Mercari cURL import dialog:

```tsx
// components/ImportDialog.tsx
export function ImportDialog({ open, onClose, onImport }) {
  const [curlCommand, setCurlCommand] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult>();

  const handleImport = async () => {
    setImporting(true);
    try {
      const result = await importFromMercari(curlCommand);
      setResult(result);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Import from Mercari</DialogTitle>
      <DialogContent>
        <TextField
          multiline
          rows={6}
          fullWidth
          placeholder="Paste cURL command here..."
          value={curlCommand}
          onChange={(e) => setCurlCommand(e.target.value)}
        />
        {result && (
          <Alert severity="success">
            Imported {result.success} of {result.total} orders
            (Skipped: {result.skipped})
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleImport} disabled={importing}>
          {importing ? <CircularProgress size={20} /> : 'Import'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

## State Management

### Zustand Store

Global state management with Zustand:

```typescript
// lib/store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // Filter preferences
  orderFilters: {
    startDate: Date | null;
    endDate: Date | null;
  };
  setOrderFilters: (filters: Partial<AppState['orderFilters']>) => void;

  // UI state
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      orderFilters: { startDate: null, endDate: null },
      setOrderFilters: (filters) =>
        set((state) => ({
          orderFilters: { ...state.orderFilters, ...filters }
        })),

      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
    }),
    { name: 'inventory-hub-storage' }
  )
);
```

### Custom Hooks

Data fetching hooks:

```typescript
// lib/hooks/useOrders.ts
export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async (filters?: OrderFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/orders', { params: filters });
      setOrders(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createOrder = useCallback(async (order: CreateOrderDto) => {
    const response = await api.post('/orders', order);
    setOrders((prev) => [...prev, response.data]);
    return response.data;
  }, []);

  const updateOrder = useCallback(async (id: number, order: UpdateOrderDto) => {
    const response = await api.put(`/orders/${id}`, order);
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? response.data : o))
    );
    return response.data;
  }, []);

  const deleteOrder = useCallback(async (id: number) => {
    await api.delete(`/orders/${id}`);
    setOrders((prev) => prev.filter((o) => o.id !== id));
  }, []);

  return {
    orders,
    loading,
    error,
    fetchOrders,
    createOrder,
    updateOrder,
    deleteOrder,
  };
}
```

## Form Handling

### React Hook Form with Zod

```typescript
// Example: Order form validation
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const orderSchema = z.object({
  orderNo: z.string().min(1, 'Order number is required'),
  revenue: z.number().positive('Revenue must be positive'),
  shippingFee: z.number().min(0, 'Shipping fee cannot be negative').optional(),
  transactionTime: z.date(),
  details: z.array(
    z.object({
      inventoryId: z.number().positive('Select an inventory item'),
      quantity: z.number().int().positive('Quantity must be at least 1'),
      packagingCost: z.number().min(0).optional(),
    })
  ).min(1, 'At least one detail is required'),
});

type OrderFormData = z.infer<typeof orderSchema>;

export function OrderForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
  });

  const onSubmit = (data: OrderFormData) => {
    // Submit to API
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <TextField
        {...register('orderNo')}
        error={!!errors.orderNo}
        helperText={errors.orderNo?.message}
      />
      {/* More fields... */}
    </form>
  );
}
```

## API Integration

### Axios Configuration

```typescript
// lib/api.ts
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5022/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
```

## Styling

### MUI Theme

```typescript
// lib/theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});
```

### Tailwind CSS

Used alongside MUI for utility classes:

```tsx
<Box className="flex items-center gap-4 p-4">
  <Typography className="text-lg font-semibold">
    Title
  </Typography>
</Box>
```

## Responsive Design

### Mobile-First Approach

```tsx
// Responsive grid
<Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
  <Grid item xs={12} sm={6} md={4}>
    <Card>...</Card>
  </Grid>
</Grid>

// Responsive drawer
<Drawer
  variant={isMobile ? 'temporary' : 'permanent'}
  open={isMobile ? drawerOpen : true}
  onClose={() => setDrawerOpen(false)}
>
  <Sidebar />
</Drawer>
```

### Breakpoint Hook

```typescript
import { useMediaQuery, useTheme } from '@mui/material';

export function useIsMobile() {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.down('md'));
}
```

## Data Export

### Excel Export

```typescript
// lib/export.ts
import * as XLSX from 'xlsx';

export function exportToExcel(data: any[], filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

// Usage
const exportOrders = () => {
  const exportData = orders.map(order => ({
    'Order No': order.orderNo,
    'Revenue': order.revenue,
    'Cost': order.totalCost,
    'Profit': order.revenue - order.totalCost,
    'Date': new Date(order.transactionTime).toLocaleDateString(),
  }));
  exportToExcel(exportData, 'orders');
};
```

## TypeScript Interfaces

```typescript
// types/order.ts
export interface Order {
  id: number;
  orderNo: string;
  name: string | null;
  imageUrl: string | null;
  revenue: number;
  totalCost: number | null;
  shippingFee: number | null;
  transactionTime: string;
}

export interface OrderDetail {
  id: number;
  orderId: number;
  inventoryId: number;
  productId: number;
  productName: string;
  categoryName: string;
  unitPrice: number;
  quantity: number;
  packagingCost: number;
  otherCost: number;
  subtotalCost: number;
  notes: string | null;
  availableStock: number;
}

export interface CreateOrderDto {
  orderNo: string;
  name?: string;
  imageUrl?: string;
  revenue: number;
  shippingFee?: number;
  transactionTime: string;
  details: CreateOrderDetailDto[];
}

export interface CreateOrderDetailDto {
  inventoryId: number;
  productId: number;
  quantity: number;
  packagingCost?: number;
  otherCost?: number;
  notes?: string;
}
```

## Best Practices

1. **Component Organization**: Keep components small and focused
2. **Type Safety**: Use TypeScript interfaces for all data structures
3. **Error Handling**: Display user-friendly error messages
4. **Loading States**: Show loading indicators during API calls
5. **Form Validation**: Validate on client side before submission
6. **Responsive Design**: Test on multiple screen sizes
7. **Accessibility**: Use semantic HTML and ARIA attributes
