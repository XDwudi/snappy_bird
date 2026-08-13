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
    SPAWN_INTERVAL: 90,     // 生成间隔（帧），90帧≈1.5s
    CAP_HEIGHT: 26,         // 管道帽高度
    CAP_OVERHANG: 4,        // 帽突出宽度
    MIN_TOP: 50,            // 顶部管道最小高度
    MIN_BOTTOM: 50          // 底部管道最小高度
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
    SCORE_SURVIVAL_INTERVAL: 300 // 存活时间得分间隔(帧)，300=5s
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
    SHRINK_ANIM_FRAMES: 30       // 缩小射线管道缩回动画帧数
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
      speed_pack: 15       // 速度包
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

    // 道具颜色
    COLORS: {
      exp_pack: '#9b59b6',
      health_pack: '#e74c3c',
      shield_pack: '#3498db',
      speed_pack: '#1abc9c'
    }
  },

  // ==================== 经验球参数 ====================
  ORB: {
    RADIUS: 8,             // 经验球半径
    BASE_SPEED: 3.0,       // 基础移动速度（跟随世界滚动）
    ATTRACT_RANGE: 60,     // 基础磁吸范围
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

    // [v1.1.3] 新能力权重倍率
    NEW_ABILITY_BONUS: 1.3  // 未拥有能力权重额外乘数
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
    START_TIME: 1800,          // 30s后开始可能触发
    CHECK_INTERVAL: 600,       // 每10秒检查一次
    BASE_CHANCE: 0.20,         // 基础概率20%
    MAX_CHANCE: 0.50,          // 最大概率50%（10分钟时）
    CHANCE_RAMP_TIME: 36000,   // 概率增长周期(10分钟=36000帧)
    TRIGGER_COOLDOWN: 600,     // 触发后冷却10s
    EFFECT_COOLDOWN: 1800,     // 同效果独立冷却30s
    MAX_SIMULTANEOUS: 2,       // 最多同时2种效果

    WIND: {
      MIN_DURATION: 900,       // 15s
      MAX_DURATION: 1800,      // 30s
      MAX_FORCE: 0.15,         // 最大风力 px/frame²
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
