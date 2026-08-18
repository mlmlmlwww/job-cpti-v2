const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const matchesCollection = db.collection('matches')
const usersCollection = db.collection('users')
const cpCollection = db.collection('cp_templates')

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { page = 1, pageSize = 20 } = event

  try {
    // 查询自己参与的所有匹配
    const listRes = await matchesCollection
      .where(_.or([{ userA: openid }, { userB: openid }]))
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .field({ userA: true, userB: true, cpKey: true, createdAt: true })
      .get()

    const total = listRes.data.length

    if (listRes.data.length === 0) {
      return { code: 0, data: { total: 0, list: [] } }
    }

    // 收集所有对方 openid、cpKey
    const otherOpenids = new Set()
    const cpKeys = new Set()
    listRes.data.forEach(m => {
      const other = m.userA === openid ? m.userB : m.userA
      otherOpenids.add(other)
      cpKeys.add(m.cpKey)
    })

    // 批量拉用户和 CP 模板
    const [uRes, cRes] = await Promise.all([
      usersCollection.where({ openid: _.in([...otherOpenids]) })
        .field({ openid: true, nickname: true, avatarUrl: true, matchCode: true }).get(),
      cpCollection.where({ cpKey: _.in([...cpKeys]) })
        .field({ cpKey: true, cpName: true }).get()
    ])

    const userMap = {}
    uRes.data.forEach(u => { userMap[u.openid] = u })
    const cpMap = {}
    cRes.data.forEach(c => { cpMap[c.cpKey] = c })

    const list = listRes.data.map(m => {
      const other = m.userA === openid ? m.userB : m.userA
      const u = userMap[other] || {}
      const c = cpMap[m.cpKey] || {}
      return {
        matchId: m._id,
        otherUser: {
          nickname: (u.nickname && u.nickname !== '匿名同事') ? u.nickname : (u.matchCode || '匿名同事'),
          avatarUrl: u.avatarUrl || ''
        },
        cpName: c.cpName || '',
        cpKey: m.cpKey,
        matchedAt: m.createdAt
      }
    })

    return { code: 0, data: { total, list } }
  } catch (err) {
    console.error(err)
    return { code: 5000, message: err.message }
  }
}
