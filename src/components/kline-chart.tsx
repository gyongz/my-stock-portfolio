'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { dispose, init } from 'klinecharts';
import type { Chart, KLineData as KLineChartData, PeriodType } from 'klinecharts';
import {
  Brush,
  Camera,
  Eraser,
  Maximize2,
  Minimize2,
  Minus,
  RotateCcw,
  TrendingUp,
  Waves,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { TechnicalIndicator, TimePeriod } from '@/lib/types';
import { generateMockKLineDataForStock } from '@/lib/kline-data';
import {
  EMA_RSI_SIGNAL_INDICATOR,
  RSI_HEAT_INDICATOR,
  ensureCustomIndicatorsRegistered,
} from '@/lib/custom-indicators';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const periodMap: Record<TimePeriod, { type: PeriodType; span: number }> = {
  '1min': { type: 'minute', span: 1 },
  '5min': { type: 'minute', span: 5 },
  '15min': { type: 'minute', span: 15 },
  '30min': { type: 'minute', span: 30 },
  '60min': { type: 'minute', span: 60 },
  day: { type: 'day', span: 1 },
  week: { type: 'week', span: 1 },
  month: { type: 'month', span: 1 },
};

const timePeriods: TimePeriod[] = [
  'day',
  'week',
  'month',
  '60min',
  '30min',
  '15min',
  '5min',
  '1min',
];

const mainIndicators: { key: TechnicalIndicator; label: string }[] = [
  { key: EMA_RSI_SIGNAL_INDICATOR, label: 'EMA信号' },
  { key: 'MA', label: '均线' },
  { key: 'EMA', label: 'EMA' },
  { key: 'SMA', label: 'SMA' },
  { key: 'BBI', label: 'BBI' },
  { key: 'BOLL', label: '布林带' },
  { key: 'SAR', label: 'SAR' },
];

const subIndicators: { key: TechnicalIndicator; label: string }[] = [
  { key: RSI_HEAT_INDICATOR, label: 'RSI热力' },
  { key: 'MACD', label: 'MACD' },
  { key: 'KDJ', label: 'KDJ' },
  { key: 'RSI', label: 'RSI' },
  { key: 'VOL', label: '成交量' },
  { key: 'CCI', label: 'CCI' },
  { key: 'BIAS', label: 'BIAS' },
  { key: 'WR', label: 'WR' },
  { key: 'DMI', label: 'DMI' },
  { key: 'OBV', label: 'OBV' },
  { key: 'ROC', label: 'ROC' },
  { key: 'MTM', label: 'MTM' },
];

const overlayTools = [
  { key: 'segment', label: '趋势线', icon: TrendingUp },
  { key: 'horizontalStraightLine', label: '水平线', icon: Minus },
  { key: 'fibonacciLine', label: '斐波那契', icon: Waves },
  { key: 'brush', label: '画笔', icon: Brush },
] as const;

const DRAWING_GROUP_ID = 'portfolio-analysis-drawings';

interface KLineChartProps {
  stockCode: string;
  stockName: string;
  currentPrice: number;
}

function getPeriodLabel(period: TimePeriod): string {
  if (period === 'day') return '日线';
  if (period === 'week') return '周线';
  if (period === 'month') return '月线';
  return period;
}

export default function KLineChart({ stockCode, stockName, currentPrice }: KLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const dataRef = useRef<KLineChartData[]>([]);
  const [activePeriod, setActivePeriod] = useState<TimePeriod>('day');
  const [mainIndicator, setMainIndicator] = useState<TechnicalIndicator | null>('MA');
  const [subIndicator, setSubIndicator] = useState<TechnicalIndicator | null>('MACD');
  const [activeDrawingTool, setActiveDrawingTool] = useState<string | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  // 缓存 K 线数据 —— 只在股票代码或周期变化时重新生成
  useEffect(() => {
    dataRef.current = generateMockKLineDataForStock(stockCode, 520, activePeriod) as unknown as KLineChartData[];
  }, [stockCode, activePeriod]);

  // 用 ref 跟踪最新指标值，initChart 通过 ref 读取而非直接依赖
  const mainIndicatorRef = useRef(mainIndicator);
  const subIndicatorRef = useRef(subIndicator);
  useEffect(() => {
    mainIndicatorRef.current = mainIndicator;
  }, [mainIndicator]);
  useEffect(() => {
    subIndicatorRef.current = subIndicator;
  }, [subIndicator]);

  const initChart = useCallback(() => {
    if (!containerRef.current) return;

    ensureCustomIndicatorsRegistered();

    if (chartRef.current) {
      dispose(chartRef.current);
      chartRef.current = null;
    }

    const chart = init(containerRef.current, {
      locale: 'zh-CN',
      hotkey: { enabled: true },
      styles: {
        grid: {
          horizontal: { style: 'dashed', size: 1, color: '#334155', dashedValue: [4, 4] },
          vertical: { style: 'dashed', size: 1, color: '#334155', dashedValue: [4, 4] },
        },
        candle: {
          type: 'candle_solid',
          bar: {
            upColor: '#22c55e',
            downColor: '#ef4444',
            noChangeColor: '#94a3b8',
          },
          priceMark: {
            show: true,
            high: { show: true, color: '#94a3b8', textOffset: 4, textSize: 11 },
            low: { show: true, color: '#94a3b8', textOffset: 4, textSize: 11 },
          },
          tooltip: {
            showRule: 'always',
            showType: 'standard',
          },
        },
        xAxis: {
          axisLine: { show: true, color: '#334155', size: 1 },
          tickText: { color: '#64748b', size: 11 },
          tickLine: { show: true, color: '#334155', size: 1 },
        },
        yAxis: {
          axisLine: { show: true, color: '#334155', size: 1 },
          tickText: { color: '#64748b', size: 11 },
          tickLine: { show: true, color: '#334155', size: 1 },
        },
        separator: {
          color: '#334155',
          size: 1,
        },
        crosshair: {
          show: true,
          horizontal: {
            show: true,
            line: { color: '#64748b', size: 1, style: 'dashed' as const, dashedValue: [4, 4] },
            text: { show: true, color: '#94a3b8', size: 11, style: 'fill' as const },
          },
          vertical: {
            show: true,
            line: { color: '#64748b', size: 1, style: 'dashed' as const, dashedValue: [4, 4] },
            text: { show: true, color: '#94a3b8', size: 11, style: 'fill' as const },
          },
        },
      },
    });

    if (!chart) return;
    chartRef.current = chart;

    chart.setSymbol({
      ticker: stockCode,
      pricePrecision: 2,
      volumePrecision: 0,
    });
    chart.setPeriod(periodMap[activePeriod]);

    // 使用缓存的数据，不再重新生成
    chart.setDataLoader({
      getBars: ({ callback }) => {
        callback(dataRef.current);
      },
    });

    // 仅在初始化时添加默认指标（用 ref 避免引入 indicator 依赖）
    if (mainIndicatorRef.current) {
      chart.createIndicator(mainIndicatorRef.current, {
        pane: { id: 'candle_pane' },
        isStack: true,
      });
    }
    if (subIndicatorRef.current) {
      chart.createIndicator(subIndicatorRef.current);
    }
  }, [stockCode, activePeriod]); // 移除 mainIndicator / subIndicator 依赖

  const toggleMainIndicator = useCallback((indicator: TechnicalIndicator) => {
    setMainIndicator((current) => (current === indicator ? null : indicator));
  }, []);

  const toggleSubIndicator = useCallback((indicator: TechnicalIndicator) => {
    setSubIndicator((current) => (current === indicator ? null : indicator));
  }, []);

  const startDrawing = useCallback((name: string) => {
    const chart = chartRef.current;
    if (!chart) return;
    setActiveDrawingTool(name);
    chart.createOverlay({
      name,
      groupId: DRAWING_GROUP_ID,
      mode: name === 'brush' ? 'normal' : 'weak_magnet',
      onDrawEnd: () => setActiveDrawingTool(null),
    });
  }, []);

  const clearDrawings = useCallback(() => {
    chartRef.current?.removeOverlay({ groupId: DRAWING_GROUP_ID });
    setActiveDrawingTool(null);
  }, []);

  const exportChartImage = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const link = document.createElement('a');
    link.href = chart.getConvertPictureUrl(true, 'png', '#0f172a');
    link.download = `${stockCode}-${activePeriod}-chart.png`;
    link.click();
  }, [stockCode, activePeriod]);

  const zoomChart = useCallback((scale: number) => {
    chartRef.current?.zoomAtCoordinate(scale, undefined, 160);
  }, []);

  const scrollToLatest = useCallback(() => {
    chartRef.current?.scrollToRealTime(240);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const timer = setTimeout(initChart, 100);
    return () => {
      clearTimeout(timer);
      if (chartRef.current) {
        dispose(chartRef.current);
        chartRef.current = null;
      }
    };
  }, [mounted, initChart]);

  useEffect(() => {
    if (!mounted) return;
    const handleResize = () => chartRef.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const frame = requestAnimationFrame(() => chartRef.current?.resize());
    return () => cancelAnimationFrame(frame);
  }, [mounted, isFocusMode]);

  // 动态切换主图指标 —— 不销毁图表，仅增删 indicator
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !mounted) return;

    // 移除主图窗口上所有叠加指标
    chart.removeIndicator({ paneId: 'candle_pane' });

    // 添加新的主图指标
    if (mainIndicator) {
      chart.createIndicator(mainIndicator, {
        pane: { id: 'candle_pane' },
        isStack: true,
      });
    }
  }, [mainIndicator, mounted]);

  // 动态切换副图指标 —— 不销毁图表，仅增删 indicator
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !mounted) return;

    // 只移除副图窗口中的指标（不在 candle_pane 中的）
    const allIndicators = chart.getIndicators();
    allIndicators.forEach((indicator) => {
      if (indicator.paneId !== 'candle_pane') {
        chart.removeIndicator({ paneId: indicator.paneId });
      }
    });

    // 添加新的副图指标
    if (subIndicator) {
      chart.createIndicator(subIndicator);
    }
  }, [subIndicator, mounted]);

  return (
    <div
      className={
        isFocusMode
          ? 'fixed inset-0 z-50 flex h-screen flex-col bg-slate-950'
          : 'flex h-full flex-col'
      }
    >
      <div className="flex items-center justify-between border-b border-slate-700/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{stockName}</h2>
            <span className="text-sm text-slate-400">{stockCode}</span>
          </div>
          <span className="ml-4 font-mono text-2xl font-bold text-slate-100">
            {currentPrice.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="hidden text-xs text-slate-500 sm:inline">数据为模拟演示</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-400 hover:text-slate-100"
            onClick={exportChartImage}
          >
            <Camera className="mr-1 h-3.5 w-3.5" />
            截图
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-400 hover:text-slate-100"
            onClick={() => setIsFocusMode((current) => !current)}
          >
            {isFocusMode ? (
              <Minimize2 className="mr-1 h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="mr-1 h-3.5 w-3.5" />
            )}
            {isFocusMode ? '退出' : '专注'}
          </Button>
        </div>
      </div>

      <div className="border-b border-slate-700/50 px-4 py-2">
        <div className="flex w-full max-w-full items-center gap-1 overflow-x-auto">
          <span className="mr-1 text-xs text-slate-400">周期:</span>
          {timePeriods.map((period) => (
            <Button
              key={period}
              variant={activePeriod === period ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 shrink-0 px-2 text-xs ${
                activePeriod === period
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => setActivePeriod(period)}
            >
              {getPeriodLabel(period)}
            </Button>
          ))}
        </div>
      </div>

      <div
        ref={containerRef}
        className={
          isFocusMode
            ? 'min-h-0 w-full flex-1'
            : 'h-[400px] w-full xl:h-auto xl:min-h-[400px] xl:flex-1'
        }
      />

      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-700/50 bg-slate-900/70 px-4 py-1.5">
        <span className="mr-1 text-xs text-slate-500">画线:</span>
        {overlayTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Button
              key={tool.key}
              variant="ghost"
              size="sm"
              className={`h-7 px-2 text-xs ${
                activeDrawingTool === tool.key
                  ? 'bg-blue-500/15 text-blue-300'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
              onClick={() => startDrawing(tool.key)}
            >
              <Icon className="mr-1 h-3.5 w-3.5" />
              {tool.label}
            </Button>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-slate-400 hover:text-red-300"
          onClick={clearDrawings}
        >
          <Eraser className="mr-1 h-3.5 w-3.5" />
          清空
        </Button>
        <div className="mx-1 h-4 w-px bg-slate-700" />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-slate-100"
          aria-label="放大图表"
          onClick={() => zoomChart(1.2)}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-slate-400 hover:text-slate-100"
          aria-label="缩小图表"
          onClick={() => zoomChart(0.8)}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-slate-400 hover:text-slate-100"
          onClick={scrollToLatest}
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          回到最新
        </Button>
        <span className="ml-auto hidden text-[11px] text-slate-600 lg:inline">
          Shift + ←/→ 平移 · Shift + +/- 缩放
        </span>
      </div>

      <div className="flex flex-col items-stretch gap-2 border-b border-slate-700/50 bg-slate-900/70 px-4 py-2">
        <div className="flex w-full min-w-0 max-w-full items-center gap-1 overflow-x-auto">
          <span className="mr-1 shrink-0 text-xs text-slate-400">主图:</span>
          {mainIndicators.map((indicator) => (
            <Badge
              key={indicator.key}
              variant={mainIndicator === indicator.key ? 'default' : 'outline'}
              className={`shrink-0 cursor-pointer px-2 py-0.5 text-xs ${
                mainIndicator === indicator.key
                  ? 'border-blue-600/50 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
                  : 'border-slate-600 text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => toggleMainIndicator(indicator.key)}
            >
              {indicator.label}
            </Badge>
          ))}
        </div>

        <div className="flex w-full min-w-0 max-w-full items-center gap-1 overflow-x-auto">
          <span className="mr-1 shrink-0 text-xs text-slate-400">副图:</span>
          {subIndicators.map((indicator) => (
            <Badge
              key={indicator.key}
              variant={subIndicator === indicator.key ? 'default' : 'outline'}
              className={`shrink-0 cursor-pointer px-2 py-0.5 text-xs ${
                subIndicator === indicator.key
                  ? 'border-violet-500/50 bg-violet-500/20 text-violet-300 hover:bg-violet-500/30'
                  : 'border-slate-600 text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => toggleSubIndicator(indicator.key)}
            >
              {indicator.label}
            </Badge>
          ))}
        </div>
      </div>

    </div>
  );
}
