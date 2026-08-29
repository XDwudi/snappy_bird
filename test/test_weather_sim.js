/**
 * test_weather_sim.js - 环境系统触发率模拟测试
 * 用真实 WeatherSystem 跑 N 轮，统计触发情况
 * 运行: node test/test_weather_sim.js
 */
const WeatherSystem = require('../game/systems/WeatherSystem.js')
const Config = require('../game/config/GameConfig.js')

// 过滤 GameLogger 的逐条输出，只保留统计信息
const rawLog = console.log.bind(console)
console.log = (...args) => {
  const s = args.join(' ')
  if (s.startsWith('[F') || s.startsWith('[')) return
  rawLog(...args)
}

// 模拟 gameCtx
function makeGameCtx() {
  return {
    gameTime: 0,
    screenW: 375,
    screenH: 667,
    gravityModifier: 0,
    windScrollModifier: 0,
    bird: { x: 100, y: 300, velocity: 0, rotation: 0, width: 34, collisionScale: 1, wingFrame: 0 },
    abilities: {
      owned: new Map(),
      shieldLayers: 0,
      iceCrystalCD: 0,
      addShieldLayer(n) { this.shieldLayers += n },
      consumeShield() { this.shieldLayers = Math.max(0, this.shieldLayers - 1) }
    },
    addFloatingText() {}
  }
}

// 跑一轮 roundFrames 帧，记录每次触发（类型/时刻/时长）
function runRound(roundFrames) {
  const ws = new WeatherSystem()
  const ctx = makeGameCtx()
  const events = []
  let prevActive = 0
  for (let t = 1; t <= roundFrames; t++) {
    ctx.gameTime = t
    try {
      ws.update(t, ctx)
    } catch (e) {
      rawLog(`!!! 第${t}帧异常: ${e.message}`)
      throw e
    }
    const nowActive = ws.activeEffects.length
    if (nowActive > prevActive) {
      for (const e of ws.activeEffects.slice(prevActive)) {
        events.push({ type: e.type, startSec: Math.round(t / 60), durationSec: Math.round(e.duration / 60) })
      }
    }
    prevActive = nowActive
  }
  return events
}

const ROUNDS = 10
const ROUND_SECONDS = 300  // 每轮5分钟
const ROUND_FRAMES = ROUND_SECONDS * 60

rawLog('=== 环境系统触发率模拟测试 ===')
rawLog(`轮数: ${ROUNDS}，每轮: ${ROUND_SECONDS}s（${ROUND_FRAMES}帧）`)
rawLog(`配置: START_TIME=${Config.WEATHER.START_TIME / 60}s, CHECK_INTERVAL=${Config.WEATHER.CHECK_INTERVAL / 60}s, BASE=${Config.WEATHER.BASE_CHANCE}, MAX=${Config.WEATHER.MAX_CHANCE}\n`)

let totalTriggers = 0
const typeCount = { wind: 0, rain: 0, hail: 0 }
const firstTriggerSecs = []
const allGaps = []

for (let r = 1; r <= ROUNDS; r++) {
  const events = runRound(ROUND_FRAMES)
  totalTriggers += events.length
  for (const ev of events) typeCount[ev.type]++
  if (events.length > 0) firstTriggerSecs.push(events[0].startSec)
  for (let i = 1; i < events.length; i++) {
    allGaps.push(events[i].startSec - events[i - 1].startSec)
  }
  const evStr = events.map(e => `${e.type}@${e.startSec}s(${e.durationSec}s)`).join(' ')
  rawLog(`第${r}轮: ${events.length}次触发 ${evStr || '(无触发)'}`)
}

rawLog('\n=== 统计 ===')
rawLog(`总触发次数: ${totalTriggers}（平均 ${(totalTriggers / ROUNDS).toFixed(1)} 次/轮）`)
rawLog(`类型分布: 风=${typeCount.wind} 雨=${typeCount.rain} 冰雹=${typeCount.hail}`)
if (firstTriggerSecs.length > 0) {
  rawLog(`首次触发平均: ${Math.round(firstTriggerSecs.reduce((a, b) => a + b, 0) / firstTriggerSecs.length)}s（最早${Math.min(...firstTriggerSecs)}s，最晚${Math.max(...firstTriggerSecs)}s）`)
} else {
  rawLog('!!! 10轮均未触发 !!!')
}
if (allGaps.length > 0) {
  allGaps.sort((a, b) => a - b)
  rawLog(`相邻触发间隔: 平均${Math.round(allGaps.reduce((a, b) => a + b, 0) / allGaps.length)}s，中位数${allGaps[Math.floor(allGaps.length / 2)]}s，最短${allGaps[0]}s，最长${allGaps[allGaps.length - 1]}s`)
}
