/**
 * Missile.js - 导弹实体 [v1.3.0新增]
 *
 * 拾取导弹道具后从小鸟位置向右发射，带弱追踪（每帧朝目标方向修正有限角度）。
 * 目标由 Game 选定：存活怪物中最近者优先，无怪物选最近 destructible 管道，无目标直飞。
 * 目标中途失效（被销毁/出屏）则保持当前方向直飞。
 * 飞行速度随世界快慢缩放（速度包减速/时间扭曲对导弹同样生效）。
 * 渲染：拖尾 + 弹头（弹身/弹头/尾翼/尾焰）。
 */

const Config = require('../config/GameConfig.js')

class Missile {
  /**
   * @param {number} x - 发射点X（小鸟头部）
   * @param {number} y - 发射点Y
   * @param {Object} [target] - 追踪目标（Monster 或 destructible Pipe），可空
   * @param {number} [angle] - [v1.4.0] 初始飞行方向（rad，导弹挂架扇形多发用），默认 0=水平向右
   */
  constructor(x, y, target, angle) {
    this.x = x
    this.y = y
    this.target = target || null
    this.angle = angle || 0     // 当前飞行方向（rad，0=水平向右）
    this.trail = []             // 拖尾点（定长数组，上限 TRAIL_LENGTH）
    this.type = 'missile'
    this._flamePhase = Math.random() * Math.PI * 2  // 尾焰闪烁相位
  }

  /**
   * 每帧更新
   * @param {number} speedFactor - 世界速度系数（scrollSpeed / SCROLL_SPEED），减速时导弹同步变慢
   */
  update(speedFactor) {
    const M = Config.MISSILE
    const speed = M.SPEED * (speedFactor > 0 ? speedFactor : 1)

    // 目标失效（HP 归零/飞出屏幕）→ 直飞
    if (this.target && (this.target.hp <= 0 || this.target.x + this.target.width < 0)) {
      this.target = null
    }

    // 弱追踪：朝目标方向修正，每帧最多转 TURN_RATE
    if (this.target) {
      const tp = this._targetPoint()
      const want = Math.atan2(tp.y - this.y, tp.x - this.x)
      let diff = want - this.angle
      // 归一化到 [-PI, PI]，保证走最短转向
      while (diff > Math.PI) diff -= Math.PI * 2
      while (diff < -Math.PI) diff += Math.PI * 2
      if (diff > M.TURN_RATE) diff = M.TURN_RATE
      else if (diff < -M.TURN_RATE) diff = -M.TURN_RATE
      this.angle += diff
    }

    // 拖尾（定长，避免每帧大对象分配）
    this.trail.push({ x: this.x, y: this.y })
    if (this.trail.length > M.TRAIL_LENGTH) this.trail.shift()

    this.x += Math.cos(this.angle) * speed
    this.y += Math.sin(this.angle) * speed
    this._flamePhase += 0.6
  }

  /**
   * 目标瞄准点：怪物=中心；管道=离导弹较近一侧管体的边缘
   */
  _targetPoint() {
    const t = this.target
    if (t.type === 'monster') {
      return { x: t.x + t.width / 2, y: t.y }
    }
    // 管道：瞄准上管底部或下管顶部（取较近者），保证命中判定稳定
    const cx = t.x + t.width / 2
    const topY = t.topHeight - 10
    const bottomY = t.bottomY + 10
    const y = Math.abs(this.y - topY) < Math.abs(this.y - bottomY) ? topY : bottomY
    return { x: cx, y: y }
  }

  /**
   * 命中判定（由 Game 调用）
   * @param {Object} ob - Monster 或 destructible Pipe
   * @returns {boolean}
   */
  hitTest(ob) {
    const M = Config.MISSILE
    // [v1.5.0] isBoss 并入中心盒分支：Boss 与 Monster 同为"左缘 x + 中心 y"约定；
    // 走管道分支会用 topHeight/bottomY 间隙判定导致永远打不中本体（管道分支是"打管身避间隙"语义）
    if (ob.type === 'monster' || ob.isBoss) {
      return Math.abs(this.x - (ob.x + ob.width / 2)) < ob.width / 2 + M.WIDTH / 2 &&
             Math.abs(this.y - ob.y) < ob.height / 2 + M.HEIGHT / 2
    }
    // 管道：弹点进入上管或下管区域即命中
    if (this.x + M.WIDTH / 2 < ob.x || this.x - M.WIDTH / 2 > ob.x + ob.width) return false
    return this.y < ob.topHeight || this.y > ob.bottomY
  }

  /**
   * 是否飞出屏幕
   */
  isOffscreen(screenW, screenH) {
    return this.x > screenW + 30 || this.y < -30 || this.y > screenH + 30
  }

  /**
   * 渲染：拖尾 + 弹头
   */
  render(ctx) {
    const M = Config.MISSILE

    // 拖尾（渐隐圆点，尾部小头部大）
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i]
      const ratio = (i + 1) / this.trail.length
      ctx.fillStyle = 'rgba(255, 160, 60, ' + (ratio * 0.4).toFixed(3) + ')'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 1.5 + ratio * 2, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.rotate(this.angle)

    // 尾焰（随相位闪烁）
    const flame = 4 + Math.sin(this._flamePhase) * 1.5
    ctx.fillStyle = '#f39c12'
    ctx.beginPath()
    ctx.moveTo(-M.WIDTH / 2, -2.5)
    ctx.lineTo(-M.WIDTH / 2 - flame - 3, 0)
    ctx.lineTo(-M.WIDTH / 2, 2.5)
    ctx.closePath()
    ctx.fill()

    // 弹身
    ctx.fillStyle = '#ecf0f1'
    ctx.fillRect(-M.WIDTH / 2, -M.HEIGHT / 2, M.WIDTH, M.HEIGHT)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1.5
    ctx.strokeRect(-M.WIDTH / 2, -M.HEIGHT / 2, M.WIDTH, M.HEIGHT)

    // 弹头（红色三角）
    ctx.fillStyle = '#e74c3c'
    ctx.beginPath()
    ctx.moveTo(M.WIDTH / 2, -M.HEIGHT / 2)
    ctx.lineTo(M.WIDTH / 2 + 6, 0)
    ctx.lineTo(M.WIDTH / 2, M.HEIGHT / 2)
    ctx.closePath()
    ctx.fill()

    // 尾翼
    ctx.fillStyle = '#c0392b'
    ctx.beginPath()
    ctx.moveTo(-M.WIDTH / 2, -M.HEIGHT / 2)
    ctx.lineTo(-M.WIDTH / 2 - 4, -M.HEIGHT / 2 - 4)
    ctx.lineTo(-M.WIDTH / 2 + 3, -M.HEIGHT / 2)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-M.WIDTH / 2, M.HEIGHT / 2)
    ctx.lineTo(-M.WIDTH / 2 - 4, M.HEIGHT / 2 + 4)
    ctx.lineTo(-M.WIDTH / 2 + 3, M.HEIGHT / 2)
    ctx.closePath()
    ctx.fill()

    ctx.restore()
  }
}

module.exports = Missile
