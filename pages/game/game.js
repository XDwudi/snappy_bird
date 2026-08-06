// pages/game/game.js - 游戏页面
const Game = require('../../game/core/Game.js')
const Storage = require('../../utils/Storage.js')

Page({
  data: {
    score: 0,
    bestScore: 0,
    gameState: 'ready',      // ready | playing | gameover
    showGameOver: false,
    finalScore: 0,
    showScore: false,
    isNewRecord: false
  },

  game: null,
  canvas: null,

  onLoad() {
    this.setData({
      bestScore: Storage.getBestScore()
    })
  },

  onReady() {
    this._initCanvas()
  },

  /**
   * 初始化 Canvas 2D 并启动游戏引擎
   */
  _initCanvas() {
    const query = wx.createSelectorQuery()
    query.select('#gameCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0]) {
          console.error('Canvas 节点未找到')
          return
        }

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getSystemInfoSync().pixelRatio

        // 设置 Canvas 实际像素尺寸（DPR适配）
        canvas.width = res[0].width * dpr
        canvas.height = res[0].height * dpr
        ctx.scale(dpr, dpr)

        const screenW = res[0].width
        const screenH = res[0].height

        this.canvas = canvas

        // 创建游戏实例
        this.game = new Game(canvas, ctx, screenW, screenH)
        this.game.bestScore = Storage.getBestScore()

        // 绑定回调
        this.game.onScoreChange = (score) => {
          this.setData({ score })
        }

        this.game.onGameOver = (score, bestScore) => {
          const isNew = score > 0 && score >= bestScore
          Storage.saveBestScore(bestScore)
          this.setData({
            gameState: 'gameover',
            showGameOver: true,
            showScore: false,
            finalScore: score,
            bestScore: bestScore,
            isNewRecord: isNew
          })
        }

        this.game.onReady = () => {
          this.setData({
            gameState: 'ready',
            showGameOver: false,
            showScore: false,
            score: 0
          })
        }

        // 启动游戏循环（准备态）
        this.game.loop()
      })
  },

  /**
   * 容器触摸——拍翅
   */
  onContainerTouch() {
    if (!this.game) return

    if (this.data.gameState === 'ready') {
      this.game.flap()
      this.setData({
        gameState: 'playing',
        showScore: true
      })
    } else if (this.data.gameState === 'playing') {
      this.game.flap()
    }
    // gameover 状态由遮罩层拦截，不会到这里
  },

  /**
   * 阻止触摸穿透（游戏结束遮罩）
   */
  preventTouch() {
    // 空函数，仅用于 catchtouchstart 阻止冒泡
  },

  /**
   * 再来一局
   */
  onRestart() {
    this.game.restart()
    this.setData({
      gameState: 'playing',
      showGameOver: false,
      showScore: true,
      score: 0,
      isNewRecord: false
    })
  },

  /**
   * 返回首页
   */
  onBackHome() {
    if (this.game) {
      this.game.destroy()
      this.game = null
    }
    wx.navigateBack()
  },

  onUnload() {
    if (this.game) {
      this.game.destroy()
      this.game = null
    }
  }
})
