'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { dispose, init } from 'klinecharts';
import type {
  Chart,
  DeepPartial,
  KLineData as KLineChartData,
  OverlayCreate,
  PeriodType,
  Styles,
} from 'klinecharts';
import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  ArrowRight,
  ArrowUpRight,
  Brush,
  Camera,
  ChartNoAxesCombined,
  Eraser,
  GitBranch,
  MessageSquareText,
  Maximize2,
  Minimize2,
  Minus,
  MoveHorizontal,
  MoveVertical,
  RotateCcw,
  Spline,
  Tag,
  TrendingUp,
  Redo2,
  Undo2,
  Waves,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { TechnicalIndicator, TimePeriod } from '@/lib/types';
import { generateMockKLineDataForStock } from '@/lib/kline-data';
import { useDataSourceContext } from '@/lib/data-source/context';
import {
  EMA_RSI_SIGNAL_INDICATOR,
  RSI_HEAT_INDICATOR,
  ensureCustomIndicatorsRegistered,
} from '@/lib/custom-indicators';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  clonePersistedSnapshot,
  getDrawingStorageKey,
  readPersistedOverlays,
  snapshotOverlays,
  writePersistedSnapshot,
  type PersistedOverlay,
} from '@/lib/drawing-storage';
import { useAuth } from '@/components/auth-provider';
import {
  fetchCloudChartPreferences,
  saveCloudChartPreferences,
  saveCloudDrawing,
  syncCloudDrawing,
} from '@/lib/cloud-storage';
import {
  readChartPreferences,
  readChartPreferencesSnapshot,
  readChartView,
  writeChartPreferences,
  writeChartPreferencesSnapshot,
  writeChartView,
  type ChartPreferences,
} from '@/lib/chart-preferences';

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

const subIndicatorList: { key: TechnicalIndicator; label: string }[] = [
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
  { key: 'straightLine', label: '直线', icon: Spline },
  { key: 'rayLine', label: '射线', icon: ArrowUpRight },
  { key: 'horizontalStraightLine', label: '水平线', icon: Minus },
  { key: 'horizontalRayLine', label: '水平射线', icon: ArrowRight },
  { key: 'horizontalSegment', label: '水平线段', icon: MoveHorizontal },
  { key: 'verticalStraightLine', label: '垂直线', icon: AlignVerticalJustifyCenter },
  { key: 'verticalRayLine', label: '垂直射线', icon: MoveVertical },
  { key: 'verticalSegment', label: '垂直线段', icon: AlignHorizontalJustifyCenter },
  { key: 'parallelStraightLine', label: '平行线', icon: GitBranch },
  { key: 'priceChannelLine', label: '价格通道', icon: ChartNoAxesCombined },
  { key: 'fibonacciLine', label: '斐波那契', icon: Waves },
  { key: 'priceLine', label: '价格线', icon: Minus },
  { key: 'simpleAnnotation', label: '文字标注', icon: MessageSquareText, needsText: true },
  { key: 'simpleTag', label: '价格标签', icon: Tag, needsText: true },
  { key: 'brush', label: '画笔', icon: Brush },
] as const;

const DRAWING_GROUP_ID = 'portfolio-analysis-drawings';

interface KLineChartProps {
  stockCode: string;
  stockName: string;
  currentPrice: number;
  theme: 'dark' | 'light';
}

function getPeriodLabel(period: TimePeriod): string {
  if (period === 'day') return '日线';
  if (period === 'week') return '周线';
  if (period === 'month') return '月线';
  return period;
}

function getChartThemeStyles(theme: 'dark' | 'light'): DeepPartial<Styles> {
  const isLightTheme = theme === 'light';
  const chartGridColor = isLightTheme ? '#d1d1d6' : '#38383a';
  const chartTextColor = isLightTheme ? '#636366' : '#8e8e93';
  const chartCrosshairTextColor = isLightTheme ? '#3a3a3c' : '#aeaeb2';

  return {
    grid: {
      horizontal: { style: 'dashed', size: 1, color: chartGridColor, dashedValue: [4, 4] },
      vertical: { style: 'dashed', size: 1, color: chartGridColor, dashedValue: [4, 4] },
    },
    candle: {
      type: 'candle_solid',
      bar: {
        upColor: '#30d158',
        downColor: '#ff453a',
        noChangeColor: chartTextColor,
      },
      priceMark: {
        show: true,
        high: { show: true, color: chartTextColor, textOffset: 4, textSize: 11 },
        low: { show: true, color: chartTextColor, textOffset: 4, textSize: 11 },
      },
      tooltip: { showRule: 'always', showType: 'standard' },
    },
    xAxis: {
      axisLine: { show: true, color: chartGridColor, size: 1 },
      tickText: { color: chartTextColor, size: 11 },
      tickLine: { show: true, color: chartGridColor, size: 1 },
    },
    yAxis: {
      axisLine: { show: true, color: chartGridColor, size: 1 },
      tickText: { color: chartTextColor, size: 11 },
      tickLine: { show: true, color: chartGridColor, size: 1 },
    },
    separator: { color: chartGridColor, size: 1 },
    crosshair: {
      show: true,
      horizontal: {
        show: true,
        line: { color: chartTextColor, size: 1, style: 'dashed', dashedValue: [4, 4] },
        text: { show: true, color: chartCrosshairTextColor, size: 11, style: 'fill' },
      },
      vertical: {
        show: true,
        line: { color: chartTextColor, size: 1, style: 'dashed', dashedValue: [4, 4] },
        text: { show: true, color: chartCrosshairTextColor, size: 11, style: 'fill' },
      },
    },
  };
}

export default function KLineChart({ stockCode, stockName, currentPrice, theme }: KLineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
  const dataRef = useRef<KLineChartData[]>([]);
  const activeDrawingIdRef = useRef<string | null>(null);
  const applyingSnapshotRef = useRef(false);
  const committedSnapshotRef = useRef<PersistedOverlay[]>([]);
  const undoStackRef = useRef<PersistedOverlay[][]>([]);
  const redoStackRef = useRef<PersistedOverlay[][]>([]);
  const initialPreferencesRef = useRef<ChartPreferences | null>(null);
  if (!initialPreferencesRef.current) initialPreferencesRef.current = readChartPreferences();
  const [activePeriod, setActivePeriod] = useState<TimePeriod>(() => initialPreferencesRef.current!.activePeriod);
  const [mainIndicator, setMainIndicator] = useState<TechnicalIndicator | null>(() => initialPreferencesRef.current!.mainIndicator);
  const [subIndicators, setSubIndicators] = useState<TechnicalIndicator[]>(() => initialPreferencesRef.current!.subIndicators);
  const activePeriodRef = useRef(activePeriod);
  const mainIndicatorRef = useRef(mainIndicator);
  const subIndicatorRef = useRef(subIndicators);
  const themeRef = useRef(theme);
  const paneHeightsRef = useRef<Record<string, number>>(initialPreferencesRef.current.paneHeights);
  const viewSaveTimerRef = useRef<number | null>(null);
  const cloudPreferencesSaveTimerRef = useRef<number | null>(null);
  const cloudPreferencesReadyRef = useRef(false);
  const restoringViewRef = useRef(false);
  const [activeDrawingTool, setActiveDrawingTool] = useState<string | null>(null);
  const [drawingCount, setDrawingCount] = useState(0);
  const [canUndoDrawing, setCanUndoDrawing] = useState(false);
  const [canRedoDrawing, setCanRedoDrawing] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const [dataFallback, setDataFallback] = useState(false);
  const { dataSourceId } = useDataSourceContext();
  const { user } = useAuth();
  const userId = user?.id;
  const drawingStorageKey = getDrawingStorageKey(stockCode, activePeriod);

  const saveCloudPreferencesNow = useCallback(() => {
    if (!userId || !cloudPreferencesReadyRef.current) return;
    void saveCloudChartPreferences(userId, readChartPreferencesSnapshot()).catch((error) => {
      console.error('保存云端图表偏好失败，已保留本地缓存', error);
    });
  }, [userId]);

  const scheduleCloudPreferencesSave = useCallback(() => {
    if (!userId || !cloudPreferencesReadyRef.current) return;
    if (cloudPreferencesSaveTimerRef.current !== null) {
      window.clearTimeout(cloudPreferencesSaveTimerRef.current);
    }
    cloudPreferencesSaveTimerRef.current = window.setTimeout(saveCloudPreferencesNow, 600);
  }, [saveCloudPreferencesNow, userId]);

  const persistIndicatorPreferences = useCallback((paneHeights = paneHeightsRef.current) => {
    paneHeightsRef.current = paneHeights;
    writeChartPreferences({
      activePeriod: activePeriodRef.current,
      mainIndicator: mainIndicatorRef.current,
      subIndicators: subIndicatorRef.current,
      paneHeights,
    });
    scheduleCloudPreferencesSave();
  }, [scheduleCloudPreferencesSave]);

  const restorePaneHeight = useCallback((chart: Chart, paneId: string | null, indicator: TechnicalIndicator) => {
    const height = paneHeightsRef.current[indicator];
    if (paneId && height) chart.setPaneOptions({ id: paneId, height });
  }, []);

  const saveCurrentChartView = useCallback(() => {
    if (restoringViewRef.current) return;
    const chart = chartRef.current;
    if (!chart) return;
    const data = chart.getDataList();
    if (data.length === 0) return;
    const range = chart.getVisibleRange();
    const rightIndex = Math.min(data.length - 1, Math.max(0, Math.ceil(range.to) - 1));
    const rightTimestamp = data[rightIndex]?.timestamp;
    const barSpace = chart.getBarSpace().bar;
    if (!Number.isFinite(rightTimestamp) || !Number.isFinite(barSpace)) return;
    writeChartView(stockCode, activePeriod, { barSpace, rightTimestamp });
    scheduleCloudPreferencesSave();
  }, [activePeriod, scheduleCloudPreferencesSave, stockCode]);

  const scheduleChartViewSave = useCallback(() => {
    if (viewSaveTimerRef.current !== null) window.clearTimeout(viewSaveTimerRef.current);
    viewSaveTimerRef.current = window.setTimeout(saveCurrentChartView, 180);
  }, [saveCurrentChartView]);

  const restoreCurrentChartView = useCallback((chart: Chart) => {
    const view = readChartView(stockCode, activePeriod);
    if (!view || chartRef.current !== chart) return;
    restoringViewRef.current = true;
    chart.setBarSpace(view.barSpace);
    chart.scrollToTimestamp(view.rightTimestamp, 0);
    window.setTimeout(() => { restoringViewRef.current = false; }, 0);
  }, [activePeriod, stockCode]);
  const restoreCurrentChartViewRef = useRef(restoreCurrentChartView);
  useEffect(() => {
    restoreCurrentChartViewRef.current = restoreCurrentChartView;
  }, [restoreCurrentChartView]);

  // 缓存 K 线数据 —— 优先从数据源获取，失败回退到模拟数据
  useEffect(() => {
    let cancelled = false;
    setDataLoading(true);

    async function loadData() {
      if (dataSourceId !== 'mock') {
        try {
          const params = new URLSearchParams({
            source: dataSourceId,
            type: 'kline',
            code: stockCode,
            period: activePeriod,
          });
          const res = await fetch(`/api/data-source?${params.toString()}`, { cache: 'no-store' });
          if (!res.ok) throw new Error('API error');
          const result = await res.json() as { success: boolean; data: KLineChartData[]; fallback?: boolean };
          if (result.success && result.data.length > 0 && !cancelled) {
            dataRef.current = result.data as KLineChartData[];
            setDataFallback(Boolean(result.fallback));
            setDataVersion((version) => version + 1);
            setDataLoading(false);
            return;
          }
        } catch {
          // 获取失败，回退到模拟数据
        }
      }
      // 回退到模拟数据
      if (!cancelled) {
        dataRef.current = generateMockKLineDataForStock(stockCode, 520, activePeriod) as unknown as KLineChartData[];
        setDataFallback(true);
        setDataVersion((version) => version + 1);
        setDataLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [stockCode, activePeriod, dataSourceId]);

  useEffect(() => {
    activePeriodRef.current = activePeriod;
    mainIndicatorRef.current = mainIndicator;
    subIndicatorRef.current = subIndicators;
    persistIndicatorPreferences();
  }, [activePeriod, mainIndicator, persistIndicatorPreferences, subIndicators]);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  const getCurrentDrawingSnapshot = useCallback((): PersistedOverlay[] => {
    const chart = chartRef.current;
    return chart
      ? snapshotOverlays(chart.getOverlays({ groupId: DRAWING_GROUP_ID }))
      : [];
  }, []);

  const syncHistoryControls = useCallback(() => {
    setCanUndoDrawing(undoStackRef.current.length > 0);
    setCanRedoDrawing(redoStackRef.current.length > 0);
  }, []);

  const persistDrawingSnapshot = useCallback((snapshot: PersistedOverlay[]) => {
    writePersistedSnapshot(drawingStorageKey, snapshot);
    if (user) {
      void saveCloudDrawing(user.id, stockCode, activePeriod, snapshot).catch((error) => {
        console.error('保存云端画线失败，已保留本地缓存', error);
      });
    }
  }, [activePeriod, drawingStorageKey, stockCode, user]);

  const commitDrawingState = useCallback(() => {
    const nextSnapshot = getCurrentDrawingSnapshot();
    const previousSnapshot = committedSnapshotRef.current;
    if (JSON.stringify(nextSnapshot) === JSON.stringify(previousSnapshot)) return;

    undoStackRef.current.push(clonePersistedSnapshot(previousSnapshot));
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
    redoStackRef.current = [];
    committedSnapshotRef.current = nextSnapshot;
    persistDrawingSnapshot(nextSnapshot);
    setDrawingCount(nextSnapshot.length);
    syncHistoryControls();
  }, [getCurrentDrawingSnapshot, persistDrawingSnapshot, syncHistoryControls]);

  const buildPersistedOverlay = useCallback((overlay: PersistedOverlay): OverlayCreate => ({
    ...overlay,
    groupId: DRAWING_GROUP_ID,
    onPressedMoveEnd: () => window.setTimeout(commitDrawingState, 0),
    onRemoved: () => {
      if (!applyingSnapshotRef.current) window.setTimeout(commitDrawingState, 0);
    },
  }), [commitDrawingState]);

  const applyDrawingSnapshot = useCallback((snapshot: PersistedOverlay[]) => {
    const chart = chartRef.current;
    if (!chart) return;
    const committedSnapshot = clonePersistedSnapshot(snapshot);
    const chartSnapshot = clonePersistedSnapshot(snapshot);
    applyingSnapshotRef.current = true;
    try {
      chart.removeOverlay({ groupId: DRAWING_GROUP_ID });
      if (chartSnapshot.length > 0) {
        chart.createOverlay(chartSnapshot.map(buildPersistedOverlay));
      }
    } finally {
      applyingSnapshotRef.current = false;
    }
    activeDrawingIdRef.current = null;
    committedSnapshotRef.current = committedSnapshot;
    persistDrawingSnapshot(committedSnapshot);
    setDrawingCount(committedSnapshot.length);
    setActiveDrawingTool(null);
  }, [buildPersistedOverlay, persistDrawingSnapshot]);

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
      styles: getChartThemeStyles(themeRef.current),
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

    // 在初始化时添加默认指标
    if (mainIndicatorRef.current) {
      chart.createIndicator(mainIndicatorRef.current, {
        pane: { id: 'candle_pane' },
        isStack: true,
      });
    }
    // 初始化所有已启用的副图指标
    (subIndicatorRef.current ?? []).forEach((indicator) => {
      restorePaneHeight(chart, chart.createIndicator(indicator), indicator);
    });

    window.setTimeout(() => restoreCurrentChartView(chart), 0);

    const handleVisibleRangeChange = () => scheduleChartViewSave();
    const handlePaneDrag = () => {
      const nextPaneHeights = { ...paneHeightsRef.current };
      chart.getIndicators().forEach((indicator) => {
        if (indicator.paneId === 'candle_pane') return;
        const options = chart.getPaneOptions(indicator.paneId);
        if (options && !Array.isArray(options) && options.height) nextPaneHeights[indicator.name] = options.height;
      });
      persistIndicatorPreferences(nextPaneHeights);
    };
    chart.subscribeAction('onVisibleRangeChange', handleVisibleRangeChange);
    chart.subscribeAction('onPaneDrag', handlePaneDrag);

    const persistedOverlays = clonePersistedSnapshot(readPersistedOverlays(drawingStorageKey));
    const chartOverlays = clonePersistedSnapshot(persistedOverlays);
    activeDrawingIdRef.current = null;
    committedSnapshotRef.current = persistedOverlays;
    undoStackRef.current = [];
    redoStackRef.current = [];
    if (persistedOverlays.length > 0) {
      chart.createOverlay(chartOverlays.map(buildPersistedOverlay));
    }
    setDrawingCount(persistedOverlays.length);
    syncHistoryControls();
  }, [stockCode, activePeriod, drawingStorageKey, buildPersistedOverlay, persistIndicatorPreferences, restoreCurrentChartView, restorePaneHeight, scheduleChartViewSave, syncHistoryControls]);

  const toggleMainIndicator = useCallback((indicator: TechnicalIndicator) => {
    setMainIndicator((current) => (current === indicator ? null : indicator));
  }, []);

  const toggleSubIndicator = useCallback((indicator: TechnicalIndicator) => {
    setSubIndicators((current) =>
      current.includes(indicator) ? current.filter((i) => i !== indicator) : [...current, indicator]
    );
  }, []);

  const startDrawing = useCallback((name: string, needsText = false) => {
    const chart = chartRef.current;
    if (!chart) return;
    let extendData: string | undefined;
    if (needsText) {
      const text = window.prompt(name === 'simpleTag' ? '输入价格标签' : '输入图表标注');
      if (!text?.trim()) return;
      extendData = text.trim();
    }
    setActiveDrawingTool(name);
    const overlayId = chart.createOverlay({
      name,
      groupId: DRAWING_GROUP_ID,
      mode: name === 'brush' ? 'normal' : 'weak_magnet',
      extendData,
      onDrawEnd: () => {
        activeDrawingIdRef.current = null;
        setActiveDrawingTool(null);
        window.setTimeout(commitDrawingState, 0);
      },
      onPressedMoveEnd: () => window.setTimeout(commitDrawingState, 0),
      onRemoved: () => {
        if (!applyingSnapshotRef.current) window.setTimeout(commitDrawingState, 0);
      },
    });
    activeDrawingIdRef.current = typeof overlayId === 'string' ? overlayId : null;
  }, [commitDrawingState]);

  const undoDrawing = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const activeDrawingId = activeDrawingIdRef.current;
    if (activeDrawingId) {
      chart.removeOverlay({ id: activeDrawingId });
      activeDrawingIdRef.current = null;
      setActiveDrawingTool(null);
      return;
    }

    const previousSnapshot = undoStackRef.current.pop();
    if (!previousSnapshot) return;
    redoStackRef.current.push(clonePersistedSnapshot(committedSnapshotRef.current));
    applyDrawingSnapshot(previousSnapshot);
    syncHistoryControls();
  }, [applyDrawingSnapshot, syncHistoryControls]);

  const redoDrawing = useCallback(() => {
    const nextSnapshot = redoStackRef.current.pop();
    if (!nextSnapshot) return;
    undoStackRef.current.push(clonePersistedSnapshot(committedSnapshotRef.current));
    applyDrawingSnapshot(nextSnapshot);
    syncHistoryControls();
  }, [applyDrawingSnapshot, syncHistoryControls]);

  const clearDrawings = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    chart.removeOverlay({ groupId: DRAWING_GROUP_ID });
    activeDrawingIdRef.current = null;
    setActiveDrawingTool(null);
    window.setTimeout(commitDrawingState, 0);
  }, [commitDrawingState]);

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
      if (viewSaveTimerRef.current !== null) {
        window.clearTimeout(viewSaveTimerRef.current);
        saveCurrentChartView();
      }
      if (chartRef.current) {
        dispose(chartRef.current);
        chartRef.current = null;
      }
    };
  }, [mounted, initChart, saveCurrentChartView]);

  // 云端偏好存在时优先恢复；首次启用时把当前浏览器里的偏好完整迁移到云端。
  useEffect(() => {
    if (!mounted || !userId) return;
    let cancelled = false;
    cloudPreferencesReadyRef.current = false;
    if (cloudPreferencesSaveTimerRef.current !== null) {
      window.clearTimeout(cloudPreferencesSaveTimerRef.current);
    }
    const localSnapshot = readChartPreferencesSnapshot();
    void fetchCloudChartPreferences(userId).then(async (remoteSnapshot) => {
      if (cancelled) return;
      if (remoteSnapshot) {
        writeChartPreferencesSnapshot(remoteSnapshot);
        const restored = readChartPreferences();
        activePeriodRef.current = restored.activePeriod;
        mainIndicatorRef.current = restored.mainIndicator;
        subIndicatorRef.current = restored.subIndicators;
        paneHeightsRef.current = restored.paneHeights;
        setActivePeriod(restored.activePeriod);
        setMainIndicator(restored.mainIndicator);
        setSubIndicators(restored.subIndicators);
        window.setTimeout(() => {
          if (chartRef.current) restoreCurrentChartViewRef.current(chartRef.current);
        }, 100);
      } else {
        await saveCloudChartPreferences(userId, localSnapshot);
      }
      if (!cancelled) cloudPreferencesReadyRef.current = true;
    }).catch((error) => {
      console.error('加载云端图表偏好失败，暂用本地缓存', error);
      if (!cancelled) cloudPreferencesReadyRef.current = true;
    });
    return () => {
      cancelled = true;
      cloudPreferencesReadyRef.current = false;
      if (cloudPreferencesSaveTimerRef.current !== null) {
        window.clearTimeout(cloudPreferencesSaveTimerRef.current);
      }
    };
  }, [mounted, userId]);

  // 登录后以云端记录为准；如果云端尚无记录，则把现有本地画线作为首次迁移内容。
  useEffect(() => {
    if (!mounted || !user || !chartRef.current) return;
    let cancelled = false;
    const localSnapshot = clonePersistedSnapshot(readPersistedOverlays(drawingStorageKey));
    const expectedSnapshot = JSON.stringify(localSnapshot);
    void syncCloudDrawing(user.id, stockCode, activePeriod, localSnapshot).then((remoteSnapshot) => {
      if (cancelled || JSON.stringify(committedSnapshotRef.current) !== expectedSnapshot) return;
      applyDrawingSnapshot(remoteSnapshot);
      undoStackRef.current = [];
      redoStackRef.current = [];
      syncHistoryControls();
    }).catch((error) => {
      console.error('加载云端画线失败，暂用本地缓存', error);
    });
    return () => { cancelled = true; };
  }, [activePeriod, applyDrawingSnapshot, drawingStorageKey, mounted, stockCode, syncHistoryControls, user]);

  // KLineChart 官方支持增量 setStyles；切换主题时保留图表、覆盖物和历史栈。
  useEffect(() => {
    if (!mounted) return;
    chartRef.current?.setStyles(getChartThemeStyles(theme));
  }, [mounted, theme]);

  // 数据更新通过官方 resetData 重新触发 dataLoader，不重建图表实例。
  useEffect(() => {
    if (!mounted || dataVersion === 0) return;
    const chart = chartRef.current;
    if (!chart) return;
    chart.resetData();
    window.setTimeout(() => restoreCurrentChartView(chart), 0);
  }, [dataVersion, mounted, restoreCurrentChartView]);

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

  // 动态同步副图指标 —— 将当前列表与实际图表中的副图指标保持一致
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !mounted) return;

    // 1. 移除现有的所有副图指标（不在 candle_pane 中的）
    const allIndicators = chart.getIndicators();
    allIndicators.forEach((indicator) => {
      if (indicator.paneId !== 'candle_pane') {
        chart.removeIndicator({ paneId: indicator.paneId });
      }
    });

    // 2. 重新添加所有已启用的副图指标
    subIndicators.forEach((indicator) => {
      restorePaneHeight(chart, chart.createIndicator(indicator), indicator);
    });
  }, [subIndicators, mounted, restorePaneHeight]);

  return (
    <div
      className={
        isFocusMode
          ? 'fixed inset-0 z-50 flex h-screen flex-col bg-background'
          : 'flex h-full flex-col'
      }
    >
      <div className="flex flex-col gap-2 border-b border-border/60 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
        <div className="flex w-full min-w-0 items-center justify-between gap-3 sm:w-auto sm:justify-start">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold leading-tight text-foreground sm:text-lg">{stockName}</h2>
            <span className="mt-0.5 block font-mono text-xs leading-none text-muted-foreground sm:text-sm">{stockCode}</span>
          </div>
          <span aria-hidden="true" className="h-9 w-px shrink-0 bg-border/70" />
          <span className="shrink-0 font-mono text-xl font-bold tabular-nums text-foreground sm:text-2xl">
            {currentPrice.toFixed(2)}
          </span>
        </div>
        <div className="flex w-full min-w-0 items-center justify-end gap-1 overflow-x-auto pb-0.5 sm:w-auto sm:gap-1.5 sm:overflow-visible sm:pb-0">
          <span className={`shrink-0 text-[11px] sm:text-xs ${dataFallback ? 'text-[#ff9f0a]' : 'text-[#30d158]'}`}>
            {dataLoading ? '数据加载中' : dataFallback ? '数据源异常 · 模拟降级' : '真实行情数据'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={exportChartImage}
          >
            <Camera className="h-3.5 w-3.5 min-[400px]:mr-1" />
            <span className="hidden min-[400px]:inline">截图</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setIsFocusMode((current) => !current)}
          >
            {isFocusMode ? (
              <Minimize2 className="h-3.5 w-3.5 min-[400px]:mr-1" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5 min-[400px]:mr-1" />
            )}
            <span className="hidden min-[400px]:inline">{isFocusMode ? '退出' : '专注'}</span>
          </Button>
        </div>
      </div>

      <div className="border-b border-border/60 px-4 py-2">
        <div className="flex w-full max-w-full items-center gap-1 overflow-x-auto">
          <span className="mr-1 text-xs text-muted-foreground">周期:</span>
          {timePeriods.map((period) => (
            <Button
              key={period}
              variant={activePeriod === period ? 'default' : 'ghost'}
              size="sm"
              className={`h-7 shrink-0 px-2 text-xs ${
                activePeriod === period
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
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
        data-testid="kline-chart-canvas"
        className={
          isFocusMode
            ? 'min-h-0 w-full flex-1 bg-background'
            : 'h-[400px] w-full bg-background xl:h-auto xl:min-h-[400px] xl:flex-1'
        }
      />

      <div className="flex w-full max-w-full items-center gap-1.5 overflow-x-auto border-b border-border/60 bg-background px-4 py-1.5">
        <span className="mr-1 shrink-0 text-xs text-muted-foreground">画线:</span>
        {overlayTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Button
              key={tool.key}
              variant="ghost"
              size="sm"
              className={`h-7 shrink-0 px-2 text-xs ${
                activeDrawingTool === tool.key
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => startDrawing(tool.key, 'needsText' in tool && tool.needsText)}
            >
              <Icon className="mr-1 h-3.5 w-3.5" />
              {tool.label}
            </Button>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={undoDrawing}
          disabled={!canUndoDrawing && activeDrawingTool === null}
        >
          <Undo2 className="mr-1 h-3.5 w-3.5" />
          撤销
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={redoDrawing}
          disabled={!canRedoDrawing}
        >
          <Redo2 className="mr-1 h-3.5 w-3.5" />
          恢复
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs text-muted-foreground hover:text-[#ff453a]"
          onClick={clearDrawings}
        >
          <Eraser className="mr-1 h-3.5 w-3.5" />
          清空
        </Button>
        <div className="mx-1 h-4 w-px shrink-0 bg-border" />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          aria-label="放大图表"
          onClick={() => zoomChart(1.2)}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          aria-label="缩小图表"
          onClick={() => zoomChart(0.8)}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={scrollToLatest}
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          回到最新
        </Button>
        <span className="ml-auto shrink-0 text-[11px] text-muted-foreground/70">
          {drawingCount > 0 ? `已保存 ${drawingCount} 个` : '自动保存'}
        </span>
      </div>

      <div className="grid gap-1.5 border-b border-border/60 bg-background px-3 py-2 sm:px-4">
        <div className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-1.5">
          <span className="text-xs text-muted-foreground">主图:</span>
          <div className="scrollbar-none flex min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain pb-0.5 touch-pan-x">
            {mainIndicators.map((indicator) => (
              <Badge
                key={indicator.key}
                variant={mainIndicator === indicator.key ? 'default' : 'outline'}
                className={`shrink-0 cursor-pointer px-2 py-0.5 text-xs ${
                  mainIndicator === indicator.key
                    ? 'border-blue-500/50 bg-blue-500/20 text-blue-700 hover:bg-blue-500/30 dark:text-blue-300'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => toggleMainIndicator(indicator.key)}
              >
                {indicator.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-1.5">
          <span className="text-xs text-muted-foreground">副图:</span>
          <div className="scrollbar-none flex min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain pb-0.5 touch-pan-x">
            {subIndicatorList.map((indicator) => (
              <Badge
                key={indicator.key}
                variant={subIndicators.includes(indicator.key) ? 'default' : 'outline'}
                className={`shrink-0 cursor-pointer px-2 py-0.5 text-xs ${
                  subIndicators.includes(indicator.key)
                    ? 'border-violet-500/50 bg-violet-500/20 text-violet-700 hover:bg-violet-500/30 dark:text-violet-300'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => toggleSubIndicator(indicator.key)}
              >
                {indicator.label}
              </Badge>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
