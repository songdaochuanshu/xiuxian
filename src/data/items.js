export const ITEMS = {
  '疗伤丹': { icon: '🩹', desc: '恢复50气血', effect: (p) => { p.hp = Math.min(p.maxHp, p.hp + 50) } },
  '聚灵丹': { icon: '💎', desc: '恢复30灵力', effect: (p) => { p.mp = Math.min(p.maxMp, p.mp + 30) } },
  '蛇胆': { icon: '🟢', desc: '永久+2攻击', effect: (p) => { p.atk += 2 } },
  '灵石袋': { icon: '💰', desc: '获得50灵石', effect: (p) => { p.gold += 50 } },
  '筑基丹': { icon: '🔶', desc: '突破筑基必备', effect: null },
  '破境丹': { icon: '🌟', desc: '增加突破概率20%', effect: null },
  '金丹秘药': { icon: '🟡', desc: '突破金丹必备', effect: null },
  '龙血丹': { icon: '🐉', desc: '永久+50气血上限', effect: (p) => { p.maxHp += 50; p.hp += 50 } },
  '大还丹': { icon: '❤️‍🔥', desc: '完全恢复气血', effect: (p) => { p.hp = p.maxHp } },
  '回灵散': { icon: '💙', desc: '完全恢复灵力', effect: (p) => { p.mp = p.maxMp } },
}

export const TREASURE_POOL = ['疗伤丹', '聚灵丹', '蛇胆', '灵石袋', '大还丹', '回灵散']
