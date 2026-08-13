/**
 * HailEffect.js - 冰雹环境效果 [v1.2.0新增]
 *
 * 掉落冰雹实体，触碰玩家造成1点伤害（走碰撞优先级链）。
 * 冰雹数量和密度：低→高→低（sin曲线）。
 * 冰雹从屏幕顶部生成，以5~8px/帧速度下落。
 */

const WeatherEffect = require('./WeatherEffect.js')
const Config = require('../config/GameConfig.js')
const Hailstone = require('../entities/Hailstone.js')

class HailEffect extends WeatherEffect {
  constructor() {
    super('hail', '冰雹')
    this.hailstones = []        // 活跃冰雹实体
    this.spawnTimer = 0         // 生成计时器
    this.crackEffects = []      // 碎裂特效
  }

  onTrigger(gameCtx) {
    super.onTrigger(gameCtx)
    this.duration = this.getDuration(gameCtx.gameTime)
    this.hailstones = []
    this.crackEffects = []
  }

  getDuration(gameTime) {
    const H = Config.WEATHER.HAIL
    const t = Math.min(1, gameTime / H.DURATION_RAMP_TIME)
    const adaptLv = gameCtx.abilities.owned.get('climate_adapt') || 0
    const reduction = adaptLv > 0 ? 1 - 0.15 * adaptLv : 1
    return Math.round((H.MIN_DURATION + (H.MAX_DURATION - H.MIN_DURATION) * t) * reduction)
  }

  update(gameCtx) {
    super.update(gameCtx)

    // 生成冰雹（sin曲线密度）
    this.spawnTimer++
    const interval = Math.max(
      Config.WEATHER.HAIL.SPAWN_INTERVAL_PEAK / Math.max(0.1, this.sinIntensity),
      5
    )
    if (this.spawnTimer >= interval) {
      this.spawnTimer = 0
      this._spawnHailstone(gameCtx.screenW)
    }

    // 更新冰雹
    for (let i = this.hailstones.length - 1; i >= 0; i--) {
      const h = this.hailstones[i]
      h.update()

      // 碰撞检测
      if (h.checkCollision(gameCtx.bird)) {
        this._handleHailCollision(h, gameCtx)
        this.hailstones.splice(i, 1)
        continue
      }

      // 离屏销毁
      if (h.isOffscreen(gameCtx.screenH)) {
        this.hailstones.splice(i, 1)
      }
    }

    // 更新碎裂特效
    for (let i = this.crackEffects.length - 1; i >= 0; i--) {
      const c = this.crackEffects[i]
      for (const frag of c.fragments) {
        frag.x += frag.vx
        frag.y += frag.vy
        frag.vy += 0.2
        frag.life--
      }
      c.fragments = c.fragments.filter(f => f.life > 0)
      if (c.fragments.length === 0) {
        this.crackEffects.splice(i, 1)
      }
    }
  }

  _spawnHailstone(screenW) {
    const H = Config.WEATHER.HAIL
    const speed = H.MIN_SPEED + Math.random() * (H.MAX_SPEED - H.MIN_SPEED)
    const radius = H.MIN_RADIUS + Math.random() * (H.MAX_RADIUS - H.MIN_RADIUS)
    this.hailstones.push(new Hailstone(
      Math.random() * screenW,
      -10,
      speed,
      radius
    ))
  }

  /**
   * 处理冰雹碰撞
   * 碰撞优先级：统一护盾 > 冰晶护体 > HP扣血
   */
  _handleHailCollision(hailstone, gameCtx) {
    const abilities = gameCtx.abilities

    // 冰晶护体：冰雹转为护盾
    const iceCrystalLv = abilities.owned.get('ice_crystal') || 0
    if (iceCrystalLv > 0 && abilities.iceCrystalCD <= 0) {
      abilities.addShieldLayer(1)
      abilities.iceCrystalCD = (20 - 3 * (iceCrystalLv - 1)) * 60
      this._addCrackEffect(hailstone.x, hailstone.y, '#64c8ff')
      gameCtx.addFloatingText(hailstone.x, hailstone.y - 20, '护盾+1!', '#64c8ff', 35)
      return
    }

    // 统一护盾
    if (abilities.shieldLayers > 0) {
      abilities.consumeShield()
      this._addCrackEffect(hailstone.x, hailstone.y, '#64c8ff')
      gameCtx.addFloatingText(hailstone.x, hailstone.y - 20, '冰雹!', '#a0d0ff', 30)
      return
    }

    // 无敌帧
    if (abilities.invincibleFrames > 0) {
      this._addCrackEffect(hailstone.x, hailstone.y, '#ffffff')
      return
    }

    // HP扣血
    const dead = abilities.takeDamage()
    gameCtx.damageFlash = 12
    gameCtx.shakeFrames = 4
    gameCtx.shakeIntensity = 2
    abilities.invincibleFrames = abilities.getInvincibleFrames()
    gameCtx.bird.invincibleBlink = 30
    this._addCrackEffect(hailstone.x, hailstone.y, '#ff4444')
    gameCtx.addFloatingText(hailstone.x, hailstone.y - 20, '-1 HP', '#ff4444', 35)

    if (dead) {
      // 检查凤凰复活
      if (abilities.tryPhoenix()) {
        gameCtx.triggerPhoenixRevive()
      } else {
        gameCtx.triggerGameOver()
      }
    }
  }

  _addCrackEffect(x, y, color) {
    const fragments = []
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.5
      const speed = 1.5 + Math.random() * 2
      fragments.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 15,
        maxLife: 15,
        color: color
      })
    }
    this.crackEffects.push({ fragments })
  }

  render(ctx, screenW, screenH) {
    // 渲染冰雹
    for (const h of this.hailstones) {
      h.render(ctx)
    }

    // 渲染碎裂特效
    for (const c of this.crackEffects) {
      for (const frag of c.fragments) {
        const alpha = frag.life / frag.maxLife
        ctx.globalAlpha = alpha
        ctx.fillStyle = frag.color
        ctx.beginPath()
        ctx.arc(frag.x, frag.y, 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      }
    }
  }

  onExpire(gameCtx) {
    super.onExpire(gameCtx)
    // 已生成的冰雹继续下落直到离屏
  }
}

module.exports = HailEffect
