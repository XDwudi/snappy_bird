/**
 * RainEffect.js - 雨环境效果 [v1.2.0新增]
 *
 * 使小鸟羽毛逐渐变湿，变重（下坠速度变快）。
 * 雨水累计量(rainLevel 0~100)影响重力增加比例，最大+50%重力。
 * 雨停后雨水累计逐渐减少直到恢复正常。
 * 玩家每次点击（扇翅膀）雨水累计量减少5。
 * 视觉：雨滴下落，小鸟身上蓝色积水，扇翅膀小雨滴甩走。
 */

const WeatherEffect = require('./WeatherEffect.js')
const Config = require('../config/GameConfig.js')

class RainEffect extends WeatherEffect {
  constructor() {
    super('rain', '雨')
    this.rainLevel = 0           // 雨水累计量 0~100
    this.drops = []              // 雨滴粒子（视觉）
    this.splashParticles = []    // 甩水粒子
    this._dropTimer = 0
  }

  onTrigger(gameCtx) {
    super.onTrigger(gameCtx)
    this.duration = this.getDuration(gameCtx.gameTime)
    this.drops = []
    this.splashParticles = []
  }

  getDuration(gameTime) {
    const R = Config.WEATHER.RAIN
    const t = Math.min(1, gameTime / R.DURATION_RAMP_TIME)
    const adaptLv = gameCtx.abilities.owned.get('climate_adapt') || 0
    const reduction = adaptLv > 0 ? 1 - 0.15 * adaptLv : 1
    return Math.round((R.MIN_DURATION + (R.MAX_DURATION - R.MIN_DURATION) * t) * reduction)
  }

  update(gameCtx) {
    super.update(gameCtx)

    // 雨水积累
    const raincoatLv = gameCtx.abilities.owned.get('raincoat') || 0
    const accumRate = Config.WEATHER.RAIN.ACCUMULATION_RATE * (1 - 0.4 * raincoatLv)
    this.rainLevel = Math.min(100, this.rainLevel + accumRate)

    // 重力增加
    const gravityBonus = (this.rainLevel / 100) * Config.WEATHER.RAIN.MAX_GRAVITY_BONUS
    gameCtx.gravityModifier += gravityBonus

    // 生成雨滴粒子
    this._dropTimer++
    if (this._dropTimer >= 2) {
      this._dropTimer = 0
      this._spawnDrop(gameCtx.screenW)
    }

    // 更新雨滴
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i]
      d.y += d.speed
      d.life--
      if (d.life <= 0 || d.y > gameCtx.screenH + 20) {
        this.drops.splice(i, 1)
      }
    }

    // 更新甩水粒子
    for (let i = this.splashParticles.length - 1; i >= 0; i--) {
      const s = this.splashParticles[i]
      s.x += s.vx
      s.y += s.vy
      s.vy += 0.15
      s.life--
      if (s.life <= 0) {
        this.splashParticles.splice(i, 1)
      }
    }
  }

  _spawnDrop(screenW) {
    const intensity = this.sinIntensity
    const count = Math.ceil(intensity * 3)
    for (let i = 0; i < count; i++) {
      this.drops.push({
        x: Math.random() * (screenW + 40) - 20,
        y: -10,
        speed: 8 + Math.random() * 4,
        length: 12 + Math.random() * 8,
        life: 100
      })
    }
  }

  /**
   * 拍翅时减少雨水（由WeatherSystem.onFlap调用）
   */
  onFlap() {
    this.rainLevel = Math.max(0, this.rainLevel - Config.WEATHER.RAIN.FLAP_REDUCTION)

    // 生成甩水粒子
    if (this.rainLevel > 5) {
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI * 2 * i) / 4 + Math.random() * 0.5
        const speed = 1.5 + Math.random() * 2
        this.splashParticles.push({
          x: 0,  // 由render时设置实际位置
          y: 0,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1,
          life: 20,
          maxLife: 20
        })
      }
    }
  }

  /**
   * 雨停后干燥（由WeatherSystem在效果结束后继续调用）
   */
  dry(rate) {
    this.rainLevel = Math.max(0, this.rainLevel - rate)
    // 更新残留甩水粒子
    for (let i = this.splashParticles.length - 1; i >= 0; i--) {
      const s = this.splashParticles[i]
      s.x += s.vx
      s.y += s.vy
      s.vy += 0.15
      s.life--
      if (s.life <= 0) {
        this.splashParticles.splice(i, 1)
      }
    }
  }

  render(ctx, screenW, screenH, gameCtx) {
    // 雨滴下落
    ctx.strokeStyle = 'rgba(150, 180, 220, 0.4)'
    ctx.lineWidth = 1
    for (const d of this.drops) {
      ctx.beginPath()
      ctx.moveTo(d.x, d.y)
      ctx.lineTo(d.x - 1, d.y - d.length)
      ctx.stroke()
    }

    // 小鸟身上蓝色积水
    if (gameCtx && gameCtx.bird && this.rainLevel > 0) {
      const bird = gameCtx.bird
      const wetness = this.rainLevel / 100
      ctx.save()
      ctx.translate(bird.x, bird.y)
      ctx.rotate(bird.rotation)
      ctx.scale(bird.collisionScale, bird.collisionScale)

      const r = bird.width / 2
      // 蓝色积水覆盖
      ctx.fillStyle = `rgba(80, 140, 200, ${wetness * 0.3})`
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fill()

      // 积水滴（随rainLevel增多）
      const dropCount = Math.floor(wetness * 5)
      for (let i = 0; i < dropCount; i++) {
        const angle = (Math.PI * 2 * i) / 5 + bird.wingFrame * 0.1
        const dr = r * 0.7
        ctx.fillStyle = `rgba(100, 160, 220, ${wetness * 0.5})`
        ctx.beginPath()
        ctx.arc(Math.cos(angle) * dr, Math.sin(angle) * dr, 2, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.restore()

      // 甩水粒子
      for (const s of this.splashParticles) {
        const alpha = s.life / s.maxLife
        ctx.fillStyle = `rgba(120, 180, 230, ${alpha * 0.7})`
        ctx.beginPath()
        ctx.arc(bird.x + s.x, bird.y + s.y, 2, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  onExpire(gameCtx) {
    super.onExpire(gameCtx)
    this.drops = []
    // splashParticles保留一段时间自然消失
  }
}

module.exports = RainEffect
