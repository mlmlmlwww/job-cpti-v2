// pages/result-cp/result-cp.js
const app = getApp()

Page({
  data: {
    cpData: null,
    loading: true
  },

  async onLoad(options) {
    const matchId = options.matchId
    if (!matchId) {
      wx.showModal({ title: '参数错误', content: '缺少匹配ID', showCancel: false })
      return
    }
    await this.loadCP(matchId)
  },

  async loadCP(matchId) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'get_cp_result',
        data: { matchId }
      })
      if (res.result && res.result.code === 0) {
        this.setData({ cpData: res.result.data, loading: false })
      } else {
        wx.showModal({
          title: '加载失败',
          content: (res.result && res.result.message) || '未知错误',
          showCancel: false
        })
      }
    } catch (err) {
      console.error(err)
    }
  },

  onGoHome() {
    wx.reLaunch({ url: '/pages/home/home' })
  },

  onInputCode() {
    wx.navigateTo({ url: '/pages/match-code/match-code' })
  },

  onShareAppMessage() {
    const { cpData } = this.data
    return {
      title: `我和 TA 是【${cpData.cpName}】，你和我又是什么 CP？`,
      path: `/pages/invite/invite?inviterId=${app.globalData.openid || ''}&type=cp`,
      imageUrl: cpData.shareImage || ''
    }
  },

  onShareTimeline() {
    const { cpData } = this.data
    return {
      title: `我们是【${cpData.cpName}】 | JOB-CPTI`,
      query: `inviterId=${app.globalData.openid || ''}&type=cp`
    }
  }
})
