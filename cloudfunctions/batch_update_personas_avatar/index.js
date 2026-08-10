// 批量更新 personas 集合 avatarUrl
// 使用方法：传入 { "fileIdPrefix": "cloud://..." }，或留空自动使用默认 env 构造
// 如果不知道 fileIdPrefix，去云存储控制台右键任意一张图片 → 复制 fileID，把最后 "personas/1.jpg" 去掉就是前缀

const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  try {
    // 如果传了 fileIdPrefix 就用它，否则用硬编码的 env 构造
    let prefix = event.fileIdPrefix
    if (!prefix) {
      // 默认使用已知环境 ID 构造
      prefix = 'cloud://job-cpti-dev-d6g8x3zkb2ae306f8.6a6f-job-cpti-dev-d6g8x3zkb2ae306f8-1457130836'
    }

    let updatedCount = 0
    const results = []

    // 先查一下 personas 集合有多少条记录、字段类型是什么
    const sampleRes = await db.collection('personas').limit(3).get()
    console.log('personas 样本:', sampleRes.data)

    for (let i = 1; i <= 11; i++) {
      // 上传后的图片扩展名是 .jpeg
      const fileId = `${prefix}/personas/${i}.jpeg`

      try {
        // 兼容 personaId 是 Number 或 String 的情况
        const updateRes = await db.collection('personas')
          .where(_.or([
            { personaId: i },
            { personaId: String(i) }
          ]))
          .update({ data: { avatarUrl: fileId } })

        if (updateRes.stats.updated > 0) {
          updatedCount++
          results.push(`personaId ${i} → OK`)
        } else {
          results.push(`personaId ${i} → 数据库无此记录`)
        }
      } catch (e) {
        results.push(`personaId ${i} → 错误: ${e.message}`)
      }
    }

    return {
      code: 0,
      message: `完成，共更新 ${updatedCount} 条记录`,
      updatedCount,
      results
    }
  } catch (err) {
    return { code: 5000, message: err.message }
  }
}