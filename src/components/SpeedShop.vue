<template>
  <div class="panel">
    <div class="panel-header">
      <span>⚡ 修炼加速</span>
      <span v-if="player.speedMultiplier > 1" class="speed-badge">
        {{ player.speedMultiplier }}倍速中
      </span>
    </div>
    <div class="panel-body">
      <!-- 当前加速状态 -->
      <div v-if="player.speedMultiplier > 1" class="active-speed">
        <div class="speed-timer">
          ⚡ {{ player.speedMultiplier }}倍速
          <span v-if="player.speedExpireTime > 0">
            剩余 {{ formatTime(player.speedExpireTime) }}
          </span>
          <span v-else>永久生效</span>
        </div>
      </div>

      <!-- 商品列表 -->
      <div class="shop-grid">
        <div
          v-for="item in shopItems"
          :key="item.id"
          class="shop-item"
          @click="buyItem(item)"
        >
          <div class="item-icon">{{ item.icon }}</div>
          <div class="item-name">{{ item.name }}</div>
          <div class="item-desc">{{ item.desc }}</div>
          <div class="item-price">¥{{ item.price }}</div>
          <div class="item-btn">购买</div>
        </div>
      </div>

      <!-- 卡密输入 -->
      <div class="redeem-section">
        <input
          v-model="redeemCode"
          class="redeem-input"
          placeholder="输入卡密"
          maxlength="64"
        />
        <button class="btn" @click="handleRedeem">兑换</button>
      </div>

      <!-- 提示 -->
      <div class="shop-tip">
        💡 付款后自动获得卡密，输入即可激活加速
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { useGameStore } from '../stores/game.js'

const player = usePlayerStore()
const game = useGameStore()

const redeemCode = ref('')

// ⚠️ 配置你的爱发卡商品链接
// 在爱发卡创建好商品后，把链接填到下面
const AIFAKA_BASE = 'https://www.aifaka.com'  // 改成你的爱发卡域名

const shopItems = [
  {
    id: 'speed_2x_1h',
    icon: '🚀',
    name: '2倍速',
    desc: '1小时',
    price: 1,
    multiplier: 2,
    duration: 3600,
    // 替换成你的爱发卡商品链接
    buyUrl: 'https://www.aifaka.com/item/xxx',
  },
  {
    id: 'speed_5x_1h',
    icon: '⚡',
    name: '5倍速',
    desc: '1小时',
    price: 3,
    multiplier: 5,
    duration: 3600,
    buyUrl: 'https://www.aifaka.com/item/xxx',
  },
  {
    id: 'speed_10x_1h',
    icon: '🔥',
    name: '10倍速',
    desc: '1小时',
    price: 5,
    multiplier: 10,
    duration: 3600,
    buyUrl: 'https://www.aifaka.com/item/xxx',
  },
  {
    id: 'speed_2x_perm',
    icon: '💎',
    name: '永久2倍速',
    desc: '永久生效',
    price: 9.9,
    multiplier: 2,
    duration: 0,
    buyUrl: 'https://www.aifaka.com/item/xxx',
  },
]

function buyItem(item) {
  // 跳转到爱发卡购买页面
  window.open(item.buyUrl, '_blank')
  game.addLog(`正在跳转到购买页面...`, 'info')
}

function handleRedeem() {
  const code = redeemCode.value.trim()
  if (!code) {
    game.addLog('请输入卡密', 'battle')
    return
  }

  const result = player.redeemSpeed(code)
  if (result.success) {
    game.addLog(`🎉 兑换成功！${result.multiplier}倍速已激活`, 'success')
    if (result.duration > 0) {
      game.addLog(`持续时间：${formatTime(result.duration)}`, 'info')
    } else {
      game.addLog('永久生效！', 'breakthrough')
    }
    redeemCode.value = ''
  } else {
    game.addLog(`兑换失败：${result.error}`, 'battle')
  }
}

function formatTime(seconds) {
  if (seconds <= 0) return '已过期'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}时${m}分`
  return `${m}分`
}
</script>

<style scoped>
.speed-badge {
  font-size: 11px;
  color: #ff6b6b;
  animation: blink 1s ease-in-out infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.active-speed {
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 10px;
  text-align: center;
}

.speed-timer {
  font-size: 13px;
  color: #ff6b6b;
}

.shop-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}

.shop-item {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}
.shop-item:hover {
  border-color: var(--gold-dim);
  background: rgba(212, 168, 83, 0.05);
  transform: translateY(-2px);
}

.item-icon { font-size: 24px; margin-bottom: 4px; }
.item-name { font-size: 13px; color: var(--text); font-weight: bold; }
.item-desc { font-size: 11px; color: var(--text-dim); margin: 2px 0; }
.item-price {
  font-size: 15px;
  color: #ff6b6b;
  font-weight: bold;
  margin: 4px 0;
}
.item-btn {
  font-size: 11px;
  color: var(--gold);
  background: rgba(212, 168, 83, 0.1);
  border: 1px solid var(--gold-dim);
  border-radius: 4px;
  padding: 3px 8px;
  display: inline-block;
}

.redeem-section {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.redeem-input {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 12px;
  color: var(--text);
  font-family: inherit;
  font-size: 13px;
  outline: none;
}
.redeem-input:focus {
  border-color: var(--gold-dim);
}
.redeem-input::placeholder {
  color: var(--text-dim);
}

.shop-tip {
  font-size: 11px;
  color: var(--text-dim);
  text-align: center;
}
</style>
