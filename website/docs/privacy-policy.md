---
title: 隐私政策
description: Aviso 的隐私政策与权限说明。
sidebar_position: 6
---

# 隐私政策

本文说明 Aviso 当前版本的数据流和权限边界。

## 概述

Aviso 是一个 Chrome 浏览器扩展。它帮助用户在当前网页中调用 AI 解释、翻译、润色、总结或处理自定义提示词。

Aviso 目前保留两条 AI 请求路径：

- BYOK direct-provider：你提供自己的模型 API Key。你选择 BYOK 并主动发起 AI 请求时，请求由浏览器扩展直接发送到你选择的模型 provider；API Key、设置和历史记录保存在浏览器扩展存储中。
- 托管账号候选路径：Supabase 前端基础默认关闭，真实登录需要 owner-gated 配置。只有当你选择该路径、登录状态可用并主动发起请求时，请求才会经过 Aviso 后端，再路由到上游模型 provider。BYOK 不会被托管账号状态拦住。

## 本地保存的数据

Aviso 会在浏览器扩展存储中保存必要数据：

| 数据类型 | 保存位置 | 说明 |
| --- | --- | --- |
| API Key | Chrome local extension storage | 不明文保存；以本地加密/混淆级保护保存在当前浏览器 profile 中，仅用于你选择的 BYOK provider 请求。 |
| 托管账号 session | Chrome local extension storage | 用于识别登录状态、账号状态和计划/额度；用户可以在 Popup 中退出。 |
| 设置 | Chrome 同步设置 | 包括界面语言、外观主题、功能开关、自定义模板、默认服务和 provider metadata。 |
| 历史记录 | Chrome 本地扩展存储 | 保存用户主动触发并保存的请求结果，便于后续查看、搜索和复用。 |
| 运行时短缓存 | 扩展运行时内存 | 用于降低重复准备成本，不持久化。 |

部分内部存储 key 仍保留 `contextai_*` 命名，这是为兼容改名前的本地数据；数据不会因此发送到旧服务或第三方服务。

## 会发送给模型 provider 或托管路径的数据

当用户主动触发 AI 操作时，Aviso 会把完成该操作所需的信息发送到当前选择的路径。BYOK direct-provider 路径会直接发送给用户选择的模型 provider；只有当用户选择托管路径、登录状态可用且 owner-gated 激活完成后，Aviso AI 路径才会经过 Aviso 后端和上游模型 provider。可能包含：

- 选中的文本。
- 用户输入的问题或提示词。
- 当前页面 URL。
- 被选中的链接 URL。
- 支持的图片 URL 或支持格式的 base64 图片数据。
- 用于页面总结的页面正文片段。
- 自定义模板展开后的提示词内容。
- 继续追问时的近期对话节选。

页面总结默认会截断页面正文，减少发送内容长度。当前内部文档记录的默认截断长度为 5000 字符。

### 翻译

翻译功能只使用选中的文本或命令面板中用户输入的待翻译文本。当前 MVP 不会把页面 URL、链接 URL、页面正文、远端链接正文、截图或剪贴板内容作为翻译输入。

### 截图提问

截图提问仅保留在用户主动触发的右键内部路径中，必须由用户手动框选并确认。Aviso 只截取用户选择的可见页面区域，并在本次请求中使用；截图数据不会写入历史记录、扩展存储、文件、文档或日志。截图提问的 provider 支持取决于用户选择的模型是否支持视觉输入，当前不作为普通用户主入口或公开卖点。

### 复制当前上下文

复制当前上下文只会把页面标题、URL、可选选中文本和截断后的页面正文写入用户剪贴板。这个动作本身不会调用 AI provider，不会保存到历史记录，也不会发送到 Aviso 或任何远端服务。

### 连接测试与性能摘要

Provider 连接测试只能由用户手动触发，一次只测试一个 provider。测试使用固定公开短句，不包含网页正文、选中文本、链接、图片、截图、剪贴板内容、API Key、raw prompt 或 raw response。

Aviso 的性能摘要只输出到本地扩展 console，用于内部排查等待时间；摘要只包含固定阶段和分桶字段，不包含原文、完整 URL、图片/base64、截图、API Key、raw prompt 或 raw response，也不会发送到远端 telemetry。

## Aviso 项目方可见数据

BYOK direct-provider 路径不会把用户文本、历史、API Key、页面内容或模型请求发送到 Aviso 项目方服务器。

托管路径会在用户主动选择、登录状态可用且 owner-gated 激活完成后经过 Aviso 后端。Aviso 后端会处理完成请求所需的临时内容，并保存账户、计划/额度、风控、请求状态和运营排查所需的 metadata；metadata 当前保留 30 天。Aviso 后端不持久化 raw prompt、raw response、页面正文、截图/base64、剪贴板内容、用户 BYOK API Key 或完整 URL。托管路径的上游 provider 可能按照其服务条款和账户配置处理请求内容。

官网的反馈表单是独立的网站邮件通道。只有当用户主动提交反馈时，表单中的问题类型、触发方式、Chrome / OS / Aviso 版本、provider 路径、可选 provider / 模型名称和可选联系邮箱，会通过 Vercel 函数调用 Resend 邮件服务，发送到维护者邮箱。可选预期结果、实际结果、复现步骤、补充说明和附件内容默认不进入维护者邮件；如果可选内容看起来包含敏感信息，提交仍可成功，并会返回需要脱敏的提示。反馈端点保留 PNG/JPG metadata 移除和敏感内容探测代码作为安全信号，但不把自由文本探测作为转发原文的唯一边界。反馈表单不会读取扩展本地历史、API Key、浏览器扩展存储或模型请求内容，也不属于扩展遥测。

请不要在反馈表单中提交 API Key、token、私人网页正文、客户资料、未公开文档或未脱敏截图。反馈邮件会保存在维护者邮箱中，用于定位问题和回复用户。

## API Key

BYOK API Key 不明文保存，会以本地加密/混淆级保护保存在当前浏览器 profile 的 Chrome local extension storage 中。Aviso 不会把用户的 BYOK API Key 上传到 Aviso 服务器。Aviso AI 不要求用户提供模型 provider API Key。

这类保护只是浏览器 profile 内的便利边界，不防御可读浏览器 profile、已被控制的设备或恶意扩展，也不是系统钥匙串、硬件安全模块、端到端加密或零知识保护。如果你怀疑本机或浏览器 profile 已被控制，请先在 provider 后台轮换或撤销 API Key。

当你使用 BYOK provider 时，请求会从浏览器扩展直接发送到该 provider。当你选择托管路径、登录状态可用且 owner-gated 激活完成后，请求会经过 Aviso 后端和上游 provider。provider 可能会按照其服务条款处理请求内容、日志、计费和滞留数据。使用前，请自行阅读并接受对应 provider 的条款和隐私政策。

## Chrome Web Store Limited Use 说明

Aviso 只会把扩展处理的用户数据用于提供当前网页 AI 助手的用户主动触发功能。Aviso 不出售用户数据，不使用用户数据投放广告，不使用用户数据做信用、借贷或类似决策。

用户主动触发 AI 操作时，BYOK 路径会把完成该功能所需的内容从浏览器扩展直接发送到用户选择的模型 provider；Aviso AI 路径只有在用户选择托管路径、登录状态可用且 owner-gated 激活完成后，才会把完成该功能所需的内容发送到 Aviso 后端和上游模型 provider。Aviso 后端不持久化 raw prompt、raw response、页面正文、截图/base64、剪贴板内容、用户 BYOK API Key 或完整 URL。provider 对数据的处理取决于 provider 服务条款、账户配置和隐私政策。

## 浏览器权限

Aviso 当前使用的主要权限包括：

- `contextMenus`：创建右键菜单。
- `activeTab`：在用户操作后与当前标签页交互。
- `storage`：保存设置、API Key 和历史。
- `history`：在命令面板中搜索 Chrome 浏览历史；搜索只在本地执行。
- `bookmarks`：在命令面板中搜索书签。
- `identity`：仅用于用户主动使用托管账号候选路径且 owner-gated 配置存在时打开授权窗口并换取 session；BYOK 不需要该登录。
- `clipboardWrite`：支持从浮窗复制结果。

Aviso 的内容脚本会匹配网页地址，用来在用户正在浏览的页面上显示划词工具栏、划词翻译卡、默认关闭的双击快捷菜单、命令面板、页面内结果面板、显式开启后的剪贴板提示、iframe 桥接，以及右键内部路径需要的截图框选界面。剪贴板感知默认关闭，关闭或缺失设置时不会常驻注册 copy listener。这类站点访问不会用于抓取任意远端链接正文、投放广告、遥测或分析。只有当用户主动触发需要页面内容的 AI 操作时，相关内容才会按当前选择的 BYOK 或 Aviso AI 路径发送。

当前 host permissions 仅包含已经批准的 provider 域名和 Aviso AI 后端域名：

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

`https://aviso-backend-production.vercel.app/*` 是 Aviso AI 使用的后端域名。Aviso 当前不请求广域 host permissions 来抓取任意远端网页正文。

## 用户控制

用户可以在 Aviso Popup 中：

- 修改或删除 API Key。
- 新增、编辑、删除 AI 服务配置。
- 切换默认服务和默认模型。
- 手动修改模型 ID。
- 关闭部分本地功能开关。
- 切换界面语言和外观主题。
- 管理自定义模板。
- 查看和管理本地历史记录。
- 刷新或退出托管账号候选状态；BYOK 配置不受托管账号状态影响。

如果卸载 Aviso，Chrome 会清理该扩展的本地存储。你也可以在 provider 后台轮换或撤销不再使用的 API Key。

## Provider 支持范围

Aviso 支持配置 OpenAI、Anthropic、豆包 / Volcengine Ark、DeepSeek、Kimi / Moonshot、OpenRouter、Gemini 和 Tencent Hunyuan。用户可以在设置中填写自己的 API Key、模型 ID 或接入点；BYOK 请求由浏览器扩展直连用户选择的 provider。OpenRouter、Gemini 和 Tencent Hunyuan 的模型 ID 需要用户手动填写，Aviso 不自动读取模型列表。

这些模型服务需要用户填写自己的可用 API Key、模型 ID 或接入点。实际可用性取决于用户自己的账号权限、模型权限和服务状态。

托管账号路径的真实登录、计划/额度和 Creem 计费启动仍需要 owner-gated 激活、后端和部署证据。
