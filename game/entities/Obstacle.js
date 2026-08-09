/**
 * Obstacle.js - 障碍物基类 [v1.1.0新增, v1.1.5缩小射线动画]
 *
 * 所有障碍物（管道、移动管道、尖刺等）继承此类。
 * 提供统一接口：update / checkCollision / render / passed标记。
 * [v1.1.5] 新增缩小射线动画：shrinkBonus驱动管道两侧缓缓缩回，间隙逐渐增大。
 * 子类只需实现具体的位置更新、碰撞检测和渲染逻辑。
 *
 * 未来扩展时，新增子类只需继承并实现以下方法：
 * - _doUpdate(speed) — 具体的位置更新逻辑
 * - _doCheckCollision(bird) — 具体的碰撞检测逻辑
 * - _doRender(ctx) — 具体的渲染逻辑
 */

class Obstacle {
  /**
   * @param {number} x - 左上角X
   * @param {number} topHeight - 上障碍物高度
   * @param {number} gap - 间隙高度
   * @param {number} groundY - 地面顶部Y坐标
   * @param {number} width - 障碍物宽度
   */
  constructor(x, topHeight, gap, groundY, width) {
    this.x = x
    this.width = width
    this.origTopHeight = topHeight       // [v1.1.5] 原始上管道高度（动画基准）
    this.origGap = gap                    // [v1.1.5] 原始间隙（动画基准）
    this.topHeight = topHeight
    this.gap = gap
    this.groundY = groundY
    this.bottomY = topHeight + gap
    this.bottomHeight = groundY - this.bottomY
    this.passed = false
    this.nearMissTriggered = false       // [v1.1.5] 擦边是否已触发（防重复）
    this.type = 'obstacle'  // 子类可覆盖

    // [v1.1.5] 缩小射线动画
    this.shrinkBonus = 0                 // 间隙增大量（由能力系统设置）
    this.currentShrink = 0               // 当前已缩回量（0 → shrinkBonus）
  }

  /**
   * 更新位置（模板方法，子类覆盖 _doUpdate）
   * @param {number} speed - 滚动速度
   */
  update(speed) {
    this._doUpdate(speed)
  }

  /**
   * 子类实现：具体的位置更新逻辑
   */
  _doUpdate(speed) {
    this.x -= speed

    // [v1.1.5] 缩小射线动画：管道两侧缓缓缩回
    if (this.shrinkBonus > 0 && this.currentShrink < this.shrinkBonus) {
      const animFrames = 30
      this.currentShrink = Math.min(
        this.currentShrink + this.shrinkBonus / animFrames,
        this.shrinkBonus
      )
      // 上管道缩回（高度减少），下管道缩回（起始位置下移）
      this.topHeight = this.origTopHeight - this.currentShrink / 2
      this.gap = this.origGap + this.currentShrink
      this.bottomY = this.topHeight + this.gap
      this.bottomHeight = this.groundY - this.bottomY
    }
  }

  /**
   * 与小鸟的碰撞检测（模板方法，子类可覆盖 _doCheckCollision）
   * @param {Object} bird - 小鸟实体
   * @returns {boolean}
   */
  checkCollision(bird) {
    return this._doCheckCollision(bird)
  }

  /**
   * 子类实现：具体的碰撞检测逻辑
   * 默认实现：AABB 碰撞检测（上下成对障碍物）
   */
  _doCheckCollision(bird) {
    const birdLeft = bird.x - bird.collisionWidth / 2
    const birdRight = bird.x + bird.collisionWidth / 2
    const birdTop = bird.y - bird.collisionHeight / 2
    const birdBottom = bird.y + bird.collisionHeight / 2

    if (birdRight <= this.x || birdLeft >= this.x + this.width) {
      return false
    }
    if (birdTop <= this.topHeight) return true
    if (birdBottom >= this.bottomY) return true
    return false
  }

  /**
   * 渲染（模板方法，子类覆盖 _doRender）
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    this._doRender(ctx)
  }

  /**
   * 子类实现：具体的渲染逻辑
   */
  _doRender(ctx) {
    // 基类默认不渲染，由子类实现
  }

  /**
   * 是否已离开屏幕
   */
  isOffscreen() {
    return this.x + this.width < -10
  }
}

module.exports = Obstacle
