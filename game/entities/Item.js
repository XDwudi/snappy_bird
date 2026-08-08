/**
 * Item.js - 道具实体 [v1.1.0新增]
 *
 * 继承 Collectible，支持4种道具类型：
 * - exp_pack: 经验包（随机15~30经验）
 * - health_pack: 血包（恢复1HP）
 * - shield_pack: 护盾包（1层护盾，5秒）
 * - speed_pack: 速度包（3秒全局减速50%）
 *
 * 道具受磁吸能力影响，拾取后触发对应效果。
 */

const Config = require('../config/GameConfig.js')
const Collectible = require('./Collectible.js')

// 道具类型图标
const ITEM_ICONS = {
  exp_pack: '📦',
  health_pack: '🩹',
  shield_pack: '🛡️',
  speed_pack: '⏱️'
}

class Item extends Collectible {
  /**
   * @param {number} x - 初始中心X
   * @param {number} y - 初始中心Y
   * @param {string} type - 道具类型
   */
  constructor(x, y, type) {
    super(x, y, Config.ITEM.RADIUS)
    this.type = type
    this.icon = ITEM_ICONS[type] || '❓'
    this.color = Config.ITEM.COLORS[type] || '#888888'
  }

  /**
   * 渲染道具
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

    // 内层高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'
    ctx.beginPath()
    ctx.arc(this.x - r * 0.3, this.y - r * 0.3, r * 0.4, 0, Math.PI * 2)
    ctx.fill()

    // 图标
    ctx.font = `${Math.round(r * 1.1)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(this.icon, this.x, this.y + 1)
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
