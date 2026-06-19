import { NextRequest, NextResponse } from 'next/server';
import { parseSinaRealTime, parseSinaKLine, parseTencentRealTime, parseYahooKLine } from '@/lib/data-source/parsers';
import { getSinaQuoteUrl, getSinaKLineUrl, getSinaScale } from '@/lib/data-source/adapters/sina';
import { getTencentQuoteUrl, getTencentKLineUrl } from '@/lib/data-source/adapters/tencent';
import { getYahooKLineUrl, getYahooQuoteUrl } from '@/lib/data-source/adapters/yahoo';
import { generateMockKLineDataForStock } from '@/lib/kline-data';
import type { KLineItem, QuoteData } from '@/lib/data-source/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/data-source?type=kline&source=sina&code=600519&period=day */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'kline';
  const source = searchParams.get('source') || 'sina';
  const code = searchParams.get('code') || '';
  const period = searchParams.get('period') || 'day';

  try {
    if (type === 'kline') {
      const data = await fetchKLine(source, code, period);
      return NextResponse.json({ success: true, data });
    }
    if (type === 'quote') {
      const codeList = searchParams.get('codes')?.split(',').filter(Boolean) || [code];
      const quotes = await fetchQuotes(source, codeList);
      return NextResponse.json({ success: true, data: quotes });
    }
    return NextResponse.json({ success: false, error: 'Unknown type' }, { status: 400 });
  } catch (err) {
    console.error(`[Data Source] ${source} fetch failed for ${code}:`, err);
    // 降级：返回模拟数据
    if (type === 'kline') {
      const mock = generateMockKLineDataForStock(code || '600519', 200, period as any);
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
      const text = await res.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          timestamp: new Date(item.day.replace(/-/g, '/')).getTime(),
          open: parseFloat(item.open),
          high: parseFloat(item.high),
          low: parseFloat(item.low),
          close: parseFloat(item.close),
          volume: parseFloat(item.volume),
        })).filter(k => k.close > 0);
      }
      return [];
    }
    case 'tencent': {
      const url = getTencentKLineUrl(code, period);
      const res = await fetch(url, { next: { revalidate: 60 } });
      const json = await res.json();
      const data = json?.data?.[getTencentCode(code)];
      // Tencent 返回结构: { data: { 'sh600519': { day: [...], week: [...], ... } } }
      const periodMap: Record<string, string> = { day: 'day', week: 'week', month: 'month', '60min': '60min', '30min': '30min' };
      const key = periodMap[period] || 'day';
      const kline = data?.[key] || data?.['qfq' + key] || [];
      if (Array.isArray(kline)) {
        return kline.map((item: any) => ({
          timestamp: new Date((item[0] as string).replace(/-/g, '/')).getTime(),
          open: parseFloat(item[1]),
          close: parseFloat(item[2]),
          high: parseFloat(item[3]),
          low: parseFloat(item[4]),
          volume: parseFloat(item[5]) || 0,
        })).filter(k => k.close > 0);
      }
      return [];
    }
    case 'yahoo': {
      const url = getYahooKLineUrl(code, period);
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        next: { revalidate: 60 },
      });
      const json = await res.json();
      return parseYahooKLine(json);
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