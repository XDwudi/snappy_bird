/**
 * Orb.js - 经验球实体
 *
 * 负责：沿管道间隙路径生成、跟随世界滚动、磁吸小鸟、拾取判定、像素风渲染。
 */

const Config = require('../config/GameConfig.js')

class Orb {
  /**
   * @param {number} x - 初始中心X
   * @param {number} y - 初始中心Y
   */
  constructor(x, y) {
    this.x = x
    this.y = y
    this.radius = Config.ORB.RADIUS
    this.collected = false
    this.pulsePhase = Math.random() * Math.PI * 2 // 随机脉冲起始相位
    this.attracted = false  // 是否被磁吸
  }

  /**
   * 更新经验球
   * @param {number} scrollSpeed - 世界滚动速度
   * @param {Object} bird - 小鸟实体
   * @param {number} attractRange - 磁吸范围
   */
  update(scrollSpeed, bird, attractRange) {
    // 世界滚动
    this.x -= scrollSpeed

    // 磁吸判定
    const dx = bird.x - this.x
    const dy = bird.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < attractRange) {
      this.attracted = true
      // 向小鸟加速移动
      const force = Config.ORB.ATTRACT_FORCE * (1 - dist / attractRange)
      this.x += dx / dist * force * 4
      this.y += dy / dist * force * 4
    }

    // 脉冲动画
    this.pulsePhase += Config.ORB.PULSE_SPEED
  }

  /**
   * 检查是否被小鸟拾取
   * @param {Object} bird - 小鸟实体
   * @returns {boolean}
   */
  checkCollect(bird) {
    const dx = bird.x - this.x
    const dy = bird.y - this.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const collectRange = this.radius + Math.max(bird.collisionWidth, bird.collisionHeight) / 2
    return dist < collectRange
  }

  /**
   * 是否已离开屏幕
   */
  isOffscreen() {
    return this.x + this.radius < -10
  }

  /**
   * 渲染经验球
   */
  render(ctx) {
    const { ORB, VISUAL } = Config
    const pulse = Math.sin(this.pulsePhase) * 0.2 + 1
    const r = this.radius * pulse

    // 外层光晕
    ctx.fillStyle = VISUAL.ORB_OUTER
    ctx.beginPath()
    ctx.arc(this.x, this.y, r * 2.5, 0, Math.PI * 2)
    ctx.fill()

    // 主体
    ctx.fillStyle = VISUAL.ORB_GLOW
    ctx.beginPath()
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2)
    ctx.fill()

    // 描边
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 内核高光
    ctx.fillStyle = VISUAL.ORB_CORE
    ctx.beginPath()
    ctx.arc(this.x - r * 0.3, this.y - r * 0.3, r * 0.4, 0, Math.PI * 2)
    ctx.fill()
  }
}

module.exports = Orb
