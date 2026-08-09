const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { personaId } = event
  if (!personaId) return { code: 2001, message: '缺少 personaId' }
  try {
    const res = await db.collection('personas')
      .where({ personaId: Number(personaId) }).get()
    if (res.data.length === 0) return { code: 3005, message: '人格不存在' }
    return { code: 0, data: { persona: res.data[0] } }
  } catch (err) {
    console.error(err)
    return { code: 5000, message: err.message }
  }
}
