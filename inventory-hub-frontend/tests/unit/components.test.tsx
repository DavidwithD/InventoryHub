import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import CategoryDialog from '@/app/categories/components/CategoryDialog';
import OrdersTable from '@/app/orders/components/OrdersTable';
import OrdersCardList from '@/app/orders/components/OrdersCardList';
import OrdersListToolbar from '@/app/orders/components/OrdersListToolbar';
import ViewModeToggle from '@/components/ViewModeToggle';
import type { Order } from '@/types';
import { DEFAULT_ORDER_SORT, sortOrders } from '@/app/orders/utils/sortOrders';

describe('CategoryDialog', () => {
  it('saves the trimmed name and closes', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<CategoryDialog open onClose={onClose} onSave={onSave} />);

    await userEvent.type(screen.getByLabelText('分类名称'), '  Cards  ');
    await userEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(onSave).toHaveBeenCalledWith({ name: 'Cards' });
    expect(onClose).toHaveBeenCalled();
  });

  it('warns and does not save an empty name', async () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const onSave = vi.fn();
    render(<CategoryDialog open onClose={vi.fn()} onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(alert).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('shows the edit title and current name for an existing category', () => {
    const category = { id: 1, name: 'Figures', createdAt: '', updatedAt: '', isDeleted: false };
    render(<CategoryDialog open onClose={vi.fn()} onSave={vi.fn()} initialCategory={category} />);

    expect(screen.getByText('编辑分类')).toBeInTheDocument();
    expect(screen.getByLabelText('分类名称')).toHaveValue('Figures');
  });
});

describe('OrdersTable', () => {
  const order = (overrides: Partial<Order>): Order => ({
    id: 1,
    orderNo: 'm1',
    name: 'Card',
    revenue: 1000,
    totalCost: 350,
    shippingFee: 200,
    transactionTime: '2026-02-01T00:00:00',
    hasDetails: true,
    hasUnknownCost: false,
    createdAt: '',
    updatedAt: '',
    isDeleted: false,
    ...overrides,
  });

  const sortProps = { sort: DEFAULT_ORDER_SORT, onSortChange: vi.fn() };

  const rowFor = (orderNo: string) => screen.getByText(orderNo).closest('tr')!;

  it('shows cost and profit for a fully matched order', () => {
    render(
      <OrdersTable
        orders={[order({})]}
        {...sortProps}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onViewDetails={vi.fn()}
      />
    );

    const row = within(rowFor('m1'));
    expect(row.getByText('350.00')).toBeInTheDocument();
    expect(row.getByText('650.00')).toBeInTheDocument();
    expect(row.getByText('查看')).toBeInTheDocument();
  });

  it('shows unknown cost and profit when units are unmatched', () => {
    render(
      <OrdersTable
        orders={[order({ hasUnknownCost: true, hasDetails: false })]}
        {...sortProps}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onViewDetails={vi.fn()}
      />
    );

    const row = within(rowFor('m1'));
    expect(row.getAllByText('未知')).toHaveLength(2);
    expect(row.getByText('添加')).toBeInTheDocument();
  });

  it('opens the details of the clicked order', async () => {
    const onViewDetails = vi.fn();
    render(
      <OrdersTable
        orders={[order({ id: 42 })]}
        {...sortProps}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onViewDetails={onViewDetails}
      />
    );

    await userEvent.click(screen.getByText('查看'));

    expect(onViewDetails).toHaveBeenCalledWith(42);
  });
});

describe('OrdersCardList', () => {
  const order = (overrides: Partial<Order>): Order => ({
    id: 1,
    orderNo: 'm1',
    name: 'Card',
    revenue: 1000,
    totalCost: 350,
    shippingFee: 200,
    transactionTime: '2026-02-01T00:00:00',
    hasDetails: true,
    hasUnknownCost: false,
    createdAt: '',
    updatedAt: '',
    isDeleted: false,
    ...overrides,
  });

  it('shows the same numbers as the table and opens details', async () => {
    const onViewDetails = vi.fn();
    render(
      <OrdersCardList
        orders={[order({ id: 7 })]}
        sort={DEFAULT_ORDER_SORT}
        onViewDetails={onViewDetails}
      />
    );

    const card = within(screen.getByTestId('order-card'));
    expect(card.getByText('350.00')).toBeInTheDocument();
    expect(card.getByText('650.00')).toBeInTheDocument();
    await userEvent.click(card.getByRole('button', { name: '查看' }));
    expect(onViewDetails).toHaveBeenCalledWith(7);
  });
});

describe('OrdersListToolbar', () => {
  const props = {
    count: 3,
    sort: DEFAULT_ORDER_SORT,
    onSortChange: vi.fn(),
    onViewModeChange: vi.fn(),
  };

  it('shows the count and the toggle, but no sort controls, in table view', () => {
    render(<OrdersListToolbar {...props} viewMode="table" />);

    expect(screen.getByText('共 3 条订单')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '切换到卡片视图' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '切换排序方向' })).not.toBeInTheDocument();
  });

  it('flips the sort direction in card view', async () => {
    const onSortChange = vi.fn();
    render(<OrdersListToolbar {...props} onSortChange={onSortChange} viewMode="card" />);

    await userEvent.click(screen.getByRole('button', { name: '切换排序方向' }));
    expect(onSortChange).toHaveBeenCalledWith({ field: 'transactionTime', direction: 'asc' });
  });
});

describe('sortOrders', () => {
  it('sorts by profit descending', () => {
    const base = {
      orderNo: '',
      name: '',
      shippingFee: 0,
      transactionTime: '',
      hasDetails: true,
      hasUnknownCost: false,
      createdAt: '',
      updatedAt: '',
      isDeleted: false,
    };
    const orders = [
      { ...base, id: 1, revenue: 100, totalCost: 90 },
      { ...base, id: 2, revenue: 100, totalCost: 10 },
    ];
    expect(sortOrders(orders, { field: 'profit', direction: 'desc' }).map((o) => o.id)).toEqual([
      2, 1,
    ]);
  });
});

describe('ViewModeToggle', () => {
  it('switches from table to card', async () => {
    const onChange = vi.fn();
    render(<ViewModeToggle mode="table" onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: '切换到卡片视图' }));
    expect(onChange).toHaveBeenCalledWith('card');
  });
});
