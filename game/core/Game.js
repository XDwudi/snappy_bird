/**
 * Game.js - 游戏主类
 * 
 * 职责：游戏主循环、状态机管理、实体协调、碰撞检测、渲染调度。
 * 框架无关——只依赖 Canvas 2D API，不直接调用微信SDK。
 */

const Config = require('../config/GameConfig.js')
const Bird = require('../entities/Bird.js')
const Pipe = require('../entities/Pipe.js')

class Game {
  /**
   * @param {Object} canvas - Canvas 节点（用于 requestAnimationFrame）
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
    this.clouds = []

    // 计时器
    this.spawnTimer = 0
    this.gameTime = 0
    this.frameCount = 0

    // 地面滚动偏移
    this.groundOffset = 0

    // 屏幕震动效果
    this.shakeFrames = 0
    this.shakeIntensity = 0

    // 回调（由页面层设置）
    this.onScoreChange = null
    this.onGameOver = null
    this.onReady = null

    // 动画ID
    this.rafId = null
    this.running = false

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
    this.pipes = []
    this.shakeFrames = 0

    const birdX = this.screenW * Config.BIRD.X_RATIO
    const birdY = this.screenH * 0.45
    this.bird.reset(birdX, birdY)

    if (this.onScoreChange) this.onScoreChange(this.score)
  }

  /**
   * 拍翅
   */
  flap() {
    if (this.state === Config.GAME.STATE.PLAYING) {
      this.bird.flap()
    } else if (this.state === Config.GAME.STATE.READY) {
      this.start()
      this.bird.flap()
    }
  }

  /**
   * 重新开始
   */
  restart() {
    this.start()
  }

  /**
   * 回到准备态
   */
  backToReady() {
    this.state = Config.GAME.STATE.READY
    this.score = 0
    this.pipes = []
    this.shakeFrames = 0

    const birdX = this.screenW * Config.BIRD.X_RATIO
    const birdY = this.screenH * 0.45
    this.bird.reset(birdX, birdY)

    if (this.onReady) this.onReady()
  }

  /**
   * 游戏结束
   */
  _gameOver() {
    this.state = Config.GAME.STATE.GAME_OVER
    this.shakeFrames = 12
    this.shakeIntensity = 6

    if (this.score > this.bestScore) {
      this.bestScore = this.score
    }
    if (this.onGameOver) this.onGameOver(this.score, this.bestScore)
  }

  // ==================== 主循环 ====================

  /**
   * 启动游戏循环
   */
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

  /**
   * 销毁，停止循环
   */
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
    if (this.shakeFrames > 0) {
      this.shakeFrames--
    }

    // 游戏结束后停止世界滚动
    if (this.state === Config.GAME.STATE.GAME_OVER) return

    // 准备态和游玩态：云朵和地面滚动
    this._updateClouds()
    this.groundOffset = (this.groundOffset + Config.GAME.SCROLL_SPEED) % Config.GROUND.SCROLL_TILE

    if (this.state === Config.GAME.STATE.READY) {
      // 准备态：小鸟悬停
      this.bird.updateHover(this.frameCount)
      return
    }

    if (this.state !== Config.GAME.STATE.PLAYING) return

    this.gameTime++

    // 更新小鸟
    this.bird.update()

    // 生成管道
    this.spawnTimer++
    if (this.spawnTimer >= Config.PIPE.SPAWN_INTERVAL) {
      this._spawnPipe()
      this.spawnTimer = 0
    }

    // 更新管道
    const scrollSpeed = this._getScrollSpeed()
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
        this._gameOver()
        return
      }

      // 得分判定
      if (!pipe.passed && pipe.x + pipe.width < this.bird.x - this.bird.collisionWidth / 2) {
        pipe.passed = true
        this.score++
        if (this.onScoreChange) this.onScoreChange(this.score)
      }
    }

    // 地面与天花板碰撞
    const groundY = this.screenH - Config.GROUND.HEIGHT
    if (this.bird.y + this.bird.collisionHeight / 2 >= groundY) {
      this.bird.y = groundY - this.bird.collisionHeight / 2
      this._gameOver()
      return
    }
    if (this.bird.y - this.bird.collisionHeight / 2 <= 0) {
      this.bird.y = this.bird.collisionHeight / 2
      this.bird.velocity = 0
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

  /**
   * 计算当前滚动速度（含难度递增）
   */
  _getScrollSpeed() {
    const base = Config.GAME.SCROLL_SPEED
    const ramp = Math.min(this.gameTime / Config.GAME.SPEED_RAMP_TIME, 1) * Config.GAME.SPEED_RAMP_MAX
    return base + ramp
  }

  /**
   * 计算当前管道间隙（含难度递增）
   */
  _getGapSize() {
    const base = Config.PIPE.GAP
    const reduction = Math.min(this.gameTime / Config.GAME.GAP_RAMP_TIME, 1) * Config.GAME.GAP_RAMP_MAX
    return Math.max(base - reduction, Config.PIPE.MIN_GAP)
  }

  /**
   * 生成管道
   */
  _spawnPipe() {
    const gap = this._getGapSize()
    const groundY = this.screenH - Config.GROUND.HEIGHT
    const minTop = Config.PIPE.MIN_TOP
    const maxTop = groundY - gap - Config.PIPE.MIN_BOTTOM
    const topHeight = minTop + Math.random() * (maxTop - minTop)

    this.pipes.push(new Pipe(this.screenW + 10, topHeight, gap, groundY))
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

    // 小鸟
    this.bird.render(ctx)

    this._drawGround()

    ctx.restore()
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

  _drawGround() {
    const ctx = this.ctx
    const { GROUND, VISUAL } = Config
    const groundY = this.screenH - GROUND.HEIGHT

    // 泥土底色
    ctx.fillStyle = VISUAL.GROUND_DIRT
    ctx.fillRect(0, groundY, this.screenW, GROUND.HEIGHT)

    // 草地顶
    ctx.fillStyle = VISUAL.GROUND_GRASS
    ctx.fillRect(0, groundY, this.screenW, 6)

    // 草地纹理（滚动）
    ctx.fillStyle = VISUAL.GROUND_GRASS_DARK
    for (let x = -this.groundOffset; x < this.screenW; x += GROUND.SCROLL_TILE) {
      ctx.fillRect(x, groundY + 6, 12, 4)
    }

    // 泥土纹理
    ctx.fillStyle = VISUAL.GROUND_DIRT_DARK
    for (let x = -this.groundOffset; x < this.screenW; x += GROUND.SCROLL_TILE) {
      ctx.fillRect(x + 6, groundY + 14, 8, 3)
    }

    // 地面顶部描边
    ctx.fillStyle = VISUAL.PIPE_OUTLINE
    ctx.fillRect(0, groundY, this.screenW, 2)
  }
}

module.exports = Game
