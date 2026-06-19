import type { KLineData, TimePeriod } from './types';

/** 热门股票列表（供用户选择） */
export const STOCK_LIST = [
  { code: '000001', name: '平安银行', basePrice: 11.25 },
  { code: '000333', name: '美的集团', basePrice: 65.80 },
  { code: '000651', name: '格力电器', basePrice: 39.50 },
  { code: '000858', name: '五粮液', basePrice: 138.20 },
  { code: '002415', name: '海康威视', basePrice: 32.60 },
  { code: '300750', name: '宁德时代', basePrice: 198.50 },
  { code: '600036', name: '招商银行', basePrice: 36.80 },
  { code: '600519', name: '贵州茅台', basePrice: 1580.00 },
  { code: '600900', name: '长江电力', basePrice: 25.60 },
  { code: '601166', name: '兴业银行', basePrice: 17.40 },
  { code: '601318', name: '中国平安', basePrice: 45.30 },
  { code: '603259', name: '药明康德', basePrice: 52.70 },
  { code: '002594', name: '比亚迪', basePrice: 268.00 },
  { code: '688981', name: '中芯国际', basePrice: 56.80 },
  { code: '000568', name: '泸州老窖', basePrice: 168.50 },
];

/**
 * 生成模拟 KLine 数据
 * 使用随机游走模型模拟真实股价走势
 */
export function generateMockKLineData(
  count: number,
  timeInterval: TimePeriod = 'day'
): KLineData[] {
  const basePrice = STOCK_LIST[0].basePrice;
  const data: KLineData[] = [];
  const now = Date.now();
  const intervalMs = getIntervalMs(timeInterval);

  let lastClose = basePrice;
  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - i * intervalMs;
    // 生成随机波动
    const change = (Math.random() - 0.48) * 0.06; // -3% ~ +3%
    const open = lastClose;
    const close = open * (1 + change);
    const volatility = Math.abs(change) * (0.3 + Math.random() * 0.7);
    const high = Math.max(open, close) * (1 + volatility * 0.5);
    const low = Math.min(open, close) * (1 - volatility * 0.5);
    const volume = Math.floor(100000 + Math.random() * 5000000);

    data.push({
      timestamp,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });

    lastClose = close;
  }

  return data;
}

/** 为指定股票代码生成模拟数据，使用该股票的 basePrice */
export function generateMockKLineDataForStock(
  code: string,
  count: number,
  timeInterval: TimePeriod = 'day'
): KLineData[] {
  const stock = STOCK_LIST.find((s) => s.code === code) || STOCK_LIST[0];
  const basePrice = stock.basePrice;
  const data: KLineData[] = [];
  const now = Date.now();
  const intervalMs = getIntervalMs(timeInterval);

  // 按股票代码做一些差异化
  const seed = parseInt(code, 10) / 100000;
  let lastClose = basePrice * (1 + (seed % 20 - 10) / 100); // ±10% 偏移

  for (let i = count - 1; i >= 0; i--) {
    const timestamp = now - i * intervalMs;
    const change = (Math.random() - 0.47) * 0.05 * (1 + (seed % 5) / 10);
    const open = lastClose;
    const close = open * (1 + change);
    const volatility = Math.abs(change) * (0.3 + Math.random() * 0.7);
    const high = Math.max(open, close) * (1 + volatility * 0.5);
    const low = Math.min(open, close) * (1 - volatility * 0.5);
    const volume = Math.floor(50000 + Math.random() * (seed > 5 ? 8000000 : 2000000));

    data.push({
      timestamp,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });

    lastClose = close;
  }

  return data;
}

function getIntervalMs(period: TimePeriod): number {
  switch (period) {
    case '1min': return 60 * 1000;
    case '5min': return 5 * 60 * 1000;
    case '15min': return 15 * 60 * 1000;
    case '30min': return 30 * 60 * 1000;
    case '60min': return 60 * 60 * 1000;
    case 'day': return 24 * 60 * 60 * 1000;
    case 'week': return 7 * 24 * 60 * 60 * 1000;
    case 'month': return 30 * 24 * 60 * 60 * 1000;
  }
}

/** 获取股票名称 */
export function getStockName(code: string): string {
  return STOCK_LIST.find((s) => s.code === code)?.name || code;
}

/** 获取股票 basePrice */
export function getStockBasePrice(code: string): number {
  return STOCK_LIST.find((s) => s.code === code)?.basePrice || 10;
}
