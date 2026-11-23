'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import { Order, OrderDetail, CreateOrderDetail, UpdateOrderDetail } from '@/types';

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Loads all orders. The list page filters them on the client.
  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<Order[]>('/orders');
      setOrders(response.data);
      return response.data;
    } catch (error) {
      console.error('加载订单失败:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getOrder = useCallback(async (id: number) => {
    const response = await api.get<Order>(`/orders/${id}`);
    return response.data;
  }, []);

  const getOrderDetails = useCallback(async (orderId: number) => {
    try {
      const response = await api.get<OrderDetail[]>(`/orders/${orderId}/details`);
      return response.data;
    } catch (error) {
      console.error('加载订单详情失败:', error);
      throw error;
    }
  }, []);

  const importFromCurl = useCallback(async (curlCommand: string) => {
    try {
      const response = await api.post('/orders/import-from-curl', {
        curlCommand,
        skipExisting: true,
      });
      return response.data;
    } catch (error) {
      console.error('导入订单失败:', error);
      throw error;
    }
  }, []);

  const createOrderDetail = useCallback(async (data: CreateOrderDetail) => {
    try {
      const response = await api.post('/orders/details', data);
      return response.data;
    } catch (error) {
      console.error('创建订单详细失败:', error);
      throw error;
    }
  }, []);

  const updateOrderDetail = useCallback(async (id: number, data: UpdateOrderDetail) => {
    try {
      const response = await api.put(`/orders/details/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('更新订单详细失败:', error);
      throw error;
    }
  }, []);

  const deleteOrderDetail = useCallback(async (id: number) => {
    await api.delete(`/orders/details/${id}`);
  }, []);

  return {
    orders,
    loading,
    loadOrders,
    getOrder,
    getOrderDetails,
    importFromCurl,
    createOrderDetail,
    updateOrderDetail,
    deleteOrderDetail,
  };
}
