ALTER TABLE players ADD COLUMN abyss_layer INTEGER DEFAULT 1;
ALTER TABLE players ADD COLUMN abyss_max_layer INTEGER DEFAULT 1;
ALTER TABLE players ADD COLUMN abyss_last_reward INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS abyss_first_clear (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  layer INTEGER NOT NULL,
  cleared_at INTEGER NOT NULL,
  UNIQUE(uid, layer)
);

CREATE INDEX IF NOT EXISTS idx_abyss_first_clear_uid ON abyss_first_clear(uid);
