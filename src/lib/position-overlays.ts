import {
  registerOverlay,
  type Overlay,
  type OverlayCreateFiguresCallbackParams,
  type OverlayFigure,
  type OverlayPerformEventParams,
} from 'klinecharts';

export const POSITION_OVERLAY_NAME = 'portfolioPosition';

export type PositionDirection = 'long' | 'short';

export interface PositionOverlayData {
  direction: PositionDirection;
  entryPrice: number;
  takeProfitPrice: number;
  stopLossPrice: number;
}

let registered = false;

function lineFigure(key: string, x1: number, x2: number, y: number, color: string, dashed = false): OverlayFigure {
  return {
    key,
    type: 'line',
    attrs: { coordinates: [{ x: x1, y }, { x: x2, y }] },
    styles: { color, size: dashed ? 1 : 1.5, style: dashed ? 'dashed' : 'solid', dashedValue: [5, 4] },
  };
}

function textFigure(key: string, x: number, y: number, text: string, backgroundColor: string): OverlayFigure {
  return {
    key,
    type: 'text',
    attrs: { x, y, text, baseline: 'middle' },
    styles: {
      color: '#ffffff',
      size: 11,
      weight: 600,
      backgroundColor,
      borderRadius: 4,
      paddingLeft: 5,
      paddingRight: 5,
      paddingTop: 3,
      paddingBottom: 3,
    },
    ignoreEvent: true,
  };
}

export function ensurePositionOverlaysRegistered(): void {
  if (registered) return;
  registerOverlay<PositionOverlayData>({
    name: POSITION_OVERLAY_NAME,
    totalStep: 5,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: true,
    createPointFigures: createPositionFigures,
    performEventPressedMove: function (this: Overlay<PositionOverlayData>, params) {
      adjustPositionPoints(params, this.extendData.direction);
    },
  });
  registered = true;
}

export function createPositionFigures({ coordinates, overlay, yAxis }: OverlayCreateFiguresCallbackParams<PositionOverlayData>): OverlayFigure[] {
  if (coordinates.length < 2 || !yAxis) return [];
  const data = overlay.extendData;
  if (!data || !Number.isFinite(data.entryPrice) || !Number.isFinite(data.takeProfitPrice) || !Number.isFinite(data.stopLossPrice)) return [];

  const entryPrice = overlay.points[0]?.value ?? data.entryPrice;
  const takeProfitPrice = overlay.points[2]?.value ?? data.takeProfitPrice;
  const stopLossPrice = overlay.points[3]?.value ?? data.stopLossPrice;
  if (!Number.isFinite(entryPrice) || !Number.isFinite(takeProfitPrice) || !Number.isFinite(stopLossPrice)) return [];

  const x1 = Math.min(coordinates[0].x, coordinates[1].x);
  const x2 = Math.max(coordinates[0].x, coordinates[1].x);
  const width = Math.max(2, x2 - x1);
  const entryY = yAxis.convertToPixel(entryPrice);
  const takeProfitY = yAxis.convertToPixel(takeProfitPrice);
  const stopLossY = yAxis.convertToPixel(stopLossPrice);
  const profitPercent = data.direction === 'long'
    ? ((takeProfitPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - takeProfitPrice) / entryPrice) * 100;
  const lossPercent = data.direction === 'long'
    ? ((entryPrice - stopLossPrice) / entryPrice) * 100
    : ((stopLossPrice - entryPrice) / entryPrice) * 100;
  const green = '#16a34a';
  const red = '#dc2626';
  const entryColor = '#2563eb';
  const labelX = x1 + 6;

  return [
        {
          key: 'profit-area',
          type: 'rect',
          attrs: { x: x1, y: Math.min(entryY, takeProfitY), width, height: Math.abs(entryY - takeProfitY) },
          styles: { style: 'fill', color: 'rgba(22, 163, 74, 0.18)', borderColor: green, borderSize: 0 },
        },
        {
          key: 'loss-area',
          type: 'rect',
          attrs: { x: x1, y: Math.min(entryY, stopLossY), width, height: Math.abs(entryY - stopLossY) },
          styles: { style: 'fill', color: 'rgba(220, 38, 38, 0.16)', borderColor: red, borderSize: 0 },
        },
        lineFigure('take-profit-line', x1, x2, takeProfitY, green, true),
        lineFigure('entry-line', x1, x2, entryY, entryColor),
        lineFigure('stop-loss-line', x1, x2, stopLossY, red, true),
        textFigure('take-profit-text', labelX, takeProfitY, `止盈 ${takeProfitPrice.toFixed(2)}  +${Math.abs(profitPercent).toFixed(2)}%`, green),
        textFigure('entry-text', labelX, entryY, `${data.direction === 'long' ? '多头' : '空头'}入场 ${entryPrice.toFixed(2)}`, entryColor),
        textFigure('stop-loss-text', labelX, stopLossY, `止损 ${stopLossPrice.toFixed(2)}  -${Math.abs(lossPercent).toFixed(2)}%`, red),
  ];
}

function copyHorizontalPosition(target: OverlayPerformEventParams['points'][number], source: OverlayPerformEventParams['points'][number]): void {
  target.timestamp = source.timestamp;
  target.dataIndex = source.dataIndex;
}

export function adjustPositionPoints(params: OverlayPerformEventParams, direction: PositionDirection): void {
  const { points, performPointIndex, performPoint } = params;
  if (points.length < 4 || !Number.isFinite(performPoint.value)) return;
  const nextValue = Number(performPoint.value);

  if (performPointIndex === 0 || performPointIndex === 1) {
    const otherEntryIndex = performPointIndex === 0 ? 1 : 0;
    const previousEntry = Number(points[otherEntryIndex].value ?? nextValue);
    const delta = nextValue - previousEntry;
    points[0].value = nextValue;
    points[1].value = nextValue;
    if (Number.isFinite(points[2].value)) points[2].value = Number(points[2].value) + delta;
    if (Number.isFinite(points[3].value)) points[3].value = Number(points[3].value) + delta;
    if (performPointIndex === 1) {
      copyHorizontalPosition(points[2], points[1]);
      copyHorizontalPosition(points[3], points[1]);
    }
    return;
  }

  const entryPrice = Number(points[0].value);
  if (!(entryPrice > 0)) return;
  const minimumGap = Math.max(entryPrice * 0.0001, 0.01);
  if (performPointIndex === 2) {
    points[2].value = direction === 'long'
      ? Math.max(nextValue, entryPrice + minimumGap)
      : Math.min(nextValue, entryPrice - minimumGap);
    copyHorizontalPosition(points[2], points[1]);
  } else if (performPointIndex === 3) {
    points[3].value = direction === 'long'
      ? Math.min(nextValue, entryPrice - minimumGap)
      : Math.max(nextValue, entryPrice + minimumGap);
    copyHorizontalPosition(points[3], points[1]);
  }
}
