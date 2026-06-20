import { NextRequest, NextResponse } from 'next/server';
import { parseSinaRealTime, parseTencentRealTime, parseYahooKLine, parseSinaStockList, parseTencentStockList } from '@/lib/data-source/parsers';
import { getSinaQuoteUrl, getSinaScale, getSinaStockListUrl, SINA_STOCK_LIST_TOTAL_PAGES } from '@/lib/data-source/adapters/sina';
import { getTencentQuoteUrl, getTencentKLineUrl, getTencentStockListUrl } from '@/lib/data-source/adapters/tencent';
import { getYahooKLineUrl, getYahooQuoteUrl } from '@/lib/data-source/adapters/yahoo';
import { generateMockKLineDataForStock } from '@/lib/kline-data';
import { ALL_ETFS } from '@/lib/etf-list';
import { isMarketDataPersistenceEnabled } from '@/lib/db/client';
import { loadMarketBars, storeLatestQuotes, storeMarketBars } from '@/lib/data-source/storage';
import type { KLineItem, QuoteData, StockInfo } from '@/lib/data-source/types';
import type { TimePeriod } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DataSourceRequest {
  type: string;
  source: string;
  code: string;
  codes: string[];
  period: string;
  endTime?: number;
  limit: number;
}

interface SinaKLineRow {
  day: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

type TencentKLineRow = [string, string, string, string, string, string];

/** GET /api/data-source?type=kline&source=sina&code=600519&period=day */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  return handleDataSourceRequest({
    type: searchParams.get('type') || 'kline',
    source: searchParams.get('source') || 'sina',
    code: searchParams.get('code') || '',
    codes: searchParams.get('codes')?.split(',').filter(Boolean) || [],
    period: searchParams.get('period') || 'day',
    endTime: parseOptionalNumber(searchParams.get('endTime')),
    limit: parseLimit(searchParams.get('limit')),
  });
}

/** POST is retained for existing clients while GET remains the cache-friendly API. */
export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;
  const rawCodes = typeof body.codes === 'string' ? body.codes.split(',') : body.codes;
  return handleDataSourceRequest({
    type: typeof body.type === 'string' ? body.type : 'kline',
    source: typeof body.source === 'string' ? body.source : 'sina',
    code: typeof body.code === 'string' ? body.code : '',
    codes: Array.isArray(rawCodes) ? rawCodes.filter((code): code is string => typeof code === 'string') : [],
    period: typeof body.period === 'string' ? body.period : 'day',
    endTime: typeof body.endTime === 'number' ? body.endTime : undefined,
    limit: typeof body.limit === 'number' ? parseLimit(String(body.limit)) : 520,
  });
}

async function handleDataSourceRequest({ type, source, code, codes, period, endTime, limit }: DataSourceRequest) {

  try {
    if (type === 'kline') {
      const data = await fetchKLine(source, code, period);
      const persisted = await storeMarketBars({ source, symbol: code, interval: period }, data);
      return NextResponse.json({
        success: true,
        data,
        storage: { enabled: isMarketDataPersistenceEnabled(), persisted },
      });
    }
    if (type === 'quote') {
      const codeList = codes.length > 0 ? codes : [code].filter(Boolean);
      const quotes = await fetchQuotes(source, codeList);
      if (Object.keys(quotes).length === 0) throw new Error('行情源未返回有效报价');
      const persisted = await storeLatestQuotes(source, quotes);
      return NextResponse.json({
        success: true,
        data: quotes,
        storage: { enabled: isMarketDataPersistenceEnabled(), persisted },
      });
    }
    if (type === 'stock-list') {
      const stocks = await fetchStockList(source);
      return NextResponse.json({ success: true, data: stocks });
    }
    return NextResponse.json({ success: false, error: 'Unknown type' }, { status: 400 });
  } catch (err) {
    console.error(`[Data Source] ${source} fetch failed for ${code}:`, err);
    if (type === 'kline') {
      const cached = await loadMarketBars({ source, symbol: code, interval: period, endTime, limit });
      if (cached.length > 0) {
        return NextResponse.json({
          success: true,
          data: cached,
          cached: true,
          storage: { enabled: true, persisted: true },
        });
      }
      // 数据源和数据库缓存都不可用时才降级到模拟数据。
      const mock = generateMockKLineDataForStock(code || '600519', 200, period as TimePeriod);
      return NextResponse.json({ success: true, data: mock, fallback: true });
    }
    return NextResponse.json({ success: false, error: String(err) }, { status: 502 });
  }
}

function parseOptionalNumber(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parseLimit(value: string | null): number {
  const parsed = Number(value || 520);
  if (!Number.isFinite(parsed)) return 520;
  return Math.min(Math.max(Math.trunc(parsed), 1), 1000);
}

async function fetchKLine(source: string, code: string, period: string): Promise<KLineItem[]> {
  switch (source) {
    case 'sina': {
      const url = `https://quotes.sina.cn/cn/api/json_v2.php/CN_MarketData.getKLineData?symbol=${getSinaCode(code)}&scale=${getSinaScale(period)}&ma=no&datalen=520`;
      const res = await fetch(url, { next: { revalidate: 60 } });
      if (!res.ok) throw new Error(`新浪 K 线请求失败: ${res.status}`);
      const text = await res.text();
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed)) {
        const data = (parsed as SinaKLineRow[]).map((item) => ({
          timestamp: new Date(item.day.replace(/-/g, '/')).getTime(),
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseFloat(item.volume),
        })).filter(k => k.close > 0);
        if (data.length > 0) return data;
      }
      throw new Error('新浪 K 线返回为空');
    }
    case 'tencent': {
      const url = getTencentKLineUrl(code, period);
      const res = await fetch(url, { next: { revalidate: 60 } });
      if (!res.ok) throw new Error(`腾讯 K 线请求失败: ${res.status}`);
      const json = await res.json() as {
        data?: Record<string, Record<string, unknown>>;
      };
      const data = json.data?.[getTencentCode(code)];
      // Tencent 返回结构: { data: { 'sh600519': { day: [...], week: [...], ... } } }
      const periodMap: Record<string, string> = { day: 'day', week: 'week', month: 'month', '60min': 'm60', '30min': 'm30' };
      const key = periodMap[period] || 'day';
      const kline = data?.[key] || data?.['qfq' + key] || [];
      if (Array.isArray(kline)) {
        const result = (kline as TencentKLineRow[]).map((item) => ({
          timestamp: new Date((item[0] as string).replace(/-/g, '/')).getTime(),
          open: parseFloat(item[1]),
          close: parseFloat(item[2]),
          high: parseFloat(item[3]),
          low: parseFloat(item[4]),
          volume: parseFloat(item[5]) || 0,
        })).filter(k => k.close > 0);
        if (result.length > 0) return result;
      }
      throw new Error('腾讯 K 线返回为空');
    }
    case 'yahoo': {
      const url = getYahooKLineUrl(code, period);
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 60 },
      });
      if (!res.ok) throw new Error(`Yahoo K 线请求失败: ${res.status}`);
      const json = await res.json();
      const data = parseYahooKLine(json);
      if (data.length === 0) throw new Error('Yahoo K 线返回为空');
      return data;
    }
    default:
      throw new Error(`Unknown source: ${source}`);
  }
}

async function fetchQuotes(source: string, codes: string[]): Promise<Record<string, QuoteData>> {
  switch (source) {
    case 'sina': {
      const url = getSinaQuoteUrl(codes);
      const res = await fetch(url, {
        headers: { 'Referer': 'https://finance.sina.com.cn' },
      });
      if (!res.ok) throw new Error(`新浪行情请求失败: ${res.status}`);
      const text = await res.text();
      const results: Record<string, QuoteData> = {};
      // Split by var hq_str_ marker
      const lines = text.split('var ');
      for (const line of lines) {
        if (!line.includes('hq_str_')) continue;
        const matchedCode = line.match(/hq_str_(\w+)="([^"]+)"/);
        if (!matchedCode) continue;
        const rawCode = getCleanCode(matchedCode[1]);
        const quote = parseSinaRealTime(`"${matchedCode[2]}"`);
        if (quote) results[rawCode] = quote;
      }
      return results;
    }
    case 'tencent': {
      const url = getTencentQuoteUrl(codes);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`腾讯行情请求失败: ${res.status}`);
      const text = await res.text();
      const results: Record<string, QuoteData> = {};
      const lines = text.split('\n').filter(Boolean);
      for (const line of lines) {
        const match = line.match(/v_(\w+)="([^"]+)"/);
        if (!match) continue;
        const rawCode = getCleanCode(match[1]);
        const quote = parseTencentRealTime(`"${match[2]}"`);
        if (quote) results[rawCode] = quote;
      }
      return results;
    }
    case 'yahoo': {
      const results: Record<string, QuoteData> = {};
      for (const code of codes) {
        try {
          const url = getYahooQuoteUrl(code);
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
          });
          if (!res.ok) continue;
          const json = await res.json();
          const result = json?.chart?.result?.[0];
          if (result) {
            const meta = result.meta;
            const quotes = result.indicators?.quote?.[0];
            const closes = quotes?.close?.filter((v: number | null) => v !== null) || [];
            const opens = quotes?.open?.filter((v: number | null) => v !== null) || [];
            const highs = quotes?.high?.filter((v: number | null) => v !== null) || [];
            const lows = quotes?.low?.filter((v: number | null) => v !== null) || [];
            const volumes = quotes?.volume?.filter((v: number | null) => v !== null) || [];
            const len = closes.length;
            if (len >= 2) {
              const yesterdayClose = closes[len - 2];
              const currentPrice = closes[len - 1];
              results[code] = {
                price: currentPrice,
                change: currentPrice - yesterdayClose,
                changePercent: yesterdayClose ? ((currentPrice - yesterdayClose) / yesterdayClose * 100) : 0,
                open: opens[len - 1] || currentPrice,
                high: highs[len - 1] || currentPrice,
                low: lows[len - 1] || currentPrice,
                volume: volumes[len - 1] || 0,
                yesterdayClose,
              };
            }
          }
        } catch { /* skip failed */ }
      }
      return results;
    }
    default:
      throw new Error(`Unknown source: ${source}`);
  }
}

async function fetchStockList(source: string): Promise<StockInfo[]> {
  switch (source) {
    case 'sina': {
      // 并行拉取所有分页（新浪每页最多 100 条），总页数约 56 页
      const pageNumbers = Array.from({ length: SINA_STOCK_LIST_TOTAL_PAGES }, (_, i) => i + 1);
      const results = await Promise.allSettled(
        pageNumbers.map((page) =>
          fetch(getSinaStockListUrl(page), {
            headers: { 'Referer': 'https://finance.sina.com.cn' },
          }).then(async (res) => {
            if (!res.ok) return [] as StockInfo[];
            const text = await res.text();
            const parsed: unknown = JSON.parse(text);
            return parseSinaStockList(parsed);
          }).catch(() => [] as StockInfo[])
        )
      );

      const allStocks: StockInfo[] = [];
      const seen = new Set<string>();
      for (const result of results) {
        if (result.status === 'fulfilled') {
          for (const stock of result.value) {
            if (!seen.has(stock.code)) {
              seen.add(stock.code);
              allStocks.push(stock);
            }
          }
        }
      }

      allStocks.sort((a, b) => a.code.localeCompare(b.code));

      // 追加 ETF 列表（新浪 hs_a 接口不包含 ETF 品种）
      for (const etf of ALL_ETFS) {
        if (!seen.has(etf.code)) {
          seen.add(etf.code);
          allStocks.push({ code: etf.code, name: etf.name });
        }
      }
      allStocks.sort((a, b) => a.code.localeCompare(b.code));

      if (allStocks.length === 0) throw new Error('新浪股票列表返回为空');
      return allStocks;
    }
    case 'tencent': {
      // 腾讯不支持全量查询，退回到新浪源
      return fetchStockList('sina');
    }
    default:
      throw new Error(`股票列表暂不支持 ${source} 数据源`);
  }
}

function getSinaCode(code: string): string {
  // 沪市: 6开头主板, 5开头ETF(含510~518/560~563/588), 9开头B股
  // 深市: 0开头主板, 1开头ETF(含159等), 2开头创业板, 3开头科创板
  if (code.startsWith('6') || code.startsWith('5') || code.startsWith('9')) return `sh${code}`;
  return `sz${code}`;
}

function getTencentCode(code: string): string {
  if (code.startsWith('6') || code.startsWith('5') || code.startsWith('9')) return `sh${code}`;
  return `sz${code}`;
}

function getCleanCode(raw: string): string {
  return raw.replace(/^(sh|sz)/, '');
}
