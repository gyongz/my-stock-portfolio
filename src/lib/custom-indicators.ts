import {
  getSupportedIndicators,
  registerIndicator,
} from 'klinecharts';
import type {
  IndicatorDrawParams,
  IndicatorFigureStyle,
  IndicatorTemplate,
  KLineData,
} from 'klinecharts';

export const EMA_RSI_SIGNAL_INDICATOR = 'EMA_RSI_SIGNAL';
export const RSI_HEAT_INDICATOR = 'RSI_HEAT';

interface EmaRsiSignalResult {
  ema144?: number;
  ema169?: number;
  ema288?: number;
  ema338?: number;
  rsi?: number;
  buySignal?: boolean;
  sellSignal?: boolean;
  buyPrice?: number;
  sellPrice?: number;
}

interface RsiHeatResult {
  rsi?: number;
  mid?: number;
  overbought?: number;
  oversold?: number;
  heatColor?: string;
  fillColor?: string;
}

function calculateEma(dataList: KLineData[], length: number): Array<number | undefined> {
  const values: Array<number | undefined> = new Array(dataList.length).fill(undefined);
  let sum = 0;
  let previous = 0;
  const multiplier = 2 / (length + 1);

  dataList.forEach((item, index) => {
    sum += item.close;
    if (index === length - 1) {
      previous = sum / length;
      values[index] = previous;
      return;
    }
    if (index >= length) {
      previous += (item.close - previous) * multiplier;
      values[index] = previous;
    }
  });

  return values;
}

function calculateRsi(dataList: KLineData[], length: number): Array<number | undefined> {
  const values: Array<number | undefined> = new Array(dataList.length).fill(undefined);
  let gainSum = 0;
  let lossSum = 0;
  let averageGain = 0;
  let averageLoss = 0;

  dataList.forEach((item, index) => {
    const change = index === 0 ? 0 : item.close - dataList[index - 1].close;
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);

    if (index <= length) {
      gainSum += gain;
      lossSum += loss;
    }
    if (index < length) return;

    if (index === length) {
      averageGain = gainSum / length;
      averageLoss = lossSum / length;
    } else {
      averageGain = (averageGain * (length - 1) + gain) / length;
      averageLoss = (averageLoss * (length - 1) + loss) / length;
    }

    if (averageLoss === 0) {
      values[index] = 100;
    } else if (averageGain === 0) {
      values[index] = 0;
    } else {
      values[index] = 100 - 100 / (1 + averageGain / averageLoss);
    }
  });

  return values;
}

function rgba(hex: string, opacity: number): string {
  const normalized = hex.replace('#', '');
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, opacity))})`;
}

function lineFigureStyle(
  color: string,
  size = 1,
  style: 'solid' | 'dashed' = 'solid',
  dashedValue: number[] = [],
): IndicatorFigureStyle {
  return { color, size, style, dashedValue, smooth: false } as unknown as IndicatorFigureStyle;
}

function visibleIndexRange<D, C, E>(params: IndicatorDrawParams<D, C, E>) {
  const range = params.chart.getVisibleRange();
  return {
    from: Math.max(0, Math.floor(range.realFrom) - 2),
    to: Math.min(params.indicator.result.length - 1, Math.ceil(range.realTo) + 2),
  };
}

const emaRsiSignalIndicator: IndicatorTemplate<EmaRsiSignalResult, number> = {
  name: EMA_RSI_SIGNAL_INDICATOR,
  shortName: 'EMA×4 · RSI信号',
  series: 'price',
  precision: 2,
  shouldOhlc: true,
  calcParams: [144, 169, 288, 338, 14, 70, 30],
  figures: [
    {
      key: 'ema144',
      title: 'EMA144: ',
      type: 'line',
      styles: () => lineFigureStyle('#14b8a6'),
    },
    {
      key: 'ema169',
      title: 'EMA169: ',
      type: 'line',
      styles: () => lineFigureStyle('#3b82f6'),
    },
    {
      key: 'ema288',
      title: 'EMA288: ',
      type: 'line',
      styles: () => lineFigureStyle('#f59e0b'),
    },
    {
      key: 'ema338',
      title: 'EMA338: ',
      type: 'line',
      styles: () => lineFigureStyle('#ef4444'),
    },
  ],
  calc: (dataList, indicator) => {
    const [ema144Length, ema169Length, ema288Length, ema338Length, rsiLength, overbought, oversold] =
      indicator.calcParams;
    const ema144 = calculateEma(dataList, ema144Length);
    const ema169 = calculateEma(dataList, ema169Length);
    const ema288 = calculateEma(dataList, ema288Length);
    const ema338 = calculateEma(dataList, ema338Length);
    const rsi = calculateRsi(dataList, rsiLength);

    return dataList.map((item, index) => {
      const currentRsi = rsi[index];
      const previousRsi = rsi[index - 1];
      const buySignal =
        currentRsi !== undefined && previousRsi !== undefined && previousRsi < oversold && currentRsi >= oversold;
      const sellSignal =
        currentRsi !== undefined && previousRsi !== undefined && previousRsi > overbought && currentRsi <= overbought;

      return {
        ema144: ema144[index],
        ema169: ema169[index],
        ema288: ema288[index],
        ema338: ema338[index],
        rsi: currentRsi,
        buySignal,
        sellSignal,
        buyPrice: buySignal ? item.low * 0.992 : undefined,
        sellPrice: sellSignal ? item.high * 1.008 : undefined,
      };
    });
  },
  draw: ({ ctx, indicator, xAxis, yAxis, ...params }) => {
    const { from, to } = visibleIndexRange({ ctx, indicator, xAxis, yAxis, ...params });
    ctx.font = '10px ui-sans-serif, system-ui, sans-serif';
    ctx.textAlign = 'center';

    for (let index = from; index <= to; index += 1) {
      const item = indicator.result[index];
      if (!item) continue;
      const x = xAxis.convertToPixel(index);

      if (item.buySignal && item.buyPrice !== undefined) {
        const y = yAxis.convertToPixel(item.buyPrice);
        ctx.fillStyle = '#39ff14';
        ctx.beginPath();
        ctx.moveTo(x, y - 8);
        ctx.lineTo(x - 5, y);
        ctx.lineTo(x + 5, y);
        ctx.closePath();
        ctx.fill();
        ctx.fillText('超卖', x, y + 11);
      }

      if (item.sellSignal && item.sellPrice !== undefined) {
        const y = yAxis.convertToPixel(item.sellPrice);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(x, y + 8);
        ctx.lineTo(x - 5, y);
        ctx.lineTo(x + 5, y);
        ctx.closePath();
        ctx.fill();
        ctx.fillText('超买', x, y - 5);
      }
    }

    return false;
  },
};

function buildHeatColor(
  rsiValues: Array<number | undefined>,
  index: number,
  trendDirection: number,
  trendFlipped: boolean,
  levels: number,
  heatThreshold: number,
) {
  const current = rsiValues[index];
  if (current === undefined) return { line: '#3b82f6', fill: rgba('#3b82f6', 0.08) };
  if (current > 70) return { line: '#ff0000', fill: rgba('#ff0000', 0.18) };
  if (current < 30) return { line: '#09ff00', fill: rgba('#09ff00', 0.18) };
  if (trendFlipped) return { line: '#3b82f6', fill: rgba('#3b82f6', 0.1) };

  const windowValues = rsiValues
    .slice(Math.max(0, index - 99), index + 1)
    .filter((value): value is number => value !== undefined);
  const high = Math.max(...windowValues);
  const low = Math.min(...windowValues);
  const step = (high - low) / levels;
  const baseColor = trendDirection >= 0 ? '#16a34a' : '#7f1d1d';

  if (!Number.isFinite(step) || step <= 0) {
    return { line: '#3b82f6', fill: rgba('#3b82f6', 0.08) };
  }

  const bucket = Math.min(levels - 1, Math.max(0, Math.floor((current - low) / step)));
  const lower = low + bucket * step;
  const upper = bucket === levels - 1 ? high + Number.EPSILON : lower + step;
  const touches = windowValues.filter((value) => value >= lower && value < upper).length;
  const alphaBase = Math.max(0, Math.min(100, 80 - touches));
  const coldOpacity = 1 - alphaBase / 100;
  const heatMix = Math.max(0, Math.min(1, (touches - heatThreshold) / 10));
  const opacity = coldOpacity + (1 - coldOpacity) * heatMix;

  return {
    line: rgba(baseColor, Math.max(0.35, opacity)),
    fill: rgba(baseColor, Math.max(0.05, opacity * 0.2)),
  };
}

const rsiHeatIndicator: IndicatorTemplate<RsiHeatResult, number> = {
  name: RSI_HEAT_INDICATOR,
  shortName: 'RSI 14 Heat',
  precision: 1,
  minValue: 0,
  maxValue: 100,
  calcParams: [14, 8, 1],
  figures: [
    {
      key: 'rsi',
      title: 'RSI14: ',
      type: 'line',
      styles: ({ data }) => lineFigureStyle(data.current?.heatColor ?? '#3b82f6', 2),
    },
    {
      key: 'mid',
      title: 'MID50: ',
      type: 'line',
      styles: () => lineFigureStyle('rgba(148, 163, 184, 0.35)', 1, 'dashed', [4, 4]),
    },
    {
      key: 'overbought',
      title: 'OB70: ',
      type: 'line',
      styles: () => lineFigureStyle('rgba(239, 68, 68, 0.55)', 1, 'dashed', [3, 3]),
    },
    {
      key: 'oversold',
      title: 'OS30: ',
      type: 'line',
      styles: () => lineFigureStyle('rgba(34, 197, 94, 0.55)', 1, 'dashed', [3, 3]),
    },
  ],
  calc: (dataList, indicator) => {
    const [rsiLength, levels, heatThreshold] = indicator.calcParams;
    const rsiValues = calculateRsi(dataList, rsiLength);
    let trendDirection = 0;

    return dataList.map((_, index) => {
      const current = rsiValues[index];
      const previousTrend = trendDirection;
      if (current !== undefined) {
        if (current > 50) trendDirection = 1;
        if (current < 50) trendDirection = -1;
      }
      const heat = buildHeatColor(
        rsiValues,
        index,
        trendDirection,
        previousTrend !== 0 && previousTrend !== trendDirection,
        levels,
        heatThreshold,
      );

      return {
        rsi: current,
        mid: current === undefined ? undefined : 50,
        overbought: current === undefined ? undefined : 70,
        oversold: current === undefined ? undefined : 30,
        heatColor: heat.line,
        fillColor: heat.fill,
      };
    });
  },
  draw: ({ ctx, chart, indicator, bounding, xAxis, yAxis }) => {
    const topExtreme = yAxis.convertToPixel(70);
    const bottomExtreme = yAxis.convertToPixel(30);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.04)';
    ctx.fillRect(bounding.left, bounding.top, bounding.width, Math.max(0, topExtreme - bounding.top));
    ctx.fillStyle = 'rgba(34, 197, 94, 0.04)';
    ctx.fillRect(bounding.left, bottomExtreme, bounding.width, Math.max(0, bounding.bottom - bottomExtreme));

    const { from, to } = visibleIndexRange({ ctx, chart, indicator, bounding, xAxis, yAxis });
    const centerY = yAxis.convertToPixel(50);
    const barWidth = Math.max(1, chart.getBarSpace().bar * 0.72);

    for (let index = from; index <= to; index += 1) {
      const item = indicator.result[index];
      if (!item || item.rsi === undefined || !item.fillColor) continue;
      const x = xAxis.convertToPixel(index);
      const rsiY = yAxis.convertToPixel(item.rsi);
      ctx.fillStyle = item.fillColor;
      ctx.fillRect(x - barWidth / 2, Math.min(centerY, rsiY), barWidth, Math.max(1, Math.abs(centerY - rsiY)));
    }

    return false;
  },
};

let registered = false;

export function ensureCustomIndicatorsRegistered() {
  if (registered) return;
  const supported = new Set(getSupportedIndicators());
  if (!supported.has(EMA_RSI_SIGNAL_INDICATOR)) registerIndicator(emaRsiSignalIndicator);
  if (!supported.has(RSI_HEAT_INDICATOR)) registerIndicator(rsiHeatIndicator);
  registered = true;
}
