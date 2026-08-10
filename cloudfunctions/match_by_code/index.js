// cloudfunctions/match_by_code/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const usersCollection = db.collection('users')
const matchesCollection = db.collection('matches')

exports.main = async (event) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { matchCode, inviterOpenid } = event

  try {
    // 找到目标用户
    let targetUser = null
    if (matchCode) {
      const r = await usersCollection.where({ matchCode: String(matchCode) }).get()
      if (r.data.length === 0) {
        return { code: 0, data: { matchStatus: 'invalid_code' } }
      }
      targetUser = r.data[0]
    } else if (inviterOpenid) {
      const r = await usersCollection.where({ openid: inviterOpenid }).get()
      if (r.data.length === 0) {
        return { code: 0, data: { matchStatus: 'invalid_code' } }
      }
      targetUser = r.data[0]
    } else {
      return { code: 2001, message: '缺少参数' }
    }

    // 自匹配
    if (targetUser.openid === openid) {
      return { code: 0, data: { matchStatus: 'self_match' } }
    }

    // 自己未完成测试
    const currentRes = await usersCollection.where({ openid }).get()
    if (currentRes.data.length === 0 || !currentRes.data[0].hasCompleted) {
      return { code: 0, data: { matchStatus: 'need_quiz' } }
    }
    const currentUser = currentRes.data[0]

    // 对方未完成
    if (!targetUser.hasCompleted || !targetUser.personaId) {
      return { code: 0, data: { matchStatus: 'target_not_ready' } }
    }

    // 保证 userA < userB（字典序）
    let userA = targetUser.openid, userB = openid
    let personaA = targetUser.personaId, personaB = currentUser.personaId
    if (userA > userB) {
      [userA, userB] = [userB, userA];
      const tmp = personaA; personaA = personaB; personaB = tmp
    }

    // 已存在则复用，人格变化则更新旧记录
    const existRes = await matchesCollection.where({ userA, userB }).get()
    if (existRes.data.length > 0) {
      const existMatch = existRes.data[0]
      // 人格变化时更新旧记录，不创建新记录
      if (existMatch.personaAId !== personaA || existMatch.personaBId !== personaB) {
        const newCpKey = `${Math.min(personaA, personaB)}_${Math.max(personaA, personaB)}`
        await matchesCollection.doc(existMatch._id).update({
          data: {
            personaAId: personaA,
            personaBId: personaB,
            cpKey: newCpKey,
            updatedAt: new Date()
          }
        })
        console.log('match_by_code 更新旧 match:', { matchId: existMatch._id, old: existMatch.cpKey, new: newCpKey })
        return {
          code: 0,
          data: {
            matchStatus: 'success',
            matchId: existMatch._id,
            cpKey: newCpKey
          }
        }
      }
      return {
        code: 0,
        data: {
          matchStatus: 'success',
          matchId: existMatch._id,
          cpKey: existMatch.cpKey
        }
      }
    }

    const low = Math.min(personaA, personaB)
    const high = Math.max(personaA, personaB)
    const cpKey = `${low}_${high}`

    const addRes = await matchesCollection.add({
      data: {
        userA, userB,
        personaAId: personaA,
        personaBId: personaB,
        cpKey,
        initiator: openid,
        matchMethod: matchCode ? 'match_code' : 'share_link',
        createdAt: new Date()
      }
    })

    return {
      code: 0,
      data: {
        matchStatus: 'success',
        matchId: addRes._id,
        cpKey
      }
    }
  } catch (err) {
    console.error('match_by_code error:', err)
    return { code: 5000, message: err.message }
  }
}
