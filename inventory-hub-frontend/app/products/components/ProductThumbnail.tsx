'use client';

import { Box } from '@mui/material';
import Image from 'next/image';
import { Product } from '@/types';

interface Props {
  product: Product;
  /** Width and height in px. */
  size: number;
  /** Corner radius in px. */
  radius: number;
}

/** The product image. A grey box with 无图 shows when there is no image. */
export default function ProductThumbnail({ product, size, radius }: Props) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        position: 'relative',
        flexShrink: 0,
        borderRadius: `${radius}px`,
        overflow: 'hidden',
        bgcolor: 'grey.200',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.disabled',
        // Small thumbnails get smaller placeholder text.
        fontSize: size < 64 ? 10 : 12,
      }}
    >
      {product.imageUrl ? (
        <Image
          src={product.imageUrl}
          alt={product.name}
          fill
          style={{ objectFit: 'cover' }}
          unoptimized
        />
      ) : (
        '无图'
      )}
    </Box>
  );
}
