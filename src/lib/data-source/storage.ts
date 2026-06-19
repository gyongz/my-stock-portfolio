import { and, desc, eq, lte, sql } from 'drizzle-orm';
import { getDatabase } from '@/lib/db/client';
import { dataSyncState, latestQuotes, marketBars } from '@/lib/db/schema';
import type { KLineItem, QuoteData } from './types';

interface BarStorageKey {
  source: string;
  symbol: string;
  interval: string;
}

interface LoadBarsOptions extends BarStorageKey {
  endTime?: number;
  limit?: number;
}

export async function storeMarketBars(key: BarStorageKey, bars: KLineItem[]): Promise<boolean> {
  const db = getDatabase();
  if (!db || bars.length === 0) return false;

  try {
    await db.insert(marketBars).values(bars.map((bar) => ({
      ...key,
      timestamp: bar.timestamp,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume || 0,
    }))).onConflictDoUpdate({
      target: [marketBars.source, marketBars.symbol, marketBars.interval, marketBars.timestamp],
      set: {
        open: sql`excluded.open`,
        high: sql`excluded.high`,
        low: sql`excluded.low`,
        close: sql`excluded.close`,
        volume: sql`excluded.volume`,
        storedAt: sql`now()`,
      },
    });

    const lastTimestamp = Math.max(...bars.map((bar) => bar.timestamp));
    await db.insert(dataSyncState).values({
      ...key,
      lastTimestamp,
      rowsStored: bars.length,
      status: 'success',
    }).onConflictDoUpdate({
      target: [dataSyncState.source, dataSyncState.symbol, dataSyncState.interval],
      set: {
        lastTimestamp,
        rowsStored: bars.length,
        status: 'success',
        error: null,
        updatedAt: sql`now()`,
      },
    });
    return true;
  } catch (error) {
    console.warn('[Market Storage] failed to persist bars:', error);
    return false;
  }
}

export async function loadMarketBars({
  source,
  symbol,
  interval,
  endTime,
  limit = 520,
}: LoadBarsOptions): Promise<KLineItem[]> {
  const db = getDatabase();
  if (!db) return [];

  try {
    const conditions = [
      eq(marketBars.source, source),
      eq(marketBars.symbol, symbol),
      eq(marketBars.interval, interval),
    ];
    if (endTime) conditions.push(lte(marketBars.timestamp, endTime));

    const rows = await db.select({
      timestamp: marketBars.timestamp,
      open: marketBars.open,
      high: marketBars.high,
      low: marketBars.low,
      close: marketBars.close,
      volume: marketBars.volume,
    }).from(marketBars)
      .where(and(...conditions))
      .orderBy(desc(marketBars.timestamp))
      .limit(Math.min(Math.max(limit, 1), 1000));

    return rows.reverse();
  } catch (error) {
    console.warn('[Market Storage] failed to read bars:', error);
    return [];
  }
}

export async function storeLatestQuotes(
  source: string,
  quotes: Record<string, QuoteData>
): Promise<boolean> {
  const db = getDatabase();
  const entries = Object.entries(quotes);
  if (!db || entries.length === 0) return false;

  try {
    await db.insert(latestQuotes)
      .values(entries.map(([symbol, quote]) => ({ source, symbol, ...quote })))
      .onConflictDoUpdate({
        target: [latestQuotes.source, latestQuotes.symbol],
        set: {
          price: sql`excluded.price`,
          change: sql`excluded.change`,
          changePercent: sql`excluded.change_percent`,
          open: sql`excluded.open`,
          high: sql`excluded.high`,
          low: sql`excluded.low`,
          volume: sql`excluded.volume`,
          yesterdayClose: sql`excluded.yesterday_close`,
          updatedAt: sql`now()`,
        },
      });
    return true;
  } catch (error) {
    console.warn('[Market Storage] failed to persist quotes:', error);
    return false;
  }
}
