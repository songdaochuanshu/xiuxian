-- 添加修为字段（代码中已有使用但schema中缺失）
ALTER TABLE players ADD COLUMN exp INTEGER DEFAULT 0;
