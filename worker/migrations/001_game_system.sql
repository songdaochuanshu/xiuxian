-- ============================================================
-- 凡人修仙传 - 数据库迁移脚本
-- 功能：灵石货币、离线挂机、伤势状态、怪物掉落、坊市配置
-- ============================================================

-- 1. 扩展玩家表：增加灵石、心跳时间、伤势状态
ALTER TABLE players ADD COLUMN spirit_stones INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN last_heartbeat_time INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN injury_status TEXT DEFAULT 'NORMAL'; -- NORMAL / LIGHT / SEVERE

-- 2. 创建怪物/秘境配置表
CREATE TABLE IF NOT EXISTS monsters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  zone TEXT NOT NULL,
  hp INTEGER NOT NULL,
  atk INTEGER NOT NULL,
  def INTEGER NOT NULL,
  exp_reward INTEGER NOT NULL,
  stone_reward_min INTEGER DEFAULT 1,
  stone_reward_max INTEGER DEFAULT 10
);

-- 3. 创建物品表（基础物品定义）
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  icon TEXT DEFAULT '📦',
  desc TEXT DEFAULT '',
  type TEXT DEFAULT 'consumable' -- consumable / material / special
);

-- 4. 创建怪物掉落物品概率表
CREATE TABLE IF NOT EXISTS monster_drops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  monster_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  drop_chance REAL NOT NULL,
  FOREIGN KEY (monster_id) REFERENCES monsters(id),
  FOREIGN KEY (item_id) REFERENCES items(id)
);

-- 5. 创建玩家背包表
CREATE TABLE IF NOT EXISTS user_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_uid TEXT NOT NULL,
  item_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  UNIQUE(user_uid, item_id),
  FOREIGN KEY (item_id) REFERENCES items(id)
);

-- 6. 创建坊市（商店）商品表
CREATE TABLE IF NOT EXISTS shop_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL,
  price INTEGER NOT NULL,
  stock_limit INTEGER DEFAULT -1,
  FOREIGN KEY (item_id) REFERENCES items(id)
);

-- 7. 创建转世记录表
CREATE TABLE IF NOT EXISTS reincarnation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_uid TEXT NOT NULL,
  old_realm TEXT,
  new_realm TEXT DEFAULT '炼气期一层',
  bonus_speed REAL DEFAULT 0.1,
  created_at INTEGER NOT NULL
);

-- ============================================================
-- 初始数据注入
-- ============================================================

-- 基础物品
INSERT OR IGNORE INTO items (id, name, icon, desc, type) VALUES
(1, '疗伤丹', '🩹', '恢复50气血', 'consumable'),
(2, '聚灵丹', '💎', '恢复30灵力', 'consumable'),
(3, '破境丹', '🌟', '增加突破概率20%', 'consumable'),
(4, '筑基丹', '🔶', '突破筑基必备', 'consumable'),
(5, '蛇胆', '🟢', '永久+2攻击', 'consumable'),
(6, '龙血丹', '🐉', '永久+50气血上限', 'consumable'),
(7, '大还丹', '❤️‍🔥', '完全恢复气血', 'consumable'),
(8, '回灵散', '💙', '完全恢复灵力', 'consumable'),
(9, '灵石袋', '💰', '获得50灵石', 'consumable'),
(10, '妖兽内丹', '🔮', '稀有材料', 'material'),
(11, '千年灵芝', '🍄', '稀有药材', 'material'),
(12, '龙鳞', '🐲', '传说材料', 'material');

-- 怪物配置
INSERT OR IGNORE INTO monsters (id, name, zone, hp, atk, def, exp_reward, stone_reward_min, stone_reward_max) VALUES
(1, '低阶妖鼠', '苍云山脉', 30, 6, 2, 15, 2, 5),
(2, '毒蛇', '苍云山脉', 45, 10, 3, 25, 3, 8),
(3, '野狼', '苍云山脉', 60, 12, 5, 35, 5, 12),
(4, '幽冥白狼', '幽冥森林', 120, 25, 10, 60, 10, 25),
(5, '妖狐', '幽冥森林', 180, 35, 15, 90, 15, 35),
(6, '黑熊精', '幽冥森林', 250, 40, 25, 130, 20, 50),
(7, '血魔宗余孽', '血魔宗遗址', 350, 70, 30, 200, 40, 90),
(8, '血魔长老', '血魔宗遗址', 600, 100, 50, 400, 80, 180),
(9, '墨蛟', '龙渊秘境', 1200, 240, 110, 800, 200, 500),
(10, '远古龙魂', '龙渊秘境', 2500, 400, 200, 2000, 500, 1000);

-- 怪物掉落
INSERT OR IGNORE INTO monster_drops (monster_id, item_id, drop_chance) VALUES
-- 苍云山脉
(1, 1, 0.3),  -- 妖鼠掉疗伤丹 30%
(1, 2, 0.15), -- 妖鼠掉聚灵丹 15%
(2, 1, 0.35), -- 毒蛇掉疗伤丹 35%
(2, 5, 0.4),  -- 毒蛇掉蛇胆 40%
(3, 1, 0.4),  -- 野狼掉疗伤丹 40%
(3, 2, 0.25), -- 野狼掉聚灵丹 25%
-- 幽冥森林
(4, 1, 0.3),  -- 白狼掉疗伤丹
(4, 3, 0.1),  -- 白狼掉破境丹 10%
(5, 2, 0.3),  -- 妖狐掉聚灵丹
(5, 5, 0.25), -- 妖狐掉蛇胆
(6, 3, 0.15), -- 黑熊掉破境丹
(6, 6, 0.08), -- 黑熊掉龙血丹 8%
-- 血魔宗遗址
(7, 3, 0.2),  -- 余孽掉破境丹
(7, 7, 0.1),  -- 余孽掉大还丹 10%
(8, 3, 0.25), -- 长老掉破境丹
(8, 8, 0.1),  -- 长老掉回灵散
(8, 10, 0.15),-- 长老掉妖兽内丹
-- 龙渊秘境
(9, 6, 0.15), -- 墨蛟掉龙血丹
(9, 10, 0.2), -- 墨蛟掉妖兽内丹
(9, 12, 0.05),-- 墨蛟掉龙鳞 5%
(10, 6, 0.2), -- 龙魂掉龙血丹
(10, 10, 0.3),-- 龙魂掉妖兽内丹
(10, 12, 0.1),-- 龙魂掉龙鳞 10%
(10, 11, 0.15);-- 龙魂掉千年灵芝

-- 坊市商品
INSERT OR IGNORE INTO shop_items (item_id, price, stock_limit) VALUES
(1, 10, -1),   -- 疗伤丹 10灵石 无限
(2, 15, -1),   -- 聚灵丹 15灵石 无限
(3, 50, -1),   -- 破境丹 50灵石 无限
(4, 500, 1),   -- 筑基丹 500灵石 限购1
(5, 30, -1),   -- 蛇胆 30灵石 无限
(6, 150, -1),  -- 龙血丹 150灵石 无限
(7, 80, -1),   -- 大还丹 80灵石 无限
(8, 80, -1);   -- 回灵散 80灵石 无限

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_inventory_uid ON user_inventory(user_uid);
CREATE INDEX IF NOT EXISTS idx_user_inventory_item ON user_inventory(item_id);
CREATE INDEX IF NOT EXISTS idx_monster_drops_monster ON monster_drops(monster_id);
CREATE INDEX IF NOT EXISTS idx_monster_drops_item ON monster_drops(item_id);
CREATE INDEX IF NOT EXISTS idx_reincarnation_uid ON reincarnation_log(user_uid);
