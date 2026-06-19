'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useDataSource, type DataSourceAPI } from './index';

const DataSourceContext = createContext<DataSourceAPI | null>(null);

export function DataSourceProvider({ children }: { children: ReactNode }) {
  const api = useDataSource();
  return <DataSourceContext.Provider value={api}>{children}</DataSourceContext.Provider>;
}

export function useDataSourceContext(): DataSourceAPI {
  const ctx = useContext(DataSourceContext);
  if (!ctx) throw new Error('useDataSourceContext must be used within DataSourceProvider');
  return ctx;
}