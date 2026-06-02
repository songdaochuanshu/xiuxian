<template>
  <Teleport to="body">
    <div v-if="battle.active" class="battle-overlay">
      <div class="battle-box">
        <div class="battle-title">遭遇妖兽</div>
        <div class="battle-vs">
          <div class="battle-char">
            <div class="char-name" style="color:var(--gold)">{{ player.name }}</div>
            <div class="char-hp">HP: {{ player.hp }}</div>
          </div>
          <div class="battle-vs-text">VS</div>
          <div class="battle-char">
            <div class="char-name" style="color:var(--danger)">{{ battle.enemy?.name }}</div>
            <div class="char-hp">HP: {{ battle.enemyHp }}</div>
          </div>
        </div>
        <div class="battle-log" ref="battleLogEl">
          <div
            v-for="(log, i) in battle.battleLog"
            :key="i"
            class="log-entry"
            :class="'log-' + log.type"
          >
            {{ log.text }}
          </div>
        </div>
        <div class="battle-actions">
          <button class="btn" @click="handleAttack">攻击</button>
          <button class="btn btn-success" @click="handleSkill">灵技</button>
          <button class="btn" @click="handleUseItem">丹药</button>
          <button class="btn btn-danger" @click="handleFlee">逃跑</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { usePlayerStore } from '../stores/player.ts'
import { useGameStore } from '../stores/game.ts'
import { useBattleStore } from '../stores/battle.ts'

const player = usePlayerStore()
const game = useGameStore()
const battle = useBattleStore()
const battleLogEl = ref(null)

// 自动滚动到底部
watch(() => battle.battleLog.length, () => {
  nextTick(() => {
    if (battleLogEl.value) {
      battleLogEl.value.scrollTop = battleLogEl.value.scrollHeight
    }
  })
})

function handleAfterBattle(result) {
  if (result?.win) {
    setTimeout(() => battle.end(), 800)
  }
  if (result?.playerDead) {
    setTimeout(() => {
      battle.end()
      player.revive()
      game.addLog('你重伤昏迷，被路人救起，损失一成修为。', 'battle')
    }, 1500)
  }
}

function handleAttack() {
  const result = battle.playerAttack()
  handleAfterBattle(result)
}

function handleSkill() {
  const result = battle.playerSkill()
  if (result?.noMp) return
  handleAfterBattle(result)
}

function handleUseItem() {
  const healItems = Object.entries(player.items).filter(([name, count]) =>
    count > 0 && (name === '疗伤丹' || name === '大还丹')
  )
  if (healItems.length === 0) {
    battle.addBattleLog('没有可用的丹药！')
    return
  }
  const [itemName] = healItems[0]
  const result = battle.playerUseItem(itemName)
  handleAfterBattle(result)
}

function handleFlee() {
  const fled = battle.playerFlee()
  if (!fled) {
    // 逃跑失败，检查玩家是否死亡
    if (player.isDead) {
      setTimeout(() => {
        battle.end()
        player.revive()
        game.addLog('你重伤昏迷，被路人救起，损失一成修为。', 'battle')
      }, 1500)
    }
  }
}
</script>
