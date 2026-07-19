# Aviso Status

Updated: 2026-07-08

## 结论

Aviso 当前 Chrome 上传包版本是 `0.1.1`。它是一个 Chrome MV3 扩展，使用 React 18 和 TypeScript 构建；本地 `dev` / `build` 仍保留 Plasmo 路径，规范发布包由 WXT 生成。产品在网页当前上下文里通过右键菜单、划词工具栏、命令面板、显式开启后的剪贴板提示和页面内结果面板触发 AI 操作。

当前 `0.1.1` 上传包已由 owner 上传并提交 Chrome Web Store 审核，但 2026-07-07 收到 Chrome Web Store 拒审邮件，原因是商品说明中包含过多或不相关的关键词式 provider 名称。公开商品说明里的 provider 名称堆叠已清理，owner 已反馈最新 `0.1.1` 包已在 Chrome Web Store 后台重新上传，并于 2026-07-08 确认已重新进入审核。当前仍需等待最终审核结果；它还不是公开上架版本，没有通过 Chrome Web Store 审核，也没有正式商店链接。

## 版本口径

`package.json` / manifest / Popup 显示统一使用 `0.1.1`。历史 `v0.2`、`v0.3` 只作为内部规划和 issue 分组标签保留，不再代表当前上传版本、公开产品版本或单独的用户可见版本。

0.1.1 production candidate 已包含可选 Aviso AI / hosted AI 路径，但 BYOK direct-provider 仍保持默认可用路径。staging 阶段已完成托管后端配置、`identity` 权限、精确 staging host permission、Google OAuth `launchWebAuthFlow` id-token 后台登录代码、loaded-extension 账号 smoke、真实 Upstash Redis 并发 quota smoke、provider smoke、敏感日志审查和 release build / manifest gate；production backend origin 为 `https://aviso-backend-production.vercel.app`，authenticated production HTTP smoke 已通过 `auth_google`、`me_before_chat`、`chat_provider_stream`、`me_after_chat` 和 `logout`，SSE `delta` / `done` / `usage`、正向 quota delta 和 cost guard 均已确认。前端候选包已切换到 production hosted base URL `https://aviso-backend-production.vercel.app/v1`、精确 host permission `https://aviso-backend-production.vercel.app/*`，并同步 production Google OAuth client ID；旧 staging hosted session 会被 URL allowlist 拒绝。2026-07-02 OAuth challenge 安全收口已合入并推送前后端 `main`：后端 `3b69e3d` 增加服务端 challenge gate，前端 `6f41513` 改为先取 challenge 再走 Google OAuth / hosted session exchange；后端本地与远端 `main` 均已通过 lint、typecheck、387/387 tests，前端 `main` 已通过 214/214 tests、typecheck 和 diff check。2026-07-03 production closeout 进一步合入并部署后端 `40c8c37`、`b2b0b65` 和 `c60b895`：challenge response 返回当前环境 Google OAuth client ID，Google auth 拒绝日志只记录脱敏原因，Upstash JSON string/object 解析兼容修复已解决生产登录 challenge 消费失败；后端通过 lint、typecheck、392/392 tests 和 diff check。Owner-loaded extension 已验证 Aviso AI 登录、翻译和发送给 AI 可用。当前已知速度慢问题转入下版本优化，不作为本轮 release blocker。2026-07-02 Chrome Web Store listing copy 与 disclosure draft 已更新为 BYOK 默认 + 可选 Aviso AI 候选路径口径；当前 `npm run verify:release-candidate` 会重新生成并验证 `build/canonical-chrome-mv3-prod.zip`，`website` production build 当时也已通过。2026-07-03 owner 复核官网页面通过，Vercel production deployment 已从前端 commit `b6d7b65` 完成，公开项目域名返回新版首页和文档内容。Owner 已上传并提交 `0.1.1` 到 Chrome Web Store 审核，2026-07-07 收到商品说明关键词问题拒审；公开商品说明中的 provider 名称堆叠已清理，owner 已反馈最新 `0.1.1` 包已重新上传，并于 2026-07-08 确认已重新进入审核，当前仍需等待最终审核结果。这仍不代表 Chrome Web Store 正式上架、Chrome Web Store 已批准、hosted AI 已通过商店发布或 hosted AI public live。billing 已批准排除在首个 hosted-AI release 之外。

## 当前能力

| 模块 | 状态 |
| --- | --- |
| 右键菜单 | 已实现解释、翻译、润色、总结、页面总结、图片说明、复制当前上下文、模型切换和自定义指令。 |
| 划词工具栏 | 已实现解释、翻译、润色、总结、发送给 AI。 |
| 划词翻译卡 | 已实现，默认关闭；开启后短选区可就地翻译。 |
| 命令面板 | 已实现快捷键、历史搜索、书签搜索、浏览历史搜索、本地 AI 对话搜索和直接提问。 |
| 双击快捷菜单 | 已实现，默认关闭；避开输入框、可编辑区域、常见代码编辑器和 Aviso 自身 UI。 |
| 剪贴板提示 | 已实现，默认关闭；用户在 Popup 明确开启后，普通文本提示和敏感内容跳过生效。 |
| 结果面板 | 已实现流式结果、复制、保存、继续追问和本地对话历史。 |
| Popup 设置 | 已实现界面语言、外观主题、默认模型、功能开关、AI 服务配置、手动连接测试、历史和自定义指令；0.1.1 candidate 中 Aviso AI 可作为默认模型或快速任务服务选择项。 |
| 多 AI 服务配置 | 已实现；支持同 provider 多配置、默认配置切换、模型 ID 手动编辑。 |
| v0.2 provider 配置扩展 | DeepSeek、Kimi / Moonshot、OpenRouter、Gemini 和 Tencent Hunyuan 已支持配置；DeepSeek 已有 owner 手动 live connectivity pass 记录；Kimi / Moonshot、OpenRouter、Gemini 和 Tencent Hunyuan 仍不能写成 live validated。 |
| v0.2 命令面板本地意图 | 已实现本地确定性候选、危险 URL 拦截、打开/页面动作 confirm-first、本地对话恢复；不包含自主浏览、联网搜索或远端链接正文抓取。 |
| v0.2 等待态、快任务路由与本地计时 | 已实现更明确的等待状态、summary-only 本地 TTFT 方法，以及短文本 translate / explain / polish 在用户显式选择 fast provider config 时的 operation-level route override；当前 v0.2 只承认感知等待优化和 summary-only 方法，不做真实 provider 采样，也不宣称 p50 / p95 达标。 |
| WXT 规范发布包路径 | 已实现 WXT 构建和 manifest checks；当前 `npm run package` 会生成规范加载目录和 zip。历史 v0.2 的 WXT default-build 决策不覆盖当前 0.1.1 package gate。 |
| UI 语言 | 已实现中文 / English，默认跟随 Chrome UI language，支持设置 override。 |
| Manifest 本地化 | 已实现；源码位于 `locales/zh_CN` 和 `locales/en`，构建后输出为 Chrome `_locales`。 |

## v0.2 需求基线

最早 v0.2 构想继续作为 historical plan 保留：

| Slice | 当前基线 |
| --- | --- |
| `v0.2.0` WXT 迁移 / 构建链清理 | `closeout_ready_for_owner_release_decision`：并行构建、manifest checks、refreshed browser smoke 和 owner manual pass evidence 已记录；历史 v0.2 曾保持 Plasmo default-build。当前 0.1.1 规范发布包已由 WXT package gate 生成。 |
| 早期 historical `v0.2.1` 速度基线 + thinking/reasoning 控制 + 快模型策略 | `label superseded / current speed scope implemented`：等待态、summary-only TTFT 方法和 operation-level fast-model strategy 已实现；当前 v0.2 不做真实 TTFT sampling / p50 / p95 release wording；reasoning/thinking request-parameter control 已从当前 v0.2 scope 移除。 |
| `v0.2.2` OpenRouter / OpenAI-compatible provider | `partial`：DeepSeek 已有 owner 手动 live connectivity pass；Kimi / Moonshot、OpenRouter、Gemini 和 Tencent Hunyuan 仍为配置支持或非 live 验证；V02-010 OpenRouter closeout 和 V02-011 宽松保存 acceptance 已显性关闭。 |
| `v0.2.3` 命令面板本地意图增强 | `completed_for_implementation / included_in_loaded_extension_closeout`。 |

当前 owner 确认的 v0.2 要求边界还包括：

- BYOK 默认路径不要求 Aviso 后端、provider proxy、登录、订阅、支付或匿名额度；当前 0.1.1 候选包已包含 hosted AI 所需的 `identity` 权限和精确 production backend host permission，但该路径默认休眠、需用户主动选择托管路径并登录，且不代表 public live、Chrome Web Store 批准、订阅支付或公开匿名额度。
- 不做遥测、分析 SDK、远端日志。
- 不做 custom base URL，不做自动读取模型列表；`V02-015` 已关闭为当前 v0.2 明确不做 custom OpenAI-compatible base URL，后续只能作为 future-backlog / 新版本新 issue 重新开启。
- 不把 provider configuration support 写成 live validation。
- 不把 v0.2 implementation 写成 release ready。

当前 delivery 状态以 `RELEASE_CHECKLIST.md` 和 V02 closeout 文档为准，`docs/archive/v0.2/v0.2-issue-plan.md` 作为历史 issue 追踪保留：`V02-WXT-005` closeout 已记录 refreshed browser smoke 和 owner manual pass evidence，但不代表 release approval；`V02-009` 已记录 DeepSeek owner 手动 live connectivity pass，OpenRouter 仍未通过且最近失败类别为 `unauthorized`，provider live validation 仍不是当前 v0.2 wording 的必要条件；`V02-013` reasoning/thinking request-parameter control 已从当前 v0.2 scope 移除，不再作为延期或待办。`V02-WXT-006`、`V02-014`、`V02-015` 已按 owner 决策关闭当前 v0.2 口径，不能被写成 release ready。

## 发布候选状态

- 主线检查已通过：`git diff --check`、`npm test`、`npx tsc --noEmit`、`npm run build`、`cd website && npm run build`、`npm run package`。
- 2026-07-02 maintenance pass：前端安全口径收口、纯逻辑 i18n 测试解耦、frontend hosted OAuth challenge 接入和 backend OAuth challenge gate 均已合入对应 `main`；前端复跑 `git diff --check`、`npm test`（214/214）和 `npx tsc --noEmit` 通过，后端复跑 `corepack pnpm lint`、`corepack pnpm typecheck`、`corepack pnpm test`（387/387）和 `git diff --check` 通过。最终 extension package 已通过 `npm run verify:release-candidate` 重新生成和验证，官网 `npm run build` 通过。当日未上传 CWS，网站部署 gate 当时尚未完成，也未标记 hosted AI live。
- 2026-07-03 production validation pass：后端 Google OAuth client ID contract、Google auth 脱敏诊断、Upstash JSON 解析兼容修复已合入并部署到 production；后端复跑 `corepack pnpm lint`、`corepack pnpm typecheck`、`corepack pnpm test`（392/392）和 `git diff --check` 通过。Owner-loaded extension 验证 Aviso AI 登录、翻译和发送给 AI 可用；速度慢问题记录为后续版本优化，不阻塞当前 candidate。官网页面 owner 复核通过，Vercel production deployment 已完成并验证公开项目域名返回新版首页和文档。当时 CWS upload/submission/disclosure 尚未完成；后续 owner 已完成 `0.1.1` 上传并提交审核，2026-07-07 商品说明关键词问题已按拒审原因清理，owner 已反馈最新包已重新上传，并于 2026-07-08 确认已重新进入审核，当前仍需等待最终审核结果。
- 最终 Chrome Web Store 提交包路径：`build/canonical-chrome-mv3-prod.zip`。
- Chrome Web Store 提交状态：owner 已上传并提交 `0.1.1` 审核；2026-07-07 因商品说明 provider 关键词堆叠被拒，商品说明已更新，owner 已反馈最新包已重新上传，并于 2026-07-08 确认已重新进入审核。正式 tag 和 GitHub Release 仍需发布批准后单独创建。
- GitHub CI：`CI` workflow 已在 `597391b` 通过。
- 最终 manifest 已核对，普通权限和 host permissions 未扩大。
- package zip 真实形态密钥扫描未发现 OpenAI、Anthropic、GitHub、AWS、Google、Slack 或私钥格式凭证。
- `@mozilla/readability` 已升级到 `0.6.0`，直接运行时 DoS 审计项已移除。
- 2026-07-19 本地供应链基线终审修复通过：Plasmo `0.90.5` 已归类为直接 dev dependency，未保留在 runtime dependencies；baseline schema 已校验，package/lock 期望 SHA-256 已绑定，直接依赖清单完整，merge-base package/lock base diff 只允许 Plasmo runtime -> dev 移动且 package entry version/resolved/integrity 未漂移。Fresh registry audit 对当前 package/lock 仍是外部门禁 pending，local evidence 仍为 `freshRegistryAudit: "pending-external"` / `npmAuditCommandRun: false`。未解析 High/Critical 账本保留从 git `49ef781` 恢复的 Plasmo/Parcel build-chain high 风险，使用稳定 `riskId`、Plasmo `0.90.5` 语义指纹和 owner review deadline；当前没有可验证 `closedHighCritical` record，不能写成已关闭或零漏洞结论。
- v0.2 loaded-extension 可见 smoke 已有 closeout 记录：历史 Popup smoke 曾显示 AI 服务、设置、记录、指令和功能开关；V02-WXT-005 复核通过了 WXT 内容脚本注入、划词工具栏、命令面板打开、双击菜单无截图入口、iframe 划词工具栏、iframe 快捷键桥接和控制台隐私摘要。Owner-assisted Chrome refresh 进一步确认 Popup Settings 主界面、功能开关、命令面板本地历史搜索和双击快捷菜单可见；Popup AI 服务/记录/指令二级页、clipboard toast、native right-click screenshot/context-menu、readability extraction 和 provider-safe floating action open 已记录 owner manual pass evidence。这不代表 WXT 默认构建批准、公开发布批准或 Chrome Web Store 审核通过。

截图能力仅保留在用户主动触发的右键内部路径中。命令面板和双击快捷菜单不展示截图入口；当前文档不把截图作为普通用户主入口或公开卖点。

## 验收状态

| 项目 | 状态 |
| --- | --- |
| A-G 手动验收 | 用户已验证基本通过，作为内部试用记录。 |
| 豆包 / 火山方舟 | 用户确认可用。 |
| OpenAI | 支持在设置中配置 API Key 和模型 ID；请求由浏览器直连该 provider。 |
| Anthropic | 支持在设置中配置 API Key 和模型 ID；请求由浏览器直连该 provider。 |
| DeepSeek | 支持在设置中配置 API Key 和模型 ID；provider id 为 `deepseek`，base URL 为 `https://api.deepseek.com`；2026-06-12 owner 手动重新配置后确认可用，记录为 summary-only live connectivity pass，不记录 API Key、raw prompt 或 raw response。 |
| Kimi / Moonshot | 支持在设置中配置 API Key 和模型 ID；provider id 为 `moonshot`，base URL 为 `https://api.moonshot.cn/v1`；未做真实 provider live validation。 |
| OpenRouter | 支持在设置中配置 API Key 和模型 ID；provider id 为 `openrouter`，base URL 为 `https://openrouter.ai/api/v1`；模型 ID 需用户手动填写；未做真实 provider live validation。 |
| Gemini | 支持在设置中配置 API Key 和模型 ID；provider id 为 `gemini`，base URL 为 `https://generativelanguage.googleapis.com/v1beta/openai/`；模型 ID 需用户手动填写；V02-018 已完成非 live 验证，未做真实 provider live validation。 |
| Tencent Hunyuan | 支持在设置中配置 API Key 和模型 ID；provider id 为 `hunyuan`，base URL 为 `https://api.hunyuan.cloud.tencent.com/v1`；模型 ID 需用户手动填写；V02-018 已完成非 live 验证，未做真实 provider live validation。 |
| 英文界面 | 用户 smoke check 未发现明显问题。 |
| 模型 ID 编辑 | 用户确认可以编辑。 |
| 权限边界 | 当前普通权限为 `contextMenus`、`activeTab`、`storage`、`history`、`bookmarks`、`identity`、`clipboardWrite`；host permissions 仅限已批准 provider host 和精确 production hosted backend host `https://aviso-backend-production.vercel.app/*`。 |
| v0.2 loaded-extension smoke | V02-WXT-005 closeout ready_for_owner_release_decision：WXT 内容脚本注入、划词工具栏、命令面板打开、双击菜单无截图入口、iframe 划词工具栏、iframe 快捷键桥接和控制台隐私摘要通过；Owner-assisted Chrome refresh 进一步确认 Popup Settings 主界面、功能开关、命令面板本地历史搜索和双击快捷菜单可见。Popup AI 服务/记录/指令二级页、clipboard toast、native right-click screenshot/context-menu、readability extraction 和 provider-safe floating action open 已记录 owner manual pass evidence；这不代表 WXT 默认构建批准、公开发布批准或 Chrome Web Store 审核通过。 |
| hosted AI owner smoke | 2026-07-03 owner-loaded 0.1.1 production candidate 验证通过：Aviso AI 登录、划词翻译、发送给 AI 可用；速度慢作为下版本优化项，不作为当前 candidate blocker。官网已部署并验证公开项目域名返回新版内容；这不代表 Chrome Web Store 审核通过、hosted AI 已通过商店发布、hosted AI public live 或最终 release approval。 |

## 当前边界

- BYOK direct-provider：用户提供自己的 API Key，扩展直连所选 provider。
- 0.1.1 production candidate hosted AI：用户主动选择 Aviso AI 并登录后，请求经过 Aviso production backend 和上游 provider；该路径已进入候选包，但不是 CWS 上线或 public live。
- 当前 0.1.1 口径不包含已公开上线的项目方后端、订阅、支付或匿名额度；登录只用于用户主动选择的可选 Aviso AI 路径。
- 前端不新增遥测或分析 SDK；hosted backend 只允许按后端门禁记录脱敏运行 metadata，不记录 raw prompt、raw response、页面正文、截图/base64、剪贴板、BYOK API Key 或完整 URL。
- 不做远端链接正文抓取，不做联网搜索。
- 不自动读取 provider 账号里的模型列表。
- OpenRouter、Gemini 和 Tencent Hunyuan 模型 ID 仍需手动填写。
- 剪贴板感知默认关闭，缺失设置按关闭处理；开启后才注册 copy listener，关闭后会移除。
- 不把 API Key、raw prompt、raw response、私人网页正文、截图/base64 或完整 URL 写入文档、日志或远端服务。
- 不把 provider 配置支持写成真实 provider live validation；DeepSeek 的 owner 手动 connectivity pass 只覆盖该次配置/模型可用性，不扩大成所有 DeepSeek 模型或 release-ready 证明。
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
- `docs/charter.md`
- `docs/prd.md`
- `docs/tech-spec.md`
- `docs/privacy-and-security.md`
- `docs/execution-plan.md`
- `docs/acceptance-criteria.md`
- `README.md`
- `RELEASE_CHECKLIST.md`
- `CLAUDE.md`

与当前内部试用功能不匹配的旧文档和素材已从当前文档树移除。

## Git 节奏

- 当前 Git 节奏由 CTO 统一收口：先保持本地 `main` 干净和检查通过，再按批次同步到远端。
- GitHub push 只同步代码和文档历史，不等于 Chrome Web Store 发布、tag、release 或生产上线。
- Chrome Web Store 最终审核结果、正式商店链接、正式 `v0.1.1` tag、GitHub Release 和公开发布仍需要单独人工确认。
