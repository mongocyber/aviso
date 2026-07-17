# Aviso Privacy and Security

Updated: 2026-07-17

生产级安全生命周期入口见 [`security/README.md`](./security/README.md)；本文继续持有扩展权限、存储和数据流的实现详情，当前状态以 [`STATE.md`](./STATE.md) 为准。

## 核心原则

Aviso 当前保留 BYOK direct-provider 作为默认路径，并在 v0.3 中准备可选托管 AI 路径。

- BYOK direct-provider：用户提供自己的 API Key，扩展在用户主动触发 AI 动作时直接请求所选 provider；不强制登录，不经过 Aviso 后端。
- 托管 AI：用户主动选择托管路径并登录后，请求经过 Aviso 后端和上游 provider；BYOK 配置和直连请求不受托管登录状态影响。

Aviso 不收集遥测，不使用分析 SDK，不出售用户数据，不把用户数据用于广告或信用/借贷类决策。

## 数据存储

| 数据 | 存储位置 | 说明 |
| --- | --- | --- |
| API Key | `chrome.storage.local/contextai_api_keys` | 不明文保存，不同步；当前使用由扩展 ID 派生的口令做本地加密 / 混淆级保护。 |
| 设置 | `chrome.storage.sync/contextai_settings` | 非敏感设置，包括功能开关、界面语言、主题、默认服务、自定义指令和 provider metadata。 |
| 本地 AI 对话历史 | `chrome.storage.local/contextai_history` | 本地保存，不包含 API Key。 |
| 托管 AI session/account state | `chrome.storage.local` hosted account/session records | 仅用于托管路径登录态、账号和额度展示；退出托管账号不删除 BYOK 配置。 |
| 运行时短缓存 | Service worker 内存 | 随运行时失效，不持久化。 |

## 权限

普通权限：

- `contextMenus`
- `activeTab`
- `storage`
- `history`
- `bookmarks`
- `identity`
- `clipboardWrite`

Host permissions：

- `https://api.openai.com/*`
- `https://api.anthropic.com/*`
- `https://ark.cn-beijing.volces.com/*`
- `https://api.deepseek.com/*`
- `https://api.moonshot.cn/*`
- `https://openrouter.ai/*`
- `https://generativelanguage.googleapis.com/*`
- `https://api.hunyuan.cloud.tencent.com/*`
- `https://aviso-backend-production.vercel.app/*`

`identity` 和 `https://aviso-backend-production.vercel.app/*` 仅在 production candidate 托管 AI gate 中批准。它们不代表公开发布、Chrome Web Store 批准或 hosted AI live；当前 release gate 以 [STATE.md](./STATE.md) 为准。

Content-script frame access：

- Top-frame only：命令面板、结果浮窗和截图选区。
- All frames：划词工具栏 / 划词翻译卡、默认关闭的双击菜单、剪贴板 host / 复制写入、Readability / editable extraction listener（由右键或命令面板页面动作触发）和 iframe 命令面板快捷键 bridge。

剪贴板感知默认关闭。缺失设置按关闭处理；关闭时不会常驻注册 copy listener；只有用户在 Popup 明确开启后才注册，关闭后会移除。开启时仍会执行敏感域名和敏感内容过滤。

跨 frame 的“复制当前上下文”会从来源 frame 抽取内容，再通过显示 frame 写入剪贴板；DOM textarea fallback 默认禁止，只有确认来源为 top frame 的调用方才能显式启用，避免把子 frame 上下文临时插入父页面 DOM。

本轮 MON-41 frame / clipboard / manifest 修复不新增普通权限、host permissions、provider/network call、storage key、依赖或 production config。

## 数据流

### AI 请求

1. 用户通过右键、划词工具栏、命令面板、双击菜单、划词翻译卡或结果面板追问主动发起动作。
2. Aviso 只整理该动作需要的输入。
3. Background 读取当前默认 provider config 和本地保存的 API Key。
4. 浏览器扩展直接请求对应 provider host。
5. 流式结果返回页面内结果面板。

### 托管 AI 请求

1. 用户主动选择托管 AI 路径。
2. 若未登录，用户通过 Chrome identity / Google 授权窗口登录托管账号；BYOK 路径不需要该登录。
3. Background 使用临时 id token 与 production 后端交换托管 session，并只保存托管 session/account state。
4. 请求发送到 Aviso 后端，再路由到上游 provider。
5. 后端返回流式结果，页面内结果面板展示。

托管后端不持久化 raw prompt、raw provider response、页面正文、截图/base64、剪贴板内容、用户 BYOK API Key 或完整 URL。账户、额度、风控、请求状态和运营排查所需 metadata 当前保留 30 天。

### 本地搜索

命令面板可搜索 Chrome 浏览历史、书签和 Aviso 本地 AI 对话。浏览历史、书签和本地对话只用于本地候选展示，不进入 AI 请求，不写入 Aviso 远端服务，也不发送给 provider。

命令面板打开 URL、浏览历史和书签结果时，只展示可安全打开的 `http` / `https` 候选。用户必须选择候选后才会打开页面；`javascript:`、`data:`、`file:`、`chrome:`、`chrome-extension:`、`about:`、`blob:` 等内部或危险 scheme 不作为可打开候选。

选择 Aviso 本地 AI 对话只恢复本地保存的对话，不重新发送给 provider。

### 命令面板页面动作

命令面板的当前页面总结和当前页面翻译需要用户明确选择候选后才读取页面正文，并通过既有 BYOK direct-provider 路径处理。搜索候选、浏览历史、书签或本地对话不会自动触发页面正文读取，也不会自动发送给 provider。

命令面板不做联网搜索、远端链接正文抓取、自主多步浏览或自动打开危险 URL scheme。

### 复制当前上下文

复制当前上下文只写入用户剪贴板，不调用 provider，不写入 history、storage、docs、console 或远端服务。

### 截图

截图只在用户主动通过右键内部路径触发并确认选区后使用。截图/base64 只用于当次图片说明请求，不写入 history、storage、docs、console、telemetry 或 release artifacts。当前不把截图作为普通用户主入口或公开卖点。

### Provider 连接测试

连接测试只能由用户在 Popup 手动触发，一次只测一个 provider。测试 payload 使用固定公开短句，不包含网页正文、选区、截图、剪贴板内容或私人数据。UI 只展示脱敏摘要。

## 不收集和不保存

Aviso 当前不收集、不远端保存：

- API Key 明文。
- raw prompt。
- raw provider response。
- 私人网页正文。
- 选中文字原文日志。
- 完整 URL 日志。
- 截图或图片 base64。
- 剪贴板内容日志。
- 远端 telemetry 或 analytics。
- 联网搜索或远端链接正文抓取结果。

托管 AI 后端当前允许保存的仅限账户、额度、风控、请求状态和运营排查所需 metadata，保留 30 天。任何扩大 metadata 字段、保留窗口、日志内容、provider logging 或生产数据流的变更，都必须重新过 release gate。

## API Key 保护边界

API Key 不明文保存，位置是 `chrome.storage.local/contextai_api_keys`，不会进入 Chrome sync。当前口令由扩展 ID 派生，属于本地加密 / 混淆级保护：它能避免普通配置同步和直接明文暴露，但不防御已能读取本机浏览器 profile 或本机已被控制的攻击者。

## 安全维护要求

- 修改权限、host permissions、API Key 存储、provider route 或真实 provider 调用前必须单独确认。
- 修改托管 AI metadata 字段、保留窗口、provider logging、OAuth 数据处理或 production backend 前必须单独确认。
- 新增用户数据流时必须同步更新 `docs/tech-spec.md`、本文档和 `RELEASE_CHECKLIST.md`。
- 不把当前内部试用记录写成公开发布批准。
- 不把 DeepSeek、Kimi / Moonshot、OpenRouter、Gemini、Tencent Hunyuan 等配置支持写成真实 provider live validation；DeepSeek 的 owner 手动 connectivity pass 只能按单次 summary-only evidence 描述。
