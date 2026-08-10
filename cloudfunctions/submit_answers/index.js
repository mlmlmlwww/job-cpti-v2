// cloudfunctions/submit_answers/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command
const usersCollection = db.collection('users')
const questionsCollection = db.collection('questions')
const personasCollection = db.collection('personas')
const matchesCollection = db.collection('matches')

const PERSONA_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

async function generateMatchCode() {
  for (let i = 0; i < 10; i++) {
    const code = String(Math.floor(100000 + Math.random() * 900000))
    const exist = await usersCollection.where({ matchCode: code }).count()
    if (exist.total === 0) return code
  }
  return String(Math.floor(100000 + Math.random() * 900000))
}

function calculatePersona(answers, questions) {
  const raw = {}, maxS = {}, minS = {}
  PERSONA_IDS.forEach(id => { raw[id] = 0; maxS[id] = 0; minS[id] = 0 })

  questions.forEach((q, i) => {
    const answer = answers[i] || 3
    const w = q.weights || {}
    for (const k in w) {
      const pid = parseInt(k)
      const val = w[k]
      if (val === 0 || val === undefined || val === null) continue
      raw[pid] += answer * val
      if (val > 0) {
        maxS[pid] += val * 5
        minS[pid] += val * 1
      } else {
        maxS[pid] += val * 1
        minS[pid] += val * 5
      }
    }
  })

  const norm = {}
  PERSONA_IDS.forEach(id => {
    const range = maxS[id] - minS[id]
    norm[id] = range === 0 ? 0 : (raw[id] - minS[id]) / range
  })

  const sorted = PERSONA_IDS.slice().sort((a, b) => norm[b] - norm[a])
  return { personaId: sorted[0], personaScores: norm }
}

async function tryMatch(currentUser, currentPersonaId, inviterOpenid) {
  console.log('tryMatch 开始:', { currentOpenid: currentUser && currentUser.openid, currentPersonaId, inviterOpenid })
  if (!inviterOpenid || !currentUser || inviterOpenid === currentUser.openid) {
    console.log('tryMatch 提前结束: 缺少参数或自匹配')
    return null
  }

  const inviterRes = await usersCollection.where({ openid: inviterOpenid }).get()
  if (inviterRes.data.length === 0) {
    console.log('tryMatch 提前结束: 邀请人不存在')
    return null
  }
  const inviter = inviterRes.data[0]
  if (!inviter.hasCompleted || !inviter.personaId) {
    console.log('tryMatch 提前结束: 邀请人未完成测试')
    return null
  }

  // 保证 userA < userB（字典序）
  let userA = inviter.openid, userB = currentUser.openid
  let personaA = inviter.personaId, personaB = currentPersonaId
  console.log('tryMatch 交换前:', { userA, userB, personaA, personaB })
  if (userA > userB) {
    // 必须用分号或临时变量，否则会被 JS 解析成连续赋值导致 bug
    const tmpOpenid = userA; userA = userB; userB = tmpOpenid
    const tmpPersona = personaA; personaA = personaB; personaB = tmpPersona
  }
  console.log('tryMatch 交换后:', { userA, userB, personaA, personaB })

  // 检查是否已存在
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
      console.log('tryMatch 更新旧 match:', { matchId: existMatch._id, old: existMatch.cpKey, new: newCpKey })
      return { matchId: existMatch._id, cpKey: newCpKey }
    }
    return { matchId: existMatch._id, cpKey: existMatch.cpKey }
  }

  const low = Math.min(personaA, personaB)
  const high = Math.max(personaA, personaB)
  const cpKey = `${low}_${high}`

  const matchData = {
    userA, userB,
    personaAId: personaA,
    personaBId: personaB,
    cpKey,
    initiator: inviter.openid,
    matchMethod: 'share_link',
    createdAt: new Date()
  }
  console.log('tryMatch 写入 matches:', matchData)
  const addRes = await matchesCollection.add({ data: matchData })
  return { matchId: addRes._id, cpKey }
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { answers, inviterId } = event

  try {
    if (!Array.isArray(answers) || answers.length !== 32) {
      return { code: 2001, message: '答案数量不正确' }
    }

    const qRes = await questionsCollection
      .where({ isActive: true })
      .orderBy('order', 'asc')
      .limit(100)
      .get()
    if (qRes.data.length !== 32) return { code: 5001, message: '题库不完整' }

    const result = calculatePersona(answers, qRes.data)

    const pRes = await personasCollection.where({ personaId: result.personaId }).get()
    const personaName = pRes.data.length > 0 ? pRes.data[0].name : ''

    const userRes = await usersCollection.where({ openid }).get()
    let matchCode = '', currentUser = null
    if (userRes.data.length > 0) {
      currentUser = userRes.data[0]
      await usersCollection.doc(currentUser._id).update({
        data: {
          personaId: result.personaId,
          personaScores: _.set(result.personaScores),
          answers,
          hasCompleted: true,
          completedAt: new Date(),
          updatedAt: new Date()
        }
      })
      matchCode = currentUser.matchCode || ''
      currentUser.openid = openid
      currentUser.personaId = result.personaId
    } else {
      // 用户不存在则创建（兼容直接进测试页的场景）
      matchCode = await generateMatchCode()
      const addRes = await usersCollection.add({
        data: {
          openid,
          nickname: '匿名同事',
          avatarUrl: '',
          matchCode,
          personaId: result.personaId,
          personaScores: result.personaScores,
          answers,
          hasCompleted: true,
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }
      })
      currentUser = {
        _id: addRes._id,
        openid,
        matchCode,
        personaId: result.personaId
      }
    }

    // 尝试自动匹配
    let matchResult = null
    if (inviterId && currentUser) {
      matchResult = await tryMatch(currentUser, result.personaId, inviterId)
    }

    const responseData = {
      personaId: result.personaId,
      personaName,
      personaScores: result.personaScores,
      matchCode,
      matchResult
    }
    console.log('submit_answers 返回:', responseData)
    return { code: 0, data: responseData }
  } catch (err) {
    console.error('submit_answers error:', err)
    return { code: 5000, message: err.message }
  }
}
