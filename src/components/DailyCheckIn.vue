<template>
  <div v-if="show" class="panel">
    <div class="panel-header">
      <span>每日签到</span>
      <span class="streak">连续 {{ streak }} 天</span>
    </div>
    <div class="panel-body">
      <div class="checkin-grid">
        <div
          v-for="day in 7"
          :key="day"
          class="checkin-day"
          :class="{
            checked: day <= streak,
            today: day === streak + 1 && !checkedToday,
            reward: day === streak + 1 && !checkedToday
          }"
        >
          <div class="day-num">第{{ day }}天</div>
          <div class="day-reward">{{ getReward(day) }}</div>
          <div v-if="day <= streak" class="day-check">✓</div>
        </div>
      </div>

      <button
        v-if="!checkedToday"
        class="btn btn-full checkin-btn"
        @click="handleCheckIn"
      >
        签到领取奖励
      </button>
      <div v-else class="checked-text">今日已签到</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player.ts'
import { useGameStore } from '../stores/game.ts'

const player = usePlayerStore()
const game = useGameStore()

const show = ref(false)
const streak = ref(0)
const checkedToday = ref(false)
const lastCheckIn = ref('')

const rewards = {
  1: { icon: '灵', text: '10灵石', stones: 10 },
  2: { icon: '灵', text: '20灵石', stones: 20 },
  3: { icon: '🩹', text: '30灵石+疗伤丹', stones: 30, item: '疗伤丹' },
  4: { icon: '灵', text: '40灵石', stones: 40 },
  5: { icon: '丹', text: '50灵石+破境丹', stones: 50, item: '破境丹' },
  6: { icon: '灵', text: '60灵石', stones: 60 },
  7: { icon: '丹', text: '100灵石+龙血丹', stones: 100, item: '龙血丹' },
}

function getReward(day) {
  return rewards[day]?.text || ''
}

function getToday() {
  return new Date().toISOString().split('T')[0]
}

onMounted(() => {
  const saved = player.items.checkin_data
  if (saved) {
    const data = JSON.parse(saved)
    lastCheckIn.value = data.last || ''
    streak.value = data.streak || 0

    const today = getToday()
    if (lastCheckIn.value === today) {
      checkedToday.value = true
    } else {
      // 检查是否连续
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = yesterday.toISOString().split('T')[0]

      if (lastCheckIn.value !== yesterdayStr) {
        streak.value = 0 // 断签重置
      }
    }
  }

  // 只在未签到时显示
  show.value = !checkedToday.value
})

function handleCheckIn() {
  const today = getToday()
  if (lastCheckIn.value === today) return

  streak.value++
  if (streak.value > 7) streak.value = 1

  const reward = rewards[streak.value]
  if (reward) {
    player.spiritStones += reward.stones
    if (reward.item) {
      player.addItem(reward.item)
    }
    game.addLog(`签到成功！获得 ${reward.text}`, 'success')
  }

  lastCheckIn.value = today
  checkedToday.value = true
  show.value = false

  // 保存签到数据
  player.items.checkin_data = JSON.stringify({
    last: today,
    streak: streak.value,
  })
}
</script>

<style scoped>
.streak {
  font-size: 11px;
  color: var(--gold);
}

.checkin-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 12px;
}

.checkin-day {
  text-align: center;
  padding: 6px 2px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(42,42,58,0.3);
  border-radius: 4px;
  position: relative;
  transition: all 0.3s;
}
.checkin-day.checked {
  background: rgba(212,168,83,0.1);
  border-color: rgba(212,168,83,0.3);
}
.checkin-day.today {
  border-color: var(--gold);
  animation: todayPulse 2s ease-in-out infinite;
}
@keyframes todayPulse {
  0%, 100% { box-shadow: 0 0 4px rgba(212,168,83,0.2); }
  50% { box-shadow: 0 0 12px rgba(212,168,83,0.4); }
}

.day-num {
  font-size: 9px;
  color: var(--text-dim);
  margin-bottom: 2px;
}
.day-reward {
  font-size: 8px;
  color: var(--text);
  font-family: 'ZCOOL XiaoWei', serif;
  line-height: 1.2;
}
.day-check {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 10px;
  color: var(--success);
}

.checkin-btn {
  font-size: 14px;
  letter-spacing: 4px;
  padding: 12px;
}

.checked-text {
  text-align: center;
  color: var(--text-dim);
  font-size: 13px;
  font-family: 'ZCOOL XiaoWei', serif;
}
</style>
