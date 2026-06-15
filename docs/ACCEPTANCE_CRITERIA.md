# Aviso Acceptance Criteria

Updated: 2026-06-12

## 验收标准

这些条目定义发布候选应满足的标准，不等于当前执行记录已经全部补齐。

- `git diff --check` 应通过。
- `npm test` 应通过。
- `npx tsc --noEmit` 应通过。
- `npm run build` 应通过。
- Chrome 应能加载 `build/chrome-mv3-prod`。
- `tests/manual-test.html` 的 A-G 清单应完成记录。

检查命令需要 Node 22+ 的本地环境；当前 `package.json` 已通过 `engines.node` 声明 `>=22.6.0`。

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

- 普通权限仍为 `contextMenus`、`activeTab`、`storage`、`history`、`bookmarks`、`clipboardWrite`。
- Host permissions 仍限于已批准 provider host：OpenAI、Anthropic、火山方舟北京网关、DeepSeek、Moonshot、OpenRouter、Gemini 和 Tencent Hunyuan。
- API Key 仍不明文保存，并保存在 `chrome.storage.local/contextai_api_keys`。
- 当前 API Key 保护边界已写明：由扩展 ID 派生口令提供本地加密 / 混淆级保护，不防御已能读取本机浏览器 profile 或本机已被控制的攻击者。
- 非敏感设置仍保存在 `chrome.storage.sync/contextai_settings`。
- 本地对话历史仍保存在 `chrome.storage.local/contextai_history`。
- 浏览历史和书签只用于本地搜索，不进入 AI 请求。
- 截图/base64 不写入 history、storage、docs、console 或远端服务。
- 不新增后端、provider proxy、遥测、分析 SDK、账号、订阅、支付或匿名额度。

## 当前执行记录 / 证据

- A-G 手动验收：用户已验证基本通过。
- 豆包 / 火山方舟：用户确认可用。
- OpenAI：支持配置 API Key 和模型 ID。
- Anthropic：支持配置 API Key 和模型 ID。
- DeepSeek：支持配置 API Key 和模型 ID；2026-06-12 owner 手动重新配置后确认可用，记录为 summary-only live connectivity pass；不记录 API Key、raw prompt 或 raw response，也不扩大成所有 DeepSeek 模型可用性证明。
- Kimi / Moonshot：支持配置 API Key 和模型 ID；未做真实 provider live validation。
- OpenRouter：provider id 为 `openrouter`，base URL 为 `https://openrouter.ai/api/v1`，host permission 为 `https://openrouter.ai/*`；支持配置 API Key 和手动模型 ID；未做真实 provider live validation，不自动读取模型列表。
- Gemini：provider id 为 `gemini`，base URL 为 `https://generativelanguage.googleapis.com/v1beta/openai/`，host permission 为 `https://generativelanguage.googleapis.com/*`；支持配置 API Key 和手动模型 ID；V02-018 已完成非 live 验证，未做真实 provider live validation，不自动读取模型列表。
- Tencent Hunyuan：provider id 为 `hunyuan`，base URL 为 `https://api.hunyuan.cloud.tencent.com/v1`，host permission 为 `https://api.hunyuan.cloud.tencent.com/*`；支持配置 API Key 和手动模型 ID；V02-018 已完成非 live 验证，未做真实 provider live validation，不自动读取模型列表。
- v0.2 命令面板本地意图：功能验证已通过；loaded-extension/manual QA 仍需复核。
- v0.2 速度体验：等待态和 summary-only 本地 TTFT 方法已实现；未做真实 provider live sampling，不宣称 p50 / p95 达标。
- WXT：自动构建和 manifest parity 已通过；默认构建未切换，部分 loaded-extension QA 仍未完成。
- Reasoning / thinking request-parameter control：已从当前 v0.2 scope 移除；不作为实现项、延期项或发布口径前置条件。
- Custom OpenAI-compatible base URL：当前 v0.2 明确不做；不是当前待办或延期项。
- 英文界面：用户 smoke check 未发现明显问题。
- 模型 ID 编辑：用户确认可以编辑。
- Chrome 版本、操作系统、截图和录屏证据尚未补录；当前记录不能写成完整发布验收通过。

截图能力仅按右键主动触发的内部路径保留，不作为普通用户主入口或公开卖点。

## v0.2 验证线程复核清单

验证线程需要逐项确认。Closed rows 只用于追溯当前边界，不代表 active remaining delivery：

- `V02-WXT-005`：WXT loaded-extension QA 是否覆盖 Popup、floating trigger、command palette、clipboard toast、double-click menu、screenshot right-click internal path、readability 和 iframe surfaces。
- `V02-WXT-006`：Closed，当前 v0.2 保持 Plasmo 默认构建；WXT default-build migration 移到单独 `v0.2.1`，自动 parity 不等于默认切换。
- `V02-009`：DeepSeek 已记录 owner 手动 live connectivity pass；OpenRouter 最近手动测试失败类别为 `unauthorized`，不能写成 live validated；provider live validation 不是当前 v0.2 configuration-support wording 的必要条件，记录必须 summary-only。
- `V02-010`：Closed，OpenRouter 只能写为 configuration support，不能写成 live validated。
- `V02-011`：Closed / accepted，宽松保存只表示配置可保存；缺 Key、缺模型/endpoint 或未测试状态不能升级为 provider 可用证明。
- `V02-012`：Fast-model strategy 已有 operation-level 行为；loaded-extension behavior 仍需 release-gate 复核。
- `V02-013`：Closed / removed，Reasoning / thinking 请求参数不做；不需要实现证明，也不能写成当前 v0.2 能力。
- `V02-014`：Closed，当前 v0.2 只承认感知等待优化和 summary-only TTFT 方法；不要求 live sampling，不写 p50 / p95 达标声明。
- `V02-015`：Closed / not doing，Custom OpenAI-compatible base URL 不属于当前 v0.2；未来如需恢复，必须新开 owner-approved issue。
- `V02-016`：Batch 2 preflight 已完成；Gemini 与 Tencent Hunyuan 进入配置支持实现线，Qwen / DashScope 仍 deferred，智谱 GLM 仍 deferred / unresolved。
- `V02-017`：CTO accepted as non-live configuration support for Gemini / Tencent Hunyuan；继续保持 fixed preset / fixed base URL / fixed host permission。
- `V02-018`：CTO accepted as non-live validation evidence for Gemini / Tencent Hunyuan；没有真实 API 调用授权时不能写成 live validation。

这些记录只代表当前内部试用 / basic-launch hardening / v0.2 实现证据状态；DeepSeek owner 手动 connectivity pass 只覆盖该次手动配置可用性，不代表公开发布批准、Chrome Web Store 审核通过、正式商店链接、GitHub Release、全 provider live validation 或 WXT 默认构建切换批准。
