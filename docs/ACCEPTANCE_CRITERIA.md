# Aviso Acceptance Criteria

Updated: 2026-06-08

## 基础验收

- [ ] `git diff --check` 通过。
- [ ] `npm test` 通过。
- [ ] `npx tsc --noEmit` 通过。
- [ ] `npm run build` 通过。
- [ ] Chrome 能加载 `build/chrome-mv3-prod`。
- [ ] `tests/manual-test.html` 的 A-G 清单完成记录。

## 功能验收

- [ ] 右键菜单可以触发解释、翻译、润色、总结、页面总结、图片说明、复制当前上下文、模型切换和自定义指令。
- [ ] 划词工具栏可以触发解释、翻译、润色、总结和发送给 AI。
- [ ] 划词翻译卡在开启后可以显示短选区翻译结果，并支持复制、重试和打开结果面板。
- [ ] 命令面板快捷键可打开；可以搜索浏览历史、书签、本地 AI 对话，也可以直接提问。
- [ ] 剪贴板提示只对普通文本触发，敏感页面和敏感内容跳过。
- [ ] 双击快捷菜单默认关闭；开启后避开输入框、可编辑区域、常见代码编辑器和 Aviso 自身 UI。
- [ ] 结果面板支持流式展示、复制、保存、继续追问和本地历史。
- [ ] Popup 可管理界面语言、外观主题、功能开关、AI 服务配置、默认服务、本地历史和自定义指令。
- [ ] OpenAI / Anthropic / 豆包配置的模型 ID 或接入点可以手动编辑。

## 本地化验收

- [ ] 中文 Chrome 下扩展描述为中文。
- [ ] 英文 Chrome 下扩展描述为英文。
- [ ] 中文 Chrome 下快捷键说明为中文。
- [ ] 英文 Chrome 下快捷键说明为 `Open command palette`。
- [ ] Popup 设置里的界面语言切换可以立即影响运行时 UI。
- [ ] UI 语言不影响翻译目标语言设置。

## 权限与隐私验收

- [ ] 普通权限仍为 `contextMenus`、`activeTab`、`storage`、`history`、`bookmarks`、`clipboardWrite`。
- [ ] Host permissions 仍为 OpenAI、Anthropic、火山方舟北京网关。
- [ ] API Key 仍加密保存在 `chrome.storage.local/contextai_api_keys`。
- [ ] 非敏感设置仍保存在 `chrome.storage.sync/contextai_settings`。
- [ ] 本地对话历史仍保存在 `chrome.storage.local/contextai_history`。
- [ ] 浏览历史和书签只用于本地搜索，不进入 AI 请求。
- [ ] 截图/base64 不写入 history、storage、docs、console 或远端服务。
- [ ] 不新增后端、provider proxy、遥测、分析 SDK、账号、订阅、支付或匿名额度。

## 当前记录

- A-G 手动验收：用户反馈基本通过。
- 豆包 / 火山方舟：用户确认可用。
- OpenAI：真实最小调用尚未验收。
- Anthropic：真实最小调用尚未验收。
- 英文界面：用户 smoke check 未发现明显问题。
- 模型 ID 编辑：用户确认可以编辑。

这些记录只代表当前内部试用状态，不代表公开发布批准。
