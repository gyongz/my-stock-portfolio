/** 单只持仓记录 */
export interface Holding {
  id: string;
  code: string;         // 股票代码
  name: string;         // 股票名称
  quantity: number;     // 持仓数量
  buyPrice: number;     // 买入均价
  currentPrice: number; // 当前价格（用户可手动更新/模拟）
  updatedAt: string;    // ISO date string
}

/** 计算后的持仓盈亏信息 */
export interface HoldingWithPnL extends Holding {
  costTotal: number;        // 总成本
  marketValue: number;      // 持仓市值
  pnl: number;              // 盈亏金额
  pnlPercent: number;       // 盈亏百分比
}

/** KLine 数据点 */
export interface KLineData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** 时间周期 */
export type TimePeriod = '1min' | '5min' | '15min' | '30min' | '60min' | 'day' | 'week' | 'month';

/** 技术指标 */
export type TechnicalIndicator = 'MA' | 'EMA' | 'MACD' | 'KDJ' | 'RSI' | 'BOLL';

/** 时间周期展示名 */
export const timePeriodLabels: Record<TimePeriod, string> = {
  '1min': '1分钟',
  '5min': '5分钟',
  '15min': '15分钟',
  '30min': '30分钟',
  '60min': '60分钟',
  'day': '日线',
  'week': '周线',
  'month': '月线',
};

/** 技术指标展示名 */
export const indicatorLabels: Record<TechnicalIndicator, string> = {
  MA: '均线',
  EMA: '指数均线',
  MACD: 'MACD',
  KDJ: 'KDJ',
  RSI: 'RSI',
  BOLL: '布林带',
};