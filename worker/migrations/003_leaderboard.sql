-- 排行榜表
CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  realm TEXT,
  realm_index INTEGER DEFAULT 0,
  age INTEGER DEFAULT 16,
  lifespan INTEGER DEFAULT 80,
  gold INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_score ON leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_uid ON leaderboard(uid);
