'use client';

import { Box } from '@mui/material';
import { Order } from '@/types';

interface Props {
  order: Order;
  /** Width and height in px. */
  size: number;
  /** Corner radius in px. */
  radius: number;
}

/** The order image. It links to the Mercari item page. A grey box shows when there is no image. */
export default function OrderThumbnail({ order, size, radius }: Props) {
  if (!order.imageUrl) {
    return (
      <Box
        sx={{ width: size, height: size, flexShrink: 0, bgcolor: 'grey.200', borderRadius: `${radius}px` }}
      />
    );
  }

  return (
    <a
      href={`https://jp.mercari.com/item/${order.orderNo}`}
      style={{ flexShrink: 0, lineHeight: 0 }}
    >
      <img
        src={order.imageUrl}
        alt={order.name}
        style={{ width: size, height: size, objectFit: 'cover', borderRadius: radius }}
      />
    </a>
  );
}
