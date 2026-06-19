'use client';

import { Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { WatchlistItem } from '@/lib/types';

interface WatchlistTableProps {
  items: WatchlistItem[];
  selectedCode?: string;
  collapsed?: boolean;
  onSelect: (item: WatchlistItem) => void;
  onDelete: (code: string) => void;
}

export default function WatchlistTable({
  items,
  selectedCode,
  collapsed = false,
  onSelect,
  onDelete,
}: WatchlistTableProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-12 text-[#98989d]">
        <Star className="mb-3 h-10 w-10 opacity-30" />
        <p className="text-sm">暂无自选股票</p>
        <p className="mt-1 text-center text-xs text-[#98989d]/70">点击“添加自选”关注股票</p>
      </div>
    );
  }

  if (collapsed) {
    return (
      <div>
        {items.map((item) => {
          const isUp = item.changePercent >= 0;
          return (
            <button
              key={item.code}
              type="button"
              onClick={() => onSelect(item)}
              className={`flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04] ${
                selectedCode === item.code ? 'bg-white/[0.06]' : ''
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-white">{item.name}</span>
                <span className="mt-0.5 block font-mono text-[11px] text-[#98989d]">{item.code}</span>
              </span>
              <span className={`shrink-0 text-right font-mono text-xs ${isUp ? 'text-[#30d158]' : 'text-[#ff453a]'}`}>
                <span className="block font-semibold">{item.currentPrice.toFixed(2)}</span>
                <span className="block text-[11px]">{isUp ? '+' : ''}{item.changePercent.toFixed(2)}%</span>
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-white/[0.06] hover:bg-transparent">
            <TableHead className="h-8 px-3 text-[11px] font-medium text-[#98989d]">名称</TableHead>
            <TableHead className="h-8 px-3 text-right text-[11px] font-medium text-[#98989d]">代码</TableHead>
            <TableHead className="h-8 px-3 text-right text-[11px] font-medium text-[#98989d]">现价</TableHead>
            <TableHead className="h-8 px-3 text-right text-[11px] font-medium text-[#98989d]">涨跌</TableHead>
            <TableHead className="h-8 w-[52px] px-3 text-right text-[11px] font-medium text-[#98989d]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isUp = item.changePercent >= 0;
            return (
              <TableRow
                key={item.code}
                onClick={() => onSelect(item)}
                className={`cursor-pointer border-white/[0.04] transition-colors hover:bg-white/[0.04] ${
                  selectedCode === item.code ? 'bg-white/[0.06]' : ''
                }`}
              >
                <TableCell className="px-3 py-2.5 text-sm font-medium text-white">{item.name}</TableCell>
                <TableCell className="px-3 py-2.5 text-right font-mono text-xs text-[#98989d]">{item.code}</TableCell>
                <TableCell className={`px-3 py-2.5 text-right font-mono text-xs ${isUp ? 'text-[#30d158]' : 'text-[#ff453a]'}`}>
                  {item.currentPrice.toFixed(2)}
                </TableCell>
                <TableCell className={`px-3 py-2.5 text-right font-mono text-xs ${isUp ? 'text-[#30d158]' : 'text-[#ff453a]'}`}>
                  <div>{isUp ? '+' : ''}{item.change.toFixed(2)}</div>
                  <div className="text-[10px] opacity-80">({isUp ? '+' : ''}{item.changePercent.toFixed(2)}%)</div>
                </TableCell>
                <TableCell className="px-3 py-2.5 text-right" onClick={(event) => event.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`删除自选 ${item.name}`}
                    className="h-7 w-7 text-[#98989d] hover:bg-[#ff453a]/10 hover:text-[#ff453a]"
                    onClick={() => onDelete(item.code)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
