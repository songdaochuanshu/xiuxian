<template>
  <div class="panel">
    <div class="panel-header">⚙️ 设置</div>
    <div class="panel-body">
      <div class="setting-list">
        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">自动修炼</div>
            <div class="setting-desc">进入页面自动开始修炼</div>
          </div>
          <div class="setting-toggle" :class="{ on: autoCultivate }" @click="toggleAutoCultivate">
            {{ autoCultivate ? '开' : '关' }}
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">游戏版本</div>
            <div class="setting-desc">凡人修仙传 v1.0.0</div>
          </div>
          <span class="setting-value">Vue3 + Pinia</span>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-name">UID</div>
            <div class="setting-desc">{{ player.uid || '未生成' }}</div>
          </div>
          <button v-if="player.uid" class="btn btn-sm" @click="copyUid">复制</button>
        </div>

        <div class="setting-item" @click="exportData">
          <div class="setting-info">
            <div class="setting-name">导出存档</div>
            <div class="setting-desc">保存游戏数据到剪贴板</div>
          </div>
          <span class="setting-arrow">→</span>
        </div>

        <div class="setting-item" @click="importData">
          <div class="setting-info">
            <div class="setting-name">导入存档</div>
            <div class="setting-desc">从剪贴板恢复游戏数据</div>
          </div>
          <span class="setting-arrow">→</span>
        </div>

        <div class="setting-item danger" @click="resetGame">
          <div class="setting-info">
            <div class="setting-name">重置游戏</div>
            <div class="setting-desc">清除所有数据，重新开始</div>
          </div>
          <span class="setting-arrow">→</span>
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

const autoCultivate = ref(false)

onMounted(() => {
  autoCultivate.value = localStorage.getItem('auto_cultivate') === 'true'
  if (autoCultivate.value && !game.cultivating) {
    game.toggleCultivate()
  }
})

function toggleAutoCultivate() {
  autoCultivate.value = !autoCultivate.value
  localStorage.setItem('auto_cultivate', autoCultivate.value)
}

function copyUid() {
  navigator.clipboard.writeText(player.uid)
    .then(() => game.addLog('UID已复制', 'success'))
    .catch(() => game.addLog('复制失败', 'battle'))
}

function exportData() {
  const data = JSON.stringify(localStorage)
  navigator.clipboard.writeText(data)
    .then(() => game.addLog('存档已导出到剪贴板', 'success'))
    .catch(() => game.addLog('导出失败', 'battle'))
}

function importData() {
  navigator.clipboard.readText()
    .then(text => {
      try {
        const data = JSON.parse(text)
        if (confirm('确定导入存档？将覆盖当前数据！')) {
          for (const [key, value] of Object.entries(data)) {
            localStorage.setItem(key, value)
          }
          location.reload()
        }
      } catch {
        game.addLog('剪贴板数据无效', 'battle')
      }
    })
    .catch(() => game.addLog('读取剪贴板失败', 'battle'))
}

function resetGame() {
  if (confirm('确定重置游戏？所有数据将丢失！')) {
    if (confirm('真的确定吗？')) {
      localStorage.clear()
      location.reload()
    }
  }
}
</script>

<style scoped>
.setting-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(42,42,58,0.2);
  cursor: pointer;
}
.setting-item:last-child { border-bottom: none; }
.setting-item:hover { background: rgba(255,255,255,0.02); }
.setting-item.danger .setting-name { color: var(--danger); }

.setting-info { flex: 1; }
.setting-name {
  font-size: 13px;
  color: var(--text);
  font-family: 'ZCOOL XiaoWei', serif;
}
.setting-desc {
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 2px;
}

.setting-value {
  font-size: 12px;
  color: var(--text-dim);
}

.setting-arrow {
  color: var(--text-dim);
  font-size: 14px;
}

.setting-toggle {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  background: rgba(255,255,255,0.05);
  color: var(--text-dim);
  cursor: pointer;
  transition: all 0.3s;
}
.setting-toggle.on {
  background: rgba(64,192,128,0.15);
  color: var(--success);
}

.btn-sm {
  padding: 4px 10px;
  font-size: 11px;
}
</style>
