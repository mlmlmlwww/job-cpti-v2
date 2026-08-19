// cloudfunctions/backfill_dimensions/index.js
// 一次性运维工具：遍历 users 表，为已完成测试的用户回填 dimensionScores/dimensionMax
// 使用方式：在云开发控制台手动触发一次；或前端调用 { dryRun: true } 先预览
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const usersCollection = db.collection('users')
const questionsCollection = db.collection('questions')

const DIMENSION_NAMES = ['人品', '焦虑', '努力', '表演']

// 简单符号累加：+ 题贡献 +answer(1~5)，- 题贡献 -answer(-5~-1)
// 满格取 5 * 该维度题数
function calculateDimensions(answers, questions) {
  const scores = {}
  const max = {}
  DIMENSION_NAMES.forEach(n => { scores[n] = 0; max[n] = 0 })

  questions.forEach((q, i) => {
    const sd = q.surfaceDimension
    if (!sd || typeof sd !== 'string' || sd.length < 2) return
    const sign = sd.slice(-1)
    const name = sd.slice(0, -1)
    if (!DIMENSION_NAMES.includes(name)) return
    const ans = (answers && answers[i]) || 3
    const contrib = sign === '+' ? ans : -ans
    scores[name] += contrib
    max[name] += 5
  })

  return { dimensionScores: scores, dimensionMax: max }
}

exports.main = async (event) => {
  const dryRun = !!(event && event.dryRun)
  try {
    // 拉题库
    const qRes = await questionsCollection
      .where({ isActive: true })
      .orderBy('order', 'asc')
      .limit(100)
      .get()
    if (qRes.data.length === 0) return { code: 5001, message: '题库为空' }
    const questions = qRes.data

    // 分批拉所有已完成测试的用户（每页 100）
    let all = []
    let page = 0
    const pageSize = 100
    while (true) {
      const res = await usersCollection
        .where({ hasCompleted: true })
        .field({ openid: true, answers: true, dimensionScores: true })
        .skip(page * pageSize)
        .limit(pageSize)
        .get()
      all = all.concat(res.data)
      if (res.data.length < pageSize) break
      page++
      if (page > 200) break // 兜底：最多 2 万用户
    }

    const stats = { total: all.length, skippedNoAnswers: 0, skippedAlreadyHas: 0, updated: 0, errors: 0 }
    const samples = []

    // 先算好每个需要更新的用户
    const toUpdate = []
    for (const u of all) {
      if (!Array.isArray(u.answers) || u.answers.length === 0) {
        stats.skippedNoAnswers++
        continue
      }
      const dims = calculateDimensions(u.answers, questions)
      if (samples.length < 3) samples.push({ openid: u.openid, ...dims })
      toUpdate.push({ _id: u._id, dims })
    }

    if (dryRun) {
      return { code: 0, data: { dryRun, stats: { ...stats, wouldUpdate: toUpdate.length }, samples } }
    }

    // 并行写库，20 条一批（避免瞬时并发过高）
    const batchSize = 20
    for (let i = 0; i < toUpdate.length; i += batchSize) {
      const batch = toUpdate.slice(i, i + batchSize)
      const results = await Promise.all(batch.map(item =>
        usersCollection.doc(item._id).update({
          data: {
            dimensionScores: _.set(item.dims.dimensionScores),
            dimensionMax: _.set(item.dims.dimensionMax),
            updatedAt: new Date()
          }
        }).then(() => ({ ok: true }))
          .catch(e => { console.error('backfill update failed', item._id, e); return { ok: false } })
      ))
      results.forEach(r => { if (r.ok) stats.updated++; else stats.errors++ })
    }

    return { code: 0, data: { dryRun, stats, samples } }
  } catch (err) {
    console.error(err)
    return { code: 5000, message: err.message }
  }
}
