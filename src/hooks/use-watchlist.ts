'use client';

import { useCallback, useEffect, useState } from 'react';
import type { QuoteData, StockInfo } from '@/lib/data-source/types';
import type { WatchlistItem } from '@/lib/types';
import { getStockBasePrice } from '@/lib/kline-data';

const STORAGE_KEY = 'portfolio-watchlist';

function loadWatchlist(): WatchlistItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed as WatchlistItem[] : [];
  } catch {
    return [];
  }
}

function saveWatchlist(items: WatchlistItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    setWatchlist(loadWatchlist());
  }, []);

  const addWatchlistItem = useCallback((stock: StockInfo) => {
    setWatchlist((current) => {
      if (current.some((item) => item.code === stock.code)) return current;
      const initialPrice = stock.yesterdayClose || stock.open || getStockBasePrice(stock.code);
      const next = [...current, {
        code: stock.code,
        name: stock.name,
        currentPrice: initialPrice,
        change: 0,
        changePercent: 0,
        updatedAt: new Date().toISOString(),
      }];
      saveWatchlist(next);
      return next;
    });
  }, []);

  const removeWatchlistItem = useCallback((code: string) => {
    setWatchlist((current) => {
      const next = current.filter((item) => item.code !== code);
      saveWatchlist(next);
      return next;
    });
  }, []);

  const updateWatchlistQuotes = useCallback((quotes: Record<string, QuoteData>) => {
    setWatchlist((current) => {
      let changed = false;
      const next = current.map((item) => {
        const quote = quotes[item.code];
        if (!quote) return item;
        changed = true;
        return {
          ...item,
          currentPrice: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          updatedAt: new Date().toISOString(),
        };
      });
      if (changed) saveWatchlist(next);
      return changed ? next : current;
    });
  }, []);

  return { watchlist, addWatchlistItem, removeWatchlistItem, updateWatchlistQuotes };
}
