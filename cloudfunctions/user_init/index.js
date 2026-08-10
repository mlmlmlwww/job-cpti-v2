// cloudfunctions/user_init/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const usersCollection = db.collection('users')
const personasCollection = db.collection('personas')

async function generateMatchCode() {
  for (let i = 0; i < 10; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const exist = await usersCollection.where({ matchCode: code }).count()
    if (exist.total === 0) return code
  }
  return String(Math.floor(100000 + Math.random() * 900000))
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { userInfo, inviterId } = event

  try {
    const existRes = await usersCollection.where({ openid }).get()

    let user
    if (existRes.data.length === 0) {
      const matchCode = await generateMatchCode()
      const newUser = {
        openid,
        nickname: (userInfo && userInfo.nickname) || '匿名同事',
        avatarUrl: (userInfo && userInfo.avatarUrl) || '',
        matchCode,
        personaId: null,
        personaScores: {},
        answers: null,
        hasCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
      await usersCollection.add({ data: newUser })
      user = newUser
    } else {
      user = existRes.data[0]
      if (userInfo && userInfo.nickname) {
        await usersCollection.doc(user._id).update({
          data: {
            nickname: userInfo.nickname,
            avatarUrl: userInfo.avatarUrl,
            updatedAt: new Date()
          }
        })
        // 同步更新内存中的 user 对象，确保返回最新数据
        user.nickname = userInfo.nickname
        user.avatarUrl = userInfo.avatarUrl || ''
      }
    }

    let inviterInfo = null
    if (inviterId && inviterId !== openid) {
      const inviterRes = await usersCollection.where({ openid: inviterId }).get()
      if (inviterRes.data.length > 0) {
        inviterInfo = {
          openid: inviterId,
          nickname: inviterRes.data[0].nickname,
          avatarUrl: inviterRes.data[0].avatarUrl,
          hasCompleted: inviterRes.data[0].hasCompleted
        }
      }
    }

    let personaName = ''
    if (user.personaId) {
      const pRes = await personasCollection.where({ personaId: user.personaId }).get()
      if (pRes.data.length > 0) personaName = pRes.data[0].name
    }

    return {
      code: 0,
      data: {
        openid,
        matchCode: user.matchCode,
        hasCompleted: user.hasCompleted,
        personaId: user.personaId,
        personaName,
        nickname: user.nickname || '匿名同事',
        avatarUrl: user.avatarUrl || '',
        inviterInfo
      }
    }
  } catch (err) {
    console.error(err)
    return { code: 5000, message: err.message }
  }
}
