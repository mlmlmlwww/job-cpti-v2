// 维度条形图数据工具
const DIMENSIONS = ['人品', '焦虑', '努力', '表演', '摸鱼']
const DIM_COLORS = {
  '人品': '#8bd3ff',
  '焦虑': '#ffb0b0',
  '努力': '#b0ffbd',
  '表演': '#ffd97a',
  '摸鱼': '#d4b0ff'
}

// 把 (score, max) 组转成条形图渲染需要的数组：
// [{ name, score, max, ratio, direction, color }]
// ratio 是 |score|/max，用于条长（0~1）
// direction：'+' or '-'，用于从中间往左或右画
function buildDimBars(scores, maxes) {
  if (!scores || !maxes) return []
  return DIMENSIONS.map(name => {
    const s = Number(scores[name] || 0)
    const m = Number(maxes[name] || 0)
    const ratio = m > 0 ? Math.min(1, Math.abs(s) / m) : 0
    return {
      name,
      score: s,
      max: m,
      ratio,
      ratioPct: Math.round(ratio * 100),
      direction: s >= 0 ? 'pos' : 'neg',
      color: DIM_COLORS[name] || '#ccc'
    }
  })
}

module.exports = { DIMENSIONS, DIM_COLORS, buildDimBars }
