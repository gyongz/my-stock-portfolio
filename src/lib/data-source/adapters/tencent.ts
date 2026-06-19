/**
 * 腾讯财经数据源适配
 * 实时行情: http://qt.gtimg.cn/q=sh600519,sz000001
 * K线历史: http://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=sh600519,day,,,520
 */

export function getTencentCode(code: string): string {
  const prefix = code.startsWith('6') ? 'sh' : 'sz';
  return `${prefix}${code}`;
}

/** 获取腾讯实时行情URL */
export function getTencentQuoteUrl(codes: string[]): string {
  const tencentCodes = codes.map(getTencentCode).join(',');
  return `http://qt.gtimg.cn/q=${tencentCodes}`;
}

/** 获取腾讯历史K线URL */
export function getTencentKLineUrl(code: string, period: string): string {
  const tencentCode = getTencentCode(code);
  const periodMap: Record<string, string> = {
    'day': 'day',
    'week': 'week',
    'month': 'month',
    '60min': '60min',
    '30min': '30min',
  };
  const p = periodMap[period] || 'day';
  return `http://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${tencentCode},${p},,,520`;
}