#!/usr/bin/env node

/**
 * 兑换码生成器
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

function generateCode(multiplier, duration) {
  const data = {
    multiplier,
    duration,
    // 24小时后兑换码过期
    expire: Date.now() + 24 * 60 * 60 * 1000,
    // 随机ID防重复
    id: Math.random().toString(36).substring(2, 10),
  }
  return Buffer.from(JSON.stringify(data)).toString('base64')
}

console.log(`\n=== 修仙加速器兑换码 ===`)
console.log(`倍速: ${multiplier}x`)
console.log(`时长: ${duration === 0 ? '永久' : duration / 3600 + '小时'}`)
console.log(`数量: ${count}`)
console.log(`========================\n`)

for (let i = 0; i < count; i++) {
  const code = generateCode(multiplier, duration)
  console.log(`${i + 1}. ${code}`)
}

console.log(`\n⚠️ 兑换码24小时内有效，使用后失效`)
