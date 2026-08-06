/**
 * MathUtil.js - 数学工具函数
 * 
 * 提供碰撞检测、随机数、插值等常用数学运算。
 */

/**
 * AABB 矩形碰撞检测
 * @param {Object} a - {x, y, width, height} 矩形A（左上角坐标）
 * @param {Object} b - {x, y, width, height} 矩形B（左上角坐标）
 * @returns {boolean} 是否碰撞
 */
function aabbCollision(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y
}

/**
 * 中心点坐标转左上角坐标
 * @param {number} cx - 中心X
 * @param {number} cy - 中心Y
 * @param {number} w - 宽度
 * @param {number} h - 高度
 * @returns {Object} {x, y, width, height} 左上角矩形
 */
function centerToRect(cx, cy, w, h) {
  return {
    x: cx - w / 2,
    y: cy - h / 2,
    width: w,
    height: h
  }
}

/**
 * 范围随机数
 * @param {number} min - 最小值（含）
 * @param {number} max - 最大值（不含）
 * @returns {number}
 */
function randomRange(min, max) {
  return min + Math.random() * (max - min)
}

/**
 * 范围随机整数
 * @param {number} min - 最小值（含）
 * @param {number} max - 最大值（含）
 * @returns {number}
 */
function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1))
}

/**
 * 线性插值
 * @param {number} a - 起点值
 * @param {number} b - 终点值
 * @param {number} t - 插值因子 [0, 1]
 * @returns {number}
 */
function lerp(a, b, t) {
  return a + (b - a) * t
}

/**
 * 限制值在范围内
 * @param {number} val - 当前值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number}
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val))
}

/**
 * 计算两点间距离
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
function distance(x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 圆形碰撞检测
 * @param {number} x1 - 圆A中心X
 * @param {number} y1 - 圆A中心Y
 * @param {number} r1 - 圆A半径
 * @param {number} x2 - 圆B中心X
 * @param {number} y2 - 圆B中心Y
 * @param {number} r2 - 圆B半径
 * @returns {boolean}
 */
function circleCollision(x1, y1, r1, x2, y2, r2) {
  return distance(x1, y1, x2, y2) < r1 + r2
}

module.exports = {
  aabbCollision,
  centerToRect,
  randomRange,
  randomInt,
  lerp,
  clamp,
  distance,
  circleCollision
}
