/**
 * 凡人修仙传 - Cloudflare Worker (Hono) + TypeScript
 * 核心功能：离线挂机、战斗结算、坊市购买、寿元转世、排行榜、存档导入导出
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'

// ==================== 类型定义 ====================

interface Env {
  DB: D1Database
}

interface RealmConfig {
  name: string
  speed: number
  lifespan: number
}

interface PlayerRow {
  uid: string
  name: string
  realm: string
  realm_index: number
  exp: number
  age: number
  gold: number
  spirit_stones: number
  speed_multiplier: number
  speed_expire_at: number
  last_heartbeat_time: number
  injury_status: string
  created_at: number
  last_active: number
}

interface InventoryRow {
  item_id: number
  name: string
  quantity: number
}

interface SaveData {
  uid: string
  name: string
  realmIndex: number
  exp: number
  age: number
  gold: number
  spiritStones: number
  speedMultiplier: number
  speedExpireTime: number
  items: Record<string, number>
  exportedAt: number
}

interface SavePackage {
  s: string  // signature
  d: SaveData
  v: number  // version
}

// ==================== 常量 ====================

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors())

const ADMIN_PASSWORD = 'xiuxian2026'
const SAVE_HMAC_KEY = 'xiuxian_save_hmac_2026_secret'

const REALM_CONFIG: RealmConfig[] = [
  { name: '炼气期一层', speed: 1, lifespan: 80 },
  { name: '炼气期二层', speed: 1.5, lifespan: 85 },
  { name: '炼气期三层', speed: 2, lifespan: 90 },
  { name: '炼气期四层', speed: 3, lifespan: 95 },
  { name: '炼气期五层', speed: 4, lifespan: 100 },
  { name: '炼气期六层', speed: 5, lifespan: 110 },
  { name: '炼气期七层', speed: 7, lifespan: 120 },
  { name: '炼气期八层', speed: 9, lifespan: 130 },
  { name: '炼气期九层', speed: 12, lifespan: 140 },
  { name: '筑基期', speed: 20, lifespan: 250 },
  { name: '金丹期', speed: 50, lifespan: 500 },
  { name: '元婴期', speed: 120, lifespan: 1000 },
]

const MAX_EXP_ARR = [100, 200, 400, 800, 1500, 3000, 6000, 12000, 24000, 50000, 200000, 1000000]

// ==================== 工具函数 ====================

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getRealmConfig(realmIndex: number): RealmConfig {
  return REALM_CONFIG[Math.min(realmIndex, REALM_CONFIG.length - 1)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getExpCap(realmIndex: number): number {
  return MAX_EXP_ARR[Math.min(realmIndex, MAX_EXP_ARR.length - 1)]
}

// ==================== 离线挂机逻辑 ====================

interface OfflineResult {
  offline: boolean
  offlineMinutes?: number
  gain?: number
  randomEvent?: { type: string; name?: string; desc?: string } | null
  reincarnation?: boolean
  oldRealm?: string
  newRealm?: string
  lifespanRemaining?: number
}

async function processOfflineGain(db: D1Database, user: PlayerRow): Promise<OfflineResult> {
  const now = Date.now()
  const lastHeartbeat = user.last_heartbeat_time || now
  const diffMs = now - lastHeartbeat

  if (diffMs < 5 * 60 * 1000) {
    return { offline: false }
  }

  const maxOfflineMs = 12 * 60 * 60 * 1000
  const offlineMs = Math.min(diffMs, maxOfflineMs)
  const offlineSeconds = Math.floor(offlineMs / 1000)

  const realm = getRealmConfig(user.realm_index)
  const speedMultiplier = user.speed_multiplier || 1
  const baseGain = realm.speed * speedMultiplier
  const totalGain = Math.floor(baseGain * offlineSeconds)

  let randomEvent: { type: string; name?: string; desc?: string } | null = null
  if (Math.random() < 0.02) {
    const events = [
      { type: 'item', itemId: 1, name: '疗伤丹' },
      { type: 'item', itemId: 2, name: '聚灵丹' },
      { type: 'item', itemId: 5, name: '蛇胆' },
      { type: 'injury', status: 'LIGHT', desc: '修炼走火，道基轻伤' },
    ]
    const event = events[Math.floor(Math.random() * events.length)]

    if (event.type === 'item') {
      await db.prepare(`
        INSERT INTO user_inventory (user_uid, item_id, quantity, created_at)
        VALUES (?, ?, 1, ?)
        ON CONFLICT(user_uid, item_id) DO UPDATE SET quantity = quantity + 1
      `).bind(user.uid, event.itemId, now).run()
      randomEvent = { type: 'item', name: event.name }
    } else {
      await db.prepare(
        'UPDATE players SET injury_status = ? WHERE uid = ?'
      ).bind(event.status, user.uid).run()
      randomEvent = { type: 'injury', desc: event.desc }
    }
  }

  const offlineMinutes = Math.floor(offlineMs / 60000)
  const newAge = user.age + offlineMinutes
  const lifespanRemaining = realm.lifespan - newAge

  let reincarnation = false
  let newRealmIndex = user.realm_index
  let newSpeedMultiplier = speedMultiplier
  const expCap = getExpCap(user.realm_index)
  let newExp = Math.min((user.exp || 0) + totalGain, expCap)

  if (lifespanRemaining <= 0) {
    reincarnation = true
    newRealmIndex = 0
    newExp = 0
    newSpeedMultiplier = speedMultiplier + 0.1

    await db.prepare(`
      INSERT INTO reincarnation_log (user_uid, old_realm, new_realm, bonus_speed, created_at)
      VALUES (?, ?, '炼气期一层', 0.1, ?)
    `).bind(user.uid, getRealmConfig(user.realm_index).name, now).run()
  }

  await db.prepare(`
    UPDATE players SET
      exp = ?, realm_index = ?, speed_multiplier = ?, age = ?,
      last_heartbeat_time = ?, last_active = ?
    WHERE uid = ?
  `).bind(newExp, newRealmIndex, newSpeedMultiplier, reincarnation ? 16 : newAge, now, now, user.uid).run()

  return {
    offline: true,
    offlineMinutes,
    gain: totalGain,
    randomEvent,
    reincarnation,
    oldRealm: getRealmConfig(user.realm_index).name,
    newRealm: getRealmConfig(newRealmIndex).name,
    lifespanRemaining: reincarnation ? getRealmConfig(0).lifespan : lifespanRemaining,
  }
}

// ==================== Base64 + HMAC ====================

function base64Encode(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function base64Decode(b64: string): string {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

async function hmacSign(data: string, key: string): Promise<string> {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

async function hmacVerify(data: string, sig: string, key: string): Promise<boolean> {
  const expected = await hmacSign(data, key)
  return expected === sig
}

// ==================== 数据校验 ====================

function validatePlayerData(data: SaveData, existingPlayer: PlayerRow | null): string[] {
  const errors: string[] = []

  if (data.realmIndex < 0 || data.realmIndex >= REALM_CONFIG.length) {
    errors.push('境界索引越界')
  }

  const expCap = getExpCap(data.realmIndex || 0)
  if (data.exp > expCap) {
    errors.push(`修为 ${data.exp} 超过上限 ${expCap}`)
  }

  const maxGold = ((data.realmIndex || 0) + 1) * 10000
  if (data.gold > maxGold) {
    errors.push(`金币 ${data.gold} 超过上限 ${maxGold}`)
  }

  const realm = getRealmConfig(data.realmIndex || 0)
  if (data.age < 16 || data.age > (data.lifespan || realm.lifespan) + 50) {
    errors.push('年龄异常')
  }

  if (data.speedMultiplier > 20) {
    errors.push('加速倍率异常')
  }

  if (existingPlayer) {
    const realmJump = Math.abs((data.realmIndex || 0) - existingPlayer.realm_index)
    if (realmJump > 3) {
      errors.push(`境界跳跃过大: ${existingPlayer.realm_index} → ${data.realmIndex}`)
    }
  }

  return errors
}

// ==================== 公开接口 ====================

app.get('/health', (c) => json({ status: 'ok' }))

// 获取游戏公开配置（公告 + 游戏名等）
app.get('/game/config', async (c) => {
  const db = c.env.DB
  try {
    const rows = await db.prepare("SELECT key, value FROM configs").all<{ key: string; value: string }>()
    const config: Record<string, string> = {}
    for (const row of rows.results || []) {
      config[row.key] = row.value
    }
    return json({
      gameName: config.gameName || '凡人修仙传',
      announcement: config.announcement || '',
    })
  } catch {
    return json({ gameName: '凡人修仙传', announcement: '' })
  }
})

app.get('/announcement', async (c) => {
  const db = c.env.DB
  try {
    const row = await db.prepare("SELECT value FROM configs WHERE key = 'announcement'").first<{ value: string }>()
    return json({ text: row?.value || '' })
  } catch {
    return json({ text: '' })
  }
})

app.get('/shop/config', async (c) => {
  const db = c.env.DB
  try {
    const row = await db.prepare("SELECT value FROM configs WHERE key = 'shop_items'").first<{ value: string }>()
    return json(row ? JSON.parse(row.value) : [])
  } catch {
    return json([])
  }
})

// ==================== 玩家接口 ====================

app.post('/player/sync', async (c) => {
  const db = c.env.DB
  try {
    const data = await c.req.json<{ uid: string; name: string; realm: string; realmIndex: number; age: number; gold: number; speedMultiplier: number; speedExpireTime: number }>()
    const { uid, name, realm, realmIndex, age, gold, speedMultiplier, speedExpireTime } = data

    if (!uid || !name) return json({ error: '缺少必要参数' }, 400)

    const existing = await db.prepare('SELECT * FROM players WHERE uid = ?').bind(uid).first<PlayerRow>()

    let offlineResult: OfflineResult | null = null
    if (existing) {
      offlineResult = await processOfflineGain(db, existing)
    }

    const now = Date.now()

    await db.prepare(`
      INSERT INTO players (uid, name, realm, realm_index, age, gold, speed_multiplier, speed_expire_at, last_heartbeat_time, created_at, last_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uid) DO UPDATE SET
        name = excluded.name, realm = excluded.realm, realm_index = excluded.realm_index,
        age = excluded.age, gold = excluded.gold, speed_multiplier = excluded.speed_multiplier,
        speed_expire_at = excluded.speed_expire_at, last_heartbeat_time = excluded.last_heartbeat_time,
        last_active = excluded.last_active
    `).bind(uid, name, realm, realmIndex, age, gold, speedMultiplier, speedExpireTime || 0, now, now, now).run()

    return json({ success: true, offline: offlineResult })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

app.post('/player/heartbeat', async (c) => {
  const db = c.env.DB
  try {
    const { uid } = await c.req.json<{ uid: string }>()
    if (!uid) return json({ error: '缺少uid' }, 400)
    await db.prepare('UPDATE players SET last_heartbeat_time = ? WHERE uid = ?').bind(Date.now(), uid).run()
    return json({ success: true })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

app.post('/redeem', async (c) => {
  const db = c.env.DB
  try {
    const { code } = await c.req.json<{ code: string }>()
    if (!code) return json({ success: false, error: '请输入兑换码' }, 400)

    const normalizedCode = code.trim().toUpperCase().replace(/\s/g, '')
    const row = await db.prepare('SELECT * FROM codes WHERE code = ?').bind(normalizedCode).first<any>()

    if (!row) return json({ success: false, error: '兑换码不存在' })
    if (row.used) return json({ success: false, error: '兑换码已使用' })
    if (row.expire_at && Date.now() > row.expire_at) return json({ success: false, error: '兑换码已过期' })

    await db.prepare('UPDATE codes SET used = 1, used_at = ? WHERE code = ?').bind(Date.now(), normalizedCode).run()
    return json({ success: true, multiplier: row.multiplier, duration: row.duration })
  } catch (err: any) {
    return json({ success: false, error: '服务器错误' }, 500)
  }
})

// ==================== 战斗结算 ====================

app.post('/api/battle/settle', async (c) => {
  const db = c.env.DB
  try {
    const { uid, monsterId } = await c.req.json<{ uid: string; monsterId: number }>()
    if (!uid || !monsterId) return json({ error: '参数不完整' }, 400)

    const user = await db.prepare('SELECT * FROM players WHERE uid = ?').bind(uid).first<PlayerRow>()
    if (!user) return json({ error: '玩家不存在' }, 404)

    const monster = await db.prepare('SELECT * FROM monsters WHERE id = ?').bind(monsterId).first<any>()
    if (!monster) return json({ error: '怪物不存在' }, 404)

    const now = Date.now()
    const stoneReward = randomInt(monster.stone_reward_min, monster.stone_reward_max)

    const drops = await db.prepare(
      'SELECT md.*, i.name, i.icon FROM monster_drops md JOIN items i ON md.item_id = i.id WHERE md.monster_id = ?'
    ).bind(monsterId).all<any>()

    const droppedItems: { itemId: number; name: string; icon: string }[] = []
    for (const drop of drops.results || []) {
      if (Math.random() < drop.drop_chance) {
        droppedItems.push({ itemId: drop.item_id, name: drop.name, icon: drop.icon })
        await db.prepare(`
          INSERT INTO user_inventory (user_uid, item_id, quantity, created_at)
          VALUES (?, ?, 1, ?)
          ON CONFLICT(user_uid, item_id) DO UPDATE SET quantity = quantity + 1
        `).bind(uid, drop.item_id, now).run()
      }
    }

    const expCap = getExpCap(user.realm_index)
    const newExp = Math.min((user.exp || 0) + monster.exp_reward, expCap)
    const newStones = (user.spirit_stones || 0) + stoneReward

    await db.prepare('UPDATE players SET exp = ?, spirit_stones = ?, last_active = ? WHERE uid = ?')
      .bind(newExp, newStones, now, uid).run()

    return json({
      success: true,
      reward: { exp: monster.exp_reward, stones: stoneReward, items: droppedItems },
    })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

// ==================== 坊市购买 ====================

app.post('/api/shop/buy', async (c) => {
  const db = c.env.DB
  try {
    const { uid, shopItemId } = await c.req.json<{ uid: string; shopItemId: number }>()
    if (!uid || !shopItemId) return json({ error: '参数不完整' }, 400)

    const user = await db.prepare('SELECT * FROM players WHERE uid = ?').bind(uid).first<PlayerRow>()
    if (!user) return json({ error: '玩家不存在' }, 404)

    const shopItem = await db.prepare(
      'SELECT si.*, i.name, i.icon FROM shop_items si JOIN items i ON si.item_id = i.id WHERE si.id = ?'
    ).bind(shopItemId).first<any>()
    if (!shopItem) return json({ error: '商品不存在' }, 404)

    if ((user.spirit_stones || 0) < shopItem.price) return json({ error: '灵石不足' })

    if (shopItem.stock_limit !== -1) {
      const purchased = await db.prepare(
        'SELECT COALESCE(SUM(quantity), 0) as count FROM user_inventory WHERE user_uid = ? AND item_id = ?'
      ).bind(uid, shopItem.item_id).first<{ count: number }>()
      if (purchased!.count >= shopItem.stock_limit) return json({ error: '已达购买上限' })
    }

    const now = Date.now()
    await db.prepare('UPDATE players SET spirit_stones = spirit_stones - ? WHERE uid = ?').bind(shopItem.price, uid).run()
    await db.prepare(`
      INSERT INTO user_inventory (user_uid, item_id, quantity, created_at)
      VALUES (?, ?, 1, ?)
      ON CONFLICT(user_uid, item_id) DO UPDATE SET quantity = quantity + 1
    `).bind(uid, shopItem.item_id, now).run()

    return json({
      success: true,
      item: { name: shopItem.name, icon: shopItem.icon },
      cost: shopItem.price,
      remaining: user.spirit_stones - shopItem.price,
    })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

// ==================== 寿元与转世 ====================

app.post('/api/lifespan/check', async (c) => {
  const db = c.env.DB
  try {
    const { uid } = await c.req.json<{ uid: string }>()
    if (!uid) return json({ error: '缺少uid' }, 400)

    const user = await db.prepare('SELECT * FROM players WHERE uid = ?').bind(uid).first<PlayerRow>()
    if (!user) return json({ error: '玩家不存在' }, 404)

    const realm = getRealmConfig(user.realm_index)
    const lifespanRemaining = realm.lifespan - user.age

    if (lifespanRemaining > 0) {
      return json({ alive: true, lifespanRemaining, age: user.age, maxLifespan: realm.lifespan })
    }

    const now = Date.now()
    const newSpeedMultiplier = (user.speed_multiplier || 1) + 0.1

    await db.prepare(`
      INSERT INTO reincarnation_log (user_uid, old_realm, new_realm, bonus_speed, created_at)
      VALUES (?, ?, '炼气期一层', 0.1, ?)
    `).bind(uid, realm.name, now).run()

    await db.prepare(`
      UPDATE players SET realm_index = 0, realm = '炼气期一层', exp = 0, age = 16,
        speed_multiplier = ?, injury_status = 'NORMAL', last_heartbeat_time = ?, last_active = ?
      WHERE uid = ?
    `).bind(newSpeedMultiplier, now, now, uid).run()

    return json({
      alive: false, reincarnation: true,
      oldRealm: realm.name, newRealm: '炼气期一层',
      newSpeedMultiplier, bonusSpeed: 0.1,
    })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

// ==================== 排行榜 ====================

app.get('/api/leaderboard', async (c) => {
  const db = c.env.DB
  try {
    const rows = await db.prepare(
      'SELECT name, realm, realm_index, age, lifespan, gold, score, updated_at FROM leaderboard ORDER BY score DESC LIMIT 100'
    ).all()
    return json({ entries: rows.results || [] })
  } catch (err: any) {
    return json({ entries: [], error: err.message })
  }
})

app.post('/api/leaderboard/submit', async (c) => {
  const db = c.env.DB
  try {
    const { uid, name, realm, realmIndex, age, lifespan, gold } = await c.req.json<{
      uid: string; name: string; realm: string; realmIndex: number; age: number; lifespan: number; gold: number
    }>()
    if (!uid || !name) return json({ error: '参数不完整' }, 400)

    const realmScore = (realmIndex || 0) * 1000
    const lifeEfficiency = ((lifespan - age) / lifespan) * 500
    const goldScore = Math.log2(Math.max(1, gold || 0)) * 50
    const score = Math.floor(realmScore + lifeEfficiency + goldScore)
    const now = Date.now()

    const existing = await db.prepare('SELECT score FROM leaderboard WHERE uid = ?').bind(uid).first<{ score: number }>()
    if (existing && score <= existing.score) {
      const rank = await db.prepare('SELECT COUNT(*) as c FROM leaderboard WHERE score > ?').bind(existing.score).first<{ c: number }>()
      return json({ success: true, rank: rank!.c + 1, score: existing.score })
    }

    await db.prepare(`
      INSERT INTO leaderboard (uid, name, realm, realm_index, age, lifespan, gold, score, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uid) DO UPDATE SET
        name = excluded.name, realm = excluded.realm, realm_index = excluded.realm_index,
        age = excluded.age, lifespan = excluded.lifespan, gold = excluded.gold,
        score = excluded.score, updated_at = excluded.updated_at
    `).bind(uid, name, realm, realmIndex, age, lifespan, gold, score, now).run()

    const rank = await db.prepare('SELECT COUNT(*) as c FROM leaderboard WHERE score > ?').bind(score).first<{ c: number }>()
    return json({ success: true, rank: rank!.c + 1, score })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

// ==================== 存档导出/导入 ====================

app.post('/api/save/export', async (c) => {
  const db = c.env.DB
  try {
    const { uid } = await c.req.json<{ uid: string }>()
    if (!uid) return json({ error: '缺少uid' }, 400)

    const player = await db.prepare('SELECT * FROM players WHERE uid = ?').bind(uid).first<PlayerRow>()
    if (!player) return json({ error: '玩家不存在' }, 404)

    const inventory = await db.prepare(
      'SELECT ui.item_id, ui.quantity, i.name FROM user_inventory ui JOIN items i ON ui.item_id = i.id WHERE ui.user_uid = ?'
    ).bind(uid).all<InventoryRow>()

    const expCap = getExpCap(player.realm_index)
    const saveData: SaveData = {
      uid: player.uid,
      name: player.name,
      realmIndex: player.realm_index,
      exp: Math.min(player.exp || 0, expCap),
      age: player.age,
      gold: player.gold || 0,
      spiritStones: player.spirit_stones || 0,
      speedMultiplier: player.speed_multiplier || 1,
      speedExpireTime: player.speed_expire_at || 0,
      items: {},
      exportedAt: Date.now(),
    }

    for (const row of (inventory.results || [])) {
      saveData.items[row.name] = row.quantity
    }

    const payload = JSON.stringify(saveData)
    const signature = await hmacSign(payload, SAVE_HMAC_KEY)
    const exportPackage = base64Encode(JSON.stringify({ s: signature, d: saveData, v: 1 }))

    return json({ success: true, save: exportPackage })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

app.post('/api/save/import', async (c) => {
  const db = c.env.DB
  try {
    const { uid, save } = await c.req.json<{ uid: string; save: string }>()
    if (!uid || !save) return json({ error: '参数不完整' }, 400)

    let pkg: SavePackage
    try {
      pkg = JSON.parse(base64Decode(save))
    } catch {
      return json({ error: '存档格式无效' }, 400)
    }

    if (!pkg.s || !pkg.d) return json({ error: '存档缺少签名或数据' }, 400)

    const payload = JSON.stringify(pkg.d)
    const valid = await hmacVerify(payload, pkg.s, SAVE_HMAC_KEY)
    if (!valid) return json({ error: '存档签名无效，数据可能被篡改' }, 403)
    if (pkg.d.uid !== uid) return json({ error: '存档UID不匹配' }, 403)

    const existing = await db.prepare('SELECT * FROM players WHERE uid = ?').bind(uid).first<PlayerRow>()
    const errors = validatePlayerData(pkg.d, existing)
    if (errors.length > 0) return json({ error: '存档数据异常: ' + errors.join('; ') }, 403)

    const now = Date.now()
    const realmName = getRealmConfig(pkg.d.realmIndex).name
    await db.prepare(`
      INSERT INTO players (uid, name, realm, realm_index, exp, age, gold, spirit_stones, speed_multiplier, speed_expire_at, last_heartbeat_time, created_at, last_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uid) DO UPDATE SET
        name = excluded.name, realm = excluded.realm, realm_index = excluded.realm_index,
        exp = excluded.exp, age = excluded.age, gold = excluded.gold,
        spirit_stones = excluded.spirit_stones, speed_multiplier = excluded.speed_multiplier,
        speed_expire_at = excluded.speed_expire_at, last_heartbeat_time = excluded.last_heartbeat_time,
        last_active = excluded.last_active
    `).bind(uid, pkg.d.name, realmName, pkg.d.realmIndex, pkg.d.exp, pkg.d.age, pkg.d.gold, pkg.d.spiritStones || 0, pkg.d.speedMultiplier || 1, pkg.d.speedExpireTime || 0, now, now, now).run()

    const updated = await db.prepare('SELECT * FROM players WHERE uid = ?').bind(uid).first<PlayerRow>()!
    const inventory = await db.prepare(
      'SELECT i.name, ui.quantity FROM user_inventory ui JOIN items i ON ui.item_id = i.id WHERE ui.user_uid = ?'
    ).bind(uid).all<InventoryRow>()
    const items: Record<string, number> = {}
    for (const row of (inventory.results || [])) {
      items[row.name] = row.quantity
    }

    return json({
      success: true, message: '存档导入成功',
      player: {
        name: updated!.name, realmIndex: updated!.realm_index, exp: updated!.exp || 0,
        age: updated!.age, gold: updated!.gold || 0, spiritStones: updated!.spirit_stones || 0,
        speedMultiplier: updated!.speed_multiplier || 1, speedExpireTime: updated!.speed_expire_at || 0,
        items,
      },
    })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

// ==================== 管理接口 ====================

app.use('/admin/*', async (c, next) => {
  const auth = c.req.header('Authorization')
  if (auth !== `Bearer ${ADMIN_PASSWORD}`) return json({ error: '未授权' }, 401)
  await next()
})

app.get('/admin/stats', async (c) => {
  const db = c.env.DB
  const totalCodes = await db.prepare('SELECT COUNT(*) as count FROM codes').first<{ count: number }>()
  const usedCodes = await db.prepare('SELECT COUNT(*) as count FROM codes WHERE used = 1').first<{ count: number }>()
  const totalPlayers = await db.prepare('SELECT COUNT(*) as count FROM players').first<{ count: number }>()
  const totalReincarnations = await db.prepare('SELECT COUNT(*) as count FROM reincarnation_log').first<{ count: number }>()

  return json({
    codes: { total: totalCodes!.count, used: usedCodes!.count, unused: totalCodes!.count - usedCodes!.count },
    players: { total: totalPlayers!.count },
    reincarnations: totalReincarnations!.count,
  })
})

app.get('/admin/codes', async (c) => {
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = (page - 1) * limit

  const total = await db.prepare('SELECT COUNT(*) as count FROM codes').first<{ count: number }>()
  const rows = await db.prepare('SELECT * FROM codes ORDER BY id DESC LIMIT ? OFFSET ?').bind(limit, offset).all()
  return json({ total: total!.count, page, limit, data: rows.results })
})

app.post('/admin/codes', async (c) => {
  const db = c.env.DB
  try {
    const { multiplier, duration, count = 1 } = await c.req.json<{ multiplier: number; duration: number; count: number }>()
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const multTag = multiplier === 2 ? 'A' : multiplier === 5 ? 'B' : 'C'
    const durTag = duration === 0 ? 'P' : 'T'
    const now = Date.now()
    const expireAt = duration === 0 ? null : now + 24 * 60 * 60 * 1000

    const codes: string[] = []
    for (let i = 0; i < Math.min(count, 100); i++) {
      let random = ''
      for (let j = 0; j < 8; j++) random += chars[Math.floor(Math.random() * chars.length)]
      const code = `${multTag}${durTag}-${random}`
      codes.push(code)
      await db.prepare('INSERT INTO codes (code, multiplier, duration, expire_at, created_at) VALUES (?, ?, ?, ?, ?)')
        .bind(code, multiplier, duration, expireAt, now).run()
    }
    return json({ success: true, codes })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

app.delete('/admin/codes', async (c) => {
  const db = c.env.DB
  const { code } = await c.req.json<{ code: string }>()
  await db.prepare('DELETE FROM codes WHERE code = ?').bind(code).run()
  return json({ success: true })
})

app.get('/admin/players', async (c) => {
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = (page - 1) * limit

  const total = await db.prepare('SELECT COUNT(*) as count FROM players').first<{ count: number }>()
  const rows = await db.prepare('SELECT * FROM players ORDER BY realm_index DESC, gold DESC LIMIT ? OFFSET ?').bind(limit, offset).all()
  return json({ total: total!.count, page, limit, data: rows.results })
})

app.get('/admin/monsters', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare('SELECT * FROM monsters ORDER BY id').all()
  return json(rows.results || [])
})

app.get('/admin/drops', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare(`
    SELECT md.*, m.name as monster_name, i.name as item_name, i.icon
    FROM monster_drops md JOIN monsters m ON md.monster_id = m.id JOIN items i ON md.item_id = i.id
    ORDER BY md.monster_id, md.drop_chance DESC
  `).all()
  return json(rows.results || [])
})

app.get('/admin/config', async (c) => {
  const db = c.env.DB
  try {
    const rows = await db.prepare('SELECT key, value FROM configs').all<{ key: string; value: string }>()
    const config: Record<string, unknown> = {}
    for (const row of rows.results || []) {
      try { config[row.key] = JSON.parse(row.value) } catch { config[row.key] = row.value }
    }
    return json(config)
  } catch {
    return json({})
  }
})

app.post('/admin/config', async (c) => {
  const db = c.env.DB
  try {
    const config = await c.req.json<Record<string, unknown>>()
    const now = Date.now()
    for (const [key, value] of Object.entries(config)) {
      const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
      await db.prepare('INSERT OR REPLACE INTO configs (key, value, updated_at) VALUES (?, ?, ?)').bind(key, strValue, now).run()
    }
    return json({ success: true })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

// 商店管理
app.get('/admin/shop', async (c) => {
  const db = c.env.DB
  try {
    const rows = await db.prepare(
      'SELECT si.id, si.item_id, si.price, si.stock_limit, i.name, i.icon, i.desc, i.type FROM shop_items si JOIN items i ON si.item_id = i.id ORDER BY si.id'
    ).all()
    return json(rows.results || [])
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

app.post('/admin/shop', async (c) => {
  const db = c.env.DB
  try {
    const { item_id, price, stock_limit } = await c.req.json<{ item_id: number; price: number; stock_limit: number }>()
    if (!item_id || !price) return json({ error: '参数不完整' }, 400)
    const now = Date.now()
    await db.prepare('INSERT INTO shop_items (item_id, price, stock_limit) VALUES (?, ?, ?)').bind(item_id, price, stock_limit ?? -1).run()
    return json({ success: true })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

app.delete('/admin/shop', async (c) => {
  const db = c.env.DB
  try {
    const { id } = await c.req.json<{ id: number }>()
    if (!id) return json({ error: '缺少id' }, 400)
    await db.prepare('DELETE FROM shop_items WHERE id = ?').bind(id).run()
    return json({ success: true })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

// 物品列表（供商店管理添加商品时选择）
app.get('/admin/items', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare('SELECT * FROM items ORDER BY id').all()
  return json(rows.results || [])
})

app.get('/admin/reincarnations', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare('SELECT * FROM reincarnation_log ORDER BY id DESC LIMIT 100').all()
  return json(rows.results || [])
})

app.notFound((c) => json({ error: 'Not Found' }))
app.onError((err, c) => json({ error: err.message }, 500))

export default app
