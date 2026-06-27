---
title: 数据与权限
description: Aviso 会处理哪些数据、使用哪些 Chrome 权限。
sidebar_position: 7
---

# 数据与权限

Aviso 的权限设计遵循最小可用原则：只申请当前功能需要的权限，不为了远端链接正文抓取而申请广域网页访问权限。

## 数据流概览

1. 用户在网页中主动触发 Aviso 操作。
2. Aviso 打开页面内浮窗，并读取完成该操作所需的上下文。
3. Aviso 从本地存储读取设置和 API Key。
4. BYOK 路径下，请求从浏览器扩展直接发送到用户选择的 provider；托管 AI 路径下，请求发送到 Aviso 后端并由后端路由到上游 provider。
5. provider 返回结果后，Aviso 在当前页面浮窗中展示。
6. 如果用户保存结果，历史记录保存在浏览器本地。

BYOK 是默认可用路径，不强制登录。托管 AI 是 v0.3 production candidate 中的可选路径，需要用户主动登录后使用；production 后端 HTTP smoke 和候选包已有证据，但它不代表公开发布、Chrome Web Store 批准或 hosted AI live。

## 本地数据

| 数据 | 用途 | 当前保存方式 |
| --- | --- | --- |
| API Key | 调用用户选择的 provider | 不明文保存；经过本地加密/混淆级保护后保存在 Chrome local extension storage。 |
| 设置 | 模型、开关、界面语言、主题、模板和 provider metadata | 保存在 Chrome 同步设置中。 |
| 历史 | 方便搜索、保存和复用过往结果 | 保存在 Chrome 本地扩展存储。 |
| 运行时短缓存 | 降低重复准备成本 | 只存在于扩展运行时内存，不持久化。 |

## 会进入 provider 请求的内容

根据用户选择的功能，请求内容可能包括选中文本、页面 URL、链接 URL、图片 URL、页面正文片段、自定义提示词、继续追问时的近期对话节选，或用户直接输入的问题。

BYOK 路径会把这些内容直接发送到用户选择的 provider。托管 AI 路径会把这些内容发送到 Aviso 后端和上游 provider。Aviso 后端不持久化 raw prompt、raw response、页面正文、截图/base64、剪贴板内容、用户 BYOK API Key 或完整 URL；账户、额度、风控、请求状态和运营排查所需 metadata 当前保留 30 天。

以下内容不进入 provider 请求：

- 浏览历史和书签搜索词及搜索结果；它们只在本地用于命令面板搜索。
- 复制当前上下文动作本身；它只写入用户剪贴板。
- 连接测试中的网页正文、选区、截图、剪贴板内容和 raw prompt / raw response。

不要把密码、API Key、私密账号信息、未公开文档或敏感客户数据主动发送给模型 provider。

## Chrome 权限说明

| 权限 | 用途 |
| --- | --- |
| `contextMenus` | 在右键菜单中显示 Aviso 操作。 |
| `activeTab` | 用户触发后读取或操作当前标签页。 |
| `storage` | 保存设置、API Key、模板和历史。 |
| `history` | 在命令面板中搜索用户 Chrome 浏览历史；搜索只在本地执行，不发送给 Aviso 服务器或 AI provider。 |
| `bookmarks` | 在命令面板中搜索用户书签。 |
| `identity` | 仅在用户主动登录托管 AI 时打开 Google 授权窗口并换取托管 session；BYOK 不需要该登录。 |
| `clipboardWrite` | 允许从浮窗复制结果。 |

## 站点访问

Aviso 的内容脚本会匹配网页地址，用来在用户正在浏览的页面上显示划词工具栏、命令面板、页面内结果面板、剪贴板提示、iframe 桥接，以及右键内部路径需要的截图框选界面。

这类站点访问不用于抓取任意远端链接正文，不用于广告、遥测、分析或项目方远端日志。只有当用户主动触发需要页面内容的 AI 操作时，相关内容才会按当前选择的 BYOK 或托管 AI 路径发送。

命令面板搜索浏览历史、书签和本地 AI 对话时只生成本地候选。打开 URL、打开历史/书签候选、翻译当前页面和总结当前页面都需要用户选择确认后才执行。

## Host permissions

当前 host permissions 仅包含已经批准的 provider 域名和 v0.3 production candidate 托管 AI 后端域名：

```text
https://api.openai.com/*
https://api.anthropic.com/*
https://ark.cn-beijing.volces.com/*
https://api.deepseek.com/*
https://api.moonshot.cn/*
https://openrouter.ai/*
https://generativelanguage.googleapis.com/*
https://api.hunyuan.cloud.tencent.com/*
https://aviso-backend-production.vercel.app/*
```

它们分别用于 OpenAI、Anthropic、豆包 / Volcengine Ark、DeepSeek、Kimi / Moonshot、OpenRouter、Gemini、Tencent Hunyuan 的 BYOK provider 请求，以及 v0.3 production candidate 托管 AI 后端请求。OpenAI、Anthropic、DeepSeek、Kimi / Moonshot、OpenRouter、Gemini 和 Tencent Hunyuan 支持在设置中配置 API Key 和模型 ID；OpenRouter、Gemini 和 Tencent Hunyuan 的模型 ID 需要用户手动填写，Aviso 不自动读取模型列表。DeepSeek 已有一次 owner 手动 connectivity pass；Kimi / Moonshot、OpenRouter、Gemini 与 Tencent Hunyuan 仍不能写成 live validated。

`https://aviso-backend-production.vercel.app/*` 只代表 production candidate 托管 AI 后端域名，不代表公开发布、Chrome Web Store 提交或 hosted AI live 已经批准。当前 host permissions 仍保持在已批准 provider 域名和已批准 production candidate 后端域名范围内。

## 敏感内容处理

Aviso 对剪贴板感知做了敏感域名和敏感内容过滤，尽量避免在密码、密钥、支付、后台管理等场景里误触发。

这不是对所有敏感信息的完整保证。用户仍应自行判断哪些内容可以发送给模型 provider。

API Key 的本地保护也不是本机安全边界：它不防御已经能读取本机浏览器 profile、控制本机或控制当前 Chrome 用户环境的攻击者。

托管 AI 不要求用户提供模型 provider API Key。托管 session 保存在本地扩展存储中，用户可以在 Popup 中退出托管账号；退出不会删除或禁用 BYOK provider 配置。

## 截图能力

截图能力仅保留在用户主动触发的右键内部路径中。截图/base64 只用于当次图片说明请求，不写入 history、storage、docs、console、telemetry 或 release artifacts。

命令面板和双击快捷菜单不展示截图入口；当前文档不把截图作为普通用户主入口或公开卖点。

## 截图和反馈

通过 [官网反馈表单](/feedback/) 提交问题，或准备商店截图时，请不要暴露：

- API Key。
- 私人网页。
- 真实账号。
- 客户数据。
- 未公开业务资料。
- provider 原始错误中可能包含的敏感内容。

官网反馈表单只发送用户主动填写的问题描述、可选问题类型标签、可选联系邮箱和用户主动上传的插图或截图，不会读取扩展本地历史、API Key、浏览器扩展存储或模型请求内容。
