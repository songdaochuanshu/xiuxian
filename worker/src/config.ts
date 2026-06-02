/**
 * 凡人修仙传 - 配置常量
 */

import type { RealmConfig } from './types'

/**
 * 敏感配置从数据库 configs 表读取
 * admin 后台设置页面可修改
 */

export async function getConfigValue(db: D1Database, key: string, fallback: string): Promise<string> {
  try {
    const row = await db.prepare("SELECT value FROM configs WHERE key = ?").bind(key).first<{ value: string }>()
    return row?.value || fallback
  } catch {
    return fallback
  }
}

/** 管理密码（数据库 configs.key = 'admin_password'） */
export async function getAdminPassword(db: D1Database): Promise<string> {
  return getConfigValue(db, 'admin_password', 'xiuxian2026')
}

/** 存档签名密钥（数据库 configs.key = 'save_hmac_key'） */
export async function getSaveHmacKey(db: D1Database): Promise<string> {
  return getConfigValue(db, 'save_hmac_key', 'xiuxian_save_v1_key')
}

/** 默认境界配置（数据库不可用时的 fallback） */
export const DEFAULT_REALMS: RealmConfig[] = [
  { name: '炼气期一层', speed: 1, lifespan: 80 },
  { name: '炼气期二层', speed: 1.5, lifespan: 85 },
  { name: '炼气期三层', speed: 2, lifespan: 90 },
  { name: '炼气期四层', speed: 3, lifespan: 95 },
  { name: '炼气期五层', speed: 4, lifespan: 100 },
  { name: '炼气期六层', speed: 5, lifespan: 110 },
  { name: '炼气期七层', speed: 7, lifespan: 120 },
  { name: '炼气期八层', speed: 9, lifespan: 130 },
  { name: '炼气期九层', speed: 12, lifespan: 140 },
  { name: '筑基初期', speed: 18, lifespan: 200 },
  { name: '筑基中期', speed: 25, lifespan: 230 },
  { name: '筑基后期', speed: 35, lifespan: 260 },
  { name: '金丹初期', speed: 50, lifespan: 350 },
  { name: '金丹中期', speed: 70, lifespan: 420 },
  { name: '金丹后期', speed: 100, lifespan: 500 },
  { name: '元婴初期', speed: 140, lifespan: 650 },
  { name: '元婴中期', speed: 200, lifespan: 800 },
  { name: '元婴后期', speed: 300, lifespan: 1000 },
  { name: '化神期', speed: 450, lifespan: 1500 },
  { name: '炼虚期', speed: 700, lifespan: 2500 },
  { name: '合体期', speed: 1100, lifespan: 4000 },
  { name: '大乘期', speed: 1800, lifespan: 6000 },
  { name: '渡劫期', speed: 3000, lifespan: 10000 },
  { name: '飞升大圆满', speed: 5000, lifespan: 99999 },
]

/** 默认修为上限（与客户端 REALMS 一致） */
export const DEFAULT_MAX_EXP = [
  100, 200, 400, 800, 1500, 3000, 6000, 12000, 24000,
  40000, 65000, 100000, 180000, 320000, 550000,
  1000000, 2000000, 4000000, 8000000, 18000000,
  40000000, 90000000, 200000000, 500000000,
]

/** 镇妖塔 Boss 名字库 */
export const BOSS_NAMES = [
  '妖鼠王', '毒蛇精', '山贼头领', '黑熊妖', '九尾妖狐',
  '血魔弟子', '幽冥鬼将', '千年树妖', '墨蛟', '远古龙魂',
  '噬魂蝠王', '赤炎虎', '冰霜巨蟒', '暗影刺客', '铁甲龟将',
  '雷翼鹰', '毒蝎皇后', '石魔巨人', '亡灵骑士', '地狱犬',
  '炎魔领主', '寒冰巫妖', '雷霆蜥蜴', '暗夜狼王', '血色修罗',
  '天魔将', '堕落天使', '混沌之主', '虚空行者', '灭世龙神',
  '太古凶兽', '万年妖皇', '仙界叛将', '混沌魔尊', '天道之敌',
]
