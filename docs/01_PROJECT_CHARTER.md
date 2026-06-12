# Aviso Project Charter

Updated: 2026-06-12

## 定位

Aviso 是一个 Chrome MV3 浏览器扩展。它把用户在网页上的当前操作对象转成可控的 AI 输入，并在页面内结果面板中展示输出。

当前项目状态是 `v0.1 internal dogfood / 内部试用版`，`0.1.0` 已提交 Chrome Web Store 审核，等待审核结果。它用于内部试用、质量收口、商店审核和边界验证；还不是公开上架版本，没有通过 Chrome Web Store 审核，也没有正式商店链接。

## 当前目标

- 让用户在当前网页里通过右键菜单、划词工具栏、命令面板、剪贴板提示和双击快捷菜单触发 AI 操作。
- 让用户在 Popup 中管理界面语言、外观主题、功能开关、AI 服务配置、默认模型、历史和自定义指令。
- 让所有 AI 请求保持 BYOK direct-provider：用户自己的 API Key 不明文保存，浏览器直连所选 provider。
- 让数据和权限边界保持清楚：用户主动触发、浏览器本地保存设置、直连所选 provider。

## 当前范围

| 范围 | 当前状态 |
| --- | --- |
| Chrome 扩展 | 已实现，版本 `0.1.0`。 |
| 右键菜单 | 已实现。 |
| 划词工具栏 | 已实现。 |
| 划词翻译卡 | 已实现，默认关闭。 |
| 命令面板 | 已实现，支持历史、书签、本地 AI 对话和浏览历史关键词搜索。 |
| 双击快捷菜单 | 已实现，默认关闭。 |
| 剪贴板提示 | 已实现。 |
| 结果面板和本地历史 | 已实现。 |
| AI 服务配置 | 已实现多配置、默认服务切换、模型 ID 手动编辑和手动连接测试。 |
| UI 语言本地化 | 已实现中文 / English。 |
| Manifest 本地化 | 已实现 `zh_CN` / `en`。 |

截图能力只保留在用户主动触发的右键内部路径中，不作为普通用户主入口或公开卖点。

## 质量状态

- A-G 手动验收：用户已验证基本通过。
- 豆包 / 火山方舟：用户确认可用。
- OpenAI / Anthropic：支持在设置中配置 API Key 和模型 ID，请求由浏览器直连对应 provider。
- DeepSeek / Kimi-Moonshot / OpenRouter / Gemini / Tencent Hunyuan：支持在设置中配置 API Key 和模型 ID；这是 BYOK direct-provider 配置支持，不代表真实 provider live validation。
- 英文界面：用户 smoke check 未发现明显问题。
- 自动检查：以 `git diff --check`、`npm test`、`npx tsc --noEmit`、`npm run build` 为当前基础检查。

## 决策原则

- 功能文档只描述当前实现和当前维护计划。
- 需求文档以当前版本的真实用户路径为准。
- 权限、API Key、真实 provider 调用、发布动作和远端服务相关改动必须单独确认。
- 截图能力保持右键授权入口和内部试用边界，不进入公开卖点。
- API Key 当前保存在 `chrome.storage.local/contextai_api_keys`，使用由扩展 ID 派生的口令做本地加密 / 混淆级保护；这不防御已能读取本机浏览器 profile 或本机已被控制的攻击者。
