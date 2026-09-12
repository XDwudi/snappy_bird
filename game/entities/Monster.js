/**
 * Monster.js - 怪物障碍实体 [v1.3.0新增]
 *
 * 继承 Obstacle 基类，是管道之外的第二类障碍物（可被导弹锁定，为 Boss 铺垫）。
 * 两种怪物（数值全部入 GameConfig.MONSTER）：
 * - 蝙蝠怪 bat 🦇：正弦垂直波动，HP=1
 * - 浮游怪 floater 👾：滞后追踪小鸟 y（追踪速度上限保证可躲避），HP=2
 *
 * 与小鸟碰撞走 Game._handleCollision 统一受击链（无敌帧/护盾/HP），与管道同级；
 * 不被管道碰撞影响（Game 中独立平行数组管理）。
 * 渲染为像素风几何体，风格与管道/小鸟一致。
 */

const Config = require('../config/GameConfig.js')
const Obstacle = require('./Obstacle.js')
const MathUtil = require('../core/MathUtil.js')

class Monster extends Obstacle {
  /**
   * @param {number} x - 左上角X（与基类/出屏判定一致，用左边缘坐标）
   * @param {number} y - 中心Y
   * @param {string} monsterType - 'bat' | 'floater'
   * @param {number} groundY - 地面顶部Y坐标
   * @param {Object} [opts] - [v1.5.0] 可选修正：{ elite, hpMult, trackSpeed, sineAmp }
   *                          elite=精英怪（§5.1 金边+体型×1.3+HP×3，移动参数不变）；
   *                          hpMult/trackSpeed/sineAmp=章节修正（§4.4，缺省=配置基准，零变化）
   */
  constructor(x, y, monsterType, groundY, opts) {
    const cfg = monsterType === 'bat' ? Config.MONSTER.BAT : Config.MONSTER.FLOATER
    // [v1.5.0] 精英怪体型 ×1.3（§5.1）；非精英 Math.round(×1)=原值，零变化
    const elite = !!(opts && opts.elite)
    const sizeMult = elite ? Config.MONSTER.ELITE_SIZE_MULT : 1
    const width = Math.round(cfg.WIDTH * sizeMult)
    const height = Math.round(cfg.HEIGHT * sizeMult)
    // 复用基类字段：topHeight/gap 映射为怪物包围盒（弹力护盾弹开方向等逻辑可直接复用）
    super(x, y - height / 2, height, groundY, width)
    this.type = 'monster'
    this.monsterType = monsterType
    this.destructible = true           // [v1.3.0] 可被导弹锁定/摧毁
    this.elite = elite                 // [v1.5.0] 精英标记（渲染金边/击杀奖励判定）
    // [v1.5.0] HP = 基础 × 精英倍率 × 章节倍率（§4.4 Ch3×1.5 向上取整）；默认全 1，零变化
    const hpMult = (opts && opts.hpMult) || 1
    this.hp = Math.ceil(cfg.HP * (elite ? Config.MONSTER.ELITE_HP_MULT : 1) * hpMult)
    this.maxHp = this.hp
    this.height = height
    this.y = y                          // 中心Y
    this.baseY = y                      // 蝙蝠正弦基准Y
    this.phase = Math.random() * Math.PI * 2  // 正弦/扇翅相位
    this._targetY = y                   // 浮游怪追踪目标Y（Game 每帧写入小鸟 y）
    // [v1.5.0] 章节移动参数覆写点（§4.4）；缺省取配置基准值，行为与 v1.4.0 完全一致
    this._trackSpeed = (opts && opts.trackSpeed) || Config.MONSTER.FLOATER.TRACK_SPEED
    this._sineAmp = (opts && opts.sineAmp) || Config.MONSTER.BAT.SINE_AMP
    this._syncBox()
  }

  /**
   * 将中心坐标同步到基类碰撞字段（topHeight/bottomY = 包围盒上下缘）
   */
  _syncBox() {
    this.topHeight = this.y - this.height / 2
    this.gap = this.height
    this.bottomY = this.y + this.height / 2
  }

  /**
   * 更新（覆盖基类模板方法，额外接收小鸟用于追踪）
   * @param {number} speed - 世界滚动速度
   * @param {Object} [bird] - 小鸟实体（浮游怪追踪其 y）
   */
  update(speed, bird) {
    if (bird) this._targetY = bird.y
    this._doUpdate(speed)
  }

  /**
   * 子类实现：位置更新
   */
  _doUpdate(speed) {
    this.x -= speed
    const M = Config.MONSTER

    if (this.monsterType === 'bat') {
      // 蝙蝠怪：正弦垂直波动（[v1.5.0] 振幅走实例字段，章节修正可覆写，默认=配置值）
      this.phase += M.BAT.SINE_FREQ
      this.y = this.baseY + Math.sin(this.phase) * this._sineAmp
    } else {
      // 浮游怪：滞后追踪小鸟 y，速度设上限保证可躲避（[v1.5.0] 追踪速度走实例字段）
      this.phase += 0.08  // 触须摆动相位
      const dy = this._targetY - this.y
      const maxStep = this._trackSpeed
      if (Math.abs(dy) > maxStep) {
        this.y += dy > 0 ? maxStep : -maxStep
      } else {
        this.y += dy
      }
    }

    // y 边界钳制（不出天花板/地面）
    this.y = MathUtil.clamp(this.y, this.height / 2, this.groundY - this.height / 2)
    this._syncBox()
  }

  /**
   * 子类实现：碰撞检测（AABB，碰撞箱为视觉的 0.8 倍）
   */
  _doCheckCollision(bird) {
    const w = this.width * 0.8
    const h = this.height * 0.8
    const birdRect = MathUtil.centerToRect(bird.x, bird.y, bird.collisionWidth, bird.collisionHeight)
    const monsterRect = MathUtil.centerToRect(this.x + this.width / 2, this.y, w, h)
    return MathUtil.aabbCollision(birdRect, monsterRect)
  }

  /**
   * 子类实现：渲染
   */
  _doRender(ctx) {
    if (this.monsterType === 'bat') {
      this._renderBat(ctx)
    } else {
      this._renderFloater(ctx)
    }
    // [v1.5.0] 精英怪：金色描边（§5.1 高价值目标视觉承诺，区别于普通怪黑描边）
    if (this.elite) {
      ctx.strokeStyle = Config.MONSTER.ELITE_BORDER_COLOR
      ctx.lineWidth = 2.5
      ctx.strokeRect(this.x - 3, this.y - this.height / 2 - 3, this.width + 6, this.height + 6)
    }
    // HP 指示：多血怪物头顶显示血点（实心=剩余HP）
    if (this.maxHp > 1) {
      const cx = this.x + this.width / 2
      for (let i = 0; i < this.maxHp; i++) {
        ctx.fillStyle = i < this.hp ? '#e74c3c' : 'rgba(0, 0, 0, 0.3)'
        ctx.beginPath()
        ctx.arc(cx + (i - (this.maxHp - 1) / 2) * 8, this.y - this.height / 2 - 8, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  /**
   * 蝙蝠怪：紫色身体 + 扇动双翼 + 红眼
   */
  _renderBat(ctx) {
    const cx = this.x + this.width / 2
    const cy = this.y
    const flap = Math.sin(this.phase * 3) * 5  // 翅膀扇动偏移

    // 双翼（随相位扇动的三角形）
    ctx.fillStyle = '#4a2a75'
    ctx.beginPath()
    ctx.moveTo(cx - 5, cy)
    ctx.lineTo(cx - this.width * 0.95, cy - 8 - flap)
    ctx.lineTo(cx - this.width * 0.65, cy + 4)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(cx + 5, cy)
    ctx.lineTo(cx + this.width * 0.95, cy - 8 - flap)
    ctx.lineTo(cx + this.width * 0.65, cy + 4)
    ctx.closePath()
    ctx.fill()

    // 身体（纵向略扁的椭圆，用 scale 实现）
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(1, 0.78)
    ctx.fillStyle = '#6c3fa0'
    ctx.beginPath()
    ctx.arc(0, 0, this.width * 0.32, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.restore()

    // 耳朵
    ctx.fillStyle = '#6c3fa0'
    ctx.beginPath()
    ctx.moveTo(cx - 8, cy - 6)
    ctx.lineTo(cx - 5, cy - 13)
    ctx.lineTo(cx - 2, cy - 7)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(cx + 8, cy - 6)
    ctx.lineTo(cx + 5, cy - 13)
    ctx.lineTo(cx + 2, cy - 7)
    ctx.closePath()
    ctx.fill()

    // 红眼
    ctx.fillStyle = '#ff3b3b'
    ctx.beginPath()
    ctx.arc(cx - 4, cy - 2, 2, 0, Math.PI * 2)
    ctx.arc(cx + 4, cy - 2, 2, 0, Math.PI * 2)
    ctx.fill()
  }

  /**
   * 浮游怪：绿色 blob + 大眼（瞳孔朝追踪方向）+ 摆动触须
   */
  _renderFloater(ctx) {
    const cx = this.x + this.width / 2
    const cy = this.y
    const r = this.width * 0.38

    // 触须（3 条，正弦摆动）
    ctx.strokeStyle = '#1e8449'
    ctx.lineWidth = 2.5
    for (let i = -1; i <= 1; i++) {
      const sway = Math.sin(this.phase + i) * 3
      ctx.beginPath()
      ctx.moveTo(cx + i * r * 0.5, cy + r * 0.7)
      ctx.lineTo(cx + i * r * 0.5 + sway, cy + r * 1.25)
      ctx.stroke()
    }

    // 身体
    ctx.fillStyle = '#27ae60'
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // 高光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'
    ctx.beginPath()
    ctx.arc(cx - r * 0.3, cy - r * 0.35, r * 0.35, 0, Math.PI * 2)
    ctx.fill()

    // 大眼（瞳孔朝追踪目标方向偏移）
    const lookDy = MathUtil.clamp((this._targetY - cy) * 0.04, -2, 2)
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(cx, cy - r * 0.1, r * 0.42, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#000000'
    ctx.beginPath()
    ctx.arc(cx - 2, cy - r * 0.1 + lookDy, r * 0.2, 0, Math.PI * 2)
    ctx.fill()
  }
}

module.exports = Monster
