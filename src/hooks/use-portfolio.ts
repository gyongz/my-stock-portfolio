'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Holding, HoldingWithPnL } from '@/lib/types';
import { getStockName, getStockBasePrice } from '@/lib/kline-data';

const STORAGE_KEY = 'portfolio-holdings';

/** 生成唯一 ID */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 加载本地存储的持仓数据 */
function loadHoldings(): Holding[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Holding[];
  } catch {
    return [];
  }
}

/** 保存持仓数据到本地存储 */
function saveHoldings(holdings: Holding[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  } catch {
    // ignore
  }
}

/** 计算持仓盈亏 */
function calcPnL(holding: Holding, prevPrice?: number): HoldingWithPnL {
  const costTotal = holding.buyPrice * holding.quantity;
  const marketValue = holding.currentPrice * holding.quantity;
  const pnl = marketValue - costTotal;
  const pnlPercent = costTotal > 0 ? (pnl / costTotal) * 100 : 0;
  const prev = prevPrice ?? holding.currentPrice;
  const dailyChange = holding.currentPrice - prev;
  const dailyChangePercent = prev > 0 ? (dailyChange / prev) * 100 : 0;
  return {
    ...holding,
    costTotal: Math.round(costTotal * 100) / 100,
    marketValue: Math.round(marketValue * 100) / 100,
    pnl: Math.round(pnl * 100) / 100,
    pnlPercent: Math.round(pnlPercent * 100) / 100,
    dailyChange: Math.round(dailyChange * 100) / 100,
    dailyChangePercent: Math.round(dailyChangePercent * 100) / 100,
  };
}

/** 计算相对上一价格快照的当日盈亏 */
function calculateDailyPnL(holdings: Holding[], prevPrices: Record<string, number>): number {
  const total = holdings.reduce((sum, item) => {
    const prev = prevPrices[item.id] ?? item.currentPrice;
    return sum + (item.currentPrice - prev) * item.quantity;
  }, 0);
  return Math.round(total * 100) / 100;
}

/** 默认示例持仓数据 */
const DEFAULT_HOLDINGS: Holding[] = [
  { id: generateId(), code: '000333', name: '美的集团', quantity: 500, buyPrice: 58.20, currentPrice: 65.80, updatedAt: new Date().toISOString() },
  { id: generateId(), code: '600519', name: '贵州茅台', quantity: 100, buyPrice: 1620.00, currentPrice: 1580.00, updatedAt: new Date().toISOString() },
  { id: generateId(), code: '300750', name: '宁德时代', quantity: 200, buyPrice: 185.00, currentPrice: 198.50, updatedAt: new Date().toISOString() },
  { id: generateId(), code: '601318', name: '中国平安', quantity: 800, buyPrice: 42.50, currentPrice: 45.30, updatedAt: new Date().toISOString() },
  { id: generateId(), code: '000858', name: '五粮液', quantity: 300, buyPrice: 145.00, currentPrice: 138.20, updatedAt: new Date().toISOString() },
];

export function usePortfolio() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dailyPnL, setDailyPnL] = useState(0);
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>({});

  // 初始化加载
  useEffect(() => {
    const stored = loadHoldings();
    if (stored.length === 0) {
      // 首次使用，写入默认示例
      saveHoldings(DEFAULT_HOLDINGS);
      setHoldings(DEFAULT_HOLDINGS);
      // 初始化昨日价格
      const prev: Record<string, number> = {};
      DEFAULT_HOLDINGS.forEach((h) => {
        prev[h.id] = h.currentPrice * (0.98 + Math.random() * 0.04);
      });
      setPrevPrices(prev);
      setDailyPnL(calculateDailyPnL(DEFAULT_HOLDINGS, prev));
    } else {
      setHoldings(stored);
      const prev: Record<string, number> = {};
      stored.forEach((h) => {
        prev[h.id] = h.currentPrice * (0.98 + Math.random() * 0.04);
      });
      setPrevPrices(prev);
      setDailyPnL(calculateDailyPnL(stored, prev));
    }
    setLoaded(true);
  }, []);

  // 持有带盈亏计算的数据
  const holdingsWithPnL: HoldingWithPnL[] = holdings.map((h) =>
    calcPnL(h, prevPrices[h.id])
  );

  // 总统计
  const totalStats = {
    totalCost: Math.round(holdingsWithPnL.reduce((sum, h) => sum + h.costTotal, 0) * 100) / 100,
    totalMarketValue: Math.round(holdingsWithPnL.reduce((sum, h) => sum + h.marketValue, 0) * 100) / 100,
    totalPnL: Math.round(holdingsWithPnL.reduce((sum, h) => sum + h.pnl, 0) * 100) / 100,
    totalPnLPercent: (() => {
      const cost = holdingsWithPnL.reduce((sum, h) => sum + h.costTotal, 0);
      const mv = holdingsWithPnL.reduce((sum, h) => sum + h.marketValue, 0);
      return cost > 0 ? Math.round(((mv - cost) / cost) * 10000) / 100 : 0;
    })(),
    };
    // dailyPnL 作为独立状态由 refreshPrices 更新

  /** 添加持仓 */
  const addHolding = useCallback((holding: Omit<Holding, 'id' | 'updatedAt'>) => {
    const newHolding: Holding = {
      ...holding,
      id: generateId(),
      updatedAt: new Date().toISOString(),
    };
    setHoldings((prev) => {
      const next = [...prev, newHolding];
      saveHoldings(next);
      return next;
    });
  }, []);

  /** 更新持仓 */
  const updateHolding = useCallback((id: string, updates: Partial<Omit<Holding, 'id' | 'updatedAt'>>) => {
    setHoldings((prev) => {
      const next = prev.map((h) =>
        h.id === id
          ? { ...h, ...updates, name: updates.code ? getStockName(updates.code) : h.name, updatedAt: new Date().toISOString() }
          : h
      );
      saveHoldings(next);
      return next;
    });
  }, []);

  /** 删除持仓 */
  const removeHolding = useCallback((id: string) => {
    setHoldings((prev) => {
      const next = prev.filter((h) => h.id !== id);
      saveHoldings(next);
      return next;
    });
  }, []);

  /** 刷新当前价格（支持传入真实行情报价） */
  const refreshPrices = useCallback((quotes?: Record<string, number>) => {
    setHoldings((prev) => {
      // 先保存旧的作为前一日价格
      const oldPrices: Record<string, number> = {};
      prev.forEach((h) => { oldPrices[h.id] = h.currentPrice; });

      const next = prev.map((h) => {
        let newPrice: number;
        if (quotes && quotes[h.code] !== undefined) {
          newPrice = quotes[h.code];
        } else {
          const change = (Math.random() - 0.5) * 0.04;
          newPrice = Math.round(h.currentPrice * (1 + change) * 100) / 100;
        }
        return { ...h, currentPrice: newPrice, updatedAt: new Date().toISOString() };
      });
      saveHoldings(next);

      // 更新刷新前价格（下次刷新时作为对比快照）
      setPrevPrices(oldPrices);

      // 计算日盈亏（新价格 vs 旧价格）
      const daily = next.reduce((sum, h) => {
        const oldPrice = oldPrices[h.id] ?? h.currentPrice;
        return sum + (h.currentPrice - oldPrice) * h.quantity;
      }, 0);
      setDailyPnL(Math.round(daily * 100) / 100);

      return next;
    });
  }, []);

  /** 手动设置某只股票的当前价格 */
  const setCurrentPrice = useCallback((id: string, price: number) => {
    setHoldings((prev) => {
      const next = prev.map((h) =>
        h.id === id ? { ...h, currentPrice: price, updatedAt: new Date().toISOString() } : h
      );
      saveHoldings(next);
      return next;
    });
  }, []);

  /** 导入持仓数据（替换全部） */
  const importHoldings = useCallback((data: Holding[]) => {
    setHoldings(data);
    saveHoldings(data);
  }, []);

  /** 获取当前价格（用于图表显示时取当前价格变化） */
  const getCurrentPrice = useCallback(
    (code: string): number => {
      const h = holdings.find((h) => h.code === code);
      return h?.currentPrice ?? getStockBasePrice(code);
    },
    [holdings]
  );

  return {
    holdings,
    holdingsWithPnL,
    totalStats,
    loaded,
    addHolding,
    updateHolding,
    removeHolding,
    refreshPrices,
    setCurrentPrice,
    importHoldings,
    getCurrentPrice,
    dailyPnL,
  };
}
