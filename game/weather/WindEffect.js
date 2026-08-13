/**
 * WindEffect.js - 风环境效果 [v1.2.0新增]
 *
 * 给玩家施加随机方向的力，力量曲线：小→大→小（sin曲线）。
 * 垂直风影响小鸟velocity，水平风影响世界滚动速度。
 * 视觉：风向粒子线条 + 小鸟周围风向箭头。
 */

const WeatherEffect = require('./WeatherEffect.js')
const Config = require('../config/GameConfig.js')

class WindEffect extends WeatherEffect {
  constructor() {
    super('wind', '风')
    this.isVertical = false      // 垂直风 or 水平风
    this.direction = 1           // 方向：1=下/右, -1=上/左
    this.currentForce = 0        // 当前风力
    this.particles = []          // 风向粒子
    this._particleTimer = 0
  }

  onTrigger(gameCtx) {
    super.onTrigger(gameCtx)
    this.isVertical = Math.random() < 0.5
    this.direction = Math.random() < 0.5 ? 1 : -1
    this.duration = this.getDuration(gameCtx.gameTime)
    this.particles = []
  }

  getDuration(gameTime) {
    const W = Config.WEATHER.WIND
    const t = Math.min(1, gameTime / W.DURATION_RAMP_TIME)
    // 气候适应能力缩减持续时间
    const adaptLv = gameCtx.abilities.owned.get('climate_adapt') || 0
    const reduction = adaptLv > 0 ? 1 - 0.15 * adaptLv : 1
    return Math.round((W.MIN_DURATION + (W.MAX_DURATION - W.MIN_DURATION) * t) * reduction)
  }

  update(gameCtx) {
    super.update(gameCtx)

    // sin曲线风力
    const rawForce = Config.WEATHER.WIND.MAX_FORCE * this.sinIntensity * this.direction

    // 能力修饰
    const windReaderLv = gameCtx.abilities.owned.get('wind_reader') || 0
    const windRiderLv = gameCtx.abilities.owned.get('wind_rider') || 0

    let force = rawForce
    if (windReaderLv > 0) {
      force *= (1 - 0.3 * windReaderLv)
    }
    if (windRiderLv > 0) {
      // 御风者：翻转方向并增强
      force = -force * (1 + 0.5 * windRiderLv)
    }

    this.currentForce = force

    // 应用风力
    if (this.isVertical) {
      gameCtx.bird.velocity += force
    } else {
      gameCtx.windScrollModifier += force * 0.3
    }

    // 生成风向粒子
    this._particleTimer++
    if (this._particleTimer >= 3) {
      this._particleTimer = 0
      this._spawnParticle(gameCtx.screenW, gameCtx.screenH)
    }

    // 更新粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      if (this.isVertical) {
        p.y += force * 20 + p.speed * this.direction
      } else {
        p.x += force * 20 + p.speed * this.direction
      }
      p.life--
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  _spawnParticle(screenW, screenH) {
    const intensity = this.sinIntensity
    if (intensity < 0.05) return

    if (this.isVertical) {
      this.particles.push({
        x: Math.random() * screenW,
        y: this.direction > 0 ? -20 : screenH + 20,
        speed: 2 + Math.random() * 3,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        length: 15 + Math.random() * 20
      })
    } else {
      this.particles.push({
        x: this.direction > 0 ? -20 : screenW + 20,
        y: Math.random() * screenH * 0.7,
        speed: 2 + Math.random() * 3,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        length: 15 + Math.random() * 20
      })
    }
  }

  render(ctx, screenW, screenH, gameCtx) {
    const intensity = this.sinIntensity
    if (intensity < 0.05) return

    // 风向粒子线条
    for (const p of this.particles) {
      const alpha = (p.life / p.maxLife) * 0.4 * intensity
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
      ctx.lineWidth = 1.5
      ctx.beginPath()
      if (this.isVertical) {
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x, p.y - this.direction * p.length)
      } else {
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(p.x - this.direction * p.length, p.y)
      }
      ctx.stroke()
    }

    // 小鸟周围风向箭头
    if (gameCtx && gameCtx.bird && intensity > 0.1) {
      const bx = gameCtx.bird.x
      const by = gameCtx.bird.y
      const arrowDist = 35 + intensity * 10
      const arrowLen = 12 + intensity * 8

      ctx.save()
      ctx.translate(bx, by)

      // 箭头方向
      let dx, dy
      if (this.isVertical) {
        dx = 0
        dy = this.direction * arrowDist
      } else {
        dx = this.direction * arrowDist
        dy = 0
      }

      // 绘制箭头
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * intensity})`
      ctx.fillStyle = `rgba(255, 255, 255, ${0.4 * intensity})`
      ctx.lineWidth = 2

      // 箭杆
      ctx.beginPath()
      ctx.moveTo(dx * 0.4, dy * 0.4)
      ctx.lineTo(dx, dy)
      ctx.stroke()

      // 箭头三角
      const angle = Math.atan2(dy, dx)
      ctx.beginPath()
      ctx.moveTo(dx, dy)
      ctx.lineTo(
        dx - Math.cos(angle - 0.4) * arrowLen,
        dy - Math.sin(angle - 0.4) * arrowLen
      )
      ctx.lineTo(
        dx - Math.cos(angle + 0.4) * arrowLen,
        dy - Math.sin(angle + 0.4) * arrowLen
      )
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      ctx.restore()
    }
  }

  onExpire(gameCtx) {
    super.onExpire(gameCtx)
    this.particles = []
  }
}

module.exports = WindEffect
