// 检查 cp_templates 集合完整性，列出缺失的 cpKey

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  try {
    // 拉取所有已有记录
    const all = await db.collection('cp_templates').limit(100).get()
    const existingKeys = new Set(all.data.map(r => r.cpKey))
    
    const missing = []
    const existing = []
    
    for (let low = 1; low <= 11; low++) {
      for (let high = low; high <= 11; high++) {
        const cpKey = `${low}_${high}`
        if (existingKeys.has(cpKey)) {
          existing.push(cpKey)
        } else {
          missing.push(cpKey)
        }
      }
    }
    
    return {
      code: 0,
      message: `已有 ${existing.length} 条，缺 ${missing.length} 条`,
      total: 66,
      existingCount: existing.length,
      missingCount: missing.length,
      missing
    }
  } catch (err) {
    return { code: 5000, message: err.message }
  }
}