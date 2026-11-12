import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrderSummaryCard from '@/app/orders/components/OrderSummaryCard';
import OrderDetailLinesTable from '@/app/orders/components/OrderDetailLinesTable';
import OrderDetailAddPanel from '@/app/orders/components/OrderDetailAddPanel';
import { usePickHistoryStore } from '@/lib/stores/pickHistoryStore';
import type { Inventory, Order, OrderDetail } from '@/types';

// ProductPicker loads product images. The tests do not need them.
vi.mock('@/lib/api', () => ({ default: { get: vi.fn().mockResolvedValue({ data: [] }) } }));

const base = { createdAt: '', updatedAt: '', isDeleted: false };

const order = (overrides: Partial<Order> = {}): Order => ({
  ...base,
  id: 1,
  orderNo: 'm1',
  name: 'Card',
  revenue: 1000,
  totalCost: 350,
  shippingFee: 200,
  transactionTime: '2026-02-01T00:00:00',
  hasDetails: true,
  hasUnknownCost: false,
  ...overrides,
});

const detail = (overrides: Partial<OrderDetail> = {}): OrderDetail => ({
  ...base,
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
  ...overrides,
});

const batch = (productId: number, productName: string, stockQuantity: number): Inventory => ({
  ...base,
  id: productId * 100,
  productId,
  productName,
  purchaseQuantity: stockQuantity,
  initialStock: stockQuantity,
  stockQuantity,
  priceJpy: 100,
});

describe('OrderSummaryCard', () => {
  it('shows revenue, shipping, cost and profit', () => {
    render(<OrderSummaryCard order={order()} />);

    expect(screen.getByText('1000.00')).toBeInTheDocument();
    expect(screen.getByText('200.00')).toBeInTheDocument();
    expect(screen.getByText('350.00')).toBeInTheDocument();
    expect(screen.getByText('650.00')).toBeInTheDocument();
  });

  it('shows unknown cost and profit when units are unmatched', () => {
    render(<OrderSummaryCard order={order({ hasUnknownCost: true })} />);

    expect(screen.getAllByText('未知')).toHaveLength(2);
    expect(screen.getByText('成本未知')).toBeInTheDocument();
  });
});

describe('OrderDetailLinesTable', () => {
  const renderTable = (onQuantityChange = vi.fn().mockResolvedValue(true)) => {
    render(
      <OrderDetailLinesTable
        details={[detail()]}
        busy={false}
        onQuantityChange={onQuantityChange}
        onDelete={vi.fn()}
      />
    );
    return { input: screen.getByLabelText('Pikachu 数量'), onQuantityChange };
  };

  it('saves a new quantity on Enter', async () => {
    const { input, onQuantityChange } = renderTable();

    await userEvent.clear(input);
    await userEvent.type(input, '3{Enter}');

    expect(onQuantityChange).toHaveBeenCalledWith(expect.objectContaining({ id: 10 }), 3);
  });

  it('does not save a quantity of 0 and shows the saved one again', async () => {
    const { input, onQuantityChange } = renderTable();

    await userEvent.clear(input);
    await userEvent.type(input, '0');
    await userEvent.tab();

    expect(onQuantityChange).not.toHaveBeenCalled();
    expect(input).toHaveValue(2);
  });

  it('shows the saved quantity again when the save fails', async () => {
    const { input } = renderTable(vi.fn().mockResolvedValue(false));

    await userEvent.clear(input);
    await userEvent.type(input, '5');
    await userEvent.tab();

    expect(input).toHaveValue(2);
  });
});

describe('OrderDetailAddPanel', () => {
  beforeEach(() => {
    // The picker opens on 选择历史. Put both products there so the tests can click them.
    usePickHistoryStore.setState({ history: [1, 2] });
  });

  const inventories = [batch(1, 'Pikachu', 5), batch(2, 'Eevee', 3)];

  it('hides products that already have a line', () => {
    render(
      <OrderDetailAddPanel
        orderId={1}
        inventories={inventories}
        categories={[]}
        existingProductIds={[1]}
        createOrderDetail={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    expect(screen.queryByText('Pikachu')).not.toBeInTheDocument();
    expect(screen.getByText('Eevee')).toBeInTheDocument();
  });

  it('saves one line per picked product, then clears the list', async () => {
    const createOrderDetail = vi.fn().mockResolvedValue({});
    const onSaved = vi.fn();
    render(
      <OrderDetailAddPanel
        orderId={1}
        inventories={inventories}
        categories={[]}
        existingProductIds={[]}
        createOrderDetail={createOrderDetail}
        onSaved={onSaved}
      />
    );

    await userEvent.click(screen.getByText('Pikachu'));
    await userEvent.click(screen.getByText('Eevee'));
    const quantity = screen.getByLabelText('Eevee 新增数量');
    await userEvent.clear(quantity);
    await userEvent.type(quantity, '2');
    await userEvent.click(screen.getByRole('button', { name: '保存 2 个商品' }));

    expect(createOrderDetail).toHaveBeenCalledTimes(2);
    expect(createOrderDetail).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 1, productId: 1, quantity: 1 })
    );
    expect(createOrderDetail).toHaveBeenCalledWith(
      expect.objectContaining({ orderId: 1, productId: 2, quantity: 2 })
    );
    expect(onSaved).toHaveBeenCalled();
    expect(screen.queryByText('已选商品')).not.toBeInTheDocument();
  });

  it('keeps the unsaved rows when a save fails', async () => {
    const createOrderDetail = vi
      .fn()
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce({ response: { data: '库存不足' } });
    const onSaved = vi.fn();
    render(
      <OrderDetailAddPanel
        orderId={1}
        inventories={inventories}
        categories={[]}
        existingProductIds={[]}
        createOrderDetail={createOrderDetail}
        onSaved={onSaved}
      />
    );

    await userEvent.click(screen.getByText('Pikachu'));
    await userEvent.click(screen.getByText('Eevee'));
    await userEvent.click(screen.getByRole('button', { name: '保存 2 个商品' }));

    expect(screen.getByText('库存不足')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存 1 个商品' })).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalled();
  });
});
