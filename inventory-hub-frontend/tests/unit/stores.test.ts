import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFactorStore } from '@/lib/stores/factorStore';
import { useInventoryFilterStore, useOrderFilterStore, validOrderSort } from '@/lib/stores/filterStore';
import { usePickHistoryStore } from '@/lib/stores/pickHistoryStore';
import { useViewMode, useViewModeStore } from '@/lib/stores/viewModeStore';
import { fetchExchangeRate } from '@/lib/exchangeRate';
import { DEFAULT_ORDER_SORT } from '@/app/orders/utils/sortOrders';

beforeEach(() => {
  useFactorStore.setState({ factors: {} });
  usePickHistoryStore.setState({ history: [] });
  useInventoryFilterStore.getState().reset();
  useOrderFilterStore.getState().reset();
});

describe('factor store', () => {
  it('returns 1 for a product with no saved factor', () => {
    expect(useFactorStore.getState().getFactor(7)).toBe(1);
  });

  it('saves a factor per product and persists it', () => {
    useFactorStore.getState().setFactor(7, 2.5);

    expect(useFactorStore.getState().getFactor(7)).toBe(2.5);
    expect(useFactorStore.getState().getFactor(8)).toBe(1);
    expect(JSON.parse(localStorage.getItem('inventory-factors')!).state.factors).toEqual({ 7: 2.5 });
  });
});

describe('pick history store', () => {
  it('puts the latest pick first and keeps each product once', () => {
    const { addToHistory } = usePickHistoryStore.getState();
    addToHistory(1);
    addToHistory(2);
    addToHistory(1);

    expect(usePickHistoryStore.getState().history).toEqual([1, 2]);
  });

  it('keeps at most 30 products', () => {
    for (let id = 1; id <= 35; id++) usePickHistoryStore.getState().addToHistory(id);

    const { history } = usePickHistoryStore.getState();
    expect(history).toHaveLength(30);
    expect(history[0]).toBe(35);
    expect(history).not.toContain(5);
  });
});

describe('filter stores', () => {
  it('reset restores the inventory defaults', () => {
    const store = useInventoryFilterStore.getState();
    store.setSearch('card');
    store.setStockFilter('low');
    store.setCategoryId(3);

    useInventoryFilterStore.getState().reset();

    expect(useInventoryFilterStore.getState()).toMatchObject({
      search: '',
      categoryId: '',
      stockFilter: 'all',
      sortField: 'id',
      sortOrder: 'asc',
    });
  });

  it('reset restores the order defaults', () => {
    useOrderFilterStore.getState().setStartDate('2026-01-01');
    useOrderFilterStore.getState().setCostStatus('null');

    useOrderFilterStore.getState().reset();

    expect(useOrderFilterStore.getState()).toMatchObject({ startDate: '', costStatus: 'all' });
  });

  it('falls back to the default sort for an unknown saved sort', async () => {
    localStorage.setItem(
      'order-filters',
      JSON.stringify({ state: { costStatus: 'hasValue', sort: { field: 'gone', direction: 'asc' } }, version: 0 })
    );

    await useOrderFilterStore.persist.rehydrate();

    expect(useOrderFilterStore.getState()).toMatchObject({ costStatus: 'hasValue', sort: DEFAULT_ORDER_SORT });
    localStorage.removeItem('order-filters');
    useOrderFilterStore.getState().reset();
  });

  it('keeps a valid saved sort', () => {
    expect(validOrderSort({ field: 'profit', direction: 'asc' })).toEqual({ field: 'profit', direction: 'asc' });
    expect(validOrderSort({ field: 'profit', direction: 'up' })).toEqual(DEFAULT_ORDER_SORT);
    expect(validOrderSort(undefined)).toEqual(DEFAULT_ORDER_SORT);
  });

  it('keeps the order sort when the filters reset', () => {
    useOrderFilterStore.getState().setSort({ field: 'profit', direction: 'asc' });

    useOrderFilterStore.getState().reset();

    expect(useOrderFilterStore.getState().sort).toEqual({ field: 'profit', direction: 'asc' });
    useOrderFilterStore.getState().setSort(DEFAULT_ORDER_SORT);
  });
});

describe('exchange rate', () => {
  beforeEach(() => localStorage.removeItem('cnyJpyRate'));

  it('returns a live rate and saves it', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ json: async () => ({ rates: { JPY: 20.5 } }) }));

    expect(await fetchExchangeRate()).toEqual({ rate: 20.5, source: 'live' });
    expect(localStorage.getItem('cnyJpyRate')).toBe('20.5');
  });

  it('falls back to the saved rate when the request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem('cnyJpyRate', '21.3');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    expect(await fetchExchangeRate()).toEqual({ rate: 21.3, source: 'saved' });
  });

  it('returns rate 0 when the request fails and no rate was saved', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    expect(await fetchExchangeRate()).toEqual({ rate: 0, source: 'saved' });
  });
});

describe('view mode store', () => {
  beforeEach(() => {
    useViewModeStore.setState({ modes: { orders: 'table', products: 'table' } });
    localStorage.removeItem('list-view-modes');
  });

  it('loads the saved mode and then reports hydrated', async () => {
    localStorage.setItem(
      'list-view-modes',
      JSON.stringify({ state: { modes: { orders: 'card', products: 'table' } }, version: 0 })
    );

    const { result } = renderHook(() => useViewMode('orders'));

    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0]).toBe('card');
  });

  it('reports hydrated with the defaults when the saved value is broken', async () => {
    localStorage.setItem('list-view-modes', '{not json');

    const { result } = renderHook(() => useViewMode('orders'));

    await waitFor(() => expect(result.current[2]).toBe(true));
    expect(result.current[0]).toBe('table');
  });
});
