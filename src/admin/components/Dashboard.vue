<template>
  <div>
    <div class="header">
      <h1>📊 仪表盘</h1>
      <button class="btn" @click="load">刷新</button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <div v-else class="stats">
      <div class="stat-card">
        <div class="stat-value">{{ stats.codes?.total || 0 }}</div>
        <div class="stat-label">兑换码总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.codes?.used || 0 }}</div>
        <div class="stat-label">已使用</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.codes?.unused || 0 }}</div>
        <div class="stat-label">未使用</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.players?.total || 0 }}</div>
        <div class="stat-label">玩家数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ stats.orders?.paid || 0 }}</div>
        <div class="stat-label">已付款订单</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { adminApi } from '../api.ts'

const stats = ref({})
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    stats.value = await adminApi.getStats()
  } catch (e) {
    console.error('加载失败:', e)
  }
  loading.value = false
}

onMounted(load)
</script>

<style scoped>
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.header h1 { font-size: 20px; color: var(--gold); }
.loading { text-align: center; color: var(--text-dim); padding: 40px; }

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}
.stat-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px;
  text-align: center;
}
.stat-value {
  font-size: 28px;
  color: var(--gold);
  font-weight: bold;
}
.stat-label {
  font-size: 12px;
  color: var(--text-dim);
  margin-top: 4px;
}
</style>
