<template>
  <div class="panel">
    <div class="panel-header">
      <span>离线挂机</span>
      <span v-if="isIdling" class="idle-badge">挂机中</span>
    </div>
    <div class="panel-body">
      <!-- 挂机状态 -->
      <div v-if="isIdling" class="idle-status">
        <div class="idle-timer">
          <div class="timer-icon">挂</div>
          <div class="timer-text">已挂机 {{ formatDuration(idleMinutes) }}</div>
          <div class="timer-sub">预计收益 {{ estimatedGain }} 修为</div>
        </div>
        <div class="idle-bar">
          <div class="idle-fill" :style="{ width: Math.min(100, (idleMinutes / 720) * 100) + '%' }"></div>
        </div>
        <div class="idle-limit">上限12小时，超时不再累积</div>
      </div>

      <!-- 未挂机 -->
      <div v-else class="idle-empty">
        <div class="empty-icon">眠</div>
        <div class="empty-text">开启挂机后离线也能获得修为</div>
        <div class="empty-desc">每秒按修炼速度累积，最多12小时</div>
      </div>

      <!-- 操作按钮 -->
      <div class="idle-actions">
        <button
          v-if="!isIdling"
          class="btn btn-full btn-idle"
          @click="startIdle"
        >开始挂机</button>
        <button
          v-else
          class="btn btn-full btn-claim"
          @click="claimIdle"
        >收取收益</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { usePlayerStore } from '../stores/player.ts'
import { useGameStore } from '../stores/game.ts'

const player = usePlayerStore()
const game = useGameStore()
const API_URL = import.meta.env.VITE_API_URL || 'https://api.xiuxian.website'

const isIdling = ref(false)
const idleMinutes = ref(0)
const estimatedGain = ref(0)
let timer = null

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes}分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`
}

async function loadStatus() {
  try {
    const res = await fetch(`${API_URL}/api/idle/status?uid=${player.uid}`)
    const data = await res.json()
    if (data.error) return
    isIdling.value = data.isIdling
    idleMinutes.value = data.elapsedMinutes
    estimatedGain.value = data.estimatedGain
  } catch {}
}

async function startIdle() {
  try {
    const res = await fetch(`${API_URL}/api/idle/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: player.uid }),
    })
    const data = await res.json()
    if (data.success) {
      isIdling.value = true
      idleMinutes.value = 0
      estimatedGain.value = 0
      game.addLog('开始离线挂机，退出游戏后修为也会增长！', 'success')
      startTimer()
    } else {
      game.addLog(data.error || '开启失败', 'battle')
    }
  } catch {
    game.addLog('网络错误', 'battle')
  }
}

async function claimIdle() {
  try {
    const res = await fetch(`${API_URL}/api/idle/claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid: player.uid }),
    })
    const data = await res.json()
    if (data.success) {
      isIdling.value = false
      game.addLog(`挂机收益：${data.minutes}分钟，修为 +${data.gain}`, 'success')
      if (data.randomEvent) {
        game.addLog(`挂机获得：${data.randomEvent.name}`, 'success')
      }
      if (data.reincarnation) {
        game.addLog('挂机期间寿元已尽，转世重修！加速 +0.1', 'breakthrough')
      }
      if (data.capped) {
        game.addLog('已达12小时上限，建议收取后重新挂机', 'info')
      }
      // 刷新状态
      loadStatus()
    } else {
      game.addLog(data.error || '收取失败', 'battle')
    }
  } catch {
    game.addLog('网络错误', 'battle')
  }
}

function startTimer() {
  timer = setInterval(() => {
    if (isIdling.value) {
      idleMinutes.value = Math.min(idleMinutes.value + 1, 720)
      // 粗略估算收益
      estimatedGain.value = Math.floor(player.cultivateSpeed * 60 * idleMinutes.value)
    }
  }, 60000)
}

onMounted(() => {
  loadStatus()
  if (isIdling.value) startTimer()
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.idle-badge {
  font-size: 10px;
  color: var(--success);
  background: rgba(64,192,128,0.15);
  padding: 2px 8px;
  border-radius: 10px;
  animation: idlePulse 2s ease-in-out infinite;
}
@keyframes idlePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.idle-status { text-align: center; padding: 10px 0; }
.idle-timer { margin-bottom: 10px; }
.timer-icon { font-size: 32px; margin-bottom: 6px; }
.timer-text { font-size: 14px; color: var(--text); font-family: 'ZCOOL XiaoWei', serif; }
.timer-sub { font-size: 12px; color: var(--gold); margin-top: 4px; }

.idle-bar {
  height: 6px;
  background: rgba(255,255,255,0.05);
  border-radius: 3px;
  overflow: hidden;
  margin: 8px 0;
}
.idle-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--mp), var(--gold));
  border-radius: 3px;
  transition: width 0.3s;
}
.idle-limit { font-size: 10px; color: var(--text-dim); }

.idle-empty { text-align: center; padding: 20px 0; }
.empty-icon { font-size: 36px; margin-bottom: 8px; }
.empty-text { font-size: 13px; color: var(--text); margin-bottom: 4px; }
.empty-desc { font-size: 11px; color: var(--text-dim); }

.idle-actions { margin-top: 12px; }
.btn-idle {
  background: linear-gradient(135deg, #2a2a5a, #4a4a8a);
  border: 1px solid rgba(100,100,200,0.3);
  color: #c8c0ff;
  letter-spacing: 2px;
}
.btn-claim {
  background: linear-gradient(135deg, #3a5a2a, #5a8a4a);
  border: 1px solid rgba(100,200,100,0.3);
  color: #c0ffc0;
  letter-spacing: 2px;
}
</style>
