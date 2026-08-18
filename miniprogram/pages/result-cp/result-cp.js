// pages/result-cp/result-cp.js
const app = getApp()
const cache = require('../../utils/cache.js')

function cpCacheKey(id) { return `cp_result_${id}` }

Page({
  data: {
    cpData: null,
    nickname: '',
    loading: true,
    qrcodePath: app.globalData.qrcodePath || 'cloud://job-cpti-dev-d6g8x3zkb2ae306f8.6a6f-job-cpti-dev-d6g8x3zkb2ae306f8-1457130836/others/wxcode.png'
  },

  async onLoad(options) {
    const matchId = options.matchId
    if (!matchId) {
      wx.showModal({ title: '参数错误', content: '缺少匹配ID', showCancel: false })
      return
    }

    // 尝试从缓存读用户信息
    let userInfo = app.globalData.userInfo || null
    const needsInit = !userInfo

    // 命中本地缓存 → 立即展示；再后台异步刷新
    const cached = cache.getSync(cpCacheKey(matchId))
    if (cached) {
      const nickname = (userInfo && userInfo.nickname) || '匿名同事'
      this.setData({ cpData: cached, nickname, loading: false })
      // 后台静默刷新
      if (needsInit) {
        wx.cloud.callFunction({ name: 'user_init' }).then(res => {
          if (res.result && res.result.code === 0) {
            const u = res.result.data
            app.globalData.userInfo = u
            if (u.openid) app.globalData.openid = u.openid
            this.setData({ nickname: u.nickname || nickname })
          }
        }).catch(() => {})
      }
      this.callGetCPResult(matchId).then(res => {
        if (res && res.result && res.result.code === 0) {
          cache.setSync(cpCacheKey(matchId), res.result.data)
          this.setData({ cpData: res.result.data })
        }
      })
      return
    }

    // 未命中：并行 user_init + get_cp_result
    const [initRes, cpRes] = await Promise.all([
      needsInit ? wx.cloud.callFunction({ name: 'user_init' }).catch(e => {
        console.error('获取用户信息失败', e)
        return null
      }) : Promise.resolve(null),
      this.callGetCPResult(matchId)
    ])

    // 处理 user_init 结果
    if (initRes && initRes.result && initRes.result.code === 0) {
      userInfo = initRes.result.data
      app.globalData.userInfo = userInfo
      if (userInfo.openid) app.globalData.openid = userInfo.openid
    }

    const nickname = (userInfo && userInfo.nickname) || '匿名同事'
    this.setData({ nickname })

    // 处理 cp 结果
    this.processCPResult(cpRes, matchId, nickname)
  },

  async callGetCPResult(matchId) {
    try {
      return await wx.cloud.callFunction({
        name: 'get_cp_result',
        data: { matchId }
      })
    } catch (err) {
      console.error(err)
      return null
    }
  },

  processCPResult(res, matchId, nickname) {
    if (res && res.result && res.result.code === 0) {
      cache.setSync(cpCacheKey(matchId), res.result.data)
      this.setData({ cpData: res.result.data, loading: false })
      if (!nickname || nickname === '匿名同事') {
        this.promptSetNickname()
      }
    } else if (res && res.result && res.result.code === 3007) {
      // 权限校验失败，可能刚创建匹配，延迟重试
      console.log('get_cp_result 权限校验失败，1s 后重试')
      setTimeout(() => this.retryLoadCP(matchId, 1), 1000)
    } else if (res && res.result && res.result.code === 3009) {
      wx.showModal({
        title: '登录态异常',
        content: '请退出小程序重新进入后再试',
        showCancel: false,
        success: () => wx.reLaunch({ url: '/pages/home/home' })
      })
    } else {
      wx.showModal({
        title: '加载失败',
        content: (res && res.result && res.result.message) || '未知错误',
        showCancel: false
      })
    }
  },

  async retryLoadCP(matchId, retryCount) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'get_cp_result',
        data: { matchId }
      })
      if (res && res.result && res.result.code === 0) {
        cache.setSync(cpCacheKey(matchId), res.result.data)
      }
      this.processCPResult(res, matchId, this.data.nickname)
    } catch (err) {
      console.error(err)
      if (retryCount < 3) {
        setTimeout(() => this.retryLoadCP(matchId, retryCount + 1), 1000)
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