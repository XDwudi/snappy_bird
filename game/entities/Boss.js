/**
 * Boss.js - 关底 Boss 实体 [v1.5.0 步骤C]
 *
 * §4.6 同框架变体制：4 章共用本框架，每章为 BOSS.VARIANTS 参数化变体
 * （数值/弹幕模式/召唤物/配色全部入配置表，本文件零硬编码数值）。
 *
 * 行为（§4.8 基准框架 = 雷羽巨鹰）：
 *   entering —— 出场飞入（§4.11：右侧飞入至屏 70%，60 帧，由 ChapterSystem 出场演出驱动）
 *   roam     —— 正弦巡游：x=屏 70%，y 振幅 120px、周期 4s；P1 只有羽刃弹幕（教学段）
 *   P2(HP<50%)「暴怒」—— 入场闪电粒子爆闪 30 帧 + 血条变红（HUD 读 phase）+ 弹幕加密
 *                 + 每 15s 召唤小怪（Monster 工厂，deps.onSummon）+ 蓄力冲锋：
 *                 windup(后退30px蓄力0.8s 泛白预警+红色警示带) → charging(冲至屏15%，8px/f) → return
 *   dying    —— 死亡演出（§4.11）：Game 侧爆炸粒子环+慢动作期间，Boss 翻滚坠落渐隐
 *   leaving  —— 战败离场（§4.10 方案A）：长鸣右飞加速离场，弧形上扬
 *
 * 受击接口：destructible=true + takeDamage(n)（导弹/弹幕用；蜂群链路叠层对 Boss 不加成——
 * 防秒杀口径见 DECISIONS D19）；本体接触伤害 1 走 Game._handleCollision 统一受击链；
 * 铁喙/镜面护盾对 Boss 无效（Game 侧 isBoss 分支）。
 *
 * 零随机承诺：Boss 行为全部确定（相位/计时器），不消耗 Math.random——随机只在外部
 * （召唤物由 Monster 构造器自带相位随机；弹幕扇形为固定角度）。
 */

const Config = require('../config/GameConfig.js')
const Obstacle = require('./Obstacle.js')
const MathUtil = require('../core/MathUtil.js')

class Boss extends Obstacle {
  /**
   * @param {number} variantIndex - BOSS.VARIANTS 下标（=章节下标）
   * @param {number} screenW - 逻辑屏幕宽度
   * @param {number} screenH - 逻辑屏幕高度
   * @param {number} hp - Boss HP（单一事实源：CHAPTERS.mods.bossHp，由 Game 传入）
   * @param {Object} deps - 行为出口（全部由 Game 提供，Boss 不反查 Game 内部状态）
   * @param {function(number,number,number,number,string)} deps.onFireFeather - 发射弹幕(x,y,angle,speed,color)
   * @param {function(string,number,number)} deps.onSummon - 召唤小怪(type,x,y)（走 Monster 工厂）
   * @param {function(Boss)} deps.onPhase2 - P2 入场回调（Game 侧闪电粒子爆闪+日志）
   */
  constructor(variantIndex, screenW, screenH, hp, deps) {
    const B = Config.BOSS
    const cfg = B.VARIANTS[variantIndex] || B.VARIANTS[0]
    const w = B.WIDTH
    const h = B.HEIGHT
    const groundY = screenH - Config.GROUND.HEIGHT
    // 复用基类字段：topHeight/gap 映射为 Boss 包围盒（弹力护盾弹开方向等逻辑直接复用）
    super(screenW + w, screenH * 0.45 - h / 2, h, groundY, w)
    this.type = 'boss'
    this.isBoss = true               // isBoss 分支：铁喙/镜面/猎手连锁对 Boss 无效
    this.destructible = true         // 可被导弹锁定/命中（takeDamage）
    this.variant = cfg
    this.name = cfg.name
    this.hp = hp
    this.maxHp = hp
    this.height = h
    this.screenW = screenW
    this.screenH = screenH
    this._deps = deps

    // 巡游参数（§4.8：x=屏70%，y 振幅 120px 周期 4s）
    this.homeX = screenW * B.HOME_X_RATIO
    this.baseY = MathUtil.clamp(screenH * 0.45, B.ROAM_AMP + h / 2 + 10, groundY - B.ROAM_AMP - h / 2 - 10)
    this.y = this.baseY              // 中心Y
    this.roamT = 0                   // 巡游相位（帧；周期 ROAM_PERIOD）

    // 阶段（P1→P2：HP<50%）
    this.phase = 1
    this.phase2Flash = 0             // P2 入场爆闪剩余帧（渲染闪烁用）

    // 状态机：entering → roam → (windup → charging → return → roam) → dying / leaving
    this.state = 'entering'
    this.stateT = 0                  // 当前状态已经过帧数
    this.chargeY = this.baseY        // 冲锋锁定高度（蓄力开始时取当前 y）

    // 攻击计时器（仅在 roam 状态推进；P2 才启用召唤/冲锋）
    const p1 = cfg.p1
    this._volleyTimer = Math.floor(p1.volleyInterval / 2)  // 进场后半周期首发，快速建立压迫感（确定性）
    this._summonTimer = cfg.summon.interval
    this._chargeTimer = cfg.chargeCD

    this._hitFlash = 0               // 受击白闪反馈（帧）
    this._syncBox()
  }

  /** 中心坐标同步到基类碰撞字段（topHeight/bottomY = 包围盒上下缘，同 Monster 手法） */
  _syncBox() {
    this.topHeight = this.y - this.height / 2
    this.gap = this.height
    this.bottomY = this.y + this.height / 2
  }

  /** 当前阶段弹幕参数（P1/P2 变体参数） */
  _volleyCfg() {
    return this.phase === 2 ? this.variant.p2 : this.variant.p1
  }

  /**
   * 每帧更新（Boss 自主位移，不吃世界滚动速度——弹幕节奏与飞行压力解耦）
   * @param {Object} [bird] - 小鸟实体（蓄力冲锋锁定其高度用；可空则锁定自身当前 y）
   */
  update(bird) {
    const B = Config.BOSS
    this.stateT++
    if (this._hitFlash > 0) this._hitFlash--
    if (this.phase2Flash > 0) this.phase2Flash--

    if (this.state === 'entering') {
      // §4.11：右侧飞入至 70%（60 帧线性到位；此期间世界冻结，纯演出）
      const t = Math.min(1, this.stateT / B.INTRO_ENTER_FRAMES)
      this.x = (this.screenW + this.width) + (this.homeX - this.screenW - this.width) * t
      this.y = this.baseY
      if (this.stateT >= B.INTRO_ENTER_FRAMES) this._setState('roam')  // 到位→巡游（战斗开始）
    } else if (this.state === 'roam') {
      this.x = this.homeX
      this.roamT++
      this.y = this.baseY + Math.sin((this.roamT / B.ROAM_PERIOD) * Math.PI * 2) * B.ROAM_AMP
      this._updateAttacks(bird)
    } else if (this.state === 'windup') {
      // §4.8 蓄力：后退 30px（0.8s），泛白预警+警示带在 render
      const t = Math.min(1, this.stateT / B.CHARGE_WINDUP_FRAMES)
      this.x = this.homeX + B.CHARGE_BACK_PX * t
      this.y = this.chargeY
      if (this.stateT >= B.CHARGE_WINDUP_FRAMES) this._setState('charging')
    } else if (this.state === 'charging') {
      // §4.8 冲刺：8px/f 冲至屏 15% 处
      this.x -= B.CHARGE_SPEED
      if (this.x <= this.screenW * B.CHARGE_TARGET_X_RATIO) this._setState('return')
    } else if (this.state === 'return') {
      // 返回巡游位（半速，给玩家喘息窗口）
      this.x += B.CHARGE_SPEED / 2
      if (this.x >= this.homeX) {
        this.x = this.homeX
        this._setState('roam')
      }
    } else if (this.state === 'dying') {
      // 死亡演出：翻滚坠落渐隐（慢动作期由 Game 驱动帧数，实体只做视觉位移）
      this.y += 1.2
      this.x += 0.6
    } else if (this.state === 'leaving') {
      // 战败离场：加速右飞+弧形上扬（长鸣浮动文字由 Game 侧）
      this.x += 4 + this.stateT * 0.12
      this.y -= 1 + this.stateT * 0.04
    }

    // y 边界钳制（不出天花板/地面）
    if (this.state !== 'leaving') {
      this.y = MathUtil.clamp(this.y, this.height / 2, this.groundY - this.height / 2)
    }
    this._syncBox()
  }

  _setState(s) {
    this.state = s
    this.stateT = 0
  }

  /**
   * 攻击计时（roam 状态每帧调用）：
   *   P1：羽刃弹幕（教学段，中线留 2 条稳定通路）；
   *   P2：弹幕加密 + 每 15s 召唤 + 蓄力冲锋（§4.8 阶段表）
   */
  _updateAttacks(bird) {
    const cfg = this.variant

    // 羽刃弹幕：扇形 N 发（间隔角 FAN_ANGLE_STEP），炮口=喙部
    this._volleyTimer--
    if (this._volleyTimer <= 0) {
      const vc = this._volleyCfg()
      this._volleyTimer = vc.volleyInterval
      const muzzleX = this.x + this.width * 0.08
      const muzzleY = this.y
      for (let i = 0; i < vc.volley; i++) {
        const angle = Math.PI + (i - (vc.volley - 1) / 2) * Config.BOSS.FAN_ANGLE_STEP
        this._deps.onFireFeather(muzzleX, muzzleY, angle, vc.bulletSpeed, cfg.bulletColor)
      }
    }

    // P2 追加：召唤（走 Monster 工厂）与蓄力冲锋
    if (this.phase === 2) {
      this._summonTimer--
      if (this._summonTimer <= 0) {
        this._summonTimer = cfg.summon.interval
        for (let i = 0; i < cfg.summon.count; i++) {
          this._deps.onSummon(cfg.summon.type, this.x - 20 - i * 50, this.y + (i - (cfg.summon.count - 1) / 2) * 70)
        }
      }
      this._chargeTimer--
      if (this._chargeTimer <= 0) {
        this._chargeTimer = cfg.chargeCD
        // §4.8 蓄力冲锋：锁定当前高度为冲锋高度（预警 0.8s = 二段跳窗口×2.5 反应余量）
        this.chargeY = bird ? MathUtil.clamp(bird.y, this.height, this.groundY - this.height) : this.y
        this._setState('windup')
      }
    }
  }

  /**
   * [v1.3.0] 受击接口覆盖：HP 扣减 + 受击白闪 + P1→P2 阶段切换（HP<50%）
   * @param {number} n - 伤害值
   * @returns {boolean} true=HP 归零（Game 侧走胜利结算）
   */
  takeDamage(n) {
    this.hp -= n
    this._hitFlash = 6
    if (this.phase === 1 && this.hp < this.maxHp * Config.BOSS.PHASE2_HP_RATIO && this.hp > 0) {
      this.phase = 2
      this.phase2Flash = Config.BOSS.PHASE2_FLASH_FRAMES  // §4.8 P2 入场爆闪 30 帧
      if (this._deps.onPhase2) this._deps.onPhase2(this)
    }
    return this.hp <= 0
  }

  /** 死亡演出开始（Game 胜利结算调用；实体保留 30 帧做翻滚坠落） */
  startDying() { this._setState('dying') }

  /** 战败离场（§4.10 方案A：Boss 长鸣离场，章内进度保留） */
  startLeaving() { this._setState('leaving') }

  /** 冲锋/返回中（Game 接触伤害判定提示用，渲染也可读） */
  isCharging() { return this.state === 'charging' }

  /**
   * 子类实现：碰撞检测（AABB，碰撞箱为视觉的 0.8 倍，同 Monster 口径）
   * 接触伤害 1，走 Game._handleCollision 统一受击链（铁喙对 Boss 免疫，isBoss 分支）
   */
  _doCheckCollision(bird) {
    // entering/dying/leaving 不参与碰撞（演出期无威胁）
    if (this.state === 'entering' || this.state === 'dying' || this.state === 'leaving') return false
    const w = this.width * 0.8
    const h = this.height * 0.8
    const birdRect = MathUtil.centerToRect(bird.x, bird.y, bird.collisionWidth, bird.collisionHeight)
    const bossRect = MathUtil.centerToRect(this.x + this.width / 2, this.y, w, h)
    return MathUtil.aabbCollision(birdRect, bossRect)
  }

  /** 是否已离开屏幕（leaving 态回收判定） */
  isOffscreen() {
    return this.x - this.width > this.screenW + 40 || this.y < -80
  }

  // ==================== 渲染（纯 Canvas 几何体像素风，零素材） ====================

  _doRender(ctx) {
    const cfg = this.variant
    const c = cfg.colors
    const cx = this.x + this.width / 2
    const cy = this.y
    const flap = Math.sin(this.roamT * 0.12 + this.stateT * 0.08) * 10  // 翅膀扇动

    // 冲锋蓄力预警（§4.8 预警规范：≥0.5s 前摇+独立视觉语言）
    if (this.state === 'windup') this._renderChargeWarning(ctx, cy)

    // P2 暴怒红晕（血条变红在 HUD；本体给红色气场）
    if (this.phase === 2) {
      const pulse = 0.5 + 0.5 * Math.sin(this.stateT * 0.3)
      ctx.fillStyle = 'rgba(255, 60, 40, ' + (0.10 + 0.08 * pulse).toFixed(3) + ')'
      ctx.beginPath()
      ctx.arc(cx, cy, this.width * 0.75, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.save()
    ctx.translate(cx, cy)
    if (this.state === 'dying') {
      // 死亡翻滚坠落渐隐
      ctx.rotate(this.stateT * 0.15)
      ctx.globalAlpha = Math.max(0, 1 - this.stateT / Config.BOSS.DEATH_SLOWMO_FRAMES)
    }

    const u = this.width / 90  // 尺寸归一系数（贴图坐标按 90px 宽基准绘制）

    // 尾羽（三片，朝右后方）
    ctx.fillStyle = c.wing
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath()
      ctx.moveTo(30 * u, i * 6 * u)
      ctx.lineTo((52 + Math.abs(i) * 4) * u, (i * 12 - 4) * u)
      ctx.lineTo((52 + Math.abs(i) * 4) * u, (i * 12 + 4) * u)
      ctx.closePath()
      ctx.fill()
    }

    // 翅膀（上下扇动的大三角，面向左侧玩家）
    ctx.fillStyle = c.wing
    ctx.beginPath()
    ctx.moveTo(-6 * u, -4 * u)
    ctx.lineTo(14 * u, (-34 - flap) * u)
    ctx.lineTo(30 * u, -6 * u)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(-6 * u, 4 * u)
    ctx.lineTo(14 * u, (34 + flap) * u)
    ctx.lineTo(30 * u, 6 * u)
    ctx.closePath()
    ctx.fill()

    // 身体（横向椭圆）+ 腹部
    ctx.fillStyle = c.body
    ctx.beginPath()
    ctx.ellipse(0, 0, 34 * u, 22 * u, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = c.outline
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = c.belly
    ctx.beginPath()
    ctx.ellipse(-6 * u, 6 * u, 20 * u, 12 * u, 0, 0, Math.PI * 2)
    ctx.fill()

    // 头（左前）+ 喙 + 眼（P2 红眼）
    ctx.fillStyle = c.body
    ctx.beginPath()
    ctx.arc(-32 * u, -8 * u, 14 * u, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = c.outline
    ctx.stroke()
    ctx.fillStyle = c.beak
    ctx.beginPath()
    ctx.moveTo(-42 * u, -10 * u)
    ctx.lineTo(-58 * u, -4 * u)
    ctx.lineTo(-42 * u, 0)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = this.phase === 2 ? '#ff3b3b' : c.eye
    ctx.beginPath()
    ctx.arc(-34 * u, -11 * u, 3.5 * u, 0, Math.PI * 2)
    ctx.fill()

    // 受击白闪 / 蓄力泛白预警（§4.8：泛白=冲锋前摇视觉语言）
    if (this._hitFlash > 0 || this.state === 'windup') {
      const a = this.state === 'windup'
        ? 0.25 + 0.25 * Math.sin(this.stateT * 0.5)   // 蓄力呼吸泛白
        : this._hitFlash / 6 * 0.5                    // 受击短闪
      ctx.globalAlpha = Math.max(0, a)
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.ellipse(0, 0, 36 * u, 24 * u, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = this.state === 'dying' ? Math.max(0, 1 - this.stateT / Config.BOSS.DEATH_SLOWMO_FRAMES) : 1
    }

    ctx.restore()

    // P2 入场爆闪：全屏闪电白闪（30 帧渐隐，粒子由 Game 侧补）
    if (this.phase2Flash > 0) {
      ctx.fillStyle = 'rgba(255, 255, 220, ' + (this.phase2Flash / Config.BOSS.PHASE2_FLASH_FRAMES * 0.35).toFixed(3) + ')'
      ctx.fillRect(0, 0, this.screenW, this.screenH)
    }

    // Ch2 沙暴巨鹰：沙粒尾迹（§4.6 差异说明；位置由 stateT 推导，零随机源）
    if (cfg.trailColor) {
      for (let i = 0; i < 6; i++) {
        const tx = this.x + this.width + 8 + i * 14
        const ty = cy + Math.sin(this.stateT * 0.2 + i * 1.7) * 12 + (i % 2) * 8
        const alpha = Math.max(0, 0.4 - i * 0.06)
        ctx.fillStyle = 'rgba(' + cfg.trailColor + ', ' + alpha.toFixed(3) + ')'
        ctx.beginPath()
        ctx.arc(tx, ty, 3 - i * 0.3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  /**
   * §4.8 冲锋预警：红色轨迹警示带（蓄力全程，沿冲锋锁定高度横贯屏幕）+ 泛白呼吸（本体处）
   */
  _renderChargeWarning(ctx, cy) {
    const pulse = 0.35 + 0.3 * Math.sin(this.stateT * 0.5)
    ctx.fillStyle = 'rgba(255, 40, 40, ' + pulse.toFixed(3) + ')'
    ctx.fillRect(0, cy - 6, this.screenW, 12)
    ctx.fillStyle = 'rgba(255, 255, 255, ' + (pulse * 0.6).toFixed(3) + ')'
    ctx.fillRect(0, cy - 1.5, this.screenW, 3)
  }
}

module.exports = Boss
