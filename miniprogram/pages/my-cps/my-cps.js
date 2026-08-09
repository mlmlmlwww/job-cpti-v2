// pages/my-cps/my-cps.js
Page({
  data: {
    list: [],
    total: 0,
    loading: true
  },

  async onLoad() {
    await this.loadList()
  },

  async loadList() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'get_my_cps',
        data: { page: 1, pageSize: 50 }
      })
      if (res.result && res.result.code === 0) {
        this.setData({
          list: res.result.data.list,
          total: res.result.data.total,
          loading: false
        })
      }
    } catch (err) {
      console.error(err)
    }
  },

  onTapCP(e) {
    const matchId = e.currentTarget.dataset.matchid
    wx.navigateTo({ url: `/pages/result-cp/result-cp?matchId=${matchId}` })
  }
})
