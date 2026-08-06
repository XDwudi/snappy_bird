/**
 * AbilityRegistry.js - 能力注册表
 *
 * 职责：管理全部能力定义，提供加权随机抽取（未拥有权重 > 已拥有可升级）。
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
   * 加权随机抽取可选能力
   * @param {Map} owned - 当前已拥有的能力 Map<id, level>
   * @param {number} count - 抽取数量
   * @returns {Object[]} 被选中的能力定义数组
   */
  rollChoices(owned, count) {
    const candidates = []

    for (const ab of Abilities) {
      const currentLevel = owned.get(ab.id) || 0
      // 已满级的能力不参与抽取
      if (currentLevel >= ab.maxLevel) continue

      const isNew = currentLevel === 0
      const weight = isNew ? Config.ABILITY.WEIGHT_NEW : Config.ABILITY.WEIGHT_OWNED

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
