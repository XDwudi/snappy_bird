/**
 * Bird.js - 小鸟实体
 * 
 * 负责：物理运动（重力/拍翅）、旋转动画、翅膀动画、像素风格渲染。
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
    this.collisionWidth = this.width * Config.BIRD.COLLISION_RATIO
    this.collisionHeight = this.height * Config.BIRD.COLLISION_RATIO
  }

  /**
   * 拍翅——施加瞬间上升速度
   */
  flap() {
    this.velocity = Config.BIRD.FLAP_FORCE
    this.wingFrame = 0
    this.wingTimer = 0
  }

  /**
   * 物理更新（游玩态）
   */
  update() {
    const { BIRD } = Config

    // 重力
    this.velocity += BIRD.GRAVITY
    if (this.velocity > BIRD.MAX_FALL_SPEED) {
      this.velocity = BIRD.MAX_FALL_SPEED
    }

    // 位置更新
    this.y += this.velocity

    // 旋转：上升时朝上，下落时逐渐朝下
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
   */
  render(ctx) {
    const { BIRD, VISUAL } = Config

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)

    const r = this.width / 2

    // ---- 身体 ----
    ctx.fillStyle = VISUAL.BIRD_BODY
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.fill()

    // 身体描边
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
}

module.exports = Bird
