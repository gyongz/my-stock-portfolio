'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Upload } from 'lucide-react';
import type { Holding } from '@/lib/types';
import { getStockName } from '@/lib/kline-data';

interface ImportExportProps {
  holdings: Holding[];
  onImport: (holdings: Holding[]) => void;
}

export default function ImportExport({ holdings, onImport }: ImportExportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** 导出为 CSV */
  const handleExport = () => {
    const header = '股票代码,股票名称,持仓数量,买入均价,当前价格\n';
    const rows = holdings
      .map(
        (h) =>
          `${h.code},${h.name},${h.quantity},${h.buyPrice},${h.currentPrice}`
      )
      .join('\n');
    const csv = header + rows;
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `持仓数据_${new Date().toLocaleDateString('zh-CN')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** 导入 CSV */
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter((line) => line.trim());
      if (lines.length < 2) {
        alert('CSV 文件格式错误：至少需要表头和一行数据');
        return;
      }

      // 跳过表头
      const dataLines = lines.slice(1);
      const imported: Holding[] = [];
      const now = new Date().toISOString();

      for (const line of dataLines) {
        const parts = line.split(',');
        if (parts.length < 5) continue;

        const code = parts[0].trim();
        const name = parts[1].trim() || getStockName(code);
        const quantity = parseFloat(parts[2].trim());
        const buyPrice = parseFloat(parts[3].trim());
        const currentPrice = parseFloat(parts[4].trim());

        if (isNaN(quantity) || isNaN(buyPrice) || isNaN(currentPrice)) continue;

        imported.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          code,
          name,
          quantity,
          buyPrice,
          currentPrice,
          updatedAt: now,
        });
      }

      if (imported.length === 0) {
        alert('未能解析有效的持仓数据');
        return;
      }

      onImport(imported);
      alert(`成功导入 ${imported.length} 条持仓记录`);
    };
    reader.readAsText(file, 'UTF-8');

    // 重置 input，允许重复选择同一文件
    e.target.value = '';
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleExport}
        className="text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 h-8"
      >
        <Download className="w-3.5 h-3.5 mr-1" />
        导出
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleImport}
        className="text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 h-8"
      >
        <Upload className="w-3.5 h-3.5 mr-1" />
        导入
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}