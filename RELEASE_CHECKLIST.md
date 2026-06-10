# Aviso Internal Dogfood Checklist

版本：`0.1.0`

状态：`v0.1 internal dogfood / 内部试用版`，Chrome Web Store 已提交审核 / 待审核

日期：2026-06-10

## 当前结论

当前构建用于内部试用和 Chrome Web Store 审核。用户已验证 A-G 手动验收基本通过，豆包 / 火山方舟 API 可用。OpenAI 和 Anthropic 支持在设置中配置 API Key 和模型 ID。

本清单用于记录当前内部试用质量、发布候选准备和已提交审核状态，不代表 Chrome Web Store 审核通过、正式上架或发布批准。

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

截图能力仅保留在右键主动触发的内部路径中；命令面板和双击快捷菜单不展示截图入口。当前清单不把截图作为普通用户主入口或公开卖点。

## Provider 配置状态

| Provider | 状态 |
| --- | --- |
| 豆包 / 火山方舟 | 用户确认可用。 |
| OpenAI | 支持配置 API Key 和模型 ID。 |
| Anthropic | 支持配置 API Key 和模型 ID。 |

Provider 连接测试只能由用户在 Popup 手动触发，一次只测一个 provider，并只展示脱敏摘要。

## 权限与隐私

- [x] 普通权限只包含当前功能需要的 `contextMenus`、`activeTab`、`storage`、`history`、`bookmarks`、`clipboardWrite`。
- [x] Host permissions 只包含 `https://api.openai.com/*`、`https://api.anthropic.com/*`、`https://ark.cn-beijing.volces.com/*`。
- [x] API Key 不明文保存，保存在 `chrome.storage.local/contextai_api_keys`，不进入 sync。
- [x] 当前 API Key 保护属于由扩展 ID 派生口令的本地加密 / 混淆级保护，不防御已能读取本机浏览器 profile 或本机已被控制的攻击者。
- [x] 非敏感设置保存在 `chrome.storage.sync/contextai_settings`。
- [x] 本地对话历史保存在 `chrome.storage.local/contextai_history`。
- [x] 无项目方后端、provider proxy、遥测、分析 SDK 或远端日志。
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

## 上线前安全扫描

2026-06-10 发布候选收口已执行：

- `npm audit --registry=https://registry.npmjs.org --audit-level=high` 已执行。
- `@mozilla/readability` 已升级到 `0.6.0`，直接运行时 DoS 审计项已移除。
- 最终 package zip 已执行真实形态密钥扫描，未发现 OpenAI、Anthropic、GitHub、AWS、Google、Slack 或私钥格式凭证。
- 最终 package zip 已核对内容，只包含扩展运行文件和 Chrome `_locales`。
- 最终 manifest 已核对权限边界，普通权限和 host permissions 未扩大。

当前仍有公开发布级风险：Plasmo `0.90.5` 是 npm 当前最新版本，但官方 `npm audit` 仍报告其 Parcel 构建链存在 high 级审计项；`npm audit fix --force` 会把 Plasmo 降级到不适合当前项目的旧版本，因此不能自动修复。该风险主要落在本地构建工具链，不是当前扩展运行时 manifest 权限扩大，但公开提交前需要 owner 明确接受或等待 Plasmo / Parcel 上游修复。

当前仍未完成公开发布级收口：Chrome Web Store 审核通过证据、正式商店链接、正式 `v0.1.0` tag、GitHub Release 和人工发布批准。

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
- 当前状态是已提交审核 / 待审核，不是审核通过。
- OpenAI / Anthropic 当前只描述为支持配置的 provider，不描述为可用状态。
- 当前没有项目方后端、登录、订阅、支付、匿名额度、托管 AI、联网搜索或远端链接正文抓取。
- GitHub push、构建通过或内部手动 QA 不等于 Chrome Web Store 发布批准。
