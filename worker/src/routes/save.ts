/**
 * 凡人修仙传 - 存档导入导出
 *
 * POST /api/save/export - 从服务端生成签名存档
 * POST /api/save/import - 验证签名 + 合理性校验 + 导入
 */

import { Hono } from 'hono'
import type { Env, SaveData, SavePackage, PlayerRow } from '../types'
import { json, base64Encode, base64Decode, hmacSign, hmacVerify, getRealmConfigFromDB, getMaxExpFromDB } from '../utils'
import { getSaveHmacKey } from '../config'

export const saveRoutes = new Hono<{ Bindings: Env }>()

// 数据合理性校验
function validatePlayerData(data: SaveData, existingPlayer: PlayerRow | null): string[] {
  const errors: string[] = []
  if (data.realmIndex < 0 || data.realmIndex >= 24) errors.push('境界索引越界')
  if (data.age < 16) errors.push('年龄异常')
  if (data.speedMultiplier > 20) errors.push('加速倍率异常')
  if (existingPlayer) {
    const realmJump = Math.abs((data.realmIndex || 0) - existingPlayer.realm_index)
    if (realmJump > 3) errors.push(`境界跳跃过大: ${existingPlayer.realm_index} → ${data.realmIndex}`)
  }
  return errors
}

// 导出存档
saveRoutes.post('/api/save/export', async (c) => {
  const db = c.env.DB
  try {
    const { uid } = await c.req.json<{ uid: string }>()
    if (!uid) return json({ error: '缺少uid' }, 400)

    const player = await db.prepare('SELECT * FROM players WHERE uid = ?').bind(uid).first<PlayerRow>()
    if (!player) return json({ error: '玩家不存在' }, 404)

    const inventory = await db.prepare(
      'SELECT ui.item_id, ui.quantity, i.name FROM user_inventory ui JOIN items i ON ui.item_id = i.id WHERE ui.user_uid = ?'
    ).bind(uid).all()

    const expCap = await getMaxExpFromDB(db, player.realm_index)
    const saveData: SaveData = {
      uid: player.uid, name: player.name, realmIndex: player.realm_index,
      exp: Math.min(player.exp || 0, expCap), age: player.age,
      spiritStones: player.spirit_stones || 0,
      speedMultiplier: player.speed_multiplier || 1,
      speedExpireTime: player.speed_expire_at || 0,
      items: {}, exportedAt: Date.now(),
    }
    for (const row of (inventory.results || [])) {
      saveData.items[row.name as string] = row.quantity as number
    }

    const hmacKey = await getSaveHmacKey(db)
    const payload = JSON.stringify(saveData)
    const signature = await hmacSign(payload, hmacKey)
    const exportPackage = base64Encode(JSON.stringify({ s: signature, d: saveData, v: 1 }))

    return json({ success: true, save: exportPackage })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})

// 导入存档
saveRoutes.post('/api/save/import', async (c) => {
  const db = c.env.DB
  try {
    const { uid, save } = await c.req.json<{ uid: string; save: string }>()
    if (!uid || !save) return json({ error: '参数不完整' }, 400)

    let pkg: SavePackage
    try { pkg = JSON.parse(base64Decode(save)) } catch { return json({ error: '存档格式无效' }, 400) }
    if (!pkg.s || !pkg.d) return json({ error: '存档缺少签名或数据' }, 400)

    const hmacKey = await getSaveHmacKey(db)
    const valid = await hmacVerify(JSON.stringify(pkg.d), pkg.s, hmacKey)
    if (!valid) return json({ error: '存档签名无效，数据可能被篡改' }, 403)
    if (pkg.d.uid !== uid) return json({ error: '存档UID不匹配' }, 403)

    const existing = await db.prepare('SELECT * FROM players WHERE uid = ?').bind(uid).first<PlayerRow>()
    const errors = validatePlayerData(pkg.d, existing)
    if (errors.length > 0) return json({ error: '存档数据异常: ' + errors.join('; ') }, 403)

    const now = Date.now()
    const realmName = (await getRealmConfigFromDB(db, pkg.d.realmIndex)).name
    await db.prepare(`
      INSERT INTO players (uid, name, realm, realm_index, exp, age, spirit_stones, speed_multiplier, speed_expire_at, last_heartbeat_time, created_at, last_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(uid) DO UPDATE SET
        name = excluded.name, realm = excluded.realm, realm_index = excluded.realm_index,
        exp = excluded.exp, age = excluded.age, spirit_stones = excluded.spirit_stones,
        speed_multiplier = excluded.speed_multiplier, speed_expire_at = excluded.speed_expire_at,
        last_heartbeat_time = excluded.last_heartbeat_time, last_active = excluded.last_active
    `).bind(uid, pkg.d.name, realmName, pkg.d.realmIndex, pkg.d.exp, pkg.d.age, pkg.d.spiritStones || 0, pkg.d.speedMultiplier || 1, pkg.d.speedExpireTime || 0, now, now, now).run()

    // 返回更新后的数据
    const updated = await db.prepare('SELECT * FROM players WHERE uid = ?').bind(uid).first<PlayerRow>()
    const inventory = await db.prepare(
      'SELECT i.name, ui.quantity FROM user_inventory ui JOIN items i ON ui.item_id = i.id WHERE ui.user_uid = ?'
    ).bind(uid).all()
    const items: Record<string, number> = {}
    for (const row of (inventory.results || [])) { items[row.name as string] = row.quantity as number }

    return json({
      success: true, message: '存档导入成功',
      player: {
        name: updated!.name, realmIndex: updated!.realm_index, exp: updated!.exp || 0,
        age: updated!.age, spiritStones: updated!.spirit_stones || 0,
        speedMultiplier: updated!.speed_multiplier || 1, speedExpireTime: updated!.speed_expire_at || 0, items,
      },
    })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})
