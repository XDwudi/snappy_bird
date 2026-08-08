/**
 * Pipe.js - 管道障碍实体 [v1.1.0] 继承 Obstacle 基类
 *
 * 负责：管道移动、碰撞检测、像素风格渲染（上下成对+帽）。
 * 继承 Obstacle，未来扩展（MovingPipe 等）只需继承同一基类。
 */

const Config = require('../config/GameConfig.js')
const Obstacle = require('./Obstacle.js')

class Pipe extends Obstacle {
  /**
   * @param {number} x - 左上角X
   * @param {number} topHeight - 上管道高度
   * @param {number} gap - 管道间隙
   * @param {number} groundY - 地面顶部Y坐标
   */
  constructor(x, topHeight, gap, groundY) {
    super(x, topHeight, gap, groundY, Config.PIPE.WIDTH)
    this.type = 'pipe'
  }

  // update() 和 checkCollision() 继承基类默认实现

  /**
   * 渲染管道（像素风格）
   */
  _doRender(ctx) {
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

    ctx.fillStyle = VISUAL.PIPE_BODY
    ctx.fillRect(x, y, w, h)

    ctx.fillStyle = VISUAL.PIPE_HIGHLIGHT
    ctx.fillRect(x + 3, y, 5, h)

    ctx.fillStyle = VISUAL.PIPE_SHADOW
    ctx.fillRect(x + w - 8, y, 5, h)

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

    ctx.fillStyle = VISUAL.PIPE_BODY
    ctx.fillRect(capX, y, capW, PIPE.CAP_HEIGHT)

    ctx.fillStyle = VISUAL.PIPE_HIGHLIGHT
    ctx.fillRect(capX + 3, y, 5, PIPE.CAP_HEIGHT)

    ctx.fillStyle = VISUAL.PIPE_SHADOW
    ctx.fillRect(capX + capW - 8, y, 5, PIPE.CAP_HEIGHT)

    ctx.strokeStyle = VISUAL.PIPE_OUTLINE
    ctx.lineWidth = 2
    ctx.strokeRect(capX, y, capW, PIPE.CAP_HEIGHT)
  }
}

module.exports = Pipe
