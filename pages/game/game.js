// pages/game/game.js - 游戏页面
const Game = require('../../game/core/Game.js')
const Storage = require('../../utils/Storage.js')

Page({
  data: {
    score: 0,
    bestScore: 0,
    gameState: 'ready',      // ready | playing | upgrading | gameover
    showGameOver: false,
    finalScore: 0,
    showScore: false,
    isNewRecord: false,
    finalLevel: 1,

    // 升级面板
    upgradeLevel: 1,
    abilityChoices: [],

    // 结算界面能力展示
    ownedAbilities: []
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

        canvas.width = res[0].width * dpr
        canvas.height = res[0].height * dpr
        ctx.scale(dpr, dpr)

        const screenW = res[0].width
        const screenH = res[0].height

        this.canvas = canvas

        // 创建游戏实例
        this.game = new Game(canvas, ctx, screenW, screenH)
        this.game.bestScore = Storage.getBestScore()

        // 分数变化
        this.game.onScoreChange = (score) => {
          this.setData({ score })
        }

        // 经验/等级变化（仅记录，HUD由Canvas渲染）
        this.game.onExpChange = () => {
          // 经验条由 Canvas HUD 直接绘制，无需 setData
        }

        // 升级触发
        this.game.onLevelUp = (choices, level, ownedList) => {
          // 构建卡牌数据
          const cardData = choices.map(ab => {
            const currentLevel = ownedList.find(o => o.def.id === ab.id)?.level || 0
            return {
              id: ab.id,
              icon: ab.icon,
              name: ab.name,
              desc: ab.desc,
              category: ab.category,
              currentLevel: currentLevel,
              effectText: ab.effectText(currentLevel + 1)
            }
          })

          this.setData({
            gameState: 'upgrading',
            upgradeLevel: level,
            abilityChoices: cardData
          })
        }

        // 游戏结束
        this.game.onGameOver = (score, bestScore, level, ownedList) => {
          const isNew = score > 0 && score >= bestScore
          Storage.saveBestScore(bestScore)

          // 转换已获得能力为展示数据
          const abilitiesData = ownedList.map(o => ({
            id: o.def.id,
            icon: o.def.icon,
            name: o.def.name,
            level: o.level
          }))

          this.setData({
            gameState: 'gameover',
            showGameOver: true,
            showScore: false,
            finalScore: score,
            bestScore: bestScore,
            isNewRecord: isNew,
            finalLevel: level,
            ownedAbilities: abilitiesData
          })
        }

        this.game.onReady = () => {
          this.setData({
            gameState: 'ready',
            showGameOver: false,
            showScore: false,
            score: 0,
            abilityChoices: [],
            ownedAbilities: []
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
  },

  /**
   * 阻止触摸穿透
   */
  preventTouch() {},

  /**
   * 选择能力
   */
  onSelectAbility(e) {
    const abilityId = e.currentTarget.dataset.id
    if (!abilityId || !this.game) return

    this.game.selectAbility(abilityId)

    // selectAbility 内部会处理连续升级：
    // - 如果还有 pendingLevelUp，会再次触发 onLevelUp 回调（已更新 abilityChoices）
    // - 否则恢复到 playing 状态
    if (this.game.state === 'playing') {
      this.setData({
        gameState: 'playing',
        abilityChoices: []
      })
    }
    // 如果是 'upgrading'，onLevelUp 回调已经更新了 abilityChoices
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
      isNewRecord: false,
      abilityChoices: [],
      ownedAbilities: []
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
