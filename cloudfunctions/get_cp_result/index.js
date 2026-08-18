const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const $ = db.command.aggregate

const matchesCollection = db.collection('matches')

exports.main = async (event) => {
  if (event && event.__warmup) return { code: 0, warmup: true }
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
    // 一次 aggregate 拉完 match + cp_template + userA/B + personaA/B
    const aggRes = await matchesCollection.aggregate()
      .match({ _id: matchId })
      .lookup({ from: 'cp_templates', localField: 'cpKey', foreignField: 'cpKey', as: 'cpArr' })
      .lookup({ from: 'users', localField: 'userA', foreignField: 'openid', as: 'uAArr' })
      .lookup({ from: 'users', localField: 'userB', foreignField: 'openid', as: 'uBArr' })
      .lookup({ from: 'personas', localField: 'personaAId', foreignField: 'personaId', as: 'pAArr' })
      .lookup({ from: 'personas', localField: 'personaBId', foreignField: 'personaId', as: 'pBArr' })
      .project({
        userA: 1, userB: 1, cpKey: 1, personaAId: 1, personaBId: 1,
        cpArr: { cpKey: 1, cpName: 1, cpDescription: 1, shareImage: 1 },
        uAArr: { openid: 1, nickname: 1, avatarUrl: 1, matchCode: 1 },
        uBArr: { openid: 1, nickname: 1, avatarUrl: 1, matchCode: 1 },
        pAArr: { personaId: 1, name: 1 },
        pBArr: { personaId: 1, name: 1 }
      })
      .end()

    if (!aggRes.list || aggRes.list.length === 0) return { code: 3006, message: '匹配不存在' }
    const match = aggRes.list[0]

    // 权限校验
    console.log('get_cp_result 权限校验:', { openid, userA: match.userA, userB: match.userB, personaAId: match.personaAId, personaBId: match.personaBId })
    if (match.userA !== openid && match.userB !== openid) {
      console.error('权限校验失败: 当前用户不在匹配中', { openid, userA: match.userA, userB: match.userB })
      return { code: 3007, message: '无权访问' }
    }

    if (!match.cpArr || match.cpArr.length === 0) return { code: 3008, message: 'CP 模板不存在' }
    const cpTemplate = match.cpArr[0]
    const userA = (match.uAArr && match.uAArr[0]) || {}
    const userB = (match.uBArr && match.uBArr[0]) || {}
    const personaA = (match.pAArr && match.pAArr[0]) || {}
    const personaB = (match.pBArr && match.pBArr[0]) || {}

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
          nickname: (userA.nickname && userA.nickname !== '匿名同事') ? userA.nickname : (userA.matchCode || '匿名同事'),
          avatarUrl: userA.avatarUrl || '',
          personaId: match.personaAId,
          personaName: personaA.name || ''
        },
        userB: {
          openid: userB.openid,
          nickname: (userB.nickname && userB.nickname !== '匿名同事') ? userB.nickname : (userB.matchCode || '匿名同事'),
          avatarUrl: userB.avatarUrl || '',
          personaId: match.personaBId,
          personaName: personaB.name || ''
        }
      }
    }
  } catch (err) {
    console.error(err)
    return { code: 5000, message: err.message }
  }
}
