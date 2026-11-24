import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import InventoryPage from '@/app/inventory/page';
import { useInventoryFilterStore } from '@/lib/stores/filterStore';
import type { Inventory } from '@/types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const batch = (
  id: number,
  productId: number,
  productName: string,
  stockQuantity: number
): Inventory => ({
  id,
  productId,
  productName,
  stockQuantity,
  purchaseQuantity: 10,
  initialStock: 10,
  priceJpy: 100,
  createdAt: '',
  updatedAt: '',
  isDeleted: false,
});

// Many: three batches of 3, 9 in total. Low: 4 in total, one batch is empty. Gone: sold out.
const inventories = [
  batch(1, 1, 'Many', 3),
  batch(2, 1, 'Many', 3),
  batch(3, 1, 'Many', 3),
  batch(4, 2, 'Low', 0),
  batch(5, 2, 'Low', 4),
  batch(6, 3, 'Gone', 0),
];

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn((url: string) => Promise.resolve({ data: url === '/inventory' ? inventories : [] })),
  },
}));

// The first cell of each body row holds the batch ID.
const shownIds = () =>
  screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0].textContent);

const rowOf = (id: number) =>
  screen
    .getAllByRole('row')
    .find((row) => within(row).queryAllByRole('cell')[0]?.textContent === String(id))!;

describe('InventoryPage', () => {
  beforeEach(() => {
    useInventoryFilterStore.getState().reset();
  });

  it('shows the product total next to the batch stock', async () => {
    render(<InventoryPage />);
    await screen.findByText('Low');

    expect(within(rowOf(1)).getByTestId('batch-stock')).toHaveTextContent('3');
    expect(within(rowOf(1)).getByTestId('product-stock')).toHaveTextContent('9');
    expect(within(rowOf(5)).getByTestId('batch-stock')).toHaveTextContent('4');
    expect(within(rowOf(5)).getByTestId('product-stock')).toHaveTextContent('4');
  });

  it('counts products in the header chips', async () => {
    render(<InventoryPage />);
    await screen.findByText('Low');

    expect(screen.getByText('缺货商品 1')).toBeInTheDocument();
    expect(screen.getByText('低库存商品 1')).toBeInTheDocument();
  });

  it('hides empty batches until 显示空批次 is on', async () => {
    render(<InventoryPage />);
    await screen.findByText('Low');
    expect(shownIds()).toEqual(['1', '2', '3', '5']);

    await userEvent.click(screen.getByLabelText('显示空批次'));

    expect(shownIds()).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(within(rowOf(6)).getByTestId('product-stock')).toHaveTextContent('缺货');
  });

  it('filters 低库存 and 缺货 by the product total', async () => {
    render(<InventoryPage />);
    await screen.findByText('Low');

    await userEvent.click(screen.getByRole('button', { name: '低库存' }));
    expect(shownIds()).toEqual(['5']);

    await userEvent.click(screen.getByRole('button', { name: '缺货' }));
    expect(shownIds()).toEqual(['6']);
    expect(screen.getByLabelText('显示空批次')).toBeChecked();
  });
});
