# Aviso Tech Spec

Updated: 2026-06-14

## 技术栈

- Chrome MV3 extension
- WXT default build path
- Plasmo `0.90.5` rollback path
- React 18
- TypeScript
- Node test runner
- Provider SDK：OpenAI SDK、Anthropic SDK
- 内容抽取：`@mozilla/readability`
- API Key 本地保护依赖：`crypto-js`

## 主要文件和目录

| 路径 | 作用 |
| --- | --- |
| `src/background/index.ts` | Background service worker 入口。 |
| `src/background/ai-client.ts` | Provider 调用、流式响应、连接测试和取消逻辑。 |
| `src/background/context-menus.ts` | Chrome 原生右键菜单注册与更新。 |
| `src/background/history.ts` | 本地历史相关 background 处理。 |
| `src/contents/toolbar.tsx` | 划词工具栏。 |
| `src/contents/command.tsx` | 命令面板。 |
| `src/contents/floating.tsx` | 页面内结果面板。 |
| `src/contents/clipboard.tsx` | 剪贴板提示。 |
| `src/contents/double-click-menu.tsx` | 双击快捷菜单。 |
| `src/contents/screenshot.tsx` | 截图选区与右键内部截图路径。 |
| `src/popup/index.tsx` | Popup 设置页。 |
| `src/styles/aviso.tsx` | Aviso 共享主题 token。 |
| `src/utils/i18n.ts` | 运行时 UI 文案和语言解析。 |
| `src/utils/storage.ts` | 设置、API Key 和历史存储辅助。 |
| `src/utils/provider-configs.ts` | AI 服务配置解析。 |
| `src/utils/model-registry.ts` | 当前 provider / model registry。 |
| `src/utils/translation.ts` | 翻译 payload 与目标语言处理。 |
| `locales/zh_CN/messages.json` | Chrome manifest 中文本地化源码。 |
| `locales/en/messages.json` | Chrome manifest 英文本地化源码。 |

本表只列当前维护最常用的主要文件和目录，不作为完整源码清单。

## Manifest

当前 `package.json` 中的 manifest 配置：

```json
{
  "name": "Aviso",
  "default_locale": "zh_CN",
  "description": "__MSG_app_description__",
  "permissions": [
    "contextMenus",
    "activeTab",
    "storage",
    "history",
    "bookmarks",
    "clipboardWrite"
  ],
  "host_permissions": [
    "https://api.openai.com/*",
    "https://api.anthropic.com/*",
    "https://ark.cn-beijing.volces.com/*",
    "https://api.deepseek.com/*",
    "https://api.moonshot.cn/*",
    "https://openrouter.ai/*",
    "https://generativelanguage.googleapis.com/*",
    "https://api.hunyuan.cloud.tencent.com/*"
  ]
}
```

命令：

- `open-command-palette`
- 默认快捷键：Windows/Linux `Ctrl+Shift+Space`，macOS `Command+Shift+Space`
- 命令说明使用 Chrome `_locales` 本地化。

## Provider 模型

当前 provider 类型：

- OpenAI
- Anthropic
- 豆包 / 火山方舟 OpenAI-compatible endpoint
- DeepSeek OpenAI-compatible endpoint
- Kimi / Moonshot OpenAI-compatible endpoint
- OpenRouter OpenAI-compatible endpoint
- Gemini OpenAI-compatible endpoint
- Tencent Hunyuan OpenAI-compatible endpoint

OpenAI / Anthropic 新配置会提供默认模型 ID，但输入框允许用户手动修改。DeepSeek、Kimi / Moonshot、OpenRouter、Gemini 和 Tencent Hunyuan 支持配置 API Key 和模型 ID；provider ids 为 `deepseek`、`moonshot`、`openrouter`、`gemini` 和 `hunyuan`，OpenAI SDK base URLs 为 `https://api.deepseek.com`、`https://api.moonshot.cn/v1`、`https://openrouter.ai/api/v1`、`https://generativelanguage.googleapis.com/v1beta/openai/` 和 `https://api.hunyuan.cloud.tencent.com/v1`。OpenRouter、Gemini 和 Tencent Hunyuan 模型 ID 需用户手动填写，Aviso 不自动读取模型列表。DeepSeek 已有一次 owner 手动 connectivity pass；其他新增 provider 仍只能写为配置支持、实现支持或非 live 验证，不能写成 live validated。

Aviso 不自动调用 provider 的 list-models API，也不自动读取用户账号可用模型列表。

## 存储

| 数据 | 存储位置 | 说明 |
| --- | --- | --- |
| API Key | `chrome.storage.local/contextai_api_keys` | 不明文保存，不进入 sync；当前使用由扩展 ID 派生的口令做本地加密 / 混淆级保护，不防御已能读取本机浏览器 profile 或本机已被控制的攻击者。 |
| 非敏感设置 | `chrome.storage.sync/contextai_settings` | 包括功能开关、默认模型、界面语言、主题、自定义指令和 provider metadata。 |
| 本地对话历史 | `chrome.storage.local/contextai_history` | 本地保存，不同步。 |
| 运行时短缓存 | Service worker 内存 | 用于 settings、route、translation 和 page content 短期复用；不持久化。 |

## 消息流

1. 用户从右键菜单、划词工具栏、命令面板、双击菜单、剪贴板提示或 Popup 发起动作。
2. Content script 整理用户主动触发的输入，例如选中文本、页面标题、可截断正文、截图选区或命令文本。
3. Background 解析当前设置、默认 provider config、模型和 API Key。
4. AI 请求由浏览器扩展直接发往所选 provider host。
5. 流式结果返回到页面内结果面板。
6. 用户可以复制、保存或继续追问；对话历史写入本地 storage。

## 输入边界

- 选区动作只发送选中文本和必要上下文。
- 翻译只处理用户选中、输入或在命令面板明确确认的当前页面正文。
- 命令面板本地 intent 解析在 content script 内确定性完成，不调用模型解析。
- 浏览历史、书签和 Aviso 本地 AI 对话搜索只在本地执行，不进入 AI 请求。
- 命令面板打开 URL、浏览历史和书签结果只允许 `http` / `https`，并需要用户从候选列表中选择后才打开。
- 命令面板恢复本地 AI 对话只回填本地保存的消息，不重新发送给 provider。
- 命令面板当前页面总结和当前页面翻译需要用户从候选列表中确认后，才读取当前页面正文并走既有结果面板 AI 请求路径。
- 命令面板不做联网搜索、远端链接正文抓取、自主多步浏览或自动打开危险 URL scheme。
- 复制当前上下文只写用户剪贴板，不调用 provider。
- 截图只在用户通过右键内部路径主动确认后用于当次图片说明请求；base64 不写入 storage、history、docs 或日志。当前不把截图作为普通用户主入口或公开卖点。

## WXT 默认构建与 Plasmo rollback

v0.2.1 default-build migration 后，默认 `dev`、`build` 和 `package` 走 WXT，产物位于 `.output/chrome-mv3`，zip 位于 `.output/aviso-0.1.0-chrome.zip`。Plasmo rollback 仍通过 `dev:plasmo`、`build:plasmo` 和 `package:plasmo` 保留。

当前 WXT 状态：

- 自动构建和 manifest parity 已通过。
- WXT manifest host permissions 与 Plasmo 构建一致，包含 OpenAI、Anthropic、火山方舟、DeepSeek、Moonshot、OpenRouter、Gemini 和 Tencent Hunyuan。
- V02-WXT-005 已记录 refreshed browser smoke 和 owner manual pass evidence；这不代表 Chrome Web Store 审核通过、公开发布或真实 provider live validation。
- `.output/aviso-0.1.0-chrome.zip` 是内部迁移 artifact，不是 Chrome Web Store 提交包。

## 本地性能摘要

V02-006 已实现 summary-only 本地 TTFT 方法和等待态改善。性能摘要只用于本地排查，不持久化、不上传、不作为 telemetry；摘要不得包含 raw prompt、raw response、私人页面正文、截图/base64、完整 URL、剪贴板内容或 API Key。

当前未执行真实 provider live sampling，不宣称 p50 / p95 TTFT 达标。

## 本地化

- 运行时 UI 文案由 `src/utils/i18n.ts` 提供。
- `contextai_settings.uiLanguage` 是非敏感设置，可选自动、中文、English。
- Chrome manifest 文案源码位于 `locales/zh_CN/messages.json` 和 `locales/en/messages.json`；WXT 默认构建和 Plasmo rollback 构建都应映射到 Chrome 扩展要求的 `_locales/zh_CN/messages.json` 和 `_locales/en/messages.json`。
- 翻译目标语言与 UI 语言互相独立。

## 检查命令

```bash
git diff --check
npm test
npx tsc --noEmit
npm run build
npm run package
npm run build:plasmo
npm run check:manifests
```

这些命令不执行真实 provider API 调用。
