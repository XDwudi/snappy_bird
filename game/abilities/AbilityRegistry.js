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

class AbilityRegistry {
  constructor() {
    // 构建 id → definition 的查找表
    this.abilityMap = {}
    for (const ab of Abilities) {
      this.abilityMap[ab.id] = ab
    }
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
      return candidates.map(c => c.ability)
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

    return result
  }
}

// 导出单例
module.exports = new AbilityRegistry()
