# Snappy Bird 🐦

> Roguelike 飞行生存小游戏 · 微信小程序

## 项目简介

Snappy Bird 是一款融合 Flappy Bird 操控手感与 Vampire Survivors 式 roguelike 成长的小程序生存游戏。单指操作，越玩越强，每局都不一样。

## 技术栈

- 微信原生小程序框架
- Canvas 2D 渲染
- 基础库 ≥ 2.25.0

## 快速开始

1. 打开 **微信开发者工具**
2. 选择「导入项目」，项目目录指向本文件夹
3. AppID 可选择「测试号」或填入自己的 AppID
4. 点击确定即可预览运行

## 目录结构

```
Snappy_Bird/
├── app.js                          # 小程序入口
├── app.json                        # 全局配置
├── app.wxss                        # 全局样式
├── project.config.json             # 开发者工具配置
├── sitemap.json                    # 索引配置
│
├── docs/                           # 项目文档
│   └── 开发方案_v1.0.0.md           # 完整开发方案
│
├── game/                           # 游戏引擎核心（纯JS，框架无关）
│   ├── config/
│   │   ├── GameConfig.js           # 全局参数配置（策划调参入口）
│   │   └── AbilityConfig.js        # 15个能力数据定义
│   ├── core/
│   │   ├── Game.js                 # 游戏主类（主循环/状态机/渲染/HUD）
│   │   ├── GameObject.js           # 实体基类
│   │   ├── ObjectPool.js           # 对象池
│   │   ├── EventBus.js             # 事件系统
│   │   └── MathUtil.js             # 数学工具（碰撞/随机/插值）
│   ├── entities/
│   │   ├── Bird.js                 # 小鸟（物理/动画/护盾渲染）
│   │   ├── Pipe.js                 # 管道障碍（碰撞/渲染）
│   │   └── Orb.js                  # 经验球（磁吸/拾取/渲染）
│   ├── systems/
│   │   ├── ExpSystem.js            # 经验与升级系统
│   │   └── AbilitySystem.js        # 能力系统（属性计算/冷却/护盾/复活）
│   └── abilities/
│       └── AbilityRegistry.js      # 能力注册表（加权随机抽取）
│
├── pages/                          # 页面层（WXML + 微信API）
│   ├── index/                      # 主界面
│   └── game/                       # 游戏页面（Canvas + 升级面板 + HUD）
│
├── utils/
│   └── Storage.js                  # 本地存档管理
│
└── .workbuddy/
    └── memory/                     # 项目记忆
```

## 核心参数调优

所有游戏参数集中在 `game/config/GameConfig.js`，策划可直接修改：

| 参数 | 位置 | 默认值 | 说明 |
|------|------|--------|------|
| 重力 | BIRD.GRAVITY | 0.45 | 值越大下落越快 |
| 上升力 | BIRD.FLAP_FORCE | -8.0 | 绝对值越大飞得越高 |
| 最大下落速度 | BIRD.MAX_FALL_SPEED | 12 | 防止下落过快 |
| 管道间隙 | PIPE.GAP | 180 | 值越小越难 |
| 管道间隔 | PIPE.SPAWN_INTERVAL | 90 | 帧（90≈1.5秒） |
| 滚动速度 | GAME.SCROLL_SPEED | 3.0 | 值越大越快 |
| 基础经验 | EXP.BASE_EXP | 20 | Lv1→2 所需经验 |
| 经验增量 | EXP.EXP_INCREMENT | 15 | 每级经验递增量 |

## 能力系统

共 15 个能力，分三大类：

- **被动强化**（6个）：轻羽、顺风、灵巧、磁吸、贪婪、坚韧
- **主动技能**（4个）：时间扭曲、瞬移闪避、护盾爆发、凤凰之翼
- **特殊机制**（5个）：慢速世界、双倍积分、幸运光环、连击之心、缩小射线

能力配置在 `game/config/AbilityConfig.js`，数值效果在 `game/systems/AbilitySystem.js` 的 `getStats()` 中计算。

## 开发里程碑

- [x] **迭代1**：核心飞行 + 管道碰撞（Flappy Bird 完整玩法）
- [x] **迭代2**：经验系统 + Roguelike 能力系统（15能力 + 升级面板）
- [ ] **迭代3**：UI完善 + 难度曲线 + 全量测试

## 版本

当前版本：v0.2.0 (MVP 迭代2)
