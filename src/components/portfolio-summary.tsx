'use client';

import type { HoldingWithPnL } from '@/lib/types';
import { RefreshCw } from 'lucide-react';

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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 px-4 py-3">
      {/* 总资产 */}
      <div className="min-w-0 bg-card rounded-xl p-3 sm:p-3.5">
        <div className="text-[11px] text-muted-foreground mb-1.5 tracking-tight">持仓总市值</div>
        <div className="text-[clamp(1.125rem,3vw,1.5rem)] font-semibold text-foreground font-mono tracking-tight">
          {totalMarketValue.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* 总盈亏 */}
      <div className="min-w-0 bg-card rounded-xl p-3 sm:p-3.5">
        <div className="text-[11px] text-muted-foreground mb-1.5 tracking-tight">总盈亏</div>
        <div className={`min-w-0 text-[clamp(1.125rem,3vw,1.5rem)] font-semibold font-mono tracking-tight ${isUp ? 'text-[#30d158]' : 'text-[#ff453a]'}`}>
          <span className="block lg:inline">
            {isUp ? '+' : ''}{totalPnL.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className="mt-0.5 block text-xs font-medium lg:ml-1 lg:mt-0 lg:inline lg:text-sm">
            ({isUp ? '+' : ''}{totalPnLPercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* 日盈亏 */}
      <div className="min-w-0 bg-card rounded-xl p-3 sm:p-3.5">
        <div className="text-[11px] text-muted-foreground mb-1.5 tracking-tight">估算日盈亏</div>
        <div className={`text-[clamp(1.125rem,3vw,1.5rem)] font-semibold font-mono tracking-tight ${dailyIsUp ? 'text-[#30d158]' : 'text-[#ff453a]'}`}>
          {dailyIsUp ? '+' : ''}{dailyPnL.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* 持仓数量 + 刷新 */}
      <div className="min-w-0 bg-card rounded-xl p-3 sm:p-3.5 flex flex-col">
        <div className="text-[11px] text-muted-foreground mb-1.5 tracking-tight">持仓数</div>
        <div className="flex items-center justify-between">
          <span className="text-[clamp(1.125rem,3vw,1.5rem)] font-semibold text-foreground font-mono tracking-tight">{holdings.length}</span>
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 text-xs text-[#0a84ff] hover:text-[#0a84ff]/80 transition-colors px-2 py-1 rounded-lg hover:bg-muted/60"
            title="模拟行情变化"
          >
            <RefreshCw className="w-3 h-3" />
            刷新
          </button>
        </div>
      </div>
    </div>
  );
}
