'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { init, dispose } from 'klinecharts';
import type { Chart, PeriodType, KLineData as KLineChartData } from 'klinecharts';
import type { TimePeriod, TechnicalIndicator } from '@/lib/types';
import { generateMockKLineDataForStock } from '@/lib/kline-data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

/** 时间周期到 KLineChart Period 的映射 */
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

const timePeriods: TimePeriod[] = ['day', 'week', 'month', '60min', '30min'];

const indicators: { key: TechnicalIndicator; label: string }[] = [
  { key: 'MA', label: '均线' },
  { key: 'MACD', label: 'MACD' },
  { key: 'KDJ', label: 'KDJ' },
  { key: 'RSI', label: 'RSI' },
  { key: 'BOLL', label: '布林带' },
];

interface KLineChartProps {
  stockCode: string;
  stockName: string;
  currentPrice: number;
}

export default function KLineChart({ stockCode, stockName, currentPrice }: KLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const [activePeriod, setActivePeriod] = useState<TimePeriod>('day');
  const [activeIndicators, setActiveIndicators] = useState<Set<TechnicalIndicator>>(new Set(['MA', 'MACD']));
  const [mounted, setMounted] = useState(false);

  /** 初始化图表 */
  const initChart = useCallback(() => {
    if (!containerRef.current) return;
    
    // 清理旧图表
    if (chartRef.current) {
      dispose(chartRef.current);
      chartRef.current = null;
    }

    const chart = init(containerRef.current, {
      locale: 'zh-CN',
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

    // 设置股票代码
    chart.setSymbol({
      ticker: stockCode,
      pricePrecision: 2,
      volumePrecision: 0,
    });

    // 设置周期
    const period = periodMap[activePeriod];
    chart.setPeriod(period);

    // 设置数据
    const data = generateMockKLineDataForStock(stockCode, 200, activePeriod);
    chart.setDataLoader({
      getBars: ({ callback }) => {
        callback(data as unknown as KLineChartData[]);
      },
    });

    // 添加默认指标
    activeIndicators.forEach((indicator) => {
      chart.createIndicator(indicator, { isStack: indicator === 'MACD' });
    });
  }, [stockCode, activePeriod, activeIndicators]);

  /** 切换时间周期 */
  const switchPeriod = useCallback((period: TimePeriod) => {
    setActivePeriod(period);
  }, []);

  /** 切换技术指标 */
  const toggleIndicator = useCallback((indicator: TechnicalIndicator) => {
    setActiveIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(indicator)) {
        next.delete(indicator);
      } else {
        next.add(indicator);
      }
      return next;
    });
  }, []);

  // 初始化/重新初始化图表
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // 延迟初始化确保 DOM 已渲染
    const timer = setTimeout(() => {
      initChart();
    }, 100);
    return () => {
      clearTimeout(timer);
      if (chartRef.current) {
        dispose(chartRef.current);
        chartRef.current = null;
      }
    };
  }, [mounted, initChart]);

  // 窗口 resize 时调整图表
  useEffect(() => {
    if (!mounted) return;
    const handleResize = () => {
      chartRef.current?.resize();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mounted]);

  return (
    <div className="flex flex-col h-full">
      {/* 顶部信息栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">{stockName}</h2>
            <span className="text-sm text-slate-400">{stockCode}</span>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-2xl font-bold text-slate-100 font-mono">
              {currentPrice.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">数据为模拟演示</span>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700/50 flex-wrap">
        {/* 时间周期 */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400 mr-1">周期:</span>
          {timePeriods.map((p) => (
            <Button
              key={p}
              variant={activePeriod === p ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 px-2 text-xs ${
                activePeriod === p
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              onClick={() => switchPeriod(p)}
            >
              {p === 'day' ? '日线' : p === 'week' ? '周线' : p === 'month' ? '月线' : p}
            </Button>
          ))}
        </div>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* 技术指标 */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400 mr-1">指标:</span>
          {indicators.map((ind) => (
            <Badge
              key={ind.key}
              variant={activeIndicators.has(ind.key) ? 'default' : 'outline'}
              className={`cursor-pointer px-2 py-0.5 text-xs ${
                activeIndicators.has(ind.key)
                  ? 'bg-blue-600/20 text-blue-400 border-blue-600/50 hover:bg-blue-600/30'
                  : 'text-slate-400 border-slate-600 hover:text-slate-200'
              }`}
              onClick={() => toggleIndicator(ind.key)}
            >
              {ind.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* 图表容器 */}
      <div
        ref={containerRef}
        className="flex-1 w-full min-h-[400px]"
      />
    </div>
  );
}