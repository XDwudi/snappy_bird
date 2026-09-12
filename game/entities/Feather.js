/**
 * Feather.js - Boss 羽刃弹幕实体 [v1.5.0 步骤C]
 *
 * §4.8：水平弹幕（Hailstone 改水平飞行）——Boss 每轮扇形发射 N 发，
 * 间隔角 BOSS.FAN_ANGLE_STEP(0.35rad)，半径 5px，伤害固定 1，命中走 Game._handleCollision
 * 统一受击链（C7 坚韧外皮格挡 → 羽盾 → 护盾 → HP）。
 * 视觉按变体配色：Ch1 羽刃（闪电蓝）/ Ch2 沙锥（#e0aa5e），均带短尾迹。
 * 时之晶冻结期由 Game 侧停 update（只停移动，不取消碰撞判定，与怪物同语义）。
 */

const Config = require('../config/GameConfig.js')

class Feather {
  /**
   * @param {number} x - 发射点X（Boss 喙部）
   * @param {number} y - 发射点Y
   * @param {number} angle - 飞行方向（rad，π=水平向左，扇形偏移 ±FAN_ANGLE_STEP）
   * @param {number} speed - 弹速（px/帧，变体参数，不随世界滚动缩放——弹幕节奏独立）
   * @param {string} color - 弹幕颜色（变体参数：羽刃蓝 / 沙锥棕）
   */
  constructor(x, y, angle, speed, color) {
    this.x = x
    this.y = y
    this.vx = Math.cos(angle) * speed
    this.vy = Math.sin(angle) * speed
    this.angle = angle
    this.radius = Config.BOSS.FEATHER_RADIUS
    this.damage = Config.BOSS.FEATHER_DAMAGE   // 固定 1（§4.8）
    this.color = color
    this.type = 'feather'      // 受击链来源判定用（C7 格挡对弹幕生效）
    this.alive = true
    this.trail = []            // 短尾迹
    this._spin = 0             // 自旋相位（羽刃旋转视觉）
  }

  /**
   * 每帧更新
   * @param {number} [timeScale] - 时间缩放（Boss 死亡慢动作 0.5× 复用；缺省 1）
   */
  update(timeScale) {
    const k = timeScale == null ? 1 : timeScale
    this.trail.push({ x: this.x, y: this.y })
    if (this.trail.length > 4) this.trail.shift()
    this.x += this.vx * k
    this.y += this.vy * k
    this._spin += 0.25 * k
  }

  /**
   * 与小鸟的碰撞检测（圆形 vs 小鸟碰撞盒外接圆，同 Hailstone 口径）
   * @param {Object} bird
   * @returns {boolean}
   */
  checkCollision(bird) {
    const dx = this.x - bird.x
    const dy = this.y - bird.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const collisionRadius = Math.max(bird.collisionWidth, bird.collisionHeight) / 2
    return dist < this.radius + collisionRadius
  }

  /** 是否离开屏幕（弹幕向左飞，主要看左边界；上下边界兜底） */
  isOffscreen(screenW, screenH) {
    return this.x < -20 || this.x > screenW + 30 || this.y < -20 || this.y > screenH + 20
  }

  render(ctx) {
    // 尾迹（渐隐小点）
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i]
      const alpha = (i / this.trail.length) * 0.35
      ctx.fillStyle = 'rgba(255, 255, 255, ' + alpha.toFixed(3) + ')'
      ctx.beginPath()
      ctx.arc(t.x, t.y, this.radius * (0.3 + 0.5 * i / this.trail.length), 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.angle + this._spin * 0.3)

    // 外层光晕
    ctx.fillStyle = this.color
    ctx.globalAlpha = 0.25
    ctx.beginPath()
    ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1

    // 羽刃/沙锥主体：指向飞行方向的梭形（前尖后羽）
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.moveTo(this.radius * 1.6, 0)
    ctx.lineTo(-this.radius * 0.8, -this.radius * 0.7)
    ctx.lineTo(-this.radius * 0.3, 0)
    ctx.lineTo(-this.radius * 0.8, this.radius * 0.7)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.lineWidth = 1
    ctx.stroke()

    // 核心亮点
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(this.radius * 0.3, 0, this.radius * 0.35, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }
}

module.exports = Feather
