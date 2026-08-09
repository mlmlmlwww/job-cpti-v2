// pages/match-code/match-code.js
const app = getApp()

Page({
  data: {
    code: '',
    submitting: false
  },

  onInputCode(e) {
    let val = e.detail.value.replace(/\D/g, '').slice(0, 6)
    this.setData({ code: val })
  },

  async onSubmit() {
    const { code } = this.data
    if (code.length !== 6) {
      wx.showToast({ title: '请输入 6 位匹配码', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'match_by_code',
        data: { matchCode: code }
      })
      if (res.result && res.result.code === 0) {
        const status = res.result.data.matchStatus
        if (status === 'success') {
          wx.redirectTo({ url: `/pages/result-cp/result-cp?matchId=${res.result.data.matchId}` })
        } else if (status === 'need_quiz') {
          wx.showModal({
            title: '你还没完成测试',
            content: '先完成 32 题测试再来匹配',
            showCancel: false,
            success: () => wx.redirectTo({ url: '/pages/quiz/quiz' })
          })
        } else if (status === 'self_match') {
          wx.showToast({ title: '不能和自己匹配', icon: 'none' })
        } else if (status === 'invalid_code') {
          wx.showToast({ title: '匹配码不存在', icon: 'none' })
        } else if (status === 'target_not_ready') {
          wx.showToast({ title: 'TA 还没完成测试', icon: 'none' })
        }
      } else {
        wx.showToast({ title: res.result.message || '匹配失败', icon: 'none' })
      }
    } catch (err) {
      console.error(err)
    } finally {
      this.setData({ submitting: false })
    }
  }
})
