/**
 * 凡人修仙传 - 类型定义
 */

/** 环境变量（Cloudflare Bindings） */
export interface Env {
  DB: D1Database
}

/** 境界配置 */
export interface RealmConfig {
  name: string
  speed: number
  lifespan: number
}

/** 境界数据库行 */
export interface RealmRow {
  name: string
  sort_order: number
  max_exp: number
  hp: number
  mp: number
  atk: number
  def: number
  speed: number
  lifespan: number
  breakthrough_chance: number
}

/** 玩家数据库行 */
export interface PlayerRow {
  uid: string
  name: string
  realm: string
  realm_index: number
  exp: number
  age: number
  spirit_stones: number
  speed_multiplier: number
  speed_expire_at: number
  last_heartbeat_time: number
  injury_status: string
  created_at: number
  last_active: number
  abyss_layer: number
  abyss_max_layer: number
  abyss_last_reward: number
  idle_start_at: number
}

/** 背包物品行 */
export interface InventoryRow {
  item_id: number
  name: string
  quantity: number
}

/** 存档数据结构 */
export interface SaveData {
  uid: string
  name: string
  realmIndex: number
  exp: number
  age: number
  spiritStones: number
  speedMultiplier: number
  speedExpireTime: number
  items: Record<string, number>
  exportedAt: number
}

/** 存档包（签名 + 数据） */
export interface SavePackage {
  s: string
  d: SaveData
  v: number
}

/** 离线收益结果 */
export interface OfflineResult {
  offline: boolean
  offlineMinutes?: number
  gain?: number
  randomEvent?: { type: string; name?: string; desc?: string } | null
  reincarnation?: boolean
  oldRealm?: string
  newRealm?: string
  lifespanRemaining?: number
}
