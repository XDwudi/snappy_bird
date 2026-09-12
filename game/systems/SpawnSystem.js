/**
 * SpawnSystem.js - 生成系统 [v1.5.0]
 *
 * 职责：管道 / 道具 / 怪物的"生成决策"——时机、位置、类型 roll、保底计时。
 * 从 Game.js 拆出（审计 docs/audits/审计_v1.2.0.md §A3 优先级 4），
 * Game.js 只保留"把生成结果放进数组"的接线（onSpawnPipe / onSpawnMonster / onSpawnItem 回调）。
 *
 * 拆分范围（原 Game.js 方法 → 本系统）：
 *   _getSpawnDistance      → getSpawnDistance      （管道生成间隔 ramp，距离制）
 *   _spawnPipe             → spawnPipe             （管道实体生成，间隙/高度决策）
 *   _updateMonsterSpawn    → updateMonsterSpawn    （怪物生成时机：新手保护+距离节奏+同屏上限）
 *   _pickMonsterY          → pickMonsterY          （怪物生成 y：避开前方管道间隙中心）
 *   _spawnRandomItem       → spawnRandomItem       （随机道具生成：位置+类型 roll）
 *   _rollItemType          → rollItemType          （道具类型权重 roll）
 *   _updateSupplyLine      → updateSupplyLine      （补给线保底计时器，属道具生成职责）
 *   _onPipePass 内道具块    → maybeSpawnItemOnPipePass（过管 25% 道具掉落决策）
 * 移入状态：_distanceSinceSpawn → _pipeDistance、_monsterDistance、itemSpawnTimer、supplyLineTimer
 *
 * [v1.5.0] 预留接口（本章只留接口，不实现章节逻辑）：
 *   setBossActive(active)      —— Boss 战期间暂停管道/怪物的生成与距离累计（道具照常）。
 *                                  默认 false，行为与拆分前完全一致。
 *   setChapterModifiers(mods)  —— 章节系统覆写生成参数的注入点：
 *                                  { pipeDistanceScale, monsterSpawnDistanceScale, monsterMaxAlive }
 *                                  默认 null（不覆写），行为与拆分前完全一致。
 *
 * 行为等价承诺：纯重构，零数值变化、零节奏变化、零随机数消耗顺序变化
 * （test_gameplay_sim / test_builds_sim 同 seed 输出逐局吻合为验收标准）。
 */

const Config = require('../config/GameConfig.js')
const Pipe = require('../entities/Pipe.js')
const Monster = require('../entities/Monster.js')
const Item = require('../entities/Item.js')
const Logger = require('./GameLogger.js')

class SpawnSystem {
  /**
   * @param {Object} deps - 依赖注入（全部由 Game 提供，SpawnSystem 不反查 Game 内部状态）
   * @param {number} deps.screenW - 逻辑屏幕宽度
   * @param {number} deps.screenH - 逻辑屏幕高度
   * @param {function():number} deps.getGameTime - 当前游戏时间（帧）
   * @param {function():Object} deps.getStats - 能力系统聚合属性（gapBonus 等）
   * @param {function():number} deps.getGapSize - 当前管道间隙（难度曲线+能力修正，由 Game._getGapSize 提供）
   * @param {function(string):number} deps.getOwnedLevel - 能力持有等级（supply_line 保底用）
   * @param {function():Array} deps.getPipes - 当前管道数组（怪物 y 避让用）
   * @param {function():number} deps.getMonsterCount - 当前同屏怪物数
   * @param {function(Pipe)} deps.onSpawnPipe - 管道生成结果接线（Game push 进 this.pipes）
   * @param {function(Monster)} deps.onSpawnMonster - 怪物生成结果接线
   * @param {function(Item)} deps.onSpawnItem - 道具生成结果接线
   */
  constructor(deps) {
    this._deps = deps

    // 生成计时状态（原 Game.js 字段，语义不变）
    this._pipeDistance = 0    // [v1.3.0] 距上次生成管道的累计滚动距离(px)，替代旧 spawnTimer(帧)
    this._monsterDistance = 0 // [v1.3.0] 距上次生成怪物的累计滚动距离(px)
    this.itemSpawnTimer = 0   // [v1.1.1] 随机道具刷新计时器
    this.supplyLineTimer = 0  // [v1.4.0] 补给线保底道具计时器（与随机生成 itemSpawnTimer 独立）

    // [v1.5.0] Boss 战开关：true 时暂停管道/怪物生成（预留，默认 false）
    this._bossActive = false

    // [v1.5.0] 章节修正参数注入点（预留，默认 null = 不覆写任何数值）
    // { pipeDistanceScale: number, monsterSpawnDistanceScale: number, monsterMaxAlive: number }
    this._chapterMods = null
  }

  // ==================== 生命周期 ====================

  /** 重置全部生成计时状态（Game.start / backToReady 时调用） */
  reset() {
    this._pipeDistance = 0    // [v1.3.0]
    this._monsterDistance = 0 // [v1.3.0]
    this.itemSpawnTimer = 0   // [v1.1.1]
    this.supplyLineTimer = 0  // [v1.4.0]
    // 注：_bossActive / _chapterMods 是跨局配置，不随局内重置清零
  }

  // ==================== [v1.5.0] 预留开关（仅接口，无章节逻辑） ====================

  /**
   * [v1.5.0] Boss 战开关：暂停管道/怪物的生成与距离累计（道具生成不受影响）。
   * 语义：暂停期间距离不累计，Boss 结束后从暂停点继续，不补偿性连发。
   * @param {boolean} active
   */
  setBossActive(active) {
    this._bossActive = !!active
  }

  /**
   * [v1.5.0] 章节修正参数注入点：章节系统可覆写生成距离/怪物上限等。
   * 传 null 恢复默认。仅支持白名单字段，未知字段忽略。
   * @param {Object|null} mods - { pipeDistanceScale, monsterSpawnDistanceScale, monsterMaxAlive }
   */
  setChapterModifiers(mods) {
    this._chapterMods = mods || null
  }

  // ==================== 每帧生成更新 ====================

  /**
   * 每帧生成决策主入口（Game.update 内调用，调用顺序与原四处散点完全一致：
   * 管道 → 怪物 → 随机道具计时 → 补给线保底，保证随机数消耗顺序不变）
   * @param {number} scrollSpeed - 当前滚动速度（px/帧）
   */
  update(scrollSpeed) {
    // [v1.3.0] 管道生成改为距离制：累计滚动距离达标才生成
    // 修复减速 bug：速度包/时间扭曲只影响移动速度，不再改变管道空间密度
    // [v1.5.0] bossActive：Boss 战期间暂停管道生成与距离累计
    if (!this._bossActive) {
      this._pipeDistance += scrollSpeed
      if (this._pipeDistance >= this.getSpawnDistance()) {  // [v1.2.2] N5 距离随时间收紧
        this.spawnPipe()
        this._pipeDistance = 0
      }

      // [v1.3.0] 怪物生成（45s 新手保护后，同样按滚动距离节奏）
      this.updateMonsterSpawn(scrollSpeed)
    }

    // [v1.1.1] 随机道具刷新（独立于管道通过；Boss 战期间照常，供补给）
    this.itemSpawnTimer++
    if (this.itemSpawnTimer >= Config.ITEM.RANDOM_SPAWN_INTERVAL) {
      if (Math.random() < Config.ITEM.RANDOM_SPAWN_CHANCE) {
        this.spawnRandomItem()
      }
      this.itemSpawnTimer = 0
    }

    // [v1.4.0] 补给线：保底道具计时（与随机生成独立）
    this.updateSupplyLine()
  }

  // ==================== 管道生成 ====================

  /**
   * [v1.3.0] 管道生成间隔改距离制：返回当前生成间隔（滚动像素）。
   * [v1.2.2] N5 ramp 同步改距离版：120s起从270px线性收紧，至300s达240px下限。
   * 与帧数制无关——减速期空间密度保持不变。
   * [v1.5.0] 章节注入点：pipeDistanceScale 按比例缩放最终间隔（默认不覆写）。
   * @returns {number} 当前生成间隔（px）
   */
  getSpawnDistance() {
    const P = Config.PIPE
    const gameTime = this._deps.getGameTime()
    let dist
    if (gameTime <= P.SPAWN_RAMP_START) {
      dist = P.SPAWN_DISTANCE
    } else {
      const t = Math.min(1, (gameTime - P.SPAWN_RAMP_START) / P.SPAWN_RAMP_TIME)
      dist = Math.round(P.SPAWN_DISTANCE + (P.SPAWN_DISTANCE_MIN - P.SPAWN_DISTANCE) * t)
    }
    // [v1.5.0] 章节覆写（预留）：仅在显式注入时生效，默认路径零变化
    if (this._chapterMods && this._chapterMods.pipeDistanceScale != null) {
      dist = Math.round(dist * this._chapterMods.pipeDistanceScale)
    }
    return dist
  }

  /**
   * 管道实体生成：间隙由 Game._getGapSize（难度曲线+能力修正）决定，
   * 本系统只决策生成位置（topHeight roll）并产出实体。
   */
  spawnPipe() {
    const stats = this._deps.getStats()
    const gapBonus = stats.gapBonus
    // [v1.1.5] 管道以基础间隙生成，动画缩回至最终间隙(baseGap + gapBonus)
    const finalGap = this._deps.getGapSize()  // 含 gapBonus 的最终间隙
    const baseGap = finalGap - gapBonus       // 不含 gapBonus 的基础间隙
    const groundY = this._deps.screenH - Config.GROUND.HEIGHT
    const minTop = Config.PIPE.MIN_TOP
    const maxTop = groundY - finalGap - Config.PIPE.MIN_BOTTOM
    const topHeight = minTop + Math.random() * (maxTop - minTop)
    // 以基础间隙生成，shrinkBonus 驱动缩回动画
    const pipe = new Pipe(this._deps.screenW + 10, topHeight, baseGap, groundY)
    pipe.shrinkBonus = gapBonus
    this._deps.onSpawnPipe(pipe)
  }

  // ==================== [v1.3.0] 怪物生成 ====================

  /**
   * [v1.3.0] 怪物生成：45s 新手保护期后，按滚动距离节奏生成，同时最多 MAX_ALIVE 只
   * [v1.5.0] 章节注入点：monsterSpawnDistanceScale / monsterMaxAlive 可覆写（默认不覆写）
   * @param {number} scrollSpeed - 当前滚动速度
   */
  updateMonsterSpawn(scrollSpeed) {
    const M = Config.MONSTER
    if (this._deps.getGameTime() < M.SPAWN_DELAY) return
    const maxAlive = (this._chapterMods && this._chapterMods.monsterMaxAlive != null)
      ? this._chapterMods.monsterMaxAlive : M.MAX_ALIVE
    if (this._deps.getMonsterCount() >= maxAlive) return
    this._monsterDistance += scrollSpeed
    const spawnDist = (this._chapterMods && this._chapterMods.monsterSpawnDistanceScale != null)
      ? M.SPAWN_DISTANCE * this._chapterMods.monsterSpawnDistanceScale : M.SPAWN_DISTANCE
    if (this._monsterDistance < spawnDist) return
    this._monsterDistance = 0

    const type = Math.random() < M.BAT_WEIGHT ? 'bat' : 'floater'
    const groundY = this._deps.screenH - Config.GROUND.HEIGHT
    const y = this.pickMonsterY()
    const monster = new Monster(this._deps.screenW + 30, y, type, groundY)
    this._deps.onSpawnMonster(monster)
    Logger.info('Monster', '生成怪物', { type: type, x: monster.x, y: monster.y, gameTime: this._deps.getGameTime() })
  }

  /**
   * [v1.3.0] 选取怪物生成 y：避开前方管道间隙正中央（不堵死通路）。
   * 随机尝试 SPAWN_Y_ATTEMPTS 次，取第一个与所有将至管道间隙中心
   * 距离 >= SAFE_GAP_DIST 的候选；失败则用最后候选（概率极低）。
   * @returns {number}
   */
  pickMonsterY() {
    const M = Config.MONSTER
    const groundY = this._deps.screenH - Config.GROUND.HEIGHT
    const minY = Config.PIPE.MIN_TOP + M.MIN_Y_MARGIN
    const maxY = groundY - M.MIN_Y_MARGIN
    let y = (minY + maxY) / 2
    for (let attempt = 0; attempt < M.SPAWN_Y_ATTEMPTS; attempt++) {
      y = minY + Math.random() * (maxY - minY)
      let safe = true
      for (const pipe of this._deps.getPipes()) {
        // 只看即将到达小鸟的管道（屏幕右半部分之外的不参与避让）
        if (pipe.x + pipe.width < this._deps.screenW * 0.5) continue
        const gapCenter = pipe.topHeight + pipe.gap / 2
        if (Math.abs(y - gapCenter) < M.SAFE_GAP_DIST) { safe = false; break }
      }
      if (safe) break
    }
    return y
  }

  // ==================== 道具生成 ====================

  /** [v1.1.1] 随机道具生成（不依赖管道通过）：位置 roll + 类型 roll */
  spawnRandomItem() {
    const groundY = this._deps.screenH - Config.GROUND.HEIGHT
    const minY = Config.PIPE.MIN_TOP + 30
    const maxY = groundY - 30
    const itemY = minY + Math.random() * (maxY - minY)
    const itemX = this._deps.screenW + 20
    const itemType = this.rollItemType()
    this._deps.onSpawnItem(new Item(itemX, itemY, itemType))
  }

  /**
   * [v1.1.0] 过管道具掉落决策（25% 概率，小鸟前方生成）
   * 原 _onPipePass 内联块，随机数消耗顺序不变：chance → x 偏移 → y → 类型
   */
  maybeSpawnItemOnPipePass() {
    // [v1.1.0] 生成道具 [v1.1.3] 修复：在小鸟前方生成（右侧），不在后方（管道位置）
    if (Math.random() < Config.ITEM.SPAWN_CHANCE) {
      const itemX = this._deps.screenW + 20 + Math.random() * 40  // [v1.1.3] 前方生成
      const groundY = this._deps.screenH - Config.GROUND.HEIGHT
      const minY = Config.PIPE.MIN_TOP + 30
      const maxY = groundY - 30
      const itemY = minY + Math.random() * (maxY - minY)
      const itemType = this.rollItemType()
      this._deps.onSpawnItem(new Item(itemX, itemY, itemType))
    }
  }

  /** [v1.1.0] 道具类型权重随机 */
  rollItemType() {
    const weights = Config.ITEM.TYPE_WEIGHTS
    const types = Object.keys(weights)
    let total = 0
    for (const t of types) total += weights[t]

    let r = Math.random() * total
    for (const t of types) {
      r -= weights[t]
      if (r <= 0) return t
    }
    return types[0]
  }

  /**
   * [v1.4.0] 补给线（supply_line）：每 (75-15*(lv-1))s 保底生成 1 个随机道具
   * 保底计时与随机生成（itemSpawnTimer / 过管25%）完全独立；
   * 权重沿用 rollItemType（TYPE_WEIGHTS，不含导弹倾斜），防"保底导弹流"变最优解
   */
  updateSupplyLine() {
    const lv = this._deps.getOwnedLevel('supply_line')
    if (lv <= 0) return
    this.supplyLineTimer++
    const interval = (Config.ITEM.SUPPLY_LINE_BASE_SEC -
      Config.ITEM.SUPPLY_LINE_REDUCTION_SEC * (lv - 1)) * 60
    if (this.supplyLineTimer >= interval) {
      this.supplyLineTimer = 0
      this.spawnRandomItem()
      Logger.info('Item', '补给线保底道具', { lv: lv, intervalSec: interval / 60 })
    }
  }
}

module.exports = SpawnSystem
