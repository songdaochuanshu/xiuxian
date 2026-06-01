-- 兑换码表
CREATE TABLE IF NOT EXISTS codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,        -- 兑换码
  multiplier INTEGER NOT NULL,      -- 倍速: 2, 5, 10
  duration INTEGER NOT NULL,        -- 时长秒数: 0=永久
  expire_at INTEGER,                -- 过期时间戳(毫秒)
  used INTEGER DEFAULT 0,           -- 是否已使用: 0=未使用, 1=已使用
  used_at INTEGER,                  -- 使用时间戳
  created_at INTEGER NOT NULL       -- 创建时间戳
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_code ON codes(code);
CREATE INDEX IF NOT EXISTS idx_used ON codes(used);
