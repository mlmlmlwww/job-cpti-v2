// pages/invite/invite.js
const app = getApp()

Page({
  data: {
    inviterInfo: null,
    hasCompleted: false,
    loading: true
  },

  async onLoad(options) {
    if (options.inviterId) {
      app.globalData.inviterId = options.inviterId
      app.globalData.inviteType = options.type || 'single'
      app.globalData.inviteMatchId = options.matchId || null
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'user_init',
        data: { inviterId: app.globalData.inviterId }
      })
      if (res.result && res.result.code === 0) {
        app.globalData.openid = res.result.data.openid
        const hasCompleted = res.result.data.hasCompleted || false
        this.setData({
          inviterInfo: res.result.data.inviterInfo,
          hasCompleted,
          loading: false
        })
        console.log('invite 页面状态:', { hasCompleted, inviterInfo: res.result.data.inviterInfo })

        // 如果自己已经完成了测试，直接跳CP结果
        if (res.result.data.hasCompleted && res.result.data.inviterInfo && res.result.data.inviterInfo.hasCompleted) {
          this.autoMatch()
        }
      }
    } catch (err) {
      console.error(err)
      this.setData({ loading: false })
    }
  },

  async autoMatch() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'match_by_code',
        data: { inviterOpenid: app.globalData.inviterId }
      })
      if (res.result && res.result.code === 0 && res.result.data.matchId) {
        wx.redirectTo({
          url: `/pages/result-cp/result-cp?matchId=${res.result.data.matchId}`
        })
      }
    } catch (err) {
      console.error(err)
    }
  },

  onStartQuiz() {
    wx.navigateTo({ url: '/pages/quiz/quiz' })
  },

  onViewMyCPs() {
    wx.navigateTo({ url: '/pages/my-cps/my-cps' })
  }
})
