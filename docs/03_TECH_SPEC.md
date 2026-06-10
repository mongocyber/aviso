# Aviso Tech Spec

Updated: 2026-06-08

## 技术栈

- Chrome MV3 extension
- Plasmo `0.90.5`
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
    "https://ark.cn-beijing.volces.com/*"
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

OpenAI / Anthropic 新配置会提供默认模型 ID，但输入框允许用户手动修改。Aviso 不自动调用 provider 的 list-models API，也不自动读取用户账号可用模型列表。

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
- 翻译只处理用户选中或输入的文本。
- 浏览历史和书签搜索只在本地执行，不进入 AI 请求。
- 复制当前上下文只写用户剪贴板，不调用 provider。
- 截图只在用户通过右键内部路径主动确认后用于当次图片说明请求；base64 不写入 storage、history、docs 或日志。当前不把截图作为普通用户主入口或公开卖点。

## 本地化

- 运行时 UI 文案由 `src/utils/i18n.ts` 提供。
- `contextai_settings.uiLanguage` 是非敏感设置，可选自动、中文、English。
- Chrome manifest 文案源码位于 `locales/zh_CN/messages.json` 和 `locales/en/messages.json`；Plasmo 构建时映射到 Chrome 扩展要求的 `_locales/zh_CN/messages.json` 和 `_locales/en/messages.json`。
- 翻译目标语言与 UI 语言互相独立。

## 检查命令

```bash
git diff --check
npm test
npx tsc --noEmit
npm run build
```

这些命令不执行真实 provider API 调用。
