'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import StockSearch from '@/components/stock-search';
import type { StockInfo } from '@/lib/data-source/types';

interface WatchlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (stock: StockInfo) => void;
}

export default function WatchlistDialog({ open, onOpenChange, onSubmit }: WatchlistDialogProps) {
  const [selectedStock, setSelectedStock] = useState<StockInfo | null>(null);

  useEffect(() => {
    if (open) setSelectedStock(null);
  }, [open]);

  const handleSubmit = () => {
    if (!selectedStock) return;
    onSubmit(selectedStock);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[0.06] bg-[#2c2c2e] text-white shadow-none sm:max-w-md">
        <DialogHeader>
          <DialogTitle>添加自选</DialogTitle>
          <DialogDescription className="text-[#98989d]">
            搜索 A 股代码或名称，加入后将自动更新实时行情。
          </DialogDescription>
        </DialogHeader>
        <StockSearch value={selectedStock?.code || ''} onSelect={setSelectedStock} />
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[#98989d] hover:text-white">
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedStock}
            className="bg-[#30d158] text-white hover:bg-[#30d158]/90"
          >
            加入自选
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
