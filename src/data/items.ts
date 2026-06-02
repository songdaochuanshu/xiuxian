export interface PlayerProxy {
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  atk: number
  gold: number
}

export interface ItemDef {
  icon: string
  desc: string
  effect: ((p: PlayerProxy) => void) | null
}

export const ITEMS: Record<string, ItemDef> = {
  '疗伤丹': { icon: '疗', desc: '恢复50气血', effect: (p) => { p.hp = Math.min(p.maxHp, p.hp + 50) } },
  '聚灵丹': { icon: '聚', desc: '恢复30灵力', effect: (p) => { p.mp = Math.min(p.maxMp, p.mp + 30) } },
  '蛇胆': { icon: '胆', desc: '永久+2攻击', effect: (p) => { p.atk += 2 } },
  '灵石袋': { icon: '袋', desc: '获得50灵石', effect: (p) => { p.spiritStones += 50 } },
  '筑基丹': { icon: '筑', desc: '突破筑基必备', effect: null },
  '破境丹': { icon: '破', desc: '增加突破概率20%', effect: null },
  '金丹秘药': { icon: '金', desc: '突破金丹必备', effect: null },
  '龙血丹': { icon: '龙', desc: '永久+50气血上限', effect: (p) => { p.maxHp += 50; p.hp += 50 } },
  '大还丹': { icon: '还', desc: '完全恢复气血', effect: (p) => { p.hp = p.maxHp } },
  '回灵散': { icon: '回', desc: '完全恢复灵力', effect: (p) => { p.mp = p.maxMp } },
}

export const TREASURE_POOL: string[] = ['疗伤丹', '聚灵丹', '蛇胆', '灵石袋', '大还丹', '回灵散']
