/**
 * EventBus.js - 事件系统
 * 
 * 轻量级发布/订阅模式，用于游戏系统间解耦通信。
 * 迭代2起能力系统、经验系统将使用事件驱动。
 */

class EventBus {
  constructor() {
    this.listeners = {}
  }

  /**
   * 注册事件监听器
   * @param {string} event - 事件名
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消监听函数
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)

    // 返回取消监听函数
    return () => this.off(event, callback)
  }

  /**
   * 注册一次性事件监听器（触发后自动移除）
   */
  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper)
      callback(...args)
    }
    return this.on(event, wrapper)
  }

  /**
   * 移除事件监听器
   */
  off(event, callback) {
    if (!this.listeners[event]) return
    const index = this.listeners[event].indexOf(callback)
    if (index !== -1) {
      this.listeners[event].splice(index, 1)
    }
  }

  /**
   * 触发事件
   * @param {string} event - 事件名
   * @param {...any} args - 参数
   */
  emit(event, ...args) {
    if (!this.listeners[event]) return
    // 复制数组，防止回调中修改导致遍历异常
    const callbacks = this.listeners[event].slice()
    for (const cb of callbacks) {
      cb(...args)
    }
  }

  /**
   * 移除某事件的所有监听器（或所有事件）
   * @param {string} [event] - 指定事件名，不传则清空全部
   */
  clear(event) {
    if (event) {
      delete this.listeners[event]
    } else {
      this.listeners = {}
    }
  }
}

module.exports = EventBus
