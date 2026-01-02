const EXCHANGE_RATE_API = process.env.NEXT_PUBLIC_EXCHANGE_RATE_API || 'https://api.exchangerate-api.com/v4/latest/CNY';

interface ExchangeRateResponse {
  rates: {
    [key: string]: number;
  };
}

export async function fetchExchangeRate(): Promise<number> {
  try {
    const response = await fetch(EXCHANGE_RATE_API);
    const data: ExchangeRateResponse = await response.json();
    // CNY to JPY rate (返回1 CNY = X JPY的汇率)
    return data.rates.JPY || 0;
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
    throw new Error('无法获取汇率');
  }
}

export async function getCurrentExchangeRate(): Promise<number> {
  try {
    const response = await fetch(EXCHANGE_RATE_API);
    const data: ExchangeRateResponse = await response.json();
    return data.rates.CNY || 0;
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error);
    // Return cached rate from localStorage as fallback
    if (typeof window !== 'undefined') {
      const cachedRate = localStorage.getItem('lastExchangeRate');
      return cachedRate ? parseFloat(cachedRate) : 0;
    }
    return 0;
  }
}

export function saveExchangeRate(rate: number): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('lastExchangeRate', rate.toString());
  }
}

export function getLastExchangeRate(): number | null {
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem('lastExchangeRate');
    return cached ? parseFloat(cached) : null;
  }
  return null;
}
