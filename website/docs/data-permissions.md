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
4. 请求从浏览器扩展直接发送到用户选择的 provider。
5. provider 返回结果后，Aviso 在当前页面浮窗中展示。
6. 如果用户保存结果，历史记录保存在浏览器本地。

AI 请求由浏览器扩展直接发送到用户选择的 provider。

## 本地数据

| 数据 | 用途 | 当前保存方式 |
| --- | --- | --- |
| API Key | 调用用户选择的 provider | 不明文保存；经过本地加密/混淆级保护后保存在 Chrome local extension storage。 |
| 设置 | 模型、开关、界面语言、主题、模板和 provider metadata | 保存在 Chrome 同步设置中。 |
| 历史 | 方便搜索、保存和复用过往结果 | 保存在 Chrome 本地扩展存储。 |
| 运行时短缓存 | 降低重复准备成本 | 只存在于扩展运行时内存，不持久化。 |

## 会进入 provider 请求的内容

根据用户选择的功能，请求内容可能包括选中文本、页面 URL、链接 URL、图片 URL、页面正文片段、自定义提示词、继续追问时的近期对话节选，或用户直接输入的问题。

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
| `clipboardWrite` | 允许从浮窗复制结果。 |

## 站点访问

Aviso 的内容脚本会匹配网页地址，用来在用户正在浏览的页面上显示划词工具栏、命令面板、页面内结果面板、剪贴板提示、iframe 桥接，以及右键内部路径需要的截图框选界面。

这类站点访问不用于抓取任意远端链接正文，不用于广告、遥测、分析或项目方远端日志。只有当用户主动触发需要页面内容的 AI 操作时，相关内容才会由浏览器扩展直接发送到用户选择的模型 provider。

## Host permissions

当前 host permissions 仅包含已经批准的 provider 域名：

```text
https://api.openai.com/*
https://api.anthropic.com/*
https://ark.cn-beijing.volces.com/*
```

它们分别用于 OpenAI、Anthropic 和豆包 / Volcengine Ark OpenAI 兼容接口。OpenAI 和 Anthropic 支持在设置中配置 API Key 和模型 ID，请求由浏览器扩展直连用户选择的 provider。

当前 host permissions 保持在已批准的 provider 域名范围内。

## 敏感内容处理

Aviso 对剪贴板感知做了敏感域名和敏感内容过滤，尽量避免在密码、密钥、支付、后台管理等场景里误触发。

这不是对所有敏感信息的完整保证。用户仍应自行判断哪些内容可以发送给模型 provider。

API Key 的本地保护也不是本机安全边界：它不防御已经能读取本机浏览器 profile、控制本机或控制当前 Chrome 用户环境的攻击者。

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
