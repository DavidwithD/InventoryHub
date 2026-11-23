export type Currency = 'JPY' | 'CNY';

/**
 * Formats an amount with its unit.
 * JPY shows whole yen with 円, for example 1,234円.
 * CNY shows two decimals with 元, for example 12.50元.
 */
export function formatMoney(value: number, currency: Currency): string {
  if (currency === 'JPY') {
    // Math.round(-0.4) is -0. It prints as "-0円". `|| 0` turns it into 0.
    return `${(Math.round(value) || 0).toLocaleString('ja-JP')}円`;
  }
  return `${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}元`;
}

/** Formats a JPY chart axis tick in thousands, for example 12k円. */
export function formatJpyThousands(value: number): string {
  return `${(value / 1000).toFixed(0)}k円`;
}
