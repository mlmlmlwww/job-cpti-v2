// pages/result-cp/result-cp.js
const app = getApp()

Page({
  data: {
    cpData: null,
    nickname: '',
    loading: true
  },

  async onLoad(options) {
    const matchId = options.matchId
    if (!matchId) {
      wx.showModal({ title: '参数错误', content: '缺少匹配ID', showCancel: false })
      return
    }
    // 获取最新用户信息（openid + nickname）
    try {
      const initRes = await wx.cloud.callFunction({ name: 'user_init', data: {} })
      if (initRes.result && initRes.result.code === 0) {
        app.globalData.openid = initRes.result.data.openid
        this.setData({ nickname: initRes.result.data.nickname || '匿名同事' })
      }
    } catch (e) {
      console.error('获取用户信息失败', e)
    }
    await this.loadCP(matchId)
  },

  async loadCP(matchId, retryCount) {
    retryCount = retryCount || 0
    try {
      const res = await wx.cloud.callFunction({
        name: 'get_cp_result',
        data: { matchId }
      })
      if (res.result && res.result.code === 0) {
        this.setData({ cpData: res.result.data, loading: false })

        // CP 结果页展示后，如果未设置昵称，提示设置（分享前）
        if (!this.data.nickname || this.data.nickname === '匿名同事') {
          this.promptSetNickname()
        }
      } else if (res.result && res.result.code === 3007 && retryCount < 3) {
        // 权限校验失败，可能是刚创建匹配，重试
        console.log(`get_cp_result 重试 ${retryCount + 1}/3`)
        await new Promise(r => setTimeout(r, 1000))
        await this.loadCP(matchId, retryCount + 1)
      } else if (res.result && res.result.code === 3009) {
        // 登录态异常
        wx.showModal({
          title: '登录态异常',
          content: '请退出小程序重新进入后再试',
          showCancel: false,
          success: () => wx.reLaunch({ url: '/pages/home/home' })
        })
      } else {
        wx.showModal({
          title: '加载失败',
          content: (res.result && res.result.message) || '未知错误',
          showCancel: false
        })
      }
    } catch (err) {
      console.error(err)
      if (retryCount < 3) {
        await new Promise(r => setTimeout(r, 1000))
        await this.loadCP(matchId, retryCount + 1)
      }
    }
  },

  onGoHome() {
    wx.reLaunch({ url: '/pages/home/home' })
  },

  onInputCode() {
    wx.navigateTo({ url: '/pages/match-code/match-code' })
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
