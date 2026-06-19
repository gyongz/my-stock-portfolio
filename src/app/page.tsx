'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Plus, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePortfolio } from '@/hooks/use-portfolio';
import HoldingsTable from '@/components/holdings-table';
import HoldingsDialog from '@/components/holdings-dialog';
import PortfolioSummary from '@/components/portfolio-summary';
import ImportExport from '@/components/import-export';
import type { Holding, HoldingWithPnL } from '@/lib/types';
import { getStockName, getStockBasePrice } from '@/lib/kline-data';

// 动态导入图表组件（避免 SSR 问题）
const KLineChart = dynamic(() => import('@/components/kline-chart'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[400px] text-slate-500">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">加载图表中...</span>
      </div>
    </div>
  ),
});

export default function Home() {
  const {
    holdings,
    holdingsWithPnL,
    totalStats,
    dailyPnL,
    addHolding,
    updateHolding,
    removeHolding,
    refreshPrices,
    importHoldings,
  } = usePortfolio();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [selectedHolding, setSelectedHolding] = useState<HoldingWithPnL | null>(null);
  const [showChart, setShowChart] = useState(true);
  const [sideCollapsed, setSideCollapsed] = useState(false);

  /** 打开添加持仓弹窗 */
  const handleOpenAdd = useCallback(() => {
    setEditingHolding(null);
    setDialogOpen(true);
  }, []);

  /** 打开编辑持仓弹窗 */
  const handleOpenEdit = useCallback((holding: Holding) => {
    setEditingHolding(holding);
    setDialogOpen(true);
  }, []);

  /** 提交表单（新增或编辑） */
  const handleSubmit = useCallback(
    (data: Pick<Holding, 'code' | 'name' | 'quantity' | 'buyPrice' | 'currentPrice'>) => {
      if (editingHolding) {
        updateHolding(editingHolding.id, data);
      } else {
        addHolding(data);
      }
    },
    [editingHolding, addHolding, updateHolding]
  );

  /** 选择持仓记录 - 用于图表联动 */
  const handleSelectHolding = useCallback(
    (holding: HoldingWithPnL) => {
      setSelectedHolding(holding);
    },
    []
  );

  /** 获取当前选中股票的代码 */
  const displayCode = selectedHolding?.code || holdings[0]?.code || '000333';
  const displayName = selectedHolding?.name || getStockName(displayCode);
  const displayPrice = selectedHolding?.currentPrice ?? getStockBasePrice(displayCode);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* 顶栏 */}
      <header className="border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 h-12">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-5 h-5 text-blue-400" />
            <h1 className="text-base font-semibold text-slate-100 hidden sm:block">
              个人持仓管理
            </h1>
            <Badge variant="outline" className="text-xs text-slate-500 border-slate-700">
              模拟演示
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <ImportExport holdings={holdings} onImport={importHoldings} />
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="bg-blue-600 hover:bg-blue-700 text-white h-8"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              添加持仓
            </Button>
          </div>
        </div>
      </header>

      {/* 统计摘要 */}
      <PortfolioSummary
        holdings={holdingsWithPnL}
        totalCost={totalStats.totalCost}
        totalMarketValue={totalStats.totalMarketValue}
        totalPnL={totalStats.totalPnL}
        totalPnLPercent={totalStats.totalPnLPercent}
        dailyPnL={dailyPnL}
        onRefresh={refreshPrices}
      />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col xl:flex-row gap-0 relative">
        {/* KLine 图表区域 */}
        {showChart && (
          <div className={`border-b xl:border-b-0 xl:border-r border-slate-700/50 bg-slate-900 relative ${
            sideCollapsed ? 'xl:flex-1' : 'xl:w-[65%]'
          }`}>
            <KLineChart
              stockCode={displayCode}
              stockName={displayName}
              currentPrice={displayPrice}
            />
            {/* 收起/展开侧栏按钮 */}
            <button
              onClick={() => setSideCollapsed((v) => !v)}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-5 h-10 rounded-r-md flex items-center justify-center
                         bg-slate-800 border border-slate-600/50 border-l-0 text-slate-400 hover:text-slate-200 hover:bg-slate-700
                         transition-colors cursor-pointer hidden xl:flex"
              title={sideCollapsed ? '展开持仓列表' : '收起持仓列表'}
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${sideCollapsed ? '' : 'rotate-180'}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>
        )}

        {/* 持仓列表区域 */}
        <div className={`flex flex-col min-w-0 ${
          sideCollapsed ? 'xl:w-[180px]' : 'xl:flex-1'
        }`}>
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
            <h3 className="text-sm font-medium text-slate-300">
              持仓列表
              <span className="text-xs text-slate-500 ml-2">
                {holdings.length} 只
              </span>
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-slate-400 hover:text-slate-200 h-7 xl:hidden"
              onClick={() => setShowChart(!showChart)}
            >
              {showChart ? '隐藏图表' : '显示图表'}
            </Button>
          </div>
          <div className="flex-1 overflow-auto">
            <HoldingsTable
              holdings={holdingsWithPnL}
              onEdit={handleOpenEdit}
              onDelete={removeHolding}
              onSelect={handleSelectHolding}
              selectedId={selectedHolding?.id}
              collapsed={sideCollapsed}
            />
          </div>

          {/* 底部操作提示 */}
          {holdings.length > 0 && !sideCollapsed && (
            <div className="px-4 py-2 border-t border-slate-700/50 text-xs text-slate-500 text-center">
              点击任一行可在图表中查看 K 线 • 支持缩放平移 • 周期和指标可切换
            </div>
          )}
        </div>
      </div>

      {/* 添加/编辑持仓弹窗 */}
      <HoldingsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        editingHolding={editingHolding}
      />
    </div>
  );
}