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
          @click="selectItem(item)"
        >
          <div class="item-icon">{{ item.icon }}</div>
          <div class="item-name">{{ item.name }}</div>
          <div class="item-desc">{{ item.desc }}</div>
          <div class="item-price">¥{{ item.price }}</div>
        </div>
      </div>

      <!-- 兑换码输入 -->
      <div class="redeem-section">
        <input
          v-model="redeemCode"
          class="redeem-input"
          placeholder="输入兑换码"
          maxlength="64"
        />
        <button class="btn" @click="handleRedeem">兑换</button>
      </div>

      <!-- 提示 -->
      <div class="shop-tip">
        💡 扫码付款后联系店主获取兑换码
      </div>
    </div>
  </div>

  <!-- 付款弹窗 -->
  <Teleport to="body">
    <div v-if="showPay" class="pay-overlay" @click.self="showPay = false">
      <div class="pay-box">
        <div class="pay-title">扫码付款</div>
        <div class="pay-item">
          <span>{{ selectedItem?.icon }} {{ selectedItem?.name }}</span>
          <span class="pay-price">¥{{ selectedItem?.price }}</span>
        </div>
        <div class="pay-qrcode">
          <!-- 请将收款码图片放到 public/qrcode.png -->
          <div class="qrcode-placeholder">
            <div class="qr-icon">📷</div>
            <div class="qr-text">收款码</div>
            <div class="qr-hint">请将收款码图片放到 public/qrcode.png</div>
          </div>
          <div class="pay-tip">微信扫码支付</div>
        </div>
        <div class="pay-actions">
          <button class="btn btn-full" @click="showPay = false">我已付款，去兑换</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { usePlayerStore } from '../stores/player.ts'
import { useGameStore } from '../stores/game.ts'

const player = usePlayerStore()
const game = useGameStore()

const showPay = ref(false)
const selectedItem = ref(null)
const redeemCode = ref('')

const shopItems = [
  {
    id: 'speed_2x_1h',
    icon: '🚀',
    name: '2倍速',
    desc: '1小时',
    price: 1,
    multiplier: 2,
    duration: 3600,
  },
  {
    id: 'speed_5x_1h',
    icon: '⚡',
    name: '5倍速',
    desc: '1小时',
    price: 3,
    multiplier: 5,
    duration: 3600,
  },
  {
    id: 'speed_10x_1h',
    icon: '🔥',
    name: '10倍速',
    desc: '1小时',
    price: 5,
    multiplier: 10,
    duration: 3600,
  },
  {
    id: 'speed_2x_perm',
    icon: '💎',
    name: '永久2倍速',
    desc: '永久生效',
    price: 9.9,
    multiplier: 2,
    duration: 0,
  },
]

function selectItem(item) {
  selectedItem.value = item
  showPay.value = true
}

async function handleRedeem() {
  const code = redeemCode.value.trim()
  if (!code) {
    game.addLog('请输入兑换码', 'battle')
    return
  }

  const result = await player.redeemSpeed(code)
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
  margin-top: 4px;
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

/* 付款弹窗 */
.pay-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 160;
  display: flex;
  justify-content: center;
  align-items: center;
}

.pay-box {
  background: var(--panel);
  border: 1px solid var(--gold-dim);
  border-radius: 12px;
  padding: 20px;
  width: 90%;
  max-width: 320px;
  text-align: center;
}

.pay-title {
  font-size: 18px;
  color: var(--gold);
  margin-bottom: 16px;
  letter-spacing: 4px;
}

.pay-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
  margin-bottom: 16px;
}

.pay-price {
  font-size: 18px;
  color: #ff6b6b;
  font-weight: bold;
}

.pay-qrcode {
  margin-bottom: 16px;
}

.qrcode-img {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  background: #fff;
  padding: 8px;
}

.qrcode-placeholder {
  width: 200px;
  height: 200px;
  margin: 0 auto;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px dashed var(--border);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.qr-icon { font-size: 32px; }
.qr-text { font-size: 14px; color: var(--text); }
.qr-hint { font-size: 10px; color: var(--text-dim); padding: 0 10px; }

.pay-tip {
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 8px;
}

.pay-actions {
  margin-top: 12px;
}
</style>
