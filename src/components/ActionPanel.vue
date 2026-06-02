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
          {{ game.cultivating ? '收功' : '打坐修炼' }}
        </button>
        <button
          class="btn"
          :class="{ 'btn-glow': player.canBreakthrough }"
          @click="handleBreakthrough"
        >
          突破境界
        </button>
        <button class="btn btn-danger" @click="handleExplore">探索秘境</button>
        <button class="btn" @click="handleRest">调息恢复</button>
        <button class="btn btn-full" @click="lb.show()">天道排行榜</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { usePlayerStore } from '../stores/player.ts'
import { useGameStore } from '../stores/game.ts'
import { useBattleStore } from '../stores/battle.ts'
import { useLeaderboardStore } from '../stores/leaderboard.ts'

const player = usePlayerStore()
const game = useGameStore()
const battle = useBattleStore()
const lb = useLeaderboardStore()

function handleCultivate() {
  const newState = game.toggleCultivate()
  if (newState) {
    game.addLog('盘膝而坐，运转功法，吸收天地灵气...', 'system')
  } else {
    game.addLog('缓缓收功，停止修炼。', 'system')
  }
}

function handleBreakthrough() {
  if (!player.canBreakthrough) {
    game.addLog(`修为不足，需 ${player.maxExp} 点修为。当前: ${player.exp}`, 'battle')
    return
  }
  if (player.isMaxRealm) {
    game.addLog('已臻化境，此界再无可突破之境界！', 'breakthrough')
    return
  }

  const oldCultivating = game.cultivating
  if (oldCultivating) game.toggleCultivate()

  const result = player.breakthrough()

  if (result.needItem) {
    game.addLog(`突破筑基需${result.needItem}！请先去秘境探索获取。`, 'battle')
    if (oldCultivating) game.toggleCultivate()
    return
  }

  if (result.success) {
    game.addLog(`✨ 突破成功！踏入 ${result.realmName}！`, 'breakthrough')
    game.addLog(`气血: ${player.maxHp} · 灵力: ${player.maxMp} · 攻击: ${player.atk} · 寿元: ${player.lifespan}`, 'success')
    game.addLog(`天地感应，降下 ${result.goldReward} 灵石。`, 'info')
    game.triggerBreakthrough({ realmName: result.realmName, lifespanGain: result.lifespanGain })
  } else {
    game.addLog(`💥 突破失败！走火入魔，损失 ${result.lostExp} 修为。`, 'battle')
    if (result.regress) {
      game.addLog('道基受损，修为倒退一层！', 'battle')
    }
  }

  if (oldCultivating) game.toggleCultivate()
}

function handleExplore() {
  battle.explore()
}

function handleRest() {
  if (game.cultivating) game.toggleCultivate()
  const result = player.rest()
  game.addLog(`调息恢复，气血 +${result.hpGain}，灵力 +${result.mpGain}`, 'success')
}
</script>
