'use client';

import { Box, Typography } from '@mui/material';

interface Props {
  label: string;
  value: string;
  /** 'small' fits a list card. 'large' fits the order page summary. */
  size?: 'small' | 'large';
  color?: string;
}

/** A label with a number under it. The order list cards and the order page use it. */
export default function OrderMetric({ label, value, size = 'small', color }: Props) {
  const large = size === 'large';
  return (
    <Box sx={{ minWidth: large ? 88 : 72 }}>
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
      <Typography
        variant={large ? 'h6' : 'body2'}
        sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: large ? 600 : undefined, color }}
      >
        {value}
      </Typography>
    </Box>
  );
}
