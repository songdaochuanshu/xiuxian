import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ENEMIES, SECRET_REALMS, type Enemy } from '../data/enemies.js'
import { ITEMS, TREASURE_POOL } from '../data/items.js'
import { usePlayerStore } from './player.js'
import { useGameStore } from './game.js'

export interface BattleLogEntry {
  text: string
  type: string
}

export const useBattleStore = defineStore('battle', () => {
  const active = ref(false)
  const enemy = ref<Enemy | null>(null)
  const enemyHp = ref(0)
  const turn = ref(0)
  const battleLog = ref<BattleLogEntry[]>([])

  const enemyHpPercent = computed(() => enemy.value ? (enemyHp.value / enemy.value.hp) * 100 : 0)

  function addBattleLog(text: string, type: string = 'info') {
    battleLog.value.push({ text, type })
  }

  function startBattle(enemyData: Enemy) {
    enemy.value = { ...enemyData }
    enemyHp.value = enemyData.hp
    turn.value = 0
    battleLog.value = []
    active.value = true
    addBattleLog(`遭遇 ${enemyData.name}！`, 'system')
  }

  function playerAttack() {
    if (!active.value || !enemy.value) return null
    const player = usePlayerStore()
    turn.value++

    const dmg = Math.max(1, player.atk - enemy.value.def + Math.floor(Math.random() * 10) - 5)
    enemyHp.value -= dmg
    addBattleLog(`你攻击 ${enemy.value.name}，造成 ${dmg} 点伤害！`)

    if (enemyHp.value <= 0) {
      return win()
    }

    const result = enemyAttack()
    return { dmg, ...result }
  }

  function playerSkill() {
    if (!active.value || !enemy.value) return null
    const player = usePlayerStore()

    if (!player.useMp(20)) {
      addBattleLog('灵力不足，无法施展灵技！')
      return { noMp: true }
    }

    turn.value++
    const dmg = Math.max(1, (player.atk * 2) - enemy.value.def + Math.floor(Math.random() * 15))
    enemyHp.value -= dmg
    addBattleLog(`✨ 施展灵技！对 ${enemy.value.name} 造成 ${dmg} 点伤害！`, 'success')

    if (enemyHp.value <= 0) {
      return win()
    }

    const result = enemyAttack()
    return { dmg, ...result }
  }

  function playerUseItem(itemName: string) {
    if (!active.value) return null
    const player = usePlayerStore()
    const item = ITEMS[itemName]
    if (!item || !item.effect) return null
    if (!player.removeItem(itemName)) return null

    if (itemName === '疗伤丹') { player.heal(50) }
    else if (itemName === '大还丹') { player.hp = player.maxHp }
    else if (itemName === '聚灵丹') { player.mp = Math.min(player.maxMp, player.mp + 30) }
    else if (itemName === '回灵散') { player.mp = player.maxMp }

    addBattleLog(`服下 ${item.icon} ${itemName}！`, 'success')

    const result = enemyAttack()
    return result
  }

  function playerFlee() {
    if (!active.value) return false
    const game = useGameStore()

    if (Math.random() < 0.6) {
      game.addLog('你转身就跑，成功脱身！', 'info')
      end()
      return true
    } else {
      addBattleLog('逃跑失败！')
      enemyAttack()
      return false
    }
  }

  function enemyAttack() {
    const player = usePlayerStore()
    const game = useGameStore()

    const dmg = Math.max(1, (enemy.value?.atk ?? 0) - player.def + Math.floor(Math.random() * 8) - 4)
    player.takeDamage(dmg)
    addBattleLog(`${enemy.value?.name} 攻击你，造成 ${dmg} 点伤害！`, 'battle')

    if (player.isDead) {
      addBattleLog('你被击败了...', 'battle')
      return { playerDead: true, dmg }
    }
    return { playerDead: false, dmg }
  }

  function win() {
    const player = usePlayerStore()
    const game = useGameStore()
    const e = enemy.value!

    player.exp += e.exp
    player.spiritStones += e.gold
    game.addLog(`击败 ${e.name}！获得 ${e.exp} 修为，${e.gold} 灵石。`, 'success')

    const drops: string[] = []
    if (e.drops) {
      e.drops.forEach(drop => {
        if (Math.random() < drop.chance) {
          player.addItem(drop.item)
          const itemDef = ITEMS[drop.item]
          game.addLog(`掉落：${itemDef?.icon || ''} ${drop.item}！`, 'success')
          drops.push(drop.item)
        }
      })
    }

    addBattleLog(`🎉 击败 ${e.name}！`, 'success')

    // 更新任务进度
    const game = useGameStore()
    game.updateTasks([
      { taskId: 'daily_battle_3' },
      { taskId: 'daily_battle_10' },
      { taskId: 'side_kill_50' },
      { taskId: 'side_kill_200' },
    ])

    return { win: true, exp: e.exp, stones: e.gold, drops }
  }

  function end() {
    active.value = false
    enemy.value = null
    enemyHp.value = 0
    turn.value = 0
    battleLog.value = []
  }

  function explore() {
    const player = usePlayerStore()
    const game = useGameStore()

    // 记录探索次数 + 任务进度
    player.incrementStat('explore_count')
    game.updateTasks([
      { taskId: 'daily_explore_5' },
      { taskId: 'main_kill_10' },
      { taskId: 'main_kill_100' },
    ])

    if (player.hp <= player.maxHp * 0.2) {
      game.addLog('气血不足，强行探索恐有性命之忧！先打坐恢复吧。', 'battle')
      return { blocked: true }
    }

    const available = SECRET_REALMS.filter(r => player.realmIndex >= r.minRealm && player.realmIndex <= r.maxRealm + 2)
    if (available.length === 0) {
      game.addLog('没有适合你境界的秘境。', 'info')
      return { blocked: true }
    }

    const secret = available[Math.floor(Math.random() * available.length)]
    game.addLog(`你踏入了「${secret.name}」—— ${secret.desc}`, 'system')

    const roll = Math.random()
    if (roll < 0.5) {
      const possibleEnemies = ENEMIES.filter(e => e.minRealm <= player.realmIndex)
      const e = possibleEnemies[Math.floor(Math.random() * possibleEnemies.length)]
      startBattle(e)
      return { type: 'battle', secret: secret.name }
    } else if (roll < 0.7) {
      const item = TREASURE_POOL[Math.floor(Math.random() * TREASURE_POOL.length)]
      const count = Math.floor(Math.random() * 3) + 1
      player.addItem(item, count)
      const itemDef = ITEMS[item]
      game.addLog(`🎉 发现宝箱！获得 ${itemDef?.icon || ''} ${item} ×${count}`, 'success')
      return { type: 'treasure', item, count }
    } else if (roll < 0.85) {
      const texts = [
        '你小心翼翼地探索了一番，什么也没发现。',
        '林中寂静，只有微风拂过树叶的沙沙声。',
        '你发现了一处山洞，但里面空无一物。',
        '远处传来妖兽的嘶吼，你决定绕道而行。',
      ]
      game.addLog(texts[Math.floor(Math.random() * texts.length)], 'info')
      return { type: 'nothing' }
    } else {
      const hpLoss = Math.floor(player.maxHp * 0.15)
      player.takeDamage(hpLoss)
      game.addLog(`⚠️ 误入禁制！受到 ${hpLoss} 点伤害。`, 'battle')
      return { type: 'danger', hpLoss }
    }
  }

  return {
    active, enemy, enemyHp, turn, battleLog, enemyHpPercent,
    startBattle, playerAttack, playerSkill, playerUseItem, playerFlee, end, explore,
  }
})
