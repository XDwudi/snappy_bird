/**
 * Bird.js - 小鸟实体
 * 
 * 负责：物理运动（重力/拍翅）、旋转动画、翅膀动画、像素风格渲染。
 * 物理参数（gravity/flapForce/maxFallSpeed）由 Game.js 通过属性注入，
 * 支持能力系统动态修改。
 */

const Config = require('../config/GameConfig.js')

class Bird {
  /**
   * @param {number} x - 初始中心X
   * @param {number} y - 初始中心Y
   */
  constructor(x, y) {
    this.reset(x, y)
  }

  /**
   * 重置到初始状态
   */
  reset(x, y) {
    this.x = x
    this.y = y
    this.velocity = 0
    this.rotation = 0
    this.wingFrame = 0
    this.wingTimer = 0
    this.width = Config.BIRD.WIDTH
    this.height = Config.BIRD.HEIGHT

    // 物理参数（可被能力系统修改）
    this.gravity = Config.BIRD.GRAVITY
    this.flapForce = Config.BIRD.FLAP_FORCE
    this.maxFallSpeed = Config.BIRD.MAX_FALL_SPEED

    // 碰撞箱缩放（可被灵巧能力修改）
    this.collisionScale = 1.0
    this.collisionWidth = this.width * Config.BIRD.COLLISION_RATIO
    this.collisionHeight = this.height * Config.BIRD.COLLISION_RATIO

    // 无敌闪烁
    this.invincibleBlink = 0
  }

  /**
   * 更新碰撞箱尺寸（灵巧能力改变时调用）
   */
  updateCollisionBox() {
    this.collisionWidth = this.width * Config.BIRD.COLLISION_RATIO * this.collisionScale
    this.collisionHeight = this.height * Config.BIRD.COLLISION_RATIO * this.collisionScale
  }

  /**
   * 拍翅——施加瞬间上升速度
   */
  flap() {
    this.velocity = this.flapForce
    this.wingFrame = 0
    this.wingTimer = 0
  }

  /**
   * 物理更新（游玩态）
   */
  update() {
    // 重力
    this.velocity += this.gravity
    if (this.velocity > this.maxFallSpeed) {
      this.velocity = this.maxFallSpeed
    }

    // 位置更新
    this.y += this.velocity

    // 旋转：上升时朝上，下落时逐渐朝下
    const { BIRD } = Config
    if (this.velocity < 0) {
      this.rotation = BIRD.ROTATION_UP
    } else {
      this.rotation = Math.min(this.rotation + BIRD.ROTATION_SPEED, BIRD.ROTATION_DOWN_MAX)
    }

    // 翅膀动画
    this.wingTimer++
    if (this.wingTimer >= BIRD.WING_ANIM_SPEED) {
      this.wingTimer = 0
      this.wingFrame = (this.wingFrame + 1) % 3
    }

    // 无敌闪烁计时
    if (this.invincibleBlink > 0) {
      this.invincibleBlink--
    }
  }

  /**
   * 悬停动画（准备态）
   */
  updateHover(frameCount) {
    this.y += Math.sin(frameCount * 0.08) * 0.6
    this.rotation = 0

    this.wingTimer++
    if (this.wingTimer >= Config.BIRD.WING_ANIM_SPEED) {
      this.wingTimer = 0
      this.wingFrame = (this.wingFrame + 1) % 3
    }
  }

  /**
   * 渲染小鸟（像素风格）
   * @param {CanvasRenderingContext2D} ctx
   * @param {boolean} showShield - 是否显示护盾
   */
  render(ctx, showShield) {
    const { BIRD, VISUAL } = Config

    // 无敌闪烁效果
    if (this.invincibleBlink > 0 && Math.floor(this.invincibleBlink / 4) % 2 === 0) {
      // 闪烁帧跳过渲染
    } else {
      ctx.save()
      ctx.translate(this.x, this.y)
      ctx.rotate(this.rotation)

      const r = this.width / 2

      // ---- 身体 ----
      ctx.fillStyle = VISUAL.BIRD_BODY
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = VISUAL.BIRD_OUTLINE
      ctx.lineWidth = 2
      ctx.stroke()

      // ---- 翅膀 ----
      const wingOffsets = [-5, 0, 5]
      const wingY = wingOffsets[this.wingFrame]
      ctx.fillStyle = VISUAL.BIRD_WING
      ctx.beginPath()
      ctx.ellipse(-5, wingY, 10, 7, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = VISUAL.BIRD_OUTLINE
      ctx.lineWidth = 1.5
      ctx.stroke()

      // ---- 眼睛 ----
      ctx.fillStyle = VISUAL.BIRD_EYE
      ctx.beginPath()
      ctx.arc(8, -6, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = VISUAL.BIRD_OUTLINE
      ctx.lineWidth = 1.5
      ctx.stroke()

      // 瞳孔
      ctx.fillStyle = VISUAL.BIRD_PUPIL
      ctx.beginPath()
      ctx.arc(10, -6, 2, 0, Math.PI * 2)
      ctx.fill()

      // ---- 喙 ----
      ctx.fillStyle = VISUAL.BIRD_BEAK
      ctx.beginPath()
      ctx.moveTo(12, 0)
      ctx.lineTo(22, -2)
      ctx.lineTo(12, 4)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = VISUAL.BIRD_OUTLINE
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.restore()
    }

    // 护盾光环
    if (showShield) {
      ctx.save()
      ctx.translate(this.x, this.y)
      const shieldR = this.width / 2 + 8 + Math.sin(Date.now() * 0.005) * 2
      ctx.fillStyle = VISUAL.SHIELD_COLOR
      ctx.beginPath()
      ctx.arc(0, 0, shieldR, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = VISUAL.SHIELD_OUTLINE
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.restore()
    }
  }
}

module.exports = Bird
