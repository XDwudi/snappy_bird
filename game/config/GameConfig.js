/**
 * GameConfig.js - 全局游戏参数配置
 * 
 * 所有可调参数集中管理，策划调参只需修改此文件。
 * 数值单位均为「每帧」（假设60fps），与开发方案一致。
 */

module.exports = {
  // ==================== 小鸟参数 ====================
  BIRD: {
    WIDTH: 34,              // 小鸟视觉宽度
    HEIGHT: 24,             // 小鸟视觉高度
    GRAVITY: 0.45,          // 重力加速度 (px/frame²)
    FLAP_FORCE: -8.0,       // 点击上升力 (px/frame)
    MAX_FALL_SPEED: 12,     // 最大下落速度
    X_RATIO: 0.3,           // 小鸟水平位置占屏幕宽度比例
    COLLISION_RATIO: 0.7,   // 碰撞箱占视觉尺寸比例
    ROTATION_UP: -0.4,      // 上升时旋转角度
    ROTATION_DOWN_MAX: 1.2, // 下落时最大旋转角度
    ROTATION_SPEED: 0.05,   // 旋转变化速度
    WING_ANIM_SPEED: 5      // 翅膀动画帧间隔
  },

  // ==================== 管道参数 ====================
  PIPE: {
    WIDTH: 60,              // 管道宽度
    GAP: 180,               // 管道间隙基础值
    MIN_GAP: 120,           // 最小间隙
    // [v1.3.0] 生成改为距离制（修复减速 bug）：原 SPAWN_INTERVAL:90(帧) × SCROLL_SPEED:3.0 = 270px
    // 旧配置 SPAWN_INTERVAL:90 / SPAWN_INTERVAL_MIN:75 已废弃删除，引用处全部清理
    SPAWN_DISTANCE: 270,    // 生成间隔（滚动像素），等价原90帧×3.0速度
    // [v1.2.2] N5 终局加压：120s起生成间隔线性收紧，至300s达下限 [v1.3.0] 同步改距离版 270→240px
    SPAWN_RAMP_START: 7200,   // 间隔收紧起点（帧）=120s
    SPAWN_RAMP_TIME: 10800,   // 收紧周期（帧），120s→300s
    SPAWN_DISTANCE_MIN: 240,  // 生成间隔下限（滚动像素），等价原75帧×3.0≈225，取240保持密度略缓
    CAP_HEIGHT: 26,         // 管道帽高度
    CAP_OVERHANG: 4,        // 帽突出宽度
    MIN_TOP: 50,            // 顶部管道最小高度
    MIN_BOTTOM: 50,         // 底部管道最小高度

    // [v1.4.0] 管感（pipe_sense）：高亮下一根管道间隙
    SENSE_ALPHA: 0.3,       // 高亮透明度上限（≤0.35，浓了会遮蔽擦边金环）
    SENSE_ZONE_HALF: 30     // Lv2 安全区半宽（px，固定不随等级扩大，防"自动驾驶线"）
  },

  // ==================== 地面参数 ====================
  GROUND: {
    HEIGHT: 80,             // 地面高度
    SCROLL_TILE: 24         // 地面纹理平铺宽度
  },

  // ==================== 游戏全局参数 ====================
  GAME: {
    SCROLL_SPEED: 3.0,      // 初始滚动速度
    SPEED_RAMP_TIME: 3600,  // 速度增长周期（帧），3600=60s
    SPEED_RAMP_MAX: 1.5,    // 最大速度增量
    GAP_RAMP_TIME: 3600,    // 间隙缩小周期
    GAP_RAMP_MAX: 40,       // 最大间隙缩小量

    // [v1.2.1] 第二段难度缓坡：60s后速度/间隙以半速继续爬升，至180s封顶
    SPEED_RAMP2_START: 3600,  // 第二段起点（帧）=60s
    SPEED_RAMP2_TIME: 7200,   // 第二段爬升周期（帧），60s→180s
    SPEED_RAMP2_MAX: 0.75,    // 第二段最大速度增量（第一段的一半）
    GAP_RAMP2_START: 3600,    // 第二段起点（帧）=60s
    GAP_RAMP2_TIME: 7200,     // 第二段爬升周期（帧），60s→180s
    GAP_RAMP2_MAX: 20,        // 第二段最大间隙缩小量（第一段的一半）

    STATE: {
      READY: 'ready',
      PLAYING: 'playing',
      UPGRADING: 'upgrading',
      GAME_OVER: 'gameover'
    },

    // [v1.1.0] 安全区适配
    SAFE_AREA_TOP: 12,       // 无safeArea时的默认顶部偏移
    SAFE_AREA_BOTTOM: 8      // 无safeArea时的默认底部偏移
  },

  // ==================== 视觉参数 ====================
  VISUAL: {
    SKY_TOP: '#4ec0ca',
    SKY_BOTTOM: '#71c5cf',
    CLOUD_COLOR: 'rgba(255, 255, 255, 0.7)',
    GROUND_DIRT: '#ded895',
    GROUND_GRASS: '#5ee270',
    GROUND_GRASS_DARK: '#8ed24e',
    GROUND_DIRT_DARK: '#c9c179',
    PIPE_BODY: '#73bf2e',
    PIPE_HIGHLIGHT: '#9adf4e',
    PIPE_SHADOW: '#558022',
    PIPE_OUTLINE: '#000000',
    BIRD_BODY: '#f7d51d',
    BIRD_WING: '#ffffff',
    BIRD_BEAK: '#f58a1f',
    BIRD_EYE: '#ffffff',
    BIRD_PUPIL: '#000000',
    BIRD_OUTLINE: '#000000',
    ORB_GLOW: '#ffd700',
    ORB_OUTER: 'rgba(255, 215, 0, 0.3)',
    ORB_CORE: '#fff8dc',
    SHIELD_COLOR: 'rgba(100, 200, 255, 0.4)',
    SHIELD_OUTLINE: 'rgba(100, 200, 255, 0.8)',
    NEAR_MISS_COLOR: 'rgba(255, 215, 0, 0.6)',
    EXP_BAR_BG: 'rgba(0, 0, 0, 0.4)',
    EXP_BAR_FILL: '#ffd700',
    EXP_BAR_TEXT: '#ffffff',
    ABILITY_ICON_BG: 'rgba(0, 0, 0, 0.3)'
  },

  // ==================== 经验系统 ====================
  EXP: {
    BASE_EXP: 18,          // [v1.1.0] 20→18 前期更快
    EXP_INCREMENT: 12,     // [v1.1.0] 15→12 曲线更平缓
    PIPE_PASS_EXP: 10,     // [v1.1.4] 5→10 通过管道经验（经验球经验移除，保留后续版本）
    ORB_EXP: 10,           // 拾取经验球经验
    NEAR_MISS_EXP: 15,     // 擦边奖励经验
    NEAR_MISS_DISTANCE: 25,// [v1.1.5] 15→25 降低擦边触发难度
    ORB_SPAWN_CHANCE: 0.7, // 通过管道时生成经验球的概率
    SCORE_PER_ORB: 2,      // 拾取经验球额外得分
    SCORE_NEAR_MISS: 3,    // 擦边额外得分
    SCORE_SURVIVAL_INTERVAL: 300, // 存活时间得分间隔(帧)，300=5s

    // [v1.4.0] 经验银行（exp_bank）：溢出经验存银行生息，升级时全额取出
    BANK: {
      DIRECT_CAP_RATIO: 1.5,   // 单次获得经验直接入池上限 = 当前升级所需 ×1.5，超出部分入银行
      CAP_RATIO: 2,            // 银行余额上限 = 当前升级所需 ×2，超限部分自动入池（防囤积刹车①）
      INTEREST_PER_LV: 0.05    // 每 10s 生息 5%/级（生息节奏对齐 WEATHER.CHECK_INTERVAL，不新增逐帧计时器）
    },

    // [v1.4.0] 顿悟（enlightenment）：经验达升级所需 200% 时一次升 2 级（消耗 200% 额度），
    // 每局限 3 次硬刹车（防"全程双升"等级失控）；双面板连弹由既有 B2 保护覆盖，不另写
    ENLIGHTEN_RATIO: 2,
    ENLIGHTEN_MAX_PER_RUN: 3
  },

  // ==================== [v1.1.0] HP血条系统 ====================
  HP: {
    INITIAL: 2,            // 初始HP
    INITIAL_MAX: 2,        // 初始最大HP
    COLLISION_DAMAGE: 1,   // 每次碰撞伤害
    INVINCIBLE_FRAMES: 60, // 受击后无敌帧数(1s)
    HEART_SIZE: 18,        // [v1.1.1] 14→18 心形更大更清晰
    HEART_GAP: 6           // [v1.1.1] 4→6
  },

  // ==================== [v1.1.5] 统一护盾系统 ====================
  SHIELD: {
    DEFAULT_MAX_LAYERS: 1,       // 默认最大护盾层数
    TOUGHNESS_RECOVER_CD: 1800,  // 坚韧护盾恢复CD(帧), 1800=30s
    BOUNCE_RECOVER_BASE: 20,     // 弹力护盾恢复基础CD(秒)
    BOUNCE_RECOVER_REDUCTION: 5, // 弹力护盾每级CD减少(秒)
    BOUNCE_RECOVER_MIN: 5,       // 弹力护盾恢复CD下限(秒)
    BOUNCE_VEL_UP: 0.6,          // 弹力护盾向上反弹力度系数
    BOUNCE_VEL_DOWN: 0.4,        // 弹力护盾向下反弹力度系数
    SHRINK_ANIM_FRAMES: 30,      // 缩小射线管道缩回动画帧数

    // [v1.4.0] 镜面护盾（mirror_shield）：护盾被击破时冲击波
    MIRROR_SHOCK_RADIUS_BASE: 100,  // 冲击波半径基础值(px)
    MIRROR_SHOCK_RADIUS_PER_LV: 40, // 每级半径增量(px)
    MIRROR_SHOCK_CD: 180,           // 冲击波触发CD(帧)=3s，防"反复破盾刷波"回路（硬刹车）

    // [v1.4.0] 超载神盾（aegis_overdrive）：Lv1-2 护盾恢复CD -15%/级（Lv3 保留 Lv2 的 -30%，不叠加到 -45%）；
    // Lv3 质变：护盾满层时新护盾转 +1 临时HP（上限+2，HUD 空心心形与普通HP区分）
    OVERDRIVE_CD_REDUCT_PER_LV: 0.15,
    OVERDRIVE_TEMP_HP_CAP: 2
  },

  // ==================== [v1.1.0] 道具系统 ====================
  ITEM: {
    SPAWN_CHANCE: 0.25,    // 通过管道时生成道具概率
    RADIUS: 10,            // 道具半径
    BASE_SPEED: 3.0,       // 基础移动速度
    ATTRACT_FORCE: 0.8,    // 磁吸力强度(与经验球一致)

    // 道具类型概率
    TYPE_WEIGHTS: {
      exp_pack: 40,        // 经验包
      health_pack: 20,     // 血包
      shield_pack: 25,     // 护盾包
      speed_pack: 15,      // 速度包
      missile: 20          // [v1.3.0] 导弹（与血包同级）
    },

    // 道具效果参数
    EXP_PACK_MIN: 15,      // 经验包最小经验
    EXP_PACK_MAX: 30,      // 经验包最大经验
    SHIELD_DURATION: 300,  // 护盾包持续时间(5s=300帧)
    SPEED_PACK_DURATION: 180, // 速度包减速持续时间(3s=180帧)
    SPEED_PACK_SLOWDOWN: 0.5, // 速度包减速比例

    // [v1.1.1] 随机道具刷新
    RANDOM_SPAWN_INTERVAL: 480, // 随机道具生成间隔(帧), 480≈8s
    RANDOM_SPAWN_CHANCE: 0.6,   // 到间隔时生成道具的概率

    // [v1.4.0] 补给线（supply_line）：保底道具计时，与随机生成独立；
    // 权重沿用 TYPE_WEIGHTS（不含导弹倾斜），防"保底导弹流"变最优解
    SUPPLY_LINE_BASE_SEC: 75,      // 保底间隔基础值(秒)
    SUPPLY_LINE_REDUCTION_SEC: 15, // 每级间隔缩减(秒)

    // 道具颜色
    COLORS: {
      exp_pack: '#9b59b6',
      health_pack: '#e74c3c',
      shield_pack: '#3498db',
      speed_pack: '#1abc9c',
      missile: '#e67e22'   // [v1.3.0] 导弹（橙色）
    }
  },

  // ==================== [v1.3.0] 怪物系统 ====================
  MONSTER: {
    SPAWN_DELAY: 2700,     // 新手保护期（帧），45s 后才出现怪物
    MAX_ALIVE: 2,          // 屏幕同时最多怪物数
    SPAWN_DISTANCE: 450,   // 生成间隔（滚动像素，与管道同为距离制）
    SAFE_GAP_DIST: 70,     // 生成 y 与前方管道间隙中心的最小距离（不堵死通路）
    SPAWN_Y_ATTEMPTS: 6,   // 生成 y 避让尝试次数（失败则用最后候选）
    MIN_Y_MARGIN: 40,      // y 取值上下边距
    BAT_WEIGHT: 0.5,       // 蝙蝠怪生成权重（其余为浮游怪）
    KILL_EXP: 10,          // 击杀经验（浮动文字 +10）

    // [v1.5.0] 精英怪（§5.1）：45s 保护期后每 60s roll 一次，25% 概率把下一只升级为精英
    // 金色描边 + 体型×1.3 + HP×3，移动参数不变；击杀必掉 1 个随机道具（导弹权重×2）+ 经验×5
    ELITE_ROLL_INTERVAL: 3600,     // 精英 roll 间隔（帧）=60s（计时起点与 SPAWN_DELAY 相同）
    ELITE_CHANCE: 0.25,            // 精英化概率（Ch3 30%/Ch4 35% 由章节修正覆写，见 CHAPTERS）
    ELITE_SIZE_MULT: 1.3,          // 体型倍率
    ELITE_HP_MULT: 3,              // HP 倍率
    ELITE_EXP_MULT: 5,             // 击杀经验倍率（10→50）
    ELITE_MISSILE_WEIGHT_MULT: 2,  // 必掉道具的导弹权重倍率
    ELITE_BORDER_COLOR: '#ffd700', // 金色描边

    // [v1.4.0] 拾荒者（scavenger）：击杀怪物 20%/级 掉随机道具
    // 同屏怪物≤2 + 生成距离450px 天然限速，无需额外刹车
    SCAVENGER_CHANCE_PER_LV: 0.2,

    // 蝙蝠怪：正弦垂直波动
    BAT: {
      HP: 1,
      WIDTH: 30,
      HEIGHT: 22,
      SINE_AMP: 55,        // 正弦振幅（px）
      SINE_FREQ: 0.045     // 正弦频率（rad/帧）
    },

    // 浮游怪：滞后追踪小鸟 y（追踪速度设上限，保证可躲避）
    FLOATER: {
      HP: 2,
      WIDTH: 32,
      HEIGHT: 26,
      TRACK_SPEED: 1.1     // y 追踪速度上限（px/帧）
    }
  },

  // ==================== [v1.3.0] 导弹系统 ====================
  MISSILE: {
    SPEED: 7,              // 基础飞行速度（px/帧，实际随世界快慢缩放）
    TURN_RATE: 0.07,       // 弱追踪：每帧最大转向角（rad）
    DAMAGE: 1,             // 命中伤害
    AOE_RADIUS: 0,         // 爆炸 AoE 半径（px，0=无 AoE）
    MAX_ALIVE: 3,          // 同时在屏导弹上限（基础值）
    // [v1.4.0] 导弹挂架（missile_rack）：MAX_ALIVE 与挂架等级挂钩（3+lv，Game._fireMissile 结算），
    // 否则扇形多发瞬间占满上限、满级卡实际无效（设计表标注的隐蔽实现坑）
    RACK_FAN_STEP: 0.25,   // 挂架扇形多发相邻角度步长（rad）
    WIDTH: 16,             // 弹头长度
    HEIGHT: 8,             // 弹头宽度
    TRAIL_LENGTH: 10,      // 拖尾点数

    // [v1.4.0] 火力覆盖（missile_barrage）：每 (14-2(lv-1))s 自动发射 1 枚导弹；
    // 独立枪口闪光特效，不得用道具拾取特效（防玩家误认导弹来源）
    BARRAGE_BASE_SEC: 14,
    BARRAGE_REDUCTION_SEC: 2,

    // [v1.4.0] 猎手标记（hunter_mark）：导弹伤害 +lv，击杀触发连锁爆炸；
    // 硬规则：连锁爆炸击杀不再触发二次连锁（防指数回路）
    HUNTER_CHAIN_BASE_RADIUS: 50,   // 连锁爆炸半径基础值(px)
    HUNTER_CHAIN_RADIUS_PER_LV: 10, // 每级半径增量(px)

    // [v1.4.0] 蜂群链路（missile_link）：导弹命中后 1.5s 窗内下一发伤害+1，叠层上限 1+lv 硬封顶（防指数回路）
    LINK_WINDOW_FRAMES: 90,         // 连击窗口（帧）=1.5s

    // [v1.4.0] 导弹风暴（missile_storm）：拾取导弹改 (4+lv)s 连发（每秒 2 枚）；
    // 期间再拾取刷新时长（不叠加）；同屏 MAX_ALIVE 上限硬刹车；连发期间道具权重不变（防自喂养回路）
    STORM_BASE_SEC: 4,
    STORM_SEC_PER_LV: 1,
    STORM_RATE_FRAMES: 30           // 连发间隔（帧）=每秒2枚
  },

  // ==================== 经验球参数 ====================
  ORB: {
    RADIUS: 8,             // 经验球半径
    BASE_SPEED: 3.0,       // 基础移动速度（跟随世界滚动）
    ATTRACT_RANGE: 72,     // 基础磁吸范围 [v1.2.2] B1 60→72（+20%）
    ATTRACT_FORCE: 0.8,    // 磁吸力强度
    GLOW_COLOR: '#ffd700', // 经验球颜色（金色）
    GLOW_OUTER: 'rgba(255, 215, 0, 0.3)',
    PULSE_SPEED: 0.1       // 脉冲动画速度
  },

  // ==================== 能力系统 ====================
  ABILITY: {
    CATEGORY: {
      PASSIVE: 'passive',
      ACTIVE: 'active',
      SPECIAL: 'special'
    },
    CHOICE_COUNT: 3,       // 默认可选数量
    MAX_ALL_BUFF_LEVEL: 10, // 全属性加成最大等级

    // [v1.2.1] 二段跳触发窗口（帧）：上次拍翅后 3~18 帧（≈50~300ms）内再次拍翅触发
    DOUBLE_JUMP_MIN_WINDOW: 3,
    DOUBLE_JUMP_MAX_WINDOW: 18,

    // [v1.4.0] 锐利目光（edge_focus）：擦边后 60 帧碰撞箱 -15%/级（与灵巧乘算，0.3 下限钳制兜底）
    EDGE_FOCUS_FRAMES: 60,
    EDGE_FOCUS_SHRINK_PER_LV: 0.15,

    // [v1.4.0] 羽舞（feather_dance）：二段跳后 3s 擦边窗口 +8px/级（不改二段跳位移参数，手感原则）
    FEATHER_DANCE_FRAMES: 180,
    FEATHER_DANCE_NEAR_MISS_BONUS: 8,

    // [v1.4.0] 连击种子（combo_seed）：断连击保留 lv 层；
    // 硬刹车：持连击之心时保留 ≤ 无敌阈值-1（防"保留3层+阈值2"变相永动，N1 教训），未持时上限 4
    COMBO_SEED_NO_HEART_CAP: 4,

    // [v1.4.0] 回响之翼（echo_wing）：每过 (9-2(lv-1)) 管存 1 层羽盾（挡 1 次伤害，受击链最前置）
    ECHO_WING_BASE_PIPES: 9,
    ECHO_WING_PIPES_REDUCTION: 2,
    // [v1.4.0] 铁羽（iron_feather）：羽盾上限+1，破羽盾给 30 帧/级无敌；
    // 羽盾全局上限 2 层硬顶（回响1+铁羽1），不允许任何第三来源（防"羽盾无限续"变下一个 7 层护盾）
    FEATHER_SHIELD_MAX: 2,
    IRON_FEATHER_INVINCIBLE_PER_LV: 30,

    // [v1.4.0] 血契（blood_pact）：最大HP-1 换 得分/经验+30%/级 + 受击无敌+1s/级；
    // 保险丝：持血契时狂暴增益减半（写死，§6.3 专项验证）；凤凰复活语义=回满当前上限
    BLOOD_PACT_HP_COST: 1,
    BLOOD_PACT_BONUS_PER_LV: 0.3,
    BLOOD_PACT_INVINCIBLE_FRAMES_PER_LV: 60,
    BLOOD_PACT_BERSERK_FACTOR: 0.5,

    // [v1.4.0] 幻影舞步（phantom_edge）：擦边开 90 帧黄金窗，窗内擦边判定×2、经验×(2+lv)；
    // 硬规则：窗内擦边只刷新窗口、不叠加倍率（防指数回路）；窗口期金色残影
    PHANTOM_WINDOW_FRAMES: 90,

    // [v1.4.0] 时之晶（time_crystal）：寄生时间扭曲同一触发点（同 CD 同源，不独立计时），
    // 冻结怪物/弹幕 (1+0.5(lv-1))s，鸟可动；冻结只停移动/追踪，不取消碰撞判定（保铁喙协同）
    TIME_CRYSTAL_BASE_SEC: 1,
    TIME_CRYSTAL_PER_LV_SEC: 0.5,

    // [v1.4.0] 连击之心 Lv3 质变：无敌期间每过 1 管 +5exp（不延长无敌，奖励方向改经验不碰生存边）
    COMBO_HEART_L3_EXP: 5,

    // [v1.4.0] 缩小射线 Lv5 质变：Lv5 间隙不再扩大（+100px 已触及挑战下限），改为擦边判定窗口 +10px
    SHRINK_RAY_GAP_CAP_LV: 4,
    SHRINK_RAY_L5_NEAR_MISS_BONUS: 10,

    // [v1.4.0] 先知（oracle）：升级面板协同标注表（静态表，必须与代码实际结算一致；只标注不推荐）
    // ⚠️ 反协同对：顺风耳×御风者（减弱风力=削弱助推）、风暴之子×气候适应（缩短天气=削弱增益窗口）
    ORACLE_ANTI_PAIRS: [
      ['wind_reader', 'wind_rider'],
      ['storm_child', 'climate_adapt']
    ],
    // 🔗 协同对（节选主流派官方搭档，与设计 §3.1 流派表一致）
    ORACLE_SYNERGY_PAIRS: [
      ['missile_barrage', 'missile_rack'], ['missile_barrage', 'hunter_mark'],
      ['missile_rack', 'missile_storm'], ['missile_link', 'missile_storm'],
      ['missile_link', 'missile_barrage'], ['hunter_mark', 'scavenger'],
      ['scavenger', 'magnet'], ['supply_line', 'magnet'],
      ['echo_wing', 'iron_feather'], ['echo_wing', 'shrink_ray'], ['echo_wing', 'slow_world'],
      ['time_crystal', 'time_warp'], ['time_crystal', 'iron_beak'],
      ['iron_beak', 'physique'], ['iron_beak', 'blood_pact'], ['iron_beak', 'survivor_instinct'],
      ['exp_bank', 'enlightenment'], ['exp_bank', 'greed'], ['exp_bank', 'exp_resonance'],
      ['enlightenment', 'greed'], ['enlightenment', 'exp_resonance'],
      ['combo_seed', 'combo_heart'], ['feather_dance', 'double_jump'], ['feather_dance', 'combo_heart'],
      ['phantom_edge', 'edge_focus'], ['phantom_edge', 'feather_dance'], ['phantom_edge', 'combo_heart'],
      ['edge_focus', 'combo_heart'], ['edge_focus', 'shrink_ray'],
      ['bounce_shield', 'mirror_shield'], ['mirror_shield', 'aegis_overdrive'],
      ['aegis_overdrive', 'toughness'], ['aegis_overdrive', 'bounce_shield'],
      ['eye_of_storm', 'storm_child'], ['eye_of_storm', 'steady_charm'], ['eye_of_storm', 'exp_tide'],
      ['chaos_dice', 'storm_child'], ['chaos_dice', 'climate_adapt'],
      ['wind_rider', 'storm_child'], ['ice_crystal', 'storm_child'],
      ['exp_tide', 'storm_child'], ['exp_tide', 'steady_charm'],
      ['blood_pact', 'regeneration'], ['blood_pact', 'echo_wing'],
      ['survivor_instinct', 'phoenix'], ['lucky', 'oracle'], ['lucky', 'exp_bank'],
      ['pipe_sense', 'oracle'], ['shrink_ray', 'combo_heart'], ['double_jump', 'combo_heart']
    ],
    // ⭐ 核心判定：流派核心卡 + 已持该流派 ≥1 张其他核心 或 ≥2 张协同件（流派划分同设计 §3.1）
    ORACLE_ARCHETYPES: [
      { core: ['toughness', 'bounce_shield', 'shield_burst'],
        support: ['aegis_overdrive', 'mirror_shield', 'echo_wing', 'iron_feather', 'vitality', 'regeneration', 'phoenix'] },
      { core: ['combo_heart', 'shrink_ray'],
        support: ['edge_focus', 'phantom_edge', 'feather_dance', 'combo_seed', 'double_jump'] },
      { core: ['greed', 'exp_resonance', 'lucky'],
        support: ['exp_bank', 'enlightenment', 'double_score', 'supply_line', 'oracle'] },
      { core: ['storm_child', 'wind_rider', 'ice_crystal'],
        support: ['steady_charm', 'chaos_dice', 'climate_adapt', 'exp_tide', 'eye_of_storm'] },
      { core: ['missile_barrage', 'missile_rack'],
        support: ['scavenger', 'hunter_mark', 'missile_link', 'missile_storm', 'magnet', 'supply_line'] },
      { core: ['iron_beak', 'physique'],
        support: ['survivor_instinct', 'blood_pact', 'time_crystal', 'combo_heart'] },
      { core: ['blood_pact', 'berserk'],
        support: ['physique', 'echo_wing', 'regeneration', 'vitality'] }
    ],
    // [v1.4.0] 风暴驯化互斥表（D7）：已驯化天气 → 作废/反协同卡，抽卡 UI 加"已驯化"标记
    // 冰雹驯化→冰晶护体作废（冰雹不再伤人）；风驯化→顺风耳会把助推也削弱；雨驯化→雨衣失去意义
    TAMED_MUTEX: {
      hail: ['ice_crystal'],
      wind: ['wind_reader'],
      rain: ['raincoat']
    },

    // [v1.5.1] 前置依赖表（真机反馈②"前置卡白占格子"修复）：依赖卡在前置未持有时
    // 直接不进抽卡候选池（AbilityRegistry 全部四个抽卡入口统一口径），
    // 不再出现"灰显可点但无效"的残版面板；Game._getCardGreyReason 灰显保留为兜底，
    // 正常路径不再触达。依赖关系沿用 v1.4.0 灰显逻辑登记的全部条目：
    PREREQUISITES: {
      iron_feather: 'echo_wing',   // 铁羽需回响之翼（无则羽盾来源不存在）
      time_crystal: 'time_warp'    // 时之晶需时间扭曲（寄生同一触发点，无则无触发位）
    },

    // [v1.1.3] 新能力权重倍率
    // [v1.4.0] §8-R1 预案执行：55 卡池稀释导致流派核心套凑齐率下降（§6.3 ①③ 未达标），1.3→1.5
    NEW_ABILITY_BONUS: 1.5,  // 未拥有能力权重额外乘数

    // [v1.4.0] §8-R1 预案第二手段：流派核心卡加权——持有核心数少于阈值时，
    // 核心卡（未拥有）权重额外 ×1.5，抬"尚未成型"局的流派成型率；成型后恢复正常（防滚雪球）
    // （第2轮 ×1.3/阈值0 实测 ①2.6倍 不足，第3轮调整为 ×1.5/阈值<2——单核心即断供仍难成套）
    ARCHETYPE_CORE_IDS: ['bounce_shield', 'toughness', 'combo_heart', 'shrink_ray', 'greed',
      'exp_resonance', 'storm_child', 'missile_barrage', 'missile_rack', 'iron_beak'],
    ARCHETYPE_CORE_WEIGHT: 1.5,
    ARCHETYPE_CORE_BOOST_MAX_OWNED: 2,  // 持有核心数 < 此值时加权生效

    // [v1.2.2] N9 软保底：连续5次升级面板无稀有及以上卡时，下一面板保底1张稀有+
    PITY_THRESHOLD: 5,

    // ==================== [v1.5.0] 章节联动卡参数（§2.1-C7/§2.2-U8/U9/§2.3-R9/R10/§2.4-E7） ====================

    // [v1.5.0] C7 坚韧外皮（thick_skin）：怪物/弹幕伤害 30%/级 概率格挡（对管道无效）；
    // §2.6 受击链最前置防御节点（格挡 → 羽盾 → 护盾层 → HP），格挡成功白色弹开粒子（与护盾蓝色区分）
    THICK_SKIN_BLOCK_PER_LV: 0.3,

    // [v1.5.0] U8 屠龙者（boss_slayer）：导弹对 Boss 伤害 +lv（与猎手标记加算，非乘算防 DPS 爆炸）；
    // Boss 战受击无敌 +0.5s/级（帧）
    BOSS_SLAYER_INVINCIBLE_PER_LV: 30,

    // [v1.5.0] U9 旅者（nomad）：进入新章节 +lv 层护盾 +20exp/级（第 2 章起生效，Ch1 零收益）
    NOMAD_EXP_PER_LV: 20,

    // [v1.5.0] R9 章节回响（chapter_echo）：进新章随机已持卡临时 +lv 级（本章有效）；
    // 已满级则重随机，最多重试 3 次；章末恢复并浮动文字"回响消散"
    ECHO_REROLL_MAX: 3,

    // [v1.5.0] R10 战利品陈列（trophy_wall）：每个已击败 Boss 经验 +15%/级、道具率 +5pp/级
    // （本局永久，按已击败数线性叠乘，4 章封顶 4 层；第一章未过 Boss 前零收益）
    TROPHY_EXP_PER_LV: 0.15,
    TROPHY_ITEM_PP_PER_LV: 0.05,
    TROPHY_MAX_STACKS: 4
  },

  // ==================== [v1.2.2] 升级面板保护（B2） ====================
  UPGRADE: {
    SAFE_MARGIN_PX: 20,          // B2-① 延后弹板：小鸟飞出管道间隙的安全边距(px) [v1.2.3] 仅判定正在穿越的管道
    RESUME_INVINCIBLE_FRAMES: 45,// B2-② 恢复保护：面板关闭后无敌帧数（0.75s）
    MAX_DELAY_FRAMES: 90         // [v1.2.3] B2-③ 保底超时：延迟弹板超90帧(1.5s)强制弹板，保证弹窗必出现
  },

  // ==================== [v1.1.3] 能力稀有度系统 ====================
  RARITY: {
    COMMON: {
      id: 'common',
      name: '普通',
      baseWeight: 10,    // 基础权重
      levelBonus: 0,     // 每级权重增长系数（0=不随等级增长）
      maxWeight: 12      // 权重上限
    },
    UNCOMMON: {
      id: 'uncommon',
      name: '稀有',
      baseWeight: 6,
      levelBonus: 0.2,
      maxWeight: 10
    },
    RARE: {
      id: 'rare',
      name: '珍贵',
      baseWeight: 3,
      levelBonus: 0.4,
      maxWeight: 8
    },
    EPIC: {
      id: 'epic',
      name: '史诗',
      baseWeight: 1.5,
      levelBonus: 0.6,
      maxWeight: 6
    }
  },

  // ==================== [v1.2.0] 环境系统 ====================
  WEATHER: {
    START_TIME: 1080,          // [v1.2.1] 30s→18s后开始可能触发
    CHECK_INTERVAL: 600,       // 每10秒检查一次
    BASE_CHANCE: 0.20,         // 基础概率20%
    MAX_CHANCE: 0.50,          // 最大概率50%（10分钟时）
    CHANCE_RAMP_TIME: 36000,   // 概率增长周期(10分钟=36000帧)
    TRIGGER_COOLDOWN: 600,     // 触发后冷却10s
    EFFECT_COOLDOWN: 1800,     // 同效果独立冷却30s
    MAX_SIMULTANEOUS: 2,       // 最多同时2种效果
    // [v1.2.2] N5 终局加压：240s后并发上限提升为3
    LATE_GAME_TIME: 14400,     // 终局起点（帧）=240s
    MAX_SIMULTANEOUS_LATE: 3,  // 终局最多同时3种效果

    // [v1.4.0] 定风珠（steady_charm）：天气开始/结束 (3+3*lv)s 内免疫其 debuff；
    // 只免疫负面部分（御风者等增益保留），免疫判定在各 debuff 应用点而非总开关
    STEADY_CHARM_BASE_SEC: 3,
    STEADY_CHARM_PER_LV_SEC: 3,

    // [v1.4.0] 风暴驯化（chaos_dice）：获得时驯化当前天气（无天气则驯化下一种）：
    // 风→50% 助推（恒有利方向）；雨→积水不加重力；冰雹→10% 概率掉 exp 不伤人
    TAMED_WIND_BOOST_FACTOR: 0.5,
    TAMED_HAIL_EXP_CHANCE: 0.1,
    TAMED_HAIL_EXP_AMOUNT: 5,

    // [v1.4.0] 风暴之眼（eye_of_storm）：天气并发≥2 种时 debuff -20%/级、经验 ×(1+0.5/级)；
    // 单天气零收益（与经验潮汐错位：潮汐管单天气，风眼管并发）；240s 前基本白板——后期卡
    EYE_OF_STORM_MIN_CONCURRENT: 2,
    EYE_OF_STORM_DEBUFF_REDUCT_PER_LV: 0.2,
    EYE_OF_STORM_EXP_PER_LV: 0.5,

    WIND: {
      MIN_DURATION: 900,       // 15s
      MAX_DURATION: 1800,      // 30s
      MAX_FORCE: 0.15,         // 最大风力 px/frame²
      HORIZONTAL_FACTOR: 1.5,  // [v1.2.1] 水平风对世界滚动的影响系数（0.3→1.5，视听不再脱节）
      DURATION_RAMP_TIME: 7200 // 持续时间增长周期(2分钟)
    },

    RAIN: {
      MIN_DURATION: 1200,      // 20s
      MAX_DURATION: 2400,      // 40s
      ACCUMULATION_RATE: 0.3,  // 每帧积累速度
      FLAP_REDUCTION: 5,       // 每次拍翅减少
      DRY_RATE: 0.5,           // 雨停后干燥速度（每帧）
      MAX_GRAVITY_BONUS: 0.5,  // 最大重力增加50%
      DURATION_RAMP_TIME: 7200
    },

    HAIL: {
      MIN_DURATION: 600,       // 10s
      MAX_DURATION: 1200,      // 20s
      MIN_SPEED: 5,            // 最小下落速度 px/frame
      MAX_SPEED: 8,            // 最大下落速度
      MIN_RADIUS: 4,           // 最小半径
      MAX_RADIUS: 8,           // 最大半径
      SPAWN_INTERVAL_PEAK: 20, // 峰值生成间隔(帧)
      DURATION_RAMP_TIME: 7200
    }
  },

  // ==================== [v1.5.0] 章节系统 ====================
  // 设计依据：docs/开发方案_v1.4.0.md §4.1-4.5；视觉色值（§4.2）与难度修正（§4.4）同表管理。
  // 难度为叠加制：现有时间 ramp（60s 拉满 + 60→180s 二段坡）完全不变、跨章连续不重置，
  // 章节修正作为第三段压力曲线叠加其上（Ch1 全零 = 基准，默认体验零变化）。
  // Ch3 夜空 / Ch4 雪原为 v1.6.0 占位（见 LIST 末尾注释），本版本不实现。
  CHAPTERS: {
    TRIGGER_PIPES: 40,        // §4.5 章内过管数触发 Boss（章内计数，过章清零）
    TRIGGER_TIMEOUT: 9000,    // §4.5 迟到兜底（帧）=150s，未达 40 管强制触发
    HUD_PULSE_PIPES: 35,      // §4.5 Boss 临近（≥35/40）章节进度脉冲阈值

    // §4.3 转场演出帧数：白闪10 → 横向色带擦除60 → 标题卡90 →（恢复飞行后）60帧无敌
    TRANSITION: {
      FLASH_FRAMES: 10,       // 全屏白闪
      WIPE_FRAMES: 60,        // 新章底色色带从左推入
      TITLE_FRAMES: 90,       // 章节标题卡（"第二章 · 沙漠" + 副标"难度提升"）
      INVINCIBLE_FRAMES: 60   // 转场结束后无敌帧（恢复飞行保护）
    },
    PIPE_COLOR_LERP_FRAMES: 30,  // §4.3 存量管道换色平滑过渡帧数

    LIST: [
      {
        id: 1, name: '蓝天草地', title: '第一章 · 蓝天草地', subtitle: '',
        // §4.4 难度修正（Ch1 全零 = 基准）
        mods: {
          scrollSpeedAdd: 0,         // 滚动速度加算
          gapAdd: 0,                 // 管道间隙加算(px)
          monsterSpawnDistance: 450, // 怪物生成距离(px)
          monsterMaxAlive: 2,        // 同屏怪物上限
          monsterHpMult: 1,          // 怪物 HP 倍率
          floaterTrackSpeed: 1.1,    // 浮游追踪速度(px/帧)
          batSineAmp: 55,            // 蝙蝠正弦振幅(px)
          eliteChance: 0.25,         // §5.1 精英怪概率
          bossHp: 36                 // §4.6 关底 Boss HP；[v1.5.0 D21] 30→36（数值闭环：让
                                     // 成型火力需 6 发/满配 5 发/无卡保底 9 发，击杀时长三档分离，
                                     // 见 DECISIONS D21 与 test_boss_sim 文件头实测）
        },
        // §4.2 视觉（Ch1 = 现有 VISUAL 段色值原样录入，渲染零变化）
        visual: {
          theme: 'meadow',
          skyTop: '#4ec0ca', skyBottom: '#71c5cf',
          clouds: true,              // 白云 ×4（沿用现有 _drawClouds）
          ground: { base: '#ded895', strip: '#5ee270', tileA: '#8ed24e', tileB: '#c9c179' },
          pipe: { body: '#73bf2e', highlight: '#9adf4e', shadow: '#558022' }
        }
      },
      {
        id: 2, name: '沙漠', title: '第二章 · 沙漠', subtitle: '难度提升',
        // §4.4 Ch2：速度+0.3 / 间隙-10 / 怪物距离400 / 上限2 / HP×1 / 追踪1.3 / 振幅55 / 精英25%
        mods: {
          scrollSpeedAdd: 0.3,
          gapAdd: -10,
          monsterSpawnDistance: 400,
          monsterMaxAlive: 2,
          monsterHpMult: 1,
          floaterTrackSpeed: 1.3,
          batSineAmp: 55,
          eliteChance: 0.25,
          bossHp: 45                 // 沙暴巨鹰（步骤 C 使用）
        },
        // §4.2 Ch2 沙漠：橙黄天空 + 太阳 + 远景沙丘 + 热浪粒子 + 沙色地面 + 岩柱管道
        visual: {
          theme: 'desert',
          skyTop: '#f5c06a', skyBottom: '#f7dfa0',
          clouds: false,                     // 沙漠章无云
          sun: { color: '#ffd93b', radius: 40 },  // 右上 40px 太阳 + radial 光晕
          duneColor: '#e0aa5e',              // 远景沙丘 3 条抛物线弧（0.5× 视差）
          heatParticles: 12,                 // 热浪粒子（上升透明条），性能预算 +12
          ground: { base: '#e6c27a', strip: '#d4a955', tileA: '#d4a955', tileB: '#d4a955' }, // 沙色+沙纹线
          pipe: { body: '#c98f3f', highlight: '#a8742c', shadow: '#a8742c' }  // 岩柱
        }
      }
      // [v1.6.0 占位·不实现] Ch3 夜空：天空 #141c33→#2a3a5f，星星×30+弯月+云#3a4a6b+萤火虫；
      //   地面 #33415c；金属管 #6b7fa3；修正 速度+0.3/间隙-8/怪物距离360/上限3/HP×1.5/追踪1.4/振幅70/精英30%/Boss HP60
      // [v1.6.0 占位·不实现] Ch4 雪原：天空 #b9d4ea→#e8f2fa，雪山×2+雪花粒子(≤40,复用冰雹实体,无伤害)；
      //   地面 #eef4f8+冰面高光；冰柱 #8fc1e0；修正 速度+0.3/间隙-7/怪物距离320/上限3/HP×2/追踪1.5/振幅70/精英35%/Boss HP80
    ]
  },

  // ==================== [v1.5.0] Boss 系统（步骤 C） ====================
  // 设计依据：docs/开发方案_v1.4.0.md §4.6-4.11；同框架变体制（§4.6 结论），
  // 变体数值全部入 VARIANTS 表（HP 单一事实源在 CHAPTERS.mods.bossHp，变体行只写行为参数）。
  BOSS: {
    WIDTH: 90,                  // Boss 视觉宽度（碰撞箱为视觉 0.8）
    HEIGHT: 64,                 // Boss 视觉高度
    HOME_X_RATIO: 0.70,         // §4.8 巡游 x = 屏宽 70%
    ROAM_AMP: 120,              // §4.8 正弦巡游 y 振幅(px)
    ROAM_PERIOD: 240,           // 巡游周期（帧）=4s
    PHASE2_HP_RATIO: 0.5,       // §4.8 P1→P2 阈值（HP<50%）：爆闪30帧+血条变红+弹幕加密
    PHASE2_FLASH_FRAMES: 30,    // P2 入场闪电粒子爆闪帧数
    FAN_ANGLE_STEP: 0.35,       // §4.8 扇形弹幕间隔角(rad)
    FEATHER_RADIUS: 5,          // 羽刃弹幕半径(px)
    FEATHER_DAMAGE: 1,          // 弹幕伤害（固定 1，走统一受击链）
    CHARGE_BACK_PX: 30,         // §4.8 冲锋蓄力后退(px)
    CHARGE_WINDUP_FRAMES: 48,   // 蓄力 0.8s（泛白预警+红色警示带；=二段跳窗口×2.5 反应余量）
    CHARGE_SPEED: 8,            // 冲刺速度(px/帧)
    CHARGE_TARGET_X_RATIO: 0.15,// 冲至屏 15% 处返回
    CONTACT_DAMAGE: 1,          // 本体接触伤害（走统一受击链）
    // §4.11 出场演出：暗角收拢30帧 → "雷云聚集……"1s → Boss 右侧飞入至70%（60帧）→ 血条展开
    INTRO_VIGNETTE_FRAMES: 30,
    INTRO_GATHER_FRAMES: 60,
    INTRO_ENTER_FRAMES: 60,
    // §4.11 死亡演出：爆炸粒子环（半径120px）→ 慢动作30帧（复用速度包0.5×）→ 大礼包面板
    DEATH_SLOWMO_FRAMES: 30,
    EXPLOSION_RING_RADIUS: 120,
    // §4.10 战败方案A（D1/D19）：HP 归零不结束游戏，扣 1 HP 走完整受击链（可被格挡/羽盾/护盾减免），
    // Boss 长鸣离场、章内进度保留、再过 20 管 Boss 满血回归一次；二战失败本章 Boss 不再出现、
    // 章节正常推进无奖励。血契流 maxHp=1 战败=死（无血可扣，自选极限属性）
    DEFEAT_RETURN_PIPES: 20,
    DEFEAT_INVINCIBLE_FRAMES: 120,  // 战败恢复飞行保护（2s）
    // §4.11 Boss 血条：顶部居中、宽60%、高10px；左 Boss 名右 HP 数字；P2 变红
    HP_BAR_WIDTH_RATIO: 0.6,
    HP_BAR_HEIGHT: 10,
    // §4.7 Boss 战期间道具照常生成且导弹权重上调 20/125→40/145（= missile×2，无火力卡玩家的保底输出）
    ITEM_MISSILE_WEIGHT_MULT: 2,
    // [v1.5.0 数值闭环 D21] Boss 战导弹保底供给：战斗期间每 N 帧检查一次，
    // 若场上无导弹道具则在玩家前方（与小鸟同高，右屏缘外）生成 1 枚；进战即供第 1 枚
    // （setBossActive 预置满计时），战斗结束清零、下一场同样即供。
    // 依据：§4.9"无卡玩家能赢"的可达成化——实测无卡对 Boss 唯一伤害源
    // 是道具导弹（约 1 枚/48s，见 DECISIONS D20），与 30HP 差 2 个数量级；
    // 保底供给把"无卡输出链"从随机掉落解耦为确定性节拍（5.5s/枚+即供首枚）
    MISSILE_SUPPLY_INTERVAL_FRAMES: 330,
    // [v1.5.0 数值闭环 D21] 导弹对 Boss 基础伤害系数（只乘 MISSILE.DAMAGE 基础值，
    // 猎手标记/屠龙者加成保持 1:1 flat 不削卡）：无卡 4/发、成型火力 7/发、满配 8/发，
    // 配合受击间隔门与 Ch1 HP36：无卡 ~62s（9 发×~6.5s 节拍）、满配 ~17.6s（5 发）、
    // 成型火力 ~23.4s（6 发）——D20 矛盾的闭环（实测见 test_boss_sim 文件头）
    MISSILE_DAMAGE_MULT: 4,
    // [v1.5.0 数值闭环 D21] Boss 受击间隔门：受击后 N 帧内后续导弹命中不扣血
    // （白闪/爆炸粒子反馈照常，命中仍可见、不"白打"）。
    // 依据：挂架扇形多发/风暴连发的同批命中在 ~45 帧内陆续到达，门把"一批"收敛为"一发"，
    // 防弹幕级 DPS 秒杀（满配蜂群+屠龙者 10.2s 破 ≥20s 红线，D20）；间隔 >0.75s 的
    // 持续火力（无卡保底 ~6s/发、火力覆盖 10-14s/轮）完全不受影响
    HIT_GATE_FRAMES: 45,
    // §4.10 章节大礼包定额：+100 分 + 3 级所需经验（按当前等级曲线 18+12×Lv 逐级别累加）
    GIFT_SCORE: 100,
    GIFT_LEVELS: 3,
    // 章节祝福（§4.10 三选一，本局永久）；E7 章节之主对祝福效果 +50% 走 BLESSING_MASTER_MULT
    BLESSING_MASTER_MULT: 1.5,
    BLESSING_GROWTH_EXP: 0.25,      // 成长祝福：经验 +25%/层（独立乘区）
    BLESSING_HUNT_ITEM_PP: 0.08,    // 狩猎祝福：道具生成率 +8pp/层
    BLESSING_HUNT_SPAWN_ITEMS: 3,   // 狩猎祝福：立即在前方生成道具数
    // §4.6 变体表：p1/p2 = 弹幕参数（volley=每轮发数 / volleyInterval=间隔帧 / bulletSpeed=弹速 px/f）
    VARIANTS: [
      { // Ch1 雷羽巨鹰（基准框架）：3发/4s → 5发/2.5s，弹速 4.5→5.5；冲锋 CD12s；召唤蝙蝠×2/15s
        name: '雷羽巨鹰',
        gatherText: '雷云聚集……',
        p1: { volley: 3, volleyInterval: 240, bulletSpeed: 4.5 },
        p2: { volley: 5, volleyInterval: 150, bulletSpeed: 5.5 },
        chargeCD: 720,
        summon: { type: 'bat', count: 2, interval: 900 },
        colors: { body: '#5b6b8c', wing: '#42506e', belly: '#c8d2e8', beak: '#f5b83d', eye: '#ffe066', outline: '#1c2333' },
        bulletColor: '#aee6ff',     // 羽刃=闪电蓝
        trailColor: null            // 无尾迹
      },
      { // Ch2 沙暴巨鹰：4发/3.5s → 6发/2.2s，弹速 5.0→6.0；冲锋 CD10s；召唤浮游×1/15s（追踪压力替代数量）；
        // 配色 #c98f3f + 沙粒尾迹；弹幕视觉为沙锥
        name: '沙暴巨鹰',
        gatherText: '沙暴逼近……',
        p1: { volley: 4, volleyInterval: 210, bulletSpeed: 5.0 },
        p2: { volley: 6, volleyInterval: 132, bulletSpeed: 6.0 },
        chargeCD: 600,
        summon: { type: 'floater', count: 1, interval: 900 },
        colors: { body: '#c98f3f', wing: '#a8742c', belly: '#e8c98a', beak: '#8a5a1e', eye: '#fff3d6', outline: '#5e3f14' },
        bulletColor: '#e0aa5e',     // 沙锥
        trailColor: '224, 170, 94'  // 沙粒尾迹
      }
      // [v1.6.0 占位] Ch3 暗夜巨鹰 HP60（+每轮1发弱追踪弹，复用 Missile.TURN_RATE）；
      // Ch4 霜羽巨鹰 HP80（弹幕过中线分裂为2，冲锋 CD8s，召唤 浮游×1+蝙蝠×1）
    ]
  },

  // ==================== 云朵参数 ====================
  CLOUD: {
    COUNT: 4,
    MIN_Y: 30,
    MAX_Y_RATIO: 0.4,
    MIN_SIZE: 20,
    MAX_SIZE: 50,
    MIN_SPEED: 0.3,
    MAX_SPEED: 0.8
  }
}
