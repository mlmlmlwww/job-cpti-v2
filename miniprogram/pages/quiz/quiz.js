// pages/quiz/quiz.js
const app = getApp()
const OPTIONS = ['从未', '很少', '有时', '经常', '总是']
const OPTION_TIPS = ['完全不是我', '偶尔会这样', '有时候吧', '经常这样', '这就是我']

Page({
  data: {
    questions: [],
    currentIndex: 0,
    currentQuestion: null,
    answers: [],
    progress: 0,
    options: OPTIONS,
    optionTips: OPTION_TIPS,
    loading: true
  },

  async onLoad() {
    await this.loadQuestions()
  },

  async loadQuestions() {
    try {
      let questions = app.globalData.questions
      if (!questions) {
        // 读本地缓存（当天有效）
        const today = new Date().toDateString()
        const cacheDate = wx.getStorageSync('cpti_questions_date')
        if (cacheDate === today) {
          questions = wx.getStorageSync('cpti_questions')
        }
      }
      if (!questions || questions.length === 0) {
        const res = await wx.cloud.callFunction({ name: 'get_questions' })
        if (res.result && res.result.code === 0) {
          questions = res.result.data.questions
          app.globalData.questions = questions
          // 写入本地缓存
          wx.setStorageSync('cpti_questions', questions)
          wx.setStorageSync('cpti_questions_date', new Date().toDateString())
        }
      }
      if (!questions || questions.length === 0) {
        wx.showModal({ title: '题库加载失败', content: '请检查数据库', showCancel: false })
        return
      }
      this.setData({
        questions,
        currentQuestion: questions[0],
        answers: new Array(questions.length).fill(null),
        loading: false,
        progress: Math.round(1 / questions.length * 100)
      })
    } catch (err) {
      console.error('加载题库失败', err)
    }
  },

  onSelectOption(e) {
    const value = e.currentTarget.dataset.value
    const { currentIndex, answers, questions } = this.data
    answers[currentIndex] = value

    const nextIndex = currentIndex + 1
    const isLast = nextIndex >= questions.length

    this.setData({ answers })

    if (isLast) {
      this.submitAnswers()
    } else {
      setTimeout(() => {
        this.setData({
          currentIndex: nextIndex,
          currentQuestion: questions[nextIndex],
          progress: Math.round((nextIndex + 1) / questions.length * 100)
        })
      }, 180)
    }
  },

  onPrev() {
    const { currentIndex, questions } = this.data
    if (currentIndex === 0) return
    const prevIndex = currentIndex - 1
    this.setData({
      currentIndex: prevIndex,
      currentQuestion: questions[prevIndex],
      progress: Math.round((prevIndex + 1) / questions.length * 100)
    })
  },

  submitAnswers() {
    app.globalData.currentAnswers = this.data.answers
    wx.redirectTo({
      url: `/pages/loading/loading?inviterId=${app.globalData.inviterId || ''}`
    })
  }
})
