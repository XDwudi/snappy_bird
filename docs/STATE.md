# STATE.md — 项目现状快照（唯一事实源）

> 每次会话开始**先读本文件**。最近更新：2026-09-12 ｜ 当前版本：**v1.2.1**（git main）

## 产品一句话
Flappy Bird 手感 + Vampire Survivors 式 roguelike 成长的微信小游戏，纯 Canvas 渲染（非小程序），基础库 ≥2.25.0，AppID `wxf8eb7f1a872a483e`。

## 已实现系统
| 系统 | 入口文件 | 状态 |
|------|----------|------|
| 核心飞行+管道碰撞 | game/entities/Bird.js, Pipe.js | ✅ 稳定 |
| 经验/升级 | game/systems/ExpSystem.js | ✅ 稳定 |
| 能力系统（28 个能力） | game/systems/AbilitySystem.js + config/AbilityConfig.js | ✅ 稳定 |
| HP/统一护盾/道具 | AbilitySystem + entities/Item.js | ✅ 稳定 |
| 环境系统（风/雨/冰雹） | systems/WeatherSystem.js + weather/*.js | ✅ v1.2.1 修复雨停重力瞬变/教学提示 |
| 凤凰复活 | AbilitySystem + Game.js 内联动画 | ✅ 动画重但曝光率低 |
| 日志 | systems/GameLogger.js | ✅ |
| 存档 | utils/Storage.js | ⚠️ 仅存最高分；金币/皮肤 API 悬空 |
| 音效 | — | ❌ 未实现 |
| 社交分享/排行榜 | — | ❌ 未实现（上线必需） |

## 已知问题（详见 docs/audits/审计_v1.2.0.md）
- ~~P0 三项~~（水平风 1.5%、二段跳窗口、60s 难度停滞）→ **v1.2.1 已修**
- ~~P1 已修~~：风暴之子/狂暴重力 debuff、雨停重力瞬变、冰晶护体满盾白扣 CD（优先级改文档对齐代码，D5/D8）、6 卡牌面板、天气太晚+无教学、无敌期整帧消失、rAF 无兜底 → **v1.2.1 已修**
- **P1 遗留**：Game.js 1897 行 God Object 待拆分（审计 A3，单独排期）
- **P2**：对象池缺失（冰雹场景压力点）；护盾抵挡不掉连击；结算无环境经历统计；新增天气需改 2 处硬编码映射；4 个 core 工具类零引用；Storage 金币/皮肤 API 悬空
- ~~P2 凤凰文案不符~~、~~P2 README 过期~~ → **v1.2.1 已修**

### 游戏性审计新发现（docs/audits/游戏性审计_v1.2.1.md，建议 v1.2.2 平衡版本处理）
- **P0**：N1 连击之心 Lv3 永久无敌；N2 御风者风向箭头与实际受力相反；N3 陷阱卡（顺风/轻羽）主动有害，没胡比裸奔死得快（40.1s vs 84.9s）
- **P1**：N4 时间扭曲遮蔽瞬移；N5 天胡终局缺压（铁壁流 80% 打满 5 分钟）；N6 common 池无梦想卡+无 skip；N7 自愈/护盾/二段跳/风暴之子特效缺失
- **量化基线**：胡/不胡生存差 7.5 倍（健康）；必拿核心=缩小射线/慢速世界/贪婪/坚韧

## 当前迭代焦点
**v1.2.1 修复包已完成**（12 项全部落地，weather/gameplay 模拟回归通过）：首次天气中位 28s、60s 后难度继续爬升至 180s。**待真机手感验证**（预览二维码已生成）后推送并打 tag v1.2.1。

## 下一步候选
- **v1.2.2 平衡性版本**：游戏性审计 N1-N9（连击永动/箭头反向/陷阱卡/终局压力/特效补全）
- **v1.3.0**：移动管道 / 音效系统 / 社交分享（上线必需）；Game.js 拆分（HudRenderer/EffectRenderer 优先）

## 关键索引
- 调参总入口：`game/config/GameConfig.js`；能力数据：`game/config/AbilityConfig.js`
- 主循环/状态机/渲染：`game/core/Game.js`（1897 行，勿全文重读，按方法名检索）
- 完整设计：`docs/开发方案_v1.2.0.md`（定稿版）
- 工作准则：`docs/handbook/开发手册.md`；产品规范：`项目规范.txt`
