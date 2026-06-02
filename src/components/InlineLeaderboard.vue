<template>
  <div class="panel">
    <div class="panel-header">
      <span>天道排行榜</span>
      <button class="btn btn-sm" :disabled="lb.submitting" @click="handleSubmit">
        {{ lb.submitting ? '上传中...' : '上传修为' }}
      </button>
    </div>
    <div class="panel-body">
      <div v-if="lb.loading" class="loading">正在窥探天机...</div>
      <div v-else-if="lb.entries.length === 0" class="empty">天道未显，尚无修仙者上榜</div>
      <div v-else class="rank-list">
        <div v-for="(entry, i) in lb.entries" :key="entry.name + entry.updated_at" class="rank-item" :class="{ 'rank-top': i < 3 }">
          <span class="rank-pos">
            <span v-if="i === 0">🥇</span>
            <span v-else-if="i === 1">🥈</span>
            <span v-else-if="i === 2">🥉</span>
            <span v-else>{{ i + 1 }}</span>
          </span>
          <span class="rank-name">{{ entry.name }}</span>
          <span class="rank-realm">{{ entry.realm }}</span>
          <span class="rank-score">{{ entry.score }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useLeaderboardStore } from '../stores/leaderboard.ts'
import { usePlayerStore } from '../stores/player.ts'
import { useGameStore } from '../stores/game.ts'

const lb = useLeaderboardStore()
const player = usePlayerStore()
const game = useGameStore()

onMounted(() => { lb.load() })

async function handleSubmit() {
  const result = await lb.submit({
    uid: player.uid,
    name: player.name,
    realm: player.realmName,
    realmIndex: player.realmIndex,
    age: player.age,
    lifespan: player.lifespan,
    spiritStones: player.spiritStones,
  })
  if (result.success) {
    game.addLog(`修为已上传天道！排名：第 ${result.rank} 名`, 'breakthrough')
  } else {
    game.addLog(`上传失败：${result.error}`, 'battle')
  }
}
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
.rank-item.rank-top { background: rgba(212,168,83,0.05); }
.rank-pos { width: 24px; text-align: center; }
.rank-name { flex: 1; color: var(--text); font-weight: bold; }
.rank-realm { color: var(--text-dim); font-size: 10px; }
.rank-score { color: var(--gold); font-size: 11px; }
</style>
