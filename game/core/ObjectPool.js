/**
 * ObjectPool.js - 对象池
 * 
 * 复用对象，减少GC压力。适用于管道、经验球、粒子等频繁创建/销毁的实体。
 * 迭代2起将大量使用。
 */

class ObjectPool {
  /**
   * @param {Function} factory - 创建对象的工厂函数
   * @param {Function} resetFn - 重置对象状态的函数 (obj, ...args) => void
   * @param {number} initialSize - 初始池大小
   */
  constructor(factory, resetFn, initialSize = 0) {
    this.factory = factory
    this.resetFn = resetFn
    this.pool = []
    this.active = []

    // 预填充
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory())
    }
  }

  /**
   * 从池中获取一个对象
   * @param {...any} args - 传递给 resetFn 的参数
   * @returns {Object} 可用对象
   */
  acquire(...args) {
    let obj
    if (this.pool.length > 0) {
      obj = this.pool.pop()
    } else {
      obj = this.factory()
    }
    this.resetFn(obj, ...args)
    this.active.push(obj)
    return obj
  }

  /**
   * 回收对象到池中
   * @param {Object} obj - 要回收的对象
   */
  release(obj) {
    const index = this.active.indexOf(obj)
    if (index !== -1) {
      this.active.splice(index, 1)
      this.pool.push(obj)
    }
  }

  /**
   * 回收所有活跃对象
   */
  releaseAll() {
    while (this.active.length > 0) {
      this.pool.push(this.active.pop())
    }
  }

  /**
   * 遍历所有活跃对象
   * @param {Function} fn - (obj, index) => void
   */
  forEach(fn) {
    for (let i = 0; i < this.active.length; i++) {
      fn(this.active[i], i)
    }
  }

  /**
   * 过滤并回收不满足条件的对象
   * @param {Function} predicate - (obj) => boolean，返回false则回收
   */
  filter(predicate) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      if (!predicate(this.active[i])) {
        this.release(this.active[i])
      }
    }
  }

  /**
   * 获取活跃对象数量
   */
  get count() {
    return this.active.length
  }

  /**
   * 清空池（释放内存）
   */
  clear() {
    this.pool = []
    this.active = []
  }
}

module.exports = ObjectPool
