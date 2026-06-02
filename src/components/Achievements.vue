<template>
  <div class="panel">
    <div class="panel-header">
      <span>🎖️ 成就</span>
      <span class="achievement-count">{{ unlockedCount }}/{{ achievements.length }}</span>
    </div>
    <div class="panel-body">
      <div class="achievement-list">
        <div
          v-for="ach in achievements"
          :key="ach.id"
          class="achievement-item"
          :class="{ unlocked: isUnlocked(ach.id) }"
        >
          <div class="ach-icon">{{ ach.icon }}</div>
          <div class="ach-info">
            <div class="ach-name">{{ ach.name }}</div>
            <div class="ach-desc">{{ ach.desc }}</div>
          </div>
          <div v-if="isUnlocked(ach.id)" class="ach-check">✓</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '../stores/player.ts'

const player = usePlayerStore()

const achievements = [
  { id: 'first_cultivate', name: '初入修途', desc: '第一次开始修炼', icon: '🌱', check: () => player.realmIndex >= 0 },
  { id: 'lianyi_2', name: '炼气小成', desc: '达到炼气期二层', icon: '⭐', check: () => player.realmIndex >= 1 },
  { id: 'lianyi_5', name: '炼气中期', desc: '达到炼气期五层', icon: '🌟', check: () => player.realmIndex >= 4 },
  { id: 'lianyi_9', name: '炼气巅峰', desc: '达到炼气期九层', icon: '💫', check: () => player.realmIndex >= 8 },
  { id: 'zhuji', name: '筑基真人', desc: '突破筑基期', icon: '🏛️', check: () => player.realmIndex >= 9 },
  { id: 'jindan', name: '金丹大道', desc: '突破金丹期', icon: '💎', check: () => player.realmIndex >= 10 },
  { id: 'yuanying', name: '元婴老祖', desc: '突破元婴期', icon: '👑', check: () => player.realmIndex >= 11 },
  { id: 'rich_100', name: '小有家财', desc: '拥有100灵石', icon: '💰', check: () => player.spiritStones >= 100 },
  { id: 'rich_1000', name: '腰缠万贯', desc: '拥有1000灵石', icon: '💎', check: () => player.spiritStones >= 1000 },
  { id: 'kill_10', name: '初试身手', desc: '探索秘境10次', icon: '⚔️', check: () => (player.stats.explore_count || 0) >= 10 },
  { id: 'kill_50', name: '身经百战', desc: '探索秘境50次', icon: '🗡️', check: () => (player.stats.explore_count || 0) >= 50 },
  { id: 'old_50', name: '半百之年', desc: '年龄达到50岁', icon: '🎂', check: () => player.age >= 50 },
  { id: 'old_100', name: '百岁寿星', desc: '年龄达到100岁', icon: '🎊', check: () => player.age >= 100 },
  { id: 'speed_2x', name: '加速修炼', desc: '激活任意倍速', icon: '🚀', check: () => player.speedMultiplier > 1 },
  { id: 'auto_break', name: '自动突破', desc: '激活自动突破', icon: '⚡', check: () => player.autoBreak },
  { id: 'full_hp', name: '气血充沛', desc: '气血上限达到500', icon: '❤️', check: () => player.maxHp >= 500 },
  { id: 'strong_atk', name: '攻击力', desc: '攻击力达到100', icon: '💪', check: () => player.atk >= 100 },
]

const unlockedCount = computed(() => {
  return achievements.filter(a => isUnlocked(a.id)).length
})

function isUnlocked(id) {
  return player.isAchievementUnlocked(id)
}

// 检查并解锁成就
function checkAchievements() {
  for (const ach of achievements) {
    if (!isUnlocked(ach.id) && ach.check()) {
      player.unlockAchievement(ach.id)
      return ach
    }
  }
  return null
}

defineExpose({ checkAchievements })
</script>

<style scoped>
.achievement-count {
  font-size: 11px;
  color: var(--text-dim);
}

.achievement-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.achievement-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(42,42,58,0.3);
  border-radius: 4px;
  opacity: 0.4;
  transition: all 0.3s;
}
.achievement-item.unlocked {
  opacity: 1;
  background: rgba(212,168,83,0.05);
  border-color: rgba(212,168,83,0.2);
}

.ach-icon { font-size: 20px; }
.ach-info { flex: 1; }
.ach-name {
  font-size: 13px;
  color: var(--text);
  font-family: 'ZCOOL XiaoWei', serif;
}
.ach-desc {
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 2px;
}
.ach-check {
  color: var(--success);
  font-size: 16px;
  font-weight: bold;
}
</style>
