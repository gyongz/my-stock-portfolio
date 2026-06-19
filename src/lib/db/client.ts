import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

type MarketDatabase = NodePgDatabase<typeof schema>;

const globalForDatabase = globalThis as typeof globalThis & {
  marketDataPool?: Pool;
  marketDatabase?: MarketDatabase;
};

/** Returns null when persistence has not been configured. */
export function getDatabase(): MarketDatabase | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  if (!globalForDatabase.marketDataPool) {
    globalForDatabase.marketDataPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  if (!globalForDatabase.marketDatabase) {
    globalForDatabase.marketDatabase = drizzle(globalForDatabase.marketDataPool, { schema });
  }
  return globalForDatabase.marketDatabase;
}

export function isMarketDataPersistenceEnabled(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
