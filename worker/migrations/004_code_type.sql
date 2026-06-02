-- 兑换码类型字段（speed=加速, auto_break=自动突破）
ALTER TABLE codes ADD COLUMN code_type TEXT DEFAULT 'speed';
