/**
 * 凡人修仙传 - Cloudflare Worker (Hono)
 * 核心功能：离线挂机、战斗结算、坊市购买、寿元转世
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// CORS
app.use('*', cors())

// 管理密码
const ADMIN_PASSWORD = 'xiuxian2026'

// 境界配置（修炼速度/寿元）
const REALM_CONFIG = [
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

// ==================== 工具函数 ====================

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getRealmConfig(realmIndex) {
  return REALM_CONFIG[Math.min(realmIndex, REALM_CONFIG.length - 1)]
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ==================== 离线挂机逻辑 ====================

async function processOfflineGain(db, user) {
  const now = Date.now()
  const lastHeartbeat = user.last_heartbeat_time || now
  const diffMs = now - lastHeartbeat

  // 小于5分钟不处理
  if (diffMs < 5 * 60 * 1000) {
    return { offline: false }
  }

  // 最多计算12小时
  const maxOfflineMs = 12 * 60 * 60 * 1000
  const offlineMs = Math.min(diffMs, maxOfflineMs)
  const offlineSeconds = Math.floor(offlineMs / 1000)

  const realm = getRealmConfig(user.realm_index)
  const speedMultiplier = user.speed_multiplier || 1
  const baseGain = realm.speed * speedMultiplier
  const totalGain = Math.floor(baseGain * offlineSeconds)

  // 2%概率触发随机事件
  let randomEvent = null
  if (Math.random() < 0.02) {
    const events = [
      { type: 'item', itemId: 1, name: '疗伤丹' },
      { type: 'item', itemId: 2, name: '聚灵丹' },
      { type: 'item', itemId: 5, name: '蛇胆' },
      { type: 'injury', status: 'LIGHT', desc: '修炼走火，道基轻伤' },
    ]
    const event = events[Math.floor(Math.random() * events.length)]

    if (event.type === 'item') {
      // 获得物品
      await db.prepare(`
        INSERT INTO user_inventory (user_uid, item_id, quantity, created_at)
        VALUES (?, ?, 1, ?)
        ON CONFLICT(user_uid, item_id) DO UPDATE SET quantity = quantity + 1
      `).bind(user.uid, event.itemId, now).run()
      randomEvent = { type: 'item', name: event.name }
    } else {
      // 受伤
      await db.prepare(
        'UPDATE players SET injury_status = ? WHERE uid = ?'
      ).bind(event.status, user.uid).run()
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
  let newExp = (user.exp || 0) + totalGain

  if (lifespanRemaining <= 0) {
    // 寿元耗尽，转世
    reincarnation = true
    newRealmIndex = 0
    newExp = 0
    newSpeedMultiplier = speedMultiplier + 0.1

    // 记录转世
    await db.prepare(`
      INSERT INTO reincarnation_log (user_uid, old_realm, new_realm, bonus_speed, created_at)
      VALUES (?, ?, '炼气期一层', 0.1, ?)
    `).bind(user.uid, getRealmConfig(user.realm_index).name, now).run()
  }

  // 更新玩家数据
  await db.prepare(`
    UPDATE players SET
      exp = ?,
      realm_index = ?,
      speed_multiplier = ?,
      age = ?,
      last_heartbeat_time = ?,
      last_active = ?
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

// ==================== 公开接口 ====================

// 健康检查
app.get('/health', (c) => json({ status: 'ok' }))

// 获取公告
app.get('/announcement', async (c) => {
  const db = c.env.DB
  try {
    const row = await db.prepare("SELECT value FROM configs WHERE key = 'announcement'").first()
    return json({ text: row?.value || '' })
  } catch {
    return json({ text: '' })
  }
})

// 获取商店配置
app.get('/shop/config', async (c) => {
  const db = c.env.DB
  try {
    const row = await db.prepare("SELECT value FROM configs WHERE key = 'shop_items'").first()
    return json(row ? JSON.parse(row.value) : [])
  } catch {
    return json([])
  }
})

// ==================== 玩家接口 ====================

// 玩家同步（含离线挂机结算）
app.post('/player/sync', async (c) => {
  const db = c.env.DB
  try {
    const data = await c.req.json()
    const { uid, name, realm, realmIndex, age, gold, speedMultiplier, speedExpireTime } = data

    if (!uid || !name) {
      return json({ error: '缺少必要参数' }, 400)
    }

    // 查询现有玩家
    const existing = await db.prepare('SELECT * FROM players WHERE uid = ?').bind(uid).first()

    let offlineResult = null
    if (existing) {
      // 处理离线挂机
      offlineResult = await processOfflineGain(db, existing)
    }

    const now = Date.now()

    // 更新/插入玩家数据
    await db.prepare(`
      INSERT INTO players (uid, name, realm, realm_index, age, gold, speed_multiplier, speed_expire_at, last_heartbeat_time, created_at, last_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uid) DO UPDATE SET
        name = excluded.name,
        realm = excluded.realm,
        realm_index = excluded.realm_index,
        age = excluded.age,
        gold = excluded.gold,
        speed_multiplier = excluded.speed_multiplier,
        speed_expire_at = excluded.speed_expire_at,
        last_heartbeat_time = excluded.last_heartbeat_time,
        last_active = excluded.last_active
    `).bind(uid, name, realm, realmIndex, age, gold, speedMultiplier, speedExpireTime || 0, now, now, now).run()

    return json({ success: true, offline: offlineResult })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})

// 心跳（更新离线时间戳）
app.post('/player/heartbeat', async (c) => {
  const db = c.env.DB
  try {
    const { uid } = await c.req.json()
    if (!uid) return json({ error: '缺少uid' }, 400)

    await db.prepare(
      'UPDATE players SET last_heartbeat_time = ? WHERE uid = ?'
    ).bind(Date.now(), uid).run()

    return json({ success: true })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})

// 兑换码验证
app.post('/redeem', async (c) => {
  const db = c.env.DB
  try {
    const { code } = await c.req.json()
    if (!code) return json({ success: false, error: '请输入兑换码' }, 400)

    const normalizedCode = code.trim().toUpperCase().replace(/\s/g, '')
    const row = await db.prepare('SELECT * FROM codes WHERE code = ?').bind(normalizedCode).first()

    if (!row) return json({ success: false, error: '兑换码不存在' })
    if (row.used) return json({ success: false, error: '兑换码已使用' })
    if (row.expire_at && Date.now() > row.expire_at) return json({ success: false, error: '兑换码已过期' })

    await db.prepare(
      'UPDATE codes SET used = 1, used_at = ? WHERE code = ?'
    ).bind(Date.now(), normalizedCode).run()

    return json({ success: true, multiplier: row.multiplier, duration: row.duration })
  } catch (err) {
    return json({ success: false, error: '服务器错误' }, 500)
  }
})

// ==================== 战斗结算与掉落 ====================

app.post('/api/battle/settle', async (c) => {
  const db = c.env.DB
  try {
    const { uid, monsterId } = await c.req.json()

    if (!uid || !monsterId) {
      return json({ error: '参数不完整' }, 400)
    }

    // 查询玩家
    const user = await db.prepare('SELECT * FROM players WHERE uid = ?').bind(uid).first()
    if (!user) return json({ error: '玩家不存在' }, 404)

    // 查询怪物
    const monster = await db.prepare('SELECT * FROM monsters WHERE id = ?').bind(monsterId).first()
    if (!monster) return json({ error: '怪物不存在' }, 404)

    const now = Date.now()

    // 计算灵石掉落（区间随机）
    const stoneReward = randomInt(monster.stone_reward_min, monster.stone_reward_max)

    // 查询掉落物品
    const drops = await db.prepare(
      'SELECT md.*, i.name, i.icon FROM monster_drops md JOIN items i ON md.item_id = i.id WHERE md.monster_id = ?'
    ).bind(monsterId).all()

    const droppedItems = []
    for (const drop of drops.results || []) {
      if (Math.random() < drop.drop_chance) {
        droppedItems.push({ itemId: drop.item_id, name: drop.name, icon: drop.icon })

        // 加入背包
        await db.prepare(`
          INSERT INTO user_inventory (user_uid, item_id, quantity, created_at)
          VALUES (?, ?, 1, ?)
          ON CONFLICT(user_uid, item_id) DO UPDATE SET quantity = quantity + 1
        `).bind(uid, drop.item_id, now).run()
      }
    }

    // 更新玩家数据（修为 + 灵石）
    const newExp = (user.exp || 0) + monster.exp_reward
    const newStones = (user.spirit_stones || 0) + stoneReward

    await db.prepare(`
      UPDATE players SET exp = ?, spirit_stones = ?, last_active = ? WHERE uid = ?
    `).bind(newExp, newStones, now, uid).run()

    return json({
      success: true,
      reward: {
        exp: monster.exp_reward,
        stones: stoneReward,
        items: droppedItems,
      },
    })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})

// ==================== 坊市购买 ====================

app.post('/api/shop/buy', async (c) => {
  const db = c.env.DB
  try {
    const { uid, shopItemId } = await c.req.json()

    if (!uid || !shopItemId) {
      return json({ error: '参数不完整' }, 400)
    }

    // 查询玩家
    const user = await db.prepare('SELECT * FROM players WHERE uid = ?').bind(uid).first()
    if (!user) return json({ error: '玩家不存在' }, 404)

    // 查询商品
    const shopItem = await db.prepare(`
      SELECT si.*, i.name, i.icon FROM shop_items si JOIN items i ON si.item_id = i.id WHERE si.id = ?
    `).bind(shopItemId).first()
    if (!shopItem) return json({ error: '商品不存在' }, 404)

    // 检查灵石
    if ((user.spirit_stones || 0) < shopItem.price) {
      return json({ error: '灵石不足' })
    }

    // 检查库存
    if (shopItem.stock_limit !== -1) {
      // 查询已购买数量
      const purchased = await db.prepare(`
        SELECT COALESCE(SUM(quantity), 0) as count FROM user_inventory WHERE user_uid = ? AND item_id = ?
      `).bind(uid, shopItem.item_id).first()

      if (purchased.count >= shopItem.stock_limit) {
        return json({ error: '已达购买上限' })
      }
    }

    const now = Date.now()

    // 扣除灵石
    await db.prepare(
      'UPDATE players SET spirit_stones = spirit_stones - ? WHERE uid = ?'
    ).bind(shopItem.price, uid).run()

    // 增加物品
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
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})

// ==================== 寿元扣除与转世 ====================

app.post('/api/lifespan/check', async (c) => {
  const db = c.env.DB
  try {
    const { uid } = await c.req.json()
    if (!uid) return json({ error: '缺少uid' }, 400)

    const user = await db.prepare('SELECT * FROM players WHERE uid = ?').bind(uid).first()
    if (!user) return json({ error: '玩家不存在' }, 404)

    const realm = getRealmConfig(user.realm_index)
    const lifespanRemaining = realm.lifespan - user.age

    if (lifespanRemaining > 0) {
      return json({
        alive: true,
        lifespanRemaining,
        age: user.age,
        maxLifespan: realm.lifespan,
      })
    }

    // 寿元耗尽，转世
    const now = Date.now()
    const newSpeedMultiplier = (user.speed_multiplier || 1) + 0.1

    // 记录转世
    await db.prepare(`
      INSERT INTO reincarnation_log (user_uid, old_realm, new_realm, bonus_speed, created_at)
      VALUES (?, ?, '炼气期一层', 0.1, ?)
    `).bind(uid, realm.name, now).run()

    // 重置玩家
    await db.prepare(`
      UPDATE players SET
        realm_index = 0,
        realm = '炼气期一层',
        exp = 0,
        age = 16,
        speed_multiplier = ?,
        injury_status = 'NORMAL',
        last_heartbeat_time = ?,
        last_active = ?
      WHERE uid = ?
    `).bind(newSpeedMultiplier, now, now, uid).run()

    return json({
      alive: false,
      reincarnation: true,
      oldRealm: realm.name,
      newRealm: '炼气期一层',
      newSpeedMultiplier,
      bonusSpeed: 0.1,
    })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})

// ==================== 管理接口 ====================

// 管理员认证中间件
function adminAuth(c, next) {
  const auth = c.req.header('Authorization')
  if (auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return json({ error: '未授权' }, 401)
  }
  return next()
}

app.use('/admin/*', adminAuth)

// 统计
app.get('/admin/stats', async (c) => {
  const db = c.env.DB
  const totalCodes = await db.prepare('SELECT COUNT(*) as count FROM codes').first()
  const usedCodes = await db.prepare('SELECT COUNT(*) as count FROM codes WHERE used = 1').first()
  const totalPlayers = await db.prepare('SELECT COUNT(*) as count FROM players').first()
  const totalReincarnations = await db.prepare('SELECT COUNT(*) as count FROM reincarnation_log').first()

  return json({
    codes: { total: totalCodes.count, used: usedCodes.count, unused: totalCodes.count - usedCodes.count },
    players: { total: totalPlayers.count },
    reincarnations: totalReincarnations.count,
  })
})

// 兑换码列表
app.get('/admin/codes', async (c) => {
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = (page - 1) * limit

  const total = await db.prepare('SELECT COUNT(*) as count FROM codes').first()
  const rows = await db.prepare('SELECT * FROM codes ORDER BY id DESC LIMIT ? OFFSET ?').bind(limit, offset).all()

  return json({ total: total.count, page, limit, data: rows.results })
})

// 生成兑换码
app.post('/admin/codes', async (c) => {
  const db = c.env.DB
  try {
    const { multiplier, duration, count = 1 } = await c.req.json()

    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const multTag = multiplier === 2 ? 'A' : multiplier === 5 ? 'B' : 'C'
    const durTag = duration === 0 ? 'P' : 'T'
    const now = Date.now()
    const expireAt = duration === 0 ? null : now + 24 * 60 * 60 * 1000

    const codes = []
    for (let i = 0; i < Math.min(count, 100); i++) {
      let random = ''
      for (let j = 0; j < 8; j++) {
        random += chars[Math.floor(Math.random() * chars.length)]
      }
      const code = `${multTag}${durTag}-${random}`
      codes.push(code)

      await db.prepare(
        'INSERT INTO codes (code, multiplier, duration, expire_at, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(code, multiplier, duration, expireAt, now).run()
    }

    return json({ success: true, codes })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})

// 删除兑换码
app.delete('/admin/codes', async (c) => {
  const db = c.env.DB
  const { code } = await c.req.json()
  await db.prepare('DELETE FROM codes WHERE code = ?').bind(code).run()
  return json({ success: true })
})

// 玩家列表
app.get('/admin/players', async (c) => {
  const db = c.env.DB
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '50')
  const offset = (page - 1) * limit

  const total = await db.prepare('SELECT COUNT(*) as count FROM players').first()
  const rows = await db.prepare(
    'SELECT * FROM players ORDER BY realm_index DESC, gold DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all()

  return json({ total: total.count, page, limit, data: rows.results })
})

// 怪物列表
app.get('/admin/monsters', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare('SELECT * FROM monsters ORDER BY id').all()
  return json(rows.results || [])
})

// 掉落列表
app.get('/admin/drops', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare(`
    SELECT md.*, m.name as monster_name, i.name as item_name, i.icon
    FROM monster_drops md
    JOIN monsters m ON md.monster_id = m.id
    JOIN items i ON md.item_id = i.id
    ORDER BY md.monster_id, md.drop_chance DESC
  `).all()
  return json(rows.results || [])
})

// 配置
app.get('/admin/config', async (c) => {
  const db = c.env.DB
  try {
    const rows = await db.prepare('SELECT key, value FROM configs').all()
    const config = {}
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
    const config = await c.req.json()
    const now = Date.now()
    for (const [key, value] of Object.entries(config)) {
      const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
      await db.prepare(
        'INSERT OR REPLACE INTO configs (key, value, updated_at) VALUES (?, ?, ?)'
      ).bind(key, strValue, now).run()
    }
    return json({ success: true })
  } catch (err) {
    return json({ error: err.message }, 500)
  }
})

// 转世记录
app.get('/admin/reincarnations', async (c) => {
  const db = c.env.DB
  const rows = await db.prepare('SELECT * FROM reincarnation_log ORDER BY id DESC LIMIT 100').all()
  return json(rows.results || [])
})

// 404
app.notFound((c) => json({ error: 'Not Found' }, 404))

// 错误处理
app.onError((err, c) => {
  return json({ error: err.message }, 500)
})

export default app
