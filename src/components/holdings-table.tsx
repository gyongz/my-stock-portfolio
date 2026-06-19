'use client';

import type { HoldingWithPnL, Holding } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, TrendingUp, TrendingDown } from 'lucide-react';

interface HoldingsTableProps {
  holdings: HoldingWithPnL[];
  onEdit: (holding: Holding) => void;
  onDelete: (id: string) => void;
  onSelect: (holding: HoldingWithPnL) => void;
  selectedId?: string;
  collapsed?: boolean;
}

export default function HoldingsTable({
  holdings,
  onEdit,
  onDelete,
  onSelect,
  selectedId,
  collapsed = false,
}: HoldingsTableProps) {
  if (holdings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">暂无持仓记录</p>
        <p className="text-xs mt-1">点击上方“添加持仓”开始</p>
      </div>
    );
  }

  // 收起模式：仅显示名称 + 代码，代码换行到名称下方
  if (collapsed) {
    return (
      <div className="divide-y divide-slate-700/30">
        {holdings.map((h) => {
          const isUp = h.pnl >= 0;
          return (
            <div
              key={h.id}
              className={`px-3 py-2.5 cursor-pointer transition-colors hover:bg-slate-700/30 ${
                selectedId === h.id ? 'bg-slate-700/40' : ''
              }`}
              onClick={() => onSelect(h)}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-200 truncate min-w-0 flex-1">{h.name}</div>
                <span className="text-sm font-mono text-slate-200 ml-2 tabular-nums">{h.currentPrice.toFixed(2)}</span>
              </div>
              <div className="text-xs font-mono text-slate-500 mt-0.5">{h.code}</div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-slate-700/50 hover:bg-transparent">
            <TableHead className="text-slate-400 text-xs h-8 px-2">名称</TableHead>
            <TableHead className="text-slate-400 text-xs h-8 px-2 text-right">代码</TableHead>
            <TableHead className="text-slate-400 text-xs h-8 px-2 text-right">持仓</TableHead>
            <TableHead className="text-slate-400 text-xs h-8 px-2 text-right hidden md:table-cell">成本价</TableHead>
            <TableHead className="text-slate-400 text-xs h-8 px-2 text-right">现价</TableHead>
            <TableHead className="text-slate-400 text-xs h-8 px-2 text-right">市值</TableHead>
            <TableHead className="text-slate-400 text-xs h-8 px-2 text-right">盈亏</TableHead>
            <TableHead className="text-slate-400 text-xs h-8 px-2 text-right w-[60px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((h) => {
            const isUp = h.pnl >= 0;
            return (
              <TableRow
                key={h.id}
                className={`border-slate-700/30 cursor-pointer transition-colors hover:bg-slate-700/30 ${
                  selectedId === h.id ? 'bg-slate-700/40' : ''
                }`}
                onClick={() => onSelect(h)}
              >
                <TableCell className="px-2 py-2">
                  <div className="text-sm font-medium text-slate-200 truncate max-w-[100px]">
                    {h.name}
                  </div>
                </TableCell>
                <TableCell className="px-2 py-2 text-right">
                  <span className="text-xs text-slate-400 font-mono">{h.code}</span>
                </TableCell>
                <TableCell className="px-2 py-2 text-right">
                  <span className="text-sm text-slate-200 font-mono">{h.quantity.toLocaleString()}</span>
                </TableCell>
                <TableCell className="px-2 py-2 text-right hidden md:table-cell">
                  <span className="text-sm text-slate-300 font-mono">{h.buyPrice.toFixed(2)}</span>
                </TableCell>
                <TableCell className="px-2 py-2 text-right">
                  <span className="text-sm text-slate-200 font-mono">{h.currentPrice.toFixed(2)}</span>
                </TableCell>
                <TableCell className="px-2 py-2 text-right">
                  <span className="text-sm text-slate-200 font-mono">
                    {h.marketValue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                  </span>
                </TableCell>
                <TableCell className="px-2 py-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {isUp ? (
                      <TrendingUp className="w-3 h-3 text-green-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-400" />
                    )}
                    <span className={`text-sm font-mono ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                      {isUp ? '+' : ''}{h.pnl.toFixed(2)}
                    </span>
                    <span className={`text-xs font-mono ml-0.5 ${isUp ? 'text-green-400/70' : 'text-red-400/70'}`}>
                      ({isUp ? '+' : ''}{h.pnlPercent.toFixed(2)}%)
                    </span>
                  </div>
                </TableCell>
                <TableCell className="px-2 py-2 text-right">
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10"
                      onClick={() => onEdit(h)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                      onClick={() => onDelete(h.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
