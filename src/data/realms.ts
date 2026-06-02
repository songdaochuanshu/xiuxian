export interface Realm {
  name: string
  maxExp: number
  hp: number
  mp: number
  atk: number
  def: number
  speed: number
  lifespan: number
}

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
  { name: '筑基期', maxExp: 50000, hp: 2000, mp: 1500, atk: 250, def: 160, speed: 20, lifespan: 250 },
  { name: '金丹期', maxExp: 200000, hp: 5000, mp: 4000, atk: 600, def: 400, speed: 50, lifespan: 500 },
  { name: '元婴期', maxExp: 1000000, hp: 15000, mp: 12000, atk: 1800, def: 1200, speed: 120, lifespan: 1000 },
]
