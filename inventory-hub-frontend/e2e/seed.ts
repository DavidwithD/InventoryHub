import type { APIRequestContext } from '@playwright/test';
import { API_URL } from './ports';

// Creates records through the E2E API. Each call fails the test on an error status.
export class Seed {
  constructor(private readonly request: APIRequestContext) {}

  private async post<T>(path: string, data: unknown): Promise<T> {
    const response = await this.request.post(`${API_URL}${path}`, { data });
    if (!response.ok()) throw new Error(`POST ${path} → ${response.status()}: ${await response.text()}`);
    return response.json();
  }

  async product(name: string, category: string): Promise<{ id: number }> {
    const created = await this.post<{ id: number }>('/categories', { name: category });
    return this.post('/products', { categoryId: created.id, name });
  }

  batch(productId: number, purchaseDate: string, stock: number, priceJpy: number): Promise<{ id: number }> {
    return this.post('/inventory', {
      productId,
      purchaseDate,
      purchaseQuantity: stock,
      initialStock: stock,
      priceJpy,
    });
  }

  order(orderNo: string, transactionTime: string, revenue: number, productId: number, quantity: number) {
    return this.post<{ id: number }>('/orders', {
      orderNo,
      transactionTime,
      revenue,
      details: [{ productId, quantity }],
    });
  }

  emptyOrder(orderNo: string, transactionTime: string, revenue: number) {
    return this.post<{ id: number }>('/orders', { orderNo, transactionTime, revenue, details: [] });
  }
}

// A suffix that keeps names unique between tests in one run.
export const unique = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
