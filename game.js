/**
 * game.js — 小游戏入口
 *
 * 微信小游戏模式下，此文件为唯一入口。
 * 职责：初始化 Canvas、创建 Game 实例、注册触摸事件、启动游戏循环。
 * 所有 UI（主菜单 / 游戏HUD / 升级面板 / 结算）均由 Game.js 在 Canvas 上渲染。
 */

const Game = require('./game/core/Game.js')
const Storage = require('./utils/Storage.js')
const Logger = require('./game/systems/GameLogger.js')

// ===== 获取系统信息 =====
Logger.info('System', '小游戏初始化开始')
const systemInfo = wx.getSystemInfoSync()
const screenWidth = systemInfo.screenWidth
const screenHeight = systemInfo.screenHeight
const pixelRatio = systemInfo.pixelRatio
Logger.info('System', '系统信息', { screenWidth, screenHeight, pixelRatio, safeArea: systemInfo.safeArea })

// [v1.1.0] 获取安全区域（适配刘海屏/全面屏）
const safeArea = systemInfo.safeArea || null

// ===== 创建主画布 =====
const canvas = wx.createCanvas()
const ctx = canvas.getContext('2d')

// 设置画布尺寸为设备像素，并通过 ctx.scale 让逻辑坐标使用 CSS 像素
canvas.width = screenWidth * pixelRatio
canvas.height = screenHeight * pixelRatio
ctx.scale(pixelRatio, pixelRatio)

// ===== 创建游戏实例（传入安全区） =====
const game = new Game(canvas, ctx, screenWidth, screenHeight, safeArea)
game.bestScore = Storage.getBestScore()

// ===== 回调设置 =====
// 游戏结束：保存最高分
game.onGameOver = function (score, bestScore) {
  Storage.saveBestScore(bestScore)
}

// 以下回调在纯 Canvas 模式下无需额外处理（Game.js 内部自渲染）
game.onScoreChange = function () {}
game.onExpChange = function () {}
game.onLevelUp = function () {}
game.onReady = function () {}

// ===== 触摸事件 =====
wx.onTouchStart(function (e) {
  const touch = e.touches[0]
  if (!touch) return
  // clientX/clientY 为 CSS 像素，与 ctx.scale 后的逻辑坐标一致
  game.handleTouch(touch.clientX, touch.clientY)
})

// ===== 启动游戏循环 =====
Logger.info('System', '游戏循环启动')
game.loop()
