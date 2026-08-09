/**
 * AbilityConfig.js - 能力数据配置 [v1.1.3]
 *
 * 共22个能力：被动8 + 主动7 + 特殊7
 * v1.1.0变更：提升15个旧能力等级上限 + 新增7个能力
 * v1.1.3变更：为每个能力添加稀有度(rarity)，用于升级选牌概率计算
 */

const ABILITY = require('./GameConfig.js').ABILITY

/**
 * @typedef {Object} AbilityDef
 * @property {string} id - 唯一标识
 * @property {string} name - 显示名称
 * @property {string} icon - 图标(emoji)
 * @property {string} desc - 简短描述
 * @property {string} category - 分类: passive | active | special
 * @property {string} rarity - 稀有度: common | uncommon | rare | epic [v1.1.3]
 * @property {number} maxLevel - 最大等级
 * @property {Function} effectText - (level) => 效果说明文本
 */

const Abilities = [
  // ==================== 被动强化类 (8) ====================
  {
    id: 'light_feather',
    name: '轻羽',
    icon: '🪶',
    desc: '降低重力',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'common',       // [v1.1.3]
    maxLevel: 5,
    effectText: (lv) => `重力 -${8 * lv}%`
  },
  {
    id: 'tailwind',
    name: '顺风',
    icon: '🌬️',
    desc: '提升上升力',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'common',       // [v1.1.3]
    maxLevel: 5,
    effectText: (lv) => `上升力 +${10 * lv}%`
  },
  {
    id: 'agile',
    name: '灵巧',
    icon: '✨',
    desc: '缩小碰撞箱',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'uncommon',     // [v1.1.3]
    maxLevel: 5,
    effectText: (lv) => `碰撞箱 -${12 * lv}%`
  },
  {
    id: 'magnet',
    name: '磁吸',
    icon: '🧲',
    desc: '扩大经验球/道具吸引范围',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'uncommon',     // [v1.1.3]
    maxLevel: 5,
    effectText: (lv) => `吸引范围 +${50 * lv}px`
  },
  {
    id: 'greed',
    name: '贪婪',
    icon: '💰',
    desc: '增加经验获取',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'uncommon',     // [v1.1.3]
    maxLevel: 5,
    effectText: (lv) => `经验获取 +${25 * lv}%`
  },
  {
    id: 'toughness',
    name: '坚韧',
    icon: '❤️',
    desc: '最大护盾+1/级，破盾后30s恢复',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'rare',          // [v1.1.3]
    maxLevel: 3,
    effectText: (lv) => `最大护盾+${lv}，30s恢复1层`
  },
  // [v1.1.0新增]
  {
    id: 'vitality',
    name: '活力之心',
    icon: '💗',
    desc: '提升最大HP',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'rare',          // [v1.1.3]
    maxLevel: 2,
    effectText: (lv) => `最大HP +${lv}（上限${2 + lv}）`
  },
  // [v1.1.0新增]
  {
    id: 'physique',
    name: '体魄',
    icon: '🫀',
    desc: '延长受击无敌时间',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'uncommon',     // [v1.1.3]
    maxLevel: 3,
    effectText: (lv) => `受击无敌 +${lv * 0.5}s`
  },

  // ==================== 主动技能类 (7) ====================
  {
    id: 'time_warp',
    name: '时间扭曲',
    icon: '⏳',
    desc: '即将碰撞时自动减速',
    category: ABILITY.CATEGORY.ACTIVE,
    rarity: 'rare',          // [v1.1.3]
    maxLevel: 5,
    effectText: (lv) => `减速50%，CD ${20 - 3 * (lv - 1)}s`
  },
  {
    id: 'teleport',
    name: '瞬移闪避',
    icon: '💫',
    desc: '即将碰撞时自动瞬移',
    category: ABILITY.CATEGORY.ACTIVE,
    rarity: 'epic',          // [v1.1.3]
    maxLevel: 3,
    effectText: (lv) => `瞬移至间隙，CD ${30 - 5 * (lv - 1)}s`
  },
  {
    id: 'shield_burst',
    name: '护盾爆发',
    icon: '🛡️',
    desc: '定期自动获得护盾层',
    category: ABILITY.CATEGORY.ACTIVE,
    rarity: 'uncommon',     // [v1.1.3]
    maxLevel: 5,
    effectText: (lv) => `每${25 - 3 * (lv - 1)}s获得1层护盾`
  },
  {
    id: 'phoenix',
    name: '凤凰之翼',
    icon: '🔥',
    desc: '死亡时原地复活',
    category: ABILITY.CATEGORY.ACTIVE,
    rarity: 'epic',          // [v1.1.3]
    maxLevel: 2,
    effectText: (lv) => `复活${lv}次，恢复满HP`
  },
  // [v1.1.0新增]
  {
    id: 'regeneration',
    name: '自愈',
    icon: '🌿',
    desc: '定期恢复HP',
    category: ABILITY.CATEGORY.ACTIVE,
    rarity: 'rare',          // [v1.1.3]
    maxLevel: 3,
    effectText: (lv) => `每${30 - 5 * (lv - 1)}s恢复1HP`
  },
  // [v1.1.0新增] [v1.1.2平衡调整] [v1.1.5改造为弹力护盾]
  {
    id: 'bounce_shield',
    name: '弹力护盾',
    icon: '🌀',
    desc: '最大护盾+1/级，碰撞弹开免伤',
    category: ABILITY.CATEGORY.ACTIVE,
    rarity: 'rare',          // [v1.1.3]
    maxLevel: 3,
    effectText: (lv) => `最大护盾+${lv}，${20 - 5 * (lv - 1)}s恢复1层，碰撞弹开`
  },
  // [v1.1.0新增]
  {
    id: 'double_jump',
    name: '二段跳',
    icon: '⏫',
    desc: '快速双击触发额外上升',
    category: ABILITY.CATEGORY.ACTIVE,
    rarity: 'uncommon',     // [v1.1.3]
    maxLevel: 2,
    effectText: (lv) => `二段跳，CD ${15 - 5 * (lv - 1)}s`
  },

  // ==================== 特殊机制类 (7) ====================
  {
    id: 'slow_world',
    name: '慢速世界',
    icon: '🐌',
    desc: '降低障碍物速度',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'uncommon',     // [v1.1.3]
    maxLevel: 5,
    effectText: (lv) => `障碍速度 -${10 * lv}%`
  },
  {
    id: 'double_score',
    name: '双倍积分',
    icon: '📊',
    desc: '通过管道得分翻倍',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'uncommon',     // [v1.1.3]
    maxLevel: 5,
    effectText: (lv) => `管道得分 ×${1 + lv}`
  },
  {
    id: 'lucky',
    name: '幸运光环',
    icon: '🍀',
    desc: '升级时增加能力选项',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'rare',          // [v1.1.3]
    maxLevel: 3,
    effectText: (lv) => `升级选项 +${lv}（共${3 + lv}选1）`
  },
  {
    id: 'combo_heart',
    name: '连击之心',
    icon: '⚡',
    desc: '连续通过管道获得无敌',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'uncommon',     // [v1.1.3]
    maxLevel: 3,
    effectText: (lv) => {
      const threshold = Math.max(2, 5 - lv)
      return `连过${threshold}管道，3s无敌`
    }
  },
  {
    id: 'shrink_ray',
    name: '缩小射线',
    icon: '📐',
    desc: '扩大障碍物间隙',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'uncommon',     // [v1.1.3]
    maxLevel: 5,
    effectText: (lv) => `管道间隙 +${20 * lv}px`
  },
  // [v1.1.0新增]
  {
    id: 'exp_resonance',
    name: '经验共鸣',
    icon: '🔮',
    desc: '获得经验时概率双倍',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'rare',          // [v1.1.3]
    maxLevel: 3,
    effectText: (lv) => `${20 * lv}%概率获得双倍经验`
  },
  // [v1.1.0新增]
  {
    id: 'berserk',
    name: '狂暴',
    icon: '😤',
    desc: 'HP为1时全属性提升',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'epic',          // [v1.1.3]
    maxLevel: 3,
    effectText: (lv) => `HP=1时，全属性 +${25 * lv}%`
  }
]

module.exports = Abilities
