import { NextRequest, NextResponse } from 'next/server';
import { parseSinaRealTime, parseTencentRealTime, parseYahooKLine } from '@/lib/data-source/parsers';
import { getSinaQuoteUrl, getSinaScale } from '@/lib/data-source/adapters/sina';
import { getTencentQuoteUrl, getTencentKLineUrl } from '@/lib/data-source/adapters/tencent';
import { getYahooKLineUrl, getYahooQuoteUrl } from '@/lib/data-source/adapters/yahoo';
import { generateMockKLineDataForStock } from '@/lib/kline-data';
import type { KLineItem, QuoteData } from '@/lib/data-source/types';
import type { TimePeriod } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DataSourceRequest {
  type: string;
  source: string;
  code: string;
  codes: string[];
  period: string;
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
  });
}

async function handleDataSourceRequest({ type, source, code, codes, period }: DataSourceRequest) {

  try {
    if (type === 'kline') {
      const data = await fetchKLine(source, code, period);
      return NextResponse.json({ success: true, data });
    }
    if (type === 'quote') {
      const codeList = codes.length > 0 ? codes : [code].filter(Boolean);
      const quotes = await fetchQuotes(source, codeList);
      if (Object.keys(quotes).length === 0) throw new Error('行情源未返回有效报价');
      return NextResponse.json({ success: true, data: quotes });
    }
    return NextResponse.json({ success: false, error: 'Unknown type' }, { status: 400 });
  } catch (err) {
    console.error(`[Data Source] ${source} fetch failed for ${code}:`, err);
    // 降级：返回模拟数据
    if (type === 'kline') {
      const mock = generateMockKLineDataForStock(code || '600519', 200, period as TimePeriod);
      return NextResponse.json({ success: true, data: mock, fallback: true });
    }
    return NextResponse.json({ success: false, error: String(err) }, { status: 502 });
  }
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

function getSinaCode(code: string): string {
  return `${code.startsWith('6') ? 'sh' : 'sz'}${code}`;
}

function getTencentCode(code: string): string {
  return `${code.startsWith('6') ? 'sh' : 'sz'}${code}`;
}

function getCleanCode(raw: string): string {
  return raw.replace(/^(sh|sz)/, '');
}
