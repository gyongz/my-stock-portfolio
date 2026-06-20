import type { TechnicalIndicator, TimePeriod } from '@/lib/types';

const PREFERENCES_KEY = 'portfolio-chart-preferences:v1';
const VIEW_PREFIX = 'portfolio-chart-view:v1';

const PERIODS = new Set<TimePeriod>(['1min', '5min', '15min', '30min', '60min', 'day', 'week', 'month']);
const INDICATORS = new Set<TechnicalIndicator>([
  'MA', 'EMA', 'SMA', 'BBI', 'BOLL', 'SAR', 'MACD', 'KDJ', 'RSI', 'VOL', 'CCI',
  'BIAS', 'WR', 'DMI', 'OBV', 'ROC', 'MTM', 'EMA_RSI_SIGNAL', 'RSI_HEAT',
]);

export interface ChartPreferences {
  activePeriod: TimePeriod;
  mainIndicator: TechnicalIndicator | null;
  subIndicators: TechnicalIndicator[];
  paneHeights: Record<string, number>;
}

export interface ChartViewState {
  barSpace: number;
  rightTimestamp: number;
}

export interface ChartPreferencesSnapshot {
  preferences: ChartPreferences;
  views: Record<string, ChartViewState>;
}

export const DEFAULT_CHART_PREFERENCES: ChartPreferences = {
  activePeriod: 'day',
  mainIndicator: 'MA',
  subIndicators: ['MACD'],
  paneHeights: {},
};

export function readChartPreferences(): ChartPreferences {
  if (typeof window === 'undefined') return DEFAULT_CHART_PREFERENCES;
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || '{}') as Partial<ChartPreferences>;
    const paneHeights = Object.fromEntries(
      Object.entries(parsed.paneHeights ?? {}).filter(([, height]) => Number.isFinite(height) && height >= 50),
    );
    return {
      activePeriod: parsed.activePeriod && PERIODS.has(parsed.activePeriod) ? parsed.activePeriod : 'day',
      mainIndicator: parsed.mainIndicator === null || (parsed.mainIndicator && INDICATORS.has(parsed.mainIndicator))
        ? parsed.mainIndicator
        : 'MA',
      subIndicators: Array.isArray(parsed.subIndicators)
        ? parsed.subIndicators.filter((item): item is TechnicalIndicator => INDICATORS.has(item))
        : ['MACD'],
      paneHeights,
    };
  } catch {
    return DEFAULT_CHART_PREFERENCES;
  }
}

export function writeChartPreferences(preferences: ChartPreferences): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

function getViewKey(stockCode: string, period: TimePeriod): string {
  return `${VIEW_PREFIX}:${stockCode}:${period}`;
}

export function readChartView(stockCode: string, period: TimePeriod): ChartViewState | null {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(getViewKey(stockCode, period)) || 'null') as ChartViewState | null;
    if (!parsed || !Number.isFinite(parsed.barSpace) || !Number.isFinite(parsed.rightTimestamp)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeChartView(stockCode: string, period: TimePeriod, view: ChartViewState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(getViewKey(stockCode, period), JSON.stringify(view));
}

export function readChartPreferencesSnapshot(): ChartPreferencesSnapshot {
  const views: Record<string, ChartViewState> = {};
  if (typeof window !== 'undefined') {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(`${VIEW_PREFIX}:`)) continue;
      try {
        const view = JSON.parse(localStorage.getItem(key) || 'null') as ChartViewState | null;
        if (view && Number.isFinite(view.barSpace) && Number.isFinite(view.rightTimestamp)) {
          views[key.slice(VIEW_PREFIX.length + 1)] = view;
        }
      } catch {
        // 忽略损坏的单个视窗缓存
      }
    }
  }
  return { preferences: readChartPreferences(), views };
}

export function writeChartPreferencesSnapshot(snapshot: ChartPreferencesSnapshot): void {
  if (typeof window === 'undefined') return;
  writeChartPreferences(snapshot.preferences);
  const existingKeys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith(`${VIEW_PREFIX}:`)) existingKeys.push(key);
  }
  existingKeys.forEach((key) => localStorage.removeItem(key));
  Object.entries(snapshot.views).forEach(([key, view]) => {
    if (view && typeof view === 'object' && Number.isFinite(view.barSpace) && Number.isFinite(view.rightTimestamp)) {
      localStorage.setItem(`${VIEW_PREFIX}:${key}`, JSON.stringify(view));
    }
  });
}
