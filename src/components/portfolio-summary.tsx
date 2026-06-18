'use client';

import type { HoldingWithPnL } from '@/lib/types';

interface PortfolioSummaryProps {
  holdings: HoldingWithPnL[];
  totalCost: number;
  totalMarketValue: number;
  totalPnL: number;
  totalPnLPercent: number;
  dailyPnL: number;
  onRefresh: () => void;
}

export default function PortfolioSummary({
  holdings,
  totalCost,
  totalMarketValue,
  totalPnL,
  totalPnLPercent,
  dailyPnL,
  onRefresh,
}: PortfolioSummaryProps) {
  const isUp = totalPnL >= 0;
  const dailyIsUp = dailyPnL >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 py-3">
      {/* 总资产 */}
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
        <div className="text-xs text-slate-400 mb-1">持仓总市值</div>
        <div className="text-xl md:text-2xl font-bold text-slate-100 font-mono">
          {totalMarketValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* 总盈亏 */}
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
        <div className="text-xs text-slate-400 mb-1">总盈亏</div>
        <div className={`text-xl md:text-2xl font-bold font-mono ${isUp ? 'text-green-400' : 'text-red-400'}`}>
          {isUp ? '+' : ''}{totalPnL.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-sm ml-1">
            ({isUp ? '+' : ''}{totalPnLPercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* 日盈亏 */}
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
        <div className="text-xs text-slate-400 mb-1">估算日盈亏</div>
        <div className={`text-xl md:text-2xl font-bold font-mono ${dailyIsUp ? 'text-green-400' : 'text-red-400'}`}>
          {dailyIsUp ? '+' : ''}{dailyPnL.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* 持仓数量 */}
      <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 flex flex-col">
        <div className="text-xs text-slate-400 mb-1">持仓数</div>
        <div className="flex items-center justify-between">
          <span className="text-xl md:text-2xl font-bold text-slate-100 font-mono">{holdings.length}</span>
          <button
            onClick={onRefresh}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded hover:bg-blue-400/10"
            title="模拟行情变化"
          >
            刷新行情
          </button>
        </div>
      </div>
    </div>
  );
}