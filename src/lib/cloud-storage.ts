import type { Holding, WatchlistItem } from '@/lib/types';
import type { PersistedOverlay } from '@/lib/drawing-storage';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

function requireClient() {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error('Supabase is not configured');
  return client;
}

export async function fetchCloudHoldings(userId: string): Promise<Holding[]> {
  const { data, error } = await requireClient().from('holdings').select('*').eq('user_id', userId).order('created_at');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    quantity: Number(row.quantity),
    buyPrice: Number(row.buy_price),
    currentPrice: Number(row.current_price),
    updatedAt: row.updated_at,
  }));
}

export async function upsertCloudHoldings(userId: string, holdings: Holding[]): Promise<void> {
  if (holdings.length === 0) return;
  const { error } = await requireClient().from('holdings').upsert(holdings.map((item) => ({
    id: item.id,
    user_id: userId,
    code: item.code,
    name: item.name,
    quantity: item.quantity,
    buy_price: item.buyPrice,
    current_price: item.currentPrice,
    updated_at: item.updatedAt,
  })), { onConflict: 'user_id,id' });
  if (error) throw error;
}

export async function deleteCloudHolding(userId: string, id: string): Promise<void> {
  const { error } = await requireClient().from('holdings').delete().eq('user_id', userId).eq('id', id);
  if (error) throw error;
}

export async function replaceCloudHoldings(userId: string, holdings: Holding[]): Promise<void> {
  const { error } = await requireClient().from('holdings').delete().eq('user_id', userId);
  if (error) throw error;
  await upsertCloudHoldings(userId, holdings);
}

export async function fetchCloudWatchlist(userId: string): Promise<WatchlistItem[]> {
  const { data, error } = await requireClient().from('watchlist').select('*').eq('user_id', userId).order('created_at');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    code: row.code,
    name: row.name,
    currentPrice: Number(row.current_price),
    change: Number(row.change),
    changePercent: Number(row.change_percent),
    updatedAt: row.updated_at,
  }));
}

export async function upsertCloudWatchlist(userId: string, items: WatchlistItem[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await requireClient().from('watchlist').upsert(items.map((item) => ({
    user_id: userId,
    code: item.code,
    name: item.name,
    current_price: item.currentPrice,
    change: item.change,
    change_percent: item.changePercent,
    updated_at: item.updatedAt,
  })), { onConflict: 'user_id,code' });
  if (error) throw error;
}

export async function deleteCloudWatchlistItem(userId: string, code: string): Promise<void> {
  const { error } = await requireClient().from('watchlist').delete().eq('user_id', userId).eq('code', code);
  if (error) throw error;
}

export async function syncCloudDrawing(
  userId: string,
  stockCode: string,
  period: string,
  localSnapshot: PersistedOverlay[],
): Promise<PersistedOverlay[]> {
  const client = requireClient();
  const { data, error } = await client.from('chart_drawings').select('overlays').eq('user_id', userId).eq('stock_code', stockCode).eq('period', period).maybeSingle();
  if (error) throw error;
  if (data) return Array.isArray(data.overlays) ? data.overlays as PersistedOverlay[] : [];
  if (localSnapshot.length > 0) await saveCloudDrawing(userId, stockCode, period, localSnapshot);
  return localSnapshot;
}

export async function saveCloudDrawing(userId: string, stockCode: string, period: string, overlays: PersistedOverlay[]): Promise<void> {
  const { error } = await requireClient().from('chart_drawings').upsert({
    user_id: userId,
    stock_code: stockCode,
    period,
    overlays,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,stock_code,period' });
  if (error) throw error;
}
