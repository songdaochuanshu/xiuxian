/**
 * 凡人修仙传 - 工具函数
 */

import type { RealmConfig, RealmRow } from './types'
import { DEFAULT_REALMS, DEFAULT_MAX_EXP } from './config'

// ==================== 响应工具 ====================

/** 返回 JSON 响应 */
export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ==================== 境界工具 ====================

/** 境界缓存（1分钟有效期） */
let cachedRealms: RealmRow[] | null = null
let cacheTime = 0

/** 从数据库获取所有境界配置（带缓存） */
export async function getRealms(db: D1Database): Promise<RealmRow[]> {
  if (cachedRealms && Date.now() - cacheTime < 60000) return cachedRealms
  try {
    const rows = await db.prepare('SELECT * FROM realms ORDER BY sort_order').all<RealmRow>()
    if (rows.results && rows.results.length > 0) {
      cachedRealms = rows.results
      cacheTime = Date.now()
      return cachedRealms!
    }
  } catch {}
  return []
}

/** 获取指定境界的配置（优先数据库，fallback 默认值） */
export async function getRealmConfigFromDB(db: D1Database, realmIndex: number): Promise<RealmConfig> {
  const realms = await getRealms(db)
  if (realms.length > 0) {
    const r = realms[Math.min(realmIndex, realms.length - 1)]
    return { name: r.name, speed: r.speed, lifespan: r.lifespan }
  }
  return DEFAULT_REALMS[Math.min(realmIndex, DEFAULT_REALMS.length - 1)]
}

/** 获取指定境界的修为上限 */
export async function getMaxExpFromDB(db: D1Database, realmIndex: number): Promise<number> {
  const realms = await getRealms(db)
  if (realms.length > 0) {
    return realms[Math.min(realmIndex, realms.length - 1)].max_exp
  }
  return DEFAULT_MAX_EXP[Math.min(realmIndex, DEFAULT_MAX_EXP.length - 1)]
}

// ==================== 加密工具 ====================

/** Base64 编码（支持 UTF-8 中文） */
export function base64Encode(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

/** Base64 解码（支持 UTF-8 中文） */
export function base64Decode(b64: string): string {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/** HMAC-SHA256 签名 */
export async function hmacSign(data: string, key: string): Promise<string> {
  const enc = new TextEncoder()
  const cryptoKey = await crypto.subtle.importKey(
    'raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

/** HMAC-SHA256 验签 */
export async function hmacVerify(data: string, sig: string, key: string): Promise<boolean> {
  const expected = await hmacSign(data, key)
  return expected === sig
}

// ==================== 数值工具 ====================

/** 随机整数 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** 获取今日日期字符串（UTC+8） */
export function getToday(): string {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)
}

// ==================== 深渊工具 ====================

import { BOSS_NAMES } from './config'

/** 计算深渊 Boss 属性（指数递增） */
export function getAbyssBoss(layer: number) {
  const baseHp = 200
  const baseAtk = 30
  const baseDef = 15
  const mult = Math.pow(1.15, layer - 1)
  const nameIdx = (layer - 1) % BOSS_NAMES.length
  const star = Math.floor((layer - 1) / BOSS_NAMES.length)
  const starTag = star > 0 ? '★'.repeat(star) : ''
  return {
    layer,
    name: `${BOSS_NAMES[nameIdx]}${starTag}`,
    hp: Math.floor(baseHp * mult),
    atk: Math.floor(baseAtk * mult),
    def: Math.floor(baseDef * mult),
    immuneControl: layer >= 10,
    reduceDodge: layer >= 50 ? Math.min(0.5, (layer - 50) * 0.01) : 0,
  }
}

/** 首通奖励计算 */
export function getFirstClearReward(layer: number) {
  const stones = 50 + layer * 30 + Math.floor(layer / 10) * 200
  const items: { name: string; amount: number }[] = []
  if (layer % 5 === 0) items.push({ name: '破境丹', amount: 1 + Math.floor(layer / 20) })
  if (layer % 10 === 0) items.push({ name: '龙血丹', amount: 1 })
  if (layer % 25 === 0) items.push({ name: '大还丹', amount: 3 })
  return { stones, items }
}

/** 每日低保收益 */
export function getDailyReward(maxLayer: number) {
  return 20 + maxLayer * 10 + Math.floor(maxLayer / 10) * 100
}
