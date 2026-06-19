import {
  bigint,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

export const marketBars = pgTable('market_bars', {
  source: varchar('source', { length: 16 }).notNull(),
  symbol: varchar('symbol', { length: 32 }).notNull(),
  interval: varchar('interval', { length: 16 }).notNull(),
  timestamp: bigint('timestamp', { mode: 'number' }).notNull(),
  open: doublePrecision('open').notNull(),
  high: doublePrecision('high').notNull(),
  low: doublePrecision('low').notNull(),
  close: doublePrecision('close').notNull(),
  volume: doublePrecision('volume').notNull().default(0),
  turnover: doublePrecision('turnover'),
  storedAt: timestamp('stored_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.source, table.symbol, table.interval, table.timestamp] }),
  index('market_bars_lookup_idx').on(table.symbol, table.source, table.interval, table.timestamp.desc()),
]);

export const latestQuotes = pgTable('latest_quotes', {
  source: varchar('source', { length: 16 }).notNull(),
  symbol: varchar('symbol', { length: 32 }).notNull(),
  price: doublePrecision('price').notNull(),
  change: doublePrecision('change').notNull(),
  changePercent: doublePrecision('change_percent').notNull(),
  open: doublePrecision('open').notNull(),
  high: doublePrecision('high').notNull(),
  low: doublePrecision('low').notNull(),
  volume: doublePrecision('volume').notNull().default(0),
  yesterdayClose: doublePrecision('yesterday_close').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.source, table.symbol] }),
  index('latest_quotes_updated_idx').on(table.updatedAt.desc()),
]);

export const dataSyncState = pgTable('data_sync_state', {
  source: varchar('source', { length: 16 }).notNull(),
  symbol: varchar('symbol', { length: 32 }).notNull(),
  interval: varchar('interval', { length: 16 }).notNull(),
  lastTimestamp: bigint('last_timestamp', { mode: 'number' }),
  rowsStored: integer('rows_stored').notNull().default(0),
  status: varchar('status', { length: 16 }).notNull().default('idle'),
  error: text('error'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.source, table.symbol, table.interval] }),
]);
