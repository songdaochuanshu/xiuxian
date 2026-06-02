<template>
  <div class="panel">
    <div class="panel-header">
      <span>🗼 深渊天梯</span>
      <button class="btn btn-sm" @click="load">刷新</button>
    </div>
    <div class="panel-body">
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="rankList.length === 0" class="empty">暂无数据</div>
      <div v-else class="rank-list">
        <div v-for="(r, i) in rankList" :key="r.uid" class="rank-item" :class="{ 'rank-self': r.uid === player.uid }">
          <span class="rank-pos">
            <span v-if="i === 0">🥇</span>
            <span v-else-if="i === 1">🥈</span>
            <span v-else-if="i === 2">🥉</span>
            <span v-else>{{ i + 1 }}</span>
          </span>
          <span class="rank-name">{{ r.name }}</span>
          <span class="rank-realm">{{ r.realm }}</span>
          <span class="rank-layer">第{{ r.abyss_max_layer }}层</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player.ts'

const player = usePlayerStore()
const API_URL = import.meta.env.VITE_API_URL || 'https://xiuxianv-api.songdaochuanshu.workers.dev'

const rankList = ref([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const res = await fetch(`${API_URL}/api/abyss/leaderboard`)
    const data = await res.json()
    rankList.value = data.entries || []
  } catch {}
  loading.value = false
}

onMounted(load)
</script>

<style scoped>
.loading, .empty { text-align: center; color: var(--text-dim); padding: 20px; font-size: 12px; }
.rank-list { display: flex; flex-direction: column; gap: 4px; }
.rank-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: rgba(255,255,255,0.02);
  border-radius: 6px;
  font-size: 12px;
}
.rank-item.rank-self {
  background: rgba(212,168,83,0.1);
  border-left: 2px solid var(--gold);
}
.rank-pos { width: 24px; text-align: center; }
.rank-name { flex: 1; color: var(--text); font-weight: bold; }
.rank-realm { color: var(--text-dim); font-size: 10px; }
.rank-layer { color: var(--gold); font-size: 11px; }
</style>
