---
title: 隐私政策
description: Aviso 的隐私政策与权限说明。
sidebar_position: 6
---

# 隐私政策

本文说明 Aviso 当前实现的数据流和权限边界。正式提交 Chrome Web Store 前，仍需要与商店后台隐私声明、商店截图和最终构建产物再次核对。

## 概述

Aviso 是一个 Chrome 浏览器扩展。它帮助用户在当前网页中调用 AI 解释、翻译、润色、总结或处理自定义提示词。

Aviso 当前没有自建后端，不提供项目方账号系统，不添加遥测，不添加分析 SDK，也不使用 Aviso 项目方服务器中转模型请求。你主动发起 AI 请求时，请求会由浏览器扩展直接发送到你选择的模型 provider。

## 本地保存的数据

Aviso 会在浏览器扩展存储中保存必要数据：

| 数据类型 | 保存位置 | 说明 |
| --- | --- | --- |
| API Key | Chrome 本地扩展存储 | 保存前会使用 AES 加密，仅用于你选择的模型 provider 请求。 |
| 设置 | Chrome 扩展存储 | 包括模型选择、功能开关、自定义模板、豆包接入点和模型字段。 |
| 历史记录 | Chrome 本地扩展存储 | 保存用户主动触发的请求结果，便于后续查看和复用。 |

部分内部存储 key 仍保留 `contextai_*` 命名，这是为兼容改名前的本地数据，不代表数据会发送到旧服务或第三方服务。

## 会发送给模型 provider 的数据

当用户主动触发 AI 操作时，Aviso 会把完成该操作所需的信息直接发送给用户选择的模型 provider。可能包含：

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

截图提问必须由用户手动框选并确认。Aviso 只截取用户选择的可见页面区域，并在本次请求中使用；截图数据不会写入历史记录、扩展存储、文件、文档或日志。截图提问的 provider 支持取决于用户选择的模型是否支持视觉输入。

### 复制当前上下文

复制当前上下文只会把页面标题、URL、可选选中文本和截断后的页面正文写入用户剪贴板。这个动作本身不会调用 AI provider，不会保存到历史记录，也不会发送到 Aviso 或任何远端服务。

### 连接测试与性能摘要

Provider 连接测试只能由用户手动触发，一次只测试一个 provider。测试使用固定公开短句，不包含网页正文、选中文本、链接、图片、截图、剪贴板内容、API Key、raw prompt 或 raw response。

Aviso 的性能摘要只输出到本地扩展 console，用于内部排查等待时间；摘要只包含固定阶段和分桶字段，不包含原文、完整 URL、图片/base64、截图、API Key、raw prompt 或 raw response，也不会发送到远端 telemetry。

## 不会发送给 Aviso 的数据

Aviso 当前没有自建后端，因此不会把用户文本、历史、API Key、页面内容或模型请求发送到 Aviso 项目方服务器。

Aviso 当前也不包含：

- 遥测。
- 分析 SDK。
- 跟踪像素。
- 项目方账号标识。
- 项目方日志服务。
- 项目方模型代理。

## API Key

API Key 会加密保存在浏览器本地扩展存储中。Aviso 不会把 API Key 上传到 Aviso 服务器。

当你使用某个 provider 时，请求会从浏览器扩展直接发送到该 provider。provider 可能会按照其服务条款处理请求内容、日志、计费和滞留数据。使用 provider 前，请自行阅读并接受对应 provider 的条款和隐私政策。

## Chrome Web Store Limited Use 说明

Aviso 只会把用户数据用于提供当前网页 AI 助手的用户主动触发功能。Aviso 不出售用户数据，不使用用户数据投放广告，不使用用户数据做信用、借贷或类似决策，也不允许 Aviso 项目方人员读取用户内容。

用户主动触发 AI 操作时，为完成该功能所需的内容会从浏览器扩展直接发送到用户选择的模型 provider。provider 对数据的处理取决于用户与该 provider 的账户关系、服务条款和隐私政策。

## 浏览器权限

Aviso 当前使用的主要权限包括：

- `contextMenus`：创建右键菜单。
- `activeTab`：在用户操作后与当前标签页交互。
- `storage`：保存设置、API Key 和历史。
- `bookmarks`：在命令面板中搜索书签。
- `clipboardWrite`：支持从浮窗复制结果。

Aviso 的内容脚本会匹配网页地址，用来在用户正在浏览的页面上显示划词工具栏、命令面板、页面内结果面板、剪贴板提示、iframe 桥接和截图框选界面。这类站点访问不会用于抓取任意远端链接正文、投放广告、遥测、分析或把页面内容发送到 Aviso 服务器。只有当用户主动触发需要页面内容的 AI 操作时，相关内容才会由浏览器扩展直接发送到用户选择的模型 provider。

当前 host permissions 仅包含已经批准的 provider 域名：

```text
https://api.openai.com/*
https://api.anthropic.com/*
https://ark.cn-beijing.volces.com/*
```

Aviso 当前不请求广域 host permissions 来抓取任意远端网页正文。

OpenAI 和 Anthropic 的 host permission 已在扩展 manifest 中实现，但真实最小调用仍待用户使用原生 API Key 手动验证。公开发布时只应宣称已经完成验证的 provider。当前豆包 / 火山方舟已完成用户手动单 provider 连接测试。

## 当前不包含

Aviso 当前不包含：

- 广域 host permission。
- 任意远端链接正文抓取。
- 全页 DOM 翻译。
- Google、百度、有道等第三方翻译 fallback。
- 多 Tab 聚合或 Tab 分组。
- 语音输入。
- 本地结果缓存。
- 项目方 telemetry、analytics 或远端日志。

## 用户控制

用户可以在 Aviso Popup 中：

- 修改或删除 API Key。
- 关闭部分本地功能开关。
- 管理自定义模板。
- 查看和管理本地历史记录。

如果卸载 Aviso，Chrome 会清理该扩展的本地存储。你也可以在 provider 后台轮换或撤销不再使用的 API Key。

## 当前发布前缺口

公开发布前仍需完成：

- Chrome Web Store 隐私声明核对，并保持与本文、Popup 内隐私说明和最终 manifest 一致。
- 最终商店截图脱敏检查。
- 最终构建产物、商店素材和权限核对。
- OpenAI 和 Anthropic 真实最小调用验证。
- 真实 vision provider 验证。
- 最终支持联系方式确认。

本文不会把上述事项写成已经完成。
