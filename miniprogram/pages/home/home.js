// pages/home/home.js
const app = getApp()

Page({
  data: {
    hasCompleted: false,
    nickname: '',
    loading: false
  },

  onLoad() {
    this.initUser()
  },

  onShow() {
    // 只刷新已完成的用户状态，避免重复 user_init 调用
    if (this.data._initialized && app.globalData.openid) {
      this.setData({
        hasCompleted: !!app.globalData.lastResult
      })
    }
  },

  async initUser() {
    this.setData({ loading: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'user_init',
        data: { inviterId: app.globalData.inviterId }
      })
      if (res.result && res.result.code === 0) {
        const data = res.result.data
        app.globalData.openid = data.openid
        app.globalData.userInfo = data
        const nickname = data.nickname || '匿名同事'
        this.setData({
          hasCompleted: data.hasCompleted,
          nickname,
          _initialized: true
        })
      }
    } catch (err) {
      console.error('用户初始化失败', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  onStartQuiz() {
    wx.navigateTo({ url: '/pages/quiz/quiz' })
  },

  onViewResult() {
    wx.navigateTo({ url: '/pages/result-single/result-single' })
  },

  onInputCode() {
    wx.navigateTo({ url: '/pages/match-code/match-code' })
  },

  onViewMyCPs() {
    wx.navigateTo({ url: '/pages/my-cps/my-cps' })
  },

  onAbout() {
    wx.navigateTo({ url: '/pages/about/about' })
  }
})
