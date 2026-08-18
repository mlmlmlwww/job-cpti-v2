const app = getApp()
const cache = require('../../utils/cache.js')
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
        console.log('loading submit_answers 返回:', data)
        app.globalData.lastResult = data
        app.globalData.userInfo = null  // 清除缓存，让下次重新获取最新数据

        // 重测后清理与结果相关的本地缓存（CP 列表、所有 CP 详情）
        // persona_${id} 缓存的是静态人格详情，按 id 隔离，无需清
        cache.remove('my_cps_list')
        cache.removeByPrefix('cp_result_')

        if (this.textTimer) clearInterval(this.textTimer)
        // 如果匹配成功，跳CP结果页
        if (data.matchResult && data.matchResult.matchId) {
          console.log('loading 跳转 CP 结果:', data.matchResult.matchId)
          wx.redirectTo({ url: `/pages/result-cp/result-cp?matchId=${data.matchResult.matchId}` })
        } else {
          console.log('loading 跳转个人结果, personaId:', data.personaId, '类型:', typeof data.personaId)
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
