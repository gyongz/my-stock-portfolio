'use client';

import { useState, useCallback, useEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import dynamic from 'next/dynamic';
import { Plus, LayoutDashboard, ChevronDown, ChevronLeft, Cloud, LogOut, Moon, Star, Sun, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { AuthGate } from '@/components/auth-gate';
import { useAuth } from '@/components/auth-provider';

// 动态导入图表组件（避免 SSR 问题）
const KLineChart = dynamic(() => import('@/components/kline-chart'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full min-h-[400px] text-muted-foreground">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-[#30d158] border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">加载图表中...</span>
      </div>
    </div>
  ),
});

const SIDE_PANEL_MIN_WIDTH = 180;
const SIDE_PANEL_DEFAULT_WIDTH = 560;
const SIDE_PANEL_MAX_WIDTH = 760;
const CHART_MIN_WIDTH = 480;
const SIDE_PANEL_WIDTH_STORAGE_KEY = 'portfolio-side-panel-width';

export default function Home() {
  return (
    <AuthGate>
      <DataSourceProvider>
        <HomeContent />
      </DataSourceProvider>
    </AuthGate>
  );
}

function HomeContent() {
  const { configured, user, signOut } = useAuth();
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
  const [sidePanelWidth, setSidePanelWidth] = useState(SIDE_PANEL_DEFAULT_WIDTH);
  const [sidePanelMaxWidth, setSidePanelMaxWidth] = useState(SIDE_PANEL_MAX_WIDTH);
  const [isResizingSidePanel, setIsResizingSidePanel] = useState(false);
  const sidePanelWidthRef = useRef(SIDE_PANEL_DEFAULT_WIDTH);
  const [isWideLayout, setIsWideLayout] = useState(false);
  const [marketStatus, setMarketStatus] = useState<'loading' | 'live' | 'delayed' | 'fallback'>('loading');
  const [marketError, setMarketError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('portfolio-theme');
    const initialTheme = savedTheme === 'light' ? 'light' : 'dark';
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
    document.documentElement.classList.toggle('light', initialTheme === 'light');
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1280px)');
    const syncWideLayout = () => {
      const maxWidth = Math.max(
        SIDE_PANEL_MIN_WIDTH,
        Math.min(SIDE_PANEL_MAX_WIDTH, window.innerWidth - CHART_MIN_WIDTH),
      );
      setIsWideLayout(mediaQuery.matches);
      setSidePanelMaxWidth(maxWidth);
      setSidePanelWidth((current) => {
        const next = Math.min(Math.max(current, SIDE_PANEL_MIN_WIDTH), maxWidth);
        sidePanelWidthRef.current = next;
        return next;
      });
    };
    const savedWidth = Number(localStorage.getItem(SIDE_PANEL_WIDTH_STORAGE_KEY));
    if (Number.isFinite(savedWidth)) {
      sidePanelWidthRef.current = savedWidth;
      setSidePanelWidth(savedWidth);
    }
    syncWideLayout();
    mediaQuery.addEventListener('change', syncWideLayout);
    window.addEventListener('resize', syncWideLayout);
    return () => {
      mediaQuery.removeEventListener('change', syncWideLayout);
      window.removeEventListener('resize', syncWideLayout);
    };
  }, []);

  const isSidePanelCollapsed = sideCollapsed && isWideLayout;
  const renderedSidePanelWidth = isSidePanelCollapsed ? SIDE_PANEL_MIN_WIDTH : sidePanelWidth;

  const updateSidePanelWidth = useCallback((clientX: number) => {
    const nextWidth = Math.min(
      Math.max(window.innerWidth - clientX, SIDE_PANEL_MIN_WIDTH),
      sidePanelMaxWidth,
    );
    sidePanelWidthRef.current = nextWidth;
    setSidePanelWidth(nextWidth);
  }, [sidePanelMaxWidth]);

  const handleSidePanelResizeStart = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!isWideLayout) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSideCollapsed(false);
    setIsResizingSidePanel(true);
    updateSidePanelWidth(event.clientX);
  }, [isWideLayout, updateSidePanelWidth]);

  const handleSidePanelResizeMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!isResizingSidePanel) return;
    updateSidePanelWidth(event.clientX);
  }, [isResizingSidePanel, updateSidePanelWidth]);

  const handleSidePanelResizeEnd = useCallback((event: PointerEvent<HTMLDivElement>) => {
    if (!isResizingSidePanel) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsResizingSidePanel(false);
    localStorage.setItem(SIDE_PANEL_WIDTH_STORAGE_KEY, String(Math.round(sidePanelWidthRef.current)));
  }, [isResizingSidePanel]);

  const handleSidePanelResizeKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    let nextWidth: number | null = null;
    if (event.key === 'ArrowLeft') nextWidth = sidePanelWidthRef.current + 20;
    if (event.key === 'ArrowRight') nextWidth = sidePanelWidthRef.current - 20;
    if (event.key === 'Home') nextWidth = SIDE_PANEL_MIN_WIDTH;
    if (event.key === 'End') nextWidth = sidePanelMaxWidth;
    if (nextWidth === null) return;
    event.preventDefault();
    const clampedWidth = Math.min(Math.max(nextWidth, SIDE_PANEL_MIN_WIDTH), sidePanelMaxWidth);
    sidePanelWidthRef.current = clampedWidth;
    setSidePanelWidth(clampedWidth);
    setSideCollapsed(false);
    localStorage.setItem(SIDE_PANEL_WIDTH_STORAGE_KEY, String(Math.round(clampedWidth)));
  }, [sidePanelMaxWidth]);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('portfolio-theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    document.documentElement.classList.toggle('light', nextTheme === 'light');
  }, [theme]);

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
  const displayName = selectedWatchlistLatest?.name
    || selectedHoldingLatest?.name
    || holdings[0]?.name
    || watchlist[0]?.name
    || getStockName(displayCode);
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
        delayed?: boolean;
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
      setMarketStatus(result.delayed ? 'delayed' : 'live');
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
    <div className={`min-h-screen bg-background flex flex-col ${isResizingSidePanel ? 'cursor-col-resize select-none' : ''}`}>
      {/* 顶栏 - Apple 风格 */}
      <header className="bg-background/80 backdrop-blur-xl sticky top-0 z-10 border-b border-border/60">
        <div className="flex h-11 items-center justify-between gap-2 px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden w-7 h-7 shrink-0 rounded-lg bg-[#30d158]/10 items-center justify-center min-[400px]:flex">
                <LayoutDashboard className="w-4 h-4 text-[#30d158]" />
              </div>
              <h1 className="text-[15px] font-semibold text-foreground tracking-tight hidden sm:block">
                个人持仓
              </h1>
            </div>
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className={`hidden whitespace-nowrap text-[11px] px-2 py-0.5 rounded-md sm:inline-flex ${
                  marketStatus === 'live'
                    ? 'bg-[#30d158]/10 text-[#30d158]'
                    : marketStatus === 'delayed'
                      ? 'bg-[#ff9f0a]/10 text-[#ff9f0a]'
                      : 'bg-muted/60 text-muted-foreground'
                }`}
                title={marketError || undefined}
              >
                {marketStatus === 'loading'
                  ? '行情更新中'
                  : marketStatus === 'live'
                    ? '实时行情'
                    : marketStatus === 'delayed'
                      ? '最新收盘'
                      : '模拟降级'}
              </span>
              <DataSourceSelector
                currentSource={dataSourceId}
                onSourceChange={handleDataSourceChange}
                onRefresh={handleRefresh}
              />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <span className="hidden items-center gap-1 rounded-md bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground md:flex" title={configured ? user?.email : '配置 Supabase 后启用云端私有存储'}>
              <Cloud className="h-3 w-3" />
              {configured ? '云端已连接' : '本地模式'}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
              title={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <ImportExport holdings={holdings} onImport={importHoldings} />
            {user && (
              <Button variant="ghost" size="icon-sm" onClick={() => void signOut()} title="退出登录" aria-label="退出登录" className="h-8 w-8 text-muted-foreground">
                <LogOut className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="bg-[#30d158] hover:bg-[#30d158]/90 text-white h-7 px-3 text-xs font-medium rounded-lg shadow-none"
                >
                  <Plus className="w-3.5 h-3.5" />
                  添加
                  <ChevronDown className="w-3 h-3 opacity-80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-36 rounded-xl border-border bg-card p-1.5 text-foreground shadow-xl"
              >
                <DropdownMenuItem
                  onSelect={() => setWatchlistDialogOpen(true)}
                  className="rounded-lg px-2.5 py-2 text-xs focus:bg-[#30d158]/15 focus:text-[#30d158]"
                >
                  <Star className="text-[#30d158]" />
                  添加自选
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={handleOpenAdd}
                  className="rounded-lg px-2.5 py-2 text-xs focus:bg-muted focus:text-foreground"
                >
                  <WalletCards />
                  添加持仓
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          <div className="bg-background relative min-w-0 xl:flex-1">
            <KLineChart
              stockCode={displayCode}
              stockName={displayName}
              currentPrice={displayPrice}
              theme={theme}
            />
          </div>
        )}

        {/* 持仓 / 自选列表区域 */}
        <div
          className="relative flex w-full min-w-0 flex-col bg-background xl:shrink-0"
          style={isWideLayout ? { width: renderedSidePanelWidth } : undefined}
        >
          <div
            role="separator"
            aria-label="调整持仓和自选区域宽度"
            aria-orientation="vertical"
            aria-valuemin={SIDE_PANEL_MIN_WIDTH}
            aria-valuemax={sidePanelMaxWidth}
            aria-valuenow={renderedSidePanelWidth}
            tabIndex={0}
            onPointerDown={handleSidePanelResizeStart}
            onPointerMove={handleSidePanelResizeMove}
            onPointerUp={handleSidePanelResizeEnd}
            onPointerCancel={handleSidePanelResizeEnd}
            onKeyDown={handleSidePanelResizeKeyDown}
            className="group absolute inset-y-0 left-0 z-20 hidden w-3 -translate-x-1/2 touch-none cursor-col-resize items-center justify-center outline-none xl:flex"
            title="拖动调整宽度；方向键可微调"
          >
            <span className={`h-full w-px transition-colors ${isResizingSidePanel ? 'bg-[#30d158]' : 'bg-border group-hover:bg-[#30d158]/70 group-focus-visible:bg-[#30d158]'}`} />
          </div>
          {/* 收起/展开侧栏按钮 */}
          <button
            type="button"
            onClick={() => setSideCollapsed((value) => !value)}
            className="absolute left-0 top-1/2 z-30 hidden h-10 w-5 -translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-r-lg bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground xl:flex"
            title={isSidePanelCollapsed ? '展开持仓列表' : '收起持仓列表'}
            aria-label={isSidePanelCollapsed ? '展开持仓列表' : '收起持仓列表'}
          >
            <ChevronLeft className={`h-3.5 w-3.5 transition-transform ${isSidePanelCollapsed ? '' : 'rotate-180'}`} />
          </button>
          <Tabs value={activeList} onValueChange={(value) => setActiveList(value as 'holdings' | 'watchlist')} className="min-h-0 flex-1 gap-0">
            <div className="flex items-center justify-between gap-2 px-4 py-2">
              <TabsList className="h-8 bg-muted/50 p-0.5">
                <TabsTrigger value="holdings" className="h-7 px-2.5 text-xs data-[state=active]:bg-muted">
                  持仓 <span className="text-[10px] text-muted-foreground">{holdings.length}</span>
                </TabsTrigger>
                <TabsTrigger value="watchlist" className="h-7 px-2.5 text-xs data-[state=active]:bg-muted">
                  自选 <span className="text-[10px] text-muted-foreground">{watchlist.length}</span>
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
                  className="h-7 text-xs text-muted-foreground hover:text-foreground xl:hidden"
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
                collapsed={isSidePanelCollapsed}
              />
            </TabsContent>

            <TabsContent value="watchlist" className="mt-0 min-h-0 flex-1 overflow-auto">
              <WatchlistTable
                items={watchlist}
                onDelete={handleRemoveWatchlist}
                onSelect={handleSelectWatchlist}
                selectedCode={selectedHolding ? undefined : selectedWatchlistItem?.code}
                collapsed={isSidePanelCollapsed}
              />
            </TabsContent>

            {!isSidePanelCollapsed && (
              <div className="border-t border-border/60 px-4 py-2.5 text-center text-[11px] text-muted-foreground">
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
