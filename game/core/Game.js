/**
 * Game.js - 游戏主类
 * 
 * 职责：游戏主循环、状态机管理、实体协调、碰撞检测、渲染调度。
 * 集成经验系统、能力系统、经验球、擦边判定、护盾/复活机制。
 * 框架无关——只依赖 Canvas 2D API，不直接调用微信SDK。
 */

const Config = require('../config/GameConfig.js')
const Bird = require('../entities/Bird.js')
const Pipe = require('../entities/Pipe.js')
const Orb = require('../entities/Orb.js')
const ExpSystem = require('../systems/ExpSystem.js')
const AbilitySystem = require('../systems/AbilitySystem.js')

class Game {
  /**
   * @param {Object} canvas - Canvas 节点
   * @param {CanvasRenderingContext2D} ctx - 2D 渲染上下文
   * @param {number} screenW - 逻辑屏幕宽度
   * @param {number} screenH - 逻辑屏幕高度
   */
  constructor(canvas, ctx, screenW, screenH) {
    this.canvas = canvas
    this.ctx = ctx
    this.screenW = screenW
    this.screenH = screenH

    // 游戏状态
    this.state = Config.GAME.STATE.READY
    this.score = 0
    this.bestScore = 0

    // 实体
    this.bird = null
    this.pipes = []
    this.orbs = []
    this.clouds = []
    this.nearMissEffects = []  // 擦边特效列表

    // 系统
    this.expSystem = new ExpSystem()
    this.abilitySystem = new AbilitySystem()

    // 计时器
    this.spawnTimer = 0
    this.gameTime = 0
    this.frameCount = 0
    this.survivalTimer = 0    // 存活得分计时器

    // 地面滚动偏移
    this.groundOffset = 0

    // 屏幕震动效果
    this.shakeFrames = 0
    this.shakeIntensity = 0

    // 回调（由页面层设置）
    this.onScoreChange = null
    this.onGameOver = null
    this.onReady = null
    this.onExpChange = null       // 经验/等级变化回调
    this.onLevelUp = null          // 升级回调（传递可选能力列表）

    // 动画ID
    this.rafId = null
    this.running = false

    // 当前升级选项缓存
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

  /**
   * 开始游戏（从准备态进入游玩态）
   */
  start() {
    this.state = Config.GAME.STATE.PLAYING
    this.score = 0
    this.gameTime = 0
    this.spawnTimer = 0
    this.frameCount = 0
    this.survivalTimer = 0
    this.pipes = []
    this.orbs = []
    this.nearMissEffects = []
    this.shakeFrames = 0

    // 重置系统
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
      this.bird.flap()
    } else if (this.state === Config.GAME.STATE.READY) {
      this.start()
      this.bird.flap()
    }
  }

  restart() {
    this.start()
  }

  backToReady() {
    this.state = Config.GAME.STATE.READY
    this.score = 0
    this.pipes = []
    this.orbs = []
    this.nearMissEffects = []
    this.shakeFrames = 0

    this.expSystem.reset()
    this.abilitySystem.reset()

    const birdX = this.screenW * Config.BIRD.X_RATIO
    const birdY = this.screenH * 0.45
    this.bird.reset(birdX, birdY)

    if (this.onReady) this.onReady()
    if (this.onExpChange) this.onExpChange(this.expSystem.getExpBarData())
  }

  // ==================== 升级流程 ====================

  /**
   * 触发升级面板
   */
  _triggerLevelUp() {
    this.state = Config.GAME.STATE.UPGRADING
    const choices = this.abilitySystem.getChoices()

    if (choices.length === 0) {
      // 所有能力满级 → 全属性加成
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

  /**
   * 玩家选择能力后调用
   * @param {string} abilityId - 选择的能力ID
   */
  selectAbility(abilityId) {
    this.abilitySystem.selectAbility(abilityId)
    this.abilitySystem.invalidateStats()
    this.expSystem.consumeLevelUp()
    this._currentChoices = null
    this._afterUpgrade()
  }

  /**
   * 升级后处理：检查是否有连续升级
   */
  _afterUpgrade() {
    if (this.expSystem.hasPendingLevelUp()) {
      // 连续升级，再次触发
      this._triggerLevelUp()
    } else {
      // 恢复游戏
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
    this.rafId = this.canvas.requestAnimationFrame(() => {
      this._tick()
    })
  }

  destroy() {
    this.running = false
    if (this.rafId) {
      this.canvas.cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  // ==================== 更新逻辑 ====================

  update() {
    this.frameCount++

    // 屏幕震动倒计时
    if (this.shakeFrames > 0) this.shakeFrames--

    // 擦边特效更新
    this._updateNearMissEffects()

    // 游戏结束后或升级中：停止世界更新
    if (this.state === Config.GAME.STATE.GAME_OVER) return
    if (this.state === Config.GAME.STATE.UPGRADING) return

    // 准备态和游玩态：云朵和地面滚动
    this._updateClouds()
    this.groundOffset = (this.groundOffset + Config.GAME.SCROLL_SPEED) % Config.GROUND.SCROLL_TILE

    if (this.state === Config.GAME.STATE.READY) {
      this.bird.updateHover(this.frameCount)
      return
    }

    if (this.state !== Config.GAME.STATE.PLAYING) return

    this.gameTime++

    // ===== 能力系统更新 =====
    this.abilitySystem.tickCooldowns()
    this._applyAbilityStatsToBird()

    // ===== 小鸟物理 =====
    this.bird.update()

    // ===== 生成管道 =====
    this.spawnTimer++
    if (this.spawnTimer >= Config.PIPE.SPAWN_INTERVAL) {
      this._spawnPipe()
      this.spawnTimer = 0
    }

    // ===== 计算滚动速度（含能力修饰） =====
    const scrollSpeed = this._getScrollSpeed()

    // ===== 主动技能：碰撞预判（在碰撞检测前触发） =====
    this._checkActiveAbilities()

    // ===== 管道更新与碰撞 =====
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const pipe = this.pipes[i]
      pipe.update(scrollSpeed)

      // 移除离屏管道
      if (pipe.x + pipe.width < -10) {
        this.pipes.splice(i, 1)
        continue
      }

      // 碰撞检测
      if (pipe.checkCollision(this.bird)) {
        if (this._handleCollision()) return
        continue
      }

      // 得分判定 + 经验 + 擦边
      if (!pipe.passed && pipe.x + pipe.width < this.bird.x - this.bird.collisionWidth / 2) {
        pipe.passed = true
        this._onPipePass(pipe)
      }
    }

    // ===== 经验球更新 =====
    const attractRange = this.abilitySystem.getStat('orbAttractRange')
    for (let i = this.orbs.length - 1; i >= 0; i--) {
      const orb = this.orbs[i]
      orb.update(scrollSpeed, this.bird, attractRange)

      // 拾取判定
      if (orb.checkCollect(this.bird)) {
        this._collectOrb()
        this.orbs.splice(i, 1)
        continue
      }

      // 移除离屏经验球
      if (orb.isOffscreen()) {
        this.orbs.splice(i, 1)
      }
    }

    // ===== 地面与天花板碰撞 =====
    const groundY = this.screenH - Config.GROUND.HEIGHT
    if (this.bird.y + this.bird.collisionHeight / 2 >= groundY) {
      this.bird.y = groundY - this.bird.collisionHeight / 2
      if (this._handleCollision()) return
    }
    if (this.bird.y - this.bird.collisionHeight / 2 <= 0) {
      this.bird.y = this.bird.collisionHeight / 2
      this.bird.velocity = 0
    }

    // ===== 存活时间得分 =====
    this.survivalTimer++
    if (this.survivalTimer >= Config.EXP.SCORE_SURVIVAL_INTERVAL) {
      this.survivalTimer = 0
      this.score += 1
      if (this.onScoreChange) this.onScoreChange(this.score)
    }

    // ===== 升级检查 =====
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
      e.radius += 2
      if (e.life <= 0) {
        this.nearMissEffects.splice(i, 1)
      }
    }
  }

  // ==================== 能力属性注入 ====================

  /**
   * 将能力系统的计算结果注入小鸟物理参数
   */
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

    return speed
  }

  /**
   * 计算管道间隙（含缩小射线加成）
   */
  _getGapSize() {
    const stats = this.abilitySystem.getStats()
    const base = Config.PIPE.GAP + stats.gapBonus
    const reduction = Math.min(this.gameTime / Config.GAME.GAP_RAMP_TIME, 1) * Config.GAME.GAP_RAMP_MAX
    return Math.max(base - reduction, Config.PIPE.MIN_GAP + stats.gapBonus * 0.5)
  }

  // ==================== 管道生成 ====================

  _spawnPipe() {
    const gap = this._getGapSize()
    const groundY = this.screenH - Config.GROUND.HEIGHT
    const minTop = Config.PIPE.MIN_TOP
    const maxTop = groundY - gap - Config.PIPE.MIN_BOTTOM
    const topHeight = minTop + Math.random() * (maxTop - minTop)
    this.pipes.push(new Pipe(this.screenW + 10, topHeight, gap, groundY))
  }

  // ==================== 通过管道处理 ====================

  _onPipePass(pipe) {
    const stats = this.abilitySystem.getStats()

    // 得分（双倍积分）
    const points = Math.round(1 * stats.scoreMultiplier)
    this.score += points
    if (this.onScoreChange) this.onScoreChange(this.score)

    // 经验
    this.expSystem.addExp(Config.EXP.PIPE_PASS_EXP, stats.expMultiplier)
    if (this.onExpChange) this.onExpChange(this.expSystem.getExpBarData())

    // 连击系统
    this.abilitySystem.onPipePass()

    // 生成经验球
    if (Math.random() < Config.EXP.ORB_SPAWN_CHANCE) {
      const orbX = pipe.x + pipe.width / 2
      const orbY = pipe.topHeight + pipe.gap / 2
      this.orbs.push(new Orb(orbX, orbY))
    }

    // 擦边检测
    this._checkNearMiss(pipe)
  }

  /**
   * 擦边判定
   */
  _checkNearMiss(pipe) {
    const birdTop = this.bird.y - this.bird.collisionHeight / 2
    const birdBottom = this.bird.y + this.bird.collisionHeight / 2
    const distToTopPipe = birdTop - pipe.topHeight
    const distToBottomPipe = pipe.bottomY - birdBottom
    const minDist = Math.min(distToTopPipe, distToBottomPipe)

    if (minDist < Config.EXP.NEAR_MISS_DISTANCE && minDist > 0) {
      // 擦边成功！
      const stats = this.abilitySystem.getStats()
      this.expSystem.addExp(Config.EXP.NEAR_MISS_EXP, stats.expMultiplier)
      this.score += Config.EXP.SCORE_NEAR_MISS
      if (this.onScoreChange) this.onScoreChange(this.score)
      if (this.onExpChange) this.onExpChange(this.expSystem.getExpBarData())

      // 添加擦边特效
      this.nearMissEffects.push({
        x: this.bird.x,
        y: this.bird.y,
        radius: 10,
        life: 20
      })
    }
  }

  // ==================== 经验球拾取 ====================

  _collectOrb() {
    const stats = this.abilitySystem.getStats()
    this.expSystem.addExp(Config.EXP.ORB_EXP, stats.expMultiplier)
    this.score += Config.EXP.SCORE_PER_ORB
    if (this.onScoreChange) this.onScoreChange(this.score)
    if (this.onExpChange) this.onExpChange(this.expSystem.getExpBarData())
  }

  // ==================== 碰撞处理 ====================

  /**
   * 碰撞事件处理：检查护盾/无敌/复活
   * @returns {boolean} true=游戏结束, false=继续
   */
  _handleCollision() {
    // 无敌状态
    if (this.abilitySystem.invincibleFrames > 0) {
      this.bird.invincibleBlink = 20
      this.abilitySystem.resetCombo()
      return false
    }

    // 时间扭曲激活中（免伤）
    if (this.abilitySystem.timeWarpActive > 0) {
      this.bird.invincibleBlink = 20
      return false
    }

    // 护盾
    if (this.abilitySystem.consumeShield()) {
      this.bird.invincibleBlink = 30
      this.abilitySystem.invincibleFrames = 60  // 1s 无敌，确保穿过当前管道
      this.abilitySystem.resetCombo()
      this.shakeFrames = 6
      this.shakeIntensity = 3
      return false
    }

    // 凤凰复活
    if (this.abilitySystem.tryPhoenix()) {
      // 重置小鸟到安全位置
      const birdX = this.screenW * Config.BIRD.X_RATIO
      const birdY = this.screenH * 0.45
      this.bird.reset(birdX, birdY)
      this.bird.invincibleBlink = 60
      this.abilitySystem.invincibleFrames = 120 // 2s 无敌
      this.abilitySystem.resetCombo()
      return false
    }

    // 真正死亡
    this._gameOver()
    return true
  }

  /**
   * 主动技能：碰撞预判
   */
  _checkActiveAbilities() {
    // 检查小鸟是否即将碰撞某个管道
    const birdRight = this.bird.x + this.bird.collisionWidth / 2

    for (const pipe of this.pipes) {
      // 管道在小鸟前方且距离很近
      if (pipe.x > birdRight || pipe.x + pipe.width < this.bird.x - this.bird.collisionWidth / 2 - 30) {
        continue
      }

      // 检查Y轴是否接近碰撞
      const birdTop = this.bird.y - this.bird.collisionHeight / 2
      const birdBottom = this.bird.y + this.bird.collisionHeight / 2
      const distToTop = birdTop - pipe.topHeight
      const distToBottom = pipe.bottomY - birdBottom
      const minDist = Math.min(distToTop, distToBottom)

      // 即将碰撞（距离<8px）
      if (minDist < 8 && minDist > 0) {
        // 尝试时间扭曲
        if (this.abilitySystem.tryTimeWarp()) {
          // 时间扭曲已激活，减速期间不会碰撞
          return
        }

        // 尝试瞬移
        if (this.abilitySystem.tryTeleport()) {
          // 瞬移到间隙中心
          this.bird.y = pipe.topHeight + pipe.gap / 2
          this.bird.velocity = 0
          this.bird.invincibleBlink = 30
          return
        }
      }
    }
  }

  // ==================== 游戏结束 ====================

  _gameOver() {
    this.state = Config.GAME.STATE.GAME_OVER
    this.shakeFrames = 12
    this.shakeIntensity = 6
    this.abilitySystem.resetCombo()

    if (this.score > this.bestScore) {
      this.bestScore = this.score
    }
    if (this.onGameOver) this.onGameOver(this.score, this.bestScore, this.expSystem.level, this.abilitySystem.getOwnedList())
  }

  // ==================== 渲染逻辑 ====================

  render() {
    const ctx = this.ctx

    // 屏幕震动偏移
    let shakeX = 0
    let shakeY = 0
    if (this.shakeFrames > 0) {
      shakeX = (Math.random() - 0.5) * this.shakeIntensity
      shakeY = (Math.random() - 0.5) * this.shakeIntensity
    }

    ctx.save()
    ctx.translate(shakeX, shakeY)

    this._drawBackground()
    this._drawClouds()

    // 管道
    for (const pipe of this.pipes) {
      pipe.render(ctx)
    }

    // 经验球
    for (const orb of this.orbs) {
      orb.render(ctx)
    }

    // 擦边特效
    this._drawNearMissEffects()

    // 小鸟（含护盾显示）
    const showShield = this.abilitySystem.shields > 0
    this.bird.render(ctx, showShield)

    this._drawGround()

    ctx.restore()

    // HUD 不受震动影响
    this._drawHUD()
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

  _drawNearMissEffects() {
    const ctx = this.ctx
    for (const e of this.nearMissEffects) {
      const alpha = e.life / 20 * 0.6
      ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2)
      ctx.stroke()
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

  // ==================== HUD 渲染 ====================

  _drawHUD() {
    if (this.state === Config.GAME.STATE.READY) return

    const ctx = this.ctx
    const { VISUAL } = Config

    // ----- 顶部：经验条 -----
    const barW = this.screenW * 0.6
    const barH = 14
    const barX = (this.screenW - barW) / 2
    const barY = 12

    // 背景
    ctx.fillStyle = VISUAL.EXP_BAR_BG
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4)

    // 填充
    const expData = this.expSystem.getExpBarData()
    const fillW = barW * expData.progress
    ctx.fillStyle = VISUAL.EXP_BAR_FILL
    ctx.fillRect(barX, barY, fillW, barH)

    // 描边
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1.5
    ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4)

    // 等级文字
    ctx.fillStyle = VISUAL.EXP_BAR_TEXT
    ctx.font = 'bold 11px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`Lv.${expData.level}`, this.screenW / 2, barY + barH / 2)

    // ----- 底部：能力图标栏 -----
    const owned = this.abilitySystem.getOwnedList()
    if (owned.length > 0) {
      const iconSize = 28
      const gap = 6
      const totalW = owned.length * (iconSize + gap) - gap
      const startX = (this.screenW - totalW) / 2
      const iconY = this.screenH - Config.GROUND.HEIGHT - iconSize - 8

      for (let i = 0; i < owned.length; i++) {
        const { def, level } = owned[i]
        const ix = startX + i * (iconSize + gap)

        // 背景
        ctx.fillStyle = VISUAL.ABILITY_ICON_BG
        ctx.beginPath()
        ctx.arc(ix + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2)
        ctx.fill()

        // 描边
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1.5
        ctx.stroke()

        // 图标（emoji）
        ctx.font = '16px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(def.icon, ix + iconSize / 2, iconY + iconSize / 2 - 2)

        // 等级角标
        ctx.fillStyle = '#ffd700'
        ctx.font = 'bold 9px monospace'
        ctx.fillText(`L${level}`, ix + iconSize / 2, iconY + iconSize - 4)
      }
    }
  }
}

module.exports = Game
