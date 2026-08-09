/**
 * Item.js - 道具实体 [v1.1.0新增, v1.1.4图标区分]
 *
 * 继承 Collectible，支持4种道具类型：
 * - exp_pack: 经验包（随机15~30经验）
 * - health_pack: 血包（恢复1HP）
 * - shield_pack: 护盾包（1层护盾，5秒）
 * - speed_pack: 速度包（3秒全局减速50%）
 *
 * [v1.1.4] 道具图标视觉区分：每种道具有独特形状，玩家一眼识别效果。
 * 道具受磁吸能力影响，拾取后触发对应效果。
 */

const Config = require('../config/GameConfig.js')
const Collectible = require('./Collectible.js')

class Item extends Collectible {
  /**
   * @param {number} x - 初始中心X
   * @param {number} y - 初始中心Y
   * @param {string} type - 道具类型
   */
  constructor(x, y, type) {
    super(x, y, Config.ITEM.RADIUS)
    this.type = type
    this.color = Config.ITEM.COLORS[type] || '#888888'
  }

  /**
   * 渲染道具 [v1.1.4] 每种道具独特图标
   */
  render(ctx) {
    const pulse = Math.sin(this.pulsePhase) * 0.15 + 1
    const r = this.radius * pulse

    // 外层光晕（道具颜色）
    ctx.fillStyle = this._hexToRgba(this.color, 0.25)
    ctx.beginPath()
    ctx.arc(this.x, this.y, r * 2.2, 0, Math.PI * 2)
    ctx.fill()

    // 主体圆形
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2)
    ctx.fill()

    // 描边
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.stroke()

    // [v1.1.4] 按类型绘制独特图标
    switch (this.type) {
      case 'health_pack':
        this._drawHealthIcon(ctx, r)
        break
      case 'exp_pack':
        this._drawExpIcon(ctx, r)
        break
      case 'shield_pack':
        this._drawShieldIcon(ctx, r)
        break
      case 'speed_pack':
        this._drawSpeedIcon(ctx, r)
        break
    }
  }

  /**
   * [v1.1.4] 血包——白色医疗十字
   */
  _drawHealthIcon(ctx, r) {
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 0.5
    // 横条
    const bw = r * 1.0
    const bh = r * 0.3
    ctx.fillRect(this.x - bw / 2, this.y - bh / 2, bw, bh)
    ctx.strokeRect(this.x - bw / 2, this.y - bh / 2, bw, bh)
    // 竖条
    const vw = r * 0.3
    const vh = r * 1.0
    ctx.fillRect(this.x - vw / 2, this.y - vh / 2, vw, vh)
    ctx.strokeRect(this.x - vw / 2, this.y - vh / 2, vw, vh)
  }

  /**
   * [v1.1.4] 经验包——黄色五角星
   */
  _drawExpIcon(ctx, r) {
    const spikes = 5
    const outerR = r * 0.7
    const innerR = r * 0.3
    ctx.fillStyle = '#ffd700'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? outerR : innerR
      const angle = (Math.PI / spikes) * i - Math.PI / 2
      const px = this.x + Math.cos(angle) * rad
      const py = this.y + Math.sin(angle) * rad
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  /**
   * [v1.1.4] 护盾包——白色盾牌形状
   */
  _drawShieldIcon(ctx, r) {
    const sr = r * 0.65
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(this.x, this.y - sr)
    ctx.lineTo(this.x + sr * 0.7, this.y - sr * 0.4)
    ctx.lineTo(this.x + sr * 0.6, this.y + sr * 0.2)
    ctx.lineTo(this.x, this.y + sr * 0.8)
    ctx.lineTo(this.x - sr * 0.6, this.y + sr * 0.2)
    ctx.lineTo(this.x - sr * 0.7, this.y - sr * 0.4)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    // 内部小十字
    ctx.fillStyle = this.color
    const cs = sr * 0.35
    ctx.fillRect(this.x - cs * 0.6, this.y - cs * 0.2, cs * 1.2, cs * 0.4)
    ctx.fillRect(this.x - cs * 0.2, this.y - cs * 0.6, cs * 0.4, cs * 1.2)
  }

  /**
   * [v1.1.4] 速度包——黄色闪电
   */
  _drawSpeedIcon(ctx, r) {
    const sr = r * 0.7
    ctx.fillStyle = '#ffd700'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(this.x + sr * 0.15, this.y - sr * 0.8)
    ctx.lineTo(this.x - sr * 0.4, this.y + sr * 0.1)
    ctx.lineTo(this.x - sr * 0.05, this.y + sr * 0.1)
    ctx.lineTo(this.x - sr * 0.2, this.y + sr * 0.8)
    ctx.lineTo(this.x + sr * 0.45, this.y - sr * 0.15)
    ctx.lineTo(this.x + sr * 0.1, this.y - sr * 0.15)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  /**
   * hex 转 rgba 字符串
   */
  _hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
}

module.exports = Item
