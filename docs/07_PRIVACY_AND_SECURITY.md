# Aviso Privacy and Security

Updated: 2026-06-11

## 核心原则

Aviso 当前是 BYOK direct-provider 浏览器扩展。用户提供自己的 API Key，扩展在用户主动触发 AI 动作时直接请求所选 provider。项目方不运行后端，不中转模型请求，不收集遥测，不使用分析 SDK。

## 数据存储

| 数据 | 存储位置 | 说明 |
| --- | --- | --- |
| API Key | `chrome.storage.local/contextai_api_keys` | 不明文保存，不同步；当前使用由扩展 ID 派生的口令做本地加密 / 混淆级保护。 |
| 设置 | `chrome.storage.sync/contextai_settings` | 非敏感设置，包括功能开关、界面语言、主题、默认服务、自定义指令和 provider metadata。 |
| 本地 AI 对话历史 | `chrome.storage.local/contextai_history` | 本地保存，不包含 API Key。 |
| 运行时短缓存 | Service worker 内存 | 随运行时失效，不持久化。 |

## 权限

普通权限：

- `contextMenus`
- `activeTab`
- `storage`
- `history`
- `bookmarks`
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

## 数据流

### AI 请求

1. 用户通过右键、划词工具栏、命令面板、双击菜单、划词翻译卡或结果面板追问主动发起动作。
2. Aviso 只整理该动作需要的输入。
3. Background 读取当前默认 provider config 和本地保存的 API Key。
4. 浏览器扩展直接请求对应 provider host。
5. 流式结果返回页面内结果面板。

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

## API Key 保护边界

API Key 不明文保存，位置是 `chrome.storage.local/contextai_api_keys`，不会进入 Chrome sync。当前口令由扩展 ID 派生，属于本地加密 / 混淆级保护：它能避免普通配置同步和直接明文暴露，但不防御已能读取本机浏览器 profile 或本机已被控制的攻击者。

## 安全维护要求

- 修改权限、host permissions、API Key 存储、provider route 或真实 provider 调用前必须单独确认。
- 新增用户数据流时必须同步更新 `docs/03_TECH_SPEC.md`、本文档和 `RELEASE_CHECKLIST.md`。
- 不把当前内部试用记录写成公开发布批准。
- 不把 DeepSeek、Kimi / Moonshot、OpenRouter、Gemini、Tencent Hunyuan 等配置支持写成真实 provider live validation。
