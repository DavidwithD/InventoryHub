'use client';

import { useState, useCallback } from 'react';
import api from '@/lib/api';
import { Order, CreateOrderDetail } from '@/types';

interface CreateOrderData {
  orderNo: string;
  name: string;
  imageUrl?: string;
  revenue: number;
  transactionTime: string;
  details: CreateOrderDetail[];
}

interface UpdateOrderData {
  orderNo: string;
  name: string;
  imageUrl?: string;
  revenue: number;
  transactionTime: string;
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = useCallback(async (params?: { startDate?: string; endDate?: string }) => {
    try {
      setLoading(true);
      let url = '/orders';
      if (params) {
        const urlParams = new URLSearchParams();
        if (params.startDate) urlParams.append('startDate', params.startDate);
        if (params.endDate) urlParams.append('endDate', params.endDate);
        if (urlParams.toString()) url += `?${urlParams.toString()}`;
      }

      const response = await api.get<Order[]>(url);
      setOrders(response.data);
      return response.data;
    } catch (error) {
      console.error('加载订单失败:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const createOrder = useCallback(async (data: CreateOrderData) => {
    try {
      const response = await api.post('/orders', data);
      return response.data;
    } catch (error) {
      console.error('创建订单失败:', error);
      throw error;
    }
  }, []);

  const updateOrder = useCallback(async (id: number, data: UpdateOrderData) => {
    try {
      const response = await api.put(`/orders/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('更新订单失败:', error);
      throw error;
    }
  }, []);

  const deleteOrder = useCallback(async (id: number) => {
    try {
      await api.delete(`/orders/${id}`);
    } catch (error) {
      console.error('删除订单失败:', error);
      throw error;
    }
  }, []);

  const getOrderDetails = useCallback(async (orderId: number) => {
    try {
      const response = await api.get(`/orders/${orderId}/details`);
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

  return {
    orders,
    loading,
    loadOrders,
    createOrder,
    updateOrder,
    deleteOrder,
    getOrderDetails,
    importFromCurl,
  };
}
