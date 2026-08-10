const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const matchesCollection = db.collection('matches')
const usersCollection = db.collection('users')
const cpCollection = db.collection('cp_templates')
const personasCollection = db.collection('personas')

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { matchId } = event

  console.log('get_cp_result 调用:', { openid, matchId })

  if (!openid) {
    console.error('get_cp_result: OPENID 为空')
    return { code: 3009, message: '登录态异常，请重试' }
  }

  if (!matchId) return { code: 2001, message: '缺少 matchId' }

  try {
    const mRes = await matchesCollection.doc(matchId).get()
    if (!mRes.data) return { code: 3006, message: '匹配不存在' }
    const match = mRes.data

    // 权限校验
    console.log('get_cp_result 权限校验:', { openid, userA: match.userA, userB: match.userB, personaAId: match.personaAId, personaBId: match.personaBId })
    if (match.userA !== openid && match.userB !== openid) {
      console.error('权限校验失败: 当前用户不在匹配中', { openid, userA: match.userA, userB: match.userB })
      return { code: 3007, message: '无权访问' }
    }

    // 拉 CP 模板
    const cpRes = await cpCollection.where({ cpKey: match.cpKey }).get()
    if (cpRes.data.length === 0) return { code: 3008, message: 'CP 模板不存在' }
    const cpTemplate = cpRes.data[0]

    // 拉两方用户信息
    const [uaRes, ubRes] = await Promise.all([
      usersCollection.where({ openid: match.userA }).get(),
      usersCollection.where({ openid: match.userB }).get()
    ])
    const userA = uaRes.data[0] || {}
    const userB = ubRes.data[0] || {}

    // 拉两方人格名
    const pRes = await personasCollection
      .where({ personaId: db.command.in([match.personaAId, match.personaBId]) })
      .get()
    const nameMap = {}
    pRes.data.forEach(p => { nameMap[p.personaId] = p.name })

    return {
      code: 0,
      data: {
        matchId: match._id,
        cpKey: cpTemplate.cpKey,
        cpName: cpTemplate.cpName,
        cpDescription: cpTemplate.cpDescription,
        shareImage: cpTemplate.shareImage || '',
        userA: {
          openid: userA.openid,
          nickname: userA.nickname || '匿名同事',
          avatarUrl: userA.avatarUrl || '',
          personaId: match.personaAId,
          personaName: nameMap[match.personaAId] || ''
        },
        userB: {
          openid: userB.openid,
          nickname: userB.nickname || '匿名同事',
          avatarUrl: userB.avatarUrl || '',
          personaId: match.personaBId,
          personaName: nameMap[match.personaBId] || ''
        }
      }
    }
  } catch (err) {
    console.error(err)
    return { code: 5000, message: err.message }
  }
}
