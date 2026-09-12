/**
 * WeatherSystem.js - 环境系统管理器 [v1.2.0新增]
 *
 * 职责：
 * - 管理活跃的环境效果列表
 * - 按概率触发新环境效果（游戏时间越长概率越高）
 * - 管理触发冷却和效果独立冷却
 * - 更新和渲染所有活跃效果
 * - 提供环境属性修饰器给Game.js
 * - 雨效果结束后继续干燥
 *
 * 架构：
 *   WeatherSystem (管理器)
 *     ├── activeEffects[] (活跃效果列表)
 *     ├── triggerCooldown (触发冷却)
 *     └── effectCooldowns{} (各效果独立冷却)
 *
 * 新增环境效果类型只需：
 * 1. 创建继承WeatherEffect的子类
 * 2. 在EFFECT_CLASSES中注册
 * 3. 在GameConfig.WEATHER中添加配置
 */

const Config = require('../config/GameConfig.js')
const Logger = require('./GameLogger.js')
const WindEffect = require('../weather/WindEffect.js')
const RainEffect = require('../weather/RainEffect.js')
const HailEffect = require('../weather/HailEffect.js')

const EFFECT_CLASSES = {
  wind: WindEffect,
  rain: RainEffect,
  hail: HailEffect
}

const ALL_TYPES = ['wind', 'rain', 'hail']

class WeatherSystem {
  constructor() {
    this.reset()
  }

  reset() {
    this.activeEffects = []         // 当前活跃的效果
    this.triggerCooldown = 0        // 触发冷却计时器
    this.effectCooldowns = {}       // 各效果独立冷却 { wind: 0, rain: 0, hail: 0 }
    this.checkTimer = 0             // 检查计时器
    this.rainResidual = null        // 雨效果结束后残留（继续干燥）
    this._rainHintShown = false     // [v1.2.1] "拍翅甩水!"教学提示只显示一次
    for (const t of ALL_TYPES) {
      this.effectCooldowns[t] = 0
    }
  }

  /**
   * 每帧更新
   * @param {number} gameTime - 游戏时长（帧）
   * @param {Object} gameCtx - 游戏上下文
   */
  update(gameTime, gameCtx) {
    // 1. 检查触发
    this.checkTimer++
    if (gameTime >= Config.WEATHER.START_TIME && this.checkTimer >= Config.WEATHER.CHECK_INTERVAL) {
      this.checkTimer = 0
      this._tryTrigger(gameTime, gameCtx)
    }

    // 2. 更新活跃效果
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i]
      effect.update(gameCtx)
      if (effect.isExpired()) {
        Logger.info('Weather', '环境效果结束', { type: effect.type, elapsed: effect.elapsed })
        effect.onExpire(gameCtx)

        // 雨效果结束后保留残留对象继续干燥
        if (effect.type === 'rain') {
          this.rainResidual = effect
        }

        this.effectCooldowns[effect.type] = Config.WEATHER.EFFECT_COOLDOWN
        this.activeEffects.splice(i, 1)

        // [v1.4.0] 定风珠：天气结束时写免疫时间戳（过渡保护）
        this._writeCharmImmunity(gameCtx)
      }
    }

    // 3. 更新冷却
    if (this.triggerCooldown > 0) this.triggerCooldown--
    for (const t of ALL_TYPES) {
      if (this.effectCooldowns[t] > 0) this.effectCooldowns[t]--
    }

    // 4. 雨效果结束后继续干燥
    if (this.rainResidual) {
      this.rainResidual.dry(Config.WEATHER.RAIN.DRY_RATE)
      // [v1.2.1] 干燥期间按当前rainLevel比例回写重力修饰，雨停后重力平滑归零
      // [v1.4.0] 定风珠：雨结束免疫期内不回写重力 debuff（免疫判定在 debuff 应用点）
      if (!(gameCtx.abilities && gameCtx.abilities.weatherImmuneUntil > gameCtx.gameTime)) {
        gameCtx.gravityModifier +=
          (this.rainResidual.rainLevel / 100) * Config.WEATHER.RAIN.MAX_GRAVITY_BONUS
      }
      if (this.rainResidual.rainLevel <= 0 && this.rainResidual.splashParticles.length === 0) {
        this.rainResidual = null
      }
    }
  }

  /**
   * [v1.4.0] 定风珠：天气开始/结束时写 debuff 免疫时间戳（(3+3*lv)s）
   * 只免疫负面部分（御风者等增益保留在各效果的应用点判断），兼容无 owned 的 mock
   * @param {Object} gameCtx
   */
  _writeCharmImmunity(gameCtx) {
    const abilities = gameCtx.abilities
    if (!abilities || !abilities.owned) return
    const lv = abilities.owned.get('steady_charm') || 0
    if (lv <= 0) return
    abilities.weatherImmuneUntil = gameCtx.gameTime +
      (Config.WEATHER.STEADY_CHARM_BASE_SEC + Config.WEATHER.STEADY_CHARM_PER_LV_SEC * lv) * 60
    Logger.info('Weather', '定风珠免疫开启', { lv: lv, until: abilities.weatherImmuneUntil })
  }

  /**
   * 检查并尝试触发环境效果
   */
  _tryTrigger(gameTime, gameCtx) {
    // 检查触发冷却
    if (this.triggerCooldown > 0) return
    // 检查最大同时效果数
    // [v1.2.2] N5 终局加压：240s后并发上限 2→3（按游戏时长动态取上限）
    const maxSimultaneous = gameTime >= Config.WEATHER.LATE_GAME_TIME
      ? Config.WEATHER.MAX_SIMULTANEOUS_LATE
      : Config.WEATHER.MAX_SIMULTANEOUS
    if (this.activeEffects.length >= maxSimultaneous) return

    // 计算触发概率
    const W = Config.WEATHER
    const chance = W.BASE_CHANCE +
      (W.MAX_CHANCE - W.BASE_CHANCE) * Math.min(1, gameTime / W.CHANCE_RAMP_TIME)

    if (Math.random() > chance) return

    // 选择可触发的效果
    const available = ALL_TYPES.filter(t =>
      this.effectCooldowns[t] <= 0 &&
      !this.activeEffects.find(e => e.type === t)
    )
    if (available.length === 0) return

    // 随机选择一个
    const type = available[Math.floor(Math.random() * available.length)]
    this._triggerEffect(type, gameCtx)
  }

  /**
   * 触发指定类型的环境效果
   */
  _triggerEffect(type, gameCtx) {
    const EffectClass = EFFECT_CLASSES[type]
    if (!EffectClass) return

    const effect = new EffectClass()
    effect.onTrigger(gameCtx)
    this.activeEffects.push(effect)
    this.triggerCooldown = Config.WEATHER.TRIGGER_COOLDOWN

    // [v1.4.0] 定风珠：天气开始时写免疫时间戳
    this._writeCharmImmunity(gameCtx)

    Logger.info('Weather', '环境效果触发', {
      type: type,
      duration: effect.duration,
      gameTime: gameCtx.gameTime
    })

    // 浮动文字提示
    if (gameCtx.addFloatingText) {
      const names = { wind: '起风了!', rain: '下雨了!', hail: '冰雹!' }
      const colors = { wind: '#ffffff', rain: '#7eb8e0', hail: '#c0d8f0' }
      gameCtx.addFloatingText(
        gameCtx.screenW / 2,
        gameCtx.screenH * 0.3,
        names[type] || type,
        colors[type] || '#ffffff',
        60
      )

      // [v1.2.1] 首次下雨教学提示：拍翅可甩水（只提示一次）
      if (type === 'rain' && !this._rainHintShown) {
        this._rainHintShown = true
        gameCtx.addFloatingText(
          gameCtx.screenW / 2,
          gameCtx.screenH * 0.3 + 26,
          '拍翅甩水!',
          '#a0d8ff',
          90
        )
      }
    }
  }

  /**
   * 渲染所有活跃效果
   */
  render(ctx, screenW, screenH, gameCtx) {
    for (const effect of this.activeEffects) {
      effect.render(ctx, screenW, screenH, gameCtx)
    }

    // 渲染残留雨效果（干燥中的粒子）
    if (this.rainResidual) {
      this.rainResidual.render(ctx, screenW, screenH, gameCtx)
    }
  }

  /**
   * 通知拍翅事件（用于雨效果甩水）
   */
  onFlap() {
    const rain = this.activeEffects.find(e => e.type === 'rain')
    if (rain) rain.onFlap()
  }

  /**
   * 获取环境属性修饰器
   * 返回环境对游戏属性的影响，供AbilitySystem和Game.js读取
   */
  getStatModifiers() {
    const modifiers = {
      gravityBonus: 0,           // 重力增加比例
      windScrollModifier: 0,     // 风力滚动速度修饰
      weatherActive: this.activeEffects.length > 0,  // 是否有环境效果活跃
      activeTypes: this.activeEffects.map(e => e.type)  // 活跃效果类型列表
    }

    // 雨效果的重力增加已在update中通过gameCtx.gravityModifier应用
    // 风力也已在update中通过gameCtx.windScrollModifier应用
    // 这里返回的信息供AbilitySystem计算风暴之子等能力

    return modifiers
  }

  /**
   * 是否有指定类型的环境效果活跃
   */
  hasEffect(type) {
    return this.activeEffects.some(e => e.type === type)
  }

  /**
   * 获取当前活跃效果的信息（供HUD显示）
   */
  getActiveEffectInfo() {
    return this.activeEffects.map(e => ({
      type: e.type,
      name: e.name,
      progress: e.progress,
      remaining: Math.ceil((e.duration - e.elapsed) / 60)  // 剩余秒数
    }))
  }
}

module.exports = WeatherSystem
