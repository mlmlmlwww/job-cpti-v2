# JOB-CPTI v2 · 完整代码

这是按最新 PRD 生成的 v2 版本，相比 v1 有下列变化：

**页面调整**
- 首页极简（去掉 11 人格标签展示）
- 答题页去掉每 5 题的鼓励文案
- 单人结果页精简（去掉详细描述/雷区/人格倾向条，加人格图片）
- 新增 CP 结果页（每种 CP 一张图片）
- 新增邀请欢迎页
- 新增匹配码输入页
- 新增我的 CP 列表

**云函数**（v1 4 个 → v2 7 个）
- user_init / get_questions / submit_answers / get_persona_detail（v1 已有，修复了 personaScores null 的 bug）
- match_by_code（新增，用于匹配码匹配）
- get_cp_result（新增，用于获取 CP 结果）
- get_my_cps（新增，用于查询我的 CP 列表）

**数据库**
- v1 已建的 4 个集合继续用
- 新增 `matches` 集合（存储匹配关系）
- 图片存在云存储 `personas/` 和 `cp/` 目录，字段填 fileID 到 `personas.avatarUrl` 和 `cp_templates.shareImage`

---

## 快速部署步骤

### 1. 项目初始化

- 用微信开发者工具打开 `job-cpti-v2` 目录（选择"云开发"项目模板）
- 修改 `project.config.json` 里的 `appid` 为你自己的
- 修改 `miniprogram/app.js` 里的 `env` 为你自己的云开发环境 ID

### 2. 数据库

云开发控制台 → 数据库，需要 5 个集合：
- `users`
- `personas`
- `questions`
- `cp_templates`
- `matches`（**新增，必须建**）

权限：`personas` / `questions` / `cp_templates` 设为"所有用户可读，仅创建者可读写"，其他两个"仅创建者可读写"。

如果你已经在 v1 里灌好了 personas/questions/cp_templates 数据，直接**沿用**，不用重新导入。

### 3. 上传云函数

对 `cloudfunctions/` 下 7 个文件夹分别右键 → "上传并部署：云端安装依赖"。

### 4. 上传图片（可选，可先跳过）

- 云开发控制台 → 云存储 → 新建目录 `personas` 和 `cp`
- 上传：
  - 人格图：`personas/1.png` ~ `personas/11.png`（11 张）
  - CP 图：`cp/1_1.png` ~ `cp/10_11.png`（66 张，小 ID 在前）
- 上传后每张图会有一个 fileID
- 需要更新数据库：
  - `personas` 集合，对每条记录的 `avatarUrl` 字段填入对应人格图 fileID
  - `cp_templates` 集合，对每条记录的 `shareImage` 字段填入对应 CP 图 fileID

**MVP 阶段可跳过这一步**：前端已经写了占位图逻辑，图片没上传时会显示纯色卡片。

### 5. 编译测试

顶部"编译"按钮 → 模拟器打开首页 → 走一遍完整流程。

---

## 目录结构

```
job-cpti-v2/
├── miniprogram/
│   ├── app.js / app.json / app.wxss
│   ├── sitemap.json
│   └── pages/
│       ├── home/          首页（极简版）
│       ├── invite/        邀请欢迎页
│       ├── quiz/          答题页
│       ├── loading/       计算加载页
│       ├── result-single/ 单人结果页（带图）
│       ├── result-cp/     CP 结果页（带图）
│       ├── my-cps/        我的 CP 列表
│       ├── match-code/    匹配码输入
│       └── about/         玩法说明
├── cloudfunctions/
│   ├── user_init/
│   ├── get_questions/
│   ├── submit_answers/    （集成了自动匹配逻辑）
│   ├── get_persona_detail/
│   ├── match_by_code/     （新）
│   ├── get_cp_result/     （新）
│   └── get_my_cps/        （新）
└── project.config.json
```

---

## 关于图片命名

- 人格图：`personas/{personaId}.png`
- CP 图：`cp/{lowPersonaId}_{highPersonaId}.png`（小 ID 在前）

对照表参考 PRD 里的 14.1 章节。
