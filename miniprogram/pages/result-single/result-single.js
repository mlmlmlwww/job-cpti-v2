// pages/result-single/result-single.js
const app = getApp()

Page({
  data: {
    persona: null,
    matchCode: '',
    nickname: '',
    loading: true,
    qrcodePath: app.globalData.qrcodePath || 'cloud://job-cpti-dev-d6g8x3zkb2ae306f8.6a6f-job-cpti-dev-d6g8x3zkb2ae306f8-1457130836/others/wxcode.png'
  },

  async onLoad(options) {
    // 解析 personaId（优先 URL 参数，其次 lastResult）
    let personaId = this.resolvePersonaId(options)

    // 尝试从缓存读用户信息
    let userInfo = app.globalData.userInfo || null

    // 不需要 user_init 时直接用缓存；需要时并行发出
    const needsInit = !userInfo

    if (personaId) {
      const [initRes, personaRes] = await Promise.all([
        needsInit ? wx.cloud.callFunction({ name: 'user_init' }).catch(e => {
          console.error('result-single user_init error:', e)
          return null
        }) : Promise.resolve(null),
        wx.cloud.callFunction({ name: 'get_persona_detail', data: { personaId: Number(personaId) } }).catch(e => {
          console.error('result-single get_persona_detail error:', e)
          return null
        })
      ])

      // 处理 user_init 结果
      if (initRes && initRes.result && initRes.result.code === 0) {
        userInfo = initRes.result.data
        app.globalData.userInfo = userInfo
        if (userInfo.openid) app.globalData.openid = userInfo.openid
      }

      // 处理 persona 结果
      if (personaRes && personaRes.result && personaRes.result.code === 0) {
        const persona = personaRes.result.data.persona
        // 优先使用本地缓存的人格图
        const cachedAvatar = app.globalData.personaImageCache[persona.personaId]
        if (cachedAvatar) persona.avatarUrl = cachedAvatar
        const lastResult = app.globalData.lastResult || {}
        const nickname = (userInfo && userInfo.nickname) || '匿名同事'
        this.setData({
          persona,
          matchCode: (userInfo && userInfo.matchCode) || lastResult.matchCode || '',
          nickname,
          loading: false
        })
        if (!nickname || nickname === '匿名同事') {
          this.promptSetNickname()
        }
        return
      }

      wx.showModal({
        title: '加载失败',
        content: (personaRes && personaRes.result && personaRes.result.message) || '未知错误',
        showCancel: false,
        success: () => wx.redirectTo({ url: '/pages/home/home' })
      })
    } else {
      // 没有 personaId，需要 user_init 兜底
      if (!userInfo) {
        try {
          const initRes = await wx.cloud.callFunction({ name: 'user_init' })
          if (initRes.result && initRes.result.code === 0) {
            userInfo = initRes.result.data
            app.globalData.userInfo = userInfo
            if (userInfo.openid) app.globalData.openid = userInfo.openid
          }
        } catch (e) {
          console.error('result-single user_init error:', e)
        }
      }
      if (userInfo && userInfo.personaId) {
        personaId = userInfo.personaId
        await this.loadResult(personaId, userInfo.matchCode || '', (userInfo && userInfo.nickname) || '')
      } else {
        wx.showModal({
          title: '还没有测试结果',
          content: '先去完成测试吧',
          showCancel: false,
          success: () => wx.redirectTo({ url: '/pages/home/home' })
        })
      }
    }
  },

  resolvePersonaId(options) {
    let personaId = options.personaId
    const numericId = Number(personaId)
    if (!personaId || isNaN(numericId) || numericId < 1 || numericId > 11) {
      const last = app.globalData.lastResult
      if (last && last.personaId) {
        const lastNumeric = Number(last.personaId)
        if (!isNaN(lastNumeric) && lastNumeric >= 1 && lastNumeric <= 11) {
          return lastNumeric
        }
      }
      return null
    }
    return personaId
  },

  async loadResult(personaId, matchCode, nickname) {
    const pid = Number(personaId)
    if (isNaN(pid) || pid < 1 || pid > 11) {
      wx.showModal({
        title: '加载失败',
        content: '人格ID无效，请重新测试',
        showCancel: false,
        success: () => wx.redirectTo({ url: '/pages/home/home' })
      })
      return
    }

    this.setData({ loading: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'get_persona_detail',
        data: { personaId: pid }
      })
      if (res.result && res.result.code === 0) {
        const persona = res.result.data.persona
        // 优先使用本地缓存的人格图
        const cachedAvatar = app.globalData.personaImageCache[persona.personaId]
        if (cachedAvatar) persona.avatarUrl = cachedAvatar
        const lastResult = app.globalData.lastResult || {}
        const resolvedNickname = nickname || (app.globalData.userInfo && app.globalData.userInfo.nickname) || '匿名同事'
        this.setData({
          persona,
          matchCode: matchCode || lastResult.matchCode || '',
          nickname: resolvedNickname,
          loading: false
        })
        if (!resolvedNickname || resolvedNickname === '匿名同事') {
          this.promptSetNickname()
        }
      } else {
        wx.showModal({
          title: '加载失败',
          content: (res.result && res.result.message) || '未知错误',
          showCancel: false,
          success: () => wx.redirectTo({ url: '/pages/home/home' })
        })
      }
    } catch (err) {
      console.error('result-single loadResult error:', err)
      wx.showModal({
        title: '加载失败',
        content: '网络异常，请重试',
        showCancel: false
      })
    }
  },

  onCopyCode() {
    if (!this.data.matchCode) return
    wx.setClipboardData({
      data: this.data.matchCode,
      success: () => wx.showToast({ title: '已复制' })
    })
  },

  onInputCode() {
    wx.navigateTo({ url: '/pages/match-code/match-code' })
  },

  onViewMyCPs() {
    wx.navigateTo({ url: '/pages/my-cps/my-cps' })
  },

  onRestart() {
    wx.redirectTo({ url: '/pages/quiz/quiz' })
  },

  promptSetNickname() {
    wx.showModal({
      title: '设置昵称',
      content: '设置昵称，朋友更容易认出你',
      editable: true,
      placeholderText: '输入你的昵称',
      success: async (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          const nickname = res.content.trim()
          try {
            const initRes = await wx.cloud.callFunction({
              name: 'user_init',
              data: { userInfo: { nickname, avatarUrl: '' } }
            })
            if (initRes.result && initRes.result.code === 0) {
              this.setData({ nickname })
              if (app.globalData.userInfo) app.globalData.userInfo.nickname = nickname
              wx.showToast({ title: '设置成功', icon: 'success' })
            }
          } catch (err) {
            console.error('设置昵称失败', err)
          }
        }
      }
    })
  },

  onShareAppMessage() {
    const { persona } = this.data
    const openid = app.globalData.openid || ''
    return {
      title: `我是【${persona.name}】，测测你和我是什么职场CP？`,
      path: `/pages/invite/invite?inviterId=${openid}&type=single`,
      imageUrl: persona.avatarUrl || ''
    }
  },

  onShareTimeline() {
    const { persona } = this.data
    return {
      title: `我是【${persona.name}】，你呢？| JOB-CPTI 职场人格测试`,
      query: `inviterId=${app.globalData.openid || ''}&type=single`,
      imageUrl: this.data.persona.avatarUrl || ''
    }
  }
})