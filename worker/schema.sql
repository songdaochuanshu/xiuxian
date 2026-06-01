-- 兑换码表
CREATE TABLE IF NOT EXISTS codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  multiplier INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  expire_at INTEGER,
  used INTEGER DEFAULT 0,
  used_at INTEGER,
  used_by TEXT,
  created_at INTEGER NOT NULL
);

-- 玩家表
CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  realm TEXT,
  realm_index INTEGER DEFAULT 0,
  age INTEGER DEFAULT 16,
  gold INTEGER DEFAULT 0,
  speed_multiplier INTEGER DEFAULT 1,
  speed_expire_at INTEGER,
  created_at INTEGER NOT NULL,
  last_active INTEGER
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE NOT NULL,
  player_name TEXT,
  product TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  code TEXT,
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);

-- 配置表
CREATE TABLE IF NOT EXISTS configs (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_code ON codes(code);
CREATE INDEX IF NOT EXISTS idx_code_used ON codes(used);
CREATE INDEX IF NOT EXISTS idx_player_name ON players(name);
CREATE INDEX IF NOT EXISTS idx_order_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_order_status ON orders(status);
