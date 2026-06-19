'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import type { StockInfo } from '@/lib/data-source/types';
import { STOCK_LIST } from '@/lib/kline-data';

interface StockSearchProps {
  value: string; // 当前选中的股票代码
  onSelect: (stock: StockInfo) => void;
  disabled?: boolean;
}

export default function StockSearch({ value, onSelect, disabled }: StockSearchProps) {
  const [open, setOpen] = useState(false);
  const [stocks, setStocks] = useState<StockInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const loadedRef = useRef(false);

  const selectedStock = stocks.find((s) => s.code === value)
    ?? STOCK_LIST.find((s) => s.code === value);

  /** 从 API 加载全量 A 股列表 */
  const loadStockList = useCallback(async () => {
    if (loadedRef.current) return;
    setLoading(true);
    try {
      const res = await fetch('/api/data-source?type=stock-list&source=sina');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setStocks(json.data as StockInfo[]);
        loadedRef.current = true;
      } else {
        throw new Error('加载失败，使用内置列表');
      }
    } catch {
      // 降级到内置列表
      setStocks(
        STOCK_LIST.map((s) => ({
          code: s.code,
          name: s.name,
          open: s.basePrice,
          yesterdayClose: s.basePrice,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // 打开时加载股票列表
  useEffect(() => {
    if (open && !loadedRef.current) {
      loadStockList();
    }
  }, [open, loadStockList]);

  /** 按代码或名称过滤 */
  const filteredStocks = searchQuery
    ? stocks.filter(
        (s) =>
          s.code.includes(searchQuery) ||
          s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : stocks;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between bg-[#3a3a3c] border-0 text-white rounded-xl h-10 px-3 font-normal hover:bg-[#3a3a3c]/80',
            !selectedStock && 'text-[#98989d]'
          )}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              加载股票列表...
            </span>
          ) : selectedStock ? (
            <span className="text-white">
              {selectedStock.code} - {selectedStock.name}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              搜索股票代码或名称
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] max-h-[min(400px,60vh)] p-0 bg-[#2c2c2e] border-white/[0.08] rounded-xl"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="输入股票代码或名称搜索..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="border-0 text-white placeholder:text-[#98989d] h-11"
          />
          <CommandList className="max-h-[340px] overflow-y-auto custom-scrollbar">
            {loading && stocks.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-[#98989d] text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                加载中...
              </div>
            ) : filteredStocks.length === 0 ? (
              <CommandEmpty className="py-6 text-center text-[#98989d] text-sm">
                未找到匹配 "{searchQuery}" 的股票
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredStocks.slice(0, 200).map((stock) => (
                  <CommandItem
                    key={stock.code}
                    value={stock.code}
                    onSelect={(currentValue) => {
                      const s = stocks.find((x) => x.code === currentValue)
                        ?? STOCK_LIST.find((x) => x.code === currentValue);
                      if (s) onSelect(s);
                      setOpen(false);
                      setSearchQuery('');
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 text-white cursor-pointer aria-selected:bg-white/[0.08]"
                  >
                    <Check
                      className={cn(
                        'h-4 w-4 shrink-0 text-[#30d158]',
                        value === stock.code ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium truncate">{stock.name}</span>
                      <span className="text-xs text-[#98989d]">{stock.code}</span>
                    </div>
                    {stock.yesterdayClose && stock.yesterdayClose > 0 && (
                      <span className="ml-auto text-xs text-[#98989d] tabular-nums">
                        {stock.yesterdayClose.toFixed(2)}
                      </span>
                    )}
                  </CommandItem>
                ))}
                {filteredStocks.length > 200 && (
                  <div className="px-3 py-2 text-xs text-center text-[#98989d] border-t border-white/[0.06]">
                    共 {filteredStocks.length} 只，显示前 200 只
                  </div>
                )}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}