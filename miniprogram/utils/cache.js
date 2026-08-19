// 本地缓存工具：内存 + storage 双层，支持版本号失效
// version 变更后旧缓存自动失效
const CACHE_VERSION = 'v3'

const memory = {}

function key(name) {
  return `${CACHE_VERSION}:${name}`
}

function getSync(name) {
  const k = key(name)
  if (memory[k] !== undefined) return memory[k]
  try {
    const v = wx.getStorageSync(k)
    if (v !== '' && v !== null && v !== undefined) {
      memory[k] = v
      return v
    }
  } catch (e) {}
  return null
}

function setSync(name, value) {
  const k = key(name)
  memory[k] = value
  try { wx.setStorageSync(k, value) } catch (e) {}
}

function remove(name) {
  const k = key(name)
  delete memory[k]
  try { wx.removeStorageSync(k) } catch (e) {}
}

// 移除所有以 prefix 开头的缓存项（如 'cp_result_'）
function removeByPrefix(prefix) {
  const fullPrefix = key(prefix)
  Object.keys(memory).forEach(k => { if (k.startsWith(fullPrefix)) delete memory[k] })
  try {
    const info = wx.getStorageInfoSync()
    ;(info.keys || []).forEach(k => {
      if (k.startsWith(fullPrefix)) { try { wx.removeStorageSync(k) } catch (e) {} }
    })
  } catch (e) {}
}

module.exports = { getSync, setSync, remove, removeByPrefix }
