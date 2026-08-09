const app = getApp()
const LOADING_TEXTS = [
  '正在分析你的职场基因...',
  '扫描你的11种人格倾向...',
  '警告：某种人格分数异常高...',
  '结果即将揭晓...'
]

Page({
  data: { currentText: LOADING_TEXTS[0], textIndex: 0 },

  async onLoad(options) {
    this.startTextRotation()
    await this.submitAndNavigate(options.inviterId || '')
  },
  onUnload() { if (this.textTimer) clearInterval(this.textTimer) },

  startTextRotation() {
    this.textTimer = setInterval(() => {
      let { textIndex } = this.data
      textIndex = (textIndex + 1) % LOADING_TEXTS.length
      this.setData({ textIndex, currentText: LOADING_TEXTS[textIndex] })
    }, 700)
  },

  async submitAndNavigate(inviterId) {
    try {
      const answers = app.globalData.currentAnswers
      if (!answers || answers.length === 0) {
        wx.redirectTo({ url: '/pages/home/home' })
        return
      }
      const res = await wx.cloud.callFunction({
        name: 'submit_answers',
        data: { answers, inviterId: inviterId || null }
      })
      if (res.result && res.result.code === 0) {
        const data = res.result.data
        app.globalData.lastResult = data

        if (this.textTimer) clearInterval(this.textTimer)
        // 如果匹配成功，跳CP结果页
        if (data.matchResult && data.matchResult.matchId) {
          wx.redirectTo({ url: `/pages/result-cp/result-cp?matchId=${data.matchResult.matchId}` })
        } else {
          wx.redirectTo({ url: `/pages/result-single/result-single?personaId=${data.personaId}` })
        }
      } else {
        wx.showModal({
          title: '提交失败',
          content: (res.result && res.result.message) || '未知错误',
          showCancel: false,
          success: () => wx.navigateBack()
        })
      }
    } catch (err) {
      console.error(err)
      wx.showModal({ title: '网络异常', content: '请稍后重试', showCancel: false })
    }
  }
})
