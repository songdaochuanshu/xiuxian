CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  desc TEXT NOT NULL,
  target INTEGER NOT NULL,
  reward_type TEXT NOT NULL,
  reward_value TEXT NOT NULL,
  reward_amount INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS player_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT NOT NULL,
  task_id TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  claimed_at INTEGER DEFAULT 0,
  date TEXT DEFAULT '',
  UNIQUE(uid, task_id, date)
);

CREATE INDEX IF NOT EXISTS idx_player_tasks_uid ON player_tasks(uid);
CREATE INDEX IF NOT EXISTS idx_player_tasks_date ON player_tasks(uid, date);
