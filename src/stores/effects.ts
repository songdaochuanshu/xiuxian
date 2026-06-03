import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface FloatText {
  id: number
  text: string
  x: number
  y: number
  color: string
  size: number
  bold?: boolean
  duration?: number
  glow?: string
}

export interface BannerNotice {
  id: number
  text: string
  sub?: string
  type: 'success' | 'fail' | 'info' | 'task'
}

export const useEffectsStore = defineStore('effects', () => {
  let nextId = 0

  const floats = ref<FloatText[]>([])
  const banners = ref<BannerNotice[]>([])
  const screenShake = ref(false)
  const screenFlash = ref<string | null>(null)

  /** 飘字 */
  function addFloat(text: string, x: number, y: number, opts?: {
    color?: string
    size?: number
    bold?: boolean
    duration?: number
    glow?: string
  }) {
    const id = ++nextId
    const item: FloatText = {
      id, text, x, y,
      color: opts?.color || '#fff',
      size: opts?.size || 16,
      bold: opts?.bold,
      duration: opts?.duration || 1500,
      glow: opts?.glow,
    }
    floats.value.push(item)
    setTimeout(() => {
      floats.value = floats.value.filter(f => f.id !== id)
    }, item.duration)
  }

  /** 横幅通知 */
  function addBanner(text: string, sub?: string, type: BannerNotice['type'] = 'info') {
    const id = ++nextId
    banners.value.push({ id, text, sub, type })
    setTimeout(() => {
      banners.value = banners.value.filter(b => b.id !== id)
    }, 3500)
  }

  /** 屏幕震动 */
  function shake(duration = 400) {
    screenShake.value = true
    setTimeout(() => { screenShake.value = false }, duration)
  }

  /** 屏幕闪白/闪金 */
  function flash(color = 'rgba(255,215,0,0.3)', duration = 300) {
    screenFlash.value = color
    setTimeout(() => { screenFlash.value = null }, duration)
  }

  // === 快捷方法 ===

  /** 修炼飘字 */
  function floatCultivate(x: number, y: number, text: string) {
    addFloat(text, x, y, { color: '#66ff88', size: 14, glow: 'rgba(100,255,136,0.5)' })
  }

  /** 突破成功 */
  function effectBreakthroughSuccess(realmName: string) {
    addBanner(`突破成功`, realmName, 'success')
    shake(300)
    flash('rgba(255,215,0,0.35)', 400)
  }

  /** 突破失败 */
  function effectBreakthroughFail(lostExp: number) {
    addBanner(`突破失败`, `损失 ${lostExp} 修为`, 'fail')
    shake(600)
    flash('rgba(255,60,60,0.25)', 300)
  }

  /** 任务完成 */
  function effectTaskDone(taskName: string) {
    addBanner('任务达成', taskName, 'task')
  }

  /** 深渊推进 */
  function effectAbyssClear(layer: number) {
    addBanner('深渊突破', `第${layer}层`, 'info')
  }

  return {
    floats, banners, screenShake, screenFlash,
    addFloat, addBanner, shake, flash,
    floatCultivate, effectBreakthroughSuccess, effectBreakthroughFail,
    effectTaskDone, effectAbyssClear,
  }
})
