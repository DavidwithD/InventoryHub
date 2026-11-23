import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

// The table and the cards open an order with router.push.
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
import CategoryDialog from '@/app/categories/components/CategoryDialog';
import OrdersTable from '@/app/orders/components/OrdersTable';
import OrdersCardList from '@/app/orders/components/OrdersCardList';
import OrdersListToolbar from '@/app/orders/components/OrdersListToolbar';
import ViewModeToggle from '@/components/ViewModeToggle';
import ExtractedResultRow from '@/app/inventory/components/ExtractedResultRow';
import type { Order } from '@/types';
import { DEFAULT_ORDER_SORT, nextOrderSort, sortOrders } from '@/app/orders/utils/sortOrders';
import {
  clearOrdersListScroll,
  isOrdersPath,
  saveOrdersListScroll,
  takeOrdersListScroll,
} from '@/app/orders/utils/listScroll';

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

  it('shows a message under the field and does not save an empty name', async () => {
    const onSave = vi.fn();
    render(<CategoryDialog open onClose={vi.fn()} onSave={onSave} />);

    await userEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(screen.getByText('请输入分类名称')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('stays open and shows the error when the save fails', async () => {
    const onSave = vi.fn().mockRejectedValue({ response: { data: { title: '名称已存在' } } });
    const onClose = vi.fn();
    render(<CategoryDialog open onClose={onClose} onSave={onSave} />);

    await userEvent.type(screen.getByLabelText('分类名称'), 'Cards');
    await userEvent.click(screen.getByRole('button', { name: '保存' }));

    expect(await screen.findByText('名称已存在')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('分类名称')).toHaveValue('Cards');
  });

  it('ignores Escape while the save runs, so the error still shows', async () => {
    let reject: (err: unknown) => void = () => {};
    const onSave = vi.fn(() => new Promise<void>((_, r) => (reject = r)));
    const onClose = vi.fn();
    render(<CategoryDialog open onClose={onClose} onSave={onSave} />);

    await userEvent.type(screen.getByLabelText('分类名称'), 'Cards');
    await userEvent.click(screen.getByRole('button', { name: '保存' }));
    // The disabled 保存 button drops focus, so the key goes straight to the dialog.
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    reject({ response: { data: '名称已存在' } });
    expect(await screen.findByText('名称已存在')).toBeInTheDocument();
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

  it('shows cost and profit in 円 for a fully matched order', () => {
    render(<OrdersTable orders={[order({ revenue: 12000 })]} {...sortProps} />);

    const row = within(rowFor('m1'));
    expect(row.getByText('12,000円')).toBeInTheDocument();
    expect(row.getByText('350円')).toBeInTheDocument();
    expect(row.getByText('11,650円')).toBeInTheDocument();
    expect(row.getByText('查看')).toBeInTheDocument();
  });

  it('shows unknown cost and profit when units are unmatched', () => {
    render(<OrdersTable orders={[order({ hasUnknownCost: true })]} {...sortProps} />);

    const row = within(rowFor('m1'));
    expect(row.getAllByText('未知')).toHaveLength(2);
  });

  it('shows 未输入 and no profit for an order without lines', () => {
    render(<OrdersTable orders={[order({ hasDetails: false, totalCost: 0 })]} {...sortProps} />);

    const row = within(rowFor('m1'));
    expect(row.getByText('未输入')).toBeInTheDocument();
    expect(row.getByText('—')).toBeInTheDocument();
    expect(row.queryByText('1,000円', { selector: 'td' })).toBeInTheDocument();
    expect(row.getByText('添加')).toBeInTheDocument();
  });

  it('links each row to its order page', () => {
    render(<OrdersTable orders={[order({ id: 42 })]} {...sortProps} />);

    expect(screen.getByRole('link', { name: '查看' })).toHaveAttribute('href', '/orders/42');
  });

  it('opens the order on a click anywhere on the row', async () => {
    push.mockClear();
    render(<OrdersTable orders={[order({ id: 42 })]} {...sortProps} />);

    await userEvent.click(screen.getByText('Card'));

    expect(push).toHaveBeenCalledWith('/orders/42');
  });

  it('does not open the order when the click ends a text selection', async () => {
    push.mockClear();
    const getSelection = vi
      .spyOn(window, 'getSelection')
      .mockReturnValue({ toString: () => 'Card' } as Selection);
    render(<OrdersTable orders={[order({ id: 42 })]} {...sortProps} />);

    fireEvent.click(screen.getByText('Card'));

    expect(push).not.toHaveBeenCalled();
    getSelection.mockRestore();
  });

  it('opens the order in a new tab on a Cmd or Ctrl click', () => {
    push.mockClear();
    sessionStorage.clear();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<OrdersTable orders={[order({ id: 42 })]} {...sortProps} />);

    fireEvent.click(screen.getByText('Card'), { metaKey: true });
    fireEvent.click(screen.getByText('Card'), { ctrlKey: true });

    expect(open).toHaveBeenCalledTimes(2);
    expect(open).toHaveBeenCalledWith('/orders/42', '_blank', 'noopener');
    expect(push).not.toHaveBeenCalled();
    expect(takeOrdersListScroll()).toBeNull();
    open.mockRestore();
  });

  it('saves the scroll position when it opens an order', async () => {
    sessionStorage.clear();
    window.scrollY = 1234;
    render(<OrdersTable orders={[order({ id: 42 })]} {...sortProps} />);

    await userEvent.click(screen.getByText('Card'));

    expect(takeOrdersListScroll()).toBe(1234);
    window.scrollY = 0;
  });

  it.each([{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }])(
    'does not save the scroll on a new-tab click of the 查看 button (%o)',
    (keys) => {
      sessionStorage.clear();
      window.scrollY = 500;
      render(<OrdersTable orders={[order({ id: 42, hasDetails: true })]} {...sortProps} />);

      fireEvent.click(screen.getByRole('link', { name: '查看' }), keys);

      expect(takeOrdersListScroll()).toBeNull();
      window.scrollY = 0;
    }
  );

  it('shows placeholder rows while loading, without the empty text', () => {
    render(<OrdersTable orders={[]} {...sortProps} loading />);

    expect(screen.getAllByTestId('order-row-skeleton').length).toBeGreaterThan(0);
    expect(screen.queryByText('暂无订单数据')).not.toBeInTheDocument();
  });

  it('shows the empty text after loading', () => {
    render(<OrdersTable orders={[]} {...sortProps} />);

    expect(screen.getByText('暂无订单数据')).toBeInTheDocument();
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

  it('shows the same numbers as the table and links to the order page', () => {
    render(<OrdersCardList orders={[order({ id: 7 })]} sort={DEFAULT_ORDER_SORT} />);

    const card = within(screen.getByTestId('order-card'));
    expect(card.getByText('350円')).toBeInTheDocument();
    expect(card.getByText('650円')).toBeInTheDocument();
    expect(card.getByRole('link', { name: '查看' })).toHaveAttribute('href', '/orders/7');
  });

  it('opens the order on a card click, and in a new tab on a Cmd click', () => {
    push.mockClear();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<OrdersCardList orders={[order({ id: 7 })]} sort={DEFAULT_ORDER_SORT} />);

    fireEvent.click(screen.getByTestId('order-card'));
    expect(push).toHaveBeenCalledWith('/orders/7');

    fireEvent.click(screen.getByTestId('order-card'), { metaKey: true });
    expect(open).toHaveBeenCalledWith('/orders/7', '_blank', 'noopener');
    expect(push).toHaveBeenCalledTimes(1);
    open.mockRestore();
  });

  it('saves the scroll on a plain click of the 查看 button', () => {
    sessionStorage.clear();
    window.scrollY = 700;
    render(<OrdersCardList orders={[order({ id: 7 })]} sort={DEFAULT_ORDER_SORT} />);

    fireEvent.click(screen.getByRole('link', { name: '查看' }));

    expect(takeOrdersListScroll()).toBe(700);
    window.scrollY = 0;
  });

  it.each([{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }])(
    'does not save the scroll on a new-tab click of the 查看 button (%o)',
    (keys) => {
      sessionStorage.clear();
      window.scrollY = 700;
      render(<OrdersCardList orders={[order({ id: 7 })]} sort={DEFAULT_ORDER_SORT} />);

      fireEvent.click(screen.getByRole('link', { name: '查看' }), keys);

      expect(takeOrdersListScroll()).toBeNull();
      window.scrollY = 0;
    }
  );
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
  const base = {
    orderNo: '',
    name: '',
    revenue: 100,
    totalCost: 0,
    shippingFee: 0,
    transactionTime: '',
    hasDetails: true,
    hasUnknownCost: false,
    createdAt: '',
    updatedAt: '',
    isDeleted: false,
  };
  const ids = (orders: Order[]) => orders.map((o) => o.id);

  it('sorts by profit descending', () => {
    const orders = [
      { ...base, id: 1, revenue: 100, totalCost: 90 },
      { ...base, id: 2, revenue: 100, totalCost: 10 },
    ];
    expect(ids(sortOrders(orders, { field: 'profit', direction: 'desc' }))).toEqual([2, 1]);
  });

  it('puts unknown-cost orders last in a profit sort, in both directions', () => {
    const orders = [
      { ...base, id: 1, totalCost: 0, hasUnknownCost: true },
      { ...base, id: 2, totalCost: 90 },
      { ...base, id: 3, totalCost: 10 },
    ];
    expect(ids(sortOrders(orders, { field: 'profit', direction: 'desc' }))).toEqual([3, 2, 1]);
    expect(ids(sortOrders(orders, { field: 'profit', direction: 'asc' }))).toEqual([2, 3, 1]);
  });

  it('keeps zero-cost orders together in a cost sort', () => {
    const orders = [
      { ...base, id: 1, totalCost: 0 },
      { ...base, id: 2, totalCost: 50 },
      { ...base, id: 3, totalCost: 0 },
      { ...base, id: 4, totalCost: 20 },
    ];
    expect(ids(sortOrders(orders, { field: 'totalCost', direction: 'asc' }))).toEqual([1, 3, 4, 2]);
    expect(ids(sortOrders(orders, { field: 'totalCost', direction: 'desc' }))).toEqual([
      2, 4, 1, 3,
    ]);
  });

  it('sorts an unknown cost with the missing costs in a cost sort', () => {
    const orders = [
      { ...base, id: 1, totalCost: 50 },
      { ...base, id: 2, totalCost: 30, hasUnknownCost: true },
      { ...base, id: 3, totalCost: 20 },
    ];
    expect(ids(sortOrders(orders, { field: 'totalCost', direction: 'asc' }))).toEqual([2, 3, 1]);
    expect(ids(sortOrders(orders, { field: 'totalCost', direction: 'desc' }))).toEqual([1, 3, 2]);
  });

  it('sorts by transaction time in both directions', () => {
    const orders = [
      { ...base, id: 1, transactionTime: '2026-02-01T00:00:00' },
      { ...base, id: 2, transactionTime: '2026-01-01T00:00:00' },
    ];
    expect(ids(sortOrders(orders, { field: 'transactionTime', direction: 'asc' }))).toEqual([2, 1]);
    expect(ids(sortOrders(orders, { field: 'transactionTime', direction: 'desc' }))).toEqual([1, 2]);
  });
});

describe('nextOrderSort', () => {
  it('flips the direction of the active field', () => {
    expect(nextOrderSort({ field: 'revenue', direction: 'asc' }, 'revenue')).toEqual({
      field: 'revenue',
      direction: 'desc',
    });
    expect(nextOrderSort({ field: 'revenue', direction: 'desc' }, 'revenue')).toEqual({
      field: 'revenue',
      direction: 'asc',
    });
  });

  it('sorts a new field ascending', () => {
    expect(nextOrderSort(DEFAULT_ORDER_SORT, 'profit')).toEqual({ field: 'profit', direction: 'asc' });
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

describe('ExtractedResultRow', () => {
  const row = {
    purchaseNo: 'p1',
    purchaseDate: '2026-03-05',
    productName: 'Towel',
    purchasePriceCny: 7,
    purchaseAmount: 2,
    thumbUrl: '',
    offset: '',
  };
  const product = { id: 3, name: 'Towel', categoryId: 1, categoryName: 'Cloth', createdAt: '', updatedAt: '', isDeleted: false };

  const otherProduct = { ...product, id: 4, name: 'Cup' };

  const rowElement = (
    registerBlockedReason: string | undefined,
    onRegister: () => Promise<string | undefined>,
    selectedProductId = 3
  ) => (
    <table>
      <tbody>
        <ExtractedResultRow
          row={row}
          categories={[]}
          products={[product, otherProduct]}
          selectedProductId={selectedProductId}
          registeredItems={new Set()}
          factorSuggestions={{}}
          onProductSelected={vi.fn()}
          onProductCreated={vi.fn()}
          onRegister={onRegister}
          registerBlockedReason={registerBlockedReason}
        />
      </tbody>
    </table>
  );

  it('hides the error when the product changes', async () => {
    const onRegister = vi.fn().mockRejectedValue({ response: { data: '商品不存在' } });
    const { rerender } = render(rowElement(undefined, onRegister));

    await userEvent.click(screen.getByRole('button', { name: '登录' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('商品不存在');

    rerender(rowElement(undefined, onRegister, 4));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the error again when the product goes back to the failed one', async () => {
    const onRegister = vi.fn().mockRejectedValue({ response: { data: '商品不存在' } });
    const { rerender } = render(rowElement(undefined, onRegister));

    await userEvent.click(screen.getByRole('button', { name: '登录' }));
    await screen.findByRole('alert');
    rerender(rowElement(undefined, onRegister, 4));
    rerender(rowElement(undefined, onRegister, 3));

    expect(screen.getByRole('alert')).toHaveTextContent('商品不存在');
  });

  it('keeps the warning after a saved batch when the product changes', async () => {
    const onRegister = vi.fn().mockResolvedValue('已登记，但商品图片未保存');
    const { rerender } = render(rowElement(undefined, onRegister));

    await userEvent.click(screen.getByRole('button', { name: '登录' }));
    await screen.findByRole('alert');
    rerender(rowElement(undefined, onRegister, 4));

    expect(screen.getByRole('alert')).toHaveTextContent('已登记，但商品图片未保存');
  });

  const renderRow = (registerBlockedReason?: string, onRegister = vi.fn().mockResolvedValue(undefined)) =>
    render(
      <table>
        <tbody>
          <ExtractedResultRow
            row={row}
            categories={[]}
            products={[product]}
            selectedProductId={3}
            registeredItems={new Set()}
            factorSuggestions={{}}
            onProductSelected={vi.fn()}
            onProductCreated={vi.fn()}
            onRegister={onRegister}
            registerBlockedReason={registerBlockedReason}
          />
        </tbody>
      </table>
    );

  it('shows the error on the row and keeps 登录 when the registration fails', async () => {
    renderRow(undefined, vi.fn().mockRejectedValue({ response: { data: '商品不存在' } }));

    await userEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('商品不存在');
    expect(screen.getByRole('button', { name: '登录' })).toBeEnabled();
  });

  it('shows 完成 and the warning when only the image update fails', async () => {
    renderRow(undefined, vi.fn().mockResolvedValue('已登记，但商品图片未保存'));

    await userEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('已登记，但商品图片未保存');
    expect(screen.getByRole('button', { name: '完成' })).toBeDisabled();
  });

  it('hides the error when the factor changes', async () => {
    renderRow(undefined, vi.fn().mockRejectedValue({ response: { data: '商品不存在' } }));

    await userEvent.click(screen.getByRole('button', { name: '登录' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('商品不存在');

    await userEvent.type(screen.getByLabelText('换算倍数(件/组)'), '0');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('enables 登录 when a product is chosen and a rate exists', () => {
    renderRow();
    expect(screen.getByRole('button', { name: '登录' })).toBeEnabled();
  });

  it('disables 登录 when there is no exchange rate', () => {
    renderRow('没有汇率，无法登记');
    expect(screen.getByRole('button', { name: '登录' })).toBeDisabled();
  });
});

describe('listScroll', () => {
  it('clears the saved position', () => {
    window.scrollY = 300;
    saveOrdersListScroll();
    clearOrdersListScroll();
    expect(takeOrdersListScroll()).toBeNull();
    window.scrollY = 0;
  });

  it('treats only the orders list and order pages as orders paths', () => {
    expect(isOrdersPath('/orders')).toBe(true);
    expect(isOrdersPath('/orders/42')).toBe(true);
    expect(isOrdersPath('/products')).toBe(false);
    expect(isOrdersPath('/ordersx')).toBe(false);
  });
});
