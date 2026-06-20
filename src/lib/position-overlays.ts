import { registerOverlay, type OverlayCreateFiguresCallbackParams, type OverlayFigure } from 'klinecharts';

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
    totalStep: 3,
    needDefaultPointFigure: true,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: true,
    createPointFigures: createPositionFigures,
  });
  registered = true;
}

export function createPositionFigures({ coordinates, overlay, yAxis }: OverlayCreateFiguresCallbackParams<PositionOverlayData>): OverlayFigure[] {
  if (coordinates.length < 2 || !yAxis) return [];
  const data = overlay.extendData;
  if (!data || !Number.isFinite(data.entryPrice) || !Number.isFinite(data.takeProfitPrice) || !Number.isFinite(data.stopLossPrice)) return [];

  const x1 = Math.min(coordinates[0].x, coordinates[1].x);
  const x2 = Math.max(coordinates[0].x, coordinates[1].x);
  const width = Math.max(2, x2 - x1);
  const entryY = yAxis.convertToPixel(data.entryPrice);
  const takeProfitY = yAxis.convertToPixel(data.takeProfitPrice);
  const stopLossY = yAxis.convertToPixel(data.stopLossPrice);
  const profitPercent = data.direction === 'long'
    ? ((data.takeProfitPrice - data.entryPrice) / data.entryPrice) * 100
    : ((data.entryPrice - data.takeProfitPrice) / data.entryPrice) * 100;
  const lossPercent = data.direction === 'long'
    ? ((data.entryPrice - data.stopLossPrice) / data.entryPrice) * 100
    : ((data.stopLossPrice - data.entryPrice) / data.entryPrice) * 100;
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
        textFigure('take-profit-text', labelX, takeProfitY, `止盈 ${data.takeProfitPrice.toFixed(2)}  +${Math.abs(profitPercent).toFixed(2)}%`, green),
        textFigure('entry-text', labelX, entryY, `${data.direction === 'long' ? '多头' : '空头'}入场 ${data.entryPrice.toFixed(2)}`, entryColor),
        textFigure('stop-loss-text', labelX, stopLossY, `止损 ${data.stopLossPrice.toFixed(2)}  -${Math.abs(lossPercent).toFixed(2)}%`, red),
  ];
}
