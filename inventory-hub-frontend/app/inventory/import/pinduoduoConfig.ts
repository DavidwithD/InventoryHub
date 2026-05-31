export const PINDUODUO_ORDER_LIST_URL =
  'https://mobile.pinduoduo.com/proxy/api/api/aristotle/order_list_v4?pdduid=6913736127507&is_back=1';

export type PinduoduoOrderListBody = {
  type: string;
  page: number;
  origin_host_name: string;
  scene: string;
  page_from: number;
  pay_front_supports: unknown[];
  anti_content: string;
  size: number;
  offset: string;
};

export type PinduoduoRequestConfig = {
  headers: Record<string, string>;
  body: PinduoduoOrderListBody;
};
