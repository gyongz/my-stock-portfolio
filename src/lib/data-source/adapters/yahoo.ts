/**
 * Yahoo Finance 数据源适配（港股/美股/全球市场）
 * K线: https://query1.finance.yahoo.com/v8/finance/chart/{code}.{suffix}
 * 实时: https://query1.finance.yahoo.com/v8/finance/chart/{code}.{suffix}?range=1d&interval=1m
 */

// Yahoo Finance code mapping for Chinese stocks
export function getYahooCode(code: string): string {
  if (code.startsWith('6')) return `${code}.SS`;   // Shanghai
  if (code.startsWith('0') || code.startsWith('3')) return `${code}.SZ`; // Shenzhen
  // For HK stocks (e.g., 00700)
  if (code.startsWith('0') && code.length === 5) return `${code}.HK`;
  return code;
}

/** Yahoo Finance 周期映射 */
function getYahooInterval(period: string): string {
  switch (period) {
    case '30min': return '30m';
    case '60min': return '60m';
    case 'day': return '1d';
    case 'week': return '1wk';
    case 'month': return '1mo';
    default: return '1d';
  }
}

function getYahooRange(period: string): string {
  switch (period) {
    case '30min': return '7d';
    case '60min': return '1mo';
    case 'day': return '1y';
    case 'week': return '2y';
    case 'month': return '5y';
    default: return '1y';
  }
}

/** 获取 Yahoo Finance K线URL */
export function getYahooKLineUrl(code: string, period: string): string {
  const yahooCode = getYahooCode(code);
  const interval = getYahooInterval(period);
  const range = getYahooRange(period);
  return `https://query1.finance.yahoo.com/v8/finance/chart/${yahooCode}?interval=${interval}&range=${range}`;
}

/** 获取 Yahoo Finance 实时行情（最近一条tick） */
export function getYahooQuoteUrl(code: string): string {
  const yahooCode = getYahooCode(code);
  return `https://query1.finance.yahoo.com/v8/finance/chart/${yahooCode}?interval=1d&range=5d`;
}