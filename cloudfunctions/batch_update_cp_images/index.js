// 批量更新 cp_templates 全部 66 条的 shareImage
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  try {
    const prefix = 'cloud://job-cpti-dev-d6g8x3zkb2ae306f8.6a6f-job-cpti-dev-d6g8x3zkb2ae306f8-1457130836'

    let updatedCount = 0
    let skippedCount = 0
    const failed = []

    // 生成全部 66 个 cpKey
    const allKeys = []
    for (let low = 1; low <= 11; low++) {
      for (let high = low; high <= 11; high++) {
        allKeys.push(`${low}_${high}`)
      }
    }

    // 分批并行
    const CHUNK = 10
    for (let i = 0; i < allKeys.length; i += CHUNK) {
      const batch = allKeys.slice(i, i + CHUNK)
      const results = await Promise.all(
        batch.map(cpKey =>
          db.collection('cp_templates')
            .where({ cpKey })
            .update({ data: { shareImage: `${prefix}/cp/${cpKey}.jpg` } })
            .then(res => ({ cpKey, updated: res.stats.updated || 0 }))
            .catch(err => ({ cpKey, error: err.message }))
        )
      )
      results.forEach(r => {
        if (r.error) failed.push(r.cpKey)
        else if (r.updated > 0) updatedCount++
        else skippedCount++
      })
    }

    return {
      code: 0,
      message: `更新 ${updatedCount} 条，跳过 ${skippedCount} 条（已相同），失败 ${failed.length} 条`,
      updatedCount,
      skippedCount,
      failed: failed.slice(0, 5)
    }
  } catch (err) {
    return { code: 5000, message: err.message }
  }
}