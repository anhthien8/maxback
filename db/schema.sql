CREATE TABLE IF NOT EXISTS exchange_links (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rate INTEGER NOT NULL DEFAULT 0 CHECK (rate BETWEEN 0 AND 100),
  pop INTEGER NOT NULL DEFAULT 0,
  url TEXT NOT NULL,
  home_url TEXT, -- homepage URL carrying the ref code; /reg prefers it over url
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
  type TEXT NOT NULL DEFAULT 'Crypto',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS exchange_links_status_idx ON exchange_links(status);
CREATE TABLE IF NOT EXISTS clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  country TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS clicks_slug_idx ON clicks(slug);
