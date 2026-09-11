/**
 * test_builds_sim.js - Roguelike 构筑量化审计：「胡了 vs 没胡」难度差
 *
 * 用途：
 *   复用 test_gameplay_sim.js 的 mock/驱动模式（真实 Game 主类 + 脚本化中等玩家），
 *   但升级时不再随机选卡，而是按预设优先级列表"定向构筑"，强制形成特定流派：
 *     1. 天胡A「铁壁护盾流」: 坚韧→弹力护盾→护盾爆发→活力之心→自愈→凤凰→体魄…
 *        （叠最大护盾层数+快速回盾+HP续航+复活，直接堆容错）
 *     2. 天胡B「风暴经济流」: 风暴之子→御风者→冰晶护体→贪婪→磁吸→经验共鸣→幸运…
 *        （天气期间全属性加成+经济滚雪球，注意刻意不拿顺风耳——它与御风者冲突）
 *     3. 普通局「随机选卡」: 基线（与 test_gameplay_sim.js 相同策略）
 *     4. 没胡局「陷阱流」: 优先拿弱/鸡肋卡（顺风耳/双倍积分/风暴之子孤立拿/狂暴/
 *        顺风/轻羽/气候适应/雨衣/御风者孤立拿/二段跳），兜底也尽量避开核心卡
 *     5. 裸奔局「拒绝成长」: 升级时选择无效 id——利用 Game.selectAbility 对
 *        abilitySystem 未识别的 id 也会照常 consumeLevelUp 的既有行为，
 *        等效于"放弃本次升级"，从而实现全程不拿任何能力
 *
 * 对比指标：生存时间分布、管道通过数、30s 段死亡率曲线、天气(冰雹)致死占比、
 *           以及基于随机局 60s 快照的"能力→存活"相关性（识别必拿核心/陷阱卡）。
 *
 * 运行方式：
 *   node test/test_builds_sim.js                 # 默认每流派 50 局，seed=20240521
 *   node test/test_builds_sim.js --runs=100 --seed=42
 *
 * 模拟假设：
 *   - 与 test_gameplay_sim.js 相同：只驱动 update() 逻辑帧、全空 mock canvas/ctx、
 *     LCG 替换 Math.random（各流派使用完全相同的逐局种子，结果可配对比较）。
 *   - 定向选卡：优先级列表中第一个出现在当前选项里的卡被选；都不在则按各流派的
 *     fallback 策略（天胡=取第一个选项；陷阱=避开核心卡随机；裸奔=无效id浪费升级）。
 *   - 注意：本脚本跑的是磁盘上的当前代码；若与 test_gameplay_sim.js 历史结果
 *     有出入（如 v1.2.1 并行修复改了配置），以当前代码为准。
 */

const Game = require('../game/core/Game.js')
const Config = require('../game/config/GameConfig.js')
const Logger = require('../game/systems/GameLogger.js')
const AbilityDefs = require('../game/config/AbilityConfig.js')

Logger.enabled = false

const ABILITY_NAME = {}
for (const ab of AbilityDefs) ABILITY_NAME[ab.id] = ab.name

// ==================== 参数 ====================
const ARGS = process.argv.slice(2)
function argNum(name, dft) {
  const a = ARGS.find(s => s.startsWith(`--${name}=`))
  return a ? Number(a.split('=')[1]) : dft
}
const RUNS = argNum('runs', 50)
const BASE_SEED = argNum('seed', 20240521)
const MAX_SECONDS = 300
const MAX_FRAMES = MAX_SECONDS * 60
const SCREEN_W = 375
const SCREEN_H = 667

// ==================== 构筑定义 ====================
// 公认的"核心卡"（直接提升容错/经济/操作空间），陷阱流兜底时避开它们
const CORE_IDS = new Set([
  'toughness', 'bounce_shield', 'shield_burst', 'vitality', 'regeneration',
  'phoenix', 'physique', 'shrink_ray', 'agile', 'slow_world',
  'greed', 'magnet', 'exp_resonance', 'lucky', 'combo_heart', 'teleport', 'time_warp', 'ice_crystal'
])

const BUILDS = [
  {
    key: 'turtle',
    label: '天胡A·铁壁护盾流',
    // 护盾层数叠加(坚韧+弹力+护盾爆发) + HP续航(活力+自愈) + 复活 + 减伤窗口
    priority: ['toughness', 'bounce_shield', 'shield_burst', 'vitality', 'regeneration',
      'phoenix', 'physique', 'ice_crystal', 'shrink_ray', 'agile', 'slow_world',
      'combo_heart', 'greed', 'magnet', 'exp_resonance', 'teleport', 'time_warp', 'lucky'],
    fallback: 'first'
  },
  {
    key: 'storm',
    label: '天胡B·风暴经济流',
    // 天气协同(风暴之子+御风者+冰晶) + 经济滚雪球(贪婪+磁吸+共鸣+幸运)；
    // 刻意排除顺风耳（减弱风力=削弱御风者收益，二者冲突）
    priority: ['storm_child', 'wind_rider', 'ice_crystal', 'greed', 'magnet',
      'exp_resonance', 'lucky', 'climate_adapt', 'raincoat', 'phoenix',
      'vitality', 'toughness', 'bounce_shield', 'shrink_ray', 'agile', 'slow_world'],
    fallback: 'first'
  },
  {
    key: 'random',
    label: '普通·随机选卡',
    priority: null,           // 纯随机（基线）
    fallback: 'random'
  },
  {
    key: 'weak',
    label: '没胡·陷阱流',
    // 优先拿对生存几乎无帮助/情境受限/相互冲突的卡；
    // 兜底时也避开核心卡（模拟"发牌员不给核心"的霉运局）
    priority: ['wind_reader', 'double_score', 'storm_child', 'berserk', 'tailwind',
      'light_feather', 'climate_adapt', 'raincoat', 'wind_rider', 'double_jump'],
    fallback: 'avoid_core'
  },
  {
    key: 'naked',
    label: '裸奔·拒绝成长',
    priority: [],             // 永远浪费升级（选无效 id）
    fallback: 'skip'
  }
]

// ==================== 确定性随机（LCG, Park-Miller） ====================
const realRandom = Math.random
function makeLcg(seed) {
  let s = (seed % 2147483646) + 1
  return function () {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ==================== Mock canvas / ctx / wx ====================
function makeMockCtx() {
  const noop = () => {}
  return new Proxy({}, {
    get(t, k) { return (k in t) ? t[k] : noop },
    set(t, k, v) { t[k] = v; return true }
  })
}
function makeMockCanvas() {
  return { width: SCREEN_W, height: SCREEN_H }
}
global.wx = global.wx || {
  getSystemInfoSync: () => ({ screenWidth: SCREEN_W, screenHeight: SCREEN_H, pixelRatio: 2, safeArea: null }),
  createCanvas: () => makeMockCanvas(),
  getStorageSync: () => '',
  setStorageSync: () => {},
  onTouchStart: () => {}
}

// ==================== 脚本化玩家（与 test_gameplay_sim.js 同参数） ====================
const PILOT = { FLAP_COOLDOWN: 9, THRESHOLD: 12, AIM_NOISE: 18, MISS_CHANCE: 0.03 }

function nextPipe(game) {
  const bird = game.bird
  let best = null
  for (const p of game.pipes) {
    if (p.x + p.width > bird.x - bird.collisionWidth / 2) {
      if (!best || p.x < best.x) best = p
    }
  }
  return best
}

function pilotTick(game, pilot) {
  if (game.frameCount - pilot.lastFlapFrame < PILOT.FLAP_COOLDOWN) return
  const bird = game.bird
  const pipe = nextPipe(game)
  let target = SCREEN_H * 0.45
  if (pipe) {
    if (pilot.aimPipe !== pipe) {
      pilot.aimPipe = pipe
      pilot.aimOffset = (Math.random() * 2 - 1) * PILOT.AIM_NOISE
    }
    target = pipe.topHeight + pipe.gap / 2 + pilot.aimOffset
  }
  if (bird.y > target + PILOT.THRESHOLD && bird.velocity > -3) {
    if (Math.random() < PILOT.MISS_CHANCE) return
    game.flap()
    pilot.lastFlapFrame = game.frameCount
  }
}

// ==================== 定向选卡 ====================
function pickAbility(build, choices) {
  if (build.fallback === 'skip') return '__skip__'   // 裸奔：浪费本次升级
  if (!choices || choices.length === 0) return null
  const ids = choices.map(c => c.id)
  if (build.priority) {
    for (const id of build.priority) {
      if (ids.includes(id)) return id
    }
  }
  switch (build.fallback) {
    case 'first': return ids[0]
    case 'avoid_core': {
      const nonCore = ids.filter(id => !CORE_IDS.has(id))
      const pool = nonCore.length > 0 ? nonCore : ids
      return pool[Math.floor(Math.random() * pool.length)]
    }
    case 'random':
    default:
      return ids[Math.floor(Math.random() * ids.length)]
  }
}

// ==================== 单局模拟 ====================
function runGame(build, runIndex) {
  Math.random = makeLcg(BASE_SEED + runIndex * 7919)   // 各流派同种子，可配对比较

  const game = new Game(makeMockCanvas(), makeMockCtx(), SCREEN_W, SCREEN_H, null)

  const rec = {
    survivalSec: 0,
    pipesPassed: 0,
    level: 1,
    deathCause: '存活到底',
    hailDeath: false,
    ownedAtEnd: {},          // id → level
    ownedAt60s: null,        // 60s 时的能力快照（Set），未满60s死亡则为死亡时快照
    weatherCount: 0
  }
  let pendingCause = null

  const origHandleCollision = game._handleCollision.bind(game)
  game._handleCollision = function (pipe) {
    if (pipe) {
      pendingCause = '撞管道'
    } else {
      const groundY = SCREEN_H - Config.GROUND.HEIGHT
      pendingCause = (game.bird.y > groundY - 60) ? '撞地面' : '撞天花板'
    }
    const dead = origHandleCollision(pipe)
    if (!dead) pendingCause = null
    return dead
  }
  const origGameOver = game._gameOver.bind(game)
  game._gameOver = function () {
    if (!pendingCause && game.weatherSystem.hasEffect('hail')) {
      rec.deathCause = '冰雹'
      rec.hailDeath = true
    } else {
      rec.deathCause = pendingCause || '其他'
    }
    origGameOver()
  }

  game.flap()   // READY → start + flap

  const pilot = { lastFlapFrame: -999, aimPipe: null, aimOffset: 0 }
  const seenWeather = new Set()
  let guard = 0

  for (let f = 0; f < MAX_FRAMES; f++) {
    if (game.state === Config.GAME.STATE.GAME_OVER) break

    guard = 0
    while (game.state === Config.GAME.STATE.UPGRADING && guard++ < 20) {
      const id = pickAbility(build, game._currentChoices)
      if (!id) break
      game.selectAbility(id)
    }

    if (game.state === Config.GAME.STATE.PLAYING && !game.phoenixAnim) {
      pilotTick(game, pilot)
    }

    game.update()

    // 60s 能力快照（用于"早拿到 X → 是否活更久"相关性分析）
    if (rec.ownedAt60s === null && game.gameTime >= 3600) {
      rec.ownedAt60s = new Set(game.abilitySystem.owned.keys())
    }

    for (const e of game.weatherSystem.activeEffects) {
      if (!seenWeather.has(e)) {
        seenWeather.add(e)
        rec.weatherCount++
      }
    }
  }

  rec.survivalSec = game.gameTime / 60
  rec.pipesPassed = game.pipesPassed
  rec.level = game.expSystem.level
  if (rec.ownedAt60s === null) rec.ownedAt60s = new Set(game.abilitySystem.owned.keys())
  for (const [id, lv] of game.abilitySystem.owned) rec.ownedAtEnd[id] = lv
  Math.random = realRandom
  return rec
}

// ==================== 统计工具 ====================
function percentile(sortedArr, p) {
  if (sortedArr.length === 0) return 0
  const idx = Math.min(sortedArr.length - 1, Math.floor(p * sortedArr.length))
  return sortedArr[idx]
}
function stats(arr) {
  if (arr.length === 0) return { mean: 0, median: 0, p25: 0, p75: 0, min: 0, max: 0 }
  const s = [...arr].sort((a, b) => a - b)
  return {
    mean: arr.reduce((a, b) => a + b, 0) / arr.length,
    median: percentile(s, 0.5),
    p25: percentile(s, 0.25),
    p75: percentile(s, 0.75),
    min: s[0],
    max: s[s.length - 1]
  }
}
function fmt(n, d = 1) { return Number(n).toFixed(d) }
function pad(s, w) { s = String(s); return s + ' '.repeat(Math.max(1, w - s.length)) }
function padL(s, w) { s = String(s); return ' '.repeat(Math.max(1, w - s.length)) + s }
function bar(ratio, width = 16) {
  const n = Math.round(ratio * width)
  return '█'.repeat(n) + '░'.repeat(Math.max(0, width - n))
}

// ==================== 主流程 ====================
const t0 = Date.now()
const results = {}    // key → runs[]
for (const build of BUILDS) {
  results[build.key] = []
  for (let r = 0; r < RUNS; r++) results[build.key].push(runGame(build, r))
}
const elapsedMs = Date.now() - t0

const out = []
out.push('='.repeat(72))
out.push('  Roguelike 构筑审计：「胡了 vs 没胡」难度差')
out.push(`  每流派局数: ${RUNS}   seed: ${BASE_SEED}（各流派逐局同种子，可配对）  每局上限: ${MAX_SECONDS}s`)
out.push(`  模拟耗时: ${(elapsedMs / 1000).toFixed(1)}s   玩家模型: 间隙瞄准 + ${PILOT.FLAP_COOLDOWN}帧反应 + ${PILOT.MISS_CHANCE * 100}%漏拍`)
out.push('='.repeat(72))

// ---- 总览对比表 ----
out.push('\n【总览：生存时间与进度】')
out.push(pad('  流派', 16) + padL('均值s', 8) + padL('中位s', 8) + padL('P25', 7) + padL('P75', 7) +
  padL('过管均值', 9) + padL('等级均值', 9) + padL('满时长局', 9) + padL('冰雹致死', 9))
const summary = {}
for (const build of BUILDS) {
  const runs = results[build.key]
  const surv = stats(runs.map(r => r.survivalSec))
  const pipes = stats(runs.map(r => r.pipesPassed))
  const lvMean = runs.reduce((a, r) => a + r.level, 0) / RUNS
  const full = runs.filter(r => r.deathCause === '存活到底').length
  const hail = runs.filter(r => r.hailDeath).length
  summary[build.key] = { surv, pipes, lvMean, full, hail }
  out.push(pad('  ' + build.label, 16) + padL(fmt(surv.mean), 8) + padL(fmt(surv.median), 8) +
    padL(fmt(surv.p25, 0), 7) + padL(fmt(surv.p75, 0), 7) + padL(fmt(pipes.mean), 9) +
    padL(fmt(lvMean), 9) + padL(`${full}/${RUNS}`, 9) + padL(`${hail} (${fmt(hail / RUNS * 100, 0)}%)`, 9))
}

// ---- 死因分布对比 ----
out.push('\n【死亡原因分布】')
const allCauses = new Set()
for (const build of BUILDS) for (const r of results[build.key]) allCauses.add(r.deathCause)
out.push(pad('  流派', 16) + [...allCauses].map(c => padL(c, 10)).join(''))
for (const build of BUILDS) {
  const runs = results[build.key]
  const dist = {}
  for (const r of runs) dist[r.deathCause] = (dist[r.deathCause] || 0) + 1
  out.push(pad('  ' + build.label, 16) + [...allCauses].map(c =>
    padL(dist[c] ? `${dist[c]} (${fmt(dist[c] / RUNS * 100, 0)}%)` : '-', 10)).join(''))
}

// ---- 30s 段死亡率曲线对比 ----
out.push('\n【30s 段条件死亡率曲线（段内死亡/段初存活）】')
const SEG = 30
const NS = MAX_SECONDS / SEG
out.push(pad('  时间段', 12) + BUILDS.map(b => padL(b.label.split('·')[0], 12)).join(''))
for (let s = 0; s < NS; s++) {
  const cells = []
  let anyAlive = false
  for (const build of BUILDS) {
    const runs = results[build.key]
    const aliveAtStart = runs.filter(r => r.survivalSec >= s * SEG).length
    const died = runs.filter(r =>
      r.deathCause !== '存活到底' && r.survivalSec >= s * SEG && r.survivalSec < (s + 1) * SEG).length
    if (aliveAtStart > 0) anyAlive = true
    cells.push(aliveAtStart > 0 ? padL(`${fmt(died / aliveAtStart * 100, 0)}% (${aliveAtStart})`, 12) : padL('-', 12))
  }
  if (!anyAlive) break
  out.push(pad(`  ${s * SEG}-${(s + 1) * SEG}s`, 12) + cells.join(''))
}

// ---- 各流派最终构筑画像 ----
out.push('\n【各流派能力持有画像（结束时平均等级 ≥0.5 的能力）】')
for (const build of BUILDS) {
  const runs = results[build.key]
  const acc = {}
  for (const r of runs) for (const [id, lv] of Object.entries(r.ownedAtEnd)) {
    acc[id] = acc[id] || { n: 0, lvSum: 0 }
    acc[id].n++; acc[id].lvSum += lv
  }
  const items = Object.entries(acc)
    .map(([id, v]) => ({ id, ownRate: v.n / RUNS, avgLv: v.lvSum / RUNS }))
    .filter(x => x.avgLv >= 0.5)
    .sort((a, b) => b.avgLv - a.avgLv)
  const str = items.map(x => `${ABILITY_NAME[x.id]}×${fmt(x.avgLv)}`).join(' ')
  out.push(`  ${build.label}: ${str || '(无)'}`)
}

// ---- 能力→存活相关性（随机局 60s 快照） ----
out.push('\n【能力相关性（随机基线局：60s 时已持有 vs 未持有的平均存活秒）】')
out.push('  注：60s 快照减轻"活得久所以拿得多"的生存者偏差，但样本有限，仅作方向性参考')
const randRuns = results.random
const corr = []
for (const ab of AbilityDefs) {
  const withAb = randRuns.filter(r => r.ownedAt60s.has(ab.id))
  const without = randRuns.filter(r => !r.ownedAt60s.has(ab.id))
  if (withAb.length < 5) continue   // 样本太少不评
  const mWith = withAb.reduce((a, r) => a + r.survivalSec, 0) / withAb.length
  const mWithout = without.length > 0 ? without.reduce((a, r) => a + r.survivalSec, 0) / without.length : 0
  corr.push({ id: ab.id, n: withAb.length, mWith, mWithout, diff: mWith - mWithout })
}
corr.sort((a, b) => b.diff - a.diff)
out.push(pad('  能力', 12) + padL('60s持有率', 10) + padL('持有均活s', 10) + padL('未持均活s', 10) + padL('差值s', 8) + '  评价')
for (const c of corr) {
  out.push(pad('  ' + ABILITY_NAME[c.id], 12) + padL(`${c.n}/${RUNS}`, 10) + padL(fmt(c.mWith), 10) +
    padL(fmt(c.mWithout), 10) + padL(fmt(c.diff, 0), 8) + '  ' + bar(Math.min(1, Math.max(0, (c.diff + 60) / 120)), 14))
}

// ==================== 结论 ====================
out.push('\n【结论】')
const S = summary
const turtleMed = S.turtle.surv.median, weakMed = S.weak.surv.median
const randMed = S.random.surv.median, nakedMed = S.naked.surv.median
const stormMed = S.storm.surv.median
const gapRatio = weakMed > 0 ? turtleMed / weakMed : Infinity
const bestMed = Math.max(turtleMed, stormMed)
const bestKey = turtleMed >= stormMed ? 'turtle' : 'storm'

out.push(`  ① 胡与不胡的差距：最强流派(${BUILDS.find(b => b.key === bestKey).label})中位生存 ${fmt(bestMed)}s，` +
  `没胡 ${fmt(weakMed)}s，差距 ${fmt(gapRatio, 1)} 倍（vs 随机基线 ${fmt(randMed)}s、裸奔 ${fmt(nakedMed)}s）。` +
  (gapRatio >= 3 && gapRatio <= 12 && weakMed >= randMed * 0.5
    ? '天胡显著更久、没胡也未秒崩（中位数仍有相当存活），构筑差距处于 roguelike 健康区间。'
    : gapRatio > 12 ? '差距过大：构筑几乎完全决定生死，操作技术权重过低，没胡局体验接近"等死"。'
    : gapRatio < 3 ? '差距过小：胡了的获得感不足，roguelike 构筑动力弱。'
    : '没胡局中位生存偏低，存在"没胡就秒崩"的挫败风险。'))

const cores = corr.filter(c => c.diff >= 30).map(c => ABILITY_NAME[c.id])
const traps = corr.filter(c => c.diff <= -20).map(c => ABILITY_NAME[c.id])
out.push(`  ② 必拿核心 vs 陷阱卡（随机局60s快照相关性）：` +
  `强正相关(${cores.length > 0 ? cores.join('、') : '无显著'})；` +
  `负相关(${traps.length > 0 ? traps.join('、') : '无显著'})。` +
  `铁壁护盾流中位 ${fmt(turtleMed)}s vs 风暴经济流 ${fmt(stormMed)}s——` +
  (turtleMed > stormMed * 1.3 ? '直接容错(护盾/HP/复活)收益明显强于天气协同，天气流受"天气覆盖率"天花板限制。'
    : stormMed > turtleMed * 1.3 ? '天气协同+经济滚雪球收益超过直接容错，风暴之子在天气高频下是隐藏核心。'
    : '两条路线强度接近，构筑多样性尚可。'))

const turtleLateDeath = (() => {
  const runs = results[bestKey]
  const alive120 = runs.filter(r => r.survivalSec >= 120).length
  const diedPost = runs.filter(r => r.deathCause !== '存活到底' && r.survivalSec >= 120).length
  return alive120 > 0 ? diedPost / alive120 : 0
})()
out.push(`  ③ 难度曲线适配：最强流派 ${S[bestKey].full}/${RUNS} 局打满 300s，120s 后死亡率 ${fmt(turtleLateDeath * 100, 0)}%；` +
  `没胡局 P25 仅 ${fmt(S.weak.surv.p25, 0)}s。` +
  (S[bestKey].full > RUNS * 0.3 ? '对天胡玩家后期明显过易（能力成型后难度封顶，缺乏终局压力）；' : '天胡局仍有可观后期风险；') +
  (S.weak.surv.p25 < 45 ? '对没胡玩家前期过难（1/4 的局 45s 内结束），建议给连续未获核心卡的玩家软性保底（如提高核心卡权重/保底重掷）。' : '没胡局前期压力尚在可接受范围。'))

out.push(`  ④ 天气致死：冰雹致死占比 天胡A=${fmt(S.turtle.hail / RUNS * 100, 0)}% 天胡B=${fmt(S.storm.hail / RUNS * 100, 0)}% ` +
  `随机=${fmt(S.random.hail / RUNS * 100, 0)}% 没胡=${fmt(S.weak.hail / RUNS * 100, 0)}% 裸奔=${fmt(S.naked.hail / RUNS * 100, 0)}%。` +
  (S.storm.hail <= S.random.hail ? '风暴流(冰晶护体+气候适应)有效对冲了冰雹威胁，天气协同设计成立。'
    : '天气流并未降低冰雹致死，冰晶护体/气候适应的对冲价值存疑。'))

out.push('\n' + '='.repeat(72))
console.log(out.join('\n'))
