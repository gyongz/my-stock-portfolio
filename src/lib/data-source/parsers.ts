import type { KLineItem, QuoteData } from './types';

/**
 * 解析新浪财经实时行情（hq.sinajs.cn）
 * 响应格式: var hq_str_sh600519="贵州茅台,1700.00,1695.00,1710.50,1720.00,1690.00,...
 * 字段顺序: 名称,开盘,昨收,现价,最高,最低,...
 */
export function parseSinaRealTime(raw: string): QuoteData | null {
  try {
    const match = raw.match(/"([^"]+)"/);
    if (!match) return null;
    const parts = match[1].split(',');
    return {
      price: parseFloat(parts[3]) || 0,        // 现价
      change: parseFloat(parts[3]) - parseFloat(parts[2]) || 0, // 涨跌额
      changePercent: ((parseFloat(parts[3]) - parseFloat(parts[2])) / parseFloat(parts[2]) * 100) || 0,
      open: parseFloat(parts[1]) || 0,          // 开盘
      high: parseFloat(parts[4]) || 0,          // 最高
      low: parseFloat(parts[5]) || 0,           // 最低
      volume: parseFloat(parts[8]) || 0,        // 成交量
      yesterdayClose: parseFloat(parts[2]) || 0, // 昨收
    };
  } catch {
    return null;
  }
}

/**
 * 解析腾讯财经实时行情（qt.gtimg.cn）
 * 响应格式: v_sz000001="0~平安银行~000001~9.50~9.50~9.48~...
 * 字段按 ~ 分割, 具体位置: 3=现价, 4=昨收, 5=开盘, 6=成交量,...
 */
export function parseTencentRealTime(raw: string): QuoteData | null {
  try {
    const match = raw.match(/"([^"]+)"/);
    if (!match) return null;
    const parts = match[1].split('~');
    const price = parseFloat(parts[3]) || 0;
    const yesterdayClose = parseFloat(parts[4]) || 0;
    const open = parseFloat(parts[5]) || 0;
    return {
      price,
      change: price - yesterdayClose,
      changePercent: yesterdayClose ? ((price - yesterdayClose) / yesterdayClose * 100) : 0,
      open,
      high: parseFloat(parts[33]) || 0,
      low: parseFloat(parts[34]) || 0,
      volume: parseFloat(parts[6]) || 0,
      yesterdayClose,
    };
  } catch {
    return null;
  }
}

/**
 * 解析 Yahoo Finance 历史K线
 * Yahoo 返回 JSON 格式，直接可解析
 */
export function parseYahooKLine(json: unknown): KLineItem[] {
  try {
    const payload = json as {
      chart?: {
        result?: Array<{
          timestamp?: number[];
          indicators?: { quote?: Array<Partial<Record<'open' | 'high' | 'low' | 'close' | 'volume', Array<number | null>>>> };
        }>;
      };
    };
    const result = payload.chart?.result?.[0];
    if (!result) return [];
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const { open, high, low, close, volume } = quotes;
    return timestamps.map((t: number, i: number) => ({
      timestamp: t * 1000,
      open: open?.[i] ?? 0,
      high: high?.[i] ?? 0,
      low: low?.[i] ?? 0,
      close: close?.[i] ?? 0,
      volume: volume?.[i] ?? 0,
    })).filter((k: KLineItem) => k.close > 0);
  } catch {
    return [];
  }
}

/**
 * 将新浪分时/K线文本解析为 KLineItem[]
 * min 数据格式类似: 日期,开盘,收盘,最高,最低,成交量
 */
export function parseSinaKLine(raw: string): KLineItem[] {
  try {
    const lines = raw.split('\n').filter(l => l.trim());
    return lines.map(line => {
      const parts = line.split(',');
      if (parts.length < 6) return null;
      return {
        timestamp: new Date(parts[0].replace(/-/g, '/')).getTime(),
        open: parseFloat(parts[1]) || 0,
        high: parseFloat(parts[3]) || 0,
        low: parseFloat(parts[4]) || 0,
        close: parseFloat(parts[2]) || 0,
        volume: parseFloat(parts[5]) || 0,
      };
    }).filter((k): k is KLineItem => k !== null && k.timestamp > 0);
  } catch {
    return [];
  }
}
