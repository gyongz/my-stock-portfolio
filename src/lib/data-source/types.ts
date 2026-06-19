export interface KLineItem {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface QuoteData {
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  yesterdayClose: number;
}

export type PeriodType = 'day' | 'week' | 'month' | '60min' | '30min';

export type DataSourceId = 'mock' | 'sina' | 'tencent' | 'yahoo';

export interface DataSourceInfo {
  id: DataSourceId;
  name: string;
  description: string;
  supportedMarkets: string[];
}