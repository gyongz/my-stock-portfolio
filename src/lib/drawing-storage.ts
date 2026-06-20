import type { Overlay } from 'klinecharts';

export type PersistedOverlay = Pick<
  Overlay,
  'name' | 'points' | 'extendData' | 'styles' | 'mode' | 'lock' | 'visible'
>;

const STORAGE_PREFIX = 'portfolio-chart-drawings:v1';

export function getDrawingStorageKey(stockCode: string, period: string): string {
  return `${STORAGE_PREFIX}:${stockCode}:${period}`;
}

export function readPersistedOverlays(storageKey: string): PersistedOverlay[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PersistedOverlay => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as Partial<PersistedOverlay>;
      return typeof candidate.name === 'string' && Array.isArray(candidate.points);
    });
  } catch {
    return [];
  }
}

export function writePersistedOverlays(storageKey: string, overlays: Overlay[]): number {
  const persisted = snapshotOverlays(overlays);
  return writePersistedSnapshot(storageKey, persisted);
}

export function snapshotOverlays(overlays: Overlay[]): PersistedOverlay[] {
  const persisted: PersistedOverlay[] = overlays.map((overlay) => ({
    name: overlay.name,
    points: overlay.points,
    extendData: overlay.extendData,
    styles: overlay.styles,
    mode: overlay.mode,
    lock: overlay.lock,
    visible: overlay.visible,
  }));
  return clonePersistedSnapshot(persisted);
}

export function clonePersistedSnapshot(snapshot: PersistedOverlay[]): PersistedOverlay[] {
  return JSON.parse(JSON.stringify(snapshot)) as PersistedOverlay[];
}

export function remapDrawingDataIndexes(
  snapshot: PersistedOverlay[],
  data: Array<{ timestamp: number }>,
): PersistedOverlay[] {
  if (data.length === 0) return clonePersistedSnapshot(snapshot);
  const timestamps = data.map((item) => item.timestamp);
  const exactIndexes = new Map(timestamps.map((timestamp, index) => [timestamp, index]));
  const nearestIndex = (timestamp: number): number => {
    const exact = exactIndexes.get(timestamp);
    if (exact !== undefined) return exact;
    let low = 0;
    let high = timestamps.length - 1;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (timestamps[middle] < timestamp) low = middle + 1;
      else high = middle;
    }
    if (low === 0) return 0;
    const previous = low - 1;
    return Math.abs(timestamps[low] - timestamp) < Math.abs(timestamps[previous] - timestamp) ? low : previous;
  };

  return snapshot.map((overlay) => ({
    ...overlay,
    points: overlay.points.map((point) => ({
      ...point,
      dataIndex: typeof point.timestamp === 'number' && Number.isFinite(point.timestamp)
        ? nearestIndex(point.timestamp)
        : point.dataIndex,
    })),
  }));
}

export function writePersistedSnapshot(storageKey: string, snapshot: PersistedOverlay[]): number {
  if (typeof window === 'undefined') return 0;
  localStorage.setItem(storageKey, JSON.stringify(snapshot));
  return snapshot.length;
}

export function clearPersistedOverlays(storageKey: string): void {
  if (typeof window !== 'undefined') localStorage.removeItem(storageKey);
}
