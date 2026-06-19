/**
 * 新浪财经数据源适配
 * 实时行情: http://hq.sinajs.cn/list=sh600519,sz000001
 * K线历史: http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/... (需服务端代理)
 */

// 可转债/基金等类型映射
const SINA_MARKET_MAP: Record<string, string> = {
  '6': 'sh',  // 上海 60xxxx
  '0': 'sz',  // 深圳 00xxxx / 30xxxx
  '3': 'sz',
};

export function getSinaCode(code: string): string {
  const prefix = code.startsWith('6') ? 'sh' : 'sz';
  return `${prefix}${code}`;
}

/** 获取新浪实时行情URL */
export function getSinaQuoteUrl(codes: string[]): string {
  const sinaCodes = codes.map(getSinaCode).join(',');
  return `https://hq.sinajs.cn/list=${sinaCodes}`;
}

/** 获取新浪日K线URL（通过新浪历史数据接口） */
export function getSinaKLineUrl(code: string): string {
  const sinaCode = getSinaCode(code);
  // 使用新浪的历史数据 JSON API（需要服务端代理）
  return `https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketData.getKLineData?symbol=${sinaCode}&scale=240&ma=no&datalen=520`;
}

/** 新浪周期映射 */
export function getSinaScale(period: string): number {
  switch (period) {
    case '30min': return 30;
    case '60min': return 60;
    case 'day': return 240;
    case 'week': return 240 * 5;
    case 'month': return 240 * 22;
    default: return 240;
  }
}