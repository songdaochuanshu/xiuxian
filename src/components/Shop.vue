<template>
  <div class="panel">
    <div class="panel-header">
      <span>🏪 坊市</span>
      <span class="gold-display">💎 {{ player.spiritStones }}</span>
    </div>
    <div class="panel-body">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="!shopItems.length" class="empty">坊市暂无商品</div>
      <div v-else class="shop-grid">
        <div
          v-for="item in shopItems"
          :key="item.id"
          class="shop-item"
          :class="{ disabled: player.spiritStones < item.price }"
          @click="buyItem(item)"
        >
          <div class="item-icon">{{ item.icon }}</div>
          <div class="item-name">{{ item.name }}</div>
          <div class="item-desc">{{ item.desc }}</div>
          <div class="item-price">💎 {{ item.price }}</div>
          <div v-if="item.stock_limit > 0" class="item-stock">
            限购 {{ item.stock_limit }} 个
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { useGameStore } from '../stores/game.js'

const player = usePlayerStore()
const game = useGameStore()

const shopItems = ref([])
const loading = ref(true)

const API_URL = import.meta.env.VITE_API_URL || 'https://xiuxian-api.你的子域名.workers.dev'

async function loadShop() {
  loading.value = true
  try {
    const res = await fetch(`${API_URL}/shop/config`)
    const items = await res.json()

    // 获取物品详情
    const itemsRes = await fetch(`${API_URL}/admin/monsters`) // 暂时用已有接口
    // 简化：直接用前端配置
    shopItems.value = items || []
  } catch (e) {
    console.error('加载商店失败:', e)
  }
  loading.value = false
}

async function buyItem(item) {
  if (player.spiritStones < item.price) {
    game.addLog('灵石不足！', 'battle')
    return
  }

  try {
    const res = await fetch(`${API_URL}/api/shop/buy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: player.uid,
        shopItemId: item.id,
      }),
    })

    const data = await res.json()

    if (data.success) {
      player.spiritStones = data.remaining
      player.addItem(data.item.name)
      game.addLog(`购买成功！获得 ${data.item.icon} ${data.item.name}`, 'success')
    } else {
      game.addLog(`购买失败：${data.error}`, 'battle')
    }
  } catch (e) {
    game.addLog('网络错误', 'battle')
  }
}

onMounted(loadShop)
</script>

<style scoped>
.gold-display {
  font-size: 12px;
  color: var(--gold);
}

.loading, .empty {
  text-align: center;
  color: var(--text-dim);
  padding: 20px;
}

.shop-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.shop-item {
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}
.shop-item:hover {
  border-color: var(--gold-dim);
  background: rgba(212,168,83,0.05);
  transform: translateY(-2px);
}
.shop-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.item-icon { font-size: 24px; margin-bottom: 4px; }
.item-name { font-size: 13px; color: var(--text); font-weight: bold; }
.item-desc { font-size: 11px; color: var(--text-dim); margin: 2px 0; }
.item-price {
  font-size: 13px;
  color: var(--gold);
  font-weight: bold;
  margin-top: 4px;
}
.item-stock {
  font-size: 10px;
  color: var(--text-dim);
  margin-top: 2px;
}
</style>
