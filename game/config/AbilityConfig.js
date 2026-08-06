/**
 * AbilityConfig.js - 能力数据配置
 *
 * 定义全部15个能力的静态数据：名称、图标、描述、分类、最大等级、效果文本。
 * 实际数值效果在 AbilitySystem.getStats() 中计算。
 */

const ABILITY = require('./GameConfig.js').ABILITY

/**
 * @typedef {Object} AbilityDef
 * @property {string} id - 唯一标识
 * @property {string} name - 显示名称
 * @property {string} icon - 图标(emoji)
 * @property {string} desc - 简短描述
 * @property {string} category - 分类: passive | active | special
 * @property {number} maxLevel - 最大等级
 * @property {Function} effectText - (level) => 效果说明文本
 */

const Abilities = [
  // ==================== 被动强化类 (6) ====================
  {
    id: 'light_feather',
    name: '轻羽',
    icon: '🪶',
    desc: '降低重力',
    category: ABILITY.CATEGORY.PASSIVE,
    maxLevel: 3,
    effectText: (lv) => `重力 -${8 * lv}%`
  },
  {
    id: 'tailwind',
    name: '顺风',
    icon: '🌬️',
    desc: '提升上升力',
    category: ABILITY.CATEGORY.PASSIVE,
    maxLevel: 3,
    effectText: (lv) => `上升力 +${10 * lv}%`
  },
  {
    id: 'agile',
    name: '灵巧',
    icon: '✨',
    desc: '缩小碰撞箱',
    category: ABILITY.CATEGORY.PASSIVE,
    maxLevel: 3,
    effectText: (lv) => `碰撞箱 -${12 * lv}%`
  },
  {
    id: 'magnet',
    name: '磁吸',
    icon: '🧲',
    desc: '扩大经验球吸引范围',
    category: ABILITY.CATEGORY.PASSIVE,
    maxLevel: 3,
    effectText: (lv) => `吸引范围 +${50 * lv}px`
  },
  {
    id: 'greed',
    name: '贪婪',
    icon: '💰',
    desc: '增加经验获取',
    category: ABILITY.CATEGORY.PASSIVE,
    maxLevel: 3,
    effectText: (lv) => `经验获取 +${25 * lv}%`
  },
  {
    id: 'toughness',
    name: '坚韧',
    icon: '❤️',
    desc: '获得护盾，破盾后恢复',
    category: ABILITY.CATEGORY.PASSIVE,
    maxLevel: 2,
    effectText: (lv) => `护盾 ${lv}层，30s恢复`
  },

  // ==================== 主动技能类 (4) ====================
  {
    id: 'time_warp',
    name: '时间扭曲',
    icon: '⏳',
    desc: '即将碰撞时自动减速',
    category: ABILITY.CATEGORY.ACTIVE,
    maxLevel: 3,
    effectText: (lv) => `减速50%，CD ${20 - 3 * (lv - 1)}s`
  },
  {
    id: 'teleport',
    name: '瞬移闪避',
    icon: '💫',
    desc: '即将碰撞时自动瞬移',
    category: ABILITY.CATEGORY.ACTIVE,
    maxLevel: 2,
    effectText: (lv) => `瞬移至间隙，CD ${30 - 5 * (lv - 1)}s`
  },
  {
    id: 'shield_burst',
    name: '护盾爆发',
    icon: '🛡️',
    desc: '定期自动获得护盾',
    category: ABILITY.CATEGORY.ACTIVE,
    maxLevel: 3,
    effectText: (lv) => `每${25 - 3 * (lv - 1)}s获得1层护盾`
  },
  {
    id: 'phoenix',
    name: '凤凰之翼',
    icon: '🔥',
    desc: '死亡时原地复活',
    category: ABILITY.CATEGORY.ACTIVE,
    maxLevel: 1,
    effectText: () => `复活1次，保留所有能力`
  },

  // ==================== 特殊机制类 (5) ====================
  {
    id: 'slow_world',
    name: '慢速世界',
    icon: '🐌',
    desc: '降低障碍物速度',
    category: ABILITY.CATEGORY.SPECIAL,
    maxLevel: 3,
    effectText: (lv) => `障碍速度 -${10 * lv}%`
  },
  {
    id: 'double_score',
    name: '双倍积分',
    icon: '📊',
    desc: '通过管道得分翻倍',
    category: ABILITY.CATEGORY.SPECIAL,
    maxLevel: 3,
    effectText: (lv) => `管道得分 ×${1 + lv}`
  },
  {
    id: 'lucky',
    name: '幸运光环',
    icon: '🍀',
    desc: '升级时增加能力选项',
    category: ABILITY.CATEGORY.SPECIAL,
    maxLevel: 2,
    effectText: (lv) => `升级选项 +${lv}（共${3 + lv}选1）`
  },
  {
    id: 'combo_heart',
    name: '连击之心',
    icon: '⚡',
    desc: '连续通过管道获得无敌',
    category: ABILITY.CATEGORY.SPECIAL,
    maxLevel: 2,
    effectText: (lv) => `连过${5 - 2 * (lv - 1)}管道，5s无敌`
  },
  {
    id: 'shrink_ray',
    name: '缩小射线',
    icon: '📐',
    desc: '扩大障碍物间隙',
    category: ABILITY.CATEGORY.SPECIAL,
    maxLevel: 3,
    effectText: (lv) => `管道间隙 +${15 * lv}px`
  }
]

module.exports = Abilities
