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

/** 股票列表中的一只股票 */
export interface StockInfo {
  code: string;
  name: string;
  /** 开盘价（可选，用于填充当前价） */
  open?: number;
  /** 昨收价 */
  yesterdayClose?: number;
}

export type PeriodType = 'day' | 'week' | 'month' | '60min' | '30min' | '15min' | '5min' | '1min';

export type DataSourceId = 'mock' | 'sina' | 'tencent' | 'yahoo' | 'akshare' | 'baostock' | 'tushare';

export interface DataSourceInfo {
  id: DataSourceId;
  name: string;
  description: string;
  supportedMarkets: string[];
}
