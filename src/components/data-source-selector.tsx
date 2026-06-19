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
                     bg-[#2c2c2e] hover:bg-[#3a3a3c] transition-colors duration-150
                     text-xs text-[#98989d] hover:text-white"
        >
          <Database size={13} />
          <span>{current.name}</span>
          <ChevronDown size={11} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 w-48 py-1
                          bg-[#2c2c2e] rounded-xl shadow-xl
                          border border-[#3a3a3c] overflow-hidden">
            {DATA_SOURCES.map((ds) => (
              <button
                key={ds.id}
                onClick={() => handleSelect(ds.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors
                           ${ds.id === currentSource
                             ? 'text-blue-300 bg-blue-500/10'
                             : 'text-[#98989d] hover:text-white hover:bg-white/5'}`}
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
    <div className="relative" ref={ref} onBlur={handleBlur}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl
                   bg-[#2c2c2e] hover:bg-[#3a3a3c] transition-colors duration-150
                   text-sm text-white"
      >
        <Database size={14} />
        {current.name}
        <span className="text-[#98989d] text-xs ml-1">{current.description}</span>
        <ChevronDown size={14} className={`text-[#98989d] transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-64 py-1
                        bg-[#2c2c2e] rounded-xl shadow-xl
                        border border-[#3a3a3c] overflow-hidden">
          {DATA_SOURCES.map((ds) => (
            <button
              key={ds.id}
              onClick={() => handleSelect(ds.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                         ${ds.id === currentSource
                           ? 'text-blue-300 bg-blue-500/10'
                           : 'text-[#98989d] hover:text-white hover:bg-white/5'}`}
            >
              <div className="flex-1 text-left">
                <div className={ds.id === currentSource ? 'text-white font-medium' : ''}>
                  {ds.name}
                </div>
                <div className="text-xs text-[#98989d] mt-0.5">{ds.description}</div>
              </div>
              {ds.id === currentSource && <Check size={14} className="text-blue-300" />}
            </button>
          ))}
          <div className="border-t border-[#3a3a3c] mt-1 pt-1">
            <button
              onClick={() => {
                onRefresh?.();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-xs text-[#98989d]
                         hover:text-white hover:bg-white/5 transition-colors"
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
