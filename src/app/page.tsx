'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Plus, LayoutDashboard, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePortfolio } from '@/hooks/use-portfolio';
import HoldingsTable from '@/components/holdings-table';
import HoldingsDialog from '@/components/holdings-dialog';
import PortfolioSummary from '@/components/portfolio-summary';
import ImportExport from '@/components/import-export';
import DataSourceSelector from '@/components/data-source-selector';
import { DataSourceProvider, useDataSourceContext } from '@/lib/data-source/context';
import type { Holding, HoldingWithPnL } from '@/lib/types';
import type { DataSourceId, QuoteData } from '@/lib/data-source/types';
import { getStockName, getStockBasePrice } from '@/lib/kline-data';

// 动态导入图表组件（避免 SSR 问题）
const KLineChart = dynamic(() => import('@/components/kline-chart'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[400px] text-[#98989d]">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-[#30d158] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">加载图表中...</span>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <DataSourceProvider>
      <HomeContent />
    </DataSourceProvider>
  );
}

function HomeContent() {
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
  const { dataSourceId, setDataSource } = useDataSourceContext();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [selectedHolding, setSelectedHolding] = useState<HoldingWithPnL | null>(null);
  const [showChart, setShowChart] = useState(true);
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [marketStatus, setMarketStatus] = useState<'loading' | 'live' | 'fallback'>('loading');
  const [marketError, setMarketError] = useState<string | null>(null);

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
  const selectedHoldingLatest = selectedHolding
    ? holdingsWithPnL.find((holding) => holding.id === selectedHolding.id)
    : undefined;
  const displayCode = selectedHoldingLatest?.code || holdings[0]?.code || '000333';
  const displayName = selectedHoldingLatest?.name || getStockName(displayCode);
  const displayPrice = selectedHoldingLatest?.currentPrice ?? holdings[0]?.currentPrice ?? getStockBasePrice(displayCode);
  const holdingCodes = holdings.map((holding) => holding.code).join(',');

  /** 带数据源刷新的行情更新 */
  const handleRefresh = useCallback(async () => {
    if (!holdingCodes) return;
    if (dataSourceId === 'mock') {
      refreshPrices();
      setMarketStatus('fallback');
      return;
    }
    setMarketStatus('loading');
    setMarketError(null);
    try {
      const params = new URLSearchParams({ type: 'quote', source: dataSourceId, codes: holdingCodes });
      const res = await fetch(`/api/data-source?${params.toString()}`, { cache: 'no-store' });
      const result = await res.json() as {
        success: boolean;
        data?: Record<string, QuoteData>;
        error?: string;
      };
      if (!res.ok || !result.success || !result.data) {
        throw new Error(result.error || `行情请求失败: ${res.status}`);
      }
      const prices = Object.fromEntries(
        Object.entries(result.data).map(([code, quote]) => [code, quote.price])
      );
      if (Object.keys(prices).length === 0) throw new Error('行情源未返回有效价格');
      refreshPrices(prices);
      setMarketStatus('live');
      return;
    } catch (error) {
      setMarketError(error instanceof Error ? error.message : String(error));
      setMarketStatus('fallback');
    }
    refreshPrices();
  }, [dataSourceId, holdingCodes, refreshPrices]);

  useEffect(() => {
    void handleRefresh();
  }, [handleRefresh]);

  const handleDataSourceChange = useCallback((id: DataSourceId) => {
    setMarketStatus('loading');
    setDataSource(id);
  }, [setDataSource]);

  return (
    <div className="min-h-screen bg-[#1c1c1e] flex flex-col">
      {/* 顶栏 - Apple 风格 */}
      <header className="bg-[#1c1c1e]/80 backdrop-blur-xl sticky top-0 z-10 border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-5 h-11">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#30d158]/10 flex items-center justify-center">
                <LayoutDashboard className="w-4 h-4 text-[#30d158]" />
              </div>
              <h1 className="text-[15px] font-semibold text-white tracking-tight hidden sm:block">
                个人持仓
              </h1>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[11px] px-2 py-0.5 rounded-md ${
                  marketStatus === 'live' ? 'bg-[#30d158]/10 text-[#30d158]' : 'bg-white/[0.06] text-[#98989d]'
                }`}
                title={marketError || undefined}
              >
                {marketStatus === 'loading' ? '行情更新中' : marketStatus === 'live' ? '实时行情' : '模拟降级'}
              </span>
              <DataSourceSelector
                currentSource={dataSourceId}
                onSourceChange={handleDataSourceChange}
                onRefresh={handleRefresh}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ImportExport holdings={holdings} onImport={importHoldings} />
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="bg-[#30d158] hover:bg-[#30d158]/90 text-white h-7 px-3 text-xs font-medium rounded-lg shadow-none"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              添加
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
        onRefresh={handleRefresh}
      />

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col xl:flex-row gap-0 relative">
        {/* KLine 图表区域 */}
        {showChart && (
          <div className={`bg-[#1c1c1e] relative ${
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
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 w-5 h-10 rounded-r-lg flex items-center justify-center
                         bg-[#2c2c2e] text-[#98989d] hover:text-white hover:bg-[#3a3a3c]
                         transition-colors cursor-pointer hidden xl:flex"
              title={sideCollapsed ? '展开持仓列表' : '收起持仓列表'}
            >
              <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${sideCollapsed ? '' : 'rotate-180'}`} />
            </button>
          </div>
        )}

        {/* 持仓列表区域 */}
        <div className={`flex flex-col min-w-0 bg-[#1c1c1e] ${
          sideCollapsed ? 'xl:w-[180px]' : 'xl:flex-1'
        }`}>
          <div className="flex items-center justify-between px-4 py-2.5">
            <h3 className="text-[13px] font-medium text-white/70 tracking-tight">
              持仓
              <span className="text-[11px] text-[#98989d] ml-1.5">
                {holdings.length} 只
              </span>
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-[#98989d] hover:text-white h-7 xl:hidden"
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
            <div className="px-4 py-2.5 text-[11px] text-[#98989d] text-center border-t border-white/[0.06]">
              点击持仓查看 K 线 · 支持缩放平移 · 周期和指标可切换
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
