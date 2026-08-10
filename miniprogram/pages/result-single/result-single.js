// pages/result-single/result-single.js
const app = getApp()

Page({
  data: {
    persona: null,
    matchCode: '',
    nickname: '',
    loading: true
  },

  async onLoad(options) {
    console.log('result-single onLoad:', options)

    // 先获取当前用户信息（昵称、openid、matchCode）
    let currentUserInfo = null
    try {
      const initRes = await wx.cloud.callFunction({ name: 'user_init', data: {} })
      if (initRes.result && initRes.result.code === 0) {
        currentUserInfo = initRes.result.data
        if (currentUserInfo.openid) {
          app.globalData.openid = currentUserInfo.openid
        }
        this.setData({ nickname: currentUserInfo.nickname || '匿名同事' })
      }
    } catch (e) {
      console.error('result-single user_init error:', e)
    }

    let personaId = options.personaId

    // 防御：personaId 必须是 1-11 的数字
    const numericId = Number(personaId)
    if (!personaId || isNaN(numericId) || numericId < 1 || numericId > 11) {
      console.warn('result-single 收到非法 personaId:', personaId)
      const last = app.globalData.lastResult
      if (last && last.personaId) {
        const lastNumeric = Number(last.personaId)
        if (!isNaN(lastNumeric) && lastNumeric >= 1 && lastNumeric <= 11) {
          personaId = lastNumeric
          console.log('result-single 从 lastResult 恢复 personaId:', personaId)
        }
      }
    }

    // 如果 URL 和 lastResult 都没有，用当前用户的 personaId
    if (!personaId && currentUserInfo && currentUserInfo.personaId) {
      personaId = currentUserInfo.personaId
    }

    if (personaId) {
      await this.loadResult(personaId, currentUserInfo ? currentUserInfo.matchCode : '')
    } else {
      wx.showModal({
        title: '还没有测试结果',
        content: '先去完成测试吧',
        showCancel: false,
        success: () => wx.redirectTo({ url: '/pages/home/home' })
      })
    }
  },

  async loadResult(personaId, matchCode) {
    const pid = Number(personaId)
    console.log('result-single loadResult:', { personaId, pid, matchCode })

    if (isNaN(pid) || pid < 1 || pid > 11) {
      console.error('result-single 非法 personaId:', personaId)
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
      console.log('result-single get_persona_detail 结果:', res.result)
      if (res.result && res.result.code === 0) {
        const persona = res.result.data.persona
        const lastResult = app.globalData.lastResult || {}
        this.setData({
          persona,
          matchCode: matchCode || lastResult.matchCode || '',
          loading: false
        })

        // 结果页展示后，如果未设置昵称，提示设置（分享前）
        if (!this.data.nickname || this.data.nickname === '匿名同事') {
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
