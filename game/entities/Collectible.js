/**
 * Collectible.js - 拾取物基类 [v1.1.0新增]
 *
 * 所有可拾取物（经验球、道具）继承此类。
 * 提供统一接口：update / checkCollect / isOffscreen / render。
 * 子类实现具体的磁吸行为、拾取判定和渲染。
 *
 * 继承体系：
 *   Collectible
 *     ├── Orb (经验球)
 *     └── Item (道具)
 */

class Collectible {
  /**
   * @param {number} x - 初始中心X
   * @param {number} y - 初始中心Y
   * @param {number} radius - 拾取物半径
   */
  constructor(x, y, radius) {
    this.x = x
    this.y = y
    this.radius = radius
    this.collected = false
    this.attracted = false
    this.pulsePhase = Math.random() * Math.PI * 2
  }

  /**
   * 更新（模板方法）
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
      const force = 0.8 * (1 - dist / attractRange)
      this.x += dx / dist * force * 4
      this.y += dy / dist * force * 4
    }

    // 脉冲动画
    this.pulsePhase += 0.1
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
   * 渲染（由子类实现）
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    // 基类默认不渲染，由子类实现
  }
}

module.exports = Collectible
