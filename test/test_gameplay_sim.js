/**
 * test_gameplay_sim.js - 好玩性模拟测试器（Flappy + Roguelike 整局模拟）
 *
 * 用途：
 *   用真实 Game 主类（game/core/Game.js）+ 脚本化"中等水平玩家"自动拍翅，
 *   跑 N 局完整游戏（默认 50 局，每局最长 300s 游戏时间），统计：
 *     1. 生存时间分布（均值/中位数/P25/P75）、管道通过数、达到等级分布
 *     2. 死亡原因统计（撞管道/撞地面/撞天花板/冰雹/其他）
 *     3. 首次天气触发时间分布、每局天气次数与类型分布
 *     4. 正反馈节奏：升级/道具/天气事件的 10s 桶时间轴密度
 *     5. 难度感知：每 30s 段条件死亡率（验证"60s 后难度停滞"审计结论）
 *   末尾输出 3-5 条基于数据的体验结论。
 *
 * 运行方式：
 *   node test/test_gameplay_sim.js              # 默认 50 局，seed=20240521
 *   node test/test_gameplay_sim.js --runs=100 --seed=42
 *
 * 模拟假设（重要）：
 *   - 只驱动 game.update() 逻辑帧（60fps），不调用 render()/loop()，
 *     canvas/ctx 用全空 mock，game/ 目录源码零改动（Game 本身无 wx 依赖）。
 *   - 确定性随机：每局用 seed+局号 初始化的 LCG 替换 Math.random
 *     （管道高度/道具/天气/能力抽卡全部走 Math.random，因此整局可复现）。
 *   - 脚本化玩家：瞄准备前方最近管道的间隙中心，低于目标阈值即调用 game.flap()
 *     （等价于 handleTouch 的拍翅路径，含二段跳判定）；带 ~0.15s 反应间隔、
 *     瞄准误差与少量漏拍，模拟"中等水平人类"。升级面板出现时随机选一张卡。
 *   - 死亡归因：实例级包装 _handleCollision/_gameOver（不改源码），
 *     冰雹致死通过 WeatherSystem.hasEffect('hail') 判定。
 *   - "游戏时间"按帧数/60 计，不含升级面板停留（真实游戏中升级时逻辑帧暂停）。
 */

const Game = require('../game/core/Game.js')
const Config = require('../game/config/GameConfig.js')
const Logger = require('../game/systems/GameLogger.js')

// 关闭游戏内逐帧日志（否则 90 万帧的日志序列化会拖慢模拟并刷屏）
Logger.enabled = false

// ==================== 参数 ====================
const ARGS = process.argv.slice(2)
function argNum(name, dft) {
  const a = ARGS.find(s => s.startsWith(`--${name}=`))
  return a ? Number(a.split('=')[1]) : dft
}
const RUNS = argNum('runs', 50)            // 局数
const BASE_SEED = argNum('seed', 20240521) // 基础随机种子
const MAX_SECONDS = 300                    // 每局游戏时间上限（秒）
const MAX_FRAMES = MAX_SECONDS * 60
const SCREEN_W = 375
const SCREEN_H = 667

// ==================== 确定性随机（LCG, Park-Miller） ====================
// 每局重置 Math.random 为独立种子序列，保证相同 seed 完全可复现
const realRandom = Math.random
function makeLcg(seed) {
  let s = (seed % 2147483646) + 1
  return function () {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ==================== Mock canvas / ctx / wx ====================
// Game 构造只需 canvas/ctx 占位；update() 路径不触碰 ctx。
// 用 Proxy 兜底：任何方法调用都是空操作，任何属性赋值都吞掉。
function makeMockCtx() {
  const noop = () => {}
  return new Proxy({}, {
    get(t, k) { return (k in t) ? t[k] : noop },
    set(t, k, v) { t[k] = v; return true }
  })
}
function makeMockCanvas() {
  return { width: SCREEN_W, height: SCREEN_H } // 不提供 requestAnimationFrame，loop 不会被启动
}
// game/ 源码无 wx 依赖；防御性打桩以防未来耦合
global.wx = global.wx || {
  getSystemInfoSync: () => ({ screenWidth: SCREEN_W, screenHeight: SCREEN_H, pixelRatio: 2, safeArea: null }),
  createCanvas: () => makeMockCanvas(),
  getStorageSync: () => '',
  setStorageSync: () => {},
  onTouchStart: () => {}
}

// ==================== 脚本化玩家（中等水平） ====================
const PILOT = {
  FLAP_COOLDOWN: 9,     // 最短拍翅间隔（帧），≈0.15s 反应时间
  THRESHOLD: 12,        // 低于目标高度这么多才拍（px）
  AIM_NOISE: 18,        // 瞄准误差幅度（px，按管道持续，模拟预判不准）
  MISS_CHANCE: 0.03     // 每帧漏拍概率（走神）
}

// 找到小鸟前方最近（最紧迫）的管道
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
      // 每个新管道重新抽一次瞄准误差（使用本局 LCG，保持确定性）
      pilot.aimPipe = pipe
      pilot.aimOffset = (Math.random() * 2 - 1) * PILOT.AIM_NOISE
    }
    target = pipe.topHeight + pipe.gap / 2 + pilot.aimOffset
  }
  // 低于目标且不是高速上升中 → 拍翅；偶发漏拍模拟走神
  if (bird.y > target + PILOT.THRESHOLD && bird.velocity > -3) {
    if (Math.random() < PILOT.MISS_CHANCE) return
    game.flap()
    pilot.lastFlapFrame = game.frameCount
  }
}

// ==================== 单局模拟 ====================
function runGame(runIndex) {
  Math.random = makeLcg(BASE_SEED + runIndex * 7919)

  const game = new Game(makeMockCanvas(), makeMockCtx(), SCREEN_W, SCREEN_H, null)

  const rec = {
    survivalSec: 0,
    pipesPassed: 0,
    level: 1,
    score: 0,
    deathCause: '存活到底',
    weatherEvents: [],      // {type, sec}
    levelUpTimes: [],       // 秒
    itemTimes: [],          // {type, sec}
    flapCount: 0
  }
  let pendingCause = null   // _handleCollision 传入的候选死因

  // ---- 实例级打桩（不碰 game/ 源码）：死因归因与事件采集 ----
  const origHandleCollision = game._handleCollision.bind(game)
  game._handleCollision = function (pipe) {
    if (pipe) {
      pendingCause = '撞管道'
    } else {
      const groundY = SCREEN_H - Config.GROUND.HEIGHT
      pendingCause = (game.bird.y > groundY - 60) ? '撞地面' : '撞天花板'
    }
    const dead = origHandleCollision(pipe)
    if (!dead) pendingCause = null   // 被护盾/HP/凤凰挡下，非最终死因
    return dead
  }
  const origGameOver = game._gameOver.bind(game)
  game._gameOver = function () {
    rec.deathCause = pendingCause ||
      (game.weatherSystem.hasEffect('hail') ? '冰雹' : '其他')
    origGameOver()
  }
  const origCollectItem = game._collectItem.bind(game)
  game._collectItem = function (item) {
    rec.itemTimes.push({ type: item.type, sec: game.gameTime / 60 })
    origCollectItem(item)
  }
  const origFlap = game.flap.bind(game)
  game.flap = function () { rec.flapCount++; origFlap() }

  // ---- 开局：READY 态拍翅 = start + flap ----
  game.flap()

  const pilot = { lastFlapFrame: -999, aimPipe: null, aimOffset: 0 }
  const seenWeather = new Set()
  let prevLevel = game.expSystem.level
  let guard = 0

  for (let f = 0; f < MAX_FRAMES; f++) {
    if (game.state === Config.GAME.STATE.GAME_OVER) break

    // 升级面板：随机选卡直到回到 PLAYING（多段 pending 升级链）
    guard = 0
    while (game.state === Config.GAME.STATE.UPGRADING && guard++ < 20) {
      const choices = game._currentChoices
      if (choices && choices.length > 0) {
        game.selectAbility(choices[Math.floor(Math.random() * choices.length)].id)
      } else {
        break // choices 为空时 _triggerLevelUp 已自动消化（allBuff 路径）
      }
    }

    if (game.state === Config.GAME.STATE.PLAYING && !game.phoenixAnim) {
      pilotTick(game, pilot)
    }

    game.update()

    // 升级事件采集
    if (game.expSystem.level > prevLevel) {
      for (let lv = prevLevel + 1; lv <= game.expSystem.level; lv++) {
        rec.levelUpTimes.push(game.gameTime / 60)
      }
      prevLevel = game.expSystem.level
    }

    // 天气事件采集（按效果对象引用去重）
    for (const e of game.weatherSystem.activeEffects) {
      if (!seenWeather.has(e)) {
        seenWeather.add(e)
        rec.weatherEvents.push({ type: e.type, sec: game.gameTime / 60 })
      }
    }
  }

  rec.survivalSec = game.gameTime / 60
  rec.pipesPassed = game.pipesPassed
  rec.level = game.expSystem.level
  rec.score = game.score
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
function bar(ratio, width = 20) {
  const n = Math.round(ratio * width)
  return '█'.repeat(n) + '░'.repeat(Math.max(0, width - n))
}

// ==================== 主流程 ====================
const t0 = Date.now()
const runs = []
for (let r = 0; r < RUNS; r++) runs.push(runGame(r))
const elapsedMs = Date.now() - t0

const out = []
out.push('='.repeat(64))
out.push('  好玩性模拟测试报告')
out.push(`  局数: ${RUNS}   seed: ${BASE_SEED}   每局上限: ${MAX_SECONDS}s   模拟耗时: ${(elapsedMs / 1000).toFixed(1)}s`)
out.push(`  玩家模型: 间隙中心瞄准 + ${PILOT.FLAP_COOLDOWN}帧反应间隔 + ${PILOT.MISS_CHANCE * 100}%漏拍`)
out.push('='.repeat(64))

// ---- 每局一览 ----
out.push('\n【每局一览】')
out.push(pad('局', 4) + pad('存活s', 8) + pad('过管', 6) + pad('等级', 6) + pad('天气', 6) + '死因')
for (let i = 0; i < runs.length; i++) {
  const r = runs[i]
  out.push(
    pad(i + 1, 4) + pad(fmt(r.survivalSec), 8) + pad(r.pipesPassed, 6) +
    pad(r.level, 6) + pad(r.weatherEvents.length, 6) + r.deathCause
  )
}

// ---- 1. 生存/过管/等级 ----
const surv = stats(runs.map(r => r.survivalSec))
const pipes = stats(runs.map(r => r.pipesPassed))
out.push('\n【1. 生存时间与进度分布】')
out.push(`  生存时间(s): 均值=${fmt(surv.mean)}  中位数=${fmt(surv.median)}  P25=${fmt(surv.p25)}  P75=${fmt(surv.p75)}  (最短${fmt(surv.min)} / 最长${fmt(surv.max)})`)
out.push(`  通过管道:    均值=${fmt(pipes.mean)}  中位数=${fmt(pipes.median)}  P25=${fmt(pipes.p25)}  P75=${fmt(pipes.p75)}`)
out.push(`  达到满时长(300s)局数: ${runs.filter(r => r.deathCause === '存活到底').length}/${RUNS}`)
const levelDist = {}
for (const r of runs) levelDist[r.level] = (levelDist[r.level] || 0) + 1
const maxLvCount = Math.max(...Object.values(levelDist))
out.push('  达到等级分布:')
for (const lv of Object.keys(levelDist).sort((a, b) => a - b)) {
  const c = levelDist[lv]
  out.push(`    Lv${pad(lv, 3)} ${bar(c / maxLvCount)} ${c}局 (${fmt(c / RUNS * 100, 0)}%)`)
}

// ---- 2. 死亡原因 ----
out.push('\n【2. 死亡原因统计】')
const causeDist = {}
for (const r of runs) causeDist[r.deathCause] = (causeDist[r.deathCause] || 0) + 1
for (const [cause, c] of Object.entries(causeDist).sort((a, b) => b[1] - a[1])) {
  out.push(`  ${pad(cause, 8)} ${bar(c / RUNS)} ${c}局 (${fmt(c / RUNS * 100, 0)}%)`)
}

// ---- 3. 天气 ----
out.push('\n【3. 天气触发】')
const firstWeather = runs.filter(r => r.weatherEvents.length > 0).map(r => r.weatherEvents[0].sec)
const weatherCounts = runs.map(r => r.weatherEvents.length)
const wTypeDist = {}
for (const r of runs) for (const e of r.weatherEvents) wTypeDist[e.type] = (wTypeDist[e.type] || 0) + 1
const zeroWeather = runs.filter(r => r.weatherEvents.length === 0).length
if (firstWeather.length > 0) {
  const fw = stats(firstWeather)
  out.push(`  首次触发时间(s): 均值=${fmt(fw.mean)}  中位数=${fmt(fw.median)}  P25=${fmt(fw.p25)}  P75=${fmt(fw.p75)}  (最早${fmt(fw.min)} / 最晚${fmt(fw.max)})`)
} else {
  out.push('  !!! 所有局均未触发天气 !!!')
}
out.push(`  每局天气次数: 均值=${fmt(stats(weatherCounts).mean)}  最多=${Math.max(...weatherCounts)}  零天气局=${zeroWeather}/${RUNS}`)
out.push(`  类型分布: 风=${wTypeDist.wind || 0}  雨=${wTypeDist.rain || 0}  冰雹=${wTypeDist.hail || 0}`)

// ---- 4. 正反馈节奏（10s 桶） ----
out.push('\n【4. 正反馈节奏（每 10s 桶内事件数，全局合计 / 平均每局）】')
const BUCKET = 10
const NB = MAX_SECONDS / BUCKET
const bLv = new Array(NB).fill(0), bItem = new Array(NB).fill(0), bWx = new Array(NB).fill(0)
for (const r of runs) {
  for (const t of r.levelUpTimes) if (t < MAX_SECONDS) bLv[Math.floor(t / BUCKET)]++
  for (const e of r.itemTimes) if (e.sec < MAX_SECONDS) bItem[Math.floor(e.sec / BUCKET)]++
  for (const e of r.weatherEvents) if (e.sec < MAX_SECONDS) bWx[Math.floor(e.sec / BUCKET)]++
}
out.push(pad('  时间段', 10) + pad('升级', 8) + pad('道具', 8) + pad('天气', 8) + '合计/局')
for (let b = 0; b < NB; b++) {
  const total = bLv[b] + bItem[b] + bWx[b]
  if (total === 0 && b > 0 && bLv.slice(b).every(v => v === 0) && bItem.slice(b).every(v => v === 0) && bWx.slice(b).every(v => v === 0)) break
  out.push(
    pad(`  ${b * BUCKET}-${(b + 1) * BUCKET}s`, 10) +
    pad(bLv[b], 8) + pad(bItem[b], 8) + pad(bWx[b], 8) +
    `${fmt(total / RUNS, 2)} ${bar(Math.min(1, total / RUNS / 3), 15)}`
  )
}

// ---- 5. 难度感知：30s 段条件死亡率 ----
out.push('\n【5. 难度感知（每 30s 段条件死亡率 = 段内死亡 / 段初存活）】')
const SEG = 30
const NS = MAX_SECONDS / SEG
out.push(pad('  时间段', 12) + pad('段初存活', 10) + pad('段内死亡', 10) + '死亡率')
for (let s = 0; s < NS; s++) {
  const aliveAtStart = runs.filter(r => r.survivalSec >= s * SEG).length
  const diedInSeg = runs.filter(r =>
    r.deathCause !== '存活到底' && r.survivalSec >= s * SEG && r.survivalSec < (s + 1) * SEG
  ).length
  if (aliveAtStart === 0) break
  const rate = diedInSeg / aliveAtStart
  out.push(
    pad(`  ${s * SEG}-${(s + 1) * SEG}s`, 12) + pad(aliveAtStart, 10) +
    pad(diedInSeg, 10) + `${fmt(rate * 100, 0)}% ${bar(rate, 20)}`
  )
}

// ---- 6. 体验结论（数据驱动） ----
out.push('\n【6. 体验结论】')
const conclusions = []

// 结论素材：前期 vs 后期危险度（60s 是速度/间隙增长封顶时间）
const aliveAt60 = runs.filter(r => r.survivalSec >= 60).length
const diedPre60 = runs.filter(r => r.deathCause !== '存活到底' && r.survivalSec < 60).length
const diedPost60 = runs.filter(r => r.deathCause !== '存活到底' && r.survivalSec >= 60).length
const pre60HazardPerMin = RUNS > 0 ? diedPre60 / RUNS : 0  // 第一分钟的死亡占比
const post60HazardPerMin = aliveAt60 > 0 ? diedPost60 / aliveAt60 / ((MAX_SECONDS - 60) / 60) : 0

conclusions.push(
  `① 生存曲线：中位生存 ${fmt(surv.median)}s，均值 ${fmt(surv.mean)}s；` +
  `${fmt(aliveAt60 / RUNS * 100, 0)}% 的局能活过 60s。` +
  (surv.median < 60 ? '多数局在前 1 分钟内结束，前期偏硬核，新手期容错值得检查（初始HP=' + Config.HP.INITIAL + '）。'
    : '整体存活时长对中等玩家较为友好。')
)

conclusions.push(
  `② 难度节奏：0-60s 段内死亡占全部局的 ${fmt(pre60HazardPerMin * 100, 0)}%；60s 后存活者每分钟死亡率约 ${fmt(post60HazardPerMin * 100, 1)}%。` +
  (post60HazardPerMin * 4 < pre60HazardPerMin
    ? `60s 后（速度+${Config.GAME.SPEED_RAMP_MAX}/间隙-${Config.GAME.GAP_RAMP_MAX}px 增长封顶）危险度明显走平甚至下降，"60s 后难度停滞"的审计结论在本模拟中成立——能力成型后缺乏持续加压机制。`
    : '60s 后死亡率未显著回落，天气概率随时间爬升（最高50%）提供了一定的后期压力。')
)

conclusions.push(
  `③ 天气系统：首次触发中位数 ${firstWeather.length > 0 ? fmt(stats(firstWeather).median) : '-'}s（配置 START_TIME=${Config.WEATHER.START_TIME / 60}s 起每 ${Config.WEATHER.CHECK_INTERVAL / 60}s 判定），每局平均 ${fmt(stats(weatherCounts).mean)} 次，${zeroWeather}/${RUNS} 局全程无天气。` +
  (zeroWeather > RUNS * 0.3 ? '超过三成局完全遇不到天气，v1.2.0 的核心新内容曝光率偏低，建议降低 START_TIME 或提高 BASE_CHANCE。' : '天气曝光率尚可。') +
  ((wTypeDist.hail || 0) > 0 && (causeDist['冰雹'] || 0) > 0 ? `冰雹直接致死 ${causeDist['冰雹'] || 0} 局（${fmt((causeDist['冰雹'] || 0) / RUNS * 100, 0)}%），作为不可控外部伤害存在挫败感风险。` : '')
)

const firstLv = runs.filter(r => r.levelUpTimes.length > 0).map(r => r.levelUpTimes[0])
const avgLevel = runs.reduce((a, r) => a + r.level, 0) / RUNS
conclusions.push(
  `④ 成长节奏：首次升级中位数 ${firstLv.length > 0 ? fmt(stats(firstLv).median) : '-'}s，平均每局达到 Lv${fmt(avgLevel)}、过管 ${fmt(pipes.mean)} 根。` +
  (firstLv.length > 0 && stats(firstLv).median > 45 ? '首次升级来得偏晚（>45s），roguelike 的"变强"钩子出现太慢，建议提高前期经验投放。'
    : '首次升级出现较快，前期正反馈及时。')
)

const itemTotal = runs.reduce((a, r) => a + r.itemTimes.length, 0)
conclusions.push(
  `⑤ 正反馈密度：全 ${RUNS} 局共 ${runs.reduce((a, r) => a + r.levelUpTimes.length, 0)} 次升级、${itemTotal} 次道具拾取、${runs.reduce((a, r) => a + r.weatherEvents.length, 0)} 次天气。` +
  `折算每局每分钟约 ${fmt((runs.reduce((a, r) => a + r.levelUpTimes.length + r.itemTimes.length + r.weatherEvents.length, 0)) / Math.max(1, runs.reduce((a, r) => a + r.survivalSec, 0)) * 60, 1)} 个正反馈事件。` +
  (itemTotal / RUNS < 2 ? '道具拾取偏少（磁吸范围有限+生成位置随机），可考虑让道具更靠近间隙中心生成。' : '道具投放密度合理。')
)

for (const c of conclusions) out.push('  ' + c)

out.push('\n' + '='.repeat(64))
console.log(out.join('\n'))
