// pages/my-cps/my-cps.js
const cache = require('../../utils/cache.js')
const CACHE_KEY = 'my_cps_list'

Page({
  data: {
    list: [],
    total: 0,
    loading: true
  },

  onLoad() {
    // 先展示缓存（stale），再后台刷新（revalidate）
    const cached = cache.getSync(CACHE_KEY)
    if (cached && cached.list) {
      this.setData({
        list: cached.list,
        total: cached.total || cached.list.length,
        loading: false
      })
    }
    this.loadList()
  },

  onShow() {
    // 页面已挂载且已有数据时，onShow 静默后台刷新（不遮罩）
    if (this.data.list.length > 0) this.loadList(true)
  },

  async loadList(silent) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'get_my_cps',
        data: { page: 1, pageSize: 50 }
      })
      if (res.result && res.result.code === 0) {
        const data = res.result.data
        cache.setSync(CACHE_KEY, { list: data.list, total: data.total, at: Date.now() })
        this.setData({
          list: data.list,
          total: data.total,
          loading: false
        })
      } else if (!silent) {
        this.setData({ loading: false })
      }
    } catch (err) {
      console.error(err)
      if (!silent) this.setData({ loading: false })
    }
  },

  onTapCP(e) {
    const matchId = e.currentTarget.dataset.matchid
    wx.navigateTo({ url: `/pages/result-cp/result-cp?matchId=${matchId}` })
  }
})
