'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PositionDirection, PositionOverlayData } from '@/lib/position-overlays';

interface PositionDialogProps {
  open: boolean;
  direction: PositionDirection;
  currentPrice: number;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PositionOverlayData) => void;
}

function roundPrice(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

export default function PositionDialog({ open, direction, currentPrice, onOpenChange, onSubmit }: PositionDialogProps) {
  const [entryPrice, setEntryPrice] = useState('');
  const [takeProfitPrice, setTakeProfitPrice] = useState('');
  const [takeProfitPercent, setTakeProfitPercent] = useState('10');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [stopLossPercent, setStopLossPercent] = useState('5');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const entry = currentPrice > 0 ? currentPrice : 1;
    setEntryPrice(roundPrice(entry));
    setTakeProfitPercent('10');
    setStopLossPercent('5');
    setTakeProfitPrice(roundPrice(entry * (direction === 'long' ? 1.1 : 0.9)));
    setStopLossPrice(roundPrice(entry * (direction === 'long' ? 0.95 : 1.05)));
    setError(null);
  }, [currentPrice, direction, open]);

  const syncTargetsFromEntry = (value: string) => {
    setEntryPrice(value);
    const entry = Number(value);
    const profitPercent = Number(takeProfitPercent);
    const lossPercent = Number(stopLossPercent);
    if (!(entry > 0)) return;
    if (Number.isFinite(profitPercent)) {
      setTakeProfitPrice(roundPrice(entry * (1 + (direction === 'long' ? profitPercent : -profitPercent) / 100)));
    }
    if (Number.isFinite(lossPercent)) {
      setStopLossPrice(roundPrice(entry * (1 + (direction === 'long' ? -lossPercent : lossPercent) / 100)));
    }
  };

  const syncTakeProfitFromPercent = (value: string) => {
    setTakeProfitPercent(value);
    const entry = Number(entryPrice);
    const percent = Number(value);
    if (entry > 0 && Number.isFinite(percent)) {
      setTakeProfitPrice(roundPrice(entry * (1 + (direction === 'long' ? percent : -percent) / 100)));
    }
  };

  const syncStopLossFromPercent = (value: string) => {
    setStopLossPercent(value);
    const entry = Number(entryPrice);
    const percent = Number(value);
    if (entry > 0 && Number.isFinite(percent)) {
      setStopLossPrice(roundPrice(entry * (1 + (direction === 'long' ? -percent : percent) / 100)));
    }
  };

  const syncPercentFromPrice = (kind: 'profit' | 'loss', value: string) => {
    const entry = Number(entryPrice);
    const price = Number(value);
    if (kind === 'profit') setTakeProfitPrice(value);
    else setStopLossPrice(value);
    if (!(entry > 0) || !Number.isFinite(price)) return;
    const percent = kind === 'profit'
      ? (direction === 'long' ? (price - entry) / entry : (entry - price) / entry) * 100
      : (direction === 'long' ? (entry - price) / entry : (price - entry) / entry) * 100;
    if (kind === 'profit') setTakeProfitPercent(percent.toFixed(2));
    else setStopLossPercent(percent.toFixed(2));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const entry = Number(entryPrice);
    const profit = Number(takeProfitPrice);
    const loss = Number(stopLossPrice);
    if (!(entry > 0) || !(profit > 0) || !(loss > 0)) {
      setError('请输入有效的正数价格');
      return;
    }
    const valid = direction === 'long' ? profit > entry && loss < entry : profit < entry && loss > entry;
    if (!valid) {
      setError(direction === 'long' ? '多头需要止盈高于入场、止损低于入场' : '空头需要止盈低于入场、止损高于入场');
      return;
    }
    onSubmit({ direction, entryPrice: entry, takeProfitPrice: profit, stopLossPrice: loss });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{direction === 'long' ? '多头仓位' : '空头仓位'}</DialogTitle>
          <DialogDescription>设置入场、止盈和止损价格；价格与百分比会自动换算。</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="position-entry">入场价格</Label>
            <Input id="position-entry" type="number" min="0.01" step="0.01" value={entryPrice} onChange={(event) => syncTargetsFromEntry(event.target.value)} />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
            <div className="space-y-2">
              <Label htmlFor="position-profit-price">止盈价格</Label>
              <Input id="position-profit-price" type="number" min="0.01" step="0.01" value={takeProfitPrice} onChange={(event) => syncPercentFromPrice('profit', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position-profit-percent">止盈百分比</Label>
              <Input id="position-profit-percent" type="number" min="0.01" step="0.01" value={takeProfitPercent} onChange={(event) => syncTakeProfitFromPercent(event.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
            <div className="space-y-2">
              <Label htmlFor="position-loss-price">止损价格</Label>
              <Input id="position-loss-price" type="number" min="0.01" step="0.01" value={stopLossPrice} onChange={(event) => syncPercentFromPrice('loss', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position-loss-percent">止损百分比</Label>
              <Input id="position-loss-percent" type="number" min="0.01" step="0.01" value={stopLossPercent} onChange={(event) => syncStopLossFromPercent(event.target.value)} />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit">添加到图表</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
