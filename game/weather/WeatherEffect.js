/**
 * WeatherEffect.js - 环境效果基类 [v1.2.0新增]
 *
 * 所有环境效果（风/雨/冰雹等）继承此类。
 * 采用模板方法模式，子类实现具体逻辑：
 * - onTrigger(gameCtx) - 触发时
 * - update(gameCtx) - 每帧更新
 * - onExpire(gameCtx) - 结束时
 * - render(ctx, screenW, screenH) - 渲染
 * - getDuration(gameTime) - 获取持续时间
 *
 * 未来扩展时，新增环境效果只需继承并实现上述方法。
 */

class WeatherEffect {
  /**
   * @param {string} type - 效果类型 'wind' | 'rain' | 'hail' | ...
   * @param {string} name - 显示名称
   */
  constructor(type, name) {
    this.type = type
    this.name = name
    this.duration = 0          // 持续时间（帧）
    this.elapsed = 0           // 已经过时间（帧）
    this.active = false        // 是否活跃
  }

  /**
   * 触发效果（子类实现）
   * @param {Object} gameCtx - 游戏上下文 { gameTime, bird, screenW, screenH, abilities, ... }
   */
  onTrigger(gameCtx) {
    this.active = true
    this.elapsed = 0
  }

  /**
   * 每帧更新（子类实现）
   * @param {Object} gameCtx
   */
  update(gameCtx) {
    this.elapsed++
  }

  /**
   * 效果结束时（子类实现）
   * @param {Object} gameCtx
   */
  onExpire(gameCtx) {
    this.active = false
  }

  /**
   * 渲染（子类实现）
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} screenW
   * @param {number} screenH
   * @param {Object} [gameCtx] - 游戏上下文（含bird等，供效果渲染需要）
   */
  render(ctx, screenW, screenH, gameCtx) {
    // 基类默认不渲染
  }

  /**
   * 获取持续时间（子类实现，基于游戏时长）
   * @param {number} gameTime - 游戏时长（帧）
   * @returns {number} 持续时间（帧）
   */
  getDuration(gameTime) {
    return 600
  }

  /**
   * 进度 0~1
   */
  get progress() {
    return this.duration > 0 ? this.elapsed / this.duration : 0
  }

  /**
   * sin曲线强度（0→1→0），用于力量/密度曲线变化
   */
  get sinIntensity() {
    return Math.sin(this.progress * Math.PI)
  }

  /**
   * 是否已结束
   */
  isExpired() {
    return this.elapsed >= this.duration
  }
}

module.exports = WeatherEffect
