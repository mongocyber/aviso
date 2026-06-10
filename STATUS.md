# Aviso Status

Updated: 2026-06-10

## 结论

Aviso 当前是 `v0.1 internal dogfood / 内部试用版`，正在进入 Chrome Web Store 上架准备 / 发布候选阶段。它是一个 Chrome MV3 扩展，使用 Plasmo、React 18 和 TypeScript 构建，在网页当前上下文里通过右键菜单、划词工具栏、命令面板、剪贴板提示和页面内结果面板触发 AI 操作。

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
| UI 语言 | 已实现中文 / English，默认跟随 Chrome UI language，支持设置 override。 |
| Manifest 本地化 | 已实现；源码位于 `locales/zh_CN` 和 `locales/en`，Plasmo 构建后映射为 Chrome `_locales`。 |

## 发布候选状态

- 主线检查已通过：`git diff --check`、`npm test`、`npx tsc --noEmit`、`npm run build`、`cd website && npm run build`、`npm run package`。
- 最终 Chrome Web Store 提交包路径：`build/chrome-mv3-prod.zip`。
- 最终 manifest 已核对，普通权限和 host permissions 未扩大。
- package zip 真实形态密钥扫描未发现 OpenAI、Anthropic、GitHub、AWS、Google、Slack 或私钥格式凭证。
- `@mozilla/readability` 已升级到 `0.6.0`，直接运行时 DoS 审计项已移除。
- 仍有发布前风险：Plasmo `0.90.5` 是 npm 当前最新版本，但官方 `npm audit` 仍报告其 Parcel 构建链存在 high 级审计项；`npm audit fix --force` 会降级 Plasmo，不能自动执行。

截图能力仅保留在用户主动触发的右键内部路径中。命令面板和双击快捷菜单不展示截图入口；当前文档不把截图作为普通用户主入口或公开卖点。

## 验收状态

| 项目 | 状态 |
| --- | --- |
| A-G 手动验收 | 用户已验证基本通过，作为内部试用记录。 |
| 豆包 / 火山方舟 | 用户确认可用。 |
| OpenAI | 支持在设置中配置 API Key 和模型 ID；请求由浏览器直连该 provider。 |
| Anthropic | 支持在设置中配置 API Key 和模型 ID；请求由浏览器直连该 provider。 |
| 英文界面 | 用户 smoke check 未发现明显问题。 |
| 模型 ID 编辑 | 用户确认可以编辑。 |
| 权限边界 | 当前普通权限为 `contextMenus`、`activeTab`、`storage`、`history`、`bookmarks`、`clipboardWrite`；host permissions 仅限三类 provider host。 |

## 当前边界

- BYOK direct-provider：用户提供自己的 API Key，扩展直连所选 provider。
- 无项目方后端、无 provider proxy、无托管模型服务。
- 无账号、登录、订阅、支付、匿名额度。
- 无遥测、分析 SDK、远端日志。
- 不做远端链接正文抓取，不做联网搜索。
- 不自动读取 provider 账号里的模型列表。
- 不把 API Key、raw prompt、raw response、私人网页正文、截图/base64 或完整 URL 写入文档、日志或远端服务。

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
- Chrome Web Store 提交、审核通过确认、正式商店链接、tag、GitHub Release 和公开发布仍需要单独人工确认。
