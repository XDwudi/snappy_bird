/**
 * ChapterSystem.js - 章节系统 [v1.5.0]
 *
 * 职责（步骤 B：章节系统核心；Boss 本体步骤 C 接入）：
 *   1. 章内进度（§4.5）：过管计数 40 管触发 Boss + 150s 迟到兜底（章内计时，过章清零）。
 *      本步触发点为占位逻辑：记日志 + 浮动文字"Boss 逼近！"，不产生 Boss 实体、不暂停生成
 *      （若置 bossActive 而无 Boss 可打，管道停生成会软锁——bossActive 由步骤 C 的
 *      startBossFight() 显式开启）。
 *   2. 转场演出（§4.3）：白闪10帧 → 色带擦除60帧（新章底色从左推入）→ 标题卡90帧
 *      → 恢复飞行并给 60 帧无敌。转场期间世界冻结（UPGRADING 同款暂停语义：
 *      gameTime/实体/生成全停，只推进转场计时与管道换色 lerp）。
 *   3. 难度修正（§4.4 叠加制）：章节切换时把生成参数注入 SpawnSystem.setChapterModifiers；
 *      滚动速度加算/间隙加算由 Game._getScrollSpeed/_getGapSize 读 getMods()（Ch1 全零=零变化）。
 *   4. 视觉参数出口（§4.2）：getVisual() 供 Game 渲染天空/地面/章节元素；
 *      存量管道颜色 30 帧 lerp 平滑过渡（getPipeColorSet）。
 *   5. startBossFight()/endBossFight(win) 占位接口，供步骤 C Boss 流程调用。
 *
 * 零随机承诺：本系统默认路径（Ch1）不消耗任何随机数，update 序列与 v1.4.0 逐帧一致。
 */

const Config = require('../config/GameConfig.js')
const Logger = require('./GameLogger.js')

class ChapterSystem {
  /**
   * @param {Object} deps - 依赖注入（全部由 Game 提供）
   * @param {function():number} deps.getGameTime - 当前游戏时间（帧）
   * @param {function(number,number,string,string,number)} deps.addFloatingText - 浮动文字
   * @param {function(Object|null)} deps.setSpawnMods - 注入 SpawnSystem.setChapterModifiers
   * @param {function(boolean)} deps.setBossActive - 注入 SpawnSystem.setBossActive
   * @param {function(number)} deps.grantInvincible - 转场结束给无敌帧（帧数）
   * @param {number} deps.screenW - 逻辑屏幕宽度（浮动文字定位）
   * @param {number} deps.screenH - 逻辑屏幕高度
   */
  constructor(deps) {
    this._deps = deps
    this.index = 0                 // 当前章节下标（CHAPTERS.LIST，0=Ch1）
    this.pipesPassed = 0           // 章内过管计数（过章清零）
    this.chapterTime = 0           // 章内计时（帧，过章清零）
    this._bossTriggered = false    // 本章 Boss 触发点已触发（每章一次）
    this._bossActive = false       // [占位] Boss 战进行中（步骤 C 流程用）
    this._transition = null        // null | { phase:'flash'|'wipe'|'title', frame, toIndex }
    this._pipeLerp = null          // null | { frame, from, to }（from/to 为 {body,highlight,shadow}）
  }

  // ==================== 生命周期 ====================

  /** 重置到 Ch1（Game.start / backToReady 时调用）；恢复生成系统默认（零修正） */
  reset() {
    this.index = 0
    this.pipesPassed = 0
    this.chapterTime = 0
    this._bossTriggered = false
    this._bossActive = false
    this._transition = null
    this._pipeLerp = null
    this._deps.setSpawnMods(null)
    this._deps.setBossActive(false)
  }

  // ==================== 查询出口 ====================

  /** 当前章节配置 */
  getChapter() { return Config.CHAPTERS.LIST[this.index] }

  /** 章节难度修正（Game._getScrollSpeed/_getGapSize 每帧读取；Ch1 全零，加 0 精确无差） */
  getMods() { return this.getChapter().mods }

  /** 章节视觉参数（Game 背景/地面/章节元素渲染读取） */
  getVisual() { return this.getChapter().visual }

  /** 转场进行中（Game.update 冻结世界判定） */
  isTransitioning() { return !!this._transition }

  /** [占位] Boss 战进行中标记（步骤 C 读） */
  isBossActive() { return this._bossActive }

  /**
   * HUD 章节进度数据（§4.5："Ch1 · 12/40"，≥35/40 脉冲）
   * @returns {{id:number, name:string, pipes:number, target:number, pulse:boolean}}
   */
  getHudData() {
    const target = Config.CHAPTERS.TRIGGER_PIPES
    return {
      id: this.getChapter().id,
      name: this.getChapter().name,
      pipes: Math.min(this.pipesPassed, target),
      target: target,
      pulse: this.pipesPassed >= Config.CHAPTERS.HUD_PULSE_PIPES
    }
  }

  /**
   * 存量管道当前应使用的颜色组（§4.3 换色 lerp 30 帧）。
   * @returns {Object|null} { body, highlight, shadow }；Ch1 且非 lerp 中返回 null（Pipe 用默认色，零变化）
   */
  getPipeColorSet() {
    if (this._pipeLerp) {
      const t = Math.min(1, this._pipeLerp.frame / Config.CHAPTERS.PIPE_COLOR_LERP_FRAMES)
      return this._lerpPipeSet(this._pipeLerp.from, this._pipeLerp.to, t)
    }
    return this.index > 0 ? this.getVisual().pipe : null
  }

  /** 转场渲染状态（Game._drawChapterTransition 读取） */
  getTransitionRenderState() {
    const tr = this._transition
    if (!tr) return null
    const toChapter = Config.CHAPTERS.LIST[tr.toIndex]
    return {
      phase: tr.phase,
      frame: tr.frame,
      toVisual: toChapter.visual,
      title: toChapter.title,
      subtitle: toChapter.subtitle || '难度提升'
    }
  }

  // ==================== 每帧推进（PLAYING 帧，世界未冻结时由 Game 调用） ====================

  update() {
    this.chapterTime++
    this._advancePipeLerp()
    // §4.5 迟到兜底：章内 150s 未达 40 管强制触发（占位逻辑同过管触发）
    if (!this._bossTriggered && this.chapterTime >= Config.CHAPTERS.TRIGGER_TIMEOUT) {
      this._triggerBossPoint('timeout')
    }
  }

  /** 章内过管计数（Game._onPipePass 调用）；达 40 管触发 Boss 触发点 */
  onPipePassed() {
    this.pipesPassed++
    if (!this._bossTriggered && this.pipesPassed >= Config.CHAPTERS.TRIGGER_PIPES) {
      this._triggerBossPoint('pipes')
    }
  }

  // ==================== [v1.5.0] Boss 占位接口（步骤 C 接入） ====================

  /**
   * [占位] Boss 战开始：暂停管道/怪物生成（道具照常），标记 Boss 战状态。
   * 步骤 C 在 Boss 出场演出后调用；本步无副作用外的实体产出。
   */
  startBossFight() {
    this._bossActive = true
    this._deps.setBossActive(true)
    Logger.info('Chapter', 'Boss 战开始（占位接口）', { chapter: this.getChapter().id })
  }

  /**
   * [占位] Boss 战结束：恢复生成；win=true 且有下一章时启动转场演出（§4.3）。
   * 战败（win=false）的处理（扣 1HP/进度保留/20 管后回归，§4.10 D1）由步骤 C 实现。
   * @param {boolean} win
   */
  endBossFight(win) {
    this._bossActive = false
    this._deps.setBossActive(false)
    Logger.info('Chapter', 'Boss 战结束（占位接口）', { chapter: this.getChapter().id, win: !!win })
    if (win && this.index + 1 < Config.CHAPTERS.LIST.length) {
      this._startTransition()
    }
  }

  // ==================== 内部：触发点 / 转场 ====================

  /**
   * Boss 触发点（步骤 B 占位）：记日志 + 浮动文字"Boss 逼近！"。
   * 不产生 Boss 实体、不暂停生成（见文件头职责 1 说明）；步骤 C 在此接入出场演出。
   */
  _triggerBossPoint(reason) {
    this._bossTriggered = true
    this._deps.addFloatingText(this._deps.screenW / 2, this._deps.screenH * 0.3,
      'Boss 逼近！', '#ff4444', 90)
    Logger.info('Chapter', 'Boss 触发点（占位：本体步骤 C 接入）', {
      chapter: this.getChapter().id, reason: reason,
      pipes: this.pipesPassed, chapterTimeSec: Math.round(this.chapterTime / 60)
    })
  }

  /** 转场开始（§4.3）：白闪 → 色带擦除 → 标题卡 → 60帧无敌恢复飞行 */
  _startTransition() {
    this._transition = { phase: 'flash', frame: 0, toIndex: this.index + 1 }
    Logger.info('Chapter', '章节转场开始', { from: this.getChapter().id, to: this.index + 2 })
  }

  /**
   * 转场计时推进（世界冻结期由 Game.update 调用，其余更新全停）。
   * 章节切换（修正注入/计数清零/管道换色 lerp 启动）在擦除完成的瞬间生效，
   * 标题卡期间背景已是新章视觉。
   */
  updateTransition() {
    const T = Config.CHAPTERS.TRANSITION
    const tr = this._transition
    if (!tr) return
    tr.frame++
    this._advancePipeLerp()
    if (tr.phase === 'flash' && tr.frame >= T.FLASH_FRAMES) {
      tr.phase = 'wipe'
      tr.frame = 0
    } else if (tr.phase === 'wipe' && tr.frame >= T.WIPE_FRAMES) {
      this._applyNextChapter(tr.toIndex)
      tr.phase = 'title'
      tr.frame = 0
    } else if (tr.phase === 'title' && tr.frame >= T.TITLE_FRAMES) {
      this._transition = null
      // §4.3 收尾：60 帧无敌恢复飞行
      this._deps.grantInvincible(T.INVINCIBLE_FRAMES)
      Logger.info('Chapter', '转场结束，恢复飞行（60帧无敌）', { chapter: this.getChapter().id })
    }
  }

  /** 章节切换生效：下标前进 + 章内状态清零 + 难度修正注入 + 存量管道换色 lerp 启动 */
  _applyNextChapter(toIndex) {
    const fromVisual = this.getVisual()
    this.index = toIndex
    this.pipesPassed = 0
    this.chapterTime = 0
    this._bossTriggered = false
    const mods = this.getMods()
    // §4.4 生成参数注入（速度/间隙加算由 Game 侧读 getMods()，不在此处）
    this._deps.setSpawnMods({
      monsterSpawnDistance: mods.monsterSpawnDistance,
      monsterMaxAlive: mods.monsterMaxAlive,
      monsterHpMult: mods.monsterHpMult,
      floaterTrackSpeed: mods.floaterTrackSpeed,
      batSineAmp: mods.batSineAmp,
      eliteChance: mods.eliteChance
    })
    // §4.3 存量管道颜色 lerp 30 帧平滑过渡（新管由 Game 生成接线处直接给新章色）
    this._pipeLerp = { frame: 0, from: fromVisual.pipe, to: this.getVisual().pipe }
    Logger.info('Chapter', '进入新章节', { chapter: this.getChapter().id, name: this.getChapter().name })
  }

  /** 管道换色 lerp 帧推进（正常 update 与转场冻结期都推进） */
  _advancePipeLerp() {
    if (!this._pipeLerp) return
    this._pipeLerp.frame++
    if (this._pipeLerp.frame >= Config.CHAPTERS.PIPE_COLOR_LERP_FRAMES) {
      this._pipeLerp = null  // 到位后 getPipeColorSet 返回目标色（index>0 分支）
    }
  }

  // ==================== 内部：颜色 lerp（#rrggbb 线性插值） ====================

  _hexToRgb(hex) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16)
    ]
  }

  _lerpColor(fromHex, toHex, t) {
    const a = this._hexToRgb(fromHex)
    const b = this._hexToRgb(toHex)
    const c = []
    for (let i = 0; i < 3; i++) c.push(Math.round(a[i] + (b[i] - a[i]) * t))
    return 'rgb(' + c[0] + ', ' + c[1] + ', ' + c[2] + ')'
  }

  _lerpPipeSet(from, to, t) {
    return {
      body: this._lerpColor(from.body, to.body, t),
      highlight: this._lerpColor(from.highlight, to.highlight, t),
      shadow: this._lerpColor(from.shadow, to.shadow, t)
    }
  }
}

module.exports = ChapterSystem
