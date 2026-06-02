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
            <div class="setting-desc">{{ gameName }} v1.0.0</div>
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

        <div v-if="qqGroup" class="setting-item" @click="joinQQGroup">
          <div class="setting-info">
            <div class="setting-name">👥 加入QQ群</div>
            <div class="setting-desc">{{ qqGroupName || '玩家交流群' }} · {{ qqGroup }}</div>
          </div>
          <span class="setting-arrow">→</span>
        </div>

        <div class="setting-item" @click="exportData">
          <div class="setting-info">
            <div class="setting-name">🔒 导出存档</div>
            <div class="setting-desc">加密保存游戏数据到剪贴板</div>
          </div>
          <span class="setting-arrow">→</span>
        </div>

        <div class="setting-item" @click="importData">
          <div class="setting-info">
            <div class="setting-name">🔓 导入存档</div>
            <div class="setting-desc">从剪贴板解密恢复游戏数据</div>
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
import { usePlayerStore } from '../stores/player.ts'
import { useGameStore } from '../stores/game.ts'
const API_URL = import.meta.env.VITE_API_URL || 'https://xiuxian-api.你的子域名.workers.dev'

const player = usePlayerStore()
const game = useGameStore()

const autoCultivate = ref(false)
const gameName = ref('凡人修仙传')
const qqGroup = ref('')
const qqGroupName = ref('')

onMounted(async () => {
  try {
    const res = await fetch(`${API_URL}/game/config`)
    const cfg = await res.json()
    if (cfg.gameName) gameName.value = cfg.gameName
    if (cfg.qqGroup) qqGroup.value = cfg.qqGroup
    if (cfg.qqGroupName) qqGroupName.value = cfg.qqGroupName
  } catch {}
  autoCultivate.value = localStorage.getItem('auto_cultivate') === 'true'
  if (autoCultivate.value && !game.cultivating) {
    game.toggleCultivate()
  }
})

function toggleAutoCultivate() {
  autoCultivate.value = !autoCultivate.value
  localStorage.setItem('auto_cultivate', autoCultivate.value)
}

function joinQQGroup() {
  // QQ群链接
  window.open(`https://qm.qq.com/q/${qqGroup.value}`, '_blank')
}

function copyUid() {
  navigator.clipboard.writeText(player.uid)
    .then(() => game.addLog('UID已复制', 'success'))
    .catch(() => game.addLog('复制失败', 'battle'))
}

async function exportData() {
  try {
    game.addLog('正在导出存档...', 'info')

    // 调用服务端接口，从数据库生成签名存档
    const res = await fetch(`${API_URL}/api/save/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: player.uid }),
    })
    const data = await res.json()

    if (!data.success) {
      game.addLog('导出失败: ' + (data.error || '未知错误'), 'battle')
      return
    }

    await navigator.clipboard.writeText(data.save)
    game.addLog('🔒 存档已签名导出到剪贴板', 'success')
  } catch (e) {
    console.error('导出失败:', e)
    game.addLog('导出失败: 网络错误', 'battle')
  }
}

async function importData() {
  try {
    const text = await navigator.clipboard.readText()
    if (!text || text.trim().length === 0) {
      game.addLog('剪贴板为空', 'battle')
      return
    }

    if (!confirm('确定导入存档？将覆盖当前数据！')) return

    game.addLog('正在验证存档...', 'info')

    // 提交服务端验证
    const res = await fetch(`${API_URL}/api/save/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: player.uid, save: text.trim() }),
    })
    const data = await res.json()

    if (!data.success) {
      game.addLog('导入失败: ' + (data.error || '存档验证不通过'), 'battle')
      return
    }

    game.addLog('✅ 存档验证通过，正在恢复...', 'success')

    // 用服务器返回的权威数据更新本地
    if (data.player) {
      const p = data.player
      // 更新 pinia store
      player.name = p.name
      player.realmIndex = p.realmIndex
      player.exp = p.exp
      player.age = p.age
      player.spiritStones = p.spiritStones || 0
      player.speedMultiplier = p.speedMultiplier || 1
      player.speedExpireTime = p.speedExpireTime || 0
      player.items = p.items || {}
      player.isDead = false
    }

    location.reload()
  } catch (e) {
    console.error('导入失败:', e)
    game.addLog('导入失败: 网络错误', 'battle')
  }
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
