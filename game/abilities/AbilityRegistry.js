/**
 * AbilityRegistry.js - 能力注册表 [v1.1.3]
 *
 * 职责：管理全部能力定义，提供稀有度加权随机抽取。
 * [v1.1.3] 新增稀有度概率系统：
 *   - 越稀有的能力基础权重越低（普通10 > 稀有6 > 珍贵3 > 史诗1.5）
 *   - 稀有能力的权重随玩家等级增长（levelBonus系数），但有上限
 *   - 未拥有的新能力有额外权重加成
 */

const Abilities = require('../config/AbilityConfig.js')
const Config = require('../config/GameConfig.js')
const Logger = require('../systems/GameLogger.js')

class AbilityRegistry {
  constructor() {
    // 构建 id → definition 的查找表
    this.abilityMap = {}
    for (const ab of Abilities) {
      this.abilityMap[ab.id] = ab
    }
    // [v1.2.2] N9 软保底：连续无稀有及以上卡的升级面板计数
    this._noRareStreak = 0
  }

  /**
   * [v1.2.2] N9 新局开始时重置软保底计数（由AbilitySystem.reset调用）
   */
  resetPity() {
    this._noRareStreak = 0
  }

  /**
   * 获取能力定义
   * @param {string} id
   * @returns {Object|null}
   */
  get(id) {
    return this.abilityMap[id] || null
  }

  /**
   * 获取全部能力
   * @returns {Object[]}
   */
  getAll() {
    return Abilities
  }

  /**
   * [v1.1.3] 计算能力的抽取权重
   * 公式：baseWeight × (1 + levelBonus × (playerLevel - 1) / 10) × newBonus
   * - baseWeight 由稀有度决定
   * - levelBonus 越稀有越大，使稀有能力随等级提高出现率
   * - 结果不超过 maxWeight
   * - 新能力（currentLevel=0）额外乘以 NEW_ABILITY_BONUS
   * @param {Object} ability - 能力定义
   * @param {number} currentLevel - 当前等级（0=未拥有）
   * @param {number} playerLevel - 玩家当前等级
   * @returns {number} 权重值
   */
  getWeight(ability, currentLevel, playerLevel) {
    const rarityKey = (ability.rarity || 'common').toUpperCase()
    const rarity = Config.RARITY[rarityKey] || Config.RARITY.COMMON

    // 基础权重 × 等级增长系数
    const levelFactor = 1 + rarity.levelBonus * Math.max(0, playerLevel - 1) / 10
    let weight = rarity.baseWeight * levelFactor

    // 上限钳制
    weight = Math.min(weight, rarity.maxWeight)

    // 新能力额外加成
    if (currentLevel === 0) {
      weight *= Config.ABILITY.NEW_ABILITY_BONUS
    }

    return weight
  }

  /**
   * [v1.1.3] 稀有度加权随机抽取可选能力
   * @param {Map} owned - 当前已拥有的能力 Map<id, level>
   * @param {number} count - 抽取数量
   * @param {number} playerLevel - 玩家当前等级（影响稀有度权重）
   * @returns {Object[]} 被选中的能力定义数组
   */
  rollChoices(owned, count, playerLevel) {
    const candidates = []

    for (const ab of Abilities) {
      const currentLevel = owned.get(ab.id) || 0
      // 已满级的能力不参与抽取
      if (currentLevel >= ab.maxLevel) continue

      const weight = this.getWeight(ab, currentLevel, playerLevel)
      candidates.push({ ability: ab, weight })
    }

    // 不足指定数量时返回全部
    if (candidates.length <= count) {
      const all = candidates.map(c => c.ability)
      this._applyPity(all, candidates)
      return all
    }

    // 加权随机不放回抽取
    const result = []
    const pool = [...candidates]

    for (let i = 0; i < count && pool.length > 0; i++) {
      const totalWeight = pool.reduce((sum, c) => sum + c.weight, 0)
      let r = Math.random() * totalWeight

      let pickedIndex = 0
      for (let j = 0; j < pool.length; j++) {
        r -= pool[j].weight
        if (r <= 0) {
          pickedIndex = j
          break
        }
      }

      result.push(pool[pickedIndex].ability)
      pool.splice(pickedIndex, 1)
    }

    // [v1.2.2] N9 软保底检查
    this._applyPity(result, candidates)

    return result
  }

  /**
   * [v1.2.2] N9 非酋软保底：连续 PITY_THRESHOLD 次升级面板无稀有及以上卡时，
   * 下一面板保底替换 1 张为稀有+（uncommon/rare/epic）候选；
   * 面板含稀有+时计数清零。无可保底候选（稀有+全满级）时继续计数。
   * @param {Object[]} result - 已抽取结果（原地修改）
   * @param {Object[]} candidates - 全部候选 [{ability, weight}]
   */
  _applyPity(result, candidates) {
    const isRarePlus = (ab) => (ab.rarity || 'common') !== 'common'
    const hasRarePlus = result.some(isRarePlus)

    if (hasRarePlus) {
      this._noRareStreak = 0
      return
    }

    if (this._noRareStreak >= Config.ABILITY.PITY_THRESHOLD && result.length > 0) {
      // 保底触发：从稀有+候选中随机选1张替换掉结果中的1张
      const resultIds = {}
      for (const ab of result) resultIds[ab.id] = true
      const rarePool = candidates.filter(c => isRarePlus(c.ability) && !resultIds[c.ability.id])

      if (rarePool.length > 0) {
        const picked = rarePool[Math.floor(Math.random() * rarePool.length)].ability
        const slot = Math.floor(Math.random() * result.length)
        result[slot] = picked
        Logger.info('Ability', '软保底触发', { streak: this._noRareStreak, guaranteed: picked.id })
        this._noRareStreak = 0
        return
      }
      // 无稀有+候选可保底（全满级），继续累计
    }

    this._noRareStreak++
  }
  /**
   * [v1.4.0] 幸运光环 Lv3 质变：从稀有及以上候选中按权重抽 1 张（供 AbilitySystem.getChoices 保底替换）
   * 不影响 N9 软保底计数（_noRareStreak 已在 rollChoices 内结算；两机制同向不冲突）
   * @param {Map} owned
   * @param {string[]} excludeIds - 已在面板中的卡（避免重复）
   * @param {number} playerLevel
   * @returns {Object|null} 能力定义或 null（无候选）
   */
  rollRarePlus(owned, excludeIds, playerLevel) {
    const excluded = {}
    for (const id of excludeIds) excluded[id] = true
    const pool = []
    for (const ab of Abilities) {
      if ((ab.rarity || 'common') === 'common') continue
      if (excluded[ab.id]) continue
      const currentLevel = owned.get(ab.id) || 0
      if (currentLevel >= ab.maxLevel) continue
      pool.push({ ability: ab, weight: this.getWeight(ab, currentLevel, playerLevel) })
    }
    if (pool.length === 0) return null
    const totalWeight = pool.reduce((sum, c) => sum + c.weight, 0)
    let r = Math.random() * totalWeight
    for (const c of pool) {
      r -= c.weight
      if (r <= 0) return c.ability
    }
    return pool[pool.length - 1].ability
  }
}

// 导出单例
module.exports = new AbilityRegistry()
