'use client';

import { useCallback, useRef, useState } from 'react';
import { Database, ChevronDown, Check, RefreshCw } from 'lucide-react';
import { DATA_SOURCES } from '@/lib/data-source';
import type { DataSourceId } from '@/lib/data-source/types';

interface Props {
  currentSource: DataSourceId;
  onSourceChange: (id: DataSourceId) => void;
  compact?: boolean;
  onRefresh?: () => void;
}

export default function DataSourceSelector({ currentSource, onSourceChange, compact, onRefresh }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = DATA_SOURCES.find(s => s.id === currentSource) || DATA_SOURCES[0];

  const handleSelect = useCallback((id: DataSourceId) => {
    onSourceChange(id);
    setOpen(false);
  }, [onSourceChange]);

  // 点击外部关闭
  const handleBlur = useCallback((e: React.FocusEvent) => {
    if (!ref.current?.contains(e.relatedTarget as Node)) {
      setOpen(false);
    }
  }, []);

  // 紧凑模式（按钮样式）
  if (compact) {
    return (
      <div className="relative" ref={ref} onBlur={handleBlur}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                     bg-card hover:bg-muted transition-colors duration-150
                     text-xs text-muted-foreground hover:text-foreground"
        >
          <Database size={13} />
          <span>{current.name}</span>
          <ChevronDown size={11} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 w-48 py-1
                          bg-card rounded-xl shadow-xl
                          border border-border overflow-hidden">
            {DATA_SOURCES.map((ds) => (
              <button
                key={ds.id}
                onClick={() => handleSelect(ds.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors
                           ${ds.id === currentSource
                             ? 'text-blue-300 bg-blue-500/10'
                             : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
              >
                <span className="flex-1 text-left">{ds.name}</span>
                {ds.id === currentSource && <Check size={13} className="text-blue-300" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 完整模式（下拉列表）
  return (
    <div className="relative min-w-0" ref={ref} onBlur={handleBlur}>
      <button
        onClick={() => setOpen(!open)}
        className="flex max-w-full items-center gap-1.5 whitespace-nowrap px-2 py-2 rounded-xl sm:gap-2 sm:px-3
                   bg-card hover:bg-muted transition-colors duration-150
                   text-sm text-foreground"
      >
        <Database size={14} className="shrink-0" />
        <span className="hidden truncate min-[360px]:inline">{current.name}</span>
        <span className="ml-1 hidden text-xs text-muted-foreground lg:inline">{current.description}</span>
        <ChevronDown size={14} className={`shrink-0 text-muted-foreground transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 py-1
                        bg-card rounded-xl shadow-xl
                        border border-border overflow-hidden">
          {DATA_SOURCES.map((ds) => (
            <button
              key={ds.id}
              onClick={() => handleSelect(ds.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                         ${ds.id === currentSource
                           ? 'text-blue-300 bg-blue-500/10'
                           : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
            >
              <div className="flex-1 text-left">
                <div className={ds.id === currentSource ? 'text-foreground font-medium' : ''}>
                  {ds.name}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{ds.description}</div>
              </div>
              {ds.id === currentSource && <Check size={14} className="text-blue-300" />}
            </button>
          ))}
          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={() => {
                onRefresh?.();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground
                         hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <RefreshCw size={12} />
              重新加载数据
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
