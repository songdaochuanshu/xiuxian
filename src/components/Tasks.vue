<template>
  <div class="panel">
    <div class="panel-header">
      <span>任务</span>
      <span class="task-count">{{ completedCount }}/{{ tasks.length }}</span>
    </div>
    <div class="panel-body">
      <!-- Tab 切换 -->
      <div class="task-tabs">
        <span
          v-for="tab in tabs"
          :key="tab.key"
          class="task-tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >{{ tab.icon }} {{ tab.label }}</span>
      </div>

      <!-- 任务列表 -->
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else class="task-list">
        <div
          v-for="task in filteredTasks"
          :key="task.id"
          class="task-item"
          :class="{ completed: task.status === 'completed', claimed: task.status === 'claimed' }"
        >
          <div class="task-left">
            <div class="task-name">{{ task.name }}</div>
            <div class="task-desc">{{ task.desc }}</div>
            <div class="task-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: progressPercent(task) + '%' }"></div>
              </div>
              <span class="progress-text">{{ task.progress }}/{{ task.target }}</span>
            </div>
          </div>
          <div class="task-right">
            <div class="task-reward">
              {{ rewardIcon(task) }} {{ task.rewardAmount }}{{ task.rewardType === 'item' ? '个' : '' }}
            </div>
            <button
              v-if="task.status === 'completed'"
              class="btn btn-sm btn-claim"
              @click="claimReward(task)"
            >领取</button>
            <span v-else-if="task.status === 'claimed'" class="claimed-text">✓ 已领</span>
            <span v-else class="task-go">去完成</span>
          </div>
        </div>
        <div v-if="filteredTasks.length === 0" class="empty">暂无任务</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player.ts'
import { useGameStore } from '../stores/game.ts'
import { useEffectsStore } from '../stores/effects.ts'

const player = usePlayerStore()
const game = useGameStore()
const fx = useEffectsStore()
const API_URL = import.meta.env.VITE_API_URL || 'https://api.xiuxian.website'

const tasks = ref([])
const loading = ref(true)
const activeTab = ref('daily')

const tabs = [
  { key: 'daily', icon: '日', label: '每日' },
  { key: 'main', icon: '主', label: '主线' },
  { key: 'side', icon: '支', label: '支线' },
]

const filteredTasks = computed(() => tasks.value.filter(t => t.type === activeTab.value))
const completedCount = computed(() => tasks.value.filter(t => t.status === 'completed' || t.status === 'claimed').length)

function progressPercent(task) {
  return Math.min(100, (task.progress / task.target) * 100)
}

function rewardIcon(task) {
  if (task.rewardType === 'spirit_stones') return '灵'
  if (task.rewardType === 'item') return '物'
  return '奖'
}

async function loadTasks() {
  try {
    const res = await fetch(`${API_URL}/api/tasks?uid=${player.uid}`)
    const data = await res.json()
    if (data.tasks) {
      // 检测新完成的任务
      const oldCompleted = new Set(tasks.value.filter(t => t.status === 'completed').map(t => t.id))
      const newlyCompleted = data.tasks.filter(t => t.status === 'completed' && !oldCompleted.has(t.id))
      for (const t of newlyCompleted) {
        fx.effectTaskDone(t.name)
      }
      tasks.value = data.tasks
    }
  } catch {}
  loading.value = false
}

async function claimReward(task) {
  try {
    const res = await fetch(`${API_URL}/api/tasks/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: player.uid, taskId: task.id }),
    })
    const data = await res.json()
    if (data.success) {
      // 更新本地数据
      if (data.reward.type === 'spirit_stones') {
        player.spiritStones += data.reward.amount
        game.addLog(`领取奖励：${data.reward.amount}灵石`, 'success')
      } else {
        player.addItem(data.reward.value, data.reward.amount)
        game.addLog(`领取奖励：${data.reward.value} ×${data.reward.amount}`, 'success')
      }
      task.status = 'claimed'
    } else {
      game.addLog(data.error || '领取失败', 'battle')
    }
  } catch {
    game.addLog('网络错误', 'battle')
  }
}

// 暴露给父组件
defineExpose({ loadTasks })

onMounted(loadTasks)
</script>

<style scoped>
.task-count {
  font-size: 11px;
  color: var(--text-dim);
}

.task-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
}
.task-tab {
  flex: 1;
  text-align: center;
  font-size: 12px;
  padding: 6px 0;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-dim);
  background: rgba(255,255,255,0.02);
  border: 1px solid transparent;
  transition: all 0.2s;
}
.task-tab.active {
  color: var(--gold);
  background: rgba(212,168,83,0.1);
  border-color: rgba(212,168,83,0.3);
}

.loading { text-align: center; color: var(--text-dim); padding: 20px; font-size: 12px; }
.empty { text-align: center; color: var(--text-dim); padding: 20px; font-size: 12px; }

.task-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 10px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(42,42,58,0.3);
  border-radius: 6px;
  transition: all 0.3s;
}
.task-item.completed {
  border-color: rgba(212,168,83,0.4);
  background: rgba(212,168,83,0.05);
}
.task-item.claimed {
  opacity: 0.5;
}

.task-left { flex: 1; }
.task-name {
  font-size: 13px;
  color: var(--text);
  font-family: 'ZCOOL XiaoWei', serif;
}
.task-desc {
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 2px;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
}
.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255,255,255,0.05);
  border-radius: 2px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: var(--gold);
  border-radius: 2px;
  transition: width 0.3s;
}
.progress-text {
  font-size: 10px;
  color: var(--text-dim);
  min-width: 40px;
  text-align: right;
}

.task-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  margin-left: 10px;
}
.task-reward {
  font-size: 11px;
  color: var(--gold);
}
.btn-claim {
  padding: 3px 12px;
  font-size: 11px;
  animation: claimPulse 1.5s ease-in-out infinite;
}
@keyframes claimPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(212,168,83,0.4); }
  50% { box-shadow: 0 0 8px 2px rgba(212,168,83,0.3); }
}
.claimed-text {
  font-size: 11px;
  color: var(--success);
}
.task-go {
  font-size: 10px;
  color: var(--text-dim);
}
</style>
