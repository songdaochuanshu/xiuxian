#!/usr/bin/env node

/**
 * 兑换码生成器 - 短码版
 * 用法: node scripts/gen-code.js <倍数> <时长秒数> [数量]
 *
 * 示例:
 *   node scripts/gen-code.js 2 3600      # 生成1个2倍速1小时兑换码
 *   node scripts/gen-code.js 5 3600 10   # 生成10个5倍速1小时兑换码
 *   node scripts/gen-code.js 2 0         # 生成1个永久2倍速兑换码
 */

const multiplier = parseInt(process.argv[2])
const duration = parseInt(process.argv[3])
const count = parseInt(process.argv[4]) || 1

if (!multiplier || duration === undefined) {
  console.log('用法: node gen-code.js <倍数> <时长秒数> [数量]')
  console.log('示例:')
  console.log('  node gen-code.js 2 3600      # 2倍速1小时')
  console.log('  node gen-code.js 5 3600 10   # 5倍速1小时 x10')
  console.log('  node gen-code.js 2 0         # 永久2倍速')
  process.exit(1)
}

// 生成短码：倍数标识 + 时长标识 + 随机字符
function generateCode(multiplier, duration) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 去掉容易混淆的字符
  
  // 前缀：倍数+时长类型
  const multTag = multiplier === 2 ? 'A' : multiplier === 5 ? 'B' : 'C'
  const durTag = duration === 0 ? 'P' : 'T'
  
  // 生成8位随机字符
  let random = ''
  for (let i = 0; i < 8; i++) {
    random += chars[Math.floor(Math.random() * chars.length)]
  }
  
  return `${multTag}${durTag}-${random}`
}

console.log(`\n=== 修仙加速器兑换码 ===`)
console.log(`倍速: ${multiplier}x`)
console.log(`时长: ${duration === 0 ? '永久' : duration / 3600 + '小时'}`)
console.log(`数量: ${count}`)
console.log(`========================\n`)

const codes = []
for (let i = 0; i < count; i++) {
  const code = generateCode(multiplier, duration)
  codes.push(code)
  console.log(`${i + 1}. ${code}`)
}

console.log(`\n⚠️ 兑换码24小时内有效，使用后失效`)

// 输出 SQL 插入语句（用于导入 D1）
console.log(`\n--- SQL 导入语句 ---`)
const now = Date.now()
const expireAt = duration === 0 ? null : now + 24 * 60 * 60 * 1000
for (const code of codes) {
  console.log(`INSERT INTO codes (code, multiplier, duration, expire_at, created_at) VALUES ('${code}', ${multiplier}, ${duration}, ${expireAt}, ${now});`)
}

console.log(`\n--- JSON 格式 ---`)
console.log(JSON.stringify(codes))
