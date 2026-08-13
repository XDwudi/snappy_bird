/**
 * Hailstone.js - 冰雹实体 [v1.2.0新增]
 *
 * 从屏幕顶部掉落，触碰玩家造成1点伤害。
 * 走碰撞优先级链：统一护盾 > 冰晶护体 > HP扣血。
 */

class Hailstone {
  /**
   * @param {number} x - 初始X
   * @param {number} y - 初始Y
   * @param {number} speed - 下落速度
   * @param {number} radius - 半径
   */
  constructor(x, y, speed, radius) {
    this.x = x
    this.y = y
    this.vy = speed
    this.radius = radius
    this.rotation = 0
    this.rotationSpeed = (Math.random() - 0.5) * 0.2
    this.alive = true
    this.trail = []             // 尾迹
  }

  update() {
    // 记录尾迹
    this.trail.push({ x: this.x, y: this.y })
    if (this.trail.length > 5) this.trail.shift()

    this.y += this.vy
    this.rotation += this.rotationSpeed
  }

  /**
   * 与小鸟的碰撞检测
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

  /**
   * 是否离开屏幕底部
   */
  isOffscreen(screenH) {
    return this.y > screenH + 20
  }

  render(ctx) {
    // 尾迹
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i]
      const alpha = (i / this.trail.length) * 0.3
      ctx.fillStyle = `rgba(200, 220, 255, ${alpha})`
      ctx.beginPath()
      ctx.arc(t.x, t.y, this.radius * (i / this.trail.length), 0, Math.PI * 2)
      ctx.fill()
    }

    // 冰球主体
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.rotation)

    // 外层光晕
    ctx.fillStyle = 'rgba(200, 220, 255, 0.3)'
    ctx.beginPath()
    ctx.arc(0, 0, this.radius * 1.3, 0, Math.PI * 2)
    ctx.fill()

    // 冰球
    ctx.fillStyle = '#e8f0ff'
    ctx.beginPath()
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2)
    ctx.fill()

    ctx.strokeStyle = '#a0b8d0'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.beginPath()
    ctx.arc(-this.radius * 0.3, -this.radius * 0.3, this.radius * 0.3, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }
}

module.exports = Hailstone
