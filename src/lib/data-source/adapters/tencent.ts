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
  return `https://qt.gtimg.cn/q=${tencentCodes}`;
}

/** 获取腾讯 A 股全量列表 URL */
export function getTencentStockListUrl(): string {
  // 腾讯不支持一次获取全量，使用板块批量获取: 沪A + 深A
  // 实际请求通过后端拼接
  return '';
}

/** 获取腾讯历史K线URL */
export function getTencentKLineUrl(code: string, period: string): string {
  const tencentCode = getTencentCode(code);
  if (period === '60min' || period === '30min') {
    const minutePeriod = period === '60min' ? 'm60' : 'm30';
    return `https://ifzq.gtimg.cn/appstock/app/kline/mkline?param=${tencentCode},${minutePeriod},,520`;
  }
  const periodMap: Record<string, string> = { day: 'day', week: 'week', month: 'month' };
  const p = periodMap[period] || 'day';
  return `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${tencentCode},${p},,,520,qfq`;
}
