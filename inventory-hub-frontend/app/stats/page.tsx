'use client';

import { useState } from 'react';
import { Box, Container, Tab, Tabs } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import BarChartIcon from '@mui/icons-material/BarChart';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import DashboardTab from './components/DashboardTab';
import InventoryHealthTab from './components/InventoryHealthTab';
import ProductPerformanceTab from './components/ProductPerformanceTab';
import PurchaseSupplyTab from './components/PurchaseSupplyTab';

const TABS = [
  { label: '总览', icon: <DashboardIcon fontSize="small" /> },
  { label: '库存健康', icon: <InventoryIcon fontSize="small" /> },
  { label: '商品表现', icon: <BarChartIcon fontSize="small" /> },
  { label: '采购与供应', icon: <ShoppingBagIcon fontSize="small" /> },
];

export default function StatsPage() {
  const [tab, setTab] = useState(0);

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Sub-tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {TABS.map((t) => (
            <Tab
              key={t.label}
              label={t.label}
              icon={t.icon}
              iconPosition="start"
              sx={{ fontWeight: 600, fontSize: 13, textTransform: 'none', minHeight: 48 }}
            />
          ))}
        </Tabs>
      </Box>

      {tab === 0 && (
        <DashboardTab onNavigateToProduct={() => setTab(2)} />
      )}
      {tab === 1 && <InventoryHealthTab />}
      {tab === 2 && <ProductPerformanceTab />}
      {tab === 3 && <PurchaseSupplyTab />}
    </Container>
  );
}
