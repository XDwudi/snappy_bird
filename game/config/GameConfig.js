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
    }
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
    MIRROR_SHOCK_CD: 180            // 冲击波触发CD(帧)=3s，防"反复破盾刷波"回路（硬刹车）
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
    TRAIL_LENGTH: 10       // 拖尾点数
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

    // [v1.1.3] 新能力权重倍率
    NEW_ABILITY_BONUS: 1.3,  // 未拥有能力权重额外乘数

    // [v1.2.2] N9 软保底：连续5次升级面板无稀有及以上卡时，下一面板保底1张稀有+
    PITY_THRESHOLD: 5
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
