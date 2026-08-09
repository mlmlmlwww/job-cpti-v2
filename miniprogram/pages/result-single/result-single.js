// pages/result-single/result-single.js
const app = getApp()

Page({
  data: {
    persona: null,
    matchCode: '',
    loading: true
  },

  async onLoad(options) {
    const personaId = options.personaId
    if (personaId) {
      await this.loadResult(personaId)
    } else {
      const last = app.globalData.lastResult
      if (last && last.personaId) {
        await this.loadResult(last.personaId)
      } else {
        await this.fetchCurrentUserResult()
      }
    }
  },

  async fetchCurrentUserResult() {
    try {
      const res = await wx.cloud.callFunction({ name: 'user_init', data: {} })
      if (res.result && res.result.code === 0 && res.result.data.personaId) {
        await this.loadResult(res.result.data.personaId, res.result.data.matchCode)
      } else {
        wx.showModal({
          title: '还没有测试结果',
          content: '先去完成测试吧',
          showCancel: false,
          success: () => wx.redirectTo({ url: '/pages/home/home' })
        })
      }
    } catch (e) { console.error(e) }
  },

  async loadResult(personaId, matchCode) {
    this.setData({ loading: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'get_persona_detail',
        data: { personaId: Number(personaId) }
      })
      if (res.result && res.result.code === 0) {
        const persona = res.result.data.persona
        const lastResult = app.globalData.lastResult || {}
        this.setData({
          persona,
          matchCode: matchCode || lastResult.matchCode || '',
          loading: false
        })
      }
    } catch (err) {
      console.error(err)
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
