# STATE.md — 项目现状快照（唯一事实源）

> 每次会话开始**先读本文件**。最近更新：2026-09-12 ｜ 当前版本：**v1.2.0**（git main，已推送 origin）

## 产品一句话
Flappy Bird 手感 + Vampire Survivors 式 roguelike 成长的微信小游戏，纯 Canvas 渲染（非小程序），基础库 ≥2.25.0，AppID `wxf8eb7f1a872a483e`。

## 已实现系统
| 系统 | 入口文件 | 状态 |
|------|----------|------|
| 核心飞行+管道碰撞 | game/entities/Bird.js, Pipe.js | ✅ 稳定 |
| 经验/升级 | game/systems/ExpSystem.js | ✅ 稳定 |
| 能力系统（28 个能力） | game/systems/AbilitySystem.js + config/AbilityConfig.js | ✅ 稳定 |
| HP/统一护盾/道具 | AbilitySystem + entities/Item.js | ✅ 稳定 |
| 环境系统（风/雨/冰雹） | systems/WeatherSystem.js + weather/*.js | ⚠️ 刚修复"从未触发"bug，缺真机回归 |
| 凤凰复活 | AbilitySystem + Game.js 内联动画 | ✅ 动画重但曝光率低 |
| 日志 | systems/GameLogger.js | ✅ |
| 存档 | utils/Storage.js | ⚠️ 仅存最高分；金币/皮肤 API 悬空 |
| 音效 | — | ❌ 未实现 |
| 社交分享/排行榜 | — | ❌ 未实现（上线必需） |

## 已知问题（详见 docs/audits/审计_v1.2.0.md）
- **P0**：①水平风玩法影响仅 1.5%（视听脱节）②二段跳触发窗口 2~8 帧人类难触发 ③难度 60s 拉满后不再增长，与 3~10 分钟单局目标矛盾
- **P1**：风暴之子/狂暴"全属性"含重力实为 debuff；雨停重力瞬变；冰晶护体优先级代码与文档相反；6 卡牌面板不可读；天气触发太晚(30s)且雨甩水无教学；无敌期小鸟整帧消失；Game.js 1897 行 God Object 待拆分
- **P2**：对象池缺失（冰雹场景压力点）；凤凰 Lv2 实际复活 3 次与文案不符；护盾抵挡不掉连击；README 停留在 v1.1.0；4 个 core 工具类零引用

## 当前迭代焦点
**待用户评审**：v1.2.1 修复包（P0 三项 + P1 小项），方案见 `docs/iterations/迭代_v1.2.1_修复包.md`

## 下一步候选（v1.3.0）
移动管道 / 音效系统 / 社交分享（方案 v1.2.0 §17 列为 P1 候选）；Game.js 拆分（HudRenderer/EffectRenderer 优先，见审计 A3）

## 关键索引
- 调参总入口：`game/config/GameConfig.js`；能力数据：`game/config/AbilityConfig.js`
- 主循环/状态机/渲染：`game/core/Game.js`（1897 行，勿全文重读，按方法名检索）
- 完整设计：`docs/开发方案_v1.2.0.md`（定稿版）
- 工作准则：`docs/handbook/开发手册.md`；产品规范：`项目规范.txt`
