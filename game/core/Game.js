/**
 * Game.js - 游戏主类 [v1.1.5]
 *
 * 职责：游戏主循环、状态机管理、实体协调、碰撞检测、渲染调度。
 * 集成经验系统、能力系统、经验球、道具系统、HP血条、擦边判定。
 * [v1.1.0] 新增：HP系统、道具系统、安全区适配、结算界面重设计、二段跳。
 * [v1.1.1] 优化：HUD重构(HP/等级/经验条独立显示)、能力视觉特效、随机道具刷新、结算双按钮。
 * [v1.1.2] 优化：系统日志(GameLogger)、弹力护甲平衡修复(有限次数+弹开不传送)、连击之心平衡修复。
 * [v1.1.3] 优化：经验球改为直接获取+文字提示、经验日志、道具前方生成、稀有度概率系统。
 * [v1.1.4] 优化：经验系统统一化(管道经验5→10,删除经验球经验,经验共鸣全经验生效)、浮动文字堆叠渐隐、擦边特效增强(多环+粒子+闪光)、道具图标视觉区分。
 * [v1.1.5] 优化：统一护盾系统(层数机制+视觉区分+弹力护甲改造为弹力护盾)、擦边触发优化(每帧检查+距离25px)、缩小射线间隙增大+管道缩回动画。
 * 框架无关——只依赖 Canvas 2D API，不直接调用微信SDK。
 */

const Config = require('../config/GameConfig.js')
const Bird = require('../entities/Bird.js')
const Pipe = require('../entities/Pipe.js')
const Orb = require('../entities/Orb.js')
const Item = require('../entities/Item.js')
const ExpSystem = require('../systems/ExpSystem.js')
const AbilitySystem = require('../systems/AbilitySystem.js')
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
    this.orbs = []
    this.items = []               // [v1.1.0] 道具列表
    this.clouds = []
    this.nearMissEffects = []
    this.floatingTexts = []       // [v1.1.0] 浮动文字（道具拾取提示）

    // 系统
    this.expSystem = new ExpSystem()
    this.abilitySystem = new AbilitySystem()

    // 计时器
    this.spawnTimer = 0
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
    this.spawnTimer = 0
    this.frameCount = 0
    this.survivalTimer = 0
    this.pipesPassed = 0
    this.itemSpawnTimer = 0       // [v1.1.1] 随机道具刷新计时器
    this.pipes = []
    this.orbs = []
    this.items = []
    this.nearMissEffects = []
    this.floatingTexts = []
    this.shakeFrames = 0
    this.damageFlash = 0

    this.expSystem.reset()
    this.abilitySystem.reset()

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
      } else {
        this.bird.flap()
      }
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
    this.orbs = []
    this.items = []
    this.nearMissEffects = []
    this.floatingTexts = []
    this.shakeFrames = 0
    this.damageFlash = 0
    this.itemSpawnTimer = 0       // [v1.1.1]

    this.expSystem.reset()
    this.abilitySystem.reset()

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
    this.expSystem.consumeLevelUp()
    this._currentChoices = null
    this._afterUpgrade()
  }

  _afterUpgrade() {
    if (this.expSystem.hasPendingLevelUp()) {
      this._triggerLevelUp()
    } else {
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
    this.update()
    this.render()
    if (typeof this.canvas.requestAnimationFrame === 'function') {
      this.rafId = this.canvas.requestAnimationFrame(() => this._tick())
    } else if (typeof requestAnimationFrame === 'function') {
      this.rafId = requestAnimationFrame(() => this._tick())
    }
  }

  destroy() {
    this.running = false
    if (this.rafId) {
      if (typeof this.canvas.cancelAnimationFrame === 'function') {
        this.canvas.cancelAnimationFrame(this.rafId)
      } else if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this.rafId)
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

    // 能力系统更新
    this.abilitySystem.tickCooldowns()
    this._applyAbilityStatsToBird()

    // 小鸟物理
    this.bird.update()

    // 生成管道
    this.spawnTimer++
    if (this.spawnTimer >= Config.PIPE.SPAWN_INTERVAL) {
      this._spawnPipe()
      this.spawnTimer = 0
    }

    // [v1.1.1] 随机道具刷新（独立于管道通过）
    this.itemSpawnTimer++
    if (this.itemSpawnTimer >= Config.ITEM.RANDOM_SPAWN_INTERVAL) {
      if (Math.random() < Config.ITEM.RANDOM_SPAWN_CHANCE) {
        this._spawnRandomItem()
      }
      this.itemSpawnTimer = 0
    }

    // 滚动速度（含能力修饰 + 速度包减速）
    const scrollSpeed = this._getScrollSpeed()

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
      this._triggerLevelUp()
    }
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

  // ==================== 速度计算 ====================

  _getScrollSpeed() {
    const stats = this.abilitySystem.getStats()
    const base = Config.GAME.SCROLL_SPEED
    const ramp = Math.min(this.gameTime / Config.GAME.SPEED_RAMP_TIME, 1) * Config.GAME.SPEED_RAMP_MAX
    let speed = (base + ramp) * stats.scrollSpeedMultiplier

    // 时间扭曲减速
    if (this.abilitySystem.timeWarpActive > 0) {
      speed *= 0.5
    }

    // [v1.1.0] 速度包减速
    speed *= this.abilitySystem.getSpeedPackMultiplier()

    return speed
  }

  _getGapSize() {
    const stats = this.abilitySystem.getStats()
    const base = Config.PIPE.GAP + stats.gapBonus
    const reduction = Math.min(this.gameTime / Config.GAME.GAP_RAMP_TIME, 1) * Config.GAME.GAP_RAMP_MAX
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

    if (minDist < Config.EXP.NEAR_MISS_DISTANCE && minDist > 0) {
      pipe.nearMissTriggered = true  // [v1.1.5] 防止同一管道重复触发
      const stats = this.abilitySystem.getStats()
      this._gainExp(Config.EXP.NEAR_MISS_EXP, 'near_miss', stats)
      this.score += Config.EXP.SCORE_NEAR_MISS
      if (this.onScoreChange) this.onScoreChange(this.score)

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
   * @param {Object} [pipe] - 碰撞的管道对象（用于判断弹开方向），地面/天花板碰撞时不传
   * @returns {boolean} true=游戏结束, false=继续
   */
  _handleCollision(pipe) {
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
        const birdX = this.screenW * Config.BIRD.X_RATIO
        const birdY = this.screenH * 0.45
        this.bird.reset(birdX, birdY)
        this.bird.invincibleBlink = 60
        this.abilitySystem.invincibleFrames = 120
        this._addFloatingText(birdX, birdY, '复活!', '#ff6600', 60)
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
        if (this.abilitySystem.tryTimeWarp()) return

        if (this.abilitySystem.tryTeleport()) {
          this.bird.y = pipe.topHeight + pipe.gap / 2
          this.bird.velocity = 0
          this.bird.invincibleBlink = 30
          this.abilitySystem.invincibleFrames = 30  // [v1.1.2] 瞬移后给实际无敌帧防止立即再碰撞
          return
        }
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
    for (const orb of this.orbs) orb.render(ctx)
    for (const item of this.items) item.render(ctx)   // [v1.1.0]

    this._drawNearMissEffects()

    // [v1.1.1] 能力光环特效（磁吸/狂暴/时间扭曲）
    this._drawAbilityAuras()

    // [v1.1.5] 统一护盾：传递护盾层数给Bird渲染
    const shieldLayers = this.abilitySystem.shieldLayers
    this.bird.render(ctx, shieldLayers)

    this._drawGround()
    ctx.restore()

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
    const cardW = Math.min(maxCardW, (this.screenW - 40 - (n - 1) * gap) / n)
    const startX = (this.screenW - (n * cardW + (n - 1) * gap)) / 2
    const cardY = (this.screenH - cardH) / 2 + 10

    this._cardBounds = []

    for (let i = 0; i < n; i++) {
      const ab = choices[i]
      const currentLevel = ownedList.find(o => o.def.id === ab.id)?.level || 0
      const cardX = startX + i * (cardW + gap)

      this._cardBounds.push({ x: cardX, y: cardY, w: cardW, h: cardH, id: ab.id })
      this._drawCard(cardX, cardY, cardW, cardH, ab, currentLevel)
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
