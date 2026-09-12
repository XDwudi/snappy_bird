/**
 * AbilitySystem.js - 能力系统核心 [v1.2.0]
 *
 * 职责：
 * - 管理已拥有的能力（id → level）
 * - 提供计算后的属性修饰器给 Game.js 读取
 * - 管理 HP / 最大HP / 受击无敌
 * - [v1.1.5] 统一护盾系统：shieldLayers(当前层数) / maxShieldLayers(最大层数)
 * - 管理主动技能冷却（时间扭曲/瞬移/护盾爆发/自愈/弹力护盾/二段跳/冰晶护体）
 * - 管理道具效果状态（速度包减速）
 * - 连击系统 / 经验共鸣 / 狂暴
 * - [v1.2.0] 风暴之子：环境效果期间全属性提升
 * - [v1.4.0] 批次1新卡：求生本能(HP=1补盾) / 锐利目光(擦边缩碰撞箱) / 连击种子(断连保留)
 *             镜面护盾(破盾冲击波事件) / 经验潮汐(天气期经验) / 羽舞(二段跳擦边窗口)
 *             定风珠免疫时间戳字段(由 WeatherSystem 写入)
 */

const Config = require('../config/GameConfig.js')
const Registry = require('../abilities/AbilityRegistry.js')
const Logger = require('./GameLogger.js')

class AbilitySystem {
  constructor() {
    this.reset()
  }

  /**
   * 重置到初始状态（新局开始）
   */
  reset() {
    this.owned = new Map()          // id → level

    // [v1.1.0] HP系统
    this.hp = Config.HP.INITIAL
    this.maxHp = Config.HP.INITIAL_MAX

    // [v1.1.5] 统一护盾系统
    this.shieldLayers = 0                    // 当前护盾层数
    this.maxShieldLayers = Config.SHIELD.DEFAULT_MAX_LAYERS  // 最大护盾层数(默认1)
    this.shieldRecoverTimer = 0              // 坚韧护盾恢复计时器
    this.bounceShieldRecoverTimer = 0        // 弹力护盾恢复计时器

    // 主动技能冷却
    this.timeWarpCD = 0
    this.teleportCD = 0
    this.shieldBurstTimer = 0
    this.regenerationTimer = 0      // [v1.1.0] 自愈计时器
    this.doubleJumpCD = 0           // [v1.1.0] 二段跳CD
    this.lastFlapFrame = -999       // [v1.1.0] 上次拍翅帧（二段跳检测）
    this.iceCrystalCD = 0           // [v1.2.0] 冰晶护体CD

    // 主动技能状态
    this.timeWarpActive = 0
    this.phoenixUsed = 0            // [v1.1.0] 改为计数（Lv2可复活2次）

    // 连击系统
    this.comboCount = 0
    this.invincibleFrames = 0

    // [v1.1.0] 道具效果状态
    this.speedPackFrames = 0        // 速度包减速剩余帧

    // 全属性加成
    this.allBuffLevel = 0

    // [v1.2.0] 环境状态（由WeatherSystem更新，供风暴之子计算）
    this.weatherActive = false

    // [v1.4.0] 批次1新卡状态
    this.survivorUsed = 0          // 求生本能：本局已触发次数（上限=等级）
    this.edgeFocusFrames = 0       // 锐利目光：擦边后碰撞箱缩小剩余帧
    this.featherDanceFrames = 0    // 羽舞：二段跳后擦边窗口扩大剩余帧
    this.mirrorShockCD = 0         // 镜面护盾：冲击波CD（3s 内最多触发 1 次，硬刹车）
    this.weatherImmuneUntil = 0    // 定风珠：天气 debuff 免疫截止帧（由 WeatherSystem 触发/结束事件写入）

    // [v1.4.0] 批次2新卡状态
    this.tempHp = 0                // 超载神盾 Lv3 质变：临时HP（上限 OVERDRIVE_TEMP_HP_CAP，HUD 空心心形）
    this.featherShields = 0        // 回响之翼/铁羽：羽盾层数（受击链最前置，全局硬顶 FEATHER_SHIELD_MAX=2）
    this.echoWingPipes = 0         // 回响之翼：过管计数（达到阈值且羽盾未满时存 1 层）
    this.missileBarrageTimer = 0   // 火力覆盖：自动导弹计时（初始即满间隔，Game 侧发射+枪口闪光）
    this.missileLinkStacks = 0     // 蜂群链路：当前叠层（上限 1+lv 硬封顶）
    this.missileLinkWindow = 0     // 蜂群链路：连击窗口剩余帧（1.5s，归零清层）
    this.missileStormFrames = 0    // 导弹风暴：连发剩余帧（拾取刷新不叠加）
    this._missileStormTick = 0     // 导弹风暴：连发节拍（每 30 帧=每秒2枚）
    this.timeCrystalFreezeFrames = 0 // 时之晶：怪物/弹幕冻结剩余帧（寄生时间扭曲触发点，不独立计时）
    this.phantomWindowFrames = 0   // 幻影舞步：黄金窗剩余帧（只刷新不叠加）
    this.weatherConcurrent = 0     // 风暴之眼：当前天气并发数（由 Game 每帧写入）

    // [v1.2.2] N7 特效事件队列（由Game.js每帧取出并生成内联粒子特效）
    this.fxEvents = []

    // [v1.2.2] N9 重新开始时重置稀有卡软保底计数
    Registry.resetPity()

    // 缓存
    this._statsCache = null
  }

  // ==================== 能力选择 ====================

  /**
   * [v1.1.3] 获取升级可选能力列表
   * @param {number} playerLevel - 玩家当前等级（影响稀有度概率）
   * @returns {Object[]}
   */
  getChoices(playerLevel) {
    let count = Config.ABILITY.CHOICE_COUNT + this.getStat('bonusChoices')

    const allMaxed = Registry.getAll().every(ab => {
      const lv = this.owned.get(ab.id) || 0
      return lv >= ab.maxLevel
    })

    if (allMaxed) return []

    const choices = Registry.rollChoices(this.owned, count, playerLevel || 1)

    // [v1.4.0] 幸运光环 Lv3 质变：面板必含 1 张稀有及以上（无则替换最后一张）
    // 与 N9 软保底的关系：两机制同向不冲突——N9 计数在 Registry.rollChoices 内已结算
    // （本替换不改变 _noRareStreak；章节保底消耗机制 v1.5.0 才有，本版无交集）
    const luckyLv = this.owned.get('lucky') || 0
    if (luckyLv >= 3 && choices.length > 0 &&
        !choices.some(ab => (ab.rarity || 'common') !== 'common')) {
      const guaranteed = Registry.rollRarePlus(this.owned, choices.map(c => c.id), playerLevel || 1)
      if (guaranteed) {
        choices[choices.length - 1] = guaranteed
        Logger.info('Ability', '幸运光环Lv3质变：保底稀有+', { guaranteed: guaranteed.id })
      }
    }

    return choices
  }

  selectAbility(id) {
    const def = Registry.get(id)
    if (!def) return

    const currentLevel = this.owned.get(id) || 0
    if (currentLevel >= def.maxLevel) return

    this.owned.set(id, currentLevel + 1)

    // [v1.1.5] 坚韧 → 最大护盾+1/级，获得1层护盾
    if (id === 'toughness') {
      this._recalcMaxShieldLayers()
      this.shieldLayers = Math.min(this.shieldLayers + 1, this.maxShieldLayers)
      Logger.info('Ability', '坚韧升级', { level: this.owned.get('toughness'), maxShield: this.maxShieldLayers, layers: this.shieldLayers })
    }

    // 护盾爆发 → 初始化计时器
    if (id === 'shield_burst') {
      this.shieldBurstTimer = this._getShieldBurstCD()
    }

    // [v1.1.0] 活力之心 → 提升最大HP
    // [v1.4.0] 血契兼容：maxHp 统一走 _recalcMaxHp（初始+活力-血契，下限1）
    if (id === 'vitality') {
      this._recalcMaxHp()
      this.hp = Math.min(this.hp + 1, this.maxHp)  // 选择时恢复1HP
      Logger.info('Ability', '活力之心升级', { level: this.owned.get('vitality'), maxHp: this.maxHp, hp: this.hp })
    }

    // [v1.4.0] 血契 → 最大HP -1/级（下限1）；当前HP同步钳制（§2.6：血契修正在 HP扣减节点生效）
    if (id === 'blood_pact') {
      this._recalcMaxHp()
      this.hp = Math.min(this.hp, this.maxHp)
      Logger.info('Ability', '血契签订', { level: this.owned.get('blood_pact'), maxHp: this.maxHp, hp: this.hp })
    }

    // [v1.4.0] 火力覆盖 → 初始化自动导弹计时器（初始即满间隔，第一张不立刻发射）
    if (id === 'missile_barrage' && this.missileBarrageTimer <= 0) {
      this.missileBarrageTimer = this._getMissileBarrageCD()
    }

    // [v1.1.0] 自愈 → 初始化计时器
    if (id === 'regeneration') {
      this.regenerationTimer = this._getRegenerationCD()
      Logger.info('Ability', '自愈升级', { level: this.owned.get('regeneration') })
    }

    // [v1.1.5] 弹力护盾 → 最大护盾+1/级，获得1层护盾，初始化恢复计时器
    if (id === 'bounce_shield') {
      this._recalcMaxShieldLayers()
      this.shieldLayers = Math.min(this.shieldLayers + 1, this.maxShieldLayers)
      this.bounceShieldRecoverTimer = 0
      Logger.info('Ability', '弹力护盾升级', {
        level: this.owned.get('bounce_shield'),
        maxShield: this.maxShieldLayers,
        layers: this.shieldLayers
      })
    }

    // 凤凰 → 重置使用次数
    if (id === 'phoenix') {
      this.phoenixUsed = 0
    }
  }

  selectAllBuff() {
    this.allBuffLevel = Math.min(this.allBuffLevel + 1, Config.ABILITY.MAX_ALL_BUFF_LEVEL)
  }

  // ==================== 属性计算 ====================

  getStat(key) {
    if (!this._statsCache) {
      this._statsCache = this.getStats()
    }
    return this._statsCache[key]
  }

  getStats() {
    const s = {
      gravityMultiplier: 1.0,
      flapForceMultiplier: 1.0,
      collisionScale: 1.0,
      expMultiplier: 1.0,
      orbAttractRange: Config.ORB.ATTRACT_RANGE,
      scrollSpeedMultiplier: 1.0,
      scoreMultiplier: 1,
      bonusChoices: 0,
      comboThreshold: 5,
      gapBonus: 0,

      // 主动技能
      hasTimeWarp: false,
      hasTeleport: false,
      hasShieldBurst: false,
      hasPhoenix: false,

      // [v1.1.0] 新增属性
      maxHpBonus: 0,
      invincibleBonus: 0,
      hasRegeneration: false,
      hasDoubleJump: false,
      expResonanceChance: 0,
      berserkMultiplier: 1.0,
      hasBounceShield: false,  // [v1.1.5] 弹力护盾
      hasIceCrystal: false,    // [v1.2.0] 冰晶护体
    }

    const lv = (id) => this.owned.get(id) || 0
    const allBuff = this.allBuffLevel
    const buffMul = 1 + 0.05 * allBuff

    // [v1.1.0] 狂暴：HP为1时全属性提升
    // [v1.4.0] 血契保险丝：持血契时狂暴增益减半（写死，§6.3 专项验证——本方案最危险组合的熔断）
    const berserkLv = lv('berserk')
    const bloodPactLv = lv('blood_pact')
    let berserkMul = (this.hp <= 1 && berserkLv > 0) ? (1 + 0.25 * berserkLv) : 1.0
    if (berserkMul > 1 && bloodPactLv > 0) {
      berserkMul = 1 + (berserkMul - 1) * Config.ABILITY.BLOOD_PACT_BERSERK_FACTOR
    }
    s.berserkMultiplier = berserkMul

    // [v1.2.0] 风暴之子：环境效果期间全属性提升
    const stormChildLv = lv('storm_child')
    const stormMul = (this.weatherActive && stormChildLv > 0) ? (1 + 0.20 * stormChildLv) : 1.0

    // 全属性倍率 = buff × 狂暴 × 风暴之子
    const totalMul = buffMul * berserkMul * stormMul

    // 轻羽: 重力 -5%/级
    // [v1.2.1] 重力不吃狂暴/风暴之子乘区——重力增大对玩家是debuff，"全属性提升"不应包含它
    // [v1.2.2] N3 幅度减半：-8%→-5%/级（陷阱卡不再主动有害）
    s.gravityMultiplier = (1 - 0.05 * lv('light_feather')) * buffMul

    // 顺风: 上升力 +6%/级 [v1.2.2] N3 幅度减半：+10%→+6%/级
    s.flapForceMultiplier = (1 + 0.06 * lv('tailwind')) * buffMul * berserkMul * stormMul

    // 灵巧: 碰撞箱 -12%/级
    s.collisionScale = Math.max(0.3, 1 - 0.12 * lv('agile'))

    // [v1.4.0] 锐利目光: 擦边后60帧碰撞箱再 -15%/级（与灵巧乘算，下限钳制兜底；只改判定不改手感）
    const edgeFocusLv = lv('edge_focus')
    if (edgeFocusLv > 0 && this.edgeFocusFrames > 0) {
      s.collisionScale = Math.max(0.3, s.collisionScale * (1 - Config.ABILITY.EDGE_FOCUS_SHRINK_PER_LV * edgeFocusLv))
    }

    // 磁吸: 吸引范围 +50px/级
    s.orbAttractRange = Config.ORB.ATTRACT_RANGE + 50 * lv('magnet')

    // 贪婪: 经验获取 +25%/级
    s.expMultiplier = (1 + 0.25 * lv('greed')) * buffMul * berserkMul * stormMul

    // [v1.4.0] 经验潮汐: 天气期间经验获取 +25%/级（只加经验不加战力，与风暴之子错位）
    const expTideLv = lv('exp_tide')
    if (this.weatherActive && expTideLv > 0) {
      s.expMultiplier *= (1 + 0.25 * expTideLv)
    }

    // [v1.4.0] 风暴之眼: 天气并发≥2 时经验 ×(1+0.5/级)（单天气零收益，与潮汐错位；后期卡）
    const eyeLv = lv('eye_of_storm')
    if (eyeLv > 0 && this.weatherConcurrent >= Config.WEATHER.EYE_OF_STORM_MIN_CONCURRENT) {
      s.expMultiplier *= (1 + Config.WEATHER.EYE_OF_STORM_EXP_PER_LV * eyeLv)
    }

    // [v1.4.0] 血契: 经验 +30%/级（得分加成在 scoreMultiplier 同步）
    if (bloodPactLv > 0) {
      s.expMultiplier *= (1 + Config.ABILITY.BLOOD_PACT_BONUS_PER_LV * bloodPactLv)
    }

    // 慢速世界: 障碍速度 -10%/级
    s.scrollSpeedMultiplier = Math.max(0.5, 1 - 0.10 * lv('slow_world'))

    // 双倍积分
    s.scoreMultiplier = Math.round((1 + lv('double_score')) * buffMul * berserkMul * stormMul)
    // [v1.4.0] 血契: 得分 +30%/级（在双倍积分结果上叠乘，血契是独立乘区）
    if (bloodPactLv > 0) {
      s.scoreMultiplier = Math.round(s.scoreMultiplier * (1 + Config.ABILITY.BLOOD_PACT_BONUS_PER_LV * bloodPactLv))
    }

    // 幸运光环
    s.bonusChoices = lv('lucky')

    // 连击之心 [v1.1.2] 平衡调整：阈值 min=2，避免每管触发永久无敌
    s.comboThreshold = Math.max(2, 5 - lv('combo_heart'))

    // 缩小射线 [v1.1.5] 间隙增大 15→20/级
    // [v1.4.0] Lv5 质变：间隙封顶在 Lv4（+80px，+100px 已触及挑战下限），Lv5 改擦边窗口+10px（Game._checkNearMiss 结算）
    s.gapBonus = 20 * Math.min(lv('shrink_ray'), Config.ABILITY.SHRINK_RAY_GAP_CAP_LV)

    // [v1.1.0] 活力之心: 最大HP +1/级
    s.maxHpBonus = lv('vitality')

    // [v1.1.0] 体魄: 受击无敌 +30帧/级
    // [v1.4.0] 血契: 受击无敌 +60帧(1s)/级
    s.invincibleBonus = 30 * lv('physique') +
      Config.ABILITY.BLOOD_PACT_INVINCIBLE_FRAMES_PER_LV * bloodPactLv

    // [v1.1.0] 经验共鸣: 20%/级概率双倍经验球
    s.expResonanceChance = 0.2 * lv('exp_resonance')

    // 主动技能
    s.hasTimeWarp = lv('time_warp') > 0
    s.hasTeleport = lv('teleport') > 0
    s.hasShieldBurst = lv('shield_burst') > 0
    s.hasPhoenix = lv('phoenix') > 0 && this.phoenixUsed < lv('phoenix')

    // [v1.1.0] 新增主动技能
    s.hasRegeneration = lv('regeneration') > 0
    // [v1.1.5] 弹力护盾（统一护盾系统，不再有独立充能）
    s.hasBounceShield = lv('bounce_shield') > 0
    s.hasDoubleJump = lv('double_jump') > 0
    // [v1.2.0] 冰晶护体
    s.hasIceCrystal = lv('ice_crystal') > 0

    return s
  }

  invalidateStats() {
    this._statsCache = null
  }

  // [v1.2.0] 设置环境活跃状态（由Game.js每帧调用）
  setWeatherActive(active) {
    if (this.weatherActive !== active) {
      this.weatherActive = active
      this.invalidateStats()
    }
  }

  // [v1.4.0] 风暴之眼：设置天气并发数（由Game.js每帧调用，变化时刷新缓存）
  setWeatherConcurrent(n) {
    if (this.weatherConcurrent !== n) {
      this.weatherConcurrent = n
      this.invalidateStats()
    }
  }

  /**
   * [v1.4.0] 风暴之眼：天气 debuff 缩放（并发≥2 时 -20%/级；只减 debuff，增益不缩）
   * 供各天气效果的 debuff 应用点调用（风/雨/冰雹），防御性兼容无此方法的 mock
   * @returns {number} 0~1
   */
  getWeatherDebuffScale() {
    const eyeLv = this.owned.get('eye_of_storm') || 0
    if (eyeLv > 0 && this.weatherConcurrent >= Config.WEATHER.EYE_OF_STORM_MIN_CONCURRENT) {
      return Math.max(0, 1 - Config.WEATHER.EYE_OF_STORM_DEBUFF_REDUCT_PER_LV * eyeLv)
    }
    return 1
  }

  // ==================== 每帧更新 ====================

  tickCooldowns() {
    if (this.timeWarpCD > 0) this.timeWarpCD--
    if (this.teleportCD > 0) this.teleportCD--
    if (this.timeWarpActive > 0) this.timeWarpActive--
    if (this.doubleJumpCD > 0) this.doubleJumpCD--
    if (this.iceCrystalCD > 0) this.iceCrystalCD--  // [v1.2.0] 冰晶护体CD
    if (this.invincibleFrames > 0) this.invincibleFrames--
    if (this.speedPackFrames > 0) this.speedPackFrames--

    // [v1.4.0] 批次1新卡计时器
    if (this.edgeFocusFrames > 0) this.edgeFocusFrames--       // 锐利目光
    if (this.featherDanceFrames > 0) this.featherDanceFrames-- // 羽舞
    if (this.mirrorShockCD > 0) this.mirrorShockCD--           // 镜面护盾冲击波CD

    // [v1.4.0] 批次2新卡计时器
    if (this.timeCrystalFreezeFrames > 0) this.timeCrystalFreezeFrames-- // 时之晶冻结
    if (this.phantomWindowFrames > 0) this.phantomWindowFrames--         // 幻影舞步黄金窗
    // 蜂群链路：窗口归零清层（1.5s 节奏窗）
    if (this.missileLinkWindow > 0) {
      this.missileLinkWindow--
      if (this.missileLinkWindow <= 0) this.missileLinkStacks = 0
    }
    // 火力覆盖：定时自动导弹（发 fx 事件，Game 侧发射+独立枪口闪光，不用道具拾取特效）
    const barrageLv = this.owned.get('missile_barrage') || 0
    if (barrageLv > 0) {
      this.missileBarrageTimer--
      if (this.missileBarrageTimer <= 0) {
        this.missileBarrageTimer = this._getMissileBarrageCD()
        this._emitFx('barrage_fire')
      }
    }
    // 导弹风暴：连发状态机（每秒2枚；同屏上限在 Game._fireMissile 硬刹车）
    if (this.missileStormFrames > 0) {
      this.missileStormFrames--
      this._missileStormTick++
      if (this._missileStormTick >= Config.MISSILE.STORM_RATE_FRAMES) {
        this._missileStormTick = 0
        this._emitFx('storm_fire')
      }
    }

    // [v1.1.5] 护盾爆发——定期获得1层护盾
    if (this.hasStat('hasShieldBurst')) {
      this.shieldBurstTimer--
      if (this.shieldBurstTimer <= 0) {
        this.shieldLayers = Math.min(this.shieldLayers + 1, this.maxShieldLayers)
        this.shieldBurstTimer = this._getShieldBurstCD()
        this._emitFx('shield')  // [v1.2.2] N7 护盾获得特效
        Logger.info('Shield', '护盾爆发获得护盾', { layers: this.shieldLayers, max: this.maxShieldLayers })
      }
    }

    // [v1.1.5] 坚韧护盾恢复（30s恢复1层）
    const toughnessLv = this.owned.get('toughness') || 0
    if (toughnessLv > 0 && this.shieldLayers < this.maxShieldLayers) {
      this.shieldRecoverTimer++
      // [v1.4.0] 超载神盾：护盾恢复CD缩短
      if (this.shieldRecoverTimer >= Config.SHIELD.TOUGHNESS_RECOVER_CD * this._getOverdriveCDScale()) {
        this.shieldLayers = Math.min(this.shieldLayers + 1, this.maxShieldLayers)
        this.shieldRecoverTimer = 0
        this._emitFx('shield')  // [v1.2.2] N7 护盾获得特效
        Logger.info('Shield', '坚韧护盾恢复', { layers: this.shieldLayers, max: this.maxShieldLayers })
      }
    }

    // [v1.1.5] 弹力护盾恢复（20s-5s/级恢复1层）
    const bounceShieldLv = this.owned.get('bounce_shield') || 0
    if (bounceShieldLv > 0 && this.shieldLayers < this.maxShieldLayers) {
      this.bounceShieldRecoverTimer++
      const cd = this._getBounceShieldRecoverCD()
      if (this.bounceShieldRecoverTimer >= cd) {
        this.shieldLayers = Math.min(this.shieldLayers + 1, this.maxShieldLayers)
        this.bounceShieldRecoverTimer = 0
        this._emitFx('shield')  // [v1.2.2] N7 护盾获得特效
        Logger.info('Shield', '弹力护盾恢复', { layers: this.shieldLayers, max: this.maxShieldLayers })
      }
    }

    // [v1.1.0] 自愈
    if (this.hasStat('hasRegeneration') && this.hp < this.maxHp) {
      this.regenerationTimer--
      if (this.regenerationTimer <= 0) {
        this.hp = Math.min(this.hp + 1, this.maxHp)
        this.regenerationTimer = this._getRegenerationCD()
        this._emitFx('regen')  // [v1.2.2] N7 自愈特效
        Logger.info('Ability', '自愈恢复HP', { hp: this.hp, maxHp: this.maxHp, nextCD: this.regenerationTimer })
        this.invalidateStats()  // [v1.1.2] HP变化刷新缓存
      }
    }
  }

  /**
   * [v1.2.2] N7 发射特效事件（轻量钩子：Game.js每帧取出后生成内联粒子特效，
   *           不引入EffectManager）
   * @param {string} type - 'regen' | 'shield'
   */
  _emitFx(type) {
    if (!this.fxEvents) this.fxEvents = []
    this.fxEvents.push({ type: type })
  }

  // ==================== CD 计算 ====================

  _getTimeWarpCD() {
    const lv = this.owned.get('time_warp') || 0
    return (20 - 3 * (lv - 1)) * 60
  }

  // [v1.4.0] 超载神盾：护盾恢复CD -(15%/级)（Lv3 质变后保留 Lv2 的 -30%，不叠加到 -45%）
  _getOverdriveCDScale() {
    const odLv = Math.min(this.owned.get('aegis_overdrive') || 0, 2)
    return 1 - Config.SHIELD.OVERDRIVE_CD_REDUCT_PER_LV * odLv
  }

  // [v1.4.0] 火力覆盖：自动导弹间隔（秒转帧）
  _getMissileBarrageCD() {
    const lv = this.owned.get('missile_barrage') || 0
    return (Config.MISSILE.BARRAGE_BASE_SEC - Config.MISSILE.BARRAGE_REDUCTION_SEC * (lv - 1)) * 60
  }

  // [v1.4.0] 血契/活力统一结算：maxHp = 初始 + 活力 - 血契×1（下限1）
  _recalcMaxHp() {
    const vitLv = this.owned.get('vitality') || 0
    const pactLv = this.owned.get('blood_pact') || 0
    this.maxHp = Math.max(1, Config.HP.INITIAL_MAX + vitLv -
      Config.ABILITY.BLOOD_PACT_HP_COST * pactLv)
    this.hp = Math.min(this.hp, this.maxHp)
  }

  _getTeleportCD() {
    const lv = this.owned.get('teleport') || 0
    return (30 - 5 * (lv - 1)) * 60
  }

  _getShieldBurstCD() {
    const lv = this.owned.get('shield_burst') || 0
    // [v1.4.0] 超载神盾：护盾恢复CD缩短（护盾爆发属"护盾恢复"语义）
    return Math.round((25 - 3 * (lv - 1)) * 60 * this._getOverdriveCDScale())
  }

  // [v1.1.0] 自愈CD
  _getRegenerationCD() {
    const lv = this.owned.get('regeneration') || 0
    return (30 - 5 * (lv - 1)) * 60
  }

  // [v1.1.5] 弹力护盾恢复CD（秒转帧）
  _getBounceShieldRecoverCD() {
    const lv = this.owned.get('bounce_shield') || 0
    const cdSec = Math.max(
      Config.SHIELD.BOUNCE_RECOVER_MIN,
      Config.SHIELD.BOUNCE_RECOVER_BASE - Config.SHIELD.BOUNCE_RECOVER_REDUCTION * (lv - 1)
    )
    // [v1.4.0] 超载神盾：护盾恢复CD缩短
    return Math.round(cdSec * 60 * this._getOverdriveCDScale())  // Lv1=20s=1200帧, Lv2=15s=900帧, Lv3=10s=600帧（未持超载时）
  }

  // [v1.1.5] 重新计算最大护盾层数 = 默认1 + 坚韧等级 + 弹力护盾等级
  _recalcMaxShieldLayers() {
    const toughnessLv = this.owned.get('toughness') || 0
    const bounceShieldLv = this.owned.get('bounce_shield') || 0
    this.maxShieldLayers = Config.SHIELD.DEFAULT_MAX_LAYERS + toughnessLv + bounceShieldLv
    this.shieldLayers = Math.min(this.shieldLayers, this.maxShieldLayers)
  }

  // [v1.1.0] 二段跳CD
  _getDoubleJumpCD() {
    const lv = this.owned.get('double_jump') || 0
    return (15 - 5 * (lv - 1)) * 60
  }

  // ==================== HP 系统 [v1.1.0] ====================

  /**
   * 受到伤害
   * [v1.4.0] §2.6 受击链节点：超载神盾溢出转的临时HP 先于普通HP扣减
   * @returns {boolean} true=死亡, false=存活
   */
  takeDamage() {
    // [v1.4.0] 临时HP优先吸收伤害（超载神盾 Lv3 质变产物；消耗也断连击，与护盾语义一致 N1）
    if (this.tempHp > 0) {
      this.tempHp--
      this.resetCombo()
      this._emitFx('temp_hp_break')
      Logger.info('HP', '临时HP抵挡伤害', { tempHp: this.tempHp, hp: this.hp })
      return false
    }

    this.hp -= Config.HP.COLLISION_DAMAGE
    this.resetCombo()
    Logger.warn('HP', '受到伤害', { hp: this.hp, maxHp: this.maxHp })
    this.invalidateStats()  // [v1.1.2] 修复：HP变化后刷新缓存，使狂暴立即生效

    // [v1.4.0] 求生本能：HP 扣至 1 时补 1 层护盾（每局限 lv 次）
    // §2.6 受击链位置：HP扣减 之后、凤凰复活 之前；走统一 addShieldLayer 上限钳制，不得溢出
    if (this.hp === 1) {
      const survivorLv = this.owned.get('survivor_instinct') || 0
      if (survivorLv > 0 && this.survivorUsed < survivorLv) {
        this.survivorUsed++
        this.addShieldLayer(1)
        this._emitFx('survivor')  // Game 侧浮动文字"求生本能!"
        Logger.info('Ability', '求生本能触发', { used: this.survivorUsed, max: survivorLv, shieldLayers: this.shieldLayers })
      }
    }

    if (this.hp <= 0) {
      return true  // 死亡
    }
    return false
  }

  /**
   * 恢复HP
   */
  healHP(amount) {
    const before = this.hp
    this.hp = Math.min(this.hp + amount, this.maxHp)
    Logger.info('HP', '恢复HP', { before, after: this.hp, maxHp: this.maxHp })
    this.invalidateStats()  // [v1.1.2] HP变化刷新缓存
  }

  /**
   * 获取受击无敌帧数（含体魄加成）
   */
  getInvincibleFrames() {
    return Config.HP.INVINCIBLE_FRAMES + this.getStat('invincibleBonus')
  }

  // ==================== [v1.1.5] 统一护盾系统 ====================

  /**
   * 消耗一层护盾
   * [v1.2.2] N1 护盾消耗（弹力护盾弹开/统一护盾抵挡/冰雹护盾抵挡）统一断连击，
   *           杜绝"护盾抵挡不掉连击"配合连击之心的永动组合
   * @returns {boolean}
   */
  consumeShield() {
    if (this.shieldLayers > 0) {
      this.shieldLayers--
      this.shieldRecoverTimer = 0
      this.bounceShieldRecoverTimer = 0
      this.resetCombo()  // [v1.2.2] N1

      // [v1.4.0] 镜面护盾：护盾层消耗（破盾）时触发冲击波事件，Game 侧结算 AoE
      // 硬刹车：每 3s 最多触发 1 次（防"反复破盾刷波"回路）；冲击波对 Boss 无效（isBoss 分支）
      const mirrorLv = this.owned.get('mirror_shield') || 0
      if (mirrorLv > 0 && this.mirrorShockCD <= 0) {
        this.mirrorShockCD = Config.SHIELD.MIRROR_SHOCK_CD
        this._emitFx('mirror_shock')
        Logger.info('Shield', '镜面护盾冲击波触发', { radiusLv: mirrorLv, cd: this.mirrorShockCD })
      }

      Logger.info('Shield', '护盾消耗', { remaining: this.shieldLayers, max: this.maxShieldLayers })
      return true
    }
    return false
  }

  /**
   * [v1.1.5] 添加护盾层（道具拾取/护盾爆发等），不超过最大层数
   * [v1.4.0] 超载神盾 Lv3 质变：满层溢出部分转临时HP（上限 OVERDRIVE_TEMP_HP_CAP=2，
   *           HUD 空心心形与普通HP区分；超载只转HP不产羽盾——羽盾全局硬顶2层不变）
   */
  addShieldLayer(amount) {
    const before = this.shieldLayers
    const room = Math.max(0, this.maxShieldLayers - this.shieldLayers)
    const applied = Math.min(amount, room)
    this.shieldLayers += applied

    // 溢出转化（仅 Lv3 质变生效）
    const overflow = amount - applied
    const odLv = this.owned.get('aegis_overdrive') || 0
    if (overflow > 0 && odLv >= 3 && this.tempHp < Config.SHIELD.OVERDRIVE_TEMP_HP_CAP) {
      const gained = Math.min(overflow, Config.SHIELD.OVERDRIVE_TEMP_HP_CAP - this.tempHp)
      this.tempHp += gained
      this._emitFx('temp_hp')
      Logger.info('Shield', '超载神盾溢出转临时HP', { overflow: overflow, gained: gained, tempHp: this.tempHp })
    }

    if (this.shieldLayers > before) this._emitFx('shield')  // [v1.2.2] N7 护盾获得特效
    Logger.info('Shield', '获得护盾层', { before, after: this.shieldLayers, max: this.maxShieldLayers })
  }

  // ==================== [v1.4.0] 羽盾系统（回响之翼/铁羽） ====================

  /**
   * 回响之翼：过管计数，每 (9-2(lv-1)) 管存 1 层羽盾
   * 上限 = 1 + 铁羽等级，全局硬顶 FEATHER_SHIELD_MAX=2（不允许第三来源，防"羽盾无限续"）
   * 由 Game._onPipePass 调用
   */
  onPipePassEchoWing() {
    const echoLv = this.owned.get('echo_wing') || 0
    if (echoLv <= 0) return
    this.echoWingPipes++
    const need = Config.ABILITY.ECHO_WING_BASE_PIPES -
      Config.ABILITY.ECHO_WING_PIPES_REDUCTION * (echoLv - 1)
    if (this.echoWingPipes >= need) {
      this.echoWingPipes = 0
      const cap = this._getFeatherShieldCap()
      if (this.featherShields < cap) {
        this.featherShields++
        this._emitFx('feather_shield')
        Logger.info('Shield', '羽盾获得', { featherShields: this.featherShields, cap: cap })
      }
    }
  }

  _getFeatherShieldCap() {
    const ironLv = this.owned.get('iron_feather') || 0
    // 铁羽：无回响之翼时不生效（羽盾恒 0 来源，cap 加成无意义但保持一致性）
    return Math.min(1 + ironLv, Config.ABILITY.FEATHER_SHIELD_MAX)
  }

  /**
   * 消耗 1 层羽盾挡伤害（§2.6 受击链最前置防御节点：羽盾 → 弹力护盾 → 护盾层）
   * 铁羽：破羽盾给 30 帧/级无敌；消耗断连击（与统一护盾同语义，N1）
   * @returns {boolean} true=成功抵挡
   */
  consumeFeatherShield() {
    if (this.featherShields <= 0) return false
    this.featherShields--
    this.resetCombo()
    const ironLv = this.owned.get('iron_feather') || 0
    if (ironLv > 0) {
      this.invincibleFrames = Math.max(this.invincibleFrames,
        Config.ABILITY.IRON_FEATHER_INVINCIBLE_PER_LV * ironLv)
    }
    this._emitFx('feather_break')
    Logger.info('Shield', '羽盾破裂抵挡', { remaining: this.featherShields, ironLv: ironLv })
    return true
  }

  hasProtection() {
    return this.shieldLayers > 0 || this.featherShields > 0 ||
           this.invincibleFrames > 0 || this.timeWarpActive > 0
  }

  // ==================== 连击系统 ====================

  onPipePass() {
    // [v1.2.2] N1 无敌期间（受击/连击/复活等任何来源）过管不累计combo，
    // 打破连击之心Lv3"阈值2+无敌期照算"的永久无敌循环
    if (this.invincibleFrames > 0) return
    this.comboCount++
    const threshold = this.getStat('comboThreshold')
    if (this.comboCount >= threshold) {
      this.invincibleFrames = 180  // [v1.1.2] 300→180帧(3s)，避免永久无敌
      Logger.info('Combo', '连击无敌触发', { comboCount: this.comboCount, threshold, invincibleFrames: 180 })
      this.comboCount = 0
    }
  }

  resetCombo() {
    // [v1.4.0] 连击种子：断连击时保留 lv 层
    // 硬刹车（N1 教训）：保留层数 ≤ 连击之心当前无敌阈值-1，否则保留3层+阈值2=变相永动；
    // 未持连击之心时保留上限 COMBO_SEED_NO_HEART_CAP(4)
    const seedLv = this.owned.get('combo_seed') || 0
    if (seedLv <= 0) {
      this.comboCount = 0
      return
    }
    const heartLv = this.owned.get('combo_heart') || 0
    const cap = heartLv > 0
      ? Math.max(0, Math.max(2, 5 - heartLv) - 1)
      : Config.ABILITY.COMBO_SEED_NO_HEART_CAP
    this.comboCount = Math.min(this.comboCount, Math.min(seedLv, cap))
  }

  // ==================== 主动技能触发 ====================

  tryTimeWarp() {
    if (!this.getStat('hasTimeWarp') || this.timeWarpCD > 0) return false
    this.timeWarpCD = this._getTimeWarpCD()
    this.timeWarpActive = 60
    Logger.info('Ability', '时间扭曲触发', { cd: this.timeWarpCD })
    return true
  }

  tryTeleport() {
    if (!this.getStat('hasTeleport') || this.teleportCD > 0) return false
    this.teleportCD = this._getTeleportCD()
    Logger.info('Ability', '瞬移触发', { cd: this.teleportCD })
    return true
  }

  tryPhoenix() {
    if (!this.getStat('hasPhoenix')) return false
    this.phoenixUsed++
    // [v1.4.0] 血契语义同步：复活=回满"当前上限"（maxHp 已被血契修正），effectText 同步
    this.hp = this.maxHp
    this.invalidateStats()
    Logger.info('Ability', '凤凰复活触发', { phoenixUsed: this.phoenixUsed, hp: this.hp })
    return true
  }

  // [v1.1.0] 二段跳检测
  /**
   * 检查是否触发二段跳
   * @param {number} currentFrame - 当前帧
   * @returns {boolean}
   */
  tryDoubleJump(currentFrame) {
    if (!this.getStat('hasDoubleJump') || this.doubleJumpCD > 0) return false
    // [v1.2.1] 触发窗口 2~8帧 → 3~18帧（配置化，约50~300ms，人类可触发）
    const minW = Config.ABILITY.DOUBLE_JUMP_MIN_WINDOW
    const maxW = Config.ABILITY.DOUBLE_JUMP_MAX_WINDOW
    const dt = currentFrame - this.lastFlapFrame
    if (dt <= maxW && dt >= minW) {
      this.doubleJumpCD = this._getDoubleJumpCD()
      this.lastFlapFrame = -999
      Logger.info('Ability', '二段跳触发', { cd: this.doubleJumpCD })
      return true
    }
    this.lastFlapFrame = currentFrame
    return false
  }

  // ==================== 道具效果 [v1.1.0] ====================

  /**
   * 激活速度包减速
   */
  setSpeedPack(frames) {
    this.speedPackFrames = frames
  }

  /**
   * 获取速度包减速倍率
   */
  getSpeedPackMultiplier() {
    return this.speedPackFrames > 0 ? Config.ITEM.SPEED_PACK_SLOWDOWN : 1.0
  }

  /**
   * 检查经验共鸣是否触发（每次拾取经验球时调用）
   */
  checkExpResonance() {
    const chance = this.getStat('expResonanceChance')
    return chance > 0 && Math.random() < chance
  }

  // ==================== 工具 ====================

  /**
   * [v1.4.0] 先知（oracle）：评估候选卡与当前构筑的协同标签（只标注不推荐）
   * 优先级：⚠️反协同 > ⭐核心 > 🔗协同；标签表在 Config.ABILITY.ORACLE_*（必须与代码结算一致）
   * @param {string} id - 候选卡 id
   * @param {string|null} tamedWeather - 当前已驯化天气（chaos_dice 用，Game 侧传入）
   * @returns {string|null} 'anti' | 'core' | 'synergy' | null
   */
  getSynergyTag(id, tamedWeather) {
    const A = Config.ABILITY
    const owned = this.owned

    // ⚠️ 反协同：静态对表 + 驯化互斥（D7：驯化冰雹→冰晶护体作废等）
    for (const pair of A.ORACLE_ANTI_PAIRS) {
      if (pair[0] === id && owned.has(pair[1])) return 'anti'
      if (pair[1] === id && owned.has(pair[0])) return 'anti'
    }
    const mutex = tamedWeather && A.TAMED_MUTEX[tamedWeather]
    if (mutex && mutex.indexOf(id) >= 0) return 'anti'

    // ⭐ 核心：候选是某流派核心卡，且已持该流派 ≥1 张其他核心 或 ≥2 张协同件
    for (const arch of A.ORACLE_ARCHETYPES) {
      if (arch.core.indexOf(id) < 0) continue
      let otherCore = 0
      let support = 0
      for (const c of arch.core) if (c !== id && owned.has(c)) otherCore++
      for (const s of arch.support) if (owned.has(s)) support++
      if (otherCore >= 1 || support >= 2) return 'core'
    }

    // 🔗 协同：静态对表命中
    for (const pair of A.ORACLE_SYNERGY_PAIRS) {
      if (pair[0] === id && owned.has(pair[1])) return 'synergy'
      if (pair[1] === id && owned.has(pair[0])) return 'synergy'
    }
    return null
  }

  hasStat(key) {
    if (!this._statsCache) {
      this._statsCache = this.getStats()
    }
    return !!this._statsCache[key]
  }

  getOwnedList() {
    const list = []
    for (const [id, level] of this.owned) {
      list.push({ def: Registry.get(id), level })
    }
    return list
  }
}

module.exports = AbilitySystem
