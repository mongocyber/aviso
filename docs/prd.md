# Aviso PRD

Updated: 2026-07-06

## 产品目标

Aviso 帮用户在当前网页内快速调用 AI。用户不需要离开页面，就可以对选中文字、当前页面、图片或自己输入的问题进行解释、翻译、润色、总结和继续追问。

当前版本、Chrome Web Store 状态、BYOK/hosted AI 边界和 release gate 以 [STATE.md](./STATE.md) 为准；本文件只描述当前产品需求和验收入口。

## 用户对象

- 需要频繁阅读网页资料、技术文档、英文内容或长页面的人。
- 需要把网页内容快速转成解释、摘要、翻译或改写的人。
- 愿意使用自己的 API Key 连接模型 provider 的内部试用用户。

## 当前需求

### 1. 触发入口

- 用户可以通过 Chrome 右键菜单触发解释、翻译、润色、总结、页面总结、图片说明、复制当前上下文、模型切换和自定义指令。
- 用户选中文本后可以通过划词工具栏触发解释、翻译、润色、总结和发送给 AI。
- 用户可以通过命令面板搜索本地浏览历史、书签、Aviso 本地 AI 对话，或直接输入问题；打开 URL、打开历史/书签、当前页面翻译和当前页面总结都需要用户选择候选后才执行。
- 用户可以开启双击快捷菜单，在安全网页区域双击后使用紧凑入口。
- 用户复制普通文本后可以看到剪贴板提示；敏感页面和敏感内容不提示。

### 2. 结果体验

- AI 结果在页面内结果面板中流式展示。
- 用户可以复制结果、保存对话、继续追问。
- 结果面板对话默认保存到本地历史，最多保留最近记录，并保留用户手动保存的会话。
- 等待时显示明确状态文案；慢首段返回会进入 provider-waiting 状态，真实模型返回内容后立即替换为真实输出。

### 3. 翻译体验

- 右键选区、划词工具栏、命令面板输入和划词翻译卡都复用同一翻译能力。
- 翻译目标语言由独立设置控制。
- 短选区可就地显示翻译卡；长选区进入结果面板。
- 翻译输入来源为用户选中的文本或用户在命令面板中输入的文本。

### 4. 设置体验

- Popup 提供 `设置`、`AI 服务`、`记录`、`指令` 四个区域。
- 用户可以切换界面语言：自动、中文、English。
- 用户可以切换外观主题：浅色、深色、跟随系统。
- 用户可以管理多个 AI 服务配置，设置默认服务，手动编辑模型 ID。
- 用户可以在 v0.3 production candidate 中看到 Aviso AI / hosted AI 作为可选服务；只有选择托管路径时才需要登录，BYOK provider 配置和直连请求不受托管登录状态影响。
- 用户可以配置 OpenAI、Anthropic、豆包 / Volcengine Ark、DeepSeek、Kimi / Moonshot、OpenRouter、Gemini、Tencent Hunyuan；DeepSeek 已有一次 owner 手动 connectivity pass，Kimi / Moonshot、OpenRouter、Gemini 和 Tencent Hunyuan 当前只代表 BYOK direct-provider 配置支持或非 live 验证，不能写成 live validated。OpenRouter、Gemini 和 Tencent Hunyuan 模型 ID 需要手动填写，Aviso 不自动读取模型列表。
- 用户可以手动测试单个 provider 连接，测试结果只显示脱敏摘要。
- 用户可以管理本地历史和自定义指令。

### 5. 语言本地化

- 运行时 UI 默认跟随 Chrome UI language：中文环境显示中文，其他环境显示 English。
- 用户可以在 Popup 中覆盖界面语言。
- Chrome 扩展描述和快捷键说明通过源码 `locales/zh_CN` 和 `locales/en` 本地化；构建时输出到 Chrome 扩展的 `_locales` 目录。

## 数据与隐私需求

- API Key 必须不明文保存，并保存在 `chrome.storage.local/contextai_api_keys`，不进入 sync。
- 当前 API Key 保护属于由扩展 ID 派生口令的本地加密 / 混淆级保护；它不防御已能读取本机浏览器 profile 或本机已被控制的攻击者。
- 非敏感设置必须保存在 `chrome.storage.sync/contextai_settings`。
- 本地 AI 对话历史保存在 `chrome.storage.local/contextai_history`。
- AI 请求只在用户主动触发时发送到用户选择的 provider。
- BYOK 路径不经过 Aviso 后端；v0.3 production candidate hosted 路径仅在用户主动选择并登录后经过 Aviso production 后端和上游 provider。
- 浏览历史、书签和本地 AI 对话用于命令面板本地候选展示，不自动进入 AI 请求。
- Provider 连接测试由用户在 Popup 中手动触发，并展示脱敏摘要。
- 当前公开产品不做自主浏览、联网搜索、远端链接正文抓取、遥测或分析；hosted AI 的候选证据和剩余 release gate 以 [STATE.md](./STATE.md) 为准。

## 验收标准

当前 PRD 的验收标准见 [acceptance-criteria.md](./acceptance-criteria.md)，执行记录见 [../RELEASE_CHECKLIST.md](../RELEASE_CHECKLIST.md)。
