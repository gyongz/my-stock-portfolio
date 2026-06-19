'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Plus, LayoutDashboard, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePortfolio } from '@/hooks/use-portfolio';
import HoldingsTable from '@/components/holdings-table';
import HoldingsDialog from '@/components/holdings-dialog';
import WatchlistDialog from '@/components/watchlist-dialog';
import WatchlistTable from '@/components/watchlist-table';
import PortfolioSummary from '@/components/portfolio-summary';
import ImportExport from '@/components/import-export';
import DataSourceSelector from '@/components/data-source-selector';
import { DataSourceProvider, useDataSourceContext } from '@/lib/data-source/context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Holding, HoldingWithPnL, WatchlistItem } from '@/lib/types';
import type { DataSourceId, QuoteData, StockInfo } from '@/lib/data-source/types';
import { getStockName, getStockBasePrice } from '@/lib/kline-data';
import { useWatchlist } from '@/hooks/use-watchlist';

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
  const { watchlist, addWatchlistItem, removeWatchlistItem, updateWatchlistQuotes } = useWatchlist();
  const { dataSourceId, setDataSource } = useDataSourceContext();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHolding, setEditingHolding] = useState<Holding | null>(null);
  const [selectedHolding, setSelectedHolding] = useState<HoldingWithPnL | null>(null);
  const [selectedWatchlistItem, setSelectedWatchlistItem] = useState<WatchlistItem | null>(null);
  const [watchlistDialogOpen, setWatchlistDialogOpen] = useState(false);
  const [activeList, setActiveList] = useState<'holdings' | 'watchlist'>('holdings');
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
      setSelectedWatchlistItem(null);
    },
    []
  );

  const handleSelectWatchlist = useCallback((item: WatchlistItem) => {
    setSelectedWatchlistItem(item);
    setSelectedHolding(null);
  }, []);

  const handleAddWatchlist = useCallback((stock: StockInfo) => {
    addWatchlistItem(stock);
    setActiveList('watchlist');
  }, [addWatchlistItem]);

  const handleRemoveWatchlist = useCallback((code: string) => {
    removeWatchlistItem(code);
    setSelectedWatchlistItem((current) => current?.code === code ? null : current);
  }, [removeWatchlistItem]);

  /** 获取当前选中股票的代码 */
  const selectedHoldingLatest = selectedHolding
    ? holdingsWithPnL.find((holding) => holding.id === selectedHolding.id)
    : undefined;
  const selectedWatchlistLatest = selectedWatchlistItem
    ? watchlist.find((item) => item.code === selectedWatchlistItem.code)
    : undefined;
  const displayCode = selectedWatchlistLatest?.code || selectedHoldingLatest?.code || holdings[0]?.code || watchlist[0]?.code || '000333';
  const displayName = selectedWatchlistLatest?.name || selectedHoldingLatest?.name || getStockName(displayCode);
  const displayPrice = selectedWatchlistLatest?.currentPrice
    ?? selectedHoldingLatest?.currentPrice
    ?? holdings[0]?.currentPrice
    ?? watchlist[0]?.currentPrice
    ?? getStockBasePrice(displayCode);
  const holdingCodes = holdings.map((holding) => holding.code).join(',');
  const watchlistCodes = watchlist.map((item) => item.code).join(',');
  const marketCodes = [...new Set([...holdingCodes.split(','), ...watchlistCodes.split(',')].filter(Boolean))].join(',');

  /** 带数据源刷新的行情更新 */
  const handleRefresh = useCallback(async () => {
    if (!marketCodes) return;
    if (dataSourceId === 'mock') {
      refreshPrices();
      setMarketStatus('fallback');
      return;
    }
    setMarketStatus('loading');
    setMarketError(null);
    try {
      const params = new URLSearchParams({ type: 'quote', source: dataSourceId, codes: marketCodes });
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
      updateWatchlistQuotes(result.data);
      setMarketStatus('live');
      return;
    } catch (error) {
      setMarketError(error instanceof Error ? error.message : String(error));
      setMarketStatus('fallback');
    }
    refreshPrices();
  }, [dataSourceId, marketCodes, refreshPrices, updateWatchlistQuotes]);

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
      <div className="flex-1 flex flex-col xl:flex-row gap-0 relative overflow-hidden">
        {/* KLine 图表区域 */}
        {showChart && (
          <div className={`bg-[#1c1c1e] relative min-w-0 ${
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

        {/* 持仓 / 自选列表区域 */}
        <div className={`flex flex-col bg-[#1c1c1e] ${
          sideCollapsed ? 'xl:w-[180px] w-[180px] shrink-0' : 'xl:flex-1 min-w-0'
        }`}>
          <Tabs value={activeList} onValueChange={(value) => setActiveList(value as 'holdings' | 'watchlist')} className="min-h-0 flex-1 gap-0">
            <div className="flex items-center justify-between gap-2 px-4 py-2">
              <TabsList className="h-8 bg-white/[0.05] p-0.5">
                <TabsTrigger value="holdings" className="h-7 px-2.5 text-xs data-[state=active]:bg-white/[0.08]">
                  持仓 <span className="text-[10px] text-[#98989d]">{holdings.length}</span>
                </TabsTrigger>
                <TabsTrigger value="watchlist" className="h-7 px-2.5 text-xs data-[state=active]:bg-white/[0.08]">
                  自选 <span className="text-[10px] text-[#98989d]">{watchlist.length}</span>
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-1">
                {activeList === 'watchlist' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWatchlistDialogOpen(true)}
                    className="h-7 px-2 text-xs text-[#30d158] hover:bg-[#30d158]/10 hover:text-[#30d158]"
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" />
                    添加自选
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-[#98989d] hover:text-white xl:hidden"
                  onClick={() => setShowChart(!showChart)}
                >
                  {showChart ? '隐藏图表' : '显示图表'}
                </Button>
              </div>
            </div>

            <TabsContent value="holdings" className="mt-0 min-h-0 flex-1 overflow-auto">
              <HoldingsTable
                holdings={holdingsWithPnL}
                onEdit={handleOpenEdit}
                onDelete={removeHolding}
                onSelect={handleSelectHolding}
                selectedId={selectedWatchlistItem ? undefined : selectedHolding?.id}
                collapsed={sideCollapsed}
              />
            </TabsContent>

            <TabsContent value="watchlist" className="mt-0 min-h-0 flex-1 overflow-auto">
              <WatchlistTable
                items={watchlist}
                onDelete={handleRemoveWatchlist}
                onSelect={handleSelectWatchlist}
                selectedCode={selectedHolding ? undefined : selectedWatchlistItem?.code}
                collapsed={sideCollapsed}
              />
            </TabsContent>

            {!sideCollapsed && (
              <div className="border-t border-white/[0.06] px-4 py-2.5 text-center text-[11px] text-[#98989d]">
                点击股票联动 K 线 · 行情随数据源自动刷新
              </div>
            )}
          </Tabs>
        </div>
      </div>

      {/* 添加/编辑持仓弹窗 */}
      <HoldingsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        editingHolding={editingHolding}
      />
      <WatchlistDialog
        open={watchlistDialogOpen}
        onOpenChange={setWatchlistDialogOpen}
        onSubmit={handleAddWatchlist}
      />
    </div>
  );
}
