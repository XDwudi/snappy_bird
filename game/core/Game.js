/**
 * Game.js - 游戏主类 [v1.2.0]
 *
 * 职责：游戏主循环、状态机管理、实体协调、碰撞检测、渲染调度。
 * 集成经验系统、能力系统、经验球、道具系统、HP血条、擦边判定。
 * [v1.1.0] 新增：HP系统、道具系统、安全区适配、结算界面重设计、二段跳。
 * [v1.1.1] 优化：HUD重构(HP/等级/经验条独立显示)、能力视觉特效、随机道具刷新、结算双按钮。
 * [v1.1.2] 优化：系统日志(GameLogger)、弹力护甲平衡修复(有限次数+弹开不传送)、连击之心平衡修复。
 * [v1.1.3] 优化：经验球改为直接获取+文字提示、经验日志、道具前方生成、稀有度概率系统。
 * [v1.1.4] 优化：经验系统统一化(管道经验5→10,删除经验球经验,经验共鸣全经验生效)、浮动文字堆叠渐隐、擦边特效增强(多环+粒子+闪光)、道具图标视觉区分。
 * [v1.1.5] 优化：统一护盾系统(层数机制+视觉区分+弹力护甲改造为弹力护盾)、擦边触发优化(每帧检查+距离25px)、缩小射线间隙增大+管道缩回动画。
 * [v1.2.0] 新增：环境系统(风/雨/冰雹)、6个环境相关能力、凤凰复活动画、动画特效增强。
 * [v1.2.1] 修复：第二段难度缓坡、升级面板6卡两行排布、rAF双缺失setTimeout兜底、天气18s起+教学提示。
 * [v1.2.2] 修复：无敌期不累计combo+护盾消耗断连击(N1)、瞬移优先于时间扭曲(N4)、管道间隔ramp(N5)、
 *           升级面板跳过按钮(N6)、自愈/护盾/二段跳/风暴之子内联特效(N7)、磁吸锁定吸附(B1)、升级保护双保险(B2)。
 * [v1.2.3] 热修复：B2 延迟弹板安全区判定修复（P0：升级弹窗卡死不出现）+ 90帧保底超时强制弹板；
 *           移除 N6 跳过按钮（用户要求）。
 * [v1.3.0] 新增：怪物系统（蝙蝠怪/浮游怪，Obstacle 基类扩展+HP/受击接口）、导弹道具（弱追踪，
 *           怪物优先，可炸毁管道）；修复：管道生成从帧数制改为滚动距离制（减速期密度不变）。
 * [v1.4.0] 能力扩展包批次1（13卡：common×6+uncommon×7）：求生本能(HP=1补盾)、锐利目光(擦边缩碰撞箱)、
 *           拾荒者(击杀掉道具)、补给线(保底道具独立计时)、连击种子(断连保留带硬刹车)、管感(下一管高亮)、
 *           导弹挂架(MAX_ALIVE=3+lv挂钩+扇形多发)、铁喙(无敌帧反杀怪物/Boss免疫预留)、经验银行(溢出存取+
 *           10s生息+HUD小金库)、定风珠(天气过渡期debuff免疫)、镜面护盾(破盾冲击波3s刹车)、
 *           经验潮汐(天气期经验+25%/级)、羽舞(二段跳后擦边窗口+金色尾迹)。
 *           §2.6 受击链按表插入：铁喙(最前置,仅怪物)→护盾消耗(镜面冲击波)→HP扣减→求生本能补盾→凤凰。
 * [v1.4.0] 能力扩展包批次2（14卡：rare×8+epic×6）：火力覆盖(定时自动导弹,独立枪口闪光)、
 *           超载神盾(CD缩短+Lv3溢出转临时HP,HUD空心心形)、猎手标记(导弹加伤+连锁爆炸不二次连锁)、
 *           回响之翼(过管攒羽盾,受击链最前置,HUD羽毛图标)、风暴之眼(并发≥2生效)、蜂群链路(1.5s窗+1叠层硬顶)、
 *           铁羽(羽盾上限+1全局硬顶2层+破盾无敌,无回响灰显)、先知(⭐/🔗/⚠️标注)、
 *           导弹风暴(拾取改连发,刷新不叠加,同屏硬刹车)、风暴驯化(驯化天气+互斥标记)、
 *           血契(maxHp-1换增益,狂暴减半写死)、幻影舞步(90帧黄金窗只刷新不叠加+金色残影)、
 *           顿悟(200%双升每局限3)、时之晶(寄生时间扭曲冻结怪物)。
 *           §2.6 受击链批次2全量：羽盾(最前置)→弹力护盾→护盾层(镜面冲击波)→[冰雹特有:冰晶转化,D8]→
 *           超载溢出临时HP→HP扣减(血契修正)→求生本能→凤凰。
 *           旧卡质变：连击之心Lv3(无敌期过管+5exp)/缩小射线Lv5(间隙封顶+擦边窗口+10)/幸运光环Lv3(面板必含稀有+)。
 * [v1.5.0] 重构：生成决策（管道/道具/怪物的时机、位置、类型roll、保底计时）拆出至 systems/SpawnSystem.js，
 *           本类只保留"把生成结果放进数组"的接线（onSpawn* 回调）；行为逐帧等价，随机数消耗顺序不变。
 * [v1.5.0] 步骤B：章节系统核心（systems/ChapterSystem.js）——章内过管计数（40管/150s兜底触发点占位：
 *           记日志+浮动文字"Boss 逼近！"，Boss 本体步骤 C 接入）、转场演出（白闪→色带擦除→标题卡→60帧无敌，
 *           冻结语义同 UPGRADING）、§4.4 难度修正叠加（_getScrollSpeed/_getGapSize 注入点+SpawnSystem 生成参数，
 *           Ch1 全零修正零变化）、§4.2 章节视觉（背景/地面按 CHAPTERS 参数，Ch2 沙漠几何体元素，
 *           存量管道换色 30 帧 lerp）、HUD 章节进度（"Ch1 · 12/40"，≥35/40 脉冲）；
 *           精英怪（§5.1：金边/体型×1.3/HP×3/经验×5/必掉道具导弹权重×2，生成 roll 在 SpawnSystem）。
 * 框架无关——只依赖 Canvas 2D API，不直接调用微信SDK。
 */

const Config = require('../config/GameConfig.js')
const Bird = require('../entities/Bird.js')
// [v1.5.0] Pipe/Monster/Item 实体构造已随生成决策迁入 systems/SpawnSystem.js；
// Monster 在 Boss 召唤物（§4.8 P2 召唤走 Monster 工厂）处仍需直接构造
const Monster = require('../entities/Monster.js')
const Missile = require('../entities/Missile.js')   // [v1.3.0]
const Boss = require('../entities/Boss.js')         // [v1.5.0] 关底 Boss（Obstacle 子类，变体参数化）
const Feather = require('../entities/Feather.js')   // [v1.5.0] Boss 羽刃弹幕（Hailstone 改水平）
const Orb = require('../entities/Orb.js')
const ExpSystem = require('../systems/ExpSystem.js')
const AbilitySystem = require('../systems/AbilitySystem.js')
const WeatherSystem = require('../systems/WeatherSystem.js')
const SpawnSystem = require('../systems/SpawnSystem.js')   // [v1.5.0] 生成系统（管道/道具/怪物）
const ChapterSystem = require('../systems/ChapterSystem.js') // [v1.5.0] 章节系统（进度/转场/Boss流程/难度修正/视觉参数）
const AbilityRegistry = require('../abilities/AbilityRegistry.js')  // [v1.5.0] 大礼包自选面板 roll
const Logger = require('../systems/GameLogger.js')

// [v1.5.0] 章节祝福池（§4.10：每次过关 3 选 1，本局永久；数值刻意高于一张普通卡）
// 伪能力定义，复用升级面板卡片渲染（_drawCard 只需要 icon/name/rarity/category/effectText）
const BOSS_BLESSINGS = [
  {
    id: 'bless_vitality', name: '活力祝福', icon: '💚', rarity: 'rare', category: 'special',
    desc: '生存向',
    effectText: () => 'HP回满 + 护盾补满 + 临时HP+1（上限+1）'
  },
  {
    id: 'bless_growth', name: '成长祝福', icon: '🌱', rarity: 'rare', category: 'special',
    desc: '滚雪球向',
    effectText: () => '经验获取+25%（本局永久，独立乘区）'
  },
  {
    id: 'bless_hunt', name: '狩猎祝福', icon: '🏹', rarity: 'rare', category: 'special',
    desc: '资源向',
    effectText: () => '道具生成率+8pp（本局永久）+ 立即前方生成3道具'
  }
]

class Game {
  /**
   * @param {Object} canvas - Canvas 节点
   * @param {CanvasRenderingContext2D} ctx - 2D 渲染上下文
   * @param {number} screenW - 逻辑屏幕宽度
   * @param {number} screenH - 逻辑屏幕高度
   * @param {Object} [safeArea] - 安全区 {top, bottom, left, right}
   */
  constructor(canvas, ctx, screenW, screenH, safeArea) {
    this.canvas = canvas
    this.ctx = ctx
    this.screenW = screenW
    this.screenH = screenH

    // [v1.1.0] 安全区适配
    // safeArea.top/bottom 是 Y 坐标（从屏幕顶部算起）
    this.safeTop = (safeArea && safeArea.top != null) ? safeArea.top : Config.GAME.SAFE_AREA_TOP
    this.safeBottom = (safeArea && safeArea.bottom != null) ?
      safeArea.bottom : this.screenH - Config.GAME.SAFE_AREA_BOTTOM

    // 游戏状态
    this.state = Config.GAME.STATE.READY
    this.score = 0
    this.bestScore = 0

    // 实体
    this.bird = null
    this.pipes = []
    this.monsters = []            // [v1.3.0] 怪物列表（与 pipes 平行数组）
    this.missiles = []            // [v1.3.0] 导弹列表
    this.orbs = []
    this.items = []               // [v1.1.0] 道具列表
    this.clouds = []
    this.nearMissEffects = []
    this.floatingTexts = []       // [v1.1.0] 浮动文字（道具拾取提示）
    this.abilityEffects = []      // [v1.2.2] N7 能力内联特效粒子（自愈十字/护盾环/二段跳尾迹） [v1.3.0] 复用作爆炸粒子

    // 系统
    this.expSystem = new ExpSystem()
    this.abilitySystem = new AbilitySystem()
    this.weatherSystem = new WeatherSystem()   // [v1.2.0] 环境系统

    // [v1.5.0] 生成系统：管道/道具/怪物的生成决策（时机/位置/类型roll/保底计时）。
    // Game 只保留"把生成结果放进数组"的接线（onSpawn* 回调）。
    // 状态 _distanceSinceSpawn/_monsterDistance/itemSpawnTimer/supplyLineTimer 已迁入 SpawnSystem。
    const self = this
    this.spawnSystem = new SpawnSystem({
      screenW: this.screenW,
      screenH: this.screenH,
      getGameTime: function () { return self.gameTime },
      getStats: function () { return self.abilitySystem.getStats() },
      getGapSize: function () { return self._getGapSize() },
      getOwnedLevel: function (id) { return self.abilitySystem.owned.get(id) || 0 },
      getPipes: function () { return self.pipes },
      getMonsterCount: function () { return self.monsters.length },
      onSpawnPipe: function (pipe) {
        // [v1.5.0] 章节换色（§4.2）：新管直接给当前章色（Ch1 返回 null=默认色，零变化）
        const cs = self.chapterSystem ? self.chapterSystem.getPipeColorSet() : null
        if (cs) pipe.setColorSet(cs)
        self.pipes.push(pipe)
      },
      onSpawnMonster: function (monster) { self.monsters.push(monster) },
      onSpawnItem: function (item) { self.items.push(item) }
    })

    // [v1.5.0] 章节系统（步骤 B：进度计数/转场演出/难度修正注入/视觉参数出口；
    // 步骤 C：Boss 全流程——出场演出 deps.spawnBoss、天气冻结、章节进/出钩子）。
    // 依赖全部经回调注入，ChapterSystem 不反查 Game 内部状态；默认 Ch1 全零修正、零随机消耗。
    this.chapterSystem = new ChapterSystem({
      screenW: this.screenW,
      screenH: this.screenH,
      getGameTime: function () { return self.gameTime },
      addFloatingText: function (x, y, text, color, life) { self._addFloatingText(x, y, text, color, life) },
      setSpawnMods: function (mods) { self.spawnSystem.setChapterModifiers(mods) },
      setBossActive: function (active) { self.spawnSystem.setBossActive(active) },
      grantInvincible: function (frames) {
        // §4.3 转场收尾：60 帧无敌恢复飞行（语义同 B2-② 恢复保护）
        self.abilitySystem.invincibleFrames = Math.max(self.abilitySystem.invincibleFrames, frames)
        self.bird.invincibleBlink = Math.max(self.bird.invincibleBlink, 30)
      },
      // [v1.5.0 步骤C] §4.7 Boss 战天气计时冻结（生效中天气保持当前强度）
      setWeatherFrozen: function (f) { self.weatherSystem.setFrozen(f) },
      // [v1.5.0 步骤C] 出场演出 enter 阶段：创建 Boss 实体（右侧飞入）
      spawnBoss: function () { self._spawnBoss() },
      // [v1.5.0 步骤C] 本章终结钩子（回响消散）与进新章钩子（旅者/回响/章节之主）
      onChapterEnd: function () { self._onChapterEnd() },
      onChapterEnter: function (toIndex) { self._onChapterEnter(toIndex) }
    })

    // [v1.5.0 步骤C] Boss 战状态
    this.boss = null               // Boss 实体（出场演出 enter 阶段创建，死亡演出后/离场出屏后清空）
    this.feathers = []             // Boss 羽刃弹幕列表
    this._bossDyingFrames = 0      // 死亡演出慢动作剩余帧（§4.11：30 帧 0.5×，复用速度包）
    this._bossRewardPending = false // 大礼包结算中（面板链：自选卡→祝福→经验升级→转场）
    this.bossBadges = []           // 本局已击败 Boss 徽章（章节 id，结算界面徽章行）
    this._panelMode = 'levelup'    // 面板模式：'levelup' | 'bossCard'（大礼包自选）| 'blessing'（祝福三选一）
    this._echoBoost = null         // R9 章节回响：{ id, from, to }（本章临时等级，章末按增量还原）

    // 计时器
    this.gameTime = 0
    this.frameCount = 0
    this.survivalTimer = 0
    this.pipesPassed = 0          // [v1.1.0] 通过管道计数

    // 地面滚动偏移
    this.groundOffset = 0

    // 屏幕震动
    this.shakeFrames = 0
    this.shakeIntensity = 0

    // [v1.1.0] 受击红屏
    this.damageFlash = 0

    // [v1.2.0] 凤凰复活动画状态
    this.phoenixAnim = null     // null | { phase: 'pause'|'revive', timer: N, maxTimer: N }

    // [v1.2.1] 教学提示标记（每局只提示一次）
    this._shieldHintShown = false  // "护盾可挡1次碰撞"
    this._ironBeakHintShown = false // [v1.4.0] 铁喙"无敌中，撞怪反击！"

    // [v1.4.0] 怪物击杀计数（§6.3 火力流击杀指标统计用）
    this.monsterKills = 0

    // [v1.4.0] 天气活跃状态跟踪（经验潮汐"潮汐退去"提示用）
    this._prevWeatherActive = false

    // [v1.2.0] 环境属性修饰器（每帧由WeatherSystem更新）
    this._weatherGravityBonus = 0
    this._weatherWindScroll = 0

    // 回调
    this.onScoreChange = null
    this.onGameOver = null
    this.onReady = null
    this.onExpChange = null
    this.onLevelUp = null

    // 动画
    this.rafId = null
    this.running = false

    // 升级选项缓存
    this._currentChoices = null
    // [v1.2.3] B2-③ 延迟弹板计时（帧）：pendingLevelUps>0 且未进安全区时累计，超 MAX_DELAY_FRAMES 强制弹板
    this._upgradeDelayFrames = 0

    this._init()
  }

  // ==================== 初始化 ====================

  _init() {
    const birdX = this.screenW * Config.BIRD.X_RATIO
    const birdY = this.screenH * 0.45
    this.bird = new Bird(birdX, birdY)
    this._initClouds()
  }

  _initClouds() {
    this.clouds = []
    for (let i = 0; i < Config.CLOUD.COUNT; i++) {
      this.clouds.push(this._createCloud(Math.random() * this.screenW))
    }
  }

  _createCloud(x) {
    const { CLOUD } = Config
    return {
      x: x,
      y: CLOUD.MIN_Y + Math.random() * (this.screenH * CLOUD.MAX_Y_RATIO - CLOUD.MIN_Y),
      size: CLOUD.MIN_SIZE + Math.random() * (CLOUD.MAX_SIZE - CLOUD.MIN_SIZE),
      speed: CLOUD.MIN_SPEED + Math.random() * (CLOUD.MAX_SPEED - CLOUD.MIN_SPEED)
    }
  }

  // ==================== 游戏控制 ====================

  start() {
    Logger.info('Game', '游戏开始', { screenW: this.screenW, screenH: this.screenH })
    this.state = Config.GAME.STATE.PLAYING
    this.score = 0
    this.gameTime = 0
    this.spawnSystem.reset()      // [v1.5.0] 生成计时状态（管道/怪物距离、道具/补给线计时器）统一由 SpawnSystem 重置
    this.frameCount = 0
    this.survivalTimer = 0
    this.pipesPassed = 0
    this.pipes = []
    this.monsters = []            // [v1.3.0]
    this.missiles = []            // [v1.3.0]
    this.orbs = []
    this.items = []
    this.nearMissEffects = []
    this.floatingTexts = []
    this.abilityEffects = []      // [v1.2.2] N7
    this._upgradeDelayFrames = 0  // [v1.2.3] B2-③ 重开时清零延迟计时，防状态泄漏
    this.shakeFrames = 0
    this.damageFlash = 0
    this.phoenixAnim = null       // [v1.2.0] 重置凤凰动画
    this._shieldHintShown = false // [v1.2.1] 重置教学提示
    this._ironBeakHintShown = false // [v1.4.0] 重置铁喙教学提示
    this._prevWeatherActive = false // [v1.4.0] 经验潮汐提示跟踪
    this.monsterKills = 0         // [v1.4.0] 怪物击杀计数
    // [v1.5.0 步骤C] Boss 战状态清零
    this.boss = null
    this.feathers = []
    this._bossDyingFrames = 0
    this._bossRewardPending = false
    this.bossBadges = []
    this._panelMode = 'levelup'
    this._echoBoost = null

    this.expSystem.reset()
    this.abilitySystem.reset()
    this.weatherSystem.reset()    // [v1.2.0] 环境系统重置
    this.chapterSystem.reset()    // [v1.5.0] 章节系统重置（回 Ch1，生成修正清零）

    const birdX = this.screenW * Config.BIRD.X_RATIO
    const birdY = this.screenH * 0.45
    this.bird.reset(birdX, birdY)

    if (this.onScoreChange) this.onScoreChange(this.score)
    if (this.onExpChange) this.onExpChange(this.expSystem.getExpBarData())
  }

  flap() {
    if (this.state === Config.GAME.STATE.PLAYING) {
      // [v1.1.0] 二段跳检测：快速双击时触发
      if (this.abilitySystem.tryDoubleJump(this.frameCount)) {
        this.bird.doubleJump()
        this._spawnDoubleJumpTrail()  // [v1.2.2] N7 二段跳白色尾迹粒子
        // [v1.4.0] 羽舞：二段跳后 3s 擦边窗口 +8px/级（不改二段跳位移参数，手感原则）
        if ((this.abilitySystem.owned.get('feather_dance') || 0) > 0) {
          this.abilitySystem.featherDanceFrames = Config.ABILITY.FEATHER_DANCE_FRAMES
        }
      } else {
        this.bird.flap()
      }
      // [v1.2.0] 通知环境系统拍翅事件（雨效果甩水）
      this.weatherSystem.onFlap()
    } else if (this.state === Config.GAME.STATE.READY) {
      this.start()
      this.bird.flap()
    }
  }

  restart() {
    this.start()
  }

  backToReady() {
    Logger.info('Game', '返回首页')
    this.state = Config.GAME.STATE.READY
    this.score = 0
    this.pipes = []
    this.monsters = []            // [v1.3.0]
    this.missiles = []            // [v1.3.0]
    this.spawnSystem.reset()      // [v1.5.0] 生成计时状态统一由 SpawnSystem 重置
    this.orbs = []
    this.items = []
    this.nearMissEffects = []
    this.floatingTexts = []
    this.abilityEffects = []      // [v1.2.2] N7
    this._upgradeDelayFrames = 0  // [v1.2.3] B2-③ 重开时清零延迟计时，防状态泄漏
    this.shakeFrames = 0
    this.damageFlash = 0
    this.phoenixAnim = null       // [v1.2.0] 重置凤凰动画
    this._shieldHintShown = false // [v1.2.1] 重置教学提示
    this._ironBeakHintShown = false // [v1.4.0]
    this._prevWeatherActive = false // [v1.4.0] 经验潮汐提示跟踪
    this.monsterKills = 0         // [v1.4.0] 怪物击杀计数
    // [v1.5.0 步骤C] Boss 战状态清零
    this.boss = null
    this.feathers = []
    this._bossDyingFrames = 0
    this._bossRewardPending = false
    this.bossBadges = []
    this._panelMode = 'levelup'
    this._echoBoost = null

    this.expSystem.reset()
    this.abilitySystem.reset()
    this.weatherSystem.reset()    // [v1.2.0] 环境系统重置
    this.chapterSystem.reset()    // [v1.5.0] 章节系统重置（回 Ch1）

    const birdX = this.screenW * Config.BIRD.X_RATIO
    const birdY = this.screenH * 0.45
    this.bird.reset(birdX, birdY)

    if (this.onReady) this.onReady()
    if (this.onExpChange) this.onExpChange(this.expSystem.getExpBarData())
  }

  // ==================== 升级流程 ====================

  _triggerLevelUp() {
    Logger.info('LevelUp', '触发升级', { level: this.expSystem.level, pending: this.expSystem.pendingLevelUps })
    this.state = Config.GAME.STATE.UPGRADING
    const choices = this.abilitySystem.getChoices(this.expSystem.level)  // [v1.1.3] 传入玩家等级影响稀有度概率

    if (choices.length === 0) {
      this.abilitySystem.selectAllBuff()
      this.abilitySystem.invalidateStats()
      this.expSystem.consumeLevelUp()
      this._afterUpgrade()
    } else {
      this._currentChoices = choices
      if (this.onLevelUp) {
        this.onLevelUp(choices, this.expSystem.level, this.abilitySystem.getOwnedList())
      }
    }
  }

  selectAbility(abilityId) {
    Logger.info('LevelUp', '选择能力', { id: abilityId, panelMode: this._panelMode,
      currentLevel: this.abilitySystem.owned.get(abilityId) || 0 })

    // [v1.5.0] 面板路由：祝福面板（伪能力，直接生效不消耗升级次数）
    if (this._panelMode === 'blessing') {
      this._applyBlessing(abilityId)
      this._currentChoices = null
      this._panelMode = 'levelup'
      // 祝福后接大礼包经验升级面板链（无 pending 则 _afterUpgrade 内收尾）
      if (this.expSystem.hasPendingLevelUp()) {
        this._triggerLevelUp()
      } else {
        this._afterUpgrade()
      }
      return
    }

    this.abilitySystem.selectAbility(abilityId)
    this.abilitySystem.invalidateStats()

    // [v1.4.0] 经验银行：同步银行开关与生息率到 ExpSystem
    this.expSystem.configureBank(this.abilitySystem.owned.get('exp_bank') || 0)

    // [v1.4.0] 顿悟：同步开关到 ExpSystem
    this.expSystem.configureEnlighten(this.abilitySystem.owned.get('enlightenment') || 0)

    // [v1.4.0] 风暴驯化：获得时驯化当前天气（并发取最早触发者）；无天气则等下一种（命运感，不给挑）
    if (abilityId === 'chaos_dice') {
      this._applyChaosDiceTaming()
    }

    // [v1.4.0] 铁喙出场教学浮动文字（只提示一次）
    if (abilityId === 'iron_beak' && !this._ironBeakHintShown) {
      this._ironBeakHintShown = true
      this._addFloatingText(this.bird.x, this.bird.y - 45, '无敌中，撞怪反击！', '#ffaa00', 90)
    }

    // [v1.5.0] 面板路由：大礼包自选面板（真实获得走上方全副作用链，但不消耗经验升级次数，选完接祝福面板）
    if (this._panelMode === 'bossCard') {
      this._currentChoices = null
      this._openBlessingPanel()
      return
    }

    this.expSystem.consumeLevelUp()
    this._currentChoices = null
    this._afterUpgrade()
  }

  _afterUpgrade() {
    if (this.expSystem.hasPendingLevelUp()) {
      this._triggerLevelUp()
      return
    }
    // [v1.5.0] 大礼包面板链收尾（经验升级链耗尽后才转场）
    if (this._bossRewardPending) {
      this._finishBossRewards()
      return
    }
    // [v1.2.2] B2-② 恢复保护：面板关闭后给短暂无敌+垂直速度清零，防止"选完即撞"
    this.abilitySystem.invincibleFrames = Math.max(
      this.abilitySystem.invincibleFrames, Config.UPGRADE.RESUME_INVINCIBLE_FRAMES
    )
    this.bird.invincibleBlink = Math.max(this.bird.invincibleBlink, 30)
    this.bird.velocity = 0
    this.state = Config.GAME.STATE.PLAYING
    if (this.onExpChange) {
      this.onExpChange(this.expSystem.getExpBarData())
    }
  }

  // ==================== 主循环 ====================

  /**
   * [v1.4.0] 风暴驯化（chaos_dice）：获得时驯化当前天气；无天气活跃则置 tamedPending 等下一种
   * 并发时取最早触发的效果（activeEffects[0]，确定性，不用随机——保留史诗命运感但不引入额外随机源）
   */
  _applyChaosDiceTaming() {
    const ws = this.weatherSystem
    if (ws.tamedWeather) return  // maxLevel=1，理论不会二次获得，防御
    if (ws.activeEffects.length > 0) {
      ws.tamedWeather = ws.activeEffects[0].type
      const tamedNames = { wind: '风', rain: '雨', hail: '冰雹' }
      this._addFloatingText(this.screenW / 2, this.screenH * 0.3,
        `风暴驯化：${tamedNames[ws.tamedWeather] || ws.tamedWeather}!`, '#7fff7f', 90)
      Logger.info('Weather', '风暴驯化生效', { type: ws.tamedWeather })
    } else {
      ws.tamedPending = true
      this._addFloatingText(this.screenW / 2, this.screenH * 0.3, '风暴驯化：等待下一种天气…', '#7fff7f', 90)
      Logger.info('Weather', '风暴驯化挂起（当前无天气）')
    }
  }

  loop() {
    if (this.running) return
    this.running = true
    this._tick()
  }

  _tick() {
    if (!this.running) return
    try {
      this.update()
      this.render()
    } catch (e) {
      console.error('[Game] 游戏循环异常:', e)
      Logger.error('Game', '游戏循环异常', { msg: e.message, stack: e.stack })
    }
    if (typeof this.canvas.requestAnimationFrame === 'function') {
      this.rafId = this.canvas.requestAnimationFrame(() => this._tick())
    } else if (typeof requestAnimationFrame === 'function') {
      this.rafId = requestAnimationFrame(() => this._tick())
    } else {
      // [v1.2.1] rAF双缺失兜底：setTimeout(~60fps)维持循环，避免静默终止
      if (!this._rafFallbackWarned) {
        this._rafFallbackWarned = true
        Logger.warn('Game', 'requestAnimationFrame不可用，改用setTimeout(16ms)兜底')
      }
      this.rafId = setTimeout(() => this._tick(), 16)
    }
  }

  destroy() {
    this.running = false
    if (this.rafId) {
      if (typeof this.canvas.cancelAnimationFrame === 'function') {
        this.canvas.cancelAnimationFrame(this.rafId)
      } else if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.rafId)
      } else {
        clearTimeout(this.rafId)  // [v1.2.1] 兜底计时器清理
      }
      this.rafId = null
    }
  }

  // ==================== 更新逻辑 ====================

  update() {
    this.frameCount++
    Logger.setFrame(this.frameCount)  // [v1.1.2] 更新日志帧计数

    if (this.shakeFrames > 0) this.shakeFrames--
    if (this.damageFlash > 0) this.damageFlash--

    this._updateNearMissEffects()
    this._updateFloatingTexts()   // [v1.1.0] 浮动文字
    this._updateAbilityEffects()  // [v1.2.2] N7 能力内联特效

    // [v1.2.0] 凤凰复活动画更新
    if (this.phoenixAnim) {
      this._updatePhoenixAnim()
      return  // 动画期间暂停其他更新
    }

    if (this.state === Config.GAME.STATE.GAME_OVER) return
    if (this.state === Config.GAME.STATE.UPGRADING) return

    // [v1.5.0] 章节转场（§4.3）：UPGRADING 同款暂停语义——世界冻结
    // （gameTime/实体/生成/碰撞全停），只推进转场计时与存量管道换色 lerp
    if (this.chapterSystem.isTransitioning()) {
      this.chapterSystem.updateTransition()
      this._applyChapterPipeColors()  // 换色 lerp 在冻结期照常推进（30 帧播完）
      return
    }

    // [v1.5.0 步骤C] Boss 出场演出（§4.11：暗角收拢30→雷云聚集60→飞入60）：
    // 同款世界冻结；enter 阶段 Boss 实体飞入动画在冻结期推进（纯演出，无碰撞判定）
    if (this.chapterSystem.isBossIntro()) {
      this.chapterSystem.updateBossIntro()
      this._applyChapterPipeColors()
      if (this.boss) this.boss.update(this.bird)
      return
    }

    this._updateClouds()
    this.groundOffset = (this.groundOffset + Config.GAME.SCROLL_SPEED) % Config.GROUND.SCROLL_TILE

    if (this.state === Config.GAME.STATE.READY) {
      this.bird.updateHover(this.frameCount)
      return
    }

    if (this.state !== Config.GAME.STATE.PLAYING) return

    this.gameTime++

    // [v1.2.0] 环境属性修饰器重置
    this._weatherGravityBonus = 0
    this._weatherWindScroll = 0

    // [v1.2.0] 环境系统更新
    const gameCtx = this._buildGameCtx()
    this.weatherSystem.update(this.gameTime, gameCtx)

    // [v1.2.0] 环境系统可能触发游戏结束或凤凰复活，需检查状态
    if (this.state !== Config.GAME.STATE.PLAYING || this.phoenixAnim) return

    // 读取环境系统输出的属性修饰
    this._weatherGravityBonus = gameCtx.gravityModifier
    this._weatherWindScroll = gameCtx.windScrollModifier
    if (gameCtx.damageFlash > 0) this.damageFlash = gameCtx.damageFlash
    if (gameCtx.shakeFrames > 0) {
      this.shakeFrames = gameCtx.shakeFrames
      this.shakeIntensity = gameCtx.shakeIntensity
    }

    // [v1.2.0] 通知能力系统环境活跃状态
    const weatherActiveNow = this.weatherSystem.activeEffects.length > 0
    this.abilitySystem.setWeatherActive(weatherActiveNow)
    // [v1.4.0] 风暴之眼：同步天气并发数（≥2 时 debuff 缩放+经验倍率在 getStats/getWeatherDebuffScale 结算）
    this.abilitySystem.setWeatherConcurrent(this.weatherSystem.activeEffects.length)
    // [v1.4.0] 经验潮汐：天气结束后浮动文字"潮汐退去"提示（N7 静默教训）
    if (!weatherActiveNow && this._prevWeatherActive &&
        (this.abilitySystem.owned.get('exp_tide') || 0) > 0) {
      this._addFloatingText(this.bird.x, this.bird.y - 35, '潮汐退去', '#7eb8e0', 50)
    }
    this._prevWeatherActive = weatherActiveNow

    // 能力系统更新
    this.abilitySystem.tickCooldowns()
    this._applyAbilityStatsToBird()
    this._drainAbilityFx()        // [v1.2.2] N7 取出能力系统的特效事件

    // [v1.2.1] 首次获得护盾教学提示（道具/能力/冰晶护体等所有来源统一覆盖，每局只提示一次）
    if (!this._shieldHintShown && this.abilitySystem.shieldLayers > 0) {
      this._shieldHintShown = true
      this._addFloatingText(this.bird.x, this.bird.y - 45, '护盾可挡1次碰撞', '#3498db', 90)
    }

    // [v1.2.0] 应用环境重力加成（雨效果）
    if (this._weatherGravityBonus > 0) {
      this.bird.gravity = Config.BIRD.GRAVITY * this.abilitySystem.getStat('gravityMultiplier') * (1 + this._weatherGravityBonus)
    }

    // 小鸟物理
    this.bird.update()

    // 滚动速度（含能力修饰 + 速度包减速）——[v1.3.0] 提前计算，生成节奏改按滚动距离
    const scrollSpeed = this._getScrollSpeed()

    // [v1.5.0] 生成决策统一入口：管道（距离制）→ 怪物（45s保护+距离节奏）→ 随机道具计时 → 补给线保底。
    // 调用顺序与原四处散点完全一致，随机数消耗顺序不变；实体经 onSpawn* 回调回到 Game 数组。
    this.spawnSystem.update(scrollSpeed)

    // [v1.5.0] 章节进度推进（章内计时/150s 兜底触发点）+ 存量管道换色 lerp（§4.3，30帧）
    this.chapterSystem.update()
    this._applyChapterPipeColors()

    // [v1.4.0] 经验银行生息：对齐天气 10s 检查节奏（WEATHER.CHECK_INTERVAL），不新增逐帧计时器
    if (this.expSystem.bankEnabled && this.gameTime % Config.WEATHER.CHECK_INTERVAL === 0) {
      const interest = this.expSystem.tickBankInterest()
      if (interest > 0) {
        this._addFloatingText(this.bird.x, this.bird.y - 35, `银行生息 +${interest}`, '#ffd700', 45)
      }
    }

    // [v1.4.0] 羽舞：buff 期间小鸟尾迹变金色（复用二段跳尾迹粒子通道）
    if (this.abilitySystem.featherDanceFrames > 0 && this.frameCount % 3 === 0) {
      this.abilityEffects.push({
        kind: 'dot',
        x: this.bird.x - 10,
        y: this.bird.y + 4,
        vx: -1 - Math.random() * 0.5,
        vy: 0.3 + Math.random() * 0.5,
        life: 18,
        maxLife: 18,
        size: 2,
        color: '255, 215, 0'  // 金色
      })
    }

    // [v1.4.0] 幻影舞步：黄金窗口期小鸟金色残影（视觉承诺必须兑现，N7 教训）——比羽舞更亮更密
    if (this.abilitySystem.phantomWindowFrames > 0 && this.frameCount % 2 === 0) {
      this.abilityEffects.push({
        kind: 'dot',
        x: this.bird.x - 8 - Math.random() * 6,
        y: this.bird.y + (Math.random() - 0.5) * 10,
        vx: -0.8 - Math.random() * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        life: 22,
        maxLife: 22,
        size: 2.5,
        color: '255, 240, 150'  // 亮金残影
      })
    }

    // 主动技能预判
    this._checkActiveAbilities()

    // 管道更新与碰撞
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const pipe = this.pipes[i]
      pipe.update(scrollSpeed)

      if (pipe.isOffscreen()) {
        this.pipes.splice(i, 1)
        continue
      }

      if (pipe.checkCollision(this.bird)) {
        if (this._handleCollision(pipe)) return
        continue
      }

      // [v1.1.5] 擦边检测：每帧检查（小鸟在管道x范围内时），不再只在通过后检查
      if (!pipe.nearMissTriggered) {
        const birdRight = this.bird.x + this.bird.collisionWidth / 2
        const birdLeft = this.bird.x - this.bird.collisionWidth / 2
        if (birdRight > pipe.x && birdLeft < pipe.x + pipe.width) {
          this._checkNearMiss(pipe)
        }
      }

      if (!pipe.passed && pipe.x + pipe.width < this.bird.x - this.bird.collisionWidth / 2) {
        pipe.passed = true
        this._onPipePass(pipe)
      }
    }

    // 经验球更新
    const attractRange = this.abilitySystem.getStat('orbAttractRange')
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i]
      orb.update(scrollSpeed, this.bird, attractRange)

      if (orb.checkCollect(this.bird)) {
        this._collectOrb()
        this.orbs.splice(i, 1)
        continue
      }

      if (orb.isOffscreen()) {
        this.orbs.splice(i, 1)
      }
    }

    // [v1.1.0] 道具更新
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i]
      item.update(scrollSpeed, this.bird, attractRange)

      if (item.checkCollect(this.bird)) {
        this._collectItem(item)
        this.items.splice(i, 1)
        continue
      }

      if (item.isOffscreen()) {
        this.items.splice(i, 1)
      }
    }

    // [v1.3.0] 怪物更新与碰撞（受击链与管道同级）
    if (this._updateMonsters(scrollSpeed)) return

    // [v1.5.0 步骤C] Boss 与羽刃弹幕更新（出场/战斗/死亡演出/战败离场全流程）
    if (this._updateBossFight()) return

    // [v1.3.0] 导弹更新与命中
    this._updateMissiles(scrollSpeed)

    // 地面碰撞
    const groundY = this.screenH - Config.GROUND.HEIGHT
    if (this.bird.y + this.bird.collisionHeight / 2 >= groundY) {
      this.bird.y = groundY - this.bird.collisionHeight / 2
      this.bird.velocity = -3  // [v1.1.0] 小弹起防止持续碰撞
      if (this._handleCollision()) return
    }
    // 天花板碰撞
    if (this.bird.y - this.bird.collisionHeight / 2 <= 0) {
      this.bird.y = this.bird.collisionHeight / 2
      this.bird.velocity = 0
      if (this._handleCollision()) return
    }

    // 存活时间得分
    this.survivalTimer++
    if (this.survivalTimer >= Config.EXP.SCORE_SURVIVAL_INTERVAL) {
      this.survivalTimer = 0
      this.score += 1
      if (this.onScoreChange) this.onScoreChange(this.score)
    }

    // 升级检查
    if (this.expSystem.hasPendingLevelUp()) {
      // [v1.2.2] B2-① 延后弹板：等小鸟飞出管道间隙再进UPGRADING，避免"过管瞬间弹板、关板即撞下一管"
      // [v1.2.3] B2-③ 保底超时：安全区迟迟不满足时累计延迟帧，超 MAX_DELAY_FRAMES(90帧=1.5s) 强制弹板，
      //           保证任何情况下升级弹窗必出现（v1.2.2 线上 P0：安全区恒不成立导致弹窗卡死）
      this._upgradeDelayFrames++
      if (this._isUpgradeSafeZone() || this._upgradeDelayFrames >= Config.UPGRADE.MAX_DELAY_FRAMES) {
        if (this._upgradeDelayFrames >= Config.UPGRADE.MAX_DELAY_FRAMES && !this._isUpgradeSafeZone()) {
          Logger.warn('LevelUp', '延迟弹板超时，强制弹出', { delayFrames: this._upgradeDelayFrames })
        }
        this._upgradeDelayFrames = 0
        this._triggerLevelUp()
      }
    } else {
      this._upgradeDelayFrames = 0  // [v1.2.3] 无待处理升级时清零，防标志位泄漏
    }
  }

  /**
   * [v1.5.0] 存量管道换色应用（§4.3）：lerp 中逐帧插值，到位后维持章节色。
   * Ch1 默认路径 getPipeColorSet() 返回 null，不触碰任何管道，零变化。
   * 正常 update 与转场冻结期都会调用（换色 lerp 在冻结期照常播完）。
   */
  _applyChapterPipeColors() {
    const pipeColorSet = this.chapterSystem.getPipeColorSet()
    if (!pipeColorSet) return
    for (const p of this.pipes) p.setColorSet(pipeColorSet)
  }

  /**
   * [v1.2.2] B2-① 判断当前是否处于安全区（小鸟不在任何管道间隙中）
   * [v1.2.3] 修复：只判定与小鸟横向区间相交（含安全边距）的管道。
   * v1.2.2 要求小鸟越过"所有"管道的右边缘，但小鸟 x 坐标固定、管道持续从屏幕右侧生成，
   * 前方永远存在尚未到达的管道，安全区恒不成立 → 升级弹窗卡死不出现（线上 P0）。
   * 现改为：仅当小鸟正在穿越某管道（横向区间相交±边距）时视为不安全；
   * 前方远处的管道不参与判定（弹出后面板冻结+关板45帧无敌已覆盖该风险）。
   * @returns {boolean}
   */
  _isUpgradeSafeZone() {
    const margin = Config.UPGRADE.SAFE_MARGIN_PX
    const birdLeft = this.bird.x - this.bird.collisionWidth / 2
    const birdRight = this.bird.x + this.bird.collisionWidth / 2
    for (const pipe of this.pipes) {
      // 管道横向区间 [pipe.x, pipe.x+width] 与小鸟区间（±安全边距）相交 → 小鸟在间隙中，不安全
      if (pipe.x + pipe.width + margin > birdLeft && pipe.x - margin < birdRight) return false
    }
    return true
  }

  // [v1.5.0] 管道生成间隔 ramp（原 _getSpawnDistance）已迁入 systems/SpawnSystem.js → getSpawnDistance()

  _updateClouds() {
    for (const cloud of this.clouds) {
      cloud.x -= cloud.speed
      if (cloud.x + cloud.size < -20) {
        cloud.x = this.screenW + cloud.size
        cloud.y = Config.CLOUD.MIN_Y + Math.random() * (this.screenH * Config.CLOUD.MAX_Y_RATIO - Config.CLOUD.MIN_Y)
      }
    }
  }

  _updateNearMissEffects() {
    for (let i = this.nearMissEffects.length - 1; i >= 0; i--) {
      const e = this.nearMissEffects[i]
      e.life--
      // [v1.1.4] 更新多环
      if (e.rings) {
        for (const ring of e.rings) {
          ring.life--
        }
      }
      // [v1.1.4] 更新粒子
      if (e.sparkles) {
        for (const sp of e.sparkles) {
          sp.x += sp.vx
          sp.y += sp.vy
          sp.vy += 0.1  // 轻微重力
          sp.life--
        }
        e.sparkles = e.sparkles.filter(s => s.life > 0)
      }
      // [v1.1.4] 闪光衰减
      if (e.flashLife > 0) e.flashLife--
      if (e.life <= 0) this.nearMissEffects.splice(i, 1)
    }
  }

  // [v1.1.0] 浮动文字更新 [v1.1.4] 带速度衰减的向上移动渐隐
  _updateFloatingTexts() {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i]
      t.y += t.vy
      // [v1.1.4] 速度衰减：末段减速，配合alpha渐隐更自然
      if (t.vyDecay) {
        t.vy = Math.min(t.vy + t.vyDecay, 0)  // vy为负，向0靠近=减速
      }
      t.life--
      if (t.life <= 0) this.floatingTexts.splice(i, 1)
    }
  }

  // ==================== [v1.2.2] N7 能力内联特效 ====================
  // 轻量实现：粒子数组+浮动文字，与擦边特效同风格，不引入EffectManager

  /**
   * [v1.2.2] N7 取出AbilitySystem的特效事件并生成内联特效
   * （自愈=绿色十字粒子+"+1HP"文字；护盾获得=蓝色闪光环）
   */
  _drainAbilityFx() {
    const fx = this.abilitySystem.fxEvents
    if (!fx || fx.length === 0) return

    for (const ev of fx) {
      if (ev.type === 'regen') {
        // 自愈：绿色十字粒子从小鸟身上向外扩散
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.4
          const speed = 1 + Math.random() * 1.5
          this.abilityEffects.push({
            kind: 'cross',
            x: this.bird.x,
            y: this.bird.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.5,  // 略向上飘
            life: 30,
            maxLife: 30,
            size: 3 + Math.random() * 2,
            color: '94, 226, 112'  // 绿色
          })
        }
        this._addFloatingText(this.bird.x, this.bird.y - 35, '+1 HP', '#5ee270', 45)
      } else if (ev.type === 'shield') {
        // 护盾获得：蓝色闪光环从小鸟扩散
        this.abilityEffects.push({
          kind: 'ring',
          x: this.bird.x,
          y: this.bird.y,
          vx: 0,
          vy: 0,
          life: 24,
          maxLife: 24,
          size: this.bird.width * 0.6,  // 起始半径
          color: '100, 200, 255'        // 蓝色
        })
      } else if (ev.type === 'survivor') {
        // [v1.4.0] 求生本能：HP=1 补盾提示（特效环已由 addShieldLayer 的 shield 事件提供）
        this._addFloatingText(this.bird.x, this.bird.y - 40, '求生本能!', '#ffd700', 50)
      } else if (ev.type === 'mirror_shock') {
        // [v1.4.0] 镜面护盾：破盾冲击波 AoE 结算
        this._triggerMirrorShock()
      } else if (ev.type === 'barrage_fire') {
        // [v1.4.0] 火力覆盖：定时自动导弹——独立枪口闪光（橙白小闪点），不用道具拾取特效（防误认来源）
        this.abilityEffects.push({
          kind: 'ring',
          x: this.bird.x + this.bird.width / 2 + 4,
          y: this.bird.y,
          vx: 0,
          vy: 0,
          life: 12,
          maxLife: 12,
          size: 4,
          color: '255, 230, 160'  // 枪口闪光（亮橙白）
        })
        this._fireMissile({ silent: true })  // 自动导弹不弹"拾取发射"文字
        Logger.info('Missile', '火力覆盖自动发射', { lv: this.abilitySystem.owned.get('missile_barrage') })
      } else if (ev.type === 'storm_fire') {
        // [v1.4.0] 导弹风暴：连发节拍（同屏 MAX_ALIVE 上限在 _fireMissile 硬刹车）
        this._fireMissile({ silent: true })
      } else if (ev.type === 'temp_hp') {
        // [v1.4.0] 超载神盾质变：溢出护盾转临时HP 提示
        this._addFloatingText(this.bird.x, this.bird.y - 40, '超载:临时HP+1!', '#ff9aa0', 50)
      } else if (ev.type === 'temp_hp_break') {
        // [v1.4.0] 临时HP被消耗提示
        this._addFloatingText(this.bird.x, this.bird.y - 40, '临时HP-1', '#ff9aa0', 40)
      } else if (ev.type === 'feather_shield') {
        // [v1.4.0] 回响之翼：羽盾获得（羽毛色环+提示）
        this.abilityEffects.push({
          kind: 'ring',
          x: this.bird.x,
          y: this.bird.y,
          vx: 0,
          vy: 0,
          life: 24,
          maxLife: 24,
          size: this.bird.width * 0.6,
          color: '255, 242, 200'  // 羽毛白金色
        })
        this._addFloatingText(this.bird.x, this.bird.y - 40, '羽盾+1!', '#fff2c8', 45)
      } else if (ev.type === 'feather_break') {
        // [v1.4.0] 羽盾破裂抵挡提示（铁羽无敌帧已在 consumeFeatherShield 结算）
        this._addFloatingText(this.bird.x, this.bird.y - 40, '羽盾挡下!', '#fff2c8', 45)
      }
    }

    fx.length = 0
  }

  /**
   * [v1.4.0] 镜面护盾冲击波：半径 (100+40*(lv-1))px 内怪物受 1 伤害
   * 对 Boss 无效（isBoss 分支）；触发频率由 AbilitySystem.mirrorShockCD(3s) 硬刹车
   */
  _triggerMirrorShock() {
    const lv = this.abilitySystem.owned.get('mirror_shield') || 0
    if (lv <= 0) return
    const radius = Config.SHIELD.MIRROR_SHOCK_RADIUS_BASE +
      Config.SHIELD.MIRROR_SHOCK_RADIUS_PER_LV * (lv - 1)
    const bx = this.bird.x
    const by = this.bird.y

    let hits = 0
    for (const m of this.monsters) {
      if (m.hp <= 0 || m.isBoss) continue
      const dx = m.x + m.width / 2 - bx
      const dy = m.y - by
      if (dx * dx + dy * dy <= radius * radius) {
        m.takeDamage(1)
        hits++
        if (m.hp <= 0) this._onMonsterKilled(m)  // 尸体由 _updateMonsters 回收
      }
    }

    // 冲击波视觉：青白色扩散环
    this.abilityEffects.push({
      kind: 'ring',
      x: bx,
      y: by,
      vx: 0,
      vy: 0,
      life: 24,
      maxLife: 24,
      size: radius * 0.4,
      color: '200, 240, 255'
    })
    this._addFloatingText(bx, by - 35, '镜面冲击!', '#c8f0ff', 40)
    Logger.info('Shield', '镜面冲击波结算', { radius: radius, hits: hits })
  }

  /**
   * [v1.2.2] N7 二段跳白色尾迹粒子
   */
  _spawnDoubleJumpTrail() {
    for (let i = 0; i < 6; i++) {
      this.abilityEffects.push({
        kind: 'dot',
        x: this.bird.x - 6 - Math.random() * 8,
        y: this.bird.y + 4 + Math.random() * 6,
        vx: -0.5 - Math.random() * 1,
        vy: 1 + Math.random() * 1.5,  // 向下飘散（小鸟在向上冲）
        life: 22,
        maxLife: 22,
        size: 2 + Math.random() * 2,
        color: '255, 255, 255'  // 白色
      })
    }
  }

  /**
   * [v1.2.2] N7 能力特效粒子更新（在状态判断前调用，升级面板期间也能播完）
   */
  _updateAbilityEffects() {
    for (let i = this.abilityEffects.length - 1; i >= 0; i--) {
      const p = this.abilityEffects[i]
      p.x += p.vx
      p.y += p.vy
      p.life--
      if (p.life <= 0) this.abilityEffects.splice(i, 1)
    }
  }

  // ==================== 能力属性注入 ====================

  _applyAbilityStatsToBird() {
    const stats = this.abilitySystem.getStats()
    this.bird.gravity = Config.BIRD.GRAVITY * stats.gravityMultiplier
    this.bird.flapForce = Config.BIRD.FLAP_FORCE * stats.flapForceMultiplier
    if (this.bird.collisionScale !== stats.collisionScale) {
      this.bird.collisionScale = stats.collisionScale
      this.bird.updateCollisionBox()
    }
  }

  // [v1.2.0] 构建环境系统所需的游戏上下文
  _buildGameCtx() {
    return {
      gameTime: this.gameTime,
      bird: this.bird,
      screenW: this.screenW,
      screenH: this.screenH,
      abilities: this.abilitySystem,
      weather: this.weatherSystem,  // [v1.4.0] 风暴驯化状态查询（isTamed）
      gravityModifier: 0,           // 输出：重力增加比例（由效果写入）
      windScrollModifier: 0,        // 输出：风力滚动速度修饰（由效果写入）
      addFloatingText: (x, y, text, color, life) => this._addFloatingText(x, y, text, color, life),
      // [v1.4.0] 驯化冰雹掉 exp 的统一经验入口（含倍率/共鸣/银行/顿悟全链路）
      gainExp: (amount, source) => this._gainExp(amount, source, this.abilitySystem.getStats()),
      triggerPhoenixRevive: () => this._startPhoenixRevive(),
      triggerGameOver: () => this._gameOver(),
      damageFlash: 0,
      shakeFrames: 0,
      shakeIntensity: 0
    }
  }

  // ==================== 速度计算 ====================

  _getScrollSpeed() {
    const stats = this.abilitySystem.getStats()
    const base = Config.GAME.SCROLL_SPEED
    let ramp = Math.min(this.gameTime / Config.GAME.SPEED_RAMP_TIME, 1) * Config.GAME.SPEED_RAMP_MAX
    // [v1.2.1] 第二段缓坡：60s后速度以半速继续爬升，至180s封顶
    if (this.gameTime > Config.GAME.SPEED_RAMP2_START) {
      ramp += Math.min(
        (this.gameTime - Config.GAME.SPEED_RAMP2_START) / Config.GAME.SPEED_RAMP2_TIME, 1
      ) * Config.GAME.SPEED_RAMP2_MAX
    }
    let speed = (base + ramp) * stats.scrollSpeedMultiplier

    // 时间扭曲减速
    if (this.abilitySystem.timeWarpActive > 0) {
      speed *= 0.5
    }

    // [v1.1.0] 速度包减速
    speed *= this.abilitySystem.getSpeedPackMultiplier()

    // [v1.2.0] 风力影响滚动速度
    speed += this._weatherWindScroll

    // [v1.5.0] 章节难度修正（§4.4 叠加制）：滚动速度加算（Ch1=+0，加 0 精确无差）
    speed += this.chapterSystem.getMods().scrollSpeedAdd

    return Math.max(0.5, speed)
  }

  _getGapSize() {
    const stats = this.abilitySystem.getStats()
    const base = Config.PIPE.GAP + stats.gapBonus
    let reduction = Math.min(this.gameTime / Config.GAME.GAP_RAMP_TIME, 1) * Config.GAME.GAP_RAMP_MAX
    // [v1.2.1] 第二段缓坡：60s后间隙以半速继续缩小，至180s封顶
    if (this.gameTime > Config.GAME.GAP_RAMP2_START) {
      reduction += Math.min(
        (this.gameTime - Config.GAME.GAP_RAMP2_START) / Config.GAME.GAP_RAMP2_TIME, 1
      ) * Config.GAME.GAP_RAMP2_MAX
    }
    // [v1.5.0] 章节难度修正（§4.4 叠加制）：间隙加算（Ch1=+0，精确无差；Ch2=-10）
    return Math.max(
      base - reduction + this.chapterSystem.getMods().gapAdd,
      Config.PIPE.MIN_GAP + stats.gapBonus * 0.5
    )
  }

  // [v1.5.0] 管道生成（_spawnPipe）、怪物生成（_updateMonsterSpawn/_pickMonsterY）
  // 已迁入 systems/SpawnSystem.js → spawnPipe() / updateMonsterSpawn() / pickMonsterY()

  /**
   * [v1.3.0] 怪物更新与小鸟碰撞（走 _handleCollision 统一受击链，与管道同级）
   * [v1.4.0] 时之晶：冻结期怪物停止移动/追踪，但不取消碰撞判定
   *           （铁喙协同建立在受击链不变上："冻结期碰瓷零风险"）
   * @param {number} scrollSpeed - 当前滚动速度（减速对怪物同步生效）
   * @returns {boolean} true=游戏结束
   */
  _updateMonsters(scrollSpeed) {
    // [v1.4.0] 时之晶冻结：怪物/弹幕（v1.5.0）冻结，鸟可动；友方导弹不冻结
    const frozen = this.abilitySystem.timeCrystalFreezeFrames > 0
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const monster = this.monsters[i]
      if (!frozen) monster.update(scrollSpeed, this.bird)

      if (monster.isOffscreen() || monster.hp <= 0) {
        this.monsters.splice(i, 1)
        continue
      }

      if (monster.checkCollision(this.bird)) {
        if (this._handleCollision(monster)) return true
      }
    }
    return false
  }

  // ==================== [v1.5.0 步骤C] Boss 战 ====================

  /**
   * Boss 实体创建（ChapterSystem 出场演出 enter 阶段回调）：
   * 变体 = 当前章节下标；HP 单一事实源 = CHAPTERS.mods.bossHp
   */
  _spawnBoss() {
    const idx = this.chapterSystem.index
    const hp = this.chapterSystem.getMods().bossHp
    const self = this
    this.boss = new Boss(idx, this.screenW, this.screenH, hp, {
      onFireFeather: function (x, y, angle, speed, color) {
        self.feathers.push(new Feather(x, y, angle, speed, color))
      },
      onSummon: function (type, x, y) { self._spawnBossMinion(type, x, y) },
      onPhase2: function (boss) { self._onBossPhase2(boss) }
    })
    Logger.info('Boss', 'Boss 出场', { name: this.boss.name, hp: hp, chapter: idx + 1 })
  }

  /**
   * Boss 召唤物（§4.8 P2：每 15s 召唤，走 Monster 工厂）：
   * 参数沿用当前章节修正（HP/追踪/振幅），不占普通怪物生成节奏（bossActive 期间普通生成已停）
   */
  _spawnBossMinion(type, x, y) {
    const mods = this.chapterSystem.getMods()
    const groundY = this.screenH - Config.GROUND.HEIGHT
    const monster = new Monster(x, y, type, groundY, {
      hpMult: mods.monsterHpMult,
      trackSpeed: mods.floaterTrackSpeed,
      sineAmp: mods.batSineAmp
    })
    this.monsters.push(monster)
    Logger.info('Boss', 'Boss 召唤小怪', { type: type, x: Math.round(x), y: Math.round(y) })
  }

  /** P1→P2 阶段切换演出（§4.8：闪电粒子爆闪 30 帧 + 提示；血条变红由 HUD 读 boss.phase） */
  _onBossPhase2(boss) {
    this._spawnExplosion(boss.x + boss.width / 2, boss.y, '255, 255, 160', 20)
    this._addFloatingText(this.screenW / 2, this.screenH * 0.3, boss.name + ' 暴怒了！', '#ff3b3b', 75)
    Logger.info('Boss', 'Boss 进入 P2 暴怒', { name: boss.name, hp: boss.hp })
  }

  /**
   * Boss 战每帧更新：弹幕（时之晶冻结停移动不停碰撞，与怪物同语义）→ Boss 本体 →
   * 接触碰撞（统一受击链，铁喙/镜面对 Boss 无效）→ 死亡演出计时 → 离场回收
   * @returns {boolean} true=游戏结束
   */
  _updateBossFight() {
    if (!this.boss) return false
    const boss = this.boss
    // 死亡演出慢动作（§4.11：30 帧 0.5×，复用速度包比例；弹幕同步减速保持视觉一致）
    const timeScale = this._bossDyingFrames > 0 ? Config.ITEM.SPEED_PACK_SLOWDOWN : 1
    const frozen = this.abilitySystem.timeCrystalFreezeFrames > 0  // 时之晶：怪物/弹幕冻结（卡面承诺）

    // 羽刃弹幕：命中即消（走统一受击链；被格挡/护盾/无敌减免同样消耗弹幕）
    for (let i = this.feathers.length - 1; i >= 0; i--) {
      const f = this.feathers[i]
      if (!frozen) f.update(timeScale)
      if (f.checkCollision(this.bird)) {
        this.feathers.splice(i, 1)
        if (this._handleCollision(f)) return true
        continue
      }
      if (f.isOffscreen(this.screenW, this.screenH)) this.feathers.splice(i, 1)
    }

    // Boss 本体（dying 也继续 update 做坠落演出；leaving 同理加速离场）
    if (!frozen) boss.update(this.bird)

    // 本体接触伤害 1（entering/dying/leaving 态 Boss 内部已豁免碰撞）
    if (boss.checkCollision(this.bird)) {
      if (this._handleCollision(boss)) return true
    }

    // 死亡演出收尾 → 大礼包结算
    if (this._bossDyingFrames > 0) {
      this._bossDyingFrames--
      if (this._bossDyingFrames <= 0) {
        this.boss = null
        this._startBossRewards()
      }
      return false
    }

    // 战败离场出屏回收
    if (boss.state === 'leaving' && boss.isOffscreen()) this.boss = null
    return false
  }

  /**
   * 玩家战败（§4.10 方案A，D1/D19）：Boss 战期间 HP 归零不结束游戏——
   * 本击已走完整受击链（C7 格挡/羽盾/护盾可减免，减免则不构成战败）；
   * HP 钳 1（"扣 1 HP"的代价 = 这最后 1 HP 被战败保护兜住），Boss 长鸣离场、章内进度保留、
   * 20 管后满血回归一次；二战失败本章 Boss 不再出现、章节正常推进无奖励。
   * 边界：maxHp===1（血契流）无血可扣不兜底，由调用方继续走正常 gameover（方案原文"战败=死"）；
   * 凤凰复活优先于战败判定（保有凤凰=战斗继续）。
   * @returns {boolean} false=局继续
   */
  _onBossDefeat() {
    this.abilitySystem.hp = 1
    this.abilitySystem.invalidateStats()
    this.abilitySystem.invincibleFrames = Math.max(
      this.abilitySystem.invincibleFrames, Config.BOSS.DEFEAT_INVINCIBLE_FRAMES)
    this.bird.invincibleBlink = Math.max(this.bird.invincibleBlink, 40)
    this._addFloatingText(this.screenW / 2, this.screenH * 0.3, '战败……' + (this.boss ? this.boss.name : 'Boss') + ' 长鸣离场', '#cccccc', 90)
    if (this.boss) this.boss.startLeaving()
    const result = this.chapterSystem.onBossDefeat()
    this.feathers = []  // 弹幕清空（战败公平性，回归战从零开局）
    if (result === 'rematch') {
      this._addFloatingText(this.screenW / 2, this.screenH * 0.3 + 26, '再过 20 管它将满血回归！', '#ffaa00', 90)
    } else {
      this._addFloatingText(this.screenW / 2, this.screenH * 0.3 + 26, '它不再回来……章节继续', '#999999', 90)
    }
    Logger.warn('Boss', 'Boss 战战败结算（方案A）', { result: result, hp: this.abilitySystem.hp })
    return false
  }

  /**
   * Boss 击杀（导弹 takeDamage 归零）：§4.11 死亡演出——爆炸粒子环（半径120px）+
   * 慢动作 30 帧（复用速度包 0.5×）→ 大礼包面板（_bossDyingFrames 倒计时在 _updateBossFight）
   */
  _onBossVictory() {
    const boss = this.boss
    if (!boss || this._bossDyingFrames > 0) return
    boss.startDying()
    this._bossDyingFrames = Config.BOSS.DEATH_SLOWMO_FRAMES
    // 爆炸粒子环（半径 120px，两圈密粒）
    this._spawnExplosionRing(boss.x + boss.width / 2, boss.y, Config.BOSS.EXPLOSION_RING_RADIUS)
    // 慢动作：复用速度包（世界 0.5×；弹幕同步在 _updateBossFight 读 _bossDyingFrames）
    this.abilitySystem.setSpeedPack(Config.BOSS.DEATH_SLOWMO_FRAMES)
    this.feathers = []  // 弹幕清空
    // R10 战利品陈列叠层 + 结算徽章（先叠层，大礼包经验可吃到陈列加成——越早拿越强）
    this.abilitySystem.setBossesDefeated(this.abilitySystem.bossesDefeated + 1)
    this.bossBadges.push(this.chapterSystem.getChapter().id)
    this.shakeFrames = Math.max(this.shakeFrames, 10)
    this.shakeIntensity = 5
    Logger.info('Boss', 'Boss 击杀', { name: boss.name, chapter: this.chapterSystem.getChapter().id,
      kills: this.abilitySystem.bossesDefeated })
  }

  /** §4.11 爆炸粒子环：半径 120px 圆环两圈（外金内白） */
  _spawnExplosionRing(x, y, radius) {
    for (let ring = 0; ring < 2; ring++) {
      const n = 18
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n
        const speed = (radius / 24) * (ring === 0 ? 1 : 0.6)
        this.abilityEffects.push({
          kind: 'dot',
          x: x, y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 30, maxLife: 30,
          size: ring === 0 ? 4 : 2.5,
          color: ring === 0 ? '255, 200, 60' : '255, 255, 255'
        })
      }
    }
  }

  /**
   * §4.10 章节大礼包（打赢四件套）：②+3 级所需经验 ③+100 分先行入账（浮动文字可见），
   * ①特殊 3 选 1 面板（1 史诗+2 珍贵，满级卡已移出）→ ④章节祝福三选一 → 大礼包经验升级面板链
   * → _finishBossRewards 转场。面板链全程 UPGRADING 语义（世界冻结，无生存压力）。
   */
  _startBossRewards() {
    this._bossRewardPending = true
    const stats = this.abilitySystem.getStats()

    // ③ +100 分
    this.score += Config.BOSS.GIFT_SCORE
    if (this.onScoreChange) this.onScoreChange(this.score)

    // ② +3 级所需经验（按当前等级曲线 18+12×Lv 逐级别累加；走统一 _gainExp 保持
    //    共鸣/银行/顿悟/陈列/成长祝福全链路）
    let expSum = 0
    for (let i = 0; i < Config.BOSS.GIFT_LEVELS; i++) {
      expSum += this.expSystem.getExpNeeded(this.expSystem.level + i)
    }
    this._gainExp(expSum, 'boss_gift', stats)
    this._addFloatingText(this.screenW / 2, this.screenH * 0.3, '章节大礼包！+100 分', '#ffd700', 90)

    // ① 特殊 3 选 1 面板（池空兜底：跳过卡片位直接进祝福）
    const choices = AbilityRegistry.rollBossRewardChoices(this.abilitySystem.owned, this.expSystem.level)
    if (choices) {
      this._panelMode = 'bossCard'
      this.state = Config.GAME.STATE.UPGRADING
      this._currentChoices = choices
      if (this.onLevelUp) {
        this.onLevelUp(choices, this.expSystem.level, this.abilitySystem.getOwnedList())
      }
    } else {
      Logger.warn('Boss', '大礼包自选面板无候选（全满级），跳过卡片位')
      this._openBlessingPanel()
    }
    Logger.info('Boss', '章节大礼包入账', { giftExp: expSum, score: this.score })
  }

  /** ④ 章节祝福三选一面板（§4.10：三选一，本局永久；复用升级面板渲染，伪能力定义） */
  _openBlessingPanel() {
    this._panelMode = 'blessing'
    this.state = Config.GAME.STATE.UPGRADING
    this._currentChoices = BOSS_BLESSINGS
    if (this.onLevelUp) {
      this.onLevelUp(BOSS_BLESSINGS, this.expSystem.level, this.abilitySystem.getOwnedList())
    }
  }

  /**
   * ④ 章节祝福生效（E7 章节之主：祝福效果 +50%，授予时计入，本局永久）
   * @param {string} id - 'bless_vitality' | 'bless_growth' | 'bless_hunt'
   */
  _applyBlessing(id) {
    const masterMult = (this.abilitySystem.owned.get('chapter_master') || 0) > 0
      ? Config.BOSS.BLESSING_MASTER_MULT : 1
    const ab = this.abilitySystem
    if (id === 'bless_vitality') {
      // 活力：HP 回满 + 护盾补至上限 + 临时 HP（上限 +1/次）
      ab.healHP(ab.maxHp)
      ab.addShieldLayer(ab.maxShieldLayers)
      ab.blessingTempHpCapBonus += 1
      ab.grantTempHp(Math.round(1 * masterMult))
      this._addFloatingText(this.bird.x, this.bird.y - 40, '活力祝福！', '#7fff7f', 75)
    } else if (id === 'bless_growth') {
      // 成长：经验 +25%（独立乘区，本局永久）
      ab.blessingExpMult *= (1 + Config.BOSS.BLESSING_GROWTH_EXP * masterMult)
      this._addFloatingText(this.bird.x, this.bird.y - 40, '成长祝福！', '#ffd700', 75)
    } else if (id === 'bless_hunt') {
      // 狩猎：道具率 +8pp（本局永久）+ 立即前方生成 3 道具
      ab.blessingItemBonus += Config.BOSS.BLESSING_HUNT_ITEM_PP * masterMult
      for (let i = 0; i < Config.BOSS.BLESSING_HUNT_SPAWN_ITEMS; i++) {
        this.spawnSystem.spawnRandomItem()
      }
      this._addFloatingText(this.bird.x, this.bird.y - 40, '狩猎祝福！', '#ffaa00', 75)
    }
    ab.invalidateStats()
    Logger.info('Boss', '章节祝福生效', { id: id, masterMult: masterMult,
      expMult: ab.blessingExpMult, itemBonus: ab.blessingItemBonus })
  }

  /** 大礼包面板链收尾：恢复飞行（B2 同款保护）→ endBossFight(true) 转场（§4.3） */
  _finishBossRewards() {
    this._bossRewardPending = false
    this._panelMode = 'levelup'
    this.abilitySystem.invincibleFrames = Math.max(
      this.abilitySystem.invincibleFrames, Config.UPGRADE.RESUME_INVINCIBLE_FRAMES)
    this.bird.invincibleBlink = Math.max(this.bird.invincibleBlink, 30)
    this.bird.velocity = 0
    this.state = Config.GAME.STATE.PLAYING
    this.chapterSystem.endBossFight(true)
    if (this.onExpChange) this.onExpChange(this.expSystem.getExpBarData())
  }

  // ==================== [v1.5.0 步骤C] 章节进出钩子（联动卡） ====================

  /**
   * 进入新章钩子（ChapterSystem._applyNextChapter 回调，转场冻结期执行）：
   * U9 旅者补给 / R9 章节回响 / E7 章节之主首面板保底标记
   * @param {number} toIndex - 新章节下标（≥1，Ch1 不经过此钩子=旅者第 2 章起生效）
   */
  _onChapterEnter(toIndex) {
    const owned = this.abilitySystem.owned
    const stats = this.abilitySystem.getStats()

    // U9 旅者：+lv 层护盾 +20exp/级（第 2 章起生效）
    const nomadLv = owned.get('nomad') || 0
    if (nomadLv > 0) {
      this.abilitySystem.addShieldLayer(nomadLv)
      this._gainExp(Config.ABILITY.NOMAD_EXP_PER_LV * nomadLv, 'nomad', stats)
      this._addFloatingText(this.screenW / 2, this.screenH * 0.45, '旅者补给！', '#9b59b6', 75)
      Logger.info('Ability', '旅者补给', { lv: nomadLv, chapter: toIndex + 1 })
    }

    // R9 章节回响：随机已持卡临时 +lv 级（本章有效）
    this._applyChapterEcho()

    // E7 章节之主：本章首次升级面板必含 1 张史诗（getChoices 消耗标记）
    this.abilitySystem.chapterFirstPanelDue = true
  }

  /** 本章终结钩子（胜利/二战跳章，转场前）：回响消散（按增量还原，不动玩家本章自购的等级） */
  _onChapterEnd() {
    this._revertChapterEcho()
  }

  /**
   * R9 章节回响（chapter_echo）：进新章随机 1 张已持卡临时 +lv 级（本章有效，不超 maxLevel；
   * 满级重随机 ≤3 次——全部重试失败则本章无回响）。回响不含自身（防语义套娃）。
   * 注：临时等级只改 owned 数值（stats 全链路生效）；selectAbility 的选卡副作用
   * （活力回血/坚韧补盾等一次性效果）不因回响触发——回响是"体验卡"而非"真获得"。
   */
  _applyChapterEcho() {
    const echoLv = this.abilitySystem.owned.get('chapter_echo') || 0
    if (echoLv <= 0) return
    this._revertChapterEcho(true)  // 防御：旧回响先静默消散
    const list = this.abilitySystem.getOwnedList().filter(o => o.def && o.def.id !== 'chapter_echo')
    if (list.length === 0) return
    let chosen = null
    for (let i = 0; i < Config.ABILITY.ECHO_REROLL_MAX; i++) {
      const c = list[Math.floor(Math.random() * list.length)]
      if (c.level < c.def.maxLevel) { chosen = c; break }  // 满级重随机
    }
    if (!chosen) {
      Logger.info('Ability', '章节回响：重试耗尽（已持卡全满级），本章无回响')
      return
    }
    const to = Math.min(chosen.def.maxLevel, chosen.level + echoLv)  // 不超 maxLevel
    if (to === chosen.level) return
    this._echoBoost = { id: chosen.def.id, from: chosen.level, to: to }
    this.abilitySystem.owned.set(chosen.def.id, to)
    this.abilitySystem.invalidateStats()
    this._addFloatingText(this.screenW / 2, this.screenH * 0.45 + 24,
      '回响：' + chosen.def.name + ' 临时+' + (to - chosen.level) + '级！', '#c8b6ff', 75)
    Logger.info('Ability', '章节回响生效', { id: chosen.def.id, from: chosen.level, to: to })
  }

  /**
   * R9 回响消散：按增量还原（若玩家本章真实选购过该卡，只摘除回响增量，不动自购等级）
   * @param {boolean} [silent] - true=不弹"回响消散"（换章叠加防御路径）
   */
  _revertChapterEcho(silent) {
    if (!this._echoBoost) return
    const boost = this._echoBoost
    const cur = this.abilitySystem.owned.get(boost.id) || 0
    this.abilitySystem.owned.set(boost.id, Math.max(boost.from, cur - (boost.to - boost.from)))
    this.abilitySystem.invalidateStats()
    if (!silent) {
      this._addFloatingText(this.screenW / 2, this.screenH * 0.4, '回响消散', '#c8b6ff', 60)
    }
    Logger.info('Ability', '回响消散', { id: boost.id, restoredTo: this.abilitySystem.owned.get(boost.id) })
    this._echoBoost = null
  }

  /**
   * [v1.3.0] 怪物被击杀：爆炸粒子 + 击杀经验（浮动文字 +10）
   * [v1.4.0] 拾荒者：击杀怪物 20%/级 掉随机道具（权重沿用 TYPE_WEIGHTS）
   * [v1.5.0] 精英怪（§5.1）：经验 ×5（10→50）+ 必掉 1 个随机道具（导弹权重×2，与拾荒者独立）
   */
  _onMonsterKilled(monster) {
    this._spawnExplosion(monster.x + monster.width / 2, monster.y, '255, 120, 40', 12)
    const stats = this.abilitySystem.getStats()
    const isElite = !!monster.elite
    const killExp = isElite ? Config.MONSTER.KILL_EXP * Config.MONSTER.ELITE_EXP_MULT : Config.MONSTER.KILL_EXP
    this._gainExp(killExp, isElite ? 'elite_kill' : 'monster_kill', stats)
    this.monsterKills++  // [v1.4.0] §6.3 火力流击杀指标统计

    // [v1.5.0] 精英必掉：怪物位置掉 1 个随机道具（导弹权重×2）+ 高价值目标提示
    if (isElite) {
      this.spawnSystem.spawnEliteDrop(monster.x + monster.width / 2, monster.y)
      this._addFloatingText(monster.x + monster.width / 2, monster.y - 30, '精英击杀!', Config.MONSTER.ELITE_BORDER_COLOR, 55)
    }

    // [v1.4.0] 拾荒者掉落（同屏怪物≤2 + 生成距离450px 天然限速，无需额外刹车）
    const scavLv = this.abilitySystem.owned.get('scavenger') || 0
    if (scavLv > 0 && Math.random() < Config.MONSTER.SCAVENGER_CHANCE_PER_LV * scavLv) {
      this.spawnSystem.spawnRandomItem()  // [v1.5.0] 生成决策迁入 SpawnSystem
      Logger.info('Item', '拾荒者掉落道具', { lv: scavLv })
    }

    Logger.info('Monster', '击杀怪物', { type: monster.monsterType, elite: isElite, exp: killExp })
  }

  // ==================== [v1.3.0] 导弹系统 ====================

  /**
   * [v1.3.0] 拾取导弹道具：从小鸟位置发射 1 枚导弹（拾取即触发）
   * [v1.4.0] 导弹挂架（missile_rack）：每次发射 +lv 枚扇形（"发射事件"级拦截，不区分导弹来源）
   * 实现坑已规避：MAX_ALIVE 先与挂架等级挂钩（3+lv），否则扇形瞬间占满上限、满级卡无效
   * [v1.4.0] opts.silent：自动来源（火力覆盖/导弹风暴连发）不弹"🚀 发射!"拾取文字
   * @param {Object} [opts] - { silent: boolean }
   */
  _fireMissile(opts) {
    const rackLv = this.abilitySystem.owned.get('missile_rack') || 0
    const maxAlive = Config.MISSILE.MAX_ALIVE + rackLv  // [v1.4.0] 上限与挂架等级挂钩（同屏硬刹车）
    const count = 1 + rackLv
    const target = this._pickMissileTarget()

    let fired = 0
    for (let i = 0; i < count; i++) {
      if (this.missiles.length >= maxAlive) break
      // 扇形角度：以水平向右为中心对称展开，步长 RACK_FAN_STEP
      const angleOffset = (i - rackLv / 2) * Config.MISSILE.RACK_FAN_STEP
      const missile = new Missile(this.bird.x + this.bird.width / 2, this.bird.y, target, angleOffset)
      this.missiles.push(missile)
      fired++
    }
    if (fired <= 0) return

    if (!(opts && opts.silent)) {
      this._addFloatingText(
        this.bird.x, this.bird.y - 30,
        fired > 1 ? `🚀 发射x${fired}!` : '🚀 发射!',
        '#e67e22', 45
      )
    }
    Logger.info('Missile', '发射导弹', {
      count: fired,
      rackLv: rackLv,
      targetType: target ? target.type : 'none',
      x: Math.round(this.bird.x),
      y: Math.round(this.bird.y)
    })
  }

  /**
   * [v1.3.0] 导弹目标选择：存活怪物中最近者优先；无怪物选最近 destructible 管道；无目标直飞
   * @returns {Object|null}
   */
  _pickMissileTarget() {
    // [v1.5.0] Boss 绝对优先（在场且可受击时全部火力锁定 Boss——章节高潮的火力聚焦）
    if (this.boss && this.boss.hp > 0 && this.boss.state !== 'entering' &&
        this.boss.state !== 'dying' && this.boss.state !== 'leaving') {
      return this.boss
    }

    let best = null
    let bestDist = Infinity

    // 怪物优先（曼哈顿距离最近）
    for (const m of this.monsters) {
      if (m.hp <= 0) continue
      const d = Math.abs(m.x - this.bird.x) + Math.abs(m.y - this.bird.y)
      if (d < bestDist) { bestDist = d; best = m }
    }
    if (best) return best

    // 无怪物：选小鸟前方最近的可破坏管道
    bestDist = Infinity
    for (const p of this.pipes) {
      if (!p.destructible || p.hp <= 0) continue
      if (p.x + p.width < this.bird.x) continue
      const d = p.x - this.bird.x
      if (d < bestDist) { bestDist = d; best = p }
    }
    return best
  }

  /**
   * [v1.3.0] 导弹更新与命中处理（速度随世界缩放，减速同步生效）
   * @param {number} scrollSpeed - 当前滚动速度
   */
  _updateMissiles(scrollSpeed) {
    const speedFactor = scrollSpeed / Config.GAME.SCROLL_SPEED
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const missile = this.missiles[i]
      missile.update(speedFactor)

      if (missile.isOffscreen(this.screenW, this.screenH)) {
        this.missiles.splice(i, 1)
        continue
      }

      if (this._checkMissileHit(missile)) {
        this.missiles.splice(i, 1)
      }
    }
  }

  /**
   * [v1.3.0] 导弹命中检测：怪物优先，其次可破坏管道
   * [v1.4.0] 猎手标记：导弹伤害 +lv，击杀触发连锁爆炸（硬规则：连锁击杀不再二次连锁）；
   *           蜂群链路：命中后 1.5s 窗内下一发 +1（叠层上限 1+lv 硬封顶，窗破清零）
   * @param {Missile} missile
   * @returns {boolean} true=命中（导弹销毁）
   */
  _checkMissileHit(missile) {
    const hunterLv = this.abilitySystem.owned.get('hunter_mark') || 0
    const linkLv = this.abilitySystem.owned.get('missile_link') || 0
    // 本次伤害 = 基础 + 猎手标记 + 蜂群链路当前叠层
    const damage = Config.MISSILE.DAMAGE + hunterLv + this.abilitySystem.missileLinkStacks

    let hitSomething = false
    let killedMonster = null

    // [v1.5.0] Boss 最优先判定（体型大易命中；猎手标记/屠戮者加成生效，
    // 蜂群链路叠层对 Boss 不加成——防叠层秒杀 30HP 设计目标，D19）
    if (this.boss && this.boss.hp > 0 && this.boss.state !== 'entering' &&
        this.boss.state !== 'dying' && this.boss.state !== 'leaving' &&
        missile.hitTest(this.boss)) {
      const slayerLv = this.abilitySystem.owned.get('boss_slayer') || 0
      const bossDamage = Config.MISSILE.DAMAGE + hunterLv + slayerLv
      this.boss.takeDamage(bossDamage)
      hitSomething = true
      // 蜂群链路命中 Boss 只续窗不叠层（火力转移到召唤物时保留节奏）
      if (linkLv > 0) {
        this.abilitySystem.missileLinkWindow = Config.MISSILE.LINK_WINDOW_FRAMES
      }
      if (this.boss.hp <= 0) {
        Logger.info('Boss', '导弹击杀 Boss', { name: this.boss.name, damage: bossDamage })
        this._onBossVictory()
      } else {
        Logger.debug('Missile', '命中 Boss', { hp: this.boss.hp, damage: bossDamage })
      }
      return true
    }

    // 怪物优先
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i]
      if (m.hp <= 0) continue
      if (missile.hitTest(m)) {
        this._damageObstacle(m, damage)
        hitSomething = true
        if (m.hp <= 0) {
          killedMonster = m
          this._onMonsterKilled(m)
          this.monsters.splice(i, 1)
        } else {
          Logger.info('Missile', '命中怪物', { type: m.monsterType, hp: m.hp, damage: damage })
        }
        break
      }
    }

    // 可破坏管道
    if (!hitSomething) {
      for (let i = this.pipes.length - 1; i >= 0; i--) {
        const p = this.pipes[i]
        if (!p.destructible || p.hp <= 0) continue
        if (missile.hitTest(p)) {
          this._damageObstacle(p, damage)
          hitSomething = true
          if (p.hp <= 0) {
            this._onPipeDestroyed(p)
            this.pipes.splice(i, 1)
          }
          break
        }
      }
    }

    if (!hitSomething) return false

    // [v1.4.0] 蜂群链路：任何命中都续窗+叠层（硬封顶 1+lv）
    if (linkLv > 0) {
      this.abilitySystem.missileLinkStacks = Math.min(
        this.abilitySystem.missileLinkStacks + 1, 1 + linkLv)
      this.abilitySystem.missileLinkWindow = Config.MISSILE.LINK_WINDOW_FRAMES
    }

    // [v1.4.0] 猎手标记：击杀连锁爆炸（半径 50+10*lv px）
    if (killedMonster && hunterLv > 0) {
      this._chainExplode(killedMonster, hunterLv)
    }
    return true
  }

  /**
   * [v1.4.0] 猎手标记连锁爆炸：击杀点 (50+10*lv)px 内其他怪物受 1 伤害
   * 硬规则（防指数回路）：连锁爆炸造成的击杀**不再**触发二次连锁——本函数内不递归调用自身；
   * 对 Boss 无效（isBoss 分支，v1.5.0 预留）
   */
  _chainExplode(center, hunterLv) {
    const radius = Config.MISSILE.HUNTER_CHAIN_BASE_RADIUS +
      Config.MISSILE.HUNTER_CHAIN_RADIUS_PER_LV * hunterLv
    const cx = center.x + center.width / 2
    const cy = center.y
    let chainKills = 0
    for (const m of this.monsters) {
      if (m.hp <= 0 || m.isBoss) continue
      const dx = m.x + m.width / 2 - cx
      const dy = m.y - cy
      if (dx * dx + dy * dy <= radius * radius) {
        m.takeDamage(1)
        if (m.hp <= 0) {
          chainKills++
          this._onMonsterKilled(m)  // 连锁击杀给经验/掉落，但不再触发连锁；尸体由 _updateMonsters 回收
        }
      }
    }
    this._spawnExplosion(cx, cy, '255, 200, 60', 10)
    Logger.info('Missile', '猎手标记连锁爆炸', { radius: radius, chainKills: chainKills })
  }

  /**
   * [v1.3.0] 障碍物受击 + 可选小半径 AoE（默认 AOE_RADIUS=0 不生效）
   * @param {Obstacle} target - 直接命中的目标
   * @param {number} damage - 伤害值
   */
  _damageObstacle(target, damage) {
    target.takeDamage(damage)

    const radius = Config.MISSILE.AOE_RADIUS
    if (radius <= 0) return
    // AoE：对爆炸点周围其他可破坏障碍物造成同等伤害（不连锁触发 AoE）
    const tx = target.x + target.width / 2
    const ty = target.type === 'monster' ? target.y : target.topHeight + target.gap / 2
    for (const m of this.monsters) {
      if (m === target || m.hp <= 0) continue
      if (Math.abs(m.x + m.width / 2 - tx) <= radius && Math.abs(m.y - ty) <= radius) {
        m.takeDamage(damage)
      }
    }
  }

  /**
   * [v1.3.0] 管道被导弹炸毁：清除管道给通路 + 爆炸粒子 + 轻震屏
   */
  _onPipeDestroyed(pipe) {
    const cx = pipe.x + pipe.width / 2
    const cy = pipe.topHeight + pipe.gap / 2
    this._spawnExplosion(cx, cy, '140, 220, 80', 14)
    this.shakeFrames = Math.max(this.shakeFrames, 6)
    this.shakeIntensity = 3
    Logger.info('Missile', '炸毁管道', { x: Math.round(pipe.x), gapY: Math.round(cy) })
  }

  /**
   * [v1.3.0] 爆炸粒子（复用 abilityEffects 粒子数组，总量设上限避免性能问题）
   * @param {number} x - 爆炸中心X
   * @param {number} y - 爆炸中心Y
   * @param {string} color - 'r, g, b' 格式
   * @param {number} count - 粒子数
   */
  _spawnExplosion(x, y, color, count) {
    if (this.abilityEffects.length > 80) return  // 粒子上限保护
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4
      const speed = 2 + Math.random() * 3
      this.abilityEffects.push({
        kind: 'dot',
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 24,
        maxLife: 24,
        size: 2.5 + Math.random() * 2.5,
        color: color
      })
    }
  }

  // [v1.5.0] 随机道具生成（_spawnRandomItem/_rollItemType）与补给线保底（_updateSupplyLine，
  // 属道具生成职责）已迁入 systems/SpawnSystem.js → spawnRandomItem() / rollItemType() / updateSupplyLine()

  // ==================== 通过管道处理 ====================

  _onPipePass(pipe) {
    const stats = this.abilitySystem.getStats()

    // 得分
    const points = Math.round(1 * stats.scoreMultiplier)
    this.score += points
    if (this.onScoreChange) this.onScoreChange(this.score)

    // [v1.1.0] 管道计数
    this.pipesPassed++
    Logger.debug('Pipe', '通过管道', { pipesPassed: this.pipesPassed, score: this.score })

    // [v1.5.0] 章节进度：章内过管计数（40 管触发 Boss 触发点，§4.5；不消耗随机数）
    this.chapterSystem.onPipePassed()

    // [v1.1.4] 经验：只给通过管道经验（5→10），不再给经验球经验
    this._gainExp(Config.EXP.PIPE_PASS_EXP, 'pipe_pass', stats)

    // 连击
    this.abilitySystem.onPipePass()

    // [v1.4.0] 连击之心 Lv3 质变：无敌期间每过 1 管 +5exp（不延长无敌，奖励改经验不碰生存边）
    // 注：onPipePass 在无敌期不累计 combo（N1 修复），本经验奖励是 Lv3 的替代收益出口
    if ((this.abilitySystem.owned.get('combo_heart') || 0) >= 3 &&
        this.abilitySystem.invincibleFrames > 0) {
      this._gainExp(Config.ABILITY.COMBO_HEART_L3_EXP, 'combo_heart_l3', stats)
    }

    // [v1.4.0] 回响之翼：过管攒羽盾（上限 1+铁羽，全局硬顶 2）
    this.abilitySystem.onPipePassEchoWing()

    // [v1.1.0] 生成道具 [v1.1.3] 修复：在小鸟前方生成（右侧），不在后方（管道位置）
    // [v1.5.0] 掉落决策（25% 概率+位置+类型 roll）迁入 SpawnSystem，随机数消耗顺序不变
    this.spawnSystem.maybeSpawnItemOnPipePass()
  }

  // [v1.5.0] 道具类型权重随机（_rollItemType）已迁入 systems/SpawnSystem.js → rollItemType()

  // [v1.1.5] 擦边检测：每帧检查（小鸟在管道x范围内时），距离增大25px，防重复触发
  _checkNearMiss(pipe) {
    const birdTop = this.bird.y - this.bird.collisionHeight / 2
    const birdBottom = this.bird.y + this.bird.collisionHeight / 2
    const distToTopPipe = birdTop - pipe.topHeight
    const distToBottomPipe = pipe.bottomY - birdBottom
    const minDist = Math.min(distToTopPipe, distToBottomPipe)

    // [v1.4.0] 羽舞：二段跳后 3s 内擦边窗口 +8px/级
    const danceLv = this.abilitySystem.owned.get('feather_dance') || 0
    const danceBonus = (danceLv > 0 && this.abilitySystem.featherDanceFrames > 0)
      ? Config.ABILITY.FEATHER_DANCE_NEAR_MISS_BONUS * danceLv : 0

    // [v1.4.0] 缩小射线 Lv5 质变：间隙封顶 Lv4，改擦边判定窗口 +10px
    const shrinkLv = this.abilitySystem.owned.get('shrink_ray') || 0
    const shrinkBonus = shrinkLv >= 5 ? Config.ABILITY.SHRINK_RAY_L5_NEAR_MISS_BONUS : 0

    // [v1.4.0] 幻影舞步：黄金窗（90帧）内擦边判定 ×2、经验 ×(2+lv)；
    // 硬规则：窗内擦边只刷新窗口、不叠加倍率（防指数回路）；窗口期金色残影在 update() 生成
    const phantomLv = this.abilitySystem.owned.get('phantom_edge') || 0
    const phantomActive = phantomLv > 0 && this.abilitySystem.phantomWindowFrames > 0

    let windowSize = Config.EXP.NEAR_MISS_DISTANCE + danceBonus + shrinkBonus
    if (phantomActive) windowSize *= 2

    if (minDist < windowSize && minDist > 0) {
      pipe.nearMissTriggered = true  // [v1.1.5] 防止同一管道重复触发
      const stats = this.abilitySystem.getStats()
      // 幻影舞步：窗内擦边经验 ×(2+lv)（独立乘区，走统一 _gainExp 保持共鸣/银行/顿悟链路）
      this._gainExp(Config.EXP.NEAR_MISS_EXP, 'near_miss', stats, phantomActive ? (2 + phantomLv) : 1)
      if (phantomLv > 0) {
        this.abilitySystem.phantomWindowFrames = Config.ABILITY.PHANTOM_WINDOW_FRAMES  // 只刷新不叠加
      }
      this.score += Config.EXP.SCORE_NEAR_MISS
      if (this.onScoreChange) this.onScoreChange(this.score)

      // [v1.4.0] 锐利目光：擦边后 60 帧碰撞箱 -15%/级（只改判定不改手感；
      // 生效时小鸟描边金色一闪——复用擦边粒子通道，否则玩家无感知，N7 教训）
      const edgeLv = this.abilitySystem.owned.get('edge_focus') || 0
      if (edgeLv > 0) {
        this.abilitySystem.edgeFocusFrames = Config.ABILITY.EDGE_FOCUS_FRAMES
        this.abilityEffects.push({
          kind: 'ring',
          x: this.bird.x,
          y: this.bird.y,
          vx: 0,
          vy: 0,
          life: 18,
          maxLife: 18,
          size: this.bird.width * 0.5,
          color: '255, 215, 0'  // 金色
        })
      }

      // [v1.1.4] 增强擦边特效：多环扩散 + 粒子爆发 + 闪光
      const effect = {
        x: this.bird.x,
        y: this.bird.y,
        rings: [
          { radius: 10, maxRadius: 55, life: 30, maxLife: 30, lineWidth: 3 },
          { radius: 8, maxRadius: 40, life: 24, maxLife: 24, lineWidth: 2 },
          { radius: 5, maxRadius: 25, life: 18, maxLife: 18, lineWidth: 4 }
        ],
        sparkles: [],
        flashLife: 12,
        flashMaxLife: 12,
        life: 30,
        maxLife: 30
      }

      // 生成8个粒子向外爆发
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.4
        const speed = 2.5 + Math.random() * 2.5
        effect.sparkles.push({
          x: this.bird.x,
          y: this.bird.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 25,
          maxLife: 25
        })
      }

      this.nearMissEffects.push(effect)

      // [v1.1.4] 擦边浮动文字——向上偏移
      this._addFloatingText(this.bird.x, this.bird.y - 45, '擦边!', '#ffd700', 45)
    }
  }

  // [v1.1.4] 统一经验获取方法——所有经验来源都通过此方法，确保经验共鸣对所有经验生效
  // [v1.4.0] extraMult：幻影舞步黄金窗等来源的独立乘区（默认 1，不影响存量调用）
  _gainExp(baseExp, source, stats, extraMult) {
    let exp = baseExp
    let doubled = false

    // 经验共鸣：概率双倍（针对所有经验获得）
    if (this.abilitySystem.checkExpResonance()) {
      exp = baseExp * 2
      doubled = true
    }

    const multiplied = this.expSystem.addExp(exp, stats.expMultiplier * (extraMult || 1))

    // 浮动文字——堆叠不重叠
    const text = doubled ? `+${exp} EXP x2!` : `+${exp} EXP`
    const color = doubled ? '#9b59b6' : '#ffd700'
    this._addFloatingText(this.bird.x, this.bird.y - 30, text, color, 50)

    // [v1.4.0] 经验银行存取提示（N7：数值变动必须可见）
    if (this.expSystem.lastBankDeposit > 0) {
      this._addFloatingText(this.bird.x, this.bird.y - 48, `存入银行 +${this.expSystem.lastBankDeposit}`, '#f1c40f', 50)
      this.expSystem.lastBankDeposit = 0
    }
    if (this.expSystem.lastBankWithdraw > 0) {
      this._addFloatingText(this.bird.x, this.bird.y - 48, `银行取出 +${this.expSystem.lastBankWithdraw}!`, '#f39c12', 60)
      this.expSystem.lastBankWithdraw = 0
    }

    Logger.info('Exp', '获得经验', {
      source: source,
      base: baseExp,
      doubled: doubled,
      multiplied: multiplied,
      level: this.expSystem.level
    })

    if (this.onExpChange) this.onExpChange(this.expSystem.getExpBarData())
  }

  // ==================== 经验球拾取 ====================

  _collectOrb() {
    const stats = this.abilitySystem.getStats()
    this._gainExp(Config.EXP.ORB_EXP, 'orb', stats)
    this.score += Config.EXP.SCORE_PER_ORB
    if (this.onScoreChange) this.onScoreChange(this.score)
  }

  // [v1.1.0] 道具拾取
  _collectItem(item) {
    Logger.info('Item', '拾取道具', { type: item.type, x: item.x, y: item.y })
    switch (item.type) {
      case 'exp_pack': {
        const expGain = Config.ITEM.EXP_PACK_MIN +
          Math.floor(Math.random() * (Config.ITEM.EXP_PACK_MAX - Config.ITEM.EXP_PACK_MIN + 1))
        const stats = this.abilitySystem.getStats()
        this._gainExp(expGain, 'exp_pack', stats)
        break
      }
      case 'health_pack': {
        if (this.abilitySystem.hp < this.abilitySystem.maxHp) {
          this.abilitySystem.healHP(1)
          this._addFloatingText(this.bird.x, this.bird.y - 30, '+1 HP', '#e74c3c', 50)
        } else {
          // 满血时转化为分数
          this.score += 5
          if (this.onScoreChange) this.onScoreChange(this.score)
          this._addFloatingText(this.bird.x, this.bird.y - 30, '+5 分', '#e74c3c', 50)
        }
        break
      }
      case 'shield_pack': {
        // [v1.1.5] 统一护盾：添加1层护盾（不超过最大层数）
        this.abilitySystem.addShieldLayer(1)
        this._addFloatingText(this.bird.x, this.bird.y - 30, '护盾+1!', '#3498db', 50)
        break
      }
      case 'speed_pack': {
        this.abilitySystem.setSpeedPack(Config.ITEM.SPEED_PACK_DURATION)
        this._addFloatingText(this.bird.x, this.bird.y - 30, '减速!', '#1abc9c', 50)
        break
      }
      case 'missile': {
        // [v1.3.0] 导弹：拾取即发射（弱追踪，怪物优先）
        // [v1.4.0] 导弹风暴：拾取改 (4+lv)s 连发（每秒2枚，AbilitySystem 计时 fx 节拍）；
        // 期间再拾取刷新时长（不叠加）；连发期间道具权重不变（防自喂养回路）
        const stormLv = this.abilitySystem.owned.get('missile_storm') || 0
        if (stormLv > 0) {
          this.abilitySystem.missileStormFrames =
            (Config.MISSILE.STORM_BASE_SEC + Config.MISSILE.STORM_SEC_PER_LV * stormLv) * 60
          this.abilitySystem._missileStormTick = 0
          this._addFloatingText(this.bird.x, this.bird.y - 42, '导弹风暴!', '#e67e22', 55)
        }
        this._fireMissile()
        break
      }
    }
  }

  // [v1.1.0] 添加浮动文字 [v1.1.4] 堆叠不重叠 + 向上移动渐隐
  _addFloatingText(x, y, text, color, life) {
    // [v1.1.4] 检查附近的浮动文字数量，向上偏移避免叠加
    let stackCount = 0
    for (const t of this.floatingTexts) {
      if (Math.abs(t.x - x) < 40 && Math.abs(t.y - y) < 30) {
        stackCount++
      }
    }
    const yOffset = stackCount * 18

    this.floatingTexts.push({
      x: x,
      y: y - yOffset,
      text: text,
      color: color,
      life: life,
      maxLife: life,
      vy: -1.5,              // 向上移动速度
      vyDecay: 0.02          // [v1.1.4] 速度衰减使末段减速
    })
  }

  // ==================== 碰撞处理 [v1.1.0] HP系统 ====================

  /**
   * 碰撞事件处理：无敌 > 时间扭曲 > 羽盾 > 统一护盾(弹力护盾优先) > 扣血(临时HP优先) > 凤凰 > 死亡
   * [v1.1.5] 统一护盾系统：shieldLayers > 0时消耗一层，
   *           若拥有弹力护盾则弹开，否则仅抵挡。
   * [v1.4.0] §2.6 受击链新节点：铁喙（怪物碰撞的无敌帧反杀分支，最前置，仅怪物）；
   *           羽盾（回响之翼/铁羽，最前置防御节点，破盾给无敌帧）；
   *           镜面护盾（护盾层消耗时冲击波，挂在 consumeShield 内）；
   *           超载神盾（临时HP先于HP扣减，挂在 takeDamage 内）；
   *           血契（maxHp 修正，挂在 _recalcMaxHp）；
   *           求生本能（HP 扣减后补盾，挂在 takeDamage 内，凤凰之前）
   * @param {Object} [pipe] - 碰撞的管道/怪物对象（用于判断弹开方向），地面/天花板碰撞时不传
   * @returns {boolean} true=游戏结束, false=继续
   */
  _handleCollision(pipe) {
    // [v1.4.0] 铁喙：受击无敌帧期间撞怪反杀且免伤（对管道无效；对 Boss 免疫，isBoss 分支预留）
    if (pipe && pipe.type === 'monster' && !pipe.isBoss &&
        this.abilitySystem.invincibleFrames > 0) {
      const beakLv = this.abilitySystem.owned.get('iron_beak') || 0
      if (beakLv > 0) {
        pipe.takeDamage(beakLv)
        this._addFloatingText(pipe.x + pipe.width / 2, pipe.y - 20, '铁喙反杀!', '#ffaa00', 40)
        Logger.info('Monster', '铁喙反杀', { type: pipe.monsterType, damage: beakLv, hp: pipe.hp })
        if (pipe.hp <= 0) {
          this._onMonsterKilled(pipe)  // 尸体由 _updateMonsters 的 hp<=0 分支回收
        }
        this.bird.invincibleBlink = 20
        return false  // 免伤
      }
    }

    // 无敌状态
    if (this.abilitySystem.invincibleFrames > 0) {
      Logger.debug('Collision', '无敌中，忽略碰撞', { invincibleFrames: this.abilitySystem.invincibleFrames })
      this.bird.invincibleBlink = 20
      return false
    }

    // 时间扭曲激活中
    if (this.abilitySystem.timeWarpActive > 0) {
      Logger.debug('Collision', '时间扭曲中，忽略碰撞')
      this.bird.invincibleBlink = 20
      return false
    }

    // [v1.5.0] C7 厚皮（thick_skin）：0.3/级概率格挡怪系伤害（怪物/召唤物/Boss本体/羽刃弹幕；
    // 管道/地面/天花板不格挡——C7 是"怪系生存卡"）。位置：时间扭曲之后、羽盾之前（廉价概率节点前置，
    // 保住稀缺的羽盾/护盾层）。格挡成功断连击（与羽盾 N1 同语义，受击链内被命中即断）
    if (pipe && (pipe.type === 'monster' || pipe.type === 'boss' || pipe.type === 'feather')) {
      const thickLv = this.abilitySystem.owned.get('thick_skin') || 0
      if (thickLv > 0 && Math.random() < Config.ABILITY.THICK_SKIN_BLOCK_PER_LV * thickLv) {
        this.abilitySystem.resetCombo()
        this.bird.invincibleBlink = 20
        this.shakeFrames = 4
        this.shakeIntensity = 2
        this._addFloatingText(this.bird.x, this.bird.y - 30, '厚皮格挡!', '#cd7f32', 40)
        Logger.info('Ability', '厚皮格挡', { lv: thickLv, source: pipe.type })
        return false
      }
    }

    // [v1.4.0] 羽盾（回响之翼/铁羽）：§2.6 受击链最前置防御节点——挡 1 次伤害；
    // 铁羽：破羽盾给 30 帧/级无敌（consumeFeatherShield 内结算）；消耗断连击（N1 同语义）
    if (this.abilitySystem.consumeFeatherShield()) {
      this.bird.invincibleBlink = 20
      this.shakeFrames = 4
      this.shakeIntensity = 2
      return false
    }

    // [v1.1.5] 统一护盾——消耗一层护盾
    if (this.abilitySystem.shieldLayers > 0) {
      const hasBounceShield = (this.abilitySystem.owned.get('bounce_shield') || 0) > 0
      this.abilitySystem.consumeShield()

      if (hasBounceShield) {
        // [v1.1.5] 弹力护盾——向碰撞反方向弹出
        if (pipe) {
          // 管道碰撞：根据小鸟在管道间隙中的位置判断弹开方向
          const gapCenter = pipe.topHeight + pipe.gap / 2
          if (this.bird.y < gapCenter) {
            // 小鸟偏上——向下弹
            this.bird.velocity = Math.abs(this.bird.flapForce) * Config.SHIELD.BOUNCE_VEL_DOWN
          } else {
            // 小鸟偏下——向上弹
            this.bird.velocity = this.bird.flapForce * Config.SHIELD.BOUNCE_VEL_UP
          }
        } else {
          // 地面/天花板碰撞
          if (this.bird.y < this.screenH * 0.12) {
            this.bird.velocity = Math.abs(this.bird.flapForce) * Config.SHIELD.BOUNCE_VEL_DOWN
          } else {
            this.bird.velocity = this.bird.flapForce * Config.SHIELD.BOUNCE_VEL_UP
          }
        }
        this.bird.invincibleBlink = 20
        this.abilitySystem.invincibleFrames = 20
        this.shakeFrames = 4
        this.shakeIntensity = 2
        this._addFloatingText(this.bird.x, this.bird.y - 25, '弹开!', '#3498db', 35)
        Logger.info('Collision', '弹力护盾弹开', { shieldLayers: this.abilitySystem.shieldLayers })
      } else {
        // 普通护盾抵挡
        this.bird.invincibleBlink = 30
        this.abilitySystem.invincibleFrames = 60
        this.shakeFrames = 6
        this.shakeIntensity = 3
        Logger.info('Collision', '护盾抵挡', { shieldLayers: this.abilitySystem.shieldLayers })
      }
      return false
    }

    // [v1.1.0] 扣血
    const dead = this.abilitySystem.takeDamage()
    this.damageFlash = 15   // 红屏闪烁
    this.shakeFrames = 8
    this.shakeIntensity = 4
    this.bird.invincibleBlink = 30
    this.abilitySystem.invincibleFrames = this.abilitySystem.getInvincibleFrames()
    // [v1.5.0] U8 猎手直觉（boss_slayer）：Boss 战中受击额外 +30 帧/级无敌（Boss 战高压补偿）
    if (!dead && this.chapterSystem.isBossActive()) {
      const slayerLv = this.abilitySystem.owned.get('boss_slayer') || 0
      if (slayerLv > 0) {
        this.abilitySystem.invincibleFrames += Config.ABILITY.BOSS_SLAYER_INVINCIBLE_PER_LV * slayerLv
      }
    }

    if (dead) {
      // 凤凰复活
      if (this.abilitySystem.tryPhoenix()) {
        this._startPhoenixRevive()
        return false
      }

      // [v1.5.0] Boss 战战败保护（方案A，D19）：致死一击已走完整受击链（上方格挡/羽盾/护盾
      // 均未拦住），HP 真归零时不 gameover——HP 钳 1 + 无敌 120 帧 + Boss 长鸣离场，20 管后满血回归。
      // 边界：maxHp===1（血契流）无血可扣不兜底（方案原文"战败=死"）；凤凰优先（上方已判）。
      if (this.chapterSystem.isBossActive() && this.abilitySystem.maxHp > 1) {
        return this._onBossDefeat()
      }

      // 真正死亡
      this._gameOver()
      return true
    }

    // 存活但受伤
    Logger.info('Collision', '受到伤害', { hp: this.abilitySystem.hp, maxHp: this.abilitySystem.maxHp })
    this._addFloatingText(this.bird.x, this.bird.y - 20, '-1 HP', '#ff4444', 40)
    return false
  }

  _checkActiveAbilities() {
    const birdRight = this.bird.x + this.bird.collisionWidth / 2

    for (const pipe of this.pipes) {
      if (pipe.x > birdRight || pipe.x + pipe.width < this.bird.x - this.bird.collisionWidth / 2 - 30) {
        continue
      }

      const birdTop = this.bird.y - this.bird.collisionHeight / 2
      const birdBottom = this.bird.y + this.bird.collisionHeight / 2
      const distToTop = birdTop - pipe.topHeight
      const distToBottom = pipe.bottomY - birdBottom
      const minDist = Math.min(distToTop, distToBottom)

      if (minDist < 8 && minDist > 0) {
        // [v1.2.2] N4 瞬移（史诗）优先判定，解除时间扭曲对瞬移的遮蔽；
        // 二者独立CD，各自可触发
        if (this.abilitySystem.tryTeleport()) {
          this.bird.y = pipe.topHeight + pipe.gap / 2
          this.bird.velocity = 0
          this.bird.invincibleBlink = 30
          this.abilitySystem.invincibleFrames = 30  // [v1.1.2] 瞬移后给实际无敌帧防止立即再碰撞
          return
        }

        if (this.abilitySystem.tryTimeWarp()) {
          // [v1.4.0] 时之晶：寄生时间扭曲同一触发点（同 CD 同源，不独立计时器——规避 N4 遮蔽的正确姿势），
          // 冻结怪物/弹幕 (1+0.5(lv-1))s，鸟可动；未持时间扭曲时本卡无效（选牌 UI 灰显）
          const tcLv = this.abilitySystem.owned.get('time_crystal') || 0
          if (tcLv > 0) {
            this.abilitySystem.timeCrystalFreezeFrames = Math.round(
              (Config.ABILITY.TIME_CRYSTAL_BASE_SEC +
                Config.ABILITY.TIME_CRYSTAL_PER_LV_SEC * (tcLv - 1)) * 60)
            this._addFloatingText(this.bird.x, this.bird.y - 40, '时之晶·冻结!', '#aee6ff', 50)
            Logger.info('Ability', '时之晶冻结触发', { lv: tcLv, frames: this.abilitySystem.timeCrystalFreezeFrames })
          }
          return
        }
      }
    }
  }

  // [v1.2.0] 凤凰复活动画

  _startPhoenixRevive() {
    this.phoenixAnim = {
      phase: 'pause',      // 'pause' → 'revive' → null
      timer: 60,           // 暂停60帧(1s)
      maxTimer: 60,
      particles: []
    }
    Logger.info('Ability', '凤凰复活动画开始', { phoenixUsed: this.abilitySystem.phoenixUsed })
  }

  _updatePhoenixAnim() {
    const anim = this.phoenixAnim
    if (!anim) return

    anim.timer--

    if (anim.phase === 'pause') {
      // 暂停阶段：等待计时结束
      if (anim.timer <= 0) {
        // 进入复活动画阶段
        anim.phase = 'revive'
        anim.timer = 30
        anim.maxTimer = 30

        // 重置小鸟到屏幕中间
        const birdX = this.screenW * Config.BIRD.X_RATIO
        const birdY = this.screenH * 0.45
        this.bird.reset(birdX, birdY)
        this.bird.invincibleBlink = 60
        this.abilitySystem.invincibleFrames = 120

        // 生成火凤凰粒子
        for (let i = 0; i < 20; i++) {
          const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.3
          const speed = 2 + Math.random() * 3
          anim.particles.push({
            x: birdX,
            y: birdY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 30,
            maxLife: 30,
            size: 3 + Math.random() * 4,
            color: Math.random() < 0.5 ? '#ff6600' : '#ffaa00'
          })
        }
      }
    } else if (anim.phase === 'revive') {
      // 复活动画阶段：更新粒子
      for (let i = anim.particles.length - 1; i >= 0; i--) {
        const p = anim.particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.95
        p.vy *= 0.95
        p.life--
        if (p.life <= 0) {
          anim.particles.splice(i, 1)
        }
      }

      if (anim.timer <= 0) {
        // 动画结束，恢复游戏
        this.phoenixAnim = null
        this._addFloatingText(this.bird.x, this.bird.y, '复活!', '#ff6600', 60)
        Logger.info('Ability', '凤凰复活完成')
      }
    }
  }

  _drawPhoenixAnim() {
    const anim = this.phoenixAnim
    if (!anim) return
    const ctx = this.ctx
    const cx = this.bird.x
    const cy = this.bird.y

    if (anim.phase === 'pause') {
      // 暂停阶段：暗色遮罩 + 提示文字
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(0, 0, this.screenW, this.screenH)

      const progress = 1 - anim.timer / anim.maxTimer
      ctx.font = 'bold 24px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = `rgba(255, 102, 0, ${0.5 + progress * 0.5})`
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 3
      ctx.strokeText('凤凰复活!', cx, cy - 40)
      ctx.fillText('凤凰复活!', cx, cy - 40)

      // 凤凰印记图标
      ctx.font = '32px sans-serif'
      ctx.fillText('🔥', cx, cy)
    } else if (anim.phase === 'revive') {
      // 复活动画：火凤凰翅膀 + 粒子
      const progress = 1 - anim.timer / anim.maxTimer

      // 火凤凰翅膀（展开→消失）
      const wingSize = 40 * Math.sin(progress * Math.PI)
      ctx.save()
      ctx.translate(cx, cy)

      // 左翅
      ctx.fillStyle = `rgba(255, 100, 0, ${0.6 * (1 - progress)})`
      ctx.beginPath()
      ctx.ellipse(-wingSize * 0.5, 0, wingSize, wingSize * 0.4, -0.3, 0, Math.PI * 2)
      ctx.fill()

      // 右翅
      ctx.beginPath()
      ctx.ellipse(wingSize * 0.5, 0, wingSize, wingSize * 0.4, 0.3, 0, Math.PI * 2)
      ctx.fill()

      // 中心光晕
      const glowR = 30 * (1 - progress * 0.5)
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR)
      grad.addColorStop(0, `rgba(255, 200, 0, ${0.6 * (1 - progress * 0.5)})`)
      grad.addColorStop(1, 'rgba(255, 100, 0, 0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(0, 0, glowR, 0, Math.PI * 2)
      ctx.fill()

      ctx.restore()

      // 粒子
      for (const p of anim.particles) {
        const alpha = p.life / p.maxLife
        ctx.fillStyle = p.color
        ctx.globalAlpha = alpha
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }
  }

  // ==================== 游戏结束 ====================

  _gameOver() {
    Logger.warn('Game', '游戏结束', {
      score: this.score,
      bestScore: this.bestScore,
      level: this.expSystem.level,
      pipesPassed: this.pipesPassed,
      gameTime: this.gameTime,
      abilities: this.abilitySystem.getOwnedList().map(a => `${a.def.id}:L${a.level}`)
    })
    this.state = Config.GAME.STATE.GAME_OVER
    this.shakeFrames = 12
    this.shakeIntensity = 6
    this.damageFlash = 20
    this.abilitySystem.resetCombo()

    if (this.score > this.bestScore) {
      this.bestScore = this.score
    }
    if (this.onGameOver) {
      this.onGameOver(this.score, this.bestScore, this.expSystem.level, this.abilitySystem.getOwnedList())
    }
  }

  // ==================== 渲染逻辑 ====================

  render() {
    const ctx = this.ctx

    let shakeX = 0, shakeY = 0
    if (this.shakeFrames > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity
      shakeY = (Math.random() - 0.5) * this.shakeIntensity
    }

    ctx.save()
    ctx.translate(shakeX, shakeY)

    this._drawBackground()
    this._drawClouds()
    this._drawChapterScenery()   // [v1.5.0] 章节背景元素（Ch2 沙漠：太阳/沙丘/热浪；Ch1 无新增，零变化）

    // [v1.1.0] 速度包边框特效
    if (this.abilitySystem.speedPackFrames > 0) {
      this._drawSpeedPackBorder()
    }

    for (const pipe of this.pipes) pipe.render(ctx)
    this._drawPipeSense()   // [v1.4.0] 管感：高亮下一根管道间隙
    for (const monster of this.monsters) monster.render(ctx)   // [v1.3.0]
    if (this.boss) this.boss.render(ctx)                       // [v1.5.0] Boss 本体（含冲锋预警/阶段变色）
    for (const f of this.feathers) f.render(ctx)               // [v1.5.0] Boss 羽刃弹幕
    for (const missile of this.missiles) missile.render(ctx)   // [v1.3.0]
    for (const orb of this.orbs) orb.render(ctx)
    for (const item of this.items) item.render(ctx)   // [v1.1.0]

    this._drawNearMissEffects()

    // [v1.1.1] 能力光环特效（磁吸/狂暴/时间扭曲）
    this._drawAbilityAuras()

    // [v1.2.2] N7 能力内联特效（自愈十字/护盾环/二段跳尾迹）
    this._drawAbilityEffects()

    // [v1.2.0] 环境效果渲染（在障碍物和小鸟之间）
    const weatherGameCtx = this._buildGameCtx()
    this.weatherSystem.render(ctx, this.screenW, this.screenH, weatherGameCtx)

    // [v1.1.5] 统一护盾：传递护盾层数给Bird渲染
    const shieldLayers = this.abilitySystem.shieldLayers
    this.bird.render(ctx, shieldLayers)

    this._drawGround()
    ctx.restore()

    // [v1.2.0] 凤凰复活动画渲染（在震动恢复后，覆盖层之前）
    if (this.phoenixAnim) {
      this._drawPhoenixAnim()
    }

    // [v1.1.0] 受击红屏
    if (this.damageFlash > 0) {
      ctx.fillStyle = `rgba(255, 0, 0, ${this.damageFlash / 20 * 0.3})`
      ctx.fillRect(0, 0, this.screenW, this.screenH)
    }

    // [v1.1.0] 浮动文字
    this._drawFloatingTexts()

    // HUD（不受震动影响）
    this._drawHUD()

    // [v1.5.0] 章节转场演出覆盖层（§4.3：白闪/色带擦除/标题卡，覆盖世界与 HUD）
    if (this.chapterSystem.isTransitioning()) {
      this._drawChapterTransition()
    }

    // [v1.5.0] Boss 出场演出覆盖层（§4.11：暗角收拢30帧，gather/enter 阶段保持半暗角聚焦）
    if (this.chapterSystem.isBossIntro()) {
      this._drawBossIntro()
    }

    // 状态覆盖层
    if (this.state === Config.GAME.STATE.READY) {
      this._drawReadyOverlay()
    } else if (this.state === Config.GAME.STATE.UPGRADING) {
      this._drawUpgradeOverlay()
    } else if (this.state === Config.GAME.STATE.GAME_OVER) {
      this._drawGameOverOverlay()
    }
  }

  _drawBackground() {
    const ctx = this.ctx
    // [v1.5.0] 天空渐变按章节参数（§4.2）；Ch1 色值原样录入 CHAPTERS，渲染零变化
    const visual = this.chapterSystem.getVisual()
    const gradient = ctx.createLinearGradient(0, 0, 0, this.screenH)
    gradient.addColorStop(0, visual.skyTop)
    gradient.addColorStop(1, visual.skyBottom)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.screenW, this.screenH)
  }

  _drawClouds() {
    // [v1.5.0] 章节背景元素开关：Ch2 沙漠无云（§4.2）；Ch1 clouds=true 零变化
    if (!this.chapterSystem.getVisual().clouds) return
    const ctx = this.ctx
    ctx.fillStyle = Config.VISUAL.CLOUD_COLOR
    for (const cloud of this.clouds) {
      ctx.beginPath()
      ctx.arc(cloud.x, cloud.y, cloud.size * 0.5, 0, Math.PI * 2)
      ctx.arc(cloud.x + cloud.size * 0.4, cloud.y - cloud.size * 0.2, cloud.size * 0.4, 0, Math.PI * 2)
      ctx.arc(cloud.x + cloud.size * 0.7, cloud.y, cloud.size * 0.45, 0, Math.PI * 2)
      ctx.arc(cloud.x + cloud.size * 0.3, cloud.y + cloud.size * 0.15, cloud.size * 0.35, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  // [v1.5.0] 章节背景元素调度（§4.2 全部 Canvas 几何体 + 换色，零素材）
  _drawChapterScenery() {
    const visual = this.chapterSystem.getVisual()
    if (visual.theme === 'desert') {
      this._drawDesertScenery(visual)
    }
    // Ch1 meadow 无新增元素（云/天空/地面沿用原路径）；Ch3/Ch4 v1.6.0 占位不实现
  }

  /**
   * [v1.5.0] Ch2 沙漠背景元素（§4.2）：右上太阳+radial光晕、远景沙丘3条抛物线弧（0.5×视差）、
   * 热浪粒子（上升透明条，12 粒预算）。位置全部由 frameCount 推导，不消耗随机数。
   */
  _drawDesertScenery(visual) {
    const ctx = this.ctx
    const groundY = this.screenH - Config.GROUND.HEIGHT

    // 太阳（右上 40px 圆 + radial 光晕）
    const sunX = this.screenW - 70
    const sunY = 90
    const r = visual.sun.radius
    const glow = ctx.createRadialGradient(sunX, sunY, r * 0.5, sunX, sunY, r * 2.2)
    glow.addColorStop(0, 'rgba(255, 217, 59, 0.45)')
    glow.addColorStop(1, 'rgba(255, 217, 59, 0)')
    ctx.fillStyle = glow
    ctx.beginPath()
    ctx.arc(sunX, sunY, r * 2.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = visual.sun.color
    ctx.beginPath()
    ctx.arc(sunX, sunY, r, 0, Math.PI * 2)
    ctx.fill()

    // 远景沙丘 3 条抛物线弧（0.5× 视差滚动，循环周期 = 屏宽 + 240px）
    ctx.fillStyle = visual.duneColor
    const cycle = this.screenW + 240
    const scroll = (this.frameCount * 1.5) % cycle  // ≈0.5× 基准滚动速度
    for (let i = 0; i < 3; i++) {
      const peakY = groundY - 70 - i * 42
      const cx = this.screenW + 120 - ((scroll + i * 220) % cycle)
      ctx.beginPath()
      ctx.moveTo(cx - 170, groundY)
      ctx.quadraticCurveTo(cx, peakY, cx + 170, groundY)
      ctx.fill()
    }

    // 热浪粒子（上升透明条；x/相位由粒号推导，y 随帧号上升，无随机源）
    for (let i = 0; i < visual.heatParticles; i++) {
      const px = (i * 97 + 31) % this.screenW
      const span = groundY - 140
      const py = groundY - 20 - ((this.frameCount * (0.6 + (i % 3) * 0.25) + i * 61) % span)
      const alpha = 0.04 + 0.05 * (0.5 + 0.5 * Math.sin(this.frameCount * 0.05 + i))
      ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha.toFixed(3) + ')'
      ctx.fillRect(px, py, 2, 14)
    }
  }

  /**
   * [v1.5.0] 章节转场演出（§4.3）：白闪10帧 → 色带擦除60帧（新章底色从左推入）
   * → 标题卡90帧（"第二章 · 沙漠" + 副标）。转场期间世界冻结（update 只推进转场计时）。
   */
  _drawChapterTransition() {
    const tr = this.chapterSystem.getTransitionRenderState()
    if (!tr) return
    const ctx = this.ctx
    const T = Config.CHAPTERS.TRANSITION

    if (tr.phase === 'flash') {
      // 全屏白闪（渐隐）
      const alpha = 1 - (tr.frame / T.FLASH_FRAMES) * 0.85
      ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha.toFixed(3) + ')'
      ctx.fillRect(0, 0, this.screenW, this.screenH)
    } else if (tr.phase === 'wipe') {
      // 横向色带擦除：新章天空渐变从左推入
      const w = this.screenW * (tr.frame / T.WIPE_FRAMES)
      const gradient = ctx.createLinearGradient(0, 0, 0, this.screenH)
      gradient.addColorStop(0, tr.toVisual.skyTop)
      gradient.addColorStop(1, tr.toVisual.skyBottom)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, w, this.screenH)
    } else if (tr.phase === 'title') {
      // 章节标题卡：横向色带 + 章节名大字 + 副标（淡入淡出各 15 帧）
      const cx = this.screenW / 2
      const cy = this.screenH * 0.4
      const fade = Math.min(1, tr.frame / 15, (T.TITLE_FRAMES - tr.frame) / 15)
      ctx.globalAlpha = Math.max(0, fade)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
      ctx.fillRect(0, cy - 60, this.screenW, 120)
      ctx.font = 'bold 30px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 4
      ctx.strokeStyle = '#000000'
      ctx.fillStyle = '#ffffff'
      ctx.strokeText(tr.title, cx, cy - 10)
      ctx.fillText(tr.title, cx, cy - 10)
      ctx.font = 'bold 15px monospace'
      ctx.fillStyle = '#ffd700'
      ctx.strokeText(tr.subtitle, cx, cy + 28)
      ctx.fillText(tr.subtitle, cx, cy + 28)
      ctx.globalAlpha = 1.0
    }
  }

  /**
   * [v1.5.0] Boss 出场演出覆盖层（§4.11）：暗角收拢 30 帧（四周黑色径向压迫）
   * → gather/enter 阶段保持半强度暗角聚焦战场；"雷云聚集……"文案由 ChapterSystem 浮动文字呈现。
   */
  _drawBossIntro() {
    const st = this.chapterSystem.getBossIntroRenderState()
    if (!st) return
    const ctx = this.ctx
    const B = Config.BOSS
    let strength
    if (st.phase === 'vignette') {
      strength = st.frame / B.INTRO_VIGNETTE_FRAMES        // 0 → 1 收拢
    } else {
      strength = 0.75                                       // gather/enter 保持聚焦
    }
    const maxA = 0.55 * Math.min(1, strength)
    // 四边暗角（上/下/左/右渐变压黑）
    const edge = Math.round(this.screenH * 0.22)
    const grads = [
      ctx.createLinearGradient(0, 0, 0, edge),
      ctx.createLinearGradient(0, this.screenH, 0, this.screenH - edge),
      ctx.createLinearGradient(0, 0, edge, 0),
      ctx.createLinearGradient(this.screenW, 0, this.screenW - edge, 0)
    ]
    for (let i = 0; i < 4; i++) {
      grads[i].addColorStop(0, 'rgba(10, 8, 20, ' + maxA.toFixed(3) + ')')
      grads[i].addColorStop(1, 'rgba(10, 8, 20, 0)')
      ctx.fillStyle = grads[i]
      if (i === 0) ctx.fillRect(0, 0, this.screenW, edge)
      else if (i === 1) ctx.fillRect(0, this.screenH - edge, this.screenW, edge)
      else if (i === 2) ctx.fillRect(0, 0, edge, this.screenH)
      else ctx.fillRect(this.screenW - edge, 0, edge, this.screenH)
    }
  }

  /**
   * [v1.5.0] Boss 血条（§4.9）：顶部居中宽 60% 高 10px，金色描边；
   * P2 填充变红 + 名称后缀"·怒"。entering/dying 期血条照常显示（演出可见性）。
   * @param {number} cx - 中心 X
   * @param {number} cy - 中心 Y
   */
  _drawBossHPBar(cx, cy) {
    const boss = this.boss
    if (!boss || boss.maxHp <= 0) return
    const ctx = this.ctx
    const barW = this.screenW * Config.BOSS.HP_BAR_WIDTH_RATIO
    const barH = Config.BOSS.HP_BAR_HEIGHT
    const barX = cx - barW / 2
    const barY = cy - barH / 2
    const ratio = Math.max(0, boss.hp / boss.maxHp)

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4)
    ctx.fillStyle = boss.phase === 2 ? '#e03030' : '#c04ae0'
    if (ratio > 0) ctx.fillRect(barX, barY, barW * ratio, barH)
    ctx.strokeStyle = '#ffd700'
    ctx.lineWidth = 1.5
    ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4)

    ctx.font = 'bold 10px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 3
    ctx.strokeStyle = '#000000'
    ctx.fillStyle = '#ffffff'
    const label = boss.name + (boss.phase === 2 ? ' · 怒' : '') + ` ${Math.max(0, boss.hp)}/${boss.maxHp}`
    ctx.strokeText(label, cx, barY + barH + 9)
    ctx.fillText(label, cx, barY + barH + 9)
  }

  // [v1.1.0] 速度包边框特效
  _drawSpeedPackBorder() {
    const ctx = this.ctx
    const alpha = Math.min(this.abilitySystem.speedPackFrames / 60, 1) * 0.4
    ctx.strokeStyle = `rgba(26, 188, 156, ${alpha})`
    ctx.lineWidth = 6
    ctx.strokeRect(3, 3, this.screenW - 6, this.screenH - 6)
  }

  /**
   * [v1.4.0] 管感（pipe_sense）：高亮下一根管道间隙
   * Lv1 间隙金色轮廓；Lv2 追加间隙中心 ±30px 半透明安全区渐亮带。
   * 高亮必须淡（alpha ≤0.35，取 SENSE_ALPHA=0.3），浓了会遮蔽擦边金环的视觉优先级；
   * 安全区宽度固定 ±30px，不随等级扩大（避免变成"自动驾驶线"）。
   * 纯信息卡、零数值。
   */
  _drawPipeSense() {
    const lv = this.abilitySystem.owned.get('pipe_sense') || 0
    if (lv <= 0) return

    // 下一根管道 = 小鸟前方最近（最紧迫）的管道
    const bird = this.bird
    let next = null
    for (const p of this.pipes) {
      if (p.x + p.width > bird.x - bird.collisionWidth / 2) {
        if (!next || p.x < next.x) next = p
      }
    }
    if (!next) return

    const ctx = this.ctx
    const alpha = Config.PIPE.SENSE_ALPHA
    const gapTop = next.topHeight
    const gapH = next.gap

    // Lv1/Lv2 共有：间隙金色轮廓
    ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`
    ctx.lineWidth = 2
    ctx.strokeRect(next.x, gapTop, next.width, gapH)

    // Lv2 追加：间隙中心 ±30px 渐亮安全区
    if (lv >= 2) {
      const half = Config.PIPE.SENSE_ZONE_HALF
      const centerY = gapTop + gapH / 2
      const grad = ctx.createLinearGradient(0, centerY - half, 0, centerY + half)
      grad.addColorStop(0, 'rgba(255, 215, 0, 0)')
      grad.addColorStop(0.5, `rgba(255, 215, 0, ${alpha})`)
      grad.addColorStop(1, 'rgba(255, 215, 0, 0)')
      ctx.fillStyle = grad
      ctx.fillRect(next.x, centerY - half, next.width, half * 2)
    }
  }

  // [v1.1.4] 增强擦边特效：多环扩散 + 粒子爆发 + 中心闪光
  _drawNearMissEffects() {
    const ctx = this.ctx

    for (const e of this.nearMissEffects) {
      // 中心闪光（最短暂，最亮）
      if (e.flashLife > 0) {
        const flashAlpha = (e.flashLife / e.flashMaxLife) * 0.5
        ctx.fillStyle = `rgba(255, 255, 200, ${flashAlpha})`
        ctx.beginPath()
        ctx.arc(e.x, e.y, 20, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha * 0.8})`
        ctx.beginPath()
        ctx.arc(e.x, e.y, 10, 0, Math.PI * 2)
        ctx.fill()
      }

      // 多环扩散
      if (e.rings) {
        for (const ring of e.rings) {
          if (ring.life <= 0) continue
          const progress = 1 - ring.life / ring.maxLife
          const radius = ring.radius + (ring.maxRadius - ring.radius) * progress
          const alpha = (1 - progress) * 0.8

          // 外圈光环
          ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`
          ctx.lineWidth = ring.lineWidth
          ctx.beginPath()
          ctx.arc(e.x, e.y, radius, 0, Math.PI * 2)
          ctx.stroke()

          // 内圈光晕
          ctx.fillStyle = `rgba(255, 215, 0, ${alpha * 0.12})`
          ctx.beginPath()
          ctx.arc(e.x, e.y, radius * 0.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // 粒子爆发
      if (e.sparkles) {
        for (const sp of e.sparkles) {
          if (sp.life <= 0) continue
          const spAlpha = sp.life / sp.maxLife
          // 粒子尾迹
          ctx.fillStyle = `rgba(255, 215, 0, ${spAlpha * 0.4})`
          ctx.beginPath()
          ctx.arc(sp.x - sp.vx * 0.5, sp.y - sp.vy * 0.5, 3, 0, Math.PI * 2)
          ctx.fill()
          // 粒子核心
          ctx.fillStyle = `rgba(255, 255, 200, ${spAlpha})`
          ctx.beginPath()
          ctx.arc(sp.x, sp.y, 2.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
  }

  // [v1.1.1] 能力光环特效
  _drawAbilityAuras() {
    const ctx = this.ctx

    // 磁吸光环——显示吸引范围
    const attractRange = this.abilitySystem.getStat('orbAttractRange')
    if (attractRange > Config.ORB.ATTRACT_RANGE) {
      ctx.save()
      ctx.translate(this.bird.x, this.bird.y)
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.12)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.arc(0, 0, attractRange, 0, Math.PI * 2)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()
    }

    // 狂暴红色光环——HP=1时触发
    const berserkLv = this.abilitySystem.owned.get('berserk') || 0
    if (berserkLv > 0 && this.abilitySystem.hp <= 1) {
      ctx.save()
      ctx.translate(this.bird.x, this.bird.y)
      const pulse = Math.sin(this.frameCount * 0.2) * 0.3 + 0.7
      const auraR = this.bird.width * 0.8
      ctx.fillStyle = `rgba(255, 50, 50, ${0.15 * pulse})`
      ctx.beginPath()
      ctx.arc(0, 0, auraR, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = `rgba(255, 80, 80, ${0.5 * pulse})`
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.restore()
    }

    // 时间扭曲蓝色滤镜
    if (this.abilitySystem.timeWarpActive > 0) {
      ctx.fillStyle = 'rgba(100, 150, 255, 0.08)'
      ctx.fillRect(0, 0, this.screenW, this.screenH)
    }

    // [v1.2.2] N7 风暴之子金色光环——环境效果期间生效
    const stormLv = this.abilitySystem.owned.get('storm_child') || 0
    if (stormLv > 0 && this.abilitySystem.weatherActive) {
      ctx.save()
      ctx.translate(this.bird.x, this.bird.y)
      const pulse = Math.sin(this.frameCount * 0.15) * 0.3 + 0.7
      const auraR = this.bird.width * 0.9 + pulse * 4
      ctx.fillStyle = `rgba(255, 215, 0, ${0.12 * pulse})`
      ctx.beginPath()
      ctx.arc(0, 0, auraR, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = `rgba(255, 215, 0, ${0.55 * pulse})`
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.restore()
    }
  }

  /**
   * [v1.2.2] N7 能力内联特效渲染（粒子/扩散环，与擦边特效同风格）
   */
  _drawAbilityEffects() {
    const ctx = this.ctx
    for (const p of this.abilityEffects) {
      const alpha = p.life / p.maxLife
      if (p.kind === 'ring') {
        // 蓝色闪光环：半径随生命扩散
        const progress = 1 - alpha
        const radius = p.size + progress * 26
        ctx.strokeStyle = `rgba(${p.color}, ${alpha * 0.9})`
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.stroke()
      } else if (p.kind === 'cross') {
        // 绿色十字粒子
        const s = p.size
        ctx.strokeStyle = `rgba(${p.color}, ${alpha})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(p.x - s, p.y)
        ctx.lineTo(p.x + s, p.y)
        ctx.moveTo(p.x, p.y - s)
        ctx.lineTo(p.x, p.y + s)
        ctx.stroke()
      } else {
        // 白色尾迹圆点
        ctx.fillStyle = `rgba(${p.color}, ${alpha * 0.8})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  // [v1.1.0] 浮动文字渲染 [v1.1.4] 渐隐效果优化
  _drawFloatingTexts() {
    const ctx = this.ctx
    for (const t of this.floatingTexts) {
      // [v1.1.4] 前60%不透明，后40%线性渐隐
      const lifeRatio = t.life / t.maxLife
      const alpha = lifeRatio > 0.6 ? 1.0 : lifeRatio / 0.6
      ctx.globalAlpha = alpha
      ctx.font = 'bold 14px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 3
      ctx.strokeStyle = '#000000'
      ctx.fillStyle = t.color
      ctx.strokeText(t.text, t.x, t.y)
      ctx.fillText(t.text, t.x, t.y)
      ctx.globalAlpha = 1.0
    }
  }

  _drawGround() {
    const ctx = this.ctx
    const { GROUND, VISUAL } = Config
    // [v1.5.0] 地面配色按章节参数（§4.2）；Ch1 色值原样录入 CHAPTERS，渲染零变化
    const g = this.chapterSystem.getVisual().ground
    const groundY = this.screenH - GROUND.HEIGHT

    ctx.fillStyle = g.base
    ctx.fillRect(0, groundY, this.screenW, GROUND.HEIGHT)

    ctx.fillStyle = g.strip
    ctx.fillRect(0, groundY, this.screenW, 6)

    ctx.fillStyle = g.tileA
    for (let x = -this.groundOffset; x < this.screenW; x += GROUND.SCROLL_TILE) {
      ctx.fillRect(x, groundY + 6, 12, 4)
    }

    ctx.fillStyle = g.tileB
    for (let x = -this.groundOffset; x < this.screenW; x += GROUND.SCROLL_TILE) {
      ctx.fillRect(x + 6, groundY + 14, 8, 3)
    }

    ctx.fillStyle = VISUAL.PIPE_OUTLINE
    ctx.fillRect(0, groundY, this.screenW, 2)
  }

  // ==================== HUD 渲染 [v1.1.1] 重构布局 ====================

  _drawHUD() {
    if (this.state === Config.GAME.STATE.READY) return

    const ctx = this.ctx
    const { VISUAL, HP } = Config
    const topY = this.safeTop
    const expData = this.expSystem.getExpBarData()

    // ----- HP 心形（左上角）-----
    this._drawHPHearts(14, topY + 14, HP.HEART_SIZE, HP.HEART_GAP)

    // ----- 等级徽章（右上角）-----
    const badgeW = 54
    const badgeH = 22
    const badgeX = this.screenW - badgeW - 14
    const badgeY = topY + 3
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    this._roundRect(badgeX, badgeY, badgeW, badgeH, 11)
    ctx.fill()
    ctx.strokeStyle = '#ffd700'
    ctx.lineWidth = 1.5
    this._roundRect(badgeX, badgeY, badgeW, badgeH, 11)
    ctx.stroke()
    ctx.font = 'bold 13px monospace'
    ctx.fillStyle = '#ffd700'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`Lv.${expData.level}`, badgeX + badgeW / 2, badgeY + badgeH / 2)

    // ----- 分数（居中偏上）-----
    if (this.state === Config.GAME.STATE.PLAYING) {
      ctx.font = 'bold 34px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.lineWidth = 4
      ctx.strokeStyle = '#000000'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(this.score, this.screenW / 2, topY + 16)
    }

    // ----- 经验条（居中，分数下方）-----
    const barW = this.screenW * 0.6
    const barH = 10
    const barX = (this.screenW - barW) / 2
    const barY = topY + 40

    ctx.fillStyle = VISUAL.EXP_BAR_BG
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4)

    const fillW = barW * expData.progress
    ctx.fillStyle = VISUAL.EXP_BAR_FILL
    ctx.fillRect(barX, barY, fillW, barH)

    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1
    ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4)

    // ----- [v1.4.0] 经验银行小金库（经验条右侧：图标 + 余额数字）-----
    if (this.expSystem.bankEnabled) {
      ctx.font = '13px sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText('🏦', barX + barW + 8, barY + barH / 2)
      ctx.font = 'bold 10px monospace'
      ctx.fillStyle = VISUAL.EXP_BAR_FILL
      ctx.fillText(String(Math.floor(this.expSystem.bankBalance)), barX + barW + 24, barY + barH / 2)
    }

    // ----- [v1.5.0] 章节进度（§4.5：经验条下方 "Ch1 · 12/40"，≥35/40 金色脉冲）-----
    const chapterHud = this.chapterSystem.getHudData()
    const chapterY = barY + barH + 12
    ctx.font = 'bold 10px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    if (chapterHud.pulse) {
      // Boss 临近：金色呼吸脉冲
      ctx.globalAlpha = 0.55 + 0.45 * Math.sin(this.frameCount * 0.2)
      ctx.fillStyle = '#ffd700'
    } else {
      ctx.fillStyle = '#ffffff'
    }
    ctx.fillText(`Ch${chapterHud.id} · ${chapterHud.pipes}/${chapterHud.target}`, this.screenW / 2, chapterY)
    ctx.globalAlpha = 1.0

    // ----- [v1.5.0] Boss 血条（§4.9：顶部居中宽 60% 高 10px，P2 变红；Boss 战期间代替连击行）-----
    if (this.chapterSystem.isBossActive() && this.boss) {
      this._drawBossHPBar(this.screenW / 2, chapterY + 14)
    }

    // ----- 连击计数 -----
    // [v1.5.0] 章节进度占经验条下方第一行，连击/天气/驯化行依次顺延；Boss 战期间让位给血条
    const comboLv = this.abilitySystem.owned.get('combo_heart') || 0
    if (!this.chapterSystem.isBossActive() && comboLv > 0 && this.abilitySystem.comboCount > 0) {
      const threshold = this.abilitySystem.getStat('comboThreshold')
      ctx.font = 'bold 11px monospace'
      ctx.fillStyle = '#ffaa00'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`连击 ${this.abilitySystem.comboCount}/${threshold}`, this.screenW / 2, barY + barH + 26)
    }

    // ----- [v1.2.0] 环境状态指示器 -----
    const weatherInfo = this.weatherSystem.getActiveEffectInfo()
    if (weatherInfo.length > 0) {
      const icons = { wind: '💨', rain: '🌧️', hail: '🧊' }
      const colors = { wind: '#ffffff', rain: '#7eb8e0', hail: '#c0d8f0' }
      const indicatorY = barY + barH + 40
      let iconX = this.screenW / 2 - (weatherInfo.length - 1) * 30

      for (const info of weatherInfo) {
        ctx.font = '16px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(icons[info.type] || '?', iconX, indicatorY)

        ctx.font = 'bold 9px monospace'
        ctx.fillStyle = colors[info.type] || '#ffffff'
        ctx.fillText(`${info.remaining}s`, iconX, indicatorY + 14)

        iconX += 60
      }
    }

    // ----- [v1.2.0] 凤凰印记计数 -----
    // [v1.4.0] 心形区宽度含临时HP（空心心形），凤凰/羽盾标记顺延避免重叠
    const heartsW = (this.abilitySystem.maxHp + (this.abilitySystem.tempHp || 0)) * (HP.HEART_SIZE + HP.HEART_GAP)
    const phoenixLv = this.abilitySystem.owned.get('phoenix') || 0
    if (phoenixLv > 0) {
      const remaining = phoenixLv - this.abilitySystem.phoenixUsed
      const phoenixX = 14 + heartsW
      const phoenixY = topY + 14
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText('🔥', phoenixX, phoenixY)
      ctx.font = 'bold 11px monospace'
      ctx.fillStyle = remaining > 0 ? '#ff6600' : '#666666'
      ctx.fillText(`×${remaining}`, phoenixX + 16, phoenixY)
    }

    // ----- [v1.4.0] 羽盾图标（回响之翼/铁羽）：心形区右侧羽毛+层数 -----
    const echoLv = this.abilitySystem.owned.get('echo_wing') || 0
    if (echoLv > 0) {
      const featherX = 14 + heartsW + (phoenixLv > 0 ? 44 : 0)
      const featherY = topY + 14
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText('🪶', featherX, featherY)
      ctx.font = 'bold 11px monospace'
      ctx.fillStyle = this.abilitySystem.featherShields > 0 ? '#fff2c8' : '#666666'
      ctx.fillText(`×${this.abilitySystem.featherShields}`, featherX + 16, featherY)
      // 攒盾进度（过管计数/阈值）
      const need = Config.ABILITY.ECHO_WING_BASE_PIPES - Config.ABILITY.ECHO_WING_PIPES_REDUCTION * (echoLv - 1)
      ctx.fillStyle = '#aaaaaa'
      ctx.font = 'bold 9px monospace'
      ctx.fillText(`${this.abilitySystem.echoWingPipes}/${need}`, featherX + 16, featherY + 12)
    }

    // ----- [v1.4.0] 风暴驯化标记（已驯化天气徽章，无天气活跃时也常驻可见）-----
    if (this.weatherSystem.tamedWeather) {
      const tamed = this.weatherSystem.tamedWeather
      const tamedIcons = { wind: '💨', rain: '🌧️', hail: '🧊' }
      const tamedX = this.screenW / 2
      const hasWeatherRow = weatherInfo.length > 0
      const tamedY = hasWeatherRow ? barY + barH + 62 : barY + barH + 40
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#7fff7f'
      ctx.fillText(`🌈已驯化${tamedIcons[tamed] || ''}`, tamedX, tamedY)
    }

    // ----- 能力图标栏（底部安全区）-----
    const owned = this.abilitySystem.getOwnedList()
    if (owned.length > 0) {
      const iconSize = 28
      const gap = 6
      const totalW = owned.length * (iconSize + gap) - gap
      const startX = (this.screenW - totalW) / 2
      const iconY = this.safeBottom - iconSize - 8

      for (let i = 0; i < owned.length; i++) {
        const { def, level } = owned[i]
        const ix = startX + i * (iconSize + gap)

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
        ctx.beginPath()
        ctx.arc(ix + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1.5
        ctx.stroke()

        ctx.font = '16px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(def.icon, ix + iconSize / 2, iconY + iconSize / 2 - 2)

        ctx.fillStyle = '#ffd700'
        ctx.font = 'bold 9px monospace'
        ctx.fillText(`L${level}`, ix + iconSize / 2, iconY + iconSize - 4)
      }
    }
  }

  // [v1.1.1] HP 心形渲染——贝塞尔曲线心形，更大更清晰
  // [v1.4.0] 超载神盾：临时HP 以空心心形接在普通心形之后（视觉必须区分：空心 vs 实心）
  _drawHPHearts(x, y, size, gap) {
    const ctx = this.ctx
    const maxHp = this.abilitySystem.maxHp
    const currentHp = this.abilitySystem.hp

    for (let i = 0; i < maxHp; i++) {
      const cx = x + i * (size + gap) + size / 2
      const cy = y
      const filled = i < currentHp
      const s = size / 2

      // 贝塞尔曲线心形
      ctx.beginPath()
      ctx.moveTo(cx, cy + s * 0.7)
      ctx.bezierCurveTo(cx - s * 1.1, cy - s * 0.2, cx - s * 0.9, cy - s * 0.9, cx, cy - s * 0.2)
      ctx.bezierCurveTo(cx + s * 0.9, cy - s * 0.9, cx + s * 1.1, cy - s * 0.2, cx, cy + s * 0.7)
      ctx.closePath()

      if (filled) {
        ctx.fillStyle = '#ff4444'
      } else {
        ctx.fillStyle = 'rgba(60, 60, 60, 0.4)'
      }
      ctx.fill()

      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // 高光效果
      if (filled) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
        ctx.beginPath()
        ctx.arc(cx - s * 0.3, cy - s * 0.3, s * 0.2, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // [v1.4.0] 临时HP：空心心形（粉色描边+透明填充），与普通HP视觉区分
    const tempHp = this.abilitySystem.tempHp || 0
    for (let i = 0; i < tempHp; i++) {
      const cx = x + (maxHp + i) * (size + gap) + size / 2
      const cy = y
      const s = size / 2

      ctx.beginPath()
      ctx.moveTo(cx, cy + s * 0.7)
      ctx.bezierCurveTo(cx - s * 1.1, cy - s * 0.2, cx - s * 0.9, cy - s * 0.9, cx, cy - s * 0.2)
      ctx.bezierCurveTo(cx + s * 0.9, cy - s * 0.9, cx + s * 1.1, cy - s * 0.2, cx, cy + s * 0.7)
      ctx.closePath()

      ctx.fillStyle = 'rgba(255, 154, 160, 0.12)'
      ctx.fill()
      ctx.strokeStyle = '#ff9aa0'
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }

  // ==================== 触摸交互 ====================

  handleTouch(x, y) {
    if (this.state === Config.GAME.STATE.READY) {
      this.flap()
    } else if (this.state === Config.GAME.STATE.PLAYING) {
      this.flap()
    } else if (this.state === Config.GAME.STATE.UPGRADING) {
      if (this._cardBounds) {
        for (const card of this._cardBounds) {
          if (x >= card.x && x <= card.x + card.w &&
              y >= card.y && y <= card.y + card.h) {
            this.selectAbility(card.id)
            return
          }
        }
      }
    } else if (this.state === Config.GAME.STATE.GAME_OVER) {
      // [v1.1.1] 仅按钮可交互，点击其他区域无效
      if (this._restartBtnBounds) {
        const b = this._restartBtnBounds
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          this.restart()
          return
        }
      }
      if (this._homeBtnBounds) {
        const b = this._homeBtnBounds
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
          this.backToReady()
          return
        }
      }
      // 点击其他区域不做任何操作
    }
  }

  // ==================== 覆盖层渲染 ====================

  _drawReadyOverlay() {
    const ctx = this.ctx
    const cx = this.screenW / 2

    ctx.font = 'bold 32px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 4
    ctx.strokeStyle = '#000000'
    ctx.fillStyle = '#ffffff'
    ctx.strokeText('SNAPPY BIRD', cx, this.screenH * 0.25)
    ctx.fillText('SNAPPY BIRD', cx, this.screenH * 0.25)

    ctx.font = '14px monospace'
    ctx.fillStyle = '#333333'
    ctx.fillText('Roguelike 飞行生存', cx, this.screenH * 0.25 + 30)

    const blink = Math.floor(this.frameCount / 30) % 2 === 0
    if (blink) {
      ctx.font = 'bold 18px monospace'
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = '#000000'
      ctx.lineWidth = 3
      ctx.strokeText('点击屏幕开始', cx, this.screenH * 0.5)
      ctx.fillText('点击屏幕开始', cx, this.screenH * 0.5)
    }

    if (this.bestScore > 0) {
      ctx.font = '14px monospace'
      ctx.fillStyle = '#333333'
      ctx.fillText(`最高分: ${this.bestScore}`, cx, this.screenH * 0.58)
    }

    ctx.font = '12px monospace'
    ctx.fillStyle = '#555555'
    ctx.fillText('点击拍翅 · 躲避管道 · 升级能力', cx, this.screenH * 0.72)
    ctx.fillText('擦边通过获得额外奖励 · 拾取道具', cx, this.screenH * 0.72 + 20)
  }

  _drawUpgradeOverlay() {
    const ctx = this.ctx
    const cx = this.screenW / 2

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    ctx.fillRect(0, 0, this.screenW, this.screenH)

    ctx.font = 'bold 24px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffd700'
    // [v1.5.0] 面板标题按模式切换（大礼包自选/章节祝福/普通升级）
    const panelTitles = { bossCard: '章节大礼包!', blessing: '章节祝福', levelup: '升级!' }
    ctx.fillText(panelTitles[this._panelMode] || '升级!', cx, this.screenH * 0.15)

    ctx.font = '14px monospace'
    ctx.fillStyle = '#ffffff'
    const panelSubs = {
      bossCard: 'Boss 讨伐奖励 — 三选一',
      blessing: '选择一道祝福（本局永久）',
      levelup: `Lv.${this.expSystem.level} — 选择能力`
    }
    ctx.fillText(panelSubs[this._panelMode] || panelSubs.levelup, cx, this.screenH * 0.15 + 28)

    const choices = this._currentChoices || []
    if (choices.length === 0) return

    const ownedList = this.abilitySystem.getOwnedList()
    const n = choices.length
    const gap = 10
    const maxCardW = 130
    const cardH = 180
    const rowGap = 14

    // [v1.2.1] 卡牌数>4时改两行排布（如6张=3+3），保证单卡宽度与文字可读
    const useTwoRows = n > 4
    const perRow = useTwoRows ? Math.ceil(n / 2) : n
    const cardW = Math.min(maxCardW, (this.screenW - 40 - (perRow - 1) * gap) / perRow)
    const totalH = useTwoRows ? cardH * 2 + rowGap : cardH
    const cardY = (this.screenH - totalH) / 2 + 10

    this._cardBounds = []

    for (let i = 0; i < n; i++) {
      const ab = choices[i]
      const _found = ownedList.find(o => o.def.id === ab.id)
      const currentLevel = (_found ? _found.level : 0) || 0
      const row = Math.floor(i / perRow)
      const col = i % perRow
      // 末行不满时单独居中
      const rowCount = (useTwoRows && row > 0) ? (n - perRow) : perRow
      const rowStartX = (this.screenW - (rowCount * cardW + (rowCount - 1) * gap)) / 2
      const cardX = rowStartX + col * (cardW + gap)
      const thisCardY = cardY + row * (cardH + rowGap)

      this._cardBounds.push({ x: cardX, y: thisCardY, w: cardW, h: cardH, id: ab.id })
      // [v1.4.0] 批次2选牌 UI：灰显（缺前置卡）/ 先知协同标注 / 已驯化互斥标记
      this._drawCard(cardX, thisCardY, cardW, cardH, ab, currentLevel, {
        greyReason: this._getCardGreyReason(ab.id),
        tag: (this.abilitySystem.owned.get('oracle') || 0) > 0
          ? this.abilitySystem.getSynergyTag(ab.id, this.weatherSystem.tamedWeather) : null,
        tamedMarked: this._isCardTamedMutex(ab.id)
      })
    }
  }

  /**
   * [v1.4.0] 选牌灰显：缺前置卡的能力灰显提示（仍可点选，只是无效——保住构筑主权）
   * 铁羽需回响之翼（无则羽盾来源不存在）；时之晶需时间扭曲（寄生同一触发点，无则无触发位）
   * @returns {string|null} 灰显原因
   */
  _getCardGreyReason(id) {
    if (id === 'iron_feather' && !(this.abilitySystem.owned.get('echo_wing') > 0)) {
      return '需回响之翼'
    }
    if (id === 'time_crystal' && !(this.abilitySystem.owned.get('time_warp') > 0)) {
      return '需时间扭曲'
    }
    return null
  }

  /**
   * [v1.4.0] 风暴驯化互斥（D7）：已驯化天气对应的作废卡加"已驯化"标记（冰晶/顺风耳/雨衣）
   */
  _isCardTamedMutex(id) {
    const tamed = this.weatherSystem.tamedWeather
    if (!tamed) return false
    const mutex = Config.ABILITY.TAMED_MUTEX[tamed]
    return !!mutex && mutex.indexOf(id) >= 0
  }

  _drawCard(x, y, w, h, def, currentLevel, extras) {
    const ctx = this.ctx
    // [v1.4.0] extras：{ greyReason, tag, tamedMarked }（批次2选牌 UI）
    const greyReason = extras && extras.greyReason
    const tag = extras && extras.tag
    const tamedMarked = extras && extras.tamedMarked

    // [v1.1.3] 稀有度颜色
    const rarityColors = {
      common: { border: '#4a90d9', label: '普通', labelColor: '#aaaaaa' },
      uncommon: { border: '#2ecc71', label: '稀有', labelColor: '#2ecc71' },
      rare: { border: '#e74c3c', label: '珍贵', labelColor: '#e74c3c' },
      epic: { border: '#9b59b6', label: '史诗', labelColor: '#9b59b6' }
    }
    const rarity = rarityColors[def.rarity] || rarityColors.common
    const borderColor = rarity.border

    ctx.fillStyle = 'rgba(30, 30, 40, 0.95)'
    this._roundRect(x, y, w, h, 8)
    ctx.fill()

    ctx.strokeStyle = borderColor
    ctx.lineWidth = 3
    this._roundRect(x, y, w, h, 8)
    ctx.stroke()

    // [v1.4.0] 灰显：缺前置卡的整卡内容降透明度（边框保留稀有度色）
    if (greyReason) ctx.globalAlpha = 0.45

    const cx = x + w / 2

    ctx.font = '32px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(def.icon, cx, y + 35)

    ctx.font = 'bold 14px monospace'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(def.name, cx, y + 70)

    ctx.font = '12px monospace'
    ctx.fillStyle = '#ffd700'
    const nextLevel = currentLevel + 1
    if (currentLevel > 0) {
      ctx.fillText(`Lv.${currentLevel} → Lv.${nextLevel}`, cx, y + 88)
    } else {
      ctx.fillText(`新能力! Lv.${nextLevel}`, cx, y + 88)
    }

    // [v1.1.3] 稀有度标签
    ctx.font = 'bold 9px monospace'
    ctx.fillStyle = rarity.labelColor
    ctx.fillText(`[${rarity.label}]`, cx, y + 103)

    // [v1.4.0] 先知协同标注（⭐核心/🔗协同/⚠️反协同），与分类标签同行
    const catNames = { passive: '被动', active: '主动', special: '特殊' }
    const tagText = tag === 'core' ? ' ⭐核心' : tag === 'synergy' ? ' 🔗协同' : tag === 'anti' ? ' ⚠️反协同' : ''
    const tagColor = tag === 'core' ? '#ffd700' : tag === 'synergy' ? '#2ecc71' : tag === 'anti' ? '#ff6b6b' : '#888888'
    ctx.font = '10px monospace'
    ctx.fillStyle = '#888888'
    ctx.fillText(`[${catNames[def.category] || ''}]`, cx, y + 116)
    if (tagText) {
      ctx.fillStyle = tagColor
      ctx.fillText(tagText, cx + 18, y + 116)
    }

    ctx.font = '11px monospace'
    ctx.fillStyle = '#cccccc'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    const effectText = def.effectText(nextLevel)
    this._wrapText(effectText, x + 8, y + 130, w - 16, 15)

    // [v1.4.0] 灰显原因（底部）与驯化互斥标记（右上角）
    if (greyReason) {
      ctx.globalAlpha = 1
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#ff6b6b'
      ctx.fillText(greyReason, cx, y + h - 10)
    }
    if (tamedMarked) {
      ctx.font = 'bold 9px monospace'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'top'
      ctx.fillStyle = '#7fff7f'
      ctx.fillText('已驯化', x + w - 6, y + 6)
    }

    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
  }

  // [v1.1.0] 结算界面重设计
  _drawGameOverOverlay() {
    const ctx = this.ctx
    const cx = this.screenW / 2
    const safeTop = this.safeTop

    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
    ctx.fillRect(0, 0, this.screenW, this.screenH)

    // 标题
    ctx.font = 'bold 28px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ff4444'
    ctx.fillText('游戏结束', cx, safeTop + 40)

    // 分数
    ctx.font = 'bold 36px monospace'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(this.score, cx, safeTop + 85)

    ctx.font = '12px monospace'
    ctx.fillStyle = '#888888'
    ctx.fillText('本局得分', cx, safeTop + 110)

    // 数据面板
    const panelY = safeTop + 135
    const panelW = this.screenW * 0.8
    const panelX = (this.screenW - panelW) / 2
    const panelH = 90

    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
    this._roundRect(panelX, panelY, panelW, panelH, 8)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.lineWidth = 1.5
    this._roundRect(panelX, panelY, panelW, panelH, 8)
    ctx.stroke()

    // 数据行
    const colW = panelW / 2
    const rowH = 26
    const dataY = panelY + 12

    ctx.font = '13px monospace'
    ctx.textAlign = 'left'

    // 左列
    ctx.fillStyle = '#ffd700'
    ctx.fillText(`最高分: ${this.bestScore}`, panelX + 16, dataY)
    if (this.score > 0 && this.score >= this.bestScore) {
      ctx.fillStyle = '#ff6600'
      ctx.font = 'bold 11px monospace'
      ctx.fillText('新纪录!', panelX + 16 + 100, dataY)
      ctx.font = '13px monospace'
    }

    ctx.fillStyle = '#aaaaaa'
    const minutes = Math.floor(this.gameTime / 3600)
    const seconds = Math.floor((this.gameTime % 3600) / 60)
    ctx.fillText(`存活: ${minutes}'${String(seconds).padStart(2, '0')}"`, panelX + 16, dataY + rowH)

    // 右列
    ctx.fillStyle = '#aaaaaa'
    ctx.fillText(`通过管道: ${this.pipesPassed}`, panelX + colW + 16, dataY)

    ctx.fillStyle = '#4a90d9'
    ctx.fillText(`达到等级: Lv.${this.expSystem.level}`, panelX + colW + 16, dataY + rowH)

    ctx.textAlign = 'center'

    // [v1.5.0] Boss 讨伐徽章行（§4.10：每击杀一只 Boss 留下章节徽章，能力展示上方）
    let badgeRowH = 0
    if (this.bossBadges.length > 0) {
      const badgeY = panelY + panelH + 22
      ctx.font = '12px monospace'
      ctx.fillStyle = '#ffd700'
      ctx.fillText('讨伐徽章', cx, badgeY)
      const bSize = 24
      const bGap = 8
      const bTotalW = this.bossBadges.length * (bSize + bGap) - bGap
      let bx = (this.screenW - bTotalW) / 2
      for (const chId of this.bossBadges) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.18)'
        ctx.beginPath()
        ctx.arc(bx + bSize / 2, badgeY + 20, bSize / 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#ffd700'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.font = 'bold 10px monospace'
        ctx.fillStyle = '#ffd700'
        ctx.fillText(`Ch${chId}`, bx + bSize / 2, badgeY + 20)
        bx += bSize + bGap
      }
      badgeRowH = 44
    }

    // 能力展示
    const owned = this.abilitySystem.getOwnedList()
    if (owned.length > 0) {
      const abilityY = panelY + panelH + 25 + badgeRowH

      ctx.font = '12px monospace'
      ctx.fillStyle = '#888888'
      ctx.fillText('获得能力', cx, abilityY)

      const iconSize = 26
      const iconGap = 6
      const maxPerRow = Math.floor((this.screenW - 40) / (iconSize + iconGap))
      const totalW = Math.min(owned.length, maxPerRow) * (iconSize + iconGap) - iconGap
      const startX = (this.screenW - totalW) / 2
      const iconY = abilityY + 18

      for (let i = 0; i < owned.length; i++) {
        const { def, level } = owned[i]
        const row = Math.floor(i / maxPerRow)
        const col = i % maxPerRow
        const ix = startX + col * (iconSize + iconGap)
        const iy = iconY + row * (iconSize + iconGap + 4)

        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
        ctx.beginPath()
        ctx.arc(ix + iconSize / 2, iy + iconSize / 2, iconSize / 2, 0, Math.PI * 2)
        ctx.fill()

        ctx.font = '14px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(def.icon, ix + iconSize / 2, iy + iconSize / 2 - 1)

        ctx.font = 'bold 8px monospace'
        ctx.fillStyle = '#ffd700'
        ctx.fillText(`L${level}`, ix + iconSize / 2, iy + iconSize - 3)
      }
    }

    // [v1.1.1] 双按钮：返回首页 | 重新开始
    const btnW = 130
    const btnH = 42
    const btnGap = 16
    const totalBtnW = btnW * 2 + btnGap
    const btnStartX = (this.screenW - totalBtnW) / 2
    const btnY = this.safeBottom - 56

    // 返回首页按钮（左）
    const homeBtnX = btnStartX
    this._homeBtnBounds = { x: homeBtnX, y: btnY, w: btnW, h: btnH }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    this._roundRect(homeBtnX, btnY, btnW, btnH, 8)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.lineWidth = 2
    this._roundRect(homeBtnX, btnY, btnW, btnH, 8)
    ctx.stroke()
    ctx.font = 'bold 15px monospace'
    ctx.fillStyle = '#ffffff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('返回首页', homeBtnX + btnW / 2, btnY + btnH / 2)

    // 重新开始按钮（右）
    const restartBtnX = btnStartX + btnW + btnGap
    this._restartBtnBounds = { x: restartBtnX, y: btnY, w: btnW, h: btnH }
    const blink = Math.floor(this.frameCount / 30) % 2 === 0
    ctx.fillStyle = blink ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)'
    this._roundRect(restartBtnX, btnY, btnW, btnH, 8)
    ctx.fill()
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    this._roundRect(restartBtnX, btnY, btnW, btnH, 8)
    ctx.stroke()
    ctx.font = 'bold 15px monospace'
    ctx.fillStyle = '#ffffff'
    ctx.fillText('重新开始', restartBtnX + btnW / 2, btnY + btnH / 2)
  }

  // ==================== 工具方法 ====================

  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r)
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h)
    ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r)
    ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  }

  _wrapText(text, x, y, maxWidth, lineHeight) {
    const ctx = this.ctx
    const chars = text.split('')
    let line = ''
    let curY = y

    for (const ch of chars) {
      const testLine = line + ch
      if (ctx.measureText(testLine).width > maxWidth && line.length > 0) {
        ctx.fillText(line, x, curY)
        line = ch
        curY += lineHeight
      } else {
        line = testLine
      }
    }
    if (line) {
      ctx.fillText(line, x, curY)
    }
  }
}

module.exports = Game
