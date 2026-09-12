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
 * 框架无关——只依赖 Canvas 2D API，不直接调用微信SDK。
 */

const Config = require('../config/GameConfig.js')
const Bird = require('../entities/Bird.js')
const Pipe = require('../entities/Pipe.js')
const Monster = require('../entities/Monster.js')   // [v1.3.0]
const Missile = require('../entities/Missile.js')   // [v1.3.0]
const Orb = require('../entities/Orb.js')
const Item = require('../entities/Item.js')
const ExpSystem = require('../systems/ExpSystem.js')
const AbilitySystem = require('../systems/AbilitySystem.js')
const WeatherSystem = require('../systems/WeatherSystem.js')
const Logger = require('../systems/GameLogger.js')

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

    // 计时器
    this._distanceSinceSpawn = 0  // [v1.3.0] 距上次生成管道的累计滚动距离(px)，替代旧 spawnTimer(帧)
    this._monsterDistance = 0     // [v1.3.0] 距上次生成怪物的累计滚动距离(px)
    this.gameTime = 0
    this.frameCount = 0
    this.survivalTimer = 0
    this.pipesPassed = 0          // [v1.1.0] 通过管道计数
    this.itemSpawnTimer = 0       // [v1.1.1] 随机道具刷新计时器

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

    // [v1.4.0] 补给线保底道具计时器（与随机生成 itemSpawnTimer 独立）
    this.supplyLineTimer = 0

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
    this._distanceSinceSpawn = 0  // [v1.3.0]
    this._monsterDistance = 0     // [v1.3.0]
    this.frameCount = 0
    this.survivalTimer = 0
    this.pipesPassed = 0
    this.itemSpawnTimer = 0       // [v1.1.1] 随机道具刷新计时器
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
    this.supplyLineTimer = 0      // [v1.4.0] 补给线保底计时
    this._prevWeatherActive = false // [v1.4.0] 经验潮汐提示跟踪

    this.expSystem.reset()
    this.abilitySystem.reset()
    this.weatherSystem.reset()    // [v1.2.0] 环境系统重置

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
    this._distanceSinceSpawn = 0  // [v1.3.0]
    this._monsterDistance = 0     // [v1.3.0]
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
    this.itemSpawnTimer = 0       // [v1.1.1]
    this.supplyLineTimer = 0      // [v1.4.0] 补给线保底计时
    this._prevWeatherActive = false // [v1.4.0] 经验潮汐提示跟踪

    this.expSystem.reset()
    this.abilitySystem.reset()
    this.weatherSystem.reset()    // [v1.2.0] 环境系统重置

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
    Logger.info('LevelUp', '选择能力', { id: abilityId, currentLevel: this.abilitySystem.owned.get(abilityId) || 0 })
    this.abilitySystem.selectAbility(abilityId)
    this.abilitySystem.invalidateStats()

    // [v1.4.0] 经验银行：同步银行开关与生息率到 ExpSystem
    this.expSystem.configureBank(this.abilitySystem.owned.get('exp_bank') || 0)

    // [v1.4.0] 铁喙出场教学浮动文字（只提示一次）
    if (abilityId === 'iron_beak' && !this._ironBeakHintShown) {
      this._ironBeakHintShown = true
      this._addFloatingText(this.bird.x, this.bird.y - 45, '无敌中，撞怪反击！', '#ffaa00', 90)
    }

    this.expSystem.consumeLevelUp()
    this._currentChoices = null
    this._afterUpgrade()
  }

  _afterUpgrade() {
    if (this.expSystem.hasPendingLevelUp()) {
      this._triggerLevelUp()
    } else {
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
  }

  // ==================== 主循环 ====================

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

    // [v1.3.0] 管道生成改为距离制：累计滚动距离达标才生成
    // 修复减速 bug：速度包/时间扭曲只影响移动速度，不再改变管道空间密度
    this._distanceSinceSpawn += scrollSpeed
    if (this._distanceSinceSpawn >= this._getSpawnDistance()) {  // [v1.2.2] N5 距离随时间收紧
      this._spawnPipe()
      this._distanceSinceSpawn = 0
    }

    // [v1.3.0] 怪物生成（45s 新手保护后，同样按滚动距离节奏）
    this._updateMonsterSpawn(scrollSpeed)

    // [v1.1.1] 随机道具刷新（独立于管道通过）
    this.itemSpawnTimer++
    if (this.itemSpawnTimer >= Config.ITEM.RANDOM_SPAWN_INTERVAL) {
      if (Math.random() < Config.ITEM.RANDOM_SPAWN_CHANCE) {
        this._spawnRandomItem()
      }
      this.itemSpawnTimer = 0
    }

    // [v1.4.0] 补给线：保底道具计时（与随机生成独立）
    this._updateSupplyLine()

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

  /**
   * [v1.3.0] 管道生成间隔改距离制：返回当前生成间隔（滚动像素）。
   * [v1.2.2] N5 ramp 同步改距离版：120s起从270px线性收紧，至300s达240px下限。
   * 与帧数制无关——减速期空间密度保持不变。
   * @returns {number} 当前生成间隔（px）
   */
  _getSpawnDistance() {
    const P = Config.PIPE
    if (this.gameTime <= P.SPAWN_RAMP_START) return P.SPAWN_DISTANCE
    const t = Math.min(1, (this.gameTime - P.SPAWN_RAMP_START) / P.SPAWN_RAMP_TIME)
    return Math.round(P.SPAWN_DISTANCE + (P.SPAWN_DISTANCE_MIN - P.SPAWN_DISTANCE) * t)
  }

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
      gravityModifier: 0,           // 输出：重力增加比例（由效果写入）
      windScrollModifier: 0,        // 输出：风力滚动速度修饰（由效果写入）
      addFloatingText: (x, y, text, color, life) => this._addFloatingText(x, y, text, color, life),
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
    return Math.max(base - reduction, Config.PIPE.MIN_GAP + stats.gapBonus * 0.5)
  }

  // ==================== 管道生成 ====================

  _spawnPipe() {
    const stats = this.abilitySystem.getStats()
    const gapBonus = stats.gapBonus
    // [v1.1.5] 管道以基础间隙生成，动画缩回至最终间隙(baseGap + gapBonus)
    const finalGap = this._getGapSize()  // 含 gapBonus 的最终间隙
    const baseGap = finalGap - gapBonus   // 不含 gapBonus 的基础间隙
    const groundY = this.screenH - Config.GROUND.HEIGHT
    const minTop = Config.PIPE.MIN_TOP
    const maxTop = groundY - finalGap - Config.PIPE.MIN_BOTTOM
    const topHeight = minTop + Math.random() * (maxTop - minTop)
    // 以基础间隙生成，shrinkBonus 驱动缩回动画
    const pipe = new Pipe(this.screenW + 10, topHeight, baseGap, groundY)
    pipe.shrinkBonus = gapBonus
    this.pipes.push(pipe)
  }

  // ==================== [v1.3.0] 怪物系统 ====================

  /**
   * [v1.3.0] 怪物生成：45s 新手保护期后，按滚动距离节奏生成，同时最多 MAX_ALIVE 只
   * @param {number} scrollSpeed - 当前滚动速度
   */
  _updateMonsterSpawn(scrollSpeed) {
    const M = Config.MONSTER
    if (this.gameTime < M.SPAWN_DELAY) return
    if (this.monsters.length >= M.MAX_ALIVE) return
    this._monsterDistance += scrollSpeed
    if (this._monsterDistance < M.SPAWN_DISTANCE) return
    this._monsterDistance = 0

    const type = Math.random() < M.BAT_WEIGHT ? 'bat' : 'floater'
    const groundY = this.screenH - Config.GROUND.HEIGHT
    const y = this._pickMonsterY()
    const monster = new Monster(this.screenW + 30, y, type, groundY)
    this.monsters.push(monster)
    Logger.info('Monster', '生成怪物', { type: type, x: monster.x, y: monster.y, gameTime: this.gameTime })
  }

  /**
   * [v1.3.0] 选取怪物生成 y：避开前方管道间隙正中央（不堵死通路）。
   * 随机尝试 SPAWN_Y_ATTEMPTS 次，取第一个与所有将至管道间隙中心
   * 距离 >= SAFE_GAP_DIST 的候选；失败则用最后候选（概率极低）。
   * @returns {number}
   */
  _pickMonsterY() {
    const M = Config.MONSTER
    const groundY = this.screenH - Config.GROUND.HEIGHT
    const minY = Config.PIPE.MIN_TOP + M.MIN_Y_MARGIN
    const maxY = groundY - M.MIN_Y_MARGIN
    let y = (minY + maxY) / 2
    for (let attempt = 0; attempt < M.SPAWN_Y_ATTEMPTS; attempt++) {
      y = minY + Math.random() * (maxY - minY)
      let safe = true
      for (const pipe of this.pipes) {
        // 只看即将到达小鸟的管道（屏幕右半部分之外的不参与避让）
        if (pipe.x + pipe.width < this.screenW * 0.5) continue
        const gapCenter = pipe.topHeight + pipe.gap / 2
        if (Math.abs(y - gapCenter) < M.SAFE_GAP_DIST) { safe = false; break }
      }
      if (safe) break
    }
    return y
  }

  /**
   * [v1.3.0] 怪物更新与小鸟碰撞（走 _handleCollision 统一受击链，与管道同级）
   * @param {number} scrollSpeed - 当前滚动速度（减速对怪物同步生效）
   * @returns {boolean} true=游戏结束
   */
  _updateMonsters(scrollSpeed) {
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const monster = this.monsters[i]
      monster.update(scrollSpeed, this.bird)

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

  /**
   * [v1.3.0] 怪物被击杀：爆炸粒子 + 击杀经验（浮动文字 +10）
   * [v1.4.0] 拾荒者：击杀怪物 20%/级 掉随机道具（权重沿用 TYPE_WEIGHTS）
   */
  _onMonsterKilled(monster) {
    this._spawnExplosion(monster.x + monster.width / 2, monster.y, '255, 120, 40', 12)
    const stats = this.abilitySystem.getStats()
    this._gainExp(Config.MONSTER.KILL_EXP, 'monster_kill', stats)

    // [v1.4.0] 拾荒者掉落（同屏怪物≤2 + 生成距离450px 天然限速，无需额外刹车）
    const scavLv = this.abilitySystem.owned.get('scavenger') || 0
    if (scavLv > 0 && Math.random() < Config.MONSTER.SCAVENGER_CHANCE_PER_LV * scavLv) {
      this._spawnRandomItem()
      Logger.info('Item', '拾荒者掉落道具', { lv: scavLv })
    }

    Logger.info('Monster', '击杀怪物', { type: monster.monsterType, exp: Config.MONSTER.KILL_EXP })
  }

  // ==================== [v1.3.0] 导弹系统 ====================

  /**
   * [v1.3.0] 拾取导弹道具：从小鸟位置发射 1 枚导弹（拾取即触发）
   * [v1.4.0] 导弹挂架（missile_rack）：每次发射 +lv 枚扇形（"发射事件"级拦截，不区分导弹来源）
   * 实现坑已规避：MAX_ALIVE 先与挂架等级挂钩（3+lv），否则扇形瞬间占满上限、满级卡无效
   */
  _fireMissile() {
    const rackLv = this.abilitySystem.owned.get('missile_rack') || 0
    const maxAlive = Config.MISSILE.MAX_ALIVE + rackLv  // [v1.4.0] 上限与挂架等级挂钩
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

    this._addFloatingText(
      this.bird.x, this.bird.y - 30,
      fired > 1 ? `🚀 发射x${fired}!` : '🚀 发射!',
      '#e67e22', 45
    )
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
   * @param {Missile} missile
   * @returns {boolean} true=命中（导弹销毁）
   */
  _checkMissileHit(missile) {
    // 怪物优先
    for (let i = this.monsters.length - 1; i >= 0; i--) {
      const m = this.monsters[i]
      if (m.hp <= 0) continue
      if (missile.hitTest(m)) {
        this._damageObstacle(m, Config.MISSILE.DAMAGE)
        if (m.hp <= 0) {
          this._onMonsterKilled(m)
          this.monsters.splice(i, 1)
        } else {
          Logger.info('Missile', '命中怪物', { type: m.monsterType, hp: m.hp })
        }
        return true
      }
    }

    // 可破坏管道
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const p = this.pipes[i]
      if (!p.destructible || p.hp <= 0) continue
      if (missile.hitTest(p)) {
        this._damageObstacle(p, Config.MISSILE.DAMAGE)
        if (p.hp <= 0) {
          this._onPipeDestroyed(p)
          this.pipes.splice(i, 1)
        }
        return true
      }
    }
    return false
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

  // [v1.1.1] 随机道具刷新（不依赖管道通过）
  _spawnRandomItem() {
    const groundY = this.screenH - Config.GROUND.HEIGHT
    const minY = Config.PIPE.MIN_TOP + 30
    const maxY = groundY - 30
    const itemY = minY + Math.random() * (maxY - minY)
    const itemX = this.screenW + 20
    const itemType = this._rollItemType()
    this.items.push(new Item(itemX, itemY, itemType))
  }

  /**
   * [v1.4.0] 补给线（supply_line）：每 (75-15*(lv-1))s 保底生成 1 个随机道具
   * 保底计时与随机生成（itemSpawnTimer / 过管25%）完全独立；
   * 权重沿用 _rollItemType（TYPE_WEIGHTS，不含导弹倾斜），防"保底导弹流"变最优解
   */
  _updateSupplyLine() {
    const lv = this.abilitySystem.owned.get('supply_line') || 0
    if (lv <= 0) return
    this.supplyLineTimer++
    const interval = (Config.ITEM.SUPPLY_LINE_BASE_SEC -
      Config.ITEM.SUPPLY_LINE_REDUCTION_SEC * (lv - 1)) * 60
    if (this.supplyLineTimer >= interval) {
      this.supplyLineTimer = 0
      this._spawnRandomItem()
      Logger.info('Item', '补给线保底道具', { lv: lv, intervalSec: interval / 60 })
    }
  }

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

    // [v1.1.4] 经验：只给通过管道经验（5→10），不再给经验球经验
    this._gainExp(Config.EXP.PIPE_PASS_EXP, 'pipe_pass', stats)

    // 连击
    this.abilitySystem.onPipePass()

    // [v1.1.0] 生成道具 [v1.1.3] 修复：在小鸟前方生成（右侧），不在后方（管道位置）
    if (Math.random() < Config.ITEM.SPAWN_CHANCE) {
      const itemX = this.screenW + 20 + Math.random() * 40  // [v1.1.3] 前方生成
      const groundY = this.screenH - Config.GROUND.HEIGHT
      const minY = Config.PIPE.MIN_TOP + 30
      const maxY = groundY - 30
      const itemY = minY + Math.random() * (maxY - minY)
      const itemType = this._rollItemType()
      this.items.push(new Item(itemX, itemY, itemType))
    }
  }

  // [v1.1.0] 道具类型随机
  _rollItemType() {
    const weights = Config.ITEM.TYPE_WEIGHTS
    const types = Object.keys(weights)
    let total = 0
    for (const t of types) total += weights[t]

    let r = Math.random() * total
    for (const t of types) {
      r -= weights[t]
      if (r <= 0) return t
    }
    return types[0]
  }

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

    if (minDist < Config.EXP.NEAR_MISS_DISTANCE + danceBonus && minDist > 0) {
      pipe.nearMissTriggered = true  // [v1.1.5] 防止同一管道重复触发
      const stats = this.abilitySystem.getStats()
      this._gainExp(Config.EXP.NEAR_MISS_EXP, 'near_miss', stats)
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
  _gainExp(baseExp, source, stats) {
    let exp = baseExp
    let doubled = false

    // 经验共鸣：概率双倍（针对所有经验获得）
    if (this.abilitySystem.checkExpResonance()) {
      exp = baseExp * 2
      doubled = true
    }

    const multiplied = this.expSystem.addExp(exp, stats.expMultiplier)

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
   * 碰撞事件处理：无敌 > 时间扭曲 > 统一护盾(弹力护盾优先) > 扣血 > 凤凰 > 死亡
   * [v1.1.5] 统一护盾系统：shieldLayers > 0时消耗一层，
   *           若拥有弹力护盾则弹开，否则仅抵挡。
   * [v1.4.0] §2.6 受击链新节点：铁喙（怪物碰撞的无敌帧反杀分支，最前置，仅怪物）；
   *           镜面护盾（护盾层消耗时冲击波，挂在 consumeShield 内）；
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

    if (dead) {
      // 凤凰复活
      if (this.abilitySystem.tryPhoenix()) {
        this._startPhoenixRevive()
        return false
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

        if (this.abilitySystem.tryTimeWarp()) return
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

    // [v1.1.0] 速度包边框特效
    if (this.abilitySystem.speedPackFrames > 0) {
      this._drawSpeedPackBorder()
    }

    for (const pipe of this.pipes) pipe.render(ctx)
    this._drawPipeSense()   // [v1.4.0] 管感：高亮下一根管道间隙
    for (const monster of this.monsters) monster.render(ctx)   // [v1.3.0]
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
    const { VISUAL } = Config
    const gradient = ctx.createLinearGradient(0, 0, 0, this.screenH)
    gradient.addColorStop(0, VISUAL.SKY_TOP)
    gradient.addColorStop(1, VISUAL.SKY_BOTTOM)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, this.screenW, this.screenH)
  }

  _drawClouds() {
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
    const groundY = this.screenH - GROUND.HEIGHT

    ctx.fillStyle = VISUAL.GROUND_DIRT
    ctx.fillRect(0, groundY, this.screenW, GROUND.HEIGHT)

    ctx.fillStyle = VISUAL.GROUND_GRASS
    ctx.fillRect(0, groundY, this.screenW, 6)

    ctx.fillStyle = VISUAL.GROUND_GRASS_DARK
    for (let x = -this.groundOffset; x < this.screenW; x += GROUND.SCROLL_TILE) {
      ctx.fillRect(x, groundY + 6, 12, 4)
    }

    ctx.fillStyle = VISUAL.GROUND_DIRT_DARK
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

    // ----- 连击计数 -----
    const comboLv = this.abilitySystem.owned.get('combo_heart') || 0
    if (comboLv > 0 && this.abilitySystem.comboCount > 0) {
      const threshold = this.abilitySystem.getStat('comboThreshold')
      ctx.font = 'bold 11px monospace'
      ctx.fillStyle = '#ffaa00'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(`连击 ${this.abilitySystem.comboCount}/${threshold}`, this.screenW / 2, barY + barH + 12)
    }

    // ----- [v1.2.0] 环境状态指示器 -----
    const weatherInfo = this.weatherSystem.getActiveEffectInfo()
    if (weatherInfo.length > 0) {
      const icons = { wind: '💨', rain: '🌧️', hail: '🧊' }
      const colors = { wind: '#ffffff', rain: '#7eb8e0', hail: '#c0d8f0' }
      const indicatorY = barY + barH + 26
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
    const phoenixLv = this.abilitySystem.owned.get('phoenix') || 0
    if (phoenixLv > 0) {
      const remaining = phoenixLv - this.abilitySystem.phoenixUsed
      const phoenixX = 14 + this.abilitySystem.maxHp * (HP.HEART_SIZE + HP.HEART_GAP)
      const phoenixY = topY + 14
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText('🔥', phoenixX, phoenixY)
      ctx.font = 'bold 11px monospace'
      ctx.fillStyle = remaining > 0 ? '#ff6600' : '#666666'
      ctx.fillText(`×${remaining}`, phoenixX + 16, phoenixY)
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
    ctx.fillText('升级!', cx, this.screenH * 0.15)

    ctx.font = '14px monospace'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(`Lv.${this.expSystem.level} — 选择能力`, cx, this.screenH * 0.15 + 28)

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
      this._drawCard(cardX, thisCardY, cardW, cardH, ab, currentLevel)
    }
  }

  _drawCard(x, y, w, h, def, currentLevel) {
    const ctx = this.ctx

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

    const catNames = { passive: '被动', active: '主动', special: '特殊' }
    ctx.font = '10px monospace'
    ctx.fillStyle = '#888888'
    ctx.fillText(`[${catNames[def.category] || ''}]`, cx, y + 116)

    ctx.font = '11px monospace'
    ctx.fillStyle = '#cccccc'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    const effectText = def.effectText(nextLevel)
    this._wrapText(effectText, x + 8, y + 130, w - 16, 15)

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

    // 能力展示
    const owned = this.abilitySystem.getOwnedList()
    if (owned.length > 0) {
      const abilityY = panelY + panelH + 25

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
