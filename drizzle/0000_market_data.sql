CREATE TABLE IF NOT EXISTS "market_bars" (
  "source" varchar(16) NOT NULL,
  "symbol" varchar(32) NOT NULL,
  "interval" varchar(16) NOT NULL,
  "timestamp" bigint NOT NULL,
  "open" double precision NOT NULL,
  "high" double precision NOT NULL,
  "low" double precision NOT NULL,
  "close" double precision NOT NULL,
  "volume" double precision DEFAULT 0 NOT NULL,
  "turnover" double precision,
  "stored_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "market_bars_pk" PRIMARY KEY ("source", "symbol", "interval", "timestamp")
);

CREATE INDEX IF NOT EXISTS "market_bars_lookup_idx"
  ON "market_bars" ("symbol", "source", "interval", "timestamp" DESC);

CREATE TABLE IF NOT EXISTS "latest_quotes" (
  "source" varchar(16) NOT NULL,
  "symbol" varchar(32) NOT NULL,
  "price" double precision NOT NULL,
  "change" double precision NOT NULL,
  "change_percent" double precision NOT NULL,
  "open" double precision NOT NULL,
  "high" double precision NOT NULL,
  "low" double precision NOT NULL,
  "volume" double precision DEFAULT 0 NOT NULL,
  "yesterday_close" double precision NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "latest_quotes_pk" PRIMARY KEY ("source", "symbol")
);

CREATE INDEX IF NOT EXISTS "latest_quotes_updated_idx" ON "latest_quotes" ("updated_at" DESC);

CREATE TABLE IF NOT EXISTS "data_sync_state" (
  "source" varchar(16) NOT NULL,
  "symbol" varchar(32) NOT NULL,
  "interval" varchar(16) NOT NULL,
  "last_timestamp" bigint,
  "rows_stored" integer DEFAULT 0 NOT NULL,
  "status" varchar(16) DEFAULT 'idle' NOT NULL,
  "error" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "data_sync_state_pk" PRIMARY KEY ("source", "symbol", "interval")
);
