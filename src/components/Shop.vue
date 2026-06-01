<template>
  <div class="panel">
    <div class="panel-header">
      <span>🏪 修仙商店</span>
      <span class="gold-display">💎 {{ player.gold }}</span>
    </div>
    <div class="panel-body">
      <div class="shop-tabs">
        <div
          v-for="tab in tabs"
          :key="tab.key"
          class="tab"
          :class="{ active: currentTab === tab.key }"
          @click="currentTab = tab.key"
        >
          {{ tab.icon }} {{ tab.label }}
        </div>
      </div>

      <div class="shop-grid">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="shop-item"
          :class="{ disabled: player.gold < item.price }"
          @click="buyItem(item)"
        >
          <div class="item-icon">{{ item.icon }}</div>
          <div class="item-name">{{ item.name }}</div>
          <div class="item-desc">{{ item.desc }}</div>
          <div class="item-price">💎 {{ item.price }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePlayerStore } from '../stores/player.js'
import { useGameStore } from '../stores/game.js'

const player = usePlayerStore()
const game = useGameStore()

const currentTab = ref('items')
const tabs = [
  { key: 'items', icon: '📦', label: '道具' },
  { key: 'skills', icon: '✨', label: '技能' },
  { key: 'special', icon: '🌟', label: '特殊' },
]

const shopItems = ref([
  // 道具
  { id: 'heal_pill', icon: '🩹', name: '疗伤丹', desc: '恢复50气血', price: 10, tab: 'items', effect: 'heal50' },
  { id: 'mp_pill', icon: '💎', name: '聚灵丹', desc: '恢复30灵力', price: 10, tab: 'items', effect: 'mp30' },
  { id: 'big_heal', icon: '❤️‍🔥', name: '大还丹', desc: '完全恢复气血', price: 50, tab: 'items', effect: 'fullHeal' },
  { id: 'big_mp', icon: '💙', name: '回灵散', desc: '完全恢复灵力', price: 50, tab: 'items', effect: 'fullMp' },
  { id: 'snake_gall', icon: '🟢', name: '蛇胆', desc: '永久+2攻击', price: 30, tab: 'items', effect: 'atk2' },
  { id: 'dragon_blood', icon: '🐉', name: '龙血丹', desc: '永久+50气血上限', price: 100, tab: 'items', effect: 'hp50' },
  { id: 'break_pill', icon: '🌟', name: '破境丹', desc: '增加突破概率20%', price: 80, tab: 'items', effect: 'breakBonus' },
  { id: 'jidan', icon: '🔶', name: '筑基丹', desc: '突破筑基必备', price: 200, tab: 'items', effect: 'jidan' },

  // 技能
  { id: 'auto_break', icon: '⚡', name: '自动突破', desc: '修为满后自动尝试突破', price: 500, tab: 'skills', effect: 'autoBreak', once: true },

  // 特殊
  { id: 'rename', icon: '✏️', name: '改名卡', desc: '修改道号', price: 100, tab: 'special', effect: 'rename' },
])

const filteredItems = computed(() => {
  return shopItems.value.filter(item => item.tab === currentTab.value)
})

function buyItem(item) {
  if (player.gold < item.price) {
    game.addLog('灵石不足！', 'battle')
    return
  }

  // 检查是否已购买（一次性物品）
  if (item.once && player.items[`bought_${item.id}`]) {
    game.addLog('已购买过该物品！', 'battle')
    return
  }

  player.gold -= item.price

  switch (item.effect) {
    case 'heal50':
      player.heal(50)
      game.addLog('使用疗伤丹，恢复50气血', 'success')
      break
    case 'mp30':
      player.mp = Math.min(player.maxMp, player.mp + 30)
      game.addLog('使用聚灵丹，恢复30灵力', 'success')
      break
    case 'fullHeal':
      player.hp = player.maxHp
      game.addLog('使用大还丹，气血完全恢复', 'success')
      break
    case 'fullMp':
      player.mp = player.maxMp
      game.addLog('使用回灵散，灵力完全恢复', 'success')
      break
    case 'atk2':
      player.atk += 2
      game.addLog('使用蛇胆，攻击+2', 'success')
      break
    case 'hp50':
      player.maxHp += 50
      player.hp += 50
      game.addLog('使用龙血丹，气血上限+50', 'success')
      break
    case 'breakBonus':
      player.addItem('破境丹')
      game.addLog('获得破境丹', 'success')
      break
    case 'jidan':
      player.addItem('筑基丹')
      game.addLog('获得筑基丹', 'success')
      break
    case 'autoBreak':
      player.autoBreak = true
      player.items[`bought_auto_break`] = true
      game.addLog('自动突破已激活！', 'breakthrough')
      break
    case 'rename':
      const newName = prompt('请输入新道号：')
      if (newName && newName.trim()) {
        player.name = newName.trim()
        game.addLog(`道号已修改为：${player.name}`, 'success')
      } else {
        player.gold += item.price // 退款
      }
      break
  }
}
</script>

<style scoped>
.gold-display {
  font-size: 12px;
  color: var(--gold);
}

.shop-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 10px;
}
.tab {
  flex: 1;
  text-align: center;
  padding: 6px;
  font-size: 12px;
  cursor: pointer;
  border-radius: 6px;
  background: rgba(255,255,255,0.03);
  border: 1px solid transparent;
  transition: all 0.2s;
}
.tab:hover { background: rgba(212,168,83,0.05); }
.tab.active {
  border-color: var(--gold-dim);
  background: rgba(212,168,83,0.1);
  color: var(--gold);
}

.shop-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.shop-item {
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}
.shop-item:hover {
  border-color: var(--gold-dim);
  background: rgba(212,168,83,0.05);
  transform: translateY(-2px);
}
.shop-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.item-icon { font-size: 24px; margin-bottom: 4px; }
.item-name { font-size: 13px; color: var(--text); font-weight: bold; }
.item-desc { font-size: 11px; color: var(--text-dim); margin: 2px 0; }
.item-price {
  font-size: 13px;
  color: var(--gold);
  font-weight: bold;
  margin-top: 4px;
}
</style>
