<template>
  <div class="panel">
    <div class="panel-header">修行</div>
    <div class="panel-body">
      <div class="btn-group">
        <button
          class="btn"
          :class="{ 'btn-success': game.cultivating }"
          @click="handleCultivate"
        >
          {{ game.cultivating ? '停止修炼' : '开始修炼' }}
        </button>
        <button
          class="btn"
          :class="{ 'btn-glow': player.canBreakthrough }"
          @click="handleBreakthrough"
        >
          突破境界
        </button>
        <button class="btn btn-danger" @click="handleExplore">探索秘境</button>
        <button class="btn" @click="handleRest">打坐恢复</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePlayerStore } from '../stores/player.js'
import { useGameStore } from '../stores/game.js'
import { useBattleStore } from '../stores/battle.js'

const player = usePlayerStore()
const game = useGameStore()
const battle = useBattleStore()

function handleCultivate() {
  const newState = game.toggleCultivate()
  if (newState) {
    game.addLog('你盘膝而坐，运转功法，开始吸收天地灵气...', 'system')
  } else {
    game.addLog('你缓缓收功，停止了修炼。', 'system')
  }
}

function handleBreakthrough() {
  if (!player.canBreakthrough) {
    game.addLog(`修为不足，需要 ${player.maxExp} 点修为才能尝试突破。当前: ${player.exp}`, 'battle')
    return
  }
  if (player.isMaxRealm) {
    game.addLog('你已臻至化境，此界再无可突破之境界！', 'breakthrough')
    return
  }

  const oldCultivating = game.cultivating
  if (oldCultivating) game.toggleCultivate()

  const result = player.breakthrough()

  if (result.needItem) {
    game.addLog(`突破筑基需要${result.needItem}！请先去秘境探索获取。`, 'battle')
    if (oldCultivating) game.toggleCultivate()
    return
  }

  if (result.success) {
    game.addLog(`✨ 突破成功！你已踏入 ${result.realmName}！`, 'breakthrough')
    game.addLog(`气血: ${player.maxHp} | 灵力: ${player.maxMp} | 攻击: ${player.atk} | 寿元: ${player.lifespan}`, 'success')
    game.addLog(`天地感应，降下 ${result.goldReward} 灵石。`, 'info')
    game.triggerBreakthrough({
      realmName: result.realmName,
      lifespanGain: result.lifespanGain,
    })
  } else {
    game.addLog(`💥 突破失败！走火入魔，损失 ${result.lostExp} 修为，气血受损。`, 'battle')
    if (result.regress) {
      game.addLog('道基受损，修为倒退一层！', 'battle')
    }
  }

  if (oldCultivating) game.toggleCultivate()
}

function handleExplore() {
  const result = battle.explore()
  if (result.type === 'treasure') {
    // 物品已在 store 中添加
  }
}

function handleRest() {
  if (game.cultivating) game.toggleCultivate()
  const result = player.rest()
  game.addLog(`你盘膝打坐，恢复了 ${result.hpGain} 气血，${result.mpGain} 灵力。`, 'success')
}
</script>
