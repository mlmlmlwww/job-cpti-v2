// app.js
App({
  onLaunch(options) {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'job-cpti-dev-d6g8x3zkb2ae306f8',
        traceUser: true,
      })
    }
    this.parseInviteContext(options)

    // 预热云函数容器 + 预加载小程序码 + 预加载人格图
    this.warmup()
    this.preloadQRCode()
    this.preloadPersonaImages()
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

  // 预热云函数容器
  warmup() {
    wx.cloud.callFunction({ name: 'get_questions' }).catch(() => {})
  },

  // 预加载11张人格图到本地缓存
  preloadPersonaImages() {
    const fs = wx.getFileSystemManager()
    const cacheDir = `${wx.env.USER_DATA_PATH}/personas`

    // 确保缓存目录存在
    try { fs.accessSync(cacheDir) } catch (e) { fs.mkdirSync(cacheDir) }

    this.globalData.personaImageCache = {}

    for (let i = 1; i <= 11; i++) {
      const cachePath = `${cacheDir}/${i}.png`
      try {
        fs.accessSync(cachePath)
        this.globalData.personaImageCache[i] = cachePath
      } catch (e) {
        // 后台下载
        const fileID = `cloud://job-cpti-dev-d6g8x3zkb2ae306f8.6a6f-job-cpti-dev-d6g8x3zkb2ae306f8-1457130836/personas/${i}.png`
        wx.cloud.downloadFile({
          fileID,
          success: res => {
            try {
              fs.saveFileSync(res.tempFilePath, cachePath)
              this.globalData.personaImageCache[i] = cachePath
            } catch (err) { /* 忽略 */ }
          },
          fail: () => {}  // 静默失败，结果页会用云文件 ID 兜底
        })
      }
    }
  },

  // 预加载小程序码到本地
  preloadQRCode() {
    const qrCodeFileID = 'cloud://job-cpti-dev-d6g8x3zkb2ae306f8.6a6f-job-cpti-dev-d6g8x3zkb2ae306f8-1457130836/others/wxcode.png'
    const cachePath = `${wx.env.USER_DATA_PATH}/wxcode.png`

    // 已缓存则直接使用
    try {
      wx.getFileSystemManager().accessSync(cachePath)
      this.globalData.qrcodePath = cachePath
      return
    } catch (e) { /* 未缓存，继续下载 */ }

    wx.cloud.downloadFile({
      fileID: qrCodeFileID,
      success: res => {
        const fs = wx.getFileSystemManager()
        try {
          fs.saveFileSync(res.tempFilePath, cachePath)
          this.globalData.qrcodePath = cachePath
        } catch (e) {
          // 保存失败，回退到云文件 ID
          console.error('小程序码缓存失败', e)
        }
      },
      fail: err => console.error('小程序码下载失败', err)
    })
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
    qrcodePath: null,
    personaImageCache: {}
  }
})