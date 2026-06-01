# Aviso 产品执行计划

> 智能浏览器右键助手：感知操作对象，就地调用 AI，浮窗展示结果。
>
> 当前版本：v0.1.0 ｜ 技术栈：Plasmo + React 18 + TypeScript ｜ 目标平台：Chrome MV3
>
> 本文档是接管后的执行基线。验收口径见 [ACCEPTANCE_CRITERIA.md](./ACCEPTANCE_CRITERIA.md)。

---

## 1. 产品边界与原则

- **入口多元**：右键菜单、划词工具栏、命令面板、剪贴板感知四类触发统一汇聚到浮窗。
- **就地不打断**：结果以页面内浮窗流式展示，可复制、保存、继续追问。
- **隐私优先**：API Key 加密保存在本机；AI 请求直连模型厂商；不引入自建后端、遥测或分析 SDK。
- **权限克制**：不为远端链接正文总结扩大广域 `host_permissions`，除非产品明确接受该取舍。
- **发布前证据优先**：自动化检查、Chrome 手动 QA、真实 provider 验证和商店素材必须分开记录，不互相替代。

---

## 2. 里程碑总览

| 里程碑 | 主题 | 接管基线状态 | 完成口径 |
|--------|------|--------------|----------|
| M0 | 现状基线 | ✅ 已达成 | 项目结构、主要源码、脚本、构建产物和风险已盘点 |
| M1 | 主链路打磨 | ✅ 代码项已完成，用户反馈 A-G 基本通过 | 四类入口与设置开关联动；页面总结可抽取当前页正文；模型选择可回显 |
| M2 | 自定义模板闭环 | ✅ 代码项已完成，用户反馈 A-G 基本通过 | Popup 模板可增改删；右键菜单动态同步；占位符可展开 |
| M3 | 历史与命令面板完善 | ✅ 代码项已完成，用户反馈 A-G 基本通过 | 历史可管理；命令面板搜索/意图路由/历史复用有真实行为 |
| M4 | 健壮性与隐私收尾 | ✅ 代码项已完成，待发布复核 | 错误归一、敏感过滤测试、权限最小化、内联隐私说明、正文截断已具备 |
| M5 | 测试与上架 | ⚠️ 自动化和 A-G 内部试用基线已具备，发布仍未放行 | 公开发布前还需 provider 验证、隐私政策、商店素材、打包、tag 和回滚方案 |

---

## 3. 已完成的代码基线

### M1 · 主链路打磨

- Popup 的 `enableToolbar`、`enableCommandPalette`、`enableClipboardSense` 已分别联动对应入口。
- 当前页面总结会向 content script 请求 Readability 正文，并做长度截断。
- 右键模型 radio 会按已保存默认模型回显，并与 Popup 变更同步。
- 划词工具栏已去掉空壳 `more`，`send` 走自由对话。
- 命令面板意图路由覆盖 `explain` / `translate` / `polish` / `summarize` / `search` / `navigate` / `custom`。

### M2 · 自定义模板闭环

- 右键模板菜单按 `settings.templates` 动态注册。
- Popup 保存模板后通过 `UPDATE_TEMPLATES` 重建右键菜单。
- 模板支持 `{{selection}}`、`{{url}}`、`{{page}}` 占位符展开。
- Popup 已提供表单式模板新增、编辑、删除和上下文选择。

### M3 · 历史与命令面板

- Popup 有历史标签页，支持查看、置顶、删除、清空。
- 浮窗保存有反馈，并按 requestId 去重。
- 命令面板快捷键为 Mac `Command+Shift+Space`、Windows/Linux `Ctrl+Shift+Space`。
- 命令面板只保留有真实产出的结果类型：历史和书签。
- 历史项可按原始 operation 重新执行。

### M4 · 健壮性与隐私

- AI 错误会归一成用户可读中文提示。
- 剪贴板敏感域名和敏感内容已有单元测试覆盖。
- Manifest 权限保持最小可用集合：`contextMenus`、`activeTab`、`storage`、`bookmarks`、`clipboardWrite`。
- Popup 隐私说明改为内联展示，不再指向未确认外部页面。
- 页面正文透传有长度上限，避免无控制地塞入模型上下文。

### M5 · 测试与发布基线

- `tests/unit.test.ts` 覆盖剪贴板类型/敏感过滤、模板展开和错误归一。
- `tests/manual-test.html` 覆盖 A-G 手动验收路径。
- `tests/iframe-fixture.html` 覆盖 iframe / Hugging Face Spaces / Gradio 类场景。
- 生产构建目标为 `build/chrome-mv3-prod`。

---

## 4. 发布前仍需完成

1. 在真实 Chrome 中加载 `build/chrome-mv3-prod`，按 A-G 补录 Chrome 版本、操作系统、验收时间、异常备注和必要截图。
2. 使用用户明确批准的真实 Key 验证 OpenAI / Anthropic 至少各一条最小调用路径；豆包 / 火山方舟需补充结构化验证记录。
3. 准备商店图标、截图、描述、隐私政策页面和版本说明。
4. 按 [RELEASE_CHECKLIST.md](../RELEASE_CHECKLIST.md) 完成权限、隐私、API Key、构建产物和回滚门禁。
5. 当前已有本地 Git 基线提交；正式发布前仍需确认 GitHub 远端、release tag 和回滚点。

---

## 5. 已知限制

- **远端链接正文总结**：当前只透传链接 URL，不抓取远端页面正文。实现该能力通常需要扩大 `host_permissions`，不在 Issue 001 范围内。
- **真实浏览器验收证据不完整**：用户已反馈 A-G 基本通过，但 Chrome 版本、操作系统、截图或逐项异常备注仍未补齐。
- **真实模型调用未完全验证**：豆包 / 火山方舟用户确认可用；OpenAI / Anthropic 尚未在批准后完成最小调用验证。
- **商店发布未准备完成**：素材、隐私政策页面、发布账号与回滚方案仍需人工确认。

---

## 6. 推荐后续顺序

1. 补录 Chrome A-G 手动验收环境与逐项记录。
2. 在用户批准后做 OpenAI / Anthropic 真实 provider 最小路径验证，并补充豆包结构化记录。
3. 补齐商店素材和隐私政策页面。
4. 在发布包确认后创建 release tag 与回滚记录，再进入公开发布流程。
