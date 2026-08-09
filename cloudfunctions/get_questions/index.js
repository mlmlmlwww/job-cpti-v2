const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  try {
    const res = await db.collection('questions')
      .where({ isActive: true })
      .orderBy('order', 'asc')
      .limit(100)
      .get()

    const questions = res.data.map(q => ({
      questionId: q.questionId,
      order: q.order,
      content: q.content,
      options: q.options,
      surfaceDimension: q.surfaceDimension
    }))
    return { code: 0, data: { questions } }
  } catch (err) {
    console.error(err)
    return { code: 5000, message: err.message }
  }
}
