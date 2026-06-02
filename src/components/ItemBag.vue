<template>
  <div class="panel">
    <div class="panel-header">
      <span>乾坤袋</span>
      <span style="font-size:12px">💎 {{ player.spiritStones }}</span>
    </div>
    <div class="panel-body">
      <div v-if="itemList.length === 0" style="text-align:center;color:var(--text-dim);font-size:12px;padding:12px">
        空空如也
      </div>
      <div v-else class="items-grid">
        <div
          v-for="item in itemList"
          :key="item.name"
          class="item-card"
          :title="item.desc"
          @click="handleUse(item.name)"
        >
          <div class="item-icon">{{ item.icon }}</div>
          <div class="item-name">{{ item.name }}</div>
          <div class="item-count">×{{ item.count }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { usePlayerStore } from '../stores/player.ts'
import { useGameStore } from '../stores/game.ts'
import { ITEMS } from '../data/items.ts'

const player = usePlayerStore()
const game = useGameStore()

const itemList = computed(() => {
  return Object.entries(player.items)
    .filter(([_, count]) => count > 0)
    .map(([name, count]) => ({
      name,
      count,
      icon: ITEMS[name]?.icon || '📦',
      desc: ITEMS[name]?.desc || '',
    }))
})

function handleUse(name) {
  const itemDef = ITEMS[name]
  if (!itemDef) return

  // 可直接使用的物品
  if (itemDef.effect) {
    if (player.useItem(name, itemDef)) {
      game.addLog(`使用 ${itemDef.icon} ${name} —— ${itemDef.desc}`, 'success')
    }
  } else {
    game.addLog(`${name} 无法直接使用。`, 'info')
  }
}
</script>
