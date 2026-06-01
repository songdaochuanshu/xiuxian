# 凡人修仙传 - 完整项目文档

## 一、游戏玩法介绍

### 1.1 核心玩法

**修仙放置类文字游戏**，玩家扮演一名凡人，通过修炼、突破、战斗，一步步走上修仙之路。

### 1.2 修炼系统
- 点击「开始修炼」自动积累修为
- 修为满后可尝试突破境界
- 修炼速度 = 基础速度 × 加速倍率
- 随机事件：偶得灵果、感悟剑意等

### 1.3 境界系统
炼气期一层 → 二层 → ... → 九层 → 筑基期 → 金丹期 → 元婴期（共12个境界）

每个境界提升：
- 气血/灵力上限增加
- 攻击/防御提升
- 寿元增加
- 修炼速度提升

### 1.4 突破系统
- 基础成功率 50%
- 破境丹 +20% 成功率
- 筑基需要筑基丹
- 失败惩罚：损失修为、气血受损
- 10%概率道基受损，修为倒退一层

### 1.5 战斗系统
探索四大秘境：
- 苍云山脉（炼气期）
- 幽冥森林（炼气中期）
- 血魔宗遗址（炼气后期）
- 龙渊秘境（筑基期）

战斗选项：
- 攻击：普通攻击
- 灵技：消耗20灵力，双倍伤害
- 丹药：使用恢复类物品
- 逃跑：60%成功率

### 1.6 物品系统
| 物品 | 效果 | 获取方式 |
|------|------|----------|
| 疗伤丹 | 恢复50气血 | 初始/掉落 |
| 聚灵丹 | 恢复30灵力 | 初始/掉落 |
| 蛇胆 | 永久+2攻击 | 掉落 |
| 灵石袋 | 获得50灵石 | 掉落 |
| 筑基丹 | 突破筑基必备 | 掉落 |
| 破境丹 | 突破概率+20% | 掉落 |
| 龙血丹 | 永久+50气血上限 | 掉落 |

### 1.7 寿元系统
- 每60秒游戏内增长1岁
- 寿元耗尽则Game Over
- 不同境界有不同的寿元上限
- 寿元不足10年时发出警告

### 1.8 商店系统
用灵石购买：
- 道具类：疗伤丹、聚灵丹、大还丹、蛇胆、龙血丹、破境丹、筑基丹
- 技能类：自动突破（500灵石，一次性）
- 特殊类：改名卡（100灵石）

### 1.9 加速系统
用户可购买修炼加速：
- 🚀 2倍速 1小时 - ¥1
- ⚡ 5倍速 1小时 - ¥3
- 🔥 10倍速 1小时 - ¥5
- 💎 永久2倍速 - ¥9.9

支付方式：微信收款码 → 输入兑换码激活

### 1.10 像素小人
页面中间有像素风格小人，根据状态切换动画：
- 待机：微微晃动
- 修炼：盘膝浮空 + 闭眼 + 灵气光环
- 战斗：抖动 + 出拳
- 突破：飞升 + 粒子特效
- 死亡：倒地 + X眼

### 1.11 排行榜
基于GitHub Issues作为数据库的全服排行榜：
- 战力评分 = 境界×1000 + 寿元效率 + 灵石log
- 显示前三名奖牌
- 支持上传自己的修为

### 1.12 用户系统
- 首次进入创建道号
- 自动生成唯一UID（如 XY8A3B2C）
- 每60秒同步数据到云端

---

## 二、后台管理系统

### 2.1 访问方式
`https://域名/admin.html`

### 2.2 功能模块

#### 仪表盘
- 兑换码总数/已使用/未使用
- 玩家数量
- 已付款订单数

#### 兑换码管理
- 在线生成兑换码（选择倍速、时长、数量）
- 查看所有兑换码列表
- 点击兑换码直接复制
- 删除兑换码
- 分页浏览

#### 玩家管理
- 查看所有玩家数据
- 显示：名字、境界、等级、年龄、灵石、加速状态、最后活跃
- 按境界和灵石排序

#### 排行榜管理
- 查看全服排行榜数据
- 显示：排名、名字、境界、战力、年龄、灵石、更新时间

#### 商店管理
- 添加商品（图标、名称、描述、价格、分类、效果）
- 删除商品
- 分类：道具/技能/特殊

#### 游戏配置
- 基础配置：游戏名称、初始气血/灵力/年龄
- 加速套餐价格配置
- 游戏公告内容

---

## 三、技术栈

### 3.1 前端
- **Vue 3** - 渐进式JavaScript框架
- **Vite** - 下一代前端构建工具
- **Pinia** - Vue 状态管理
- **pinia-plugin-persistedstate** - 状态持久化
- **Noto Serif SC** - 中文字体

### 3.2 后端
- **Cloudflare Workers** - Serverless 计算
- **Cloudflare D1** - SQLite 边缘数据库

### 3.3 数据存储
| 数据 | 存储位置 |
|------|----------|
| 玩家本地数据 | localStorage（Pinia持久化） |
| 兑换码 | Cloudflare D1 |
| 玩家云端数据 | Cloudflare D1 |
| 游戏配置 | Cloudflare D1（configs表） |
| 商店商品 | Cloudflare D1（configs表） |
| 排行榜 | GitHub Issues |

### 3.4 API 接口

#### 公开接口
| 路径 | 方法 | 说明 |
|------|------|------|
| `/redeem` | POST | 验证兑换码 |
| `/announcement` | GET | 获取公告 |
| `/player/sync` | POST | 玩家数据同步 |
| `/health` | GET | 健康检查 |

#### 管理接口（需要密码）
| 路径 | 方法 | 说明 |
|------|------|------|
| `/admin/stats` | GET | 统计数据 |
| `/admin/codes` | GET | 兑换码列表 |
| `/admin/codes` | POST | 生成兑换码 |
| `/admin/codes` | DELETE | 删除兑换码 |
| `/admin/players` | GET | 玩家列表 |
| `/admin/orders` | GET | 订单列表 |
| `/admin/config` | GET | 获取配置 |
| `/admin/config` | POST | 保存配置 |
| `/admin/shop` | GET | 商店商品列表 |
| `/admin/shop` | POST | 添加商品 |
| `/admin/shop` | DELETE | 删除商品 |

### 3.5 数据库表结构

```sql
-- 兑换码表
CREATE TABLE codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  multiplier INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  expire_at INTEGER,
  used INTEGER DEFAULT 0,
  used_at INTEGER,
  used_by TEXT,
  created_at INTEGER NOT NULL
);

-- 玩家表
CREATE TABLE players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uid TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  realm TEXT,
  realm_index INTEGER DEFAULT 0,
  age INTEGER DEFAULT 16,
  gold INTEGER DEFAULT 0,
  speed_multiplier INTEGER DEFAULT 1,
  speed_expire_at INTEGER,
  created_at INTEGER NOT NULL,
  last_active INTEGER
);

-- 订单表
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE NOT NULL,
  player_name TEXT,
  product TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  code TEXT,
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);

-- 配置表
CREATE TABLE configs (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER
);
```

### 3.6 项目结构
```
xiuxian/
├── index.html              # 游戏入口
├── admin.html              # 管理后台入口
├── vite.config.js          # Vite 配置
├── package.json
├── worker/                 # Cloudflare Worker
│   ├── src/index.js        # Worker 代码
│   ├── wrangler.toml       # Wrangler 配置
│   ├── schema.sql          # 数据库表结构
│   └── package.json
├── src/
│   ├── main.js             # 游戏入口
│   ├── App.vue             # 游戏主组件
│   ├── assets/style.css    # 全局样式
│   ├── data/
│   │   ├── realms.js       # 境界数据
│   │   ├── enemies.js      # 敌人数据
│   │   └── items.js        # 物品数据
│   ├── stores/
│   │   ├── player.js       # 玩家状态
│   │   ├── game.js         # 游戏状态
│   │   ├── battle.js       # 战斗状态
│   │   └── leaderboard.js  # 排行榜状态
│   ├── components/
│   │   ├── PlayerInfo.vue   # 角色信息
│   │   ├── ActionPanel.vue  # 操作按钮
│   │   ├── ItemBag.vue      # 背包
│   │   ├── GameLog.vue      # 游戏日志
│   │   ├── BattlePanel.vue  # 战斗界面
│   │   ├── BreakthroughOverlay.vue # 突破动画
│   │   ├── Leaderboard.vue  # 排行榜
│   │   ├── PixelCharacter.vue # 像素小人
│   │   ├── SpeedShop.vue    # 加速商店
│   │   ├── Shop.vue         # 修仙商店
│   │   ├── Announcement.vue # 公告
│   │   └── UserProfile.vue  # 用户档案
│   ├── admin/
│   │   ├── main.js          # 管理入口
│   │   ├── App.vue          # 管理主组件
│   │   ├── api.js           # API 接口
│   │   └── components/
│   │       ├── Dashboard.vue    # 仪表盘
│   │       ├── Codes.vue        # 兑换码管理
│   │       ├── Players.vue      # 玩家管理
│   │       ├── Leaderboard.vue  # 排行榜管理
│   │       ├── ShopManage.vue   # 商店管理
│   │       └── Config.vue       # 游戏配置
│   └── services/
│       └── leaderboard.js   # 排行榜API
└── scripts/
    └── gen-code.js          # 兑换码生成器
```

### 3.7 环境变量
| 变量名 | 说明 |
|--------|------|
| `VITE_API_URL` | Worker API 地址 |
| `VITE_GITHUB_TOKEN` | GitHub Token（排行榜用） |

### 3.8 部署方式
- 前端：Cloudflare Pages
- 后端：Cloudflare Workers
- 数据库：Cloudflare D1
- 排行榜：GitHub Issues

### 3.9 兑换码格式
短码格式：`XP-XXXXXXXX`
- X = A(2x) / B(5x) / C(10x)
- P = 永久 / T = 限时
- 后8位 = 随机字符（去掉容易混淆的 I/O/0/1）

示例：
- `AP-XXXXXXXX` = 2倍速永久
- `BT-XXXXXXXX` = 5倍速1小时
- `CP-XXXXXXXX` = 10倍速永久
