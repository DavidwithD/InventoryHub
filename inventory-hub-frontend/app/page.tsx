'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Alert,
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  ShoppingCart,
  LocalShipping,
  Category,
  Business,
  TrendingUp,
  Warning,
} from '@mui/icons-material';
import api from '@/lib/api';

interface DashboardStats {
  totalInventoryValue: number;
  monthlyProfit: number;
  totalOrders: number;
  ordersWithoutCost: number;
  currentMonth: string;
  lowStockProductsCount: number;
  monthlyOrders: number;
}

export default function Home() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get<DashboardStats>('/dashboard/stats');
      setStats(response.data);
    } catch (err) {
      setError('加载统计数据失败');
    }
  };

  const navigationCards = [
    { title: '订单管理', icon: ShoppingCart, path: '/orders', color: 'primary.main' },
    { title: '库存管理', icon: InventoryIcon, path: '/inventory', color: 'secondary.main' },
    { title: '进货管理', icon: LocalShipping, path: '/purchases', color: 'info.main' },
    { title: '商品管理', icon: InventoryIcon, path: '/products', color: 'warning.main' },
    { title: '分类管理', icon: Category, path: '/categories', color: 'primary.main' },
    { title: '供应商管理', icon: Business, path: '/suppliers', color: 'success.main' },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          库存管理系统
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          InventoryHub - 商品库存、进货、订单综合管理
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* 统计卡片 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, bgcolor: '#e3f2fd', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <InventoryIcon sx={{ fontSize: 40, color: '#1976d2', mr: 2 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  总库存价值
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  ¥ {stats?.totalInventoryValue.toLocaleString() || '0'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, bgcolor: '#e8f5e9', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TrendingUp sx={{ fontSize: 40, color: '#2e7d32', mr: 2 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  {stats?.currentMonth || '本月'}利润
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  ¥ {stats?.monthlyProfit.toLocaleString() || '0'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, bgcolor: '#fff3e0', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <ShoppingCart sx={{ fontSize: 40, color: '#ed6c02', mr: 2 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  订单总数 / 本月
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {stats?.totalOrders || 0} / {stats?.monthlyOrders || 0}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Paper sx={{ p: 3, bgcolor: '#ffebee', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Warning sx={{ fontSize: 40, color: '#d32f2f', mr: 2 }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  待补成本 / 低库存
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {stats?.ordersWithoutCost || 0} / {stats?.lowStockProductsCount || 0}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* 导航卡片 */}
      <Typography variant="h5" gutterBottom sx={{ mb: 3, fontWeight: 'bold' }}>
        快速导航
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {navigationCards.map((card) => {
          const IconComponent = card.icon;
          return (
            <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} key={card.path}>
              <Card>
                <CardActionArea onClick={() => router.push(card.path)}>
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <IconComponent sx={{ fontSize: 48, color: card.color, mb: 1 }} />
                    <Typography variant="h6">
                      {card.title}
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* 提示信息 */}
      {stats && stats.ordersWithoutCost > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          您有 {stats.ordersWithoutCost} 个订单尚未补充成本信息，请及时添加订单详细。
        </Alert>
      )}

      {stats && stats.lowStockProductsCount > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          有 {stats.lowStockProductsCount} 个商品库存不足（&lt; 5），请注意补货。
        </Alert>
      )}
    </Container>
  );
}

