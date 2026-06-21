'use client';

import { useState, useCallback } from 'react';
import type { KLineItem, QuoteData, DataSourceId, DataSourceInfo } from './types';

// 数据源元信息列表
export const DATA_SOURCES: DataSourceInfo[] = [
  { id: 'sina', name: '新浪财经', description: 'A股实时行情 + 日K线', supportedMarkets: ['A股'] },
  { id: 'tencent', name: '腾讯财经', description: 'A股实时行情 + 多周期K线', supportedMarkets: ['A股', '港股'] },
  { id: 'akshare', name: 'AKShare', description: 'A股/ETF实时行情 + 全周期K线', supportedMarkets: ['A股', 'ETF'] },
  { id: 'baostock', name: 'BaoStock', description: 'A股/ETF历史行情 + 最新收盘', supportedMarkets: ['A股', 'ETF'] },
  { id: 'tushare', name: 'Tushare', description: 'A股日周月K线 + 最新收盘', supportedMarkets: ['A股'] },
  { id: 'yahoo', name: 'Yahoo Finance', description: '全球股票K线历史数据', supportedMarkets: ['A股', '港股', '美股'] },
];

const DATA_SOURCE_IDS = new Set<DataSourceId>(['mock', 'sina', 'tencent', 'yahoo', 'akshare', 'baostock', 'tushare']);

const STORAGE_KEY = 'portfolio-data-source';

function getStoredSource(): DataSourceId {
  if (typeof window === 'undefined') return 'sina';
  const stored = localStorage.getItem(STORAGE_KEY) as DataSourceId | null;
  return stored && DATA_SOURCE_IDS.has(stored) ? stored : 'sina';
}

function storeSource(id: DataSourceId) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, id);
  }
}

/** K线数据获取（带缓存） */
async function fetchKLineData(source: DataSourceId, code: string, period: string): Promise<KLineItem[]> {
  const url = `/api/data-source?type=kline&source=${source}&code=${encodeURIComponent(code)}&period=${period}`;
  const res = await fetch(url, { cache: 'no-store' });
  const json = await res.json() as { success: boolean; data?: KLineItem[]; error?: string };
  if (json.success && Array.isArray(json.data)) {
    // 将 KLineItem 转换为 klinecharts 需要的格式
    return json.data.map((item) => ({
      timestamp: item.timestamp,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume,
    }));
  }
  throw new Error(json.error || 'Failed to fetch KLine data');
}

/** 批量获取实时行情 */
async function fetchQuotesData(source: DataSourceId, codes: string[]): Promise<Record<string, QuoteData>> {
  const codesParam = codes.map(c => encodeURIComponent(c)).join(',');
  const url = `/api/data-source?type=quote&source=${source}&codes=${codesParam}`;
  const res = await fetch(url, { cache: 'no-store' });
  const json = await res.json() as { success: boolean; data?: Record<string, QuoteData>; error?: string };
  if (json.success && json.data) {
    return json.data;
  }
  throw new Error(json.error || 'Failed to fetch quotes');
}

export interface DataSourceAPI {
  dataSourceId: DataSourceId;
  /** 切换数据源 */
  setDataSource: (id: DataSourceId) => void;
  /** 获取K线数据 */
  getKLine: (code: string, period: string) => Promise<KLineItem[]>;
  /** 批量获取实时行情 */
  getQuotes: (codes: string[]) => Promise<Record<string, QuoteData>>;
  /** 是否还在加载中 */
  loading: boolean;
  /** 最后一次错误 */
  error: string | null;
}

export function useDataSource(): DataSourceAPI {
  const [dataSourceId, setDataSourceId] = useState<DataSourceId>(getStoredSource);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setDataSource = useCallback((id: DataSourceId) => {
    setDataSourceId(id);
    storeSource(id);
    setError(null);
  }, []);

  const getKLine = useCallback(async (code: string, period: string): Promise<KLineItem[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchKLineData(dataSourceId, code, period);
      return data;
    } catch (err) {
      const msg = String(err);
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dataSourceId]);

  const getQuotes = useCallback(async (codes: string[]): Promise<Record<string, QuoteData>> => {
    setLoading(true);
    setError(null);
    try {
      return await fetchQuotesData(dataSourceId, codes);
    } catch (err) {
      const msg = String(err);
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [dataSourceId]);

  return {
    dataSourceId,
    setDataSource,
    getKLine,
    getQuotes,
    loading,
    error,
  };
}
