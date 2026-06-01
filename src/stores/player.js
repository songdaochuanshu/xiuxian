import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { REALMS } from '../data/realms.js'

export const usePlayerStore = defineStore('player', () => {
  // 状态
  const uid = ref('')
  const name = ref('无名散修')
  const realmIndex = ref(0)
  const hp = ref(100)
  const maxHp = ref(100)
  const mp = ref(50)
  const maxMp = ref(50)
  const exp = ref(0)
  const atk = ref(10)
  const def = ref(5)
  const gold = ref(0)
  const spiritStones = ref(0)
  const age = ref(16)
  const lifespan = ref(80)
  const items = ref({ '疗伤丹': 3, '聚灵丹': 2 })
  const isDead = ref(false)
  const autoBreak = ref(false) // 自动突破
  // 加速状态
  const speedMultiplier = ref(1)
  const speedExpireTime = ref(0) // 0 = 无加速, -1 = 永久, >0 = 剩余秒数

  // 计算属性
  const realm = computed(() => REALMS[realmIndex.value])
  const realmName = computed(() => realm.value.name)
  const maxExp = computed(() => realm.value.maxExp)
  const cultivateSpeed = computed(() => realm.value.speed * speedMultiplier.value)
  const expPercent = computed(() => Math.min(100, (exp.value / maxExp.value) * 100))
  const hpPercent = computed(() => (hp.value / maxHp.value) * 100)
  const mpPercent = computed(() => (mp.value / maxMp.value) * 100)
  const canBreakthrough = computed(() => exp.value >= maxExp.value)
  const isMaxRealm = computed(() => realmIndex.value >= REALMS.length - 1)

  // 方法
  function cultivate() {
    if (isDead.value) return null
    const gain = realm.value.speed * speedMultiplier.value
    exp.value = Math.min(exp.value + gain, maxExp.value)

    // 随机事件
    if (Math.random() < 0.02) {
      const events = [
        { text: '你感应到一丝天地法则，修为大进！', mult: 0.05 },
        { text: '偶得一枚灵果，修为略有精进。', mult: 0.03 },
        { text: '修炼中感悟到一丝剑意。', mult: 0.02 },
        { text: '天地灵气忽然浓郁了几分。', mult: 0.04 },
      ]
      const evt = events[Math.floor(Math.random() * events.length)]
      const bonus = Math.floor(maxExp.value * evt.mult)
      exp.value = Math.min(exp.value + bonus, maxExp.value)
      return { type: 'event', text: evt.text }
    }

    return { type: 'cultivate', gain }
  }

  function ageUp() {
    age.value++
    if (age.value >= lifespan.value) {
      isDead.value = true
      return { dead: true }
    }
    const remaining = lifespan.value - age.value
    if (remaining <= 10) {
      return { warning: true, remaining }
    }
    return { dead: false }
  }

  function breakthrough() {
    if (!canBreakthrough.value || isMaxRealm.value) return { success: false }

    let chance = 0.5
    // 破境丹加成
    if (items.value['破境丹'] > 0) {
      chance += 0.2
      items.value['破境丹']--
    }

    // 筑基需要筑基丹
    if (realmIndex.value === 8 && REALMS[realmIndex.value + 1].name === '筑基期') {
      if (!items.value['筑基丹'] || items.value['筑基丹'] <= 0) {
        return { success: false, needItem: '筑基丹' }
      }
      items.value['筑基丹']--
      chance += 0.15
    }

    const success = Math.random() < chance

    if (success) {
      realmIndex.value++
      const newRealm = REALMS[realmIndex.value]
      const oldLifespan = lifespan.value
      maxHp.value = newRealm.hp
      hp.value = maxHp.value
      maxMp.value = newRealm.mp
      mp.value = maxMp.value
      atk.value = newRealm.atk
      def.value = newRealm.def
      lifespan.value = newRealm.lifespan
      exp.value = 0

      const goldReward = (realmIndex.value + 1) * 20
      gold.value += goldReward

      return {
        success: true,
        realmName: newRealm.name,
        lifespanGain: newRealm.lifespan - oldLifespan,
        goldReward,
      }
    } else {
      // 失败惩罚
      const lostExp = Math.floor(maxExp.value * 0.3)
      exp.value = Math.max(0, exp.value - lostExp)
      const hpLoss = Math.floor(maxHp.value * 0.2)
      hp.value = Math.max(1, hp.value - hpLoss)

      let regress = false
      if (Math.random() < 0.1 && realmIndex.value > 0) {
        realmIndex.value--
        regress = true
      }

      return { success: false, lostExp, hpLoss, regress }
    }
  }

  function rest() {
    const hpGain = Math.floor(maxHp.value * 0.3)
    const mpGain = Math.floor(maxMp.value * 0.5)
    hp.value = Math.min(maxHp.value, hp.value + hpGain)
    mp.value = Math.min(maxMp.value, mp.value + mpGain)
    return { hpGain, mpGain }
  }

  function takeDamage(amount) {
    hp.value = Math.max(0, hp.value - amount)
    if (hp.value <= 0) {
      isDead.value = true
    }
  }

  function heal(amount) {
    hp.value = Math.min(maxHp.value, hp.value + amount)
  }

  function useMp(amount) {
    if (mp.value < amount) return false
    mp.value -= amount
    return true
  }

  function addItem(name, count = 1) {
    items.value[name] = (items.value[name] || 0) + count
  }

  function removeItem(name, count = 1) {
    if (!items.value[name] || items.value[name] < count) return false
    items.value[name] -= count
    if (items.value[name] <= 0) delete items.value[name]
    return true
  }

  function useItem(name, itemDef) {
    if (!items.value[name] || items.value[name] <= 0) return false
    if (itemDef.effect) {
      const proxy = {
        get hp() { return hp.value }, set hp(v) { hp.value = v },
        get maxHp() { return maxHp.value }, set maxHp(v) { maxHp.value = v },
        get mp() { return mp.value }, set mp(v) { mp.value = v },
        get maxMp() { return maxMp.value }, set maxMp(v) { maxMp.value = v },
        get atk() { return atk.value }, set atk(v) { atk.value = v },
        get gold() { return gold.value }, set gold(v) { gold.value = v },
      }
      itemDef.effect(proxy)
      items.value[name]--
      if (items.value[name] <= 0) delete items.value[name]
      return true
    }
    return false
  }

  function revive() {
    hp.value = Math.floor(maxHp.value * 0.3)
    exp.value = Math.max(0, exp.value - Math.floor(exp.value * 0.1))
    isDead.value = false
  }

  function reset() {
    name.value = '无名散修'
    realmIndex.value = 0
    hp.value = 100; maxHp.value = 100
    mp.value = 50; maxMp.value = 50
    exp.value = 0
    atk.value = 10; def.value = 5
    gold.value = 0
    age.value = 16; lifespan.value = 80
    items.value = { '疗伤丹': 3, '聚灵丹': 2 }
    isDead.value = false
    speedMultiplier.value = 1
    speedExpireTime.value = 0
  }

  // 加速功能 - 支持短码格式: AP-XXXXXXXX
  // A=2x B=5x C=10x | P=永久 T=限时
  async function redeemSpeed(code) {
    try {
      // 标准化输入：去除空格，转大写
      code = code.trim().toUpperCase().replace(/\s/g, '')

      // 格式校验
      const shortMatch = code.match(/^([ABC])([PT])-([A-Z2-9]{8})$/)
      if (!shortMatch) {
        return { success: false, error: '兑换码格式错误' }
      }

      // 调用 Worker API 验证
      const API_URL = import.meta.env.VITE_API_URL || 'https://xiuxian-api.你的子域名.workers.dev'
      const res = await fetch(`${API_URL}/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })

      const data = await res.json()

      if (!data.success) {
        return { success: false, error: data.error }
      }

      // 激活加速
      speedMultiplier.value = data.multiplier
      if (data.duration === 0) {
        speedExpireTime.value = -1
      } else {
        speedExpireTime.value = data.duration
      }

      return { success: true, multiplier: data.multiplier, duration: data.duration }
    } catch (e) {
      console.error('兑换失败:', e)
      return { success: false, error: '网络错误，请稍后再试' }
    }
  }

  function tickSpeed() {
    if (speedExpireTime.value > 0) {
      speedExpireTime.value--
      if (speedExpireTime.value <= 0) {
        speedMultiplier.value = 1
        speedExpireTime.value = 0
      }
    }
  }

  return {
    uid, name, realmIndex, hp, maxHp, mp, maxMp, exp, atk, def, gold, spiritStones, age, lifespan, items, isDead, autoBreak,
    realm, realmName, maxExp, cultivateSpeed, expPercent, hpPercent, mpPercent, canBreakthrough, isMaxRealm,
    cultivate, ageUp, breakthrough, rest, takeDamage, heal, useMp, addItem, removeItem, useItem, revive, reset,
    redeemSpeed, tickSpeed, speedMultiplier, speedExpireTime,
  }
}, {
  persist: true,
})
