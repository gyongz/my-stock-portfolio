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
  return JSON.parse(JSON.stringify(persisted)) as PersistedOverlay[];
}

export function writePersistedSnapshot(storageKey: string, snapshot: PersistedOverlay[]): number {
  if (typeof window === 'undefined') return 0;
  localStorage.setItem(storageKey, JSON.stringify(snapshot));
  return snapshot.length;
}

export function clearPersistedOverlays(storageKey: string): void {
  if (typeof window !== 'undefined') localStorage.removeItem(storageKey);
}
