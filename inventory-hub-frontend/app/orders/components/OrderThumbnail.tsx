'use client';

import { Box } from '@mui/material';
import { Order } from '@/types';

interface Props {
  order: Order;
  /** Width and height in px. */
  size: number;
  /** Corner radius in px. */
  radius: number;
  /** When true, the image opens the Mercari item page in a new tab. */
  linkToMercari?: boolean;
}

export function mercariItemUrl(order: Order): string {
  return `https://jp.mercari.com/item/${order.orderNo}`;
}

/** The order image. A grey box shows when there is no image. The image loads when it nears the screen. */
export default function OrderThumbnail({ order, size, radius, linkToMercari = false }: Props) {
  if (!order.imageUrl) {
    return (
      <Box
        sx={{ width: size, height: size, flexShrink: 0, bgcolor: 'grey.200', borderRadius: `${radius}px` }}
      />
    );
  }

  const image = (
    <img
      src={order.imageUrl}
      alt={order.name}
      loading="lazy"
      width={size}
      height={size}
      style={{ width: size, height: size, objectFit: 'cover', borderRadius: radius, flexShrink: 0, display: 'block' }}
    />
  );

  if (!linkToMercari) return image;

  return (
    <a
      href={mercariItemUrl(order)}
      target="_blank"
      rel="noopener noreferrer"
      style={{ flexShrink: 0, lineHeight: 0 }}
    >
      {image}
    </a>
  );
}
