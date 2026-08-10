// pages/result-single/result-single.js
const app = getApp()

Page({
  data: {
    persona: null,
    matchCode: '',
    loading: true
  },

  async onLoad(options) {
    console.log('result-single onLoad:', options)
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
      console.log('result-single fetchCurrentUserResult')
      const res = await wx.cloud.callFunction({ name: 'user_init', data: {} })
      console.log('result-single user_init 结果:', res.result)
      if (res.result && res.result.code === 0) {
        // 确保 openid 始终被设置，分享时需要用到
        if (res.result.data.openid) {
          app.globalData.openid = res.result.data.openid
        }
        if (res.result.data.personaId) {
          await this.loadResult(res.result.data.personaId, res.result.data.matchCode)
        } else {
          wx.showModal({
            title: '还没有测试结果',
            content: '先去完成测试吧',
            showCancel: false,
            success: () => wx.redirectTo({ url: '/pages/home/home' })
          })
        }
      }
    } catch (e) { console.error(e) }
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
