/**
 * 修仙加速器 - Cloudflare Worker
 * 包含：兑换码验证 + 管理后台 API
 */

// 管理密码（建议改成更安全的）
const ADMIN_PASSWORD = 'xiuxian2026'

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    const url = new URL(request.url)
    const path = url.pathname

    // 公开接口
    if (path === '/redeem' && request.method === 'POST') {
      return await handleRedeem(request, env, corsHeaders)
    }
    if (path === '/announcement') {
      return await handleAnnouncement(request, env, corsHeaders)
    }
    if (path === '/player/sync' && request.method === 'POST') {
      return await handlePlayerSync(request, env, corsHeaders)
    }
    if (path === '/health') {
      return jsonResponse({ status: 'ok' }, 200, corsHeaders)
    }

    // 管理接口（需要密码）
    if (path.startsWith('/admin/')) {
      const auth = request.headers.get('Authorization')
      if (auth !== `Bearer ${ADMIN_PASSWORD}`) {
        return jsonResponse({ error: '未授权' }, 401, corsHeaders)
      }

      // 兑换码管理
      if (path === '/admin/codes' && request.method === 'GET') {
        return await handleListCodes(request, env, corsHeaders)
      }
      if (path === '/admin/codes' && request.method === 'POST') {
        return await handleCreateCodes(request, env, corsHeaders)
      }
      if (path === '/admin/codes' && request.method === 'DELETE') {
        return await handleDeleteCode(request, env, corsHeaders)
      }

      // 玩家管理
      if (path === '/admin/players' && request.method === 'GET') {
        return await handleListPlayers(request, env, corsHeaders)
      }

      // 订单管理
      if (path === '/admin/orders' && request.method === 'GET') {
        return await handleListOrders(request, env, corsHeaders)
      }

      // 统计
      if (path === '/admin/stats' && request.method === 'GET') {
        return await handleStats(request, env, corsHeaders)
      }

      // 配置
      if (path === '/admin/config' && request.method === 'GET') {
        return await handleGetConfig(request, env, corsHeaders)
      }
      if (path === '/admin/config' && request.method === 'POST') {
        return await handleSaveConfig(request, env, corsHeaders)
      }

      // 商店
      if (path === '/admin/shop' && request.method === 'GET') {
        return await handleGetShop(request, env, corsHeaders)
      }
      if (path === '/admin/shop' && request.method === 'POST') {
        return await handleAddShopItem(request, env, corsHeaders)
      }
      if (path === '/admin/shop' && request.method === 'DELETE') {
        return await handleDeleteShopItem(request, env, corsHeaders)
      }

      return jsonResponse({ error: '接口不存在' }, 404, corsHeaders)
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders })
  },
}

// ==================== 公开接口 ====================

async function handleRedeem(request, env, corsHeaders) {
  try {
    const { code } = await request.json()
    if (!code || typeof code !== 'string') {
      return jsonResponse({ success: false, error: '请输入兑换码' }, 400, corsHeaders)
    }

    const normalizedCode = code.trim().toUpperCase().replace(/\s/g, '')

    const row = await env.DB.prepare(
      'SELECT * FROM codes WHERE code = ?'
    ).bind(normalizedCode).first()

    if (!row) {
      return jsonResponse({ success: false, error: '兑换码不存在' }, 200, corsHeaders)
    }

    if (row.used) {
      return jsonResponse({ success: false, error: '兑换码已使用' }, 200, corsHeaders)
    }

    if (row.expire_at && Date.now() > row.expire_at) {
      return jsonResponse({ success: false, error: '兑换码已过期' }, 200, corsHeaders)
    }

    await env.DB.prepare(
      'UPDATE codes SET used = 1, used_at = ? WHERE code = ?'
    ).bind(Date.now(), normalizedCode).run()

    return jsonResponse({
      success: true,
      multiplier: row.multiplier,
      duration: row.duration,
    }, 200, corsHeaders)

  } catch (err) {
    return jsonResponse({ success: false, error: '服务器错误' }, 500, corsHeaders)
  }
}

// 公告
async function handleAnnouncement(request, env, corsHeaders) {
  try {
    const row = await env.DB.prepare("SELECT value FROM configs WHERE key = 'announcement'").first()
    return jsonResponse({ text: row?.value || '' }, 200, corsHeaders)
  } catch {
    return jsonResponse({ text: '' }, 200, corsHeaders)
  }
}

// 玩家数据同步
async function handlePlayerSync(request, env, corsHeaders) {
  try {
    const data = await request.json()
    const { uid, name, realm, realmIndex, age, gold, speedMultiplier, speedExpireTime } = data

    if (!uid || !name) {
      return jsonResponse({ error: '缺少必要参数' }, 400, corsHeaders)
    }

    const now = Date.now()

    await env.DB.prepare(`
      INSERT INTO players (uid, name, realm, realm_index, age, gold, speed_multiplier, speed_expire_at, created_at, last_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uid) DO UPDATE SET
        name = excluded.name,
        realm = excluded.realm,
        realm_index = excluded.realm_index,
        age = excluded.age,
        gold = excluded.gold,
        speed_multiplier = excluded.speed_multiplier,
        speed_expire_at = excluded.speed_expire_at,
        last_active = excluded.last_active
    `).bind(uid, name, realm, realmIndex, age, gold, speedMultiplier, speedExpireTime, now, now).run()

    return jsonResponse({ success: true }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ error: err.message }, 500, corsHeaders)
  }
}

// ==================== 管理接口 ====================

// 兑换码列表
async function handleListCodes(request, env, corsHeaders) {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '50')
  const status = url.searchParams.get('status') // all/used/unused
  const offset = (page - 1) * limit

  let where = ''
  if (status === 'used') where = 'WHERE used = 1'
  if (status === 'unused') where = 'WHERE used = 0'

  const total = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM codes ${where}`
  ).first()

  const rows = await env.DB.prepare(
    `SELECT * FROM codes ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
  ).bind(limit, offset).all()

  return jsonResponse({
    total: total.count,
    page,
    limit,
    data: rows.results,
  }, 200, corsHeaders)
}

// 生成兑换码
async function handleCreateCodes(request, env, corsHeaders) {
  try {
    const { multiplier, duration, count = 1 } = await request.json()

    if (!multiplier || duration === undefined) {
      return jsonResponse({ error: '参数错误' }, 400, corsHeaders)
    }

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

      await env.DB.prepare(
        'INSERT INTO codes (code, multiplier, duration, expire_at, created_at) VALUES (?, ?, ?, ?, ?)'
      ).bind(code, multiplier, duration, expireAt, now).run()
    }

    return jsonResponse({ success: true, codes }, 200, corsHeaders)

  } catch (err) {
    return jsonResponse({ error: err.message }, 500, corsHeaders)
  }
}

// 删除兑换码
async function handleDeleteCode(request, env, corsHeaders) {
  const { code } = await request.json()
  if (!code) {
    return jsonResponse({ error: '参数错误' }, 400, corsHeaders)
  }

  await env.DB.prepare('DELETE FROM codes WHERE code = ?').bind(code).run()
  return jsonResponse({ success: true }, 200, corsHeaders)
}

// 玩家列表
async function handleListPlayers(request, env, corsHeaders) {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  const total = await env.DB.prepare('SELECT COUNT(*) as count FROM players').first()
  const rows = await env.DB.prepare(
    'SELECT * FROM players ORDER BY realm_index DESC, gold DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all()

  return jsonResponse({
    total: total.count,
    page,
    limit,
    data: rows.results,
  }, 200, corsHeaders)
}

// 订单列表
async function handleListOrders(request, env, corsHeaders) {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '50')
  const offset = (page - 1) * limit

  const total = await env.DB.prepare('SELECT COUNT(*) as count FROM orders').first()
  const rows = await env.DB.prepare(
    'SELECT * FROM orders ORDER BY id DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all()

  return jsonResponse({
    total: total.count,
    page,
    limit,
    data: rows.results,
  }, 200, corsHeaders)
}

// 统计数据
async function handleStats(request, env, corsHeaders) {
  const totalCodes = await env.DB.prepare('SELECT COUNT(*) as count FROM codes').first()
  const usedCodes = await env.DB.prepare('SELECT COUNT(*) as count FROM codes WHERE used = 1').first()
  const totalPlayers = await env.DB.prepare('SELECT COUNT(*) as count FROM players').first()
  const totalOrders = await env.DB.prepare('SELECT COUNT(*) as count FROM orders').first()
  const paidOrders = await env.DB.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'paid'").first()

  return jsonResponse({
    codes: { total: totalCodes.count, used: usedCodes.count, unused: totalCodes.count - usedCodes.count },
    players: { total: totalPlayers.count },
    orders: { total: totalOrders.count, paid: paidOrders.count },
  }, 200, corsHeaders)
}

// 获取配置
async function handleGetConfig(request, env, corsHeaders) {
  try {
    const rows = await env.DB.prepare('SELECT key, value FROM configs').all()
    const config = {}
    for (const row of rows.results) {
      try {
        config[row.key] = JSON.parse(row.value)
      } catch {
        config[row.key] = row.value
      }
    }
    return jsonResponse(config, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({}, 200, corsHeaders)
  }
}

// 保存配置
async function handleSaveConfig(request, env, corsHeaders) {
  try {
    const config = await request.json()
    const now = Date.now()

    for (const [key, value] of Object.entries(config)) {
      const strValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
      await env.DB.prepare(
        'INSERT OR REPLACE INTO configs (key, value, updated_at) VALUES (?, ?, ?)'
      ).bind(key, strValue, now).run()
    }

    return jsonResponse({ success: true }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ error: err.message }, 500, corsHeaders)
  }
}

// 商店管理
async function handleGetShop(request, env, corsHeaders) {
  try {
    const row = await env.DB.prepare("SELECT value FROM configs WHERE key = 'shop_items'").first()
    const items = row ? JSON.parse(row.value) : []
    return jsonResponse(items, 200, corsHeaders)
  } catch {
    return jsonResponse([], 200, corsHeaders)
  }
}

async function handleAddShopItem(request, env, corsHeaders) {
  try {
    const item = await request.json()
    item.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 4)

    const row = await env.DB.prepare("SELECT value FROM configs WHERE key = 'shop_items'").first()
    const items = row ? JSON.parse(row.value) : []
    items.push(item)

    await env.DB.prepare(
      "INSERT OR REPLACE INTO configs (key, value, updated_at) VALUES (?, ?, ?)"
    ).bind('shop_items', JSON.stringify(items), Date.now()).run()

    return jsonResponse({ success: true, item }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ error: err.message }, 500, corsHeaders)
  }
}

async function handleDeleteShopItem(request, env, corsHeaders) {
  try {
    const { id } = await request.json()

    const row = await env.DB.prepare("SELECT value FROM configs WHERE key = 'shop_items'").first()
    let items = row ? JSON.parse(row.value) : []
    items = items.filter(i => i.id !== id)

    await env.DB.prepare(
      "INSERT OR REPLACE INTO configs (key, value, updated_at) VALUES (?, ?, ?)"
    ).bind('shop_items', JSON.stringify(items), Date.now()).run()

    return jsonResponse({ success: true }, 200, corsHeaders)
  } catch (err) {
    return jsonResponse({ error: err.message }, 500, corsHeaders)
  }
}

// ==================== 工具函数 ====================

function jsonResponse(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
