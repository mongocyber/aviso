# Aviso Acceptance Criteria

Updated: 2026-06-30

## 验收标准

这些条目定义发布候选应满足的标准，不等于当前执行记录已经全部补齐。

- `git diff --check` 应通过。
- `npm test` 应通过。
- `npx tsc --noEmit` 应通过。
- `npm run build` 应通过。
- `npm run package` 应能生成规范候选包。
- Chrome 应能加载 `build/chrome-mv3-prod`。
- `tests/manual-test.html` 的 A-G 清单应完成记录。

检查命令需要 Node 22+ 的本地环境；当前 `package.json` 已通过 `engines.node` 声明 `>=22.6.0`。`build/chrome-mv3-prod` 应来自 `npm run package`，不是直接加载 `.output/chrome-mv3`。

## 功能验收

- 右键菜单可以触发解释、翻译、润色、总结、页面总结、图片说明、复制当前上下文、模型切换和自定义指令。
- 划词工具栏可以触发解释、翻译、润色、总结和发送给 AI。
- 划词翻译卡在开启后可以显示短选区翻译结果，并支持复制、重试和打开结果面板。
- 命令面板快捷键可打开；可以搜索浏览历史、书签、本地 AI 对话，也可以直接提问。
- 剪贴板提示只对普通文本触发，敏感页面和敏感内容跳过。
- 双击快捷菜单默认关闭；开启后避开输入框、可编辑区域、常见代码编辑器和 Aviso 自身 UI。
- 结果面板支持流式展示、复制、保存、继续追问和本地历史。
- Popup 可管理界面语言、外观主题、功能开关、AI 服务配置、默认服务、本地历史和自定义指令。
- OpenAI / Anthropic / 豆包 / DeepSeek / Kimi-Moonshot / OpenRouter / Gemini / Tencent Hunyuan 配置的模型 ID 或接入点可以手动编辑。
- 命令面板本地候选、打开/页面动作 confirm-first、危险 URL 拦截和本地 AI 对话恢复需要通过功能验证与 loaded-extension 复核。

## 本地化验收

- 中文 Chrome 下扩展描述为中文。
- 英文 Chrome 下扩展描述为英文。
- 中文 Chrome 下快捷键说明为中文。
- 英文 Chrome 下快捷键说明为 `Open command palette`。
- Popup 设置里的界面语言切换可以立即影响运行时 UI。
- UI 语言不影响翻译目标语言设置。

## 权限与隐私验收

- 普通权限仍限于当前批准范围：`contextMenus`、`activeTab`、`storage`、`history`、`bookmarks`、`identity`、`clipboardWrite`。
- `identity` 仅用于 v0.3 hosted AI 的用户主动 Google 授权窗口和 session 交换；BYOK 不需要该登录。
- Host permissions 仍限于已批准 provider host：OpenAI、Anthropic、火山方舟北京网关、DeepSeek、Moonshot、OpenRouter、Gemini、Tencent Hunyuan，以及 v0.3 production candidate hosted AI 域名 `https://aviso-backend-production.vercel.app/*`。
- production candidate hosted host permission 不代表公开发布、Chrome Web Store 批准或 hosted AI live；当前 release gate 以 [STATE.md](./STATE.md) 为准。
- API Key 仍不明文保存，并保存在 `chrome.storage.local/contextai_api_keys`。
- 当前 API Key 保护边界已写明：由扩展 ID 派生口令提供本地加密 / 混淆级保护，不防御已能读取本机浏览器 profile 或本机已被控制的攻击者。
- 非敏感设置仍保存在 `chrome.storage.sync/contextai_settings`。
- 本地对话历史仍保存在 `chrome.storage.local/contextai_history`。
- 浏览历史和书签只用于本地搜索，不进入 AI 请求。
- 截图/base64 不写入 history、storage、docs、console 或远端服务。
- 不新增 provider proxy、遥测、分析 SDK、订阅、支付或公开匿名额度；v0.3 hosted AI 只能按 pre-release gate 描述，不能写成 live。

## 证据入口

本文件只定义验收标准，不维护执行证据副本。当前状态和历史证据请从以下入口读取：

- 当前事实源：[`STATE.md`](./STATE.md)。
- 当前状态视图：[`../STATUS.md`](../STATUS.md)。
- 发布和内部试用门禁：[`../RELEASE_CHECKLIST.md`](../RELEASE_CHECKLIST.md)。
- 当前执行 gate：[`ai/CURRENT_GATE.md`](./ai/CURRENT_GATE.md)。
- v0.3 hosted AI gate：[`planning/v0.3/status.md`](./planning/v0.3/status.md) 和 [`planning/v0.3/release-gates.md`](./planning/v0.3/release-gates.md)。
- v0.2 历史证据：[`archive/v0.2/README.md`](./archive/v0.2/README.md)。

截图能力仅按右键主动触发的内部路径保留，不作为普通用户主入口或公开卖点。
