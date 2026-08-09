// app.js
App({
  onLaunch(options) {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        // TODO: 把下面这一行的 env 改成你自己的云开发环境 ID
        env: 'job-cpti-dev-d6g8x3zkb2ae306f8',
        traceUser: true,
      })
    }
    this.parseInviteContext(options)
  },

  onShow(options) {
    this.parseInviteContext(options)
  },

  parseInviteContext(options) {
    if (options && options.query && options.query.inviterId) {
      this.globalData.inviterId = options.query.inviterId
      this.globalData.inviteType = options.query.type || 'single'
      this.globalData.inviteMatchId = options.query.matchId || null
      console.log('检测到邀请:', options.query)
    }
  },

  globalData: {
    userInfo: null,
    openid: null,
    inviterId: null,
    inviteType: null,
    inviteMatchId: null,
    questions: null,
    currentAnswers: [],
    lastResult: null,
  }
})
