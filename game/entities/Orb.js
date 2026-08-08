/**
 * Orb.js - 经验球实体 [v1.1.0] 继承 Collectible 基类
 *
 * 负责：沿管道间隙路径生成、跟随世界滚动、磁吸小鸟、拾取判定、像素风渲染。
 * 继承 Collectible，与 Item 共享统一的 update/checkCollect/isOffscreen 接口。
 */

const Config = require('../config/GameConfig.js')
const Collectible = require('./Collectible.js')

class Orb extends Collectible {
  /**
   * @param {number} x - 初始中心X
   * @param {number} y - 初始中心Y
   */
  constructor(x, y) {
    super(x, y, Config.ORB.RADIUS)
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
