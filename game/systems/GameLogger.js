/**
 * GameLogger.js - 系统日志模块 [v1.1.2]
 *
 * 职责：
 * - 记录游戏运行各状态（初始化、状态切换、碰撞、能力触发、道具收集、升级等）
 * - 支持日志分级：DEBUG(0) / INFO(1) / WARN(2) / ERROR(3)
 * - 支持开关控制和按级别过滤
 * - 内存环形缓冲，可导出最近日志用于排查
 * - 同时输出到 console 便于开发者工具调试
 *
 * 用法：
 *   const logger = new GameLogger()
 *   logger.info('Game', '游戏开始', { score: 0 })
 *   logger.warn('Collision', '弹力护甲触发', { charges: 1 })
 *   logger.error('Ability', '能力未找到', { id: 'xxx' })
 *   logger.getRecentEntries(50)  // 获取最近50条
 *   logger.exportText()          // 导出文本格式
 */

// 日志级别常量
const LEVEL_DEBUG = 0
const LEVEL_INFO = 1
const LEVEL_WARN = 2
const LEVEL_ERROR = 3

const LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR']

class GameLogger {
  /**
   * @param {number} maxEntries - 最大缓存条数（环形缓冲）
   */
  constructor(maxEntries = 800) {
    this.entries = []
    this.maxEntries = maxEntries
    this.enabled = true
    this.minLevel = LEVEL_DEBUG  // 默认记录所有级别
    this._frameRef = 0           // 外部帧计数器引用
  }

  /**
   * 设置当前帧数（由 Game.js 每帧更新）
   */
  setFrame(frame) {
    this._frameRef = frame
  }

  /**
   * 设置最低记录级别
   * @param {number} level - 0=DEBUG, 1=INFO, 2=WARN, 3=ERROR
   */
  setLevel(level) {
    this.minLevel = level
  }

  /**
   * 内部写入
   */
  _log(level, tag, message, data) {
    if (!this.enabled || level < this.minLevel) return

    const entry = {
      t: Date.now(),
      frame: this._frameRef,
      level: level,
      levelStr: LEVEL_NAMES[level],
      tag: tag,
      message: message
    }

    if (data !== undefined) {
      try {
        // 安全序列化，避免循环引用
        entry.data = JSON.parse(JSON.stringify(data))
      } catch (e) {
        entry.data = String(data)
      }
    }

    this.entries.push(entry)

    // 环形缓冲：超出上限移除最旧的
    if (this.entries.length > this.maxEntries) {
      this.entries.shift()
    }

    // 同时输出到 console
    const consoleMsg = `[F${entry.frame}][${entry.levelStr}][${tag}] ${message}`
    if (level >= LEVEL_ERROR) {
      console.error(consoleMsg, data !== undefined ? data : '')
    } else if (level >= LEVEL_WARN) {
      console.warn(consoleMsg, data !== undefined ? data : '')
    } else {
      console.log(consoleMsg, data !== undefined ? data : '')
    }
  }

  // ==================== 公开方法 ====================

  debug(tag, message, data) {
    this._log(LEVEL_DEBUG, tag, message, data)
  }

  info(tag, message, data) {
    this._log(LEVEL_INFO, tag, message, data)
  }

  warn(tag, message, data) {
    this._log(LEVEL_WARN, tag, message, data)
  }

  error(tag, message, data) {
    this._log(LEVEL_ERROR, tag, message, data)
  }

  // ==================== 查询与导出 ====================

  /**
   * 获取最近的日志条目
   * @param {number} count - 条数
   * @param {number} [minLevel] - 最低级别过滤
   * @returns {Array}
   */
  getRecentEntries(count = 50, minLevel) {
    let result = this.entries
    if (minLevel !== undefined) {
      result = result.filter(e => e.level >= minLevel)
    }
    return result.slice(-count)
  }

  /**
   * 按 tag 过滤
   */
  getByTag(tag, count = 50) {
    return this.entries.filter(e => e.tag === tag).slice(-count)
  }

  /**
   * 导出为文本格式（便于复制排查）
   */
  exportText(count = 200) {
    const list = this.entries.slice(-count)
    return list.map(e => {
      let line = `[F${e.frame}][${e.levelStr}][${e.tag}] ${e.message}`
      if (e.data !== undefined) {
        try {
          line += ' ' + JSON.stringify(e.data)
        } catch (err) {
          line += ' [data serialize failed]'
        }
      }
      return line
    }).join('\n')
  }

  /**
   * 导出为完整日志字符串（用于 wx.setClipboardData）
   */
  exportAll() {
    return this.exportText(this.entries.length)
  }

  /**
   * 获取统计信息
   */
  getStats() {
    const counts = { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0 }
    for (const e of this.entries) {
      counts[e.levelStr]++
    }
    return {
      total: this.entries.length,
      ...counts
    }
  }

  /**
   * 清空日志
   */
  clear() {
    this.entries = []
  }
}

// 导出单例和类
const logger = new GameLogger()

module.exports = logger
module.exports.GameLogger = GameLogger
module.exports.LEVELS = { DEBUG: LEVEL_DEBUG, INFO: LEVEL_INFO, WARN: LEVEL_WARN, ERROR: LEVEL_ERROR }
