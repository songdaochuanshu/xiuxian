/**
 * 凡人修仙传 - 玩家接口
 *
 * POST /player/sync      - 同步玩家数据（含离线挂机结算）
 * POST /player/heartbeat - 心跳（更新离线时间戳）
 * POST /redeem           - 兑换码验证
 * POST /api/shop/buy     - 坊市购买
 */

import { Hono } from 'hono'
import type { Env, PlayerRow, OfflineResult } from '../types'
import { json, getRealmConfigFromDB, getMaxExpFromDB, randomInt, getToday } from '../utils'

export const playerRoutes = new Hono<{ Bindings: Env }>()

// ==================== 离线挂机结算 ====================

async function processOfflineGain(db: D1Database, user: PlayerRow): Promise<OfflineResult> {
  const now = Date.now()
  const lastHeartbeat = user.last_heartbeat_time || now
  const diffMs = now - lastHeartbeat

  // 小于5分钟不处理
  if (diffMs < 5 * 60 * 1000) return { offline: false }

  // 最多计算12小时
  const maxOfflineMs = 12 * 60 * 60 * 1000
  const offlineMs = Math.min(diffMs, maxOfflineMs)
  const offlineSeconds = Math.floor(offlineMs / 1000)

  const realm = await getRealmConfigFromDB(db, user.realm_index)
  const speedMultiplier = user.speed_multiplier || 1
  const baseGain = realm.speed * speedMultiplier
  const totalGain = Math.floor(baseGain * offlineSeconds)

  // 2%概率触发随机事件
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
      await db.prepare('UPDATE players SET injury_status = ? WHERE uid = ?')
        .bind(event.status, user.uid).run()
      randomEvent = { type: 'injury', desc: event.desc }
    }
  }

  // 扣除寿元（离线每分钟扣1岁）
  const offlineMinutes = Math.floor(offlineMs / 60000)
  const realmLifespan = realm.lifespan
  const newAge = user.age + offlineMinutes
  const lifespanRemaining = realmLifespan - newAge

  let reincarnation = false
  let newRealmIndex = user.realm_index
  let newSpeedMultiplier = speedMultiplier

  // 修为封顶
  const expCap = await getMaxExpFromDB(db, user.realm_index)
  let newExp = Math.min((user.exp || 0) + totalGain, expCap)

  // 寿元耗尽 → 转世
  if (lifespanRemaining <= 0) {
    reincarnation = true
    newRealmIndex = 0
    newExp = 0
    newSpeedMultiplier = speedMultiplier + 0.1

    await db.prepare(`
      INSERT INTO reincarnation_log (user_uid, old_realm, new_realm, bonus_speed, created_at)
      VALUES (?, ?, '炼气期一层', 0.1, ?)
    `).bind(user.uid, getRealmConfigFromDB(db, user.realm_index).then(r => r.name), now).run()
  }

  // 更新玩家数据
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
    oldRealm: (await getRealmConfigFromDB(db, user.realm_index)).name,
    newRealm: (await getRealmConfigFromDB(db, newRealmIndex)).name,
    lifespanRemaining: reincarnation ? (await getRealmConfigFromDB(db, 0)).lifespan : lifespanRemaining,
  }
}

// ==================== 玩家同步 ====================

playerRoutes.post('/player/sync', async (c) => {
  const db = c.env.DB
  try {
    const data = await c.req.json<{
      uid: string; name: string; realmIndex: number; age: number;
      spiritStones: number; speedMultiplier: number; speedExpireTime: number
    }>()
    const { uid, name, realmIndex, age, spiritStones, speedMultiplier, speedExpireTime } = data

    if (!uid || !name) return json({ error: '缺少必要参数' }, 400)

    const existing = await db.prepare('SELECT * FROM players WHERE uid = ?').bind(uid).first<PlayerRow>()

    // 处理离线挂机
    let offlineResult: OfflineResult | null = null
    if (existing) {
      offlineResult = await processOfflineGain(db, existing)
    }

    const now = Date.now()
    // 服务端根据 realm_index 计算境界名
    const realmCfg = await getRealmConfigFromDB(db, realmIndex)
    const realmName = realmCfg.name

    await db.prepare(`
      INSERT INTO players (uid, name, realm, realm_index, age, spirit_stones, speed_multiplier, speed_expire_at, last_heartbeat_time, created_at, last_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uid) DO UPDATE SET
        name = excluded.name, realm = excluded.realm, realm_index = excluded.realm_index,
        age = excluded.age, spirit_stones = excluded.spirit_stones,
        speed_multiplier = excluded.speed_multiplier, speed_expire_at = excluded.speed_expire_at,
        last_heartbeat_time = excluded.last_heartbeat_time, last_active = excluded.last_active
    `).bind(uid, name, realmName, realmIndex, age, spiritStones || 0, speedMultiplier, speedExpireTime || 0, now, now, now).run()

    return json({ success: true, offline: offlineResult })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

// ==================== 心跳 ====================

playerRoutes.post('/player/heartbeat', async (c) => {
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

// ==================== 兑换码 ====================

playerRoutes.post('/redeem', async (c) => {
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

    // 自动突破码
    if (row.code_type === 'auto_break') {
      return json({ success: true, autoBreak: true })
    }

    return json({ success: true, multiplier: row.multiplier, duration: row.duration })
  } catch (err: any) {
    return json({ success: false, error: '服务器错误' }, 500)
  }
})

// ==================== 坊市购买 ====================

playerRoutes.post('/api/shop/buy', async (c) => {
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

    // 检查限购
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
