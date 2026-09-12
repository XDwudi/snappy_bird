/**
 * AbilityConfig.js - 能力数据配置 [v1.4.0]
 *
 * 共41个能力：28(旧) + 13([v1.4.0]批次1：common×6 + uncommon×7)
 * v1.1.0变更：提升15个旧能力等级上限 + 新增7个能力
 * v1.1.3变更：为每个能力添加稀有度(rarity)
 * v1.2.0变更：新增6个环境相关能力
 * v1.4.0变更：批次1新增13卡（求生本能/锐利目光/拾荒者/补给线/连击种子/管感/
 *             导弹挂架/铁喙/经验银行/定风珠/镜面护盾/经验潮汐/羽舞），
 *             effectText 与开发方案_v1.4.0 §2.1/§2.2 逐卡一致；rare/epic 为批次2
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
    // [v1.2.2] N3 幅度减半：-8%→-5%/级（陷阱卡不再主动有害）
    effectText: (lv) => `重力 -${5 * lv}%`
  },
  {
    id: 'tailwind',
    name: '顺风',
    icon: '🌬️',
    desc: '提升上升力',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'common',       // [v1.1.3]
    maxLevel: 5,
    // [v1.2.2] N3 幅度减半：+10%→+6%/级（陷阱卡不再主动有害）
    effectText: (lv) => `上升力 +${6 * lv}%`
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
    // [v1.2.2] N8 文案修正：经验球自v1.1.4不再生成，去掉误导描述
    desc: '扩大道具吸引范围',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'uncommon',     // [v1.1.3]
    maxLevel: 5,
    effectText: (lv) => `道具吸引范围 +${50 * lv}px`
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
  // [v1.2.0新增] 环境相关被动能力
  {
    id: 'wind_reader',
    name: '顺风耳',
    icon: '👂',
    desc: '风力影响减弱',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'common',
    maxLevel: 3,
    effectText: (lv) => `风力影响 -${30 * lv}%`
  },
  {
    id: 'raincoat',
    name: '雨衣',
    icon: '🧥',
    desc: '雨水积累速度降低',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'uncommon',
    maxLevel: 3,
    effectText: (lv) => `雨水积累 -${40 * lv}%`
  },
  {
    id: 'wind_rider',
    name: '御风者',
    icon: '🪁',
    desc: '风力转化为助推力',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'rare',
    maxLevel: 3,
    effectText: (lv) => `风力变助推 +${50 * lv}%`
  },
  {
    id: 'climate_adapt',
    name: '气候适应',
    icon: '🌡️',
    desc: '缩短环境效果持续时间',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'rare',
    maxLevel: 3,
    effectText: (lv) => `环境持续时间 -${15 * lv}%`
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
    // [v1.2.1] 文案修正：升级会重置已用次数，实际为"每级复活次数+1"（Lv2一局最多复活3次）
    effectText: (lv) => `复活次数 +1/级，恢复满HP`
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
  // [v1.2.0新增] 冰晶护体
  {
    id: 'ice_crystal',
    name: '冰晶护体',
    icon: '❄️',
    desc: '冰雹击中时获得护盾',
    category: ABILITY.CATEGORY.ACTIVE,
    rarity: 'rare',
    maxLevel: 3,
    effectText: (lv) => `冰雹转为护盾，CD ${20 - 3 * (lv - 1)}s`
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
  },
  // [v1.2.0新增] 风暴之子
  {
    id: 'storm_child',
    name: '风暴之子',
    icon: '🌩️',
    desc: '环境效果期间全属性提升',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'epic',
    maxLevel: 3,
    effectText: (lv) => `环境期间全属性 +${20 * lv}%`
  },

  // ==================== [v1.4.0] 能力扩展包·批次1：common ×6 ====================
  // C1 求生本能：HP=1 低保卡，走统一 addShieldLayer 上限钳制（§2.6：HP扣减后→补盾→凤凰）
  {
    id: 'survivor_instinct',
    name: '求生本能',
    icon: '🐣',
    desc: 'HP=1时获得护盾',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'common',
    maxLevel: 2,
    effectText: (lv) => `HP=1时获得1层护盾（每局${lv}次）`
  },
  // C2 锐利目光：擦边流 common 入口，只改判定不改手感（与灵巧乘算，0.3 下限钳制）
  {
    id: 'edge_focus',
    name: '锐利目光',
    icon: '👁️',
    desc: '擦边后缩小碰撞箱',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'common',
    maxLevel: 3,
    effectText: (lv) => `擦边后60帧碰撞箱-${15 * lv}%`
  },
  // C3 拾荒者：怪物资源化，击杀掉落权重沿用 ITEM.TYPE_WEIGHTS
  {
    id: 'scavenger',
    name: '拾荒者',
    icon: '🧺',
    desc: '击杀怪物掉道具',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'common',
    maxLevel: 3,
    effectText: (lv) => `击杀怪物${20 * lv}%掉随机道具`
  },
  // C4 补给线：道具荒救济，保底计时与随机生成独立，权重不倾斜导弹
  {
    id: 'supply_line',
    name: '补给线',
    icon: '📦',
    desc: '定期保底生成道具',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'common',
    maxLevel: 2,
    effectText: (lv) => `每${75 - 15 * (lv - 1)}s保底生成1个随机道具`
  },
  // C5 连击种子：连击流容错卡，硬刹车=保留层数 ≤ 无敌阈值-1
  {
    id: 'combo_seed',
    name: '连击种子',
    icon: '🌱',
    desc: '断连击保留层数',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'common',
    maxLevel: 3,
    effectText: (lv) => `断连击时保留${lv}层（不超过无敌阈值-1）`
  },
  // C6 管感：纯信息卡零数值，高亮 alpha ≤0.35，Lv2 安全区 ±30px 固定
  {
    id: 'pipe_sense',
    name: '管感',
    icon: '🧭',
    desc: '高亮下一根管道',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'common',
    maxLevel: 2,
    effectText: (lv) => `高亮下一根管道间隙${lv === 1 ? '轮廓' : '轮廓+安全区'}`
  },

  // ==================== [v1.4.0] 能力扩展包·批次1：uncommon ×7 ====================
  // U1 导弹挂架：MAX_ALIVE 先与等级挂钩（3+lv）再做扇形多发，否则满级卡无效
  {
    id: 'missile_rack',
    name: '导弹挂架',
    icon: '🎒',
    desc: '导弹扇形多发',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'uncommon',
    maxLevel: 3,
    effectText: (lv) => `每次发射导弹+${lv}枚（扇形）`
  },
  // U2 铁喙：无敌帧从防御窗口变进攻窗口，对 Boss 免疫（isBoss 分支预留）
  {
    id: 'iron_beak',
    name: '铁喙',
    icon: '🦅',
    desc: '无敌期撞怪反杀',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'uncommon',
    maxLevel: 2,
    effectText: (lv) => `无敌期碰撞怪物：反杀且免伤（伤害${lv}）`
  },
  // U3 经验银行：双刹车（上限=升级所需×2、升级时全额转入）；生息对齐天气 10s 检查节奏
  {
    id: 'exp_bank',
    name: '经验银行',
    icon: '🏦',
    desc: '溢出经验存入银行生息',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'uncommon',
    maxLevel: 3,
    effectText: (lv) => `溢出经验入银行，每10s生息${5 * lv}%`
  },
  // U4 定风珠：只免疫负面 debuff（增益保留），免疫判定在 debuff 应用点
  {
    id: 'steady_charm',
    name: '定风珠',
    icon: '⚓',
    desc: '天气过渡期免疫debuff',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'uncommon',
    maxLevel: 2,
    effectText: (lv) => `天气开始/结束${3 + 3 * lv}s内免疫其debuff`
  },
  // U5 镜面护盾：破盾反打，每 3s 最多触发 1 次（防刷波回路），对 Boss 无效
  {
    id: 'mirror_shield',
    name: '镜面护盾',
    icon: '🪞',
    desc: '破盾触发冲击波',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'uncommon',
    maxLevel: 2,
    effectText: (lv) => `护盾被击破时冲击波：${100 + 40 * (lv - 1)}px内怪物受1伤害`
  },
  // U6 经验潮汐：只加经验不加战力（与风暴之子错位），天气结束提示"潮汐退去"
  {
    id: 'exp_tide',
    name: '经验潮汐',
    icon: '🌊',
    desc: '天气期间经验加成',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'uncommon',
    maxLevel: 3,
    effectText: (lv) => `天气期间经验获取+${25 * lv}%`
  },
  // U7 羽舞：二段跳接入擦边流，不改二段跳位移参数，buff 期尾迹金色
  {
    id: 'feather_dance',
    name: '羽舞',
    icon: '💃',
    desc: '二段跳后擦边窗口扩大',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'uncommon',
    maxLevel: 3,
    effectText: (lv) => `二段跳后3s内擦边窗口+${8 * lv}px`
  }
]

module.exports = Abilities
