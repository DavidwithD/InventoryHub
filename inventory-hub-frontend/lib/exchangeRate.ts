const EXCHANGE_RATE_API = process.env.NEXT_PUBLIC_EXCHANGE_RATE_API || 'https://api.exchangerate-api.com/v4/latest/CNY';

// localStorage key of the last CNY → JPY rate that loaded.
const SAVED_RATE_KEY = 'cnyJpyRate';

interface ExchangeRateResponse {
  rates: {
    [key: string]: number;
  };
}

export interface ExchangeRate {
  /** JPY for 1 CNY. 0 means no rate is known. */
  rate: number;
  /** 'live' when the API answered. 'saved' when the rate is the last one that loaded. */
  source: 'live' | 'saved';
}

function readSavedRate(): number {
  if (typeof window === 'undefined') return 0;
  const saved = Number(localStorage.getItem(SAVED_RATE_KEY));
  return Number.isFinite(saved) && saved > 0 ? saved : 0;
}

/**
 * Loads the CNY → JPY rate.
 * A rate that loads is saved. When the API fails or returns no rate, the saved rate is used.
 * The result has rate 0 when neither exists.
 */
export async function fetchExchangeRate(): Promise<ExchangeRate> {
  try {
    const response = await fetch(EXCHANGE_RATE_API);
    const data: ExchangeRateResponse = await response.json();
    const rate = data.rates.JPY || 0;
    if (rate > 0) {
      if (typeof window !== 'undefined') localStorage.setItem(SAVED_RATE_KEY, String(rate));
      return { rate, source: 'live' };
    }
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
  }
  return { rate: readSavedRate(), source: 'saved' };
}
