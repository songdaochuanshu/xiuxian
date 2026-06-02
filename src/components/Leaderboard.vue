<template>
  <Teleport to="body">
    <div v-if="lb.visible" class="lb-overlay" @click.self="lb.hide()">
      <div class="lb-box">
        <div class="lb-header">
          <span class="lb-title">天道排行榜</span>
          <span class="lb-close" @click="lb.hide()">✕</span>
        </div>

        <div class="lb-content">
          <div v-if="lb.loading" class="lb-loading">正在窥探天机...</div>

          <div v-else-if="lb.entries.length === 0" class="lb-empty">
            天道未显，尚无修仙者上榜
          </div>

          <div v-else class="lb-list">
            <div
              v-for="(entry, i) in lb.entries"
              :key="entry.name + entry.updatedAt"
              class="lb-entry"
              :class="{ 'lb-entry-top': i < 3 }"
            >
              <div class="lb-rank">
                <span v-if="i === 0" class="lb-medal">🥇</span>
                <span v-else-if="i === 1" class="lb-medal">🥈</span>
                <span v-else-if="i === 2" class="lb-medal">🥉</span>
                <span v-else>{{ i + 1 }}</span>
              </div>
              <div class="lb-info">
                <div class="lb-name">{{ entry.name }}</div>
                <div class="lb-realm">{{ entry.realm }}</div>
              </div>
              <div class="lb-stats">
                <div class="lb-score">{{ entry.score }}</div>
                <div class="lb-detail">
                  年龄 {{ entry.age }} · 灵石 {{ entry.spirit_stones ?? entry.gold }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="lb-footer">
          <button class="btn" @click="lb.load()">刷新</button>
          <button class="btn btn-success" :disabled="lb.submitting" @click="handleSubmit">
            {{ lb.submitting ? '正在上传...' : '上传我的修为' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useLeaderboardStore } from '../stores/leaderboard.ts'
import { usePlayerStore } from '../stores/player.ts'
import { useGameStore } from '../stores/game.ts'

const lb = useLeaderboardStore()
const player = usePlayerStore()
const game = useGameStore()

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
.lb-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 150;
  display: flex;
  justify-content: center;
  align-items: center;
}

.lb-box {
  background: var(--panel);
  border: 1px solid var(--gold-dim);
  border-radius: 12px;
  width: 90%;
  max-width: 420px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.lb-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border);
}

.lb-title {
  font-size: 18px;
  color: var(--gold);
  letter-spacing: 4px;
}

.lb-close {
  color: var(--text-dim);
  cursor: pointer;
  font-size: 18px;
  padding: 4px;
}
.lb-close:hover { color: var(--text); }

.lb-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  scrollbar-width: thin;
  scrollbar-color: var(--border) transparent;
}

.lb-loading, .lb-empty {
  text-align: center;
  color: var(--text-dim);
  padding: 40px 0;
  font-size: 13px;
}

.lb-entry {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  margin-bottom: 4px;
  transition: background 0.2s;
}
.lb-entry:hover {
  background: rgba(255, 255, 255, 0.03);
}

.lb-entry-top {
  background: rgba(212, 168, 83, 0.05);
}

.lb-rank {
  width: 28px;
  text-align: center;
  font-size: 14px;
  color: var(--text-dim);
}
.lb-medal { font-size: 18px; }

.lb-info { flex: 1; }
.lb-name {
  font-size: 13px;
  color: var(--text);
  font-weight: bold;
}
.lb-realm {
  font-size: 11px;
  color: var(--success);
  margin-top: 2px;
}

.lb-stats { text-align: right; }
.lb-score {
  font-size: 13px;
  color: var(--gold);
  font-weight: bold;
}
.lb-detail {
  font-size: 10px;
  color: var(--text-dim);
  margin-top: 2px;
}

.lb-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}
.lb-footer .btn { flex: 1; }
</style>
