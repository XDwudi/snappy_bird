/**
 * Pipe.js - 管道障碍实体
 * 
 * 负责：管道移动、碰撞检测、像素风格渲染（上下成对+帽）。
 */

const Config = require('../config/GameConfig.js')

class Pipe {
  /**
   * @param {number} x - 左上角X
   * @param {number} topHeight - 上管道高度
   * @param {number} gap - 管道间隙
   * @param {number} groundY - 地面顶部Y坐标
   */
  constructor(x, topHeight, gap, groundY) {
    this.x = x
    this.width = Config.PIPE.WIDTH
    this.topHeight = topHeight
    this.gap = gap
    this.groundY = groundY
    this.bottomY = topHeight + gap // 下管道顶部Y
    this.bottomHeight = groundY - this.bottomY
    this.passed = false
  }

  /**
   * 更新位置
   * @param {number} speed - 滚动速度
   */
  update(speed) {
    this.x -= speed
  }

  /**
   * 与小鸟的碰撞检测
   * @param {Bird} bird - 小鸟实体
   * @returns {boolean}
   */
  checkCollision(bird) {
    // 小鸟碰撞箱（中心点坐标转左上角）
    const birdLeft = bird.x - bird.collisionWidth / 2
    const birdRight = bird.x + bird.collisionWidth / 2
    const birdTop = bird.y - bird.collisionHeight / 2
    const birdBottom = bird.y + bird.collisionHeight / 2

    const pipeLeft = this.x
    const pipeRight = this.x + this.width

    // 小鸟不在管道X范围内 → 无碰撞
    if (birdRight <= pipeLeft || birdLeft >= pipeRight) {
      return false
    }

    // 碰到上管道
    if (birdTop <= this.topHeight) {
      return true
    }

    // 碰到下管道
    if (birdBottom >= this.bottomY) {
      return true
    }

    return false
  }

  /**
   * 渲染管道（像素风格）
   */
  render(ctx) {
    const { PIPE, VISUAL } = Config

    // 上管道
    this._drawPipeBody(ctx, this.x, 0, this.width, this.topHeight)
    this._drawPipeCap(ctx, this.x, this.topHeight - PIPE.CAP_HEIGHT, true)

    // 下管道
    this._drawPipeBody(ctx, this.x, this.bottomY, this.width, this.bottomHeight)
    this._drawPipeCap(ctx, this.x, this.bottomY, false)
  }

  /**
   * 绘制管道主体
   */
  _drawPipeBody(ctx, x, y, w, h) {
    const { VISUAL } = Config

    // 主体填充
    ctx.fillStyle = VISUAL.PIPE_BODY
    ctx.fillRect(x, y, w, h)

    // 高光（左侧）
    ctx.fillStyle = VISUAL.PIPE_HIGHLIGHT
    ctx.fillRect(x + 3, y, 5, h)

    // 阴影（右侧）
    ctx.fillStyle = VISUAL.PIPE_SHADOW
    ctx.fillRect(x + w - 8, y, 5, h)

    // 描边
    ctx.strokeStyle = VISUAL.PIPE_OUTLINE
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, w, h)
  }

  /**
   * 绘制管道帽
   */
  _drawPipeCap(ctx, x, y, isTop) {
    const { PIPE, VISUAL } = Config
    const capW = this.width + PIPE.CAP_OVERHANG * 2
    const capX = x - PIPE.CAP_OVERHANG

    // 主体填充
    ctx.fillStyle = VISUAL.PIPE_BODY
    ctx.fillRect(capX, y, capW, PIPE.CAP_HEIGHT)

    // 高光
    ctx.fillStyle = VISUAL.PIPE_HIGHLIGHT
    ctx.fillRect(capX + 3, y, 5, PIPE.CAP_HEIGHT)

    // 阴影
    ctx.fillStyle = VISUAL.PIPE_SHADOW
    ctx.fillRect(capX + capW - 8, y, 5, PIPE.CAP_HEIGHT)

    // 描边
    ctx.strokeStyle = VISUAL.PIPE_OUTLINE
    ctx.lineWidth = 2
    ctx.strokeRect(capX, y, capW, PIPE.CAP_HEIGHT)
  }
}

module.exports = Pipe
