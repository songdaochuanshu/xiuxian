export const ENEMIES = [
  { name: '野狼', hp: 40, atk: 8, def: 3, exp: 20, gold: 5, minRealm: 0, drops: [{ item: '疗伤丹', chance: 0.3 }] },
  { name: '毒蛇', hp: 30, atk: 12, def: 2, exp: 25, gold: 8, minRealm: 0, drops: [{ item: '蛇胆', chance: 0.4 }] },
  { name: '山贼', hp: 80, atk: 15, def: 8, exp: 50, gold: 15, minRealm: 1, drops: [{ item: '灵石袋', chance: 0.2 }] },
  { name: '黑熊精', hp: 150, atk: 25, def: 15, exp: 100, gold: 30, minRealm: 2, drops: [{ item: '筑基丹', chance: 0.1 }] },
  { name: '妖狐', hp: 120, atk: 35, def: 10, exp: 120, gold: 40, minRealm: 3, drops: [{ item: '聚灵丹', chance: 0.2 }] },
  { name: '血魔弟子', hp: 250, atk: 45, def: 25, exp: 200, gold: 60, minRealm: 4, drops: [{ item: '破境丹', chance: 0.15 }] },
  { name: '千年树妖', hp: 800, atk: 100, def: 60, exp: 800, gold: 200, minRealm: 9, drops: [{ item: '金丹秘药', chance: 0.1 }] },
  { name: '蛟龙', hp: 1500, atk: 180, def: 120, exp: 2000, gold: 500, minRealm: 9, drops: [{ item: '龙血丹', chance: 0.08 }] },
]

export const SECRET_REALMS = [
  { name: '苍云山脉', minRealm: 0, maxRealm: 4, desc: '灵气稀薄，适合初入修仙界者' },
  { name: '幽冥森林', minRealm: 2, maxRealm: 6, desc: '妖兽出没，危机四伏' },
  { name: '血魔宗遗址', minRealm: 4, maxRealm: 8, desc: '上古遗迹，机缘与危险并存' },
  { name: '龙渊秘境', minRealm: 9, maxRealm: 11, desc: '蛟龙盘踞，非筑基不可入' },
]
