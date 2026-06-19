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
import { Pencil, Trash2, TrendingUp } from 'lucide-react';

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
      <div className="flex flex-col items-center justify-center py-12 text-[#98989d]">
        <TrendingUp className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">暂无持仓记录</p>
        <p className="text-xs mt-1 text-[#98989d]/70">点击上方 "添加" 开始</p>
      </div>
    );
  }

  // 收起模式：左侧名称+代码，右侧现价+涨跌幅
  if (collapsed) {
    return (
      <div>
        {/* 表头 */}
        <div className="flex items-start justify-between gap-1 px-3 py-2 text-[11px] text-[#98989d] tracking-tight">
          <span>名称/代码</span>
          <span>现价/涨跌</span>
        </div>
        <div className="border-t border-white/[0.06]" />
        {holdings.map((h) => {
          return (
            <div
              key={h.id}
              className={`px-3 py-2.5 cursor-pointer transition-colors duration-150 hover:bg-white/[0.04] ${
                selectedId === h.id ? 'bg-white/[0.06]' : ''
              }`}
              onClick={() => onSelect(h)}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white truncate">{h.name}</div>
                  <div className="text-[11px] font-mono text-[#98989d] mt-0.5">{h.code}</div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className={`text-sm font-semibold font-mono tabular-nums ${
                    h.dailyChangePercent >= 0 ? 'text-[#30d158]' : 'text-[#ff453a]'
                  }`}>{h.currentPrice.toFixed(2)}</span>
                  <span className={`text-[11px] font-mono tabular-nums leading-tight mt-0.5 ${
                    h.dailyChangePercent >= 0 ? 'text-[#30d158]' : 'text-[#ff453a]'
                  }`}>
                    {h.dailyChangePercent >= 0 ? '+' : ''}{h.dailyChangePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
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
          <TableRow className="border-white/[0.06] hover:bg-transparent">
            <TableHead className="text-[#98989d] text-[11px] font-medium h-8 px-3">名称</TableHead>
            <TableHead className="text-[#98989d] text-[11px] font-medium h-8 px-3 text-right">代码</TableHead>
            <TableHead className="text-[#98989d] text-[11px] font-medium h-8 px-3 text-right">持仓</TableHead>
            <TableHead className="text-[#98989d] text-[11px] font-medium h-8 px-3 text-right hidden md:table-cell">成本价</TableHead>
            <TableHead className="text-[#98989d] text-[11px] font-medium h-8 px-3 text-right">现价</TableHead>
            <TableHead className="text-[#98989d] text-[11px] font-medium h-8 px-3 text-right">市值</TableHead>
            <TableHead className="text-[#98989d] text-[11px] font-medium h-8 px-3 text-right">盈亏</TableHead>
            <TableHead className="text-[#98989d] text-[11px] font-medium h-8 px-3 text-right w-[60px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holdings.map((h) => {
            const isUp = h.pnl >= 0;
            return (
              <TableRow
                key={h.id}
                className={`cursor-pointer transition-colors duration-150 border-white/[0.04] ${
                  selectedId === h.id ? 'bg-white/[0.06]' : ''
                } hover:bg-white/[0.04]`}
                onClick={() => onSelect(h)}
              >
                <TableCell className="font-medium text-white text-sm px-3 py-2.5">{h.name}</TableCell>
                <TableCell className="text-[#98989d] font-mono text-xs px-3 py-2.5 text-right">{h.code}</TableCell>
                <TableCell className="text-white font-mono text-xs px-3 py-2.5 text-right tabular-nums">
                  {h.quantity.toLocaleString()}
                </TableCell>
                <TableCell className="text-[#98989d] font-mono text-xs px-3 py-2.5 text-right tabular-nums hidden md:table-cell">
                  {h.buyPrice.toFixed(2)}
                </TableCell>
                <TableCell className={`font-mono text-xs px-3 py-2.5 text-right tabular-nums ${
                  h.dailyChangePercent >= 0 ? 'text-[#30d158]' : 'text-[#ff453a]'
                }`}>
                  {h.currentPrice.toFixed(2)}
                </TableCell>
                <TableCell className="text-white font-mono text-xs px-3 py-2.5 text-right tabular-nums">
                  {h.marketValue.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className={`font-mono text-xs px-3 py-2.5 text-right tabular-nums ${
                  isUp ? 'text-[#30d158]' : 'text-[#ff453a]'
                }`}>
                  <div>
                    {isUp ? '+' : ''}{h.pnl.toFixed(2)}
                  </div>
                  <div className="text-[10px] opacity-80">
                    ({isUp ? '+' : ''}{h.pnlPercent.toFixed(2)}%)
                  </div>
                </TableCell>
                <TableCell className="px-3 py-2.5 text-right">
                  <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[#98989d] hover:text-white hover:bg-white/[0.08]"
                      onClick={() => onEdit(h)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[#98989d] hover:text-[#ff453a] hover:bg-[#ff453a]/10"
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