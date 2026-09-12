/**
 * test_builds_v140.js - [v1.4.0] 批次2 构筑量化审计：§6.3 前 6 项指标验收
 *
 * 与 test_builds_sim.js 的关系：
 *   复用其 mock/驱动/定向选卡模式（真实 Game 主类 + 脚本化中等玩家 + LCG 同种子配对），
 *   但流派表换成 v1.4.0 验收口径——不修改任何既有 test 文件，本文件独立新增。
 *
 * 流派：
 *   1. turtle  天胡A·铁壁护盾流（§6.3 ② 满时长率口径，含超载神盾）
 *   2. pact    血契狂战流（§6.3 ④ 专项：血契+狂暴减半保险丝组合）
 *   3. fire    猎杀火力流（§6.3 ⑤ 专项：怪物资源化 R4 监控，用 game.monsterKills）
 *   4. random  普通·随机选卡（基线参考；§6.3 随机红线 60.5s 以 test_gameplay_sim 为准）
 *   5. weak    没胡·陷阱流（§6.3 ③；没胡池含 v1.4.0 新废卡：风暴之眼/时之晶/铁羽孤立拿/
 *              管道感知/先知/风暴骰子——先知只标不加战力、时之晶铁羽孤立拿零收益）
 *
 * 专项 force 机制（§6.3 ④⑤ 与 §8-R6 "专项 build 卡死" 要求）：
 *   血契/火力覆盖等 epic 卡在 55 卡池中出现率低，纯定向选卡可能 50 局都摸不到核心卡，
 *   导致"专项流派"名不副实。force 列表中的卡在该流派第一次升级时直接选定（复用
 *   test_builds_sim 裸奔局已验证的 selectAbility 不做面板校验的既有行为），
 *   保证被测组合一定成型；后续升级仍走面板优先级。force 仅用于专项流派定义卡。
 *
 * 输出末尾给出 §6.3 前 6 项达标表（实测值 vs 目标，逐项 PASS/FAIL）：
 *   ① 胡/不胡中位生存差 4-7 倍且 ≤5.5
 *   ② 铁壁护盾流满时长率 ≤55%
 *   ③ 没胡陷阱流中位生存 ≥68s
 *   ④ 血契狂战流：中位 80-140s，P75/P25 > 2，满时长率 ≤ 护盾流
 *   ⑤ 火力流怪物击杀 ≥ 其他流派均值 ×3（< 全流派均值 ×2 触发 R4 预案）
 *   ⑥ 随机基线中位 60-78s（红线 ≥60.5s，正式口径另跑 test_gameplay_sim --runs=50）
 *
 * 运行方式：
 *   node test/test_builds_v140.js                 # 默认每流派 50 局，seed=20240521
 *   node test/test_builds_v140.js --runs=100 --seed=42
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
// 公认"核心卡"（直接提升容错/经济/操作空间）——v1.4.0 扩充批次2 强卡，陷阱流兜底避开
const CORE_IDS = new Set([
  'toughness', 'bounce_shield', 'shield_burst', 'vitality', 'regeneration',
  'phoenix', 'physique', 'shrink_ray', 'agile', 'slow_world',
  'greed', 'magnet', 'exp_resonance', 'lucky', 'combo_heart', 'teleport', 'time_warp', 'ice_crystal',
  // [v1.4.0] 批次2 强卡
  'aegis_overdrive', 'echo_wing', 'blood_pact', 'hunter_mark',
  'missile_barrage', 'missile_storm', 'missile_link', 'enlightenment', 'phantom_edge'
])

const BUILDS = [
  {
    key: 'turtle',
    label: '天胡A·铁壁护盾流',
    // 护盾层数叠加 + 超载神盾(溢出转临时HP) + HP续航 + 复活 + 减伤窗口
    priority: ['toughness', 'bounce_shield', 'shield_burst', 'aegis_overdrive', 'vitality',
      'regeneration', 'phoenix', 'physique', 'ice_crystal', 'shrink_ray', 'agile', 'slow_world',
      'combo_heart', 'greed', 'magnet', 'exp_resonance', 'teleport', 'time_warp', 'lucky'],
    fallback: 'first'
  },
  {
    key: 'pact',
    label: '血契狂战流',
    // [v1.4.0] §6.3 ④ 专项：血契(maxHp-1换经验/得分/无敌) + 狂暴(持血契减半保险丝)
    // + 体魄/回响之翼/铁羽 抬容错；自愈/生存本能/铁喙 补续航与反杀
    force: ['blood_pact', 'berserk'],   // §8-R6：最危险组合必须强制成型卡死验证
    priority: ['blood_pact', 'berserk', 'physique', 'echo_wing', 'regeneration',
      'iron_feather', 'survivor_instinct', 'iron_beak', 'vitality', 'phoenix',
      'toughness', 'bounce_shield', 'greed', 'exp_resonance', 'combo_heart'],
    fallback: 'first'
  },
  {
    key: 'fire',
    label: '猎杀火力流',
    // [v1.4.0] §6.3 ⑤ 专项：火力覆盖(自动导弹) + 导弹架 + 猎手标记(加伤+连锁)
    // + 蜂群链路(叠层) + 导弹风暴(拾取连发) + 拾荒/补给线(弹药经济) + 磁吸(拾取半径)
    force: ['missile_barrage', 'hunter_mark'],
    priority: ['missile_barrage', 'missile_rack', 'hunter_mark', 'missile_link', 'missile_storm',
      'scavenger', 'supply_line', 'magnet', 'iron_beak', 'greed',
      // 防御兜底（火力流也要活命才能输出）
      'toughness', 'vitality', 'bounce_shield', 'phoenix', 'regeneration'],
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
    // 优先拿对生存几乎无帮助/情境受限/相互冲突/孤立拿零收益的卡
    // [v1.4.0] 没胡池含新卡：风暴之眼(单天气零收益)/时之晶(无时间扭曲不生效)/铁羽(无回响之翼不生效)/
    //           管道感知(纯信息)/先知(纯标注)/风暴骰子(驯化收益看天)
    priority: ['eye_of_storm', 'time_crystal', 'iron_feather', 'pipe_sense', 'oracle', 'chaos_dice',
      'wind_reader', 'double_score', 'storm_child', 'berserk', 'tailwind',
      'light_feather', 'climate_adapt', 'raincoat', 'wind_rider', 'double_jump'],
    fallback: 'avoid_core'
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
    monsterKills: 0,         // [v1.4.0] §6.3 ⑤ 火力流指标
    ownedAtEnd: {},
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
      // [v1.4.0] 专项 force：流派定义卡未持有时直接选定（保证被测组合成型，见文件头说明）
      let forced = null
      if (build.force) {
        for (const fid of build.force) {
          if (!(game.abilitySystem.owned.get(fid) > 0)) { forced = fid; break }
        }
      }
      const id = forced || pickAbility(build, game._currentChoices)
      if (!id) break
      game.selectAbility(id)
    }

    if (game.state === Config.GAME.STATE.PLAYING && !game.phoenixAnim) {
      pilotTick(game, pilot)
    }

    game.update()

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
  rec.monsterKills = game.monsterKills || 0
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

// ==================== 主流程 ====================
const t0 = Date.now()
const results = {}    // key → runs[]
for (const build of BUILDS) {
  results[build.key] = []
  for (let r = 0; r < RUNS; r++) results[build.key].push(runGame(build, r))
}
const elapsedMs = Date.now() - t0

const out = []
out.push('='.repeat(76))
out.push('  [v1.4.0] 批次2 构筑审计：§6.3 前 6 项指标验收')
out.push(`  每流派局数: ${RUNS}   seed: ${BASE_SEED}（各流派逐局同种子，可配对）  每局上限: ${MAX_SECONDS}s`)
out.push(`  模拟耗时: ${(elapsedMs / 1000).toFixed(1)}s   玩家模型: 间隙瞄准 + ${PILOT.FLAP_COOLDOWN}帧反应 + ${PILOT.MISS_CHANCE * 100}%漏拍`)
out.push('='.repeat(76))

// ---- 总览对比表 ----
out.push('\n【总览：生存时间与进度】')
out.push(pad('  流派', 16) + padL('均值s', 8) + padL('中位s', 8) + padL('P25', 7) + padL('P75', 7) +
  padL('过管均值', 9) + padL('等级均值', 9) + padL('击杀均值', 9) + padL('满时长局', 9) + padL('冰雹致死', 9))
const summary = {}
for (const build of BUILDS) {
  const runs = results[build.key]
  const surv = stats(runs.map(r => r.survivalSec))
  const pipes = stats(runs.map(r => r.pipesPassed))
  const kills = stats(runs.map(r => r.monsterKills))
  const lvMean = runs.reduce((a, r) => a + r.level, 0) / RUNS
  const full = runs.filter(r => r.deathCause === '存活到底').length
  const hail = runs.filter(r => r.hailDeath).length
  summary[build.key] = { surv, pipes, kills, lvMean, full, hail }
  out.push(pad('  ' + build.label, 16) + padL(fmt(surv.mean), 8) + padL(fmt(surv.median), 8) +
    padL(fmt(surv.p25, 0), 7) + padL(fmt(surv.p75, 0), 7) + padL(fmt(pipes.mean), 9) +
    padL(fmt(lvMean), 9) + padL(fmt(kills.mean), 9) + padL(`${full}/${RUNS}`, 9) +
    padL(`${hail} (${fmt(hail / RUNS * 100, 0)}%)`, 9))
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

// ==================== §6.3 前 6 项达标表 ====================
const S = summary
const medians = { turtle: S.turtle.surv.median, pact: S.pact.surv.median, fire: S.fire.surv.median }
const bestKey = ['turtle', 'pact', 'fire'].reduce((a, b) => medians[a] >= medians[b] ? a : b)
const bestMed = medians[bestKey]
const bestLabel = BUILDS.find(b => b.key === bestKey).label
const weakMed = S.weak.surv.median
const randMed = S.random.surv.median

// ① 胡/不胡中位生存差
const gapRatio = weakMed > 0 ? bestMed / weakMed : Infinity
const m1Pass = gapRatio >= 4 && gapRatio <= 5.5
// ② 铁壁护盾流满时长率
const turtleFullRate = S.turtle.full / RUNS
const m2Pass = turtleFullRate <= 0.55
// ③ 没胡陷阱流中位生存
const m3Pass = weakMed >= 68
// ④ 血契狂战流：中位 80-140s，P75/P25 > 2，满时长率 ≤ 护盾流
const pactMed = S.pact.surv.median
const pactSpread = S.pact.surv.p25 > 0 ? S.pact.surv.p75 / S.pact.surv.p25 : Infinity
const pactFullRate = S.pact.full / RUNS
const m4Pass = pactMed >= 80 && pactMed <= 140 && pactSpread > 2 && pactFullRate <= turtleFullRate
// ⑤ 火力流怪物击杀 ≥ 其他流派均值 ×3（< 全流派均值 ×2 触发 R4 预案）
const fireKills = S.fire.kills.mean
const otherKillsMean = (S.turtle.kills.mean + S.pact.kills.mean + S.random.kills.mean + S.weak.kills.mean) / 4
const allKillsMean = (fireKills + S.turtle.kills.mean + S.pact.kills.mean + S.random.kills.mean + S.weak.kills.mean) / 5
const m5Pass = fireKills >= otherKillsMean * 3
const m5R4 = fireKills < allKillsMean * 2   // R4 预案触发线
// ⑥ 随机基线（正式口径以 test_gameplay_sim --runs=50 为准，此处为本脚本同种子参考值）
const m6Pass = randMed >= 60.5 && randMed <= 78

out.push('\n' + '='.repeat(76))
out.push('【§6.3 前 6 项指标达标表】')
out.push(pad('  指标', 34) + padL('目标', 22) + padL('实测', 18) + '判定')
out.push('  ' + '-'.repeat(86))
out.push(pad(`  ① 胡/不胡中位生存差（${bestLabel} vs 没胡）`, 34) +
  padL('4-7 倍且 ≤5.5', 22) + padL(`${fmt(gapRatio, 1)} 倍`, 18) + (m1Pass ? '✅ PASS' : '❌ FAIL'))
out.push(pad('  ② 铁壁护盾流满时长率', 34) +
  padL('≤55%', 22) + padL(`${fmt(turtleFullRate * 100, 0)}% (${S.turtle.full}/${RUNS})`, 18) + (m2Pass ? '✅ PASS' : '❌ FAIL'))
out.push(pad('  ③ 没胡陷阱流中位生存', 34) +
  padL('≥68s', 22) + padL(`${fmt(weakMed)}s`, 18) + (m3Pass ? '✅ PASS' : '❌ FAIL（§8 预案见迭代报告）'))
out.push(pad('  ④ 血契狂战流中位生存', 34) +
  padL('80-140s', 22) + padL(`${fmt(pactMed)}s`, 18) + (pactMed >= 80 && pactMed <= 140 ? '✅ PASS' : '❌ FAIL'))
out.push(pad('  ④ 血契狂战流离散度 P75/P25', 34) +
  padL('>2', 22) + padL(fmt(pactSpread, 2), 18) + (pactSpread > 2 ? '✅ PASS' : '❌ FAIL'))
out.push(pad('  ④ 血契狂战流满时长率 ≤ 护盾流', 34) +
  padL(`≤${fmt(turtleFullRate * 100, 0)}%`, 22) + padL(`${fmt(pactFullRate * 100, 0)}%`, 18) + (pactFullRate <= turtleFullRate ? '✅ PASS' : '❌ FAIL'))
out.push(pad('  ⑤ 火力流怪物击杀 ≥ 其他流派均值×3', 34) +
  padL(`≥${fmt(otherKillsMean * 3)}`, 22) + padL(fmt(fireKills), 18) + (m5Pass ? '✅ PASS' : '❌ FAIL') +
  (m5R4 ? '  ⚠️ <全流派均值×2，触发 R4 预案' : ''))
out.push(pad('  ⑥ 随机基线中位（本脚本参考值）', 34) +
  padL('60-78s(红线≥60.5)', 22) + padL(`${fmt(randMed)}s`, 18) + (m6Pass ? '✅ PASS' : '❌ FAIL') +
  '（正式口径另跑 test_gameplay_sim）')
out.push('-'.repeat(76))
const allPass = m1Pass && m2Pass && m3Pass && m4Pass && m5Pass
out.push(allPass
  ? '  总判定：①-⑤ 全部达标（⑥ 以 test_gameplay_sim 正式回归为准）'
  : '  总判定：存在不达标项——按任务书要求如实报告，不擅自调参（§8 预案见迭代报告）')
out.push('='.repeat(76))

console.log(out.join('\n'))
process.exit(allPass ? 0 : 1)
