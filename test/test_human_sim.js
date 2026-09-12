/**
 * test_human_sim.js - [v1.5.1] 拟人化难度测量器（真人玩家模型）
 *
 * 用途：
 *   test_gameplay_sim.js 的脚本玩家是"完美追线机器人"（反应 9 帧、瞄准 ±18px、
 *   漏拍 3%/帧），严重低估真人难度——真机反馈"前期容易暴毙"在机器人基线
 *   （中位 69.6s、前 30s 死亡率 2%）中完全不可见。
 *   本模拟器用"中等水平真人"校准假设重建玩家模型，作为 v1.5.1 难度调优的
 *   测量基准（先测后调，调参目标均以本模拟器 100 局实测为准）。
 *
 * 运行方式：
 *   node test/test_human_sim.js              # 默认 100 局，seed=20260151
 *   node test/test_human_sim.js --runs=100 --seed=42
 *
 * ==================== 真人玩家模型参数（"中等水平真人"校准假设） ====================
 *   校准口径：能稳定通过原版 Flappy 的前几根管道、会看间隙中心、
 *   但存在生理性反应延迟与偶发走神的普通玩家（非新手、非高手）。
 *
 *   REACTION_MIN/MAX_FRAMES = 8~14 帧（≈133~233ms）
 *     拍翅决策滞后：看到"该拍了"到手指落下的随机延迟。
 *     依据：简单视觉反应时间典型值 150~250ms，熟练玩家取偏快端。
 *   AIM_NOISE_MIN/MAX_PX = 15~30px
 *     跟踪误差：对间隙中心的瞄准偏差，每根新管道重抽一次（符号随机）。
 *     依据：667px 屏高中间隙约 180px，真人瞄准误差约间隙的 10~15%。
 *   OVERSHOOT_PX = 6~12px，每帧衰减 0.4px
 *     过冲后修正：拍翅后惯性上冲，玩家会刻意"等它多落一点"再补拍，
 *     建模为拍翅后目标高度临时下移（过冲量）再线性回归。
 *   ANTICIPATE = true
 *     前置预判：真人不是纯位置反馈的机器人，会预估"反应延迟内还要掉多少"
 *     提前决策。建模：用当前速度外推一个反应窗口（均值 11 帧）后的位置
 *     越过目标即决策拍翅。无此前置时纯滞后模型振幅 ~110px，必擦管道，
 *     不符合任何真人水平（校准实验：纯滞后中位仅 7.3s）。
 *   DAZE_CHANCE_PER_10S = 0.04（每 10s 约 4%，折算每帧 0.04/600）
 *   DAZE_MIN/MAX_FRAMES = 15~25 帧（0.25~0.42s）
 *     偶发失误"愣神"：期间不决策不拍翅，已排队的拍翅落空（玩家没按下去）。
 *     依据：真实游玩中看手机外消息/眨眼/手指移位导致的操作空窗。
 *
 * 其余模拟假设与 test_gameplay_sim.js 一致：
 *   - 只驱动 game.update() 逻辑帧（60fps），canvas/ctx 全空 mock，game/ 源码零改动。
 *   - 确定性随机：每局 seed+局号 的 LCG 替换 Math.random，整局可复现
 *     （玩家模型的随机也走同一 LCG，同源可复现）。
 *   - 升级面板随机选卡；死亡归因实例级打桩（不改源码）。
 *   - "游戏时间"按帧数/60 计，不含升级面板停留。
 */

const Game = require('../game/core/Game.js')
const Config = require('../game/config/GameConfig.js')
const Logger = require('../game/systems/GameLogger.js')

Logger.enabled = false

// ==================== 参数 ====================
const ARGS = process.argv.slice(2)
function argNum(name, dft) {
  const a = ARGS.find(s => s.startsWith(`--${name}=`))
  return a ? Number(a.split('=')[1]) : dft
}
const RUNS = argNum('runs', 100)           // 局数
const BASE_SEED = argNum('seed', 20260151) // 基础随机种子（与 gameplay_sim 区分族）
const MAX_SECONDS = 300                    // 每局游戏时间上限（秒）
const MAX_FRAMES = MAX_SECONDS * 60
const SCREEN_W = 375
const SCREEN_H = 667

// ==================== 确定性随机（LCG, Park-Miller） ====================
const realRandom = Math.random
function makeLcg(seed) {
  let s = (seed % 2147483646) + 1
  return function () {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

// ==================== Mock canvas / ctx / wx（与 gameplay_sim 同模式） ====================
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

// ==================== 真人玩家模型（中等水平，校准假设见文件头） ====================
const PILOT = {
  REACTION_MIN_FRAMES: 8,      // 拍翅反应延迟下限（帧）
  REACTION_MAX_FRAMES: 14,     // 拍翅反应延迟上限（帧）
  DECISION_COOLDOWN: 6,        // 最短决策间隔（帧），比拍翅 cooldown 更松
  THRESHOLD: 12,               // 低于目标高度这么多才决策拍翅（px）
  AIM_NOISE_MIN_PX: 15,        // 跟踪误差下限（px）
  AIM_NOISE_MAX_PX: 30,        // 跟踪误差上限（px）
  OVERSHOOT_MIN_PX: 6,         // 过冲修正下限（px）
  OVERSHOOT_MAX_PX: 12,        // 过冲修正上限（px）
  OVERSHOOT_DECAY: 0.4,        // 过冲量每帧衰减（px）
  DAZE_CHANCE_PER_10S: 0.04,   // 每 10s 愣神概率（≈4%）
  DAZE_MIN_FRAMES: 15,         // 愣神最短（帧）
  DAZE_MAX_FRAMES: 25          // 愣神最长（帧）
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

function newPilot() {
  return {
    lastDecisionFrame: -999,
    aimPipe: null,
    aimOffset: 0,
    overshoot: 0,            // 拍翅后的过冲修正量（px，逐帧衰减）
    pendingFlapFrame: -1,    // 已决策、待反应延迟到点执行的拍翅帧号（-1=无）
    dazedUntil: -1,          // 愣神截止帧（-1=未愣神）
    dazeCount: 0,            // 本局愣神次数（统计用）
    flapCount: 0
  }
}

function pilotTick(game, pilot) {
  const now = game.frameCount

  // ---- 愣神：不决策不操作；落在愣神窗内的排队拍翅落空（玩家没按下去） ----
  if (now < pilot.dazedUntil) {
    if (pilot.pendingFlapFrame >= 0 && pilot.pendingFlapFrame < pilot.dazedUntil) {
      pilot.pendingFlapFrame = -1
    }
    return
  }

  // ---- 执行到点的排队拍翅（反应延迟的体现） ----
  if (pilot.pendingFlapFrame >= 0 && now >= pilot.pendingFlapFrame) {
    pilot.pendingFlapFrame = -1
    game.flap()
    pilot.flapCount++
    // 过冲后修正：拍翅后玩家会等鸟多落一点再补拍 → 目标临时下移并逐帧回归
    pilot.overshoot = PILOT.OVERSHOOT_MIN_PX +
      Math.random() * (PILOT.OVERSHOOT_MAX_PX - PILOT.OVERSHOOT_MIN_PX)
  }

  // ---- 偶发愣神 roll（每帧 0.04/600 ≈ 每 10s 4%） ----
  if (Math.random() < PILOT.DAZE_CHANCE_PER_10S / 600) {
    pilot.dazedUntil = now + PILOT.DAZE_MIN_FRAMES +
      Math.floor(Math.random() * (PILOT.DAZE_MAX_FRAMES - PILOT.DAZE_MIN_FRAMES + 1))
    pilot.dazeCount++
    return
  }

  // ---- 决策（已有排队拍翅时不重复决策） ----
  if (pilot.pendingFlapFrame >= 0) return
  if (now - pilot.lastDecisionFrame < PILOT.DECISION_COOLDOWN) return

  const bird = game.bird
  const pipe = nextPipe(game)
  let target = SCREEN_H * 0.45
  if (pipe) {
    if (pilot.aimPipe !== pipe) {
      // 每根新管道重抽跟踪误差（符号随机，幅度 15~30px）
      pilot.aimPipe = pipe
      const mag = PILOT.AIM_NOISE_MIN_PX +
        Math.random() * (PILOT.AIM_NOISE_MAX_PX - PILOT.AIM_NOISE_MIN_PX)
      pilot.aimOffset = (Math.random() < 0.5 ? -1 : 1) * mag
    }
    target = pipe.topHeight + pipe.gap / 2 + pilot.aimOffset
  }
  // 过冲修正生效中：等效目标下移，模拟"过冲后刻意多等"
  target += pilot.overshoot
  if (pilot.overshoot > 0) pilot.overshoot = Math.max(0, pilot.overshoot - PILOT.OVERSHOOT_DECAY)

  // 前置预判：外推反应窗口（均值）后的落点越过目标即提前决策，
  // 拍翅实际落下时鸟恰好接近目标（真人会预估反应延迟内的下坠量）
  const R = (PILOT.REACTION_MIN_FRAMES + PILOT.REACTION_MAX_FRAMES) / 2
  const predictedY = bird.y + bird.velocity * R + 0.5 * Config.BIRD.GRAVITY * R * R
  if (predictedY > target + PILOT.THRESHOLD && bird.velocity > -3) {
    // 决策→执行之间隔 8~14 帧反应延迟
    pilot.pendingFlapFrame = now + PILOT.REACTION_MIN_FRAMES +
      Math.floor(Math.random() * (PILOT.REACTION_MAX_FRAMES - PILOT.REACTION_MIN_FRAMES + 1))
    pilot.lastDecisionFrame = now
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
    deathCause: '存活到底',
    deathSec: -1,
    dazeCount: 0,
    flapCount: 0
  }
  let pendingCause = null

  const origHandleCollision = game._handleCollision.bind(game)
  game._handleCollision = function (pipe) {
    if (pipe) {
      pendingCause = pipe.isBoss ? 'Boss本体' : (pipe.type === 'bat' || pipe.type === 'floater' ? '撞怪物' : '撞管道')
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
    rec.deathCause = pendingCause ||
      (game.weatherSystem.hasEffect('hail') ? '冰雹' : '其他')
    origGameOver()
  }

  game.flap() // READY 态拍翅 = start + flap

  const pilot = newPilot()
  for (let f = 0; f < MAX_FRAMES; f++) {
    if (game.state === Config.GAME.STATE.GAME_OVER) break

    // 升级面板：随机选卡直到回到 PLAYING
    let guard = 0
    while (game.state === Config.GAME.STATE.UPGRADING && guard++ < 20) {
      const choices = game._currentChoices
      if (choices && choices.length > 0) {
        game.selectAbility(choices[Math.floor(Math.random() * choices.length)].id)
      } else {
        break
      }
    }

    if (game.state === Config.GAME.STATE.PLAYING && !game.phoenixAnim) {
      pilotTick(game, pilot)
    }

    game.update()
  }

  rec.survivalSec = game.gameTime / 60
  rec.deathSec = rec.survivalSec
  rec.pipesPassed = game.pipesPassed
  rec.level = game.expSystem.level
  rec.dazeCount = pilot.dazeCount
  rec.flapCount = pilot.flapCount
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
function bar(ratio, width = 24) {
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
out.push('  拟人化难度测量报告（中等水平真人模型）')
out.push(`  局数: ${RUNS}   seed: ${BASE_SEED}   每局上限: ${MAX_SECONDS}s   模拟耗时: ${(elapsedMs / 1000).toFixed(1)}s`)
out.push(`  玩家模型: 反应${PILOT.REACTION_MIN_FRAMES}-${PILOT.REACTION_MAX_FRAMES}帧 + 瞄准±${PILOT.AIM_NOISE_MIN_PX}-${PILOT.AIM_NOISE_MAX_PX}px + 过冲${PILOT.OVERSHOOT_MIN_PX}-${PILOT.OVERSHOOT_MAX_PX}px + 愣神${PILOT.DAZE_CHANCE_PER_10S * 100}%/10s·${PILOT.DAZE_MIN_FRAMES}-${PILOT.DAZE_MAX_FRAMES}帧`)
out.push('='.repeat(64))

// ---- 1. 生存时间 ----
const surv = stats(runs.map(r => r.survivalSec))
out.push('\n【1. 生存时间】')
out.push(`  生存时间(s): 均值=${fmt(surv.mean)}  中位数=${fmt(surv.median)}  P25=${fmt(surv.p25)}  P75=${fmt(surv.p75)}  (最短${fmt(surv.min)} / 最长${fmt(surv.max)})`)
out.push(`  达到满时长(${MAX_SECONDS}s)局数: ${runs.filter(r => r.deathCause === '存活到底').length}/${RUNS}`)

// ---- 2. 早期死亡率（核心指标） ----
const diedPre30 = runs.filter(r => r.deathCause !== '存活到底' && r.survivalSec < 30).length
const diedPre60 = runs.filter(r => r.deathCause !== '存活到底' && r.survivalSec < 60).length
out.push('\n【2. 早期死亡率】')
out.push(`  前 30s 死亡率: ${diedPre30}/${RUNS} = ${fmt(diedPre30 / RUNS * 100)}%`)
out.push(`  前 60s 死亡率: ${diedPre60}/${RUNS} = ${fmt(diedPre60 / RUNS * 100)}%`)

// ---- 3. 死亡时间分布直方图（10s 桶） ----
out.push('\n【3. 死亡时间分布直方图（10s 桶）】')
const BUCKET = 10
const NB = Math.ceil(MAX_SECONDS / BUCKET)
const buckets = new Array(NB).fill(0)
for (const r of runs) {
  if (r.deathCause === '存活到底') continue
  const b = Math.min(NB - 1, Math.floor(r.survivalSec / BUCKET))
  buckets[b]++
}
const maxB = Math.max(...buckets, 1)
out.push(pad('  时间段', 12) + pad('死亡数', 8) + '分布')
for (let b = 0; b < NB; b++) {
  if (buckets[b] === 0 && buckets.slice(b).every(v => v === 0)) break
  out.push(
    pad(`  ${b * BUCKET}-${(b + 1) * BUCKET}s`, 12) + pad(buckets[b], 8) +
    `${bar(buckets[b] / maxB)} ${fmt(buckets[b] / RUNS * 100, 0)}%`
  )
}

// ---- 4. 常见死亡窗口（Top3 桶） ----
out.push('\n【4. 常见死亡窗口】')
const ranked = buckets.map((c, i) => ({ win: `${i * BUCKET}-${(i + 1) * BUCKET}s`, c }))
  .filter(x => x.c > 0).sort((a, b) => b.c - a.c).slice(0, 3)
for (const x of ranked) {
  out.push(`  ${x.win}: ${x.c} 局 (${fmt(x.c / RUNS * 100, 0)}%)`)
}

// ---- 5. 死亡原因 ----
out.push('\n【5. 死亡原因统计】')
const causeDist = {}
for (const r of runs) causeDist[r.deathCause] = (causeDist[r.deathCause] || 0) + 1
for (const [cause, c] of Object.entries(causeDist).sort((a, b) => b[1] - a[1])) {
  out.push(`  ${pad(cause, 8)} ${bar(c / RUNS)} ${c}局 (${fmt(c / RUNS * 100, 0)}%)`)
}

// ---- 6. 玩家行为统计 ----
const avgDaze = runs.reduce((a, r) => a + r.dazeCount, 0) / RUNS
const avgFlap = runs.reduce((a, r) => a + r.flapCount, 0) / RUNS
out.push('\n【6. 玩家行为统计（模型自洽性检查）】')
out.push(`  平均每局愣神 ${fmt(avgDaze)} 次（每 60s 约 ${fmt(avgDaze / Math.max(0.1, surv.mean) * 60, 1)} 次）、拍翅 ${fmt(avgFlap, 0)} 次`)
out.push(`  平均等级 Lv${fmt(runs.reduce((a, r) => a + r.level, 0) / RUNS)}、平均过管 ${fmt(runs.reduce((a, r) => a + r.pipesPassed, 0) / RUNS)} 根`)

out.push('\n' + '='.repeat(64))
console.log(out.join('\n'))

// 机器可读摘要（供调参脚本 diff）：MEDIAN/MEAN/PRE30/PRE60
console.log(`SUMMARY median=${fmt(surv.median)} mean=${fmt(surv.mean)} pre30=${fmt(diedPre30 / RUNS * 100)} pre60=${fmt(diedPre60 / RUNS * 100)} p25=${fmt(surv.p25)} p75=${fmt(surv.p75)}`)
