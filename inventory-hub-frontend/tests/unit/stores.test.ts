import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useFactorStore } from '@/lib/stores/factorStore';
import { useInventoryFilterStore, useOrderFilterStore } from '@/lib/stores/filterStore';
import { usePickHistoryStore } from '@/lib/stores/pickHistoryStore';
import { getCurrentExchangeRate, getLastExchangeRate, saveExchangeRate } from '@/lib/exchangeRate';

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
});

describe('exchange rate', () => {
  it('saves and reads back the last rate', () => {
    expect(getLastExchangeRate()).toBeNull();

    saveExchangeRate(20.5);

    expect(getLastExchangeRate()).toBe(20.5);
  });

  it('falls back to the saved rate when the request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    saveExchangeRate(0.048);

    expect(await getCurrentExchangeRate()).toBe(0.048);
  });
});
