import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrderPage from '@/app/orders/[id]/page';
import { usePickHistoryStore } from '@/lib/stores/pickHistoryStore';
import type { Order, OrderDetail } from '@/types';

const getOrder = vi.fn();
// vi.mock runs first, so the mocks read these through closures.
const inventories = [
  {
    createdAt: '',
    updatedAt: '',
    isDeleted: false,
    id: 200,
    productId: 2,
    productName: 'Eevee',
    purchaseQuantity: 3,
    initialStock: 3,
    stockQuantity: 3,
    priceJpy: 100,
  },
];
const getOrderDetails = vi.fn();
// The real hooks return stable functions. The mocks must too, or the page reloads on every render.
const orderActions = {
  createOrderDetail: vi.fn().mockResolvedValue({}),
  updateOrderDetail: vi.fn().mockResolvedValue({}),
  deleteOrderDetail: vi.fn(),
};
const loadAllInventories = () => Promise.resolve();
const loadCategories = () => Promise.resolve();

vi.mock('next/navigation', () => ({ useParams: () => ({ id: '1' }) }));
vi.mock('@/lib/api', () => ({ default: { get: vi.fn().mockResolvedValue({ data: [] }) } }));
vi.mock('@/app/orders/hooks/useOrders', () => ({
  useOrders: () => ({
    getOrder,
    getOrderDetails,
    ...orderActions,
  }),
}));
vi.mock('@/app/inventory/hooks/useInventory', () => ({
  useInventory: () => ({ inventories, loadAllInventories }),
}));
vi.mock('@/app/categories/hooks/useCategories', () => ({
  useCategories: () => ({ categories: [], loadCategories }),
}));

const order: Order = {
  createdAt: '',
  updatedAt: '',
  isDeleted: false,
  id: 1,
  orderNo: 'm1',
  name: 'Card',
  revenue: 1000,
  totalCost: 350,
  shippingFee: 200,
  transactionTime: '2026-02-01T00:00:00',
  hasDetails: false,
  hasUnknownCost: false,
};

const line: OrderDetail = {
  createdAt: '',
  updatedAt: '',
  isDeleted: false,
  id: 10,
  orderId: 1,
  productId: 1,
  productName: 'Pikachu',
  quantity: 2,
  packagingCost: 0,
  otherCost: 0,
  subtotalCost: 300,
  unmatchedQuantity: 0,
  allocations: [],
};

describe('Order page', () => {
  beforeEach(() => {
    getOrder.mockReset();
    getOrderDetails.mockReset().mockResolvedValue([line]);
    // The picker opens on 选择历史. Put Eevee there so the test can click it.
    usePickHistoryStore.setState({ history: [2] });
  });

  it('offers a retry when the first load fails', async () => {
    getOrder.mockRejectedValueOnce(new Error('Network Error')).mockResolvedValueOnce(order);
    render(<OrderPage />);

    expect(await screen.findByText('订单加载失败')).toBeInTheDocument();
    expect(screen.getByText('加载订单失败：Network Error')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '重试' }));

    expect(await screen.findByText('Card')).toBeInTheDocument();
    expect(screen.queryByText('订单加载失败')).not.toBeInTheDocument();
  });

  it('shows not found for a 404', async () => {
    getOrder.mockRejectedValueOnce({ response: { status: 404 } });
    render(<OrderPage />);

    expect(await screen.findByText('订单不存在')).toBeInTheDocument();
  });

  it('ignores an older reload that ends after a newer one', async () => {
    getOrder.mockResolvedValueOnce(order);
    render(<OrderPage />);
    expect(await screen.findByText('Card')).toBeInTheDocument();

    // Reload A: started by a quantity change. Its order response waits.
    let finishOld: (o: Order) => void = () => {};
    getOrder.mockImplementationOnce(() => new Promise<Order>((r) => (finishOld = r)));
    const input = screen.getByLabelText('Pikachu 数量');
    await userEvent.clear(input);
    await userEvent.type(input, '3{Enter}');

    // Reload B: started by the add panel. It ends first.
    getOrder.mockResolvedValueOnce({ ...order, name: 'New' });
    await userEvent.click(screen.getByText('Eevee'));
    await userEvent.click(screen.getByRole('button', { name: '保存 1 个商品' }));
    expect(await screen.findByText('New')).toBeInTheDocument();

    await act(async () => finishOld({ ...order, name: 'Old' }));
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.queryByText('Old')).not.toBeInTheDocument();
  });
});
