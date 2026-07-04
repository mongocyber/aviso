# Aviso Internal Dogfood Checklist

版本：`0.1.1`

状态：`0.1.1 production candidate / 待 owner 上传与发布批准`

日期：2026-07-04

## 当前结论

当前构建用于内部试用和 Chrome Web Store 审核。用户已验证 A-G 手动验收基本通过，豆包 / 火山方舟 API 可用。OpenAI、Anthropic、DeepSeek、Kimi / Moonshot、OpenRouter、Gemini 和 Tencent Hunyuan 支持在设置中配置 API Key 和模型 ID；DeepSeek 已有一次 owner 手动 connectivity pass，OpenRouter 最近一次手动测试失败类别为 `unauthorized`，Kimi / Moonshot、OpenRouter、Gemini 与 Tencent Hunyuan 当前仍不能写成 live validated。

0.1.1 production candidate 已加入可选 Aviso AI / hosted AI 路径，并已通过 production backend authenticated HTTP smoke 与候选包构建/manifest 证据；2026-07-02 前后端 OAuth challenge gate 已合入并推送到对应 `main`，Chrome Web Store listing copy 和 disclosure draft 已更新。2026-07-03 后端 production closeout 修复了 Google OAuth client ID contract、Google auth 脱敏诊断和 Upstash JSON challenge/idempotency 解析兼容问题；owner-loaded extension 已验证 Aviso AI 登录、翻译和发送给 AI 可用。当前速度慢问题记录为后续版本优化项。官网页面 owner 复核通过，Vercel production deployment 已从 commit `b6d7b65` 完成并验证新版首页/文档内容。但这仍不代表 Chrome Web Store 正式商店公开发布、hosted AI 已通过商店发布或 owner release approval。

版本口径：`package.json` / manifest / Popup 显示统一使用 `0.1.1`。历史 `v0.2`、`v0.3` 只作为内部规划和 issue 分组标签保留，不代表当前上传版本、公开产品版本或单独用户可见版本。

本清单用于记录当前内部试用质量和发布候选准备状态，不代表 Chrome Web Store 审核通过、正式上架或发布批准。

## 功能验收

| 项目 | 状态 |
| --- | --- |
| 右键菜单 | 基本通过：选区、页面、图片、模型切换、自定义指令、复制当前上下文。 |
| 划词工具栏 | 基本通过：解释、翻译、润色、总结、发送给 AI。 |
| 命令面板 | 基本通过：快捷键、浏览历史、书签、本地 AI 对话搜索和直接提问。 |
| 剪贴板提示 | 基本通过：普通文本提示，敏感内容跳过。 |
| 自定义指令 | 基本通过：新增、编辑、删除、右键菜单同步和占位符展开。 |
| 结果面板与历史 | 基本通过：流式输出、复制、保存、继续追问、本地历史。 |
| iframe 场景 | 基本通过：iframe 内划词、右键、命令面板、剪贴板提示和单实例 UI。 |
| 划词翻译卡 | 通过：开关、目标语言、短选区翻译、复制、重试、打开结果面板。 |
| 双击快捷菜单 | 已实现：默认关闭，避开输入框和可编辑区域；仍按内部试用功能处理。 |
| 多 AI 服务配置 | 通过：新增、编辑、删除、默认服务切换、模型 ID 手动编辑。 |
| UI 语言 | 通过 smoke check：中文 / English，可跟随 Chrome，也可在设置中覆盖。 |
| Manifest 本地化 | 通过：中文 Chrome 显示中文描述和快捷键说明，英文 Chrome 显示英文描述和 `Open command palette`。 |
| Aviso AI / hosted AI 主链 | 通过 owner-loaded production candidate smoke：登录、翻译、发送给 AI 可用；速度慢转入后续版本优化。 |

截图能力仅保留在右键主动触发的内部路径中；命令面板和双击快捷菜单不展示截图入口。当前清单不把截图作为普通用户主入口或公开卖点。

## Provider 配置状态

| Provider | 状态 |
| --- | --- |
| 豆包 / 火山方舟 | 用户确认可用。 |
| OpenAI | 支持配置 API Key 和模型 ID。 |
| Anthropic | 支持配置 API Key 和模型 ID。 |
| DeepSeek | 支持配置 API Key 和模型 ID；已有一次 owner 手动 connectivity pass，实际可用性仍取决于用户 Key、模型权限和 provider 状态；不能扩大写成全 DeepSeek provider live validated。 |
| Kimi / Moonshot | 支持配置 API Key 和模型 ID；未做真实 provider live validation。 |
| OpenRouter | 支持配置 API Key 和模型 ID；模型 ID 需用户手动填写；未做真实 provider live validation。 |
| Gemini | 支持配置 API Key 和模型 ID；模型 ID 需用户手动填写；V02-018 已完成非 live 验证，未做真实 provider live validation。 |
| Tencent Hunyuan | 支持配置 API Key 和模型 ID；模型 ID 需用户手动填写；V02-018 已完成非 live 验证，未做真实 provider live validation。 |

Provider 连接测试只能由用户在 Popup 手动触发，一次只测一个 provider，并只展示脱敏摘要。

## 权限与隐私

- [x] 普通权限只包含当前功能需要的 `contextMenus`、`activeTab`、`storage`、`history`、`bookmarks`、`clipboardWrite`；0.1.1 production candidate 还包含 `identity`，仅用于用户主动登录 Aviso AI / hosted AI。
- [x] Host permissions 只包含 `https://api.openai.com/*`、`https://api.anthropic.com/*`、`https://ark.cn-beijing.volces.com/*`、`https://api.deepseek.com/*`、`https://api.moonshot.cn/*`、`https://openrouter.ai/*`、`https://generativelanguage.googleapis.com/*`、`https://api.hunyuan.cloud.tencent.com/*`，以及 0.1.1 production candidate 的精确托管后端域名 `https://aviso-backend-production.vercel.app/*`。
- [x] API Key 不明文保存，保存在 `chrome.storage.local/contextai_api_keys`，不进入 sync。
- [x] 当前 API Key 保护属于由扩展 ID 派生口令的本地加密 / 混淆级保护，不防御已能读取本机浏览器 profile 或本机已被控制的攻击者。
- [x] 非敏感设置保存在 `chrome.storage.sync/contextai_settings`。
- [x] 本地对话历史保存在 `chrome.storage.local/contextai_history`。
- [x] BYOK 路径无项目方后端或 provider proxy；0.1.1 production candidate 的可选托管路径会经过 Aviso production 后端，但仍未公开发布、未标记 live。项目仍无遥测、分析 SDK 或远端用户内容日志。
- [x] 浏览历史和书签只用于命令面板本地关键词搜索，不进入 AI 请求或远端服务。
- [x] 截图/base64 不写入 history、storage、docs、console、telemetry 或 release artifacts。

## 自动检查

当前维护时至少运行：

```bash
git diff --check
npm test
npx tsc --noEmit
npm run build
cd website && npm run build
npm run package
```

检查通过只说明代码和构建基线可用；真实 Chrome 加载体验和真实 provider 调用仍以手动验收为准。

2026-06-13 CTO 自动门禁复跑通过：`git diff --check`、`npm test`（159 passed）、`npx tsc --noEmit`、`npx tsc --noEmit -p tsconfig.wxt.json`、`npm run build`、`npm run build:wxt`、`npm run check:manifests`。其中 `npm run build` 在沙箱内会遇到 `Operation not permitted`，非沙箱复跑通过；这不关闭任何 loaded-extension manual release gate。

2026-07-02 maintenance pass 通过：前端 `git diff --check`、`npm test`（214/214）、`npx tsc --noEmit`；后端 `corepack pnpm lint`、`corepack pnpm typecheck`、`corepack pnpm test`（387/387）、`git diff --check`。本次覆盖前端安全口径收口、纯逻辑 i18n 测试解耦、frontend hosted OAuth challenge 接入、backend OAuth challenge gate、CWS listing copy 和 disclosure draft 更新；`npm run verify:release-candidate` 已重新生成并验证 `build/chrome-mv3-prod.zip`，`website` `npm run build` 通过；当日未上传 CWS，网站部署 gate 当时尚未完成，也未标记 hosted AI live。

2026-07-03 production validation pass 通过：后端 `corepack pnpm lint`、`corepack pnpm typecheck`、`corepack pnpm test`（392/392）、`git diff --check`；production deployment 完成，sanitized challenge smoke 通过。Owner-loaded extension 验证 Aviso AI 登录、翻译和发送给 AI 可用。官网页面 owner 复核通过，Vercel production deployment 完成并验证新版首页/文档内容。最终上传/发布前仍需 Chrome Web Store upload/submission/disclosure evidence 和 owner release approval。

## 上线前安全扫描

2026-06-10 发布候选收口已执行：

- `npm audit --registry=https://registry.npmjs.org --audit-level=high` 已执行。
- `@mozilla/readability` 已升级到 `0.6.0`，直接运行时 DoS 审计项已移除。
- 最终 package zip 已执行真实形态密钥扫描，未发现 OpenAI、Anthropic、GitHub、AWS、Google、Slack 或私钥格式凭证。
- 最终 package zip 已核对内容，只包含扩展运行文件和 Chrome `_locales`。
- 最终 manifest 已核对权限边界，普通权限和 host permissions 未扩大。

当前仍有公开发布级风险：Plasmo `0.90.5` 是 npm 当前最新版本，但官方 `npm audit` 仍报告其 Parcel 构建链存在 high 级审计项；`npm audit fix --force` 会把 Plasmo 降级到不适合当前项目的旧版本，因此不能自动修复。该风险主要落在本地构建工具链，不是当前扩展运行时 manifest 权限扩大，但公开提交前需要 owner 明确接受或等待 Plasmo / Parcel 上游修复。

当前仍未完成公开发布级收口：Chrome Web Store 审核通过证据、正式商店链接、正式 `v0.1.1` tag、GitHub Release 和人工发布批准。

## v0.2 实现证据与剩余门禁

- Provider：DeepSeek、Kimi / Moonshot、OpenRouter、Gemini 和 Tencent Hunyuan 已实现 BYOK direct-provider 配置支持；provider ids 为 `deepseek`、`moonshot`、`openrouter`、`gemini`、`hunyuan`，base URLs 为 `https://api.deepseek.com`、`https://api.moonshot.cn/v1`、`https://openrouter.ai/api/v1`、`https://generativelanguage.googleapis.com/v1beta/openai/`、`https://api.hunyuan.cloud.tencent.com/v1`。OpenRouter、Gemini 和 Tencent Hunyuan 模型 ID 需用户手动填写，Aviso 不自动读取模型列表。除 DeepSeek 的一次 owner 手动 connectivity pass 外，这些配置支持不能写成 live provider validation。
- 速度体验：已实现更明确的等待状态、summary-only 本地 TTFT 方法，以及短文本 translate / explain / polish 在用户显式选择 fast provider config 时的 operation-level route override；当前 v0.2 只承认感知等待优化和 summary-only 方法，未执行真实 provider 采样，不宣称 p50 / p95 达标。
- 命令面板：本地确定性候选、confirm-first 打开/页面动作、危险 URL 拦截和本地对话恢复已实现；不包含自主浏览、联网搜索或远端链接正文抓取。
- WXT：并行构建、自动构建和 manifest checks 已通过；V02-WXT-005 已记录 refreshed loaded-extension smoke 和 owner manual pass evidence；owner 已决定当前 v0.2 默认构建不切换，继续使用 Plasmo；WXT default-build migration/default-build release 移到独立 `v0.2.1`。
- Loaded-extension 可见 smoke：历史 Popup smoke 曾显示 AI 服务、设置、记录、指令和功能开关；V02-WXT-005 最新复核通过了 WXT 内容脚本注入、划词工具栏、命令面板打开和 Esc 关闭、危险 URL 拦截、安全 URL confirm-first、无截图普通入口、iframe 划词工具栏、iframe 快捷键桥接和控制台隐私摘要。Popup AI 服务/历史/指令页、provider-safe floating action open、clipboard toast、native right-click screenshot/context-menu、readability extraction 和 iframe native context-menu 记录为 owner manual pass，不是自动化证据或 release approval。
- 公开发布：v0.2 未公开发布，未通过 Chrome Web Store 公开上架，没有正式商店 URL。
- Owner decisions / gates：`docs/planning/v0.2-owner-gated-decision-pack.md` 已记录 owner 对 WXT default、reasoning/thinking request-parameter control、TTFT sampling 和 custom base URL 的当前 v0.2 决策；V02-009 已记录 DeepSeek owner 手动 connectivity pass 和 OpenRouter `unauthorized`，进一步 provider live validation 仍需单独 owner 选择和 summary-only evidence 批准，且不是当前 v0.2 wording 的必要条件。

### v0.2 Release Gate / Decision Queue

这些 gate 和 closed decision 必须分层记录，不能由 implementation candidate 自动替代；closed rows 不再代表 active remaining delivery。

| Issue | Gate |
| --- | --- |
| `V02-WXT-005` | Accepted closeout with owner manual pass recorded：WXT loaded-extension QA closeout 已记录/接受；自动化可验 surfaces 已复核，原生菜单、Popup、clipboard、readability 和 provider-safe floating surfaces 记录为 owner manual pass。 |
| `V02-WXT-006` | Closed / owner_decided：当前 v0.2 保持 Plasmo 默认构建，WXT default-build migration/default-build release 移到独立 `v0.2.1`。 |
| `V02-009` | Provider live validation 授权和 summary-only 记录；DeepSeek owner 手动 connectivity pass 已记录，OpenRouter 最近手动测试失败类别为 `unauthorized`；进一步 live validation 仍需单独选择 provider/config/model 和 summary-only 记录规则。 |
| `V02-010` | Closed：OpenRouter closeout 只写配置支持，不写 live validated。 |
| `V02-011` | Closed / accepted：宽松保存行为 acceptance；可保存不等于已验证，缺 Key / 缺模型仍必须阻断 provider call。 |
| `V02-012` | Implemented for operation-level short text routing；loaded-extension behavior 已纳入当前 smoke / owner manual pass 记录，不代表 live TTFT 或 provider latency claim。 |
| `V02-013` | Closed_removed_from_current_v0.2_scope：reasoning / thinking request 参数控制不做，也不作为当前 v0.2 延期项或待办。 |
| `V02-014` | Closed_for_v0.2_wording：当前 v0.2 只承认感知等待优化和 summary-only TTFT 方法；不要求 live TTFT sampling，不写 p50 / p95。 |
| `V02-015` | Closed_not_doing_for_current_v0.2：明确不做 custom OpenAI-compatible base URL；不再是当前 v0.2 active remaining delivery。 |
| `V02-016` | Batch 2 provider preflight：Gemini、Qwen / DashScope、腾讯混元、智谱 GLM 的 preset / host / capability / permission 边界。 |
| `V02-017` | CTO accepted as non-live configuration support for Gemini / Tencent Hunyuan；不包含 Qwen / DashScope、Zhipu GLM 或 live provider。 |
| `V02-018` | CTO accepted as non-live validation for Gemini / Tencent Hunyuan configuration support；只记录 registry/routing/storage/i18n/tests/manifest/QA evidence。 |

## 手动 QA 记录

构建路径：

```text
build/chrome-mv3-prod
```

测试页面：

```text
tests/manual-test.html
```

| 清单 | 结果 | 记录 |
| --- | --- | --- |
| A · 右键菜单 | 基本通过 | 用户已验证基本通过。 |
| B · 划词工具栏 | 基本通过 | 用户已验证基本通过。 |
| C · 命令面板 | 基本通过 | 用户已验证基本通过。 |
| D · 剪贴板感知 | 基本通过 | 用户已验证基本通过。 |
| E · 自定义指令 | 基本通过 | 用户已验证基本通过。 |
| F · 结果面板与历史 | 基本通过 | 用户已验证基本通过。 |
| G · iframe 场景 | 基本通过 | 用户已验证基本通过。 |
| 英文界面 | smoke check 通过 | 用户反馈未发现明显问题。 |
| 模型 ID 编辑 | 通过 | 用户确认 OpenAI / Anthropic 模型 ID 可以编辑。 |

Chrome 版本、操作系统、截图或录屏未补录；当前记录只作为内部试用记录。

## 禁止误判

- 当前状态不是公开上架。
- 当前状态不是 Chrome Web Store 审核通过。
- 当前状态是待 owner 上传 / 提交 / 审核，不是审核通过。
- OpenAI / Anthropic / Kimi / Moonshot / OpenRouter / Gemini / Tencent Hunyuan 当前只描述为支持配置的 provider，不描述为 live validated 可用状态；DeepSeek 只能描述为已有一次 owner 手动 connectivity pass，不能扩大成全 provider、全模型或 release-ready 证明。
- 当前公开默认路径仍是 BYOK direct-provider，不要求后端、登录、订阅、支付、公开匿名额度、联网搜索或远端链接正文抓取；0.1.1 候选包已包含 hosted AI 所需的 `identity` 权限和精确 production backend host permission，默认休眠且仅在用户主动选择托管路径并登录时使用；这不代表公开发布、Chrome Web Store 批准、hosted AI live、订阅支付或公开匿名额度。CWS listing copy 可以解释该可选路径，但不能写成已经上架、已批准或公开 live。
- GitHub push、构建通过或内部手动 QA 不等于 Chrome Web Store 发布批准。
