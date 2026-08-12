# 灵感工坊 Creator Agent Studio

一个本地可运行的内容创作 MVP：输入主题后由内部 Agent 研究、策划并生成小红书与公众号候选稿，可选择、编辑、保存。配置 OpenAI API Key 后启用联网搜索；未配置时自动使用演示模式。

## 先做什么

产品第一阶段应优先验证完整闭环，而不是一次堆满功能：

1. **内容资产**：选题、受众、平台、语气、候选稿、版本和状态。
2. **工作流**：研究 → 大纲 → 多版本生成 → 人工选择 → 编辑 → 保存。
3. **Agent 边界**：Agent 提供候选和依据，人决定定位、事实、风格与发布。
4. **搜索可信度**：保存来源、发布日期和检索时间；事实与观点分离。
5. **质量评测**：用 10–20 个真实选题建立评测集，评分标题、结构、事实、品牌语气和可发布性。

## 运行

需要 Node.js 20+，无需安装第三方依赖：

```powershell
Copy-Item .env.example .env
npm start
```

打开 `http://localhost:3210`。没有 API Key 也能体验完整 UI 和保存流程。

### Clash 代理

若本机无法直连 OpenAI，在 Clash 中开启 **System Proxy（系统代理）**，并确认 **Mixed Port**（常见为 `7890`）。然后在 `.env` 填入：

```text
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
NO_PROXY=localhost,127.0.0.1
```

`npm start` 会先从 `.env` 加载代理，再启用 Node 的环境代理支持。本地接口不会经过代理，API 请求会通过 Clash。

启用真实 AI 与联网搜索：编辑 `.env`，设置 `OPENAI_API_KEY`。服务端使用 OpenAI Responses API 的 `web_search` 工具；模型可由 `OPENAI_MODEL` 配置。

也可以运行 `powershell -ExecutionPolicy Bypass -File .\setup-api-key.ps1`，在隐藏输入窗口中安全配置密钥。不要把 API Key 发送到聊天、提交到 Git 或写进浏览器前端。

## 当前 MVP

- 同一主题生成小红书与公众号两种平台稿件
- 每个平台提供候选版本，可一键载入编辑器
- 内容可编辑、自动统计字数并保存到本地 JSON
- 内部四角色 Agent 流程与执行轨迹
- 联网检索来源展示；无密钥时演示模式降级
- 根据正文自动生成插图策略：小红书采用竖版封面，公众号采用横版题图
- 一键应用小红书/公众号专属文字格式，排版后仍可人工编辑
- 配置 API Key 后使用 Responses API `image_generation` 工具生成并本地保存插图
- 支持粘贴最多 5 条公开博主内容链接，抽象标题、结构和表达节奏用于优化候选稿
- 参考学习遵守“只借鉴方法、不复制原文、不冒充作者”的边界
- 草稿列表、重新载入与删除
- 响应式手机界面与底部导航，可作为 PWA 安装到手机桌面
- 手机端编辑现场自动恢复、一键复制文案、图片下载与草稿搜索

## 手机使用

当前 PWA 已完成，但 `localhost` 只能在本机访问。局域网试用时需要让服务监听局域网地址并在防火墙放行端口；正式手机使用建议部署到 HTTPS 域名。PWA 的“安装到桌面”和 Service Worker 在 HTTPS（或本机 localhost）环境下功能最完整。

## 下一阶段建议

- 将 JSON 替换为 PostgreSQL，增加用户、内容版本、素材库和审计日志
- 加登录、工作区权限、对象存储与自动备份
- 建品牌语气库和爆款样本检索（RAG），但避免机械仿写
- 增加事实核验 Agent、引用覆盖率和内容质量评测
- 接入图片生成/素材管理、排版预览和合规敏感词检查
- 最后再做平台发布连接器；默认保持人工确认，不保存平台密码

## 验证

```powershell
npm test
```

API：`GET /api/health`、`GET/POST /api/drafts`、`DELETE /api/drafts/:id`、`POST /api/generate`。

联网搜索实现参考 [OpenAI Web search 官方文档](https://platform.openai.com/docs/guides/tools-web-search)。
