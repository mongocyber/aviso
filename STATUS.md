# Aviso Status

Updated: 2026-06-12

## 结论

Aviso 当前是 `v0.1 internal dogfood / 内部试用版`，`0.1.0` 已提交 Chrome Web Store 审核，正在等待审核结果。它是一个 Chrome MV3 扩展，使用 Plasmo、React 18 和 TypeScript 构建，在网页当前上下文里通过右键菜单、划词工具栏、命令面板、剪贴板提示和页面内结果面板触发 AI 操作。

当前版本还不是公开上架版本，没有通过 Chrome Web Store 审核，也没有正式商店链接。

## 当前能力

| 模块 | 状态 |
| --- | --- |
| 右键菜单 | 已实现解释、翻译、润色、总结、页面总结、图片说明、复制当前上下文、模型切换和自定义指令。 |
| 划词工具栏 | 已实现解释、翻译、润色、总结、发送给 AI。 |
| 划词翻译卡 | 已实现，默认关闭；开启后短选区可就地翻译。 |
| 命令面板 | 已实现快捷键、历史搜索、书签搜索、浏览历史搜索、本地 AI 对话搜索和直接提问。 |
| 双击快捷菜单 | 已实现，默认关闭；避开输入框、可编辑区域、常见代码编辑器和 Aviso 自身 UI。 |
| 剪贴板提示 | 已实现普通文本提示和敏感内容跳过。 |
| 结果面板 | 已实现流式结果、复制、保存、继续追问和本地对话历史。 |
| Popup 设置 | 已实现界面语言、外观主题、默认模型、功能开关、AI 服务配置、手动连接测试、历史和自定义指令。 |
| 多 AI 服务配置 | 已实现；支持同 provider 多配置、默认配置切换、模型 ID 手动编辑。 |
| v0.2 provider 配置扩展 | DeepSeek、Kimi / Moonshot、OpenRouter、Gemini 和 Tencent Hunyuan 已支持配置；仅代表 BYOK direct-provider 配置支持，未做真实 provider live validation。 |
| v0.2 命令面板本地意图 | 已实现本地确定性候选、危险 URL 拦截、打开/页面动作 confirm-first、本地对话恢复；不包含自主浏览、联网搜索或远端链接正文抓取。 |
| v0.2 等待态、快任务路由与本地计时 | 已实现更明确的等待状态、summary-only 本地 TTFT 方法，以及短文本 translate / explain / polish 在用户显式选择 fast provider config 时的 operation-level route override；当前 v0.2 只承认感知等待优化和 summary-only 方法，不做真实 provider 采样，也不宣称 p50 / p95 达标。 |
| WXT 并行构建路径 | 已实现 WXT 并行构建和 manifest checks；V02-WXT-005 已记录 bounded loaded-extension smoke；owner 已决定当前 v0.2 默认构建仍为 Plasmo，WXT default-build migration/default-build release 移到独立 `v0.2.1` slice，部分 loaded-extension surfaces 仍需 manual evidence。 |
| UI 语言 | 已实现中文 / English，默认跟随 Chrome UI language，支持设置 override。 |
| Manifest 本地化 | 已实现；源码位于 `locales/zh_CN` 和 `locales/en`，Plasmo 构建后映射为 Chrome `_locales`。 |

## v0.2 需求基线

最早 v0.2 构想继续作为 historical plan 保留：

| Slice | 当前基线 |
| --- | --- |
| `v0.2.0` WXT 迁移 / 构建链清理 | `partial / V02-WXT-005 accepted_with_pending_manual`：并行构建、manifest checks 和 bounded loaded-extension smoke 已有证据；pending_manual surfaces 仍是 release gates；当前 v0.2 默认构建保持 Plasmo，WXT default-build migration 移到独立 `v0.2.1`。 |
| 早期 historical `v0.2.1` 速度基线 + thinking/reasoning 控制 + 快模型策略 | `label superseded / current speed scope implemented`：等待态、summary-only TTFT 方法和 operation-level fast-model strategy 已实现；当前 v0.2 不做真实 TTFT sampling / p50 / p95 release wording；reasoning/thinking request-parameter control 已从当前 v0.2 scope 移除。 |
| `v0.2.2` OpenRouter / OpenAI-compatible provider | `partial`：DeepSeek、Kimi / Moonshot、OpenRouter、Gemini 和 Tencent Hunyuan 只有配置支持；V02-010 OpenRouter closeout 和 V02-011 宽松保存 acceptance 已显性关闭；provider live validation 仍未开始。 |
| `v0.2.3` 命令面板本地意图增强 | `completed_for_implementation / pending_loaded_extension_validation`。 |

当前 owner 确认的 v0.2 要求边界还包括：

- 不做 Aviso 后端、provider proxy、登录、订阅、支付、匿名额度。
- 不做遥测、分析 SDK、远端日志。
- 不做 custom base URL，不做自动读取模型列表；`V02-015` 已关闭为当前 v0.2 明确不做 custom OpenAI-compatible base URL，后续只能作为 future-backlog / 新版本新 issue 重新开启。
- 不把 provider configuration support 写成 live validation。
- 不把 v0.2 implementation 写成 release ready。

剩余 delivery issues 以 `docs/planning/v0.2-issue-plan.md` 为准：`V02-WXT-005` closeout 已记录/接受但仍有 pending_manual release gates；`V02-009` 已选择 OpenRouter 作为 optional owner-gated live validation provider，但执行仍需确认具体 OpenRouter 配置/模型和手动触发路径，不是当前 v0.2 wording 的必要条件，也不能写成已 live validated；`V02-013` reasoning/thinking request-parameter control 已从当前 v0.2 scope 移除，不再作为延期或待办。`V02-WXT-006`、`V02-014`、`V02-015` 已按 owner 决策关闭当前 v0.2 口径，不能被写成 release ready。

## 发布候选状态

- 主线检查已通过：`git diff --check`、`npm test`、`npx tsc --noEmit`、`npm run build`、`cd website && npm run build`、`npm run package`。
- 最终 Chrome Web Store 提交包路径：`build/chrome-mv3-prod.zip`。
- Chrome Web Store 提交状态：已人工提交审核，Git tag 为 `v0.1.0-cws-submitted`。
- GitHub CI：`CI` workflow 已在 `597391b` 通过。
- 最终 manifest 已核对，普通权限和 host permissions 未扩大。
- package zip 真实形态密钥扫描未发现 OpenAI、Anthropic、GitHub、AWS、Google、Slack 或私钥格式凭证。
- `@mozilla/readability` 已升级到 `0.6.0`，直接运行时 DoS 审计项已移除。
- 仍有发布前风险：Plasmo `0.90.5` 是 npm 当前最新版本，但官方 `npm audit` 仍报告其 Parcel 构建链存在 high 级审计项；`npm audit fix --force` 会降级 Plasmo，不能自动执行。
- v0.2 loaded-extension 可见 smoke 已有局部证据：历史 Popup smoke 曾显示 AI 服务、设置、记录、指令和功能开关；V02-WXT-005 复核通过了 WXT 内容脚本注入、划词工具栏、命令面板打开、双击菜单无截图入口、iframe 划词工具栏、iframe 快捷键桥接和控制台隐私摘要。Owner-assisted Chrome refresh 进一步确认 Popup Settings 主界面、功能开关、命令面板本地历史搜索和双击快捷菜单可见；Popup AI 服务/记录/指令二级页、clipboard toast、native right-click screenshot/context-menu、readability extraction 和 provider-safe floating action open 仍为 pending_manual。

截图能力仅保留在用户主动触发的右键内部路径中。命令面板和双击快捷菜单不展示截图入口；当前文档不把截图作为普通用户主入口或公开卖点。

## 验收状态

| 项目 | 状态 |
| --- | --- |
| A-G 手动验收 | 用户已验证基本通过，作为内部试用记录。 |
| 豆包 / 火山方舟 | 用户确认可用。 |
| OpenAI | 支持在设置中配置 API Key 和模型 ID；请求由浏览器直连该 provider。 |
| Anthropic | 支持在设置中配置 API Key 和模型 ID；请求由浏览器直连该 provider。 |
| DeepSeek | 支持在设置中配置 API Key 和模型 ID；provider id 为 `deepseek`，base URL 为 `https://api.deepseek.com`；未做真实 provider live validation。 |
| Kimi / Moonshot | 支持在设置中配置 API Key 和模型 ID；provider id 为 `moonshot`，base URL 为 `https://api.moonshot.cn/v1`；未做真实 provider live validation。 |
| OpenRouter | 支持在设置中配置 API Key 和模型 ID；provider id 为 `openrouter`，base URL 为 `https://openrouter.ai/api/v1`；模型 ID 需用户手动填写；未做真实 provider live validation。 |
| Gemini | 支持在设置中配置 API Key 和模型 ID；provider id 为 `gemini`，base URL 为 `https://generativelanguage.googleapis.com/v1beta/openai/`；模型 ID 需用户手动填写；V02-018 已完成非 live 验证，未做真实 provider live validation。 |
| Tencent Hunyuan | 支持在设置中配置 API Key 和模型 ID；provider id 为 `hunyuan`，base URL 为 `https://api.hunyuan.cloud.tencent.com/v1`；模型 ID 需用户手动填写；V02-018 已完成非 live 验证，未做真实 provider live validation。 |
| 英文界面 | 用户 smoke check 未发现明显问题。 |
| 模型 ID 编辑 | 用户确认可以编辑。 |
| 权限边界 | 当前普通权限为 `contextMenus`、`activeTab`、`storage`、`history`、`bookmarks`、`clipboardWrite`；host permissions 仅限已批准 provider host。 |
| v0.2 loaded-extension smoke | V02-WXT-005 closeout accepted_with_pending_manual：WXT 内容脚本注入、划词工具栏、命令面板打开、双击菜单无截图入口、iframe 划词工具栏、iframe 快捷键桥接和控制台隐私摘要通过；Owner-assisted Chrome refresh 进一步确认 Popup Settings 主界面、功能开关、命令面板本地历史搜索和双击快捷菜单可见。Popup AI 服务/记录/指令二级页、clipboard toast、native right-click screenshot/context-menu、readability extraction 和 provider-safe floating action open 仍为 pending_manual / release gate。 |

## 当前边界

- BYOK direct-provider：用户提供自己的 API Key，扩展直连所选 provider。
- 无项目方后端、无 provider proxy、无托管模型服务。
- 无账号、登录、订阅、支付、匿名额度。
- 无遥测、分析 SDK、远端日志。
- 不做远端链接正文抓取，不做联网搜索。
- 不自动读取 provider 账号里的模型列表。
- OpenRouter、Gemini 和 Tencent Hunyuan 模型 ID 仍需手动填写。
- 不把 API Key、raw prompt、raw response、私人网页正文、截图/base64 或完整 URL 写入文档、日志或远端服务。
- 不把 provider 配置支持写成真实 provider live validation。
- 不把 v0.2 实现证据写成公开发布批准、Chrome Web Store 审核通过或正式商店链接。
- 不把 `docs/planning/v0.2-owner-gated-decision-pack.md` 中的推荐项写成 owner approval。

## 存储

- API Key：不明文保存，位于 `chrome.storage.local/contextai_api_keys`；当前口令由扩展 ID 派生，属于本地加密 / 混淆级保护，不防御已能读取本机浏览器 profile 或本机已被控制的攻击者。
- 非敏感设置：`chrome.storage.sync/contextai_settings`。
- 本地对话历史：`chrome.storage.local/contextai_history`。
- 短缓存：只存在于运行时内存，用于降低重复准备成本，不作为持久存储。

## 当前文档集

当前保留的项目文档只描述已实现功能、当前实现计划、验收口径和隐私边界：

- `docs/README.md`
- `docs/01_PROJECT_CHARTER.md`
- `docs/02_PRD.md`
- `docs/03_TECH_SPEC.md`
- `docs/07_PRIVACY_AND_SECURITY.md`
- `docs/EXECUTION_PLAN.md`
- `docs/ACCEPTANCE_CRITERIA.md`
- `README.md`
- `RELEASE_CHECKLIST.md`
- `CLAUDE.md`

与当前内部试用功能不匹配的旧文档和素材已从当前文档树移除。

## Git 节奏

- 当前 Git 节奏由 CTO 统一收口：先保持本地 `main` 干净和检查通过，再按批次同步到远端。
- GitHub push 只同步代码和文档历史，不等于 Chrome Web Store 发布、tag、release 或生产上线。
- Chrome Web Store 审核通过确认、正式商店链接、正式 `v0.1.0` tag、GitHub Release 和公开发布仍需要单独人工确认。
