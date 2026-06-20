import type { KLineItem, QuoteData, StockInfo } from '@/lib/data-source/types';

export type PythonDataProvider = 'akshare' | 'baostock';

interface BridgeResponse<T> {
  success: boolean;
  data: T;
  detail?: string;
}

function getServiceUrl(): string {
  return process.env.MARKET_DATA_SERVICE_URL || 'http://127.0.0.1:8001';
}

async function requestBridge<T>(path: string, params: Record<string, string>): Promise<T> {
  const baseUrl = getServiceUrl().endsWith('/') ? getServiceUrl() : `${getServiceUrl()}/`;
  const url = new URL(path.replace(/^\//, ''), baseUrl);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const token = process.env.MARKET_DATA_SERVICE_TOKEN;
  const response = await fetch(url, {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json() as BridgeResponse<T>;
  if (!response.ok || !payload.success) {
    throw new Error(payload.detail || `Python 行情服务请求失败: ${response.status}`);
  }
  return payload.data;
}

export async function fetchPythonKLine(provider: PythonDataProvider, code: string, period: string): Promise<KLineItem[]> {
  const data = await requestBridge<KLineItem[]>('/kline', { provider, code, period, limit: '520' });
  return data.map((item) => ({
    timestamp: Number(item.timestamp),
    open: Number(item.open),
    high: Number(item.high),
    low: Number(item.low),
    close: Number(item.close),
    volume: Number(item.volume) || 0,
  })).filter((item) => Number.isFinite(item.timestamp) && item.close > 0);
}

export async function fetchPythonQuotes(provider: PythonDataProvider, codes: string[]): Promise<Record<string, QuoteData>> {
  return requestBridge<Record<string, QuoteData>>('/quotes', { provider, codes: codes.join(',') });
}

export async function fetchPythonStockList(provider: PythonDataProvider): Promise<StockInfo[]> {
  return requestBridge<StockInfo[]>('/stocks', { provider });
}
