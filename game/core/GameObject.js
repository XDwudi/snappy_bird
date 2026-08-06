/**
 * GameObject.js - 游戏对象基类
 * 
 * 所有游戏实体的基类，提供位置、尺寸、存活状态等基础属性。
 */

class GameObject {
  /**
   * @param {number} x - 中心X坐标
   * @param {number} y - 中心Y坐标
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  constructor(x, y, width, height) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.alive = true
    this.frameCount = 0
  }

  /**
   * 获取碰撞箱（左上角坐标 + 尺寸）
   * 子类可覆盖以实现自定义碰撞箱
   * @returns {Object} {x, y, width, height}
   */
  getBounds() {
    return {
      x: this.x - this.width / 2,
      y: this.y - this.height / 2,
      width: this.width,
      height: this.height
    }
  }

  /**
   * 每帧更新逻辑，子类覆盖
   */
  update() {
    this.frameCount++
  }

  /**
   * 每帧渲染逻辑，子类覆盖
   * @param {CanvasRenderingContext2D} ctx
   */
  render(ctx) {
    // 子类实现
  }

  /**
   * 销毁
   */
  destroy() {
    this.alive = false
  }
}

module.exports = GameObject
