'use client';

import { useCallback, useEffect, useState } from 'react';
import type { QuoteData, StockInfo } from '@/lib/data-source/types';
import type { WatchlistItem } from '@/lib/types';
import { getStockBasePrice } from '@/lib/kline-data';
import { useAuth } from '@/components/auth-provider';
import {
  deleteCloudWatchlistItem,
  fetchCloudWatchlist,
  upsertCloudWatchlist,
} from '@/lib/cloud-storage';

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
  const { configured, user } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const local = loadWatchlist();
    if (configured && user) {
      const migrationKey = `portfolio-watchlist-cloud-migrated:${user.id}`;
      void fetchCloudWatchlist(user.id).then(async (remote) => {
        const alreadyMigrated = localStorage.getItem(migrationKey) === '1';
        let next = remote;
        if (remote.length === 0 && !alreadyMigrated && local.length > 0) {
          await upsertCloudWatchlist(user.id, local);
          next = local;
        }
        localStorage.setItem(migrationKey, '1');
        if (!cancelled) {
          setWatchlist(next);
          saveWatchlist(next);
        }
      }).catch((error) => {
        console.error('加载云端自选失败，暂用本地缓存', error);
        if (!cancelled) setWatchlist(local);
      });
    } else {
      setWatchlist(local);
    }
    return () => { cancelled = true; };
  }, [configured, user]);

  const addWatchlistItem = useCallback((stock: StockInfo) => {
    setWatchlist((current) => {
      if (current.some((item) => item.code === stock.code)) return current;
      const initialPrice = stock.yesterdayClose || stock.open || getStockBasePrice(stock.code);
      const newItem: WatchlistItem = {
        code: stock.code,
        name: stock.name,
        currentPrice: initialPrice,
        change: 0,
        changePercent: 0,
        updatedAt: new Date().toISOString(),
      };
      const next = [...current, newItem];
      saveWatchlist(next);
      if (user) void upsertCloudWatchlist(user.id, [newItem]).catch(console.error);
      return next;
    });
  }, [user]);

  const removeWatchlistItem = useCallback((code: string) => {
    setWatchlist((current) => {
      const next = current.filter((item) => item.code !== code);
      saveWatchlist(next);
      if (user) void deleteCloudWatchlistItem(user.id, code).catch(console.error);
      return next;
    });
  }, [user]);

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
      if (changed) {
        saveWatchlist(next);
        if (user) void upsertCloudWatchlist(user.id, next).catch(console.error);
      }
      return changed ? next : current;
    });
  }, [user]);

  return { watchlist, addWatchlistItem, removeWatchlistItem, updateWatchlistQuotes };
}
