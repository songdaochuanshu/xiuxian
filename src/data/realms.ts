export interface Realm {
  name: string
  maxExp: number
  hp: number
  mp: number
  atk: number
  def: number
  speed: number
  lifespan: number
  breakthrough_chance?: number
}

const API_URL = import.meta.env.VITE_API_URL || 'https://api.xiuxian.website'

export const REALMS: Realm[] = [
  { name: '炼气期一层', maxExp: 100, hp: 100, mp: 50, atk: 10, def: 5, speed: 1, lifespan: 80 },
  { name: '炼气期二层', maxExp: 200, hp: 150, mp: 80, atk: 15, def: 8, speed: 1.5, lifespan: 85 },
  { name: '炼气期三层', maxExp: 400, hp: 200, mp: 120, atk: 22, def: 12, speed: 2, lifespan: 90 },
  { name: '炼气期四层', maxExp: 800, hp: 280, mp: 170, atk: 30, def: 18, speed: 3, lifespan: 95 },
  { name: '炼气期五层', maxExp: 1500, hp: 380, mp: 240, atk: 40, def: 25, speed: 4, lifespan: 100 },
  { name: '炼气期六层', maxExp: 3000, hp: 500, mp: 330, atk: 55, def: 35, speed: 5, lifespan: 110 },
  { name: '炼气期七层', maxExp: 6000, hp: 650, mp: 450, atk: 75, def: 48, speed: 7, lifespan: 120 },
  { name: '炼气期八层', maxExp: 12000, hp: 850, mp: 600, atk: 100, def: 65, speed: 9, lifespan: 130 },
  { name: '炼气期九层', maxExp: 24000, hp: 1100, mp: 800, atk: 130, def: 85, speed: 12, lifespan: 140 },
  { name: '筑基初期', maxExp: 40000, hp: 1800, mp: 1200, atk: 200, def: 130, speed: 18, lifespan: 200 },
  { name: '筑基中期', maxExp: 65000, hp: 2500, mp: 1800, atk: 280, def: 180, speed: 25, lifespan: 230 },
  { name: '筑基后期', maxExp: 100000, hp: 3500, mp: 2500, atk: 380, def: 250, speed: 35, lifespan: 260 },
  { name: '金丹初期', maxExp: 180000, hp: 5000, mp: 3800, atk: 520, def: 350, speed: 50, lifespan: 350 },
  { name: '金丹中期', maxExp: 320000, hp: 7500, mp: 5500, atk: 720, def: 480, speed: 70, lifespan: 420 },
  { name: '金丹后期', maxExp: 550000, hp: 11000, mp: 8000, atk: 1000, def: 650, speed: 100, lifespan: 500 },
  { name: '元婴初期', maxExp: 1000000, hp: 16000, mp: 12000, atk: 1400, def: 900, speed: 140, lifespan: 650 },
  { name: '元婴中期', maxExp: 2000000, hp: 25000, mp: 18000, atk: 2000, def: 1300, speed: 200, lifespan: 800 },
  { name: '元婴后期', maxExp: 4000000, hp: 40000, mp: 28000, atk: 3000, def: 1900, speed: 300, lifespan: 1000 },
  { name: '化神期', maxExp: 8000000, hp: 65000, mp: 45000, atk: 4500, def: 2800, speed: 450, lifespan: 1500 },
  { name: '炼虚期', maxExp: 18000000, hp: 110000, mp: 80000, atk: 7000, def: 4500, speed: 700, lifespan: 2500 },
  { name: '合体期', maxExp: 40000000, hp: 200000, mp: 150000, atk: 12000, def: 7500, speed: 1100, lifespan: 4000 },
  { name: '大乘期', maxExp: 90000000, hp: 400000, mp: 300000, atk: 22000, def: 14000, speed: 1800, lifespan: 6000 },
  { name: '渡劫期', maxExp: 200000000, hp: 800000, mp: 600000, atk: 45000, def: 28000, speed: 3000, lifespan: 10000 },
  { name: '飞升大圆满', maxExp: 500000000, hp: 2000000, mp: 1500000, atk: 100000, def: 60000, speed: 5000, lifespan: 99999 },
]

let loaded = false

export async function loadRealms(): Promise<Realm[]> {
  try {
    const res = await fetch(`${API_URL}/api/realms`)
    const data = await res.json()
    if (data.realms && data.realms.length > 0) {
      REALMS.length = 0
      for (const r of data.realms) {
        REALMS.push({
          name: r.name,
          maxExp: r.max_exp,
          hp: r.hp,
          mp: r.mp,
          atk: r.atk,
          def: r.def,
          speed: r.speed,
          lifespan: r.lifespan,
          breakthrough_chance: r.breakthrough_chance,
        })
      }
      loaded = true
    }
  } catch (e) {
    console.error('加载境界配置失败，使用默认值:', e)
  }
  return REALMS
}

export function isRealmsLoaded() {
  return loaded
}
