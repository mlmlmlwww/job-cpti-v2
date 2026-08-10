const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { personaId } = event

  console.log('get_persona_detail 调用:', { openid, personaId, event })

  if (!personaId) return { code: 2001, message: '缺少 personaId' }
  try {
    const pid = Number(personaId)
    console.log('get_persona_detail 查询:', { pid })
    const res = await db.collection('personas')
      .where({ personaId: pid }).get()
    console.log('get_persona_detail 查询结果:', { count: res.data.length, firstId: res.data[0] ? res.data[0].personaId : null })
    if (res.data.length === 0) return { code: 3005, message: '人格不存在' }
    return { code: 0, data: { persona: res.data[0] } }
  } catch (err) {
    console.error('get_persona_detail error:', err)
    return { code: 5000, message: err.message }
  }
}
