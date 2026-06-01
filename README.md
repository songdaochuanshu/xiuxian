# 🏔️ 凡人修仙传

> 逆天改命 · 证道长生

文字修仙放置游戏，基于 Vue 3 + Vite + Pinia 构建。

**🎮 在线体验：https://xiuxian-rab.pages.dev**

## ✨ 功能

- 🧘 **修炼系统** — 打坐修炼，积累修为
- ⚡ **境界突破** — 炼气→筑基→金丹→元婴，有失败概率
- ⚔️ **战斗系统** — 探索秘境，普攻/灵技/丹药/逃跑
- 🎒 **物品系统** — 丹药、灵石、材料掉落
- 🗺️ **四大秘境** — 苍云山脉、幽冥森林、血魔宗遗址、龙渊秘境
- 💀 **寿元系统** — 年龄增长，寿元耗尽则陨落
- 🏆 **天道排行榜** — GitHub Issues 作为数据库，全服排名
- 💾 **本地持久化** — 刷新不丢失进度

## 🛠️ 技术栈

- [Vue 3](https://vuejs.org/) + [Vite](https://vitejs.dev/)
- [Pinia](https://pinia.vuejs.org/) + pinia-plugin-persistedstate
- GitHub Issues API 作为排行榜数据库

## 🚀 开发

```bash
npm install
npm run dev
```

## 📦 构建

```bash
npm run build
```

## 📝 环境变量

创建 `.env` 文件：

```
VITE_GITHUB_TOKEN=你的GitHub Token
```

用于排行榜读写，需要 `repo` 权限。
