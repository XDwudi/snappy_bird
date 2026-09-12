/**
 * AbilityConfig.js - 能力数据配置 [v1.4.0]
 *
 * 共61个能力：28(旧) + 27([v1.4.0]：批次1 common×6+uncommon×7，批次2 rare×8+epic×6)
 *             + 6([v1.5.0] 章节联动卡：common×1+uncommon×2+rare×2+epic×1)
 * v1.1.0变更：提升15个旧能力等级上限 + 新增7个能力
 * v1.1.3变更：为每个能力添加稀有度(rarity)
 * v1.2.0变更：新增6个环境相关能力
 * v1.4.0变更：批次1新增13卡（求生本能/锐利目光/拾荒者/补给线/连击种子/管感/
 *             导弹挂架/铁喙/经验银行/定风珠/镜面护盾/经验潮汐/羽舞）；
 *             批次2新增14卡（火力覆盖/超载神盾/猎手标记/回响之翼/风暴之眼/蜂群链路/铁羽/先知/
 *             导弹风暴/风暴驯化/血契/幻影舞步/顿悟/时之晶）+ 旧卡质变补丁
 *             （连击之心Lv3/缩小射线Lv5/幸运光环Lv3）+ 凤凰文案对齐血契语义；
 *             effectText 与开发方案_v1.4.0 §2.3/§2.4/§2.5 逐卡一致
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
    // [v1.4.0] 血契语义同步：复活=HP回满"当前上限"（血契降低上限后不回满旧上限）
    effectText: (lv) => `复活次数 +1/级，HP回满当前上限`
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
    // [v1.4.0] Lv3 质变：每次升级面板必含 1 张稀有及以上（与 N9 软保底同向不冲突，见 Registry/Game 注释）
    effectText: (lv) => lv >= 3
      ? `升级选项 +${lv}（共${3 + lv}选1），必含1张稀有及以上`
      : `升级选项 +${lv}（共${3 + lv}选1）`
  },
  {
    id: 'combo_heart',
    name: '连击之心',
    icon: '⚡',
    desc: '连续通过管道获得无敌',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'uncommon',     // [v1.1.3]
    maxLevel: 3,
    // [v1.4.0] Lv3 质变：无敌期间每过 1 管 +5exp（不延长无敌，奖励改经验不碰生存边）
    effectText: (lv) => {
      const threshold = Math.max(2, 5 - lv)
      return lv >= 3 ? `连过${threshold}管道，3s无敌；无敌期每过1管+5exp` : `连过${threshold}管道，3s无敌`
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
    // [v1.4.0] Lv5 质变：间隙不再扩大（+100px 已触及挑战下限），改为擦边判定窗口 +10px
    effectText: (lv) => lv >= 5 ? `管道间隙 +80px，擦边窗口 +10px` : `管道间隙 +${20 * lv}px`
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
  },

  // ==================== [v1.4.0] 能力扩展包·批次2：rare ×8 ====================
  // R1 火力覆盖：猎杀火力流核心引擎；自动导弹用独立枪口闪光，不得用道具拾取特效
  {
    id: 'missile_barrage',
    name: '火力覆盖',
    icon: '🚀',
    desc: '定时自动发射导弹',
    category: ABILITY.CATEGORY.ACTIVE,
    rarity: 'rare',
    maxLevel: 3,
    effectText: (lv) => `每${14 - 2 * (lv - 1)}s自动发射1枚导弹`
  },
  // R2 超载神盾：满级质变卡——Lv1-2 护盾恢复CD缩短（Lv3 保留-30%不叠加），
  // Lv3 满层溢出护盾转临时HP（上限+2，HUD 空心心形）；§2.6 受击链登记：溢出转HP在HP扣减前
  {
    id: 'aegis_overdrive',
    name: '超载神盾',
    icon: '💠',
    desc: '护盾恢复加速，满级溢出转HP',
    category: ABILITY.CATEGORY.ACTIVE,
    rarity: 'rare',
    maxLevel: 3,
    effectText: (lv) => lv >= 3
      ? '护盾满层时新护盾转+1临时HP(上限+2)'
      : `护盾恢复CD-${15 * lv}%`
  },
  // R3 猎手标记：导弹弹头端；连锁爆炸击杀不再触发二次连锁（防指数回路硬规则）
  {
    id: 'hunter_mark',
    name: '猎手标记',
    icon: '🎯',
    desc: '导弹加伤+击杀连锁爆炸',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'rare',
    maxLevel: 2,
    effectText: (lv) => `导弹伤害+${lv}，击杀连锁爆炸${50 + 10 * lv}px`
  },
  // R4 回响之翼：稳定过管兑换生存资源；羽盾上限1层（铁羽可+1，全局硬顶2层）；受击链最前置
  {
    id: 'echo_wing',
    name: '回响之翼',
    icon: '🪶',
    desc: '过管积攒羽盾',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'rare',
    maxLevel: 3,
    effectText: (lv) => `每过${9 - 2 * (lv - 1)}管存1层羽盾(挡1次伤)`
  },
  // R5 风暴之眼：天气并发奖励卡；单天气零收益（与经验潮汐错位），240s前基本白板——后期卡
  {
    id: 'eye_of_storm',
    name: '风暴之眼',
    icon: '🌀',
    desc: '多重天气时增益（后期卡）',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'rare',
    maxLevel: 2,
    effectText: (lv) => `天气并发≥2种时：debuff-${20 * lv}%，经验×${1 + 0.5 * lv}`
  },
  // R6 蜂群链路：导弹节奏卡；叠层上限 1+lv 硬封顶（防指数回路）；与屠龙者加算（v1.5.0）
  {
    id: 'missile_link',
    name: '蜂群链路',
    icon: '🐝',
    desc: '导弹命中后下一发加伤',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'rare',
    maxLevel: 2,
    effectText: (lv) => `导弹命中后1.5s内下一枚伤害+1（可叠${1 + lv}层）`
  },
  // R7 铁羽：回响之翼专属放大器；无回响之翼时不生效（选牌 UI 灰显）；组合上限2层为全局硬顶
  {
    id: 'iron_feather',
    name: '铁羽',
    icon: '🪶',
    desc: '羽盾上限+1，破盾给无敌（需回响之翼）',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'rare',
    maxLevel: 2,
    effectText: (lv) => `羽盾上限+1，羽盾破裂时${30 * lv}帧无敌`
  },
  // R8 先知：纯信息卡零数值；标签表在 GameConfig.ABILITY.ORACLE_*（必须与代码结算一致）；只标注不推荐
  {
    id: 'oracle',
    name: '先知',
    icon: '🔮',
    desc: '升级面板标注协同度',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'rare',
    maxLevel: 1,
    effectText: (lv) => '升级面板标注每张卡与当前构筑的协同度'
  },

  // ==================== [v1.4.0] 能力扩展包·批次2：epic ×6 ====================
  // E1 导弹风暴：导弹系史诗顶点；期间再拾取刷新时长（不叠加）；同屏 MAX_ALIVE 硬刹车
  {
    id: 'missile_storm',
    name: '导弹风暴',
    icon: '🌪️',
    desc: '拾取导弹变连发',
    category: ABILITY.CATEGORY.ACTIVE,
    rarity: 'epic',
    maxLevel: 2,
    effectText: (lv) => `拾取导弹变${4 + lv}s连发(每秒2枚)`
  },
  // E2 风暴驯化：天气流史诗顶点；驯化对象按获得时天气决定（无天气则下一种），不给挑；
  // 驯化后对应天气卡作废——抽卡 UI 加"已驯化"互斥标记（D7）
  {
    id: 'chaos_dice',
    name: '风暴驯化',
    icon: '🌈',
    desc: '驯化一种天气变成资产',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'epic',
    maxLevel: 1,
    effectText: (lv) => '获得时驯化当前天气：风变助推/雨变轻盈/冰雹掉exp不伤人'
  },
  // E3 血契：自残高收益卡；持血契时狂暴增益减半（写死保险丝）；凤凰复活=回满当前上限
  {
    id: 'blood_pact',
    name: '血契',
    icon: '🩸',
    desc: '最大HP-1换高额增益',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'epic',
    maxLevel: 2,
    effectText: (lv) => `最大HP-1，得分/经验+${30 * lv}%，受击无敌+${lv}s`
  },
  // E4 幻影舞步：擦边流史诗顶点；窗内擦边只刷新窗口、不叠加倍率（防指数回路）；窗口期金色残影
  {
    id: 'phantom_edge',
    name: '幻影舞步',
    icon: '✨',
    desc: '擦边开黄金连段窗',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'epic',
    maxLevel: 2,
    effectText: (lv) => `擦边后90帧内：下次擦边窗口×2、经验×${2 + lv}`
  },
  // E5 顿悟：经验流史诗顶点；每局限3次硬刹车；双面板连弹由既有 B2 保护覆盖（关板45帧无敌）
  {
    id: 'enlightenment',
    name: '顿悟',
    icon: '💡',
    desc: '憋经验一次升2级',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'epic',
    maxLevel: 1,
    effectText: (lv) => '经验达升级所需200%时一次升2级（每局限3次）'
  },
  // E6 时之晶：寄生时间扭曲同一触发点（同CD同源，不独立计时，规避N4遮蔽）；
  // 未持时间扭曲时无效，选牌 UI 灰显（先知会标🔗）
  {
    id: 'time_crystal',
    name: '时之晶',
    icon: '⏳',
    desc: '时间扭曲时冻结怪物（需时间扭曲）',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'epic',
    maxLevel: 2,
    effectText: (lv) => `时间扭曲触发时：怪物/弹幕冻结${1 + 0.5 * (lv - 1)}s（鸟可动）`
  },

  // ==================== [v1.5.0] 章节联动卡 ×6（§2.1-C7/§2.2-U8/U9/§2.3-R9/R10/§2.4-E7，池 55→61） ====================

  // C7 坚韧外皮：Boss 时代 common 对策卡；格挡先于护盾结算（§2.6 受击链最前置），
  // 对管道无效写进 desc；格挡成功白色弹开粒子（与护盾蓝色区分）
  {
    id: 'thick_skin',
    name: '坚韧外皮',
    icon: '🦬',
    desc: '概率格挡怪物/弹幕伤害（对管道无效）',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'common',
    maxLevel: 2,
    effectText: (lv) => `怪物/弹幕伤害${30 * lv}%概率格挡（对管道无效）`
  },
  // U8 屠龙者：Boss 战专精卡；与猎手标记加算（非乘算）；平时零收益写明"对Boss生效"
  {
    id: 'boss_slayer',
    name: '屠龙者',
    icon: '🗡️',
    desc: 'Boss战专精（对普通怪物无效）',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'uncommon',
    maxLevel: 2,
    effectText: (lv) => `导弹对Boss伤害+${lv}，Boss战受击无敌+${0.5 * lv}s`
  },
  // U9 旅者：章节"进站补给"；只在换章瞬间生效，第 2 章起生效（Ch1 零收益写明）
  {
    id: 'nomad',
    name: '旅者',
    icon: '🎒',
    desc: '进入新章节获得补给（第2章起生效）',
    category: ABILITY.CATEGORY.PASSIVE,
    rarity: 'uncommon',
    maxLevel: 2,
    effectText: (lv) => `进入新章节：+${lv}层护盾、+${20 * lv}exp`
  },
  // R9 章节回响：每章开局一次"哪张卡被回响"的小惊喜；临时等级不超 maxLevel
  // （满级重随机≤3次）；本章结束浮动文字"回响消散"（非永久获得）
  {
    id: 'chapter_echo',
    name: '章节回响',
    icon: '📯',
    desc: '进新章随机已持卡临时升级（本章有效）',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'rare',
    maxLevel: 2,
    effectText: (lv) => `进入新章节：随机1张已持卡临时+${lv}级（本章有效）`
  },
  // R10 战利品陈列：Boss 击杀复利卡，按已击败数线性叠乘（4 章封顶 4 层）；
  // 第一章未过 Boss 前零收益写明；与大礼包错位——礼包是定额，陈列是比率
  {
    id: 'trophy_wall',
    name: '战利品陈列',
    icon: '🏆',
    desc: '每个已击败Boss提供永久增益（未击败前零收益）',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'rare',
    maxLevel: 2,
    effectText: (lv) => `每个已击败Boss：经验+${15 * lv}%、道具率+${5 * lv}pp（本局永久）`
  },
  // E7 章节之主：章节流派史诗顶点；"必含史诗"与 N9 软保底不叠加——消耗当次软保底计数
  {
    id: 'chapter_master',
    name: '章节之主',
    icon: '👑',
    desc: '章节祝福增幅+面板史诗保底',
    category: ABILITY.CATEGORY.SPECIAL,
    rarity: 'epic',
    maxLevel: 1,
    effectText: (lv) => '章节祝福效果+50%；每章首次升级面板必含1张史诗'
  }
]

module.exports = Abilities
