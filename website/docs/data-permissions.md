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

Aviso 当前没有项目方后端，因此没有“发送到 Aviso 服务器”的步骤。

## 本地数据

| 数据 | 用途 | 当前保存方式 |
| --- | --- | --- |
| API Key | 调用用户选择的 provider | 加密后保存在 Chrome 本地扩展存储。 |
| 设置 | 模型、开关、模板和 provider 配置 | 保存在 Chrome 扩展存储。 |
| 历史 | 方便搜索和复用过往结果 | 保存在 Chrome 本地扩展存储。 |

## 会进入 provider 请求的内容

根据用户选择的功能，请求内容可能包括选中文本、页面 URL、链接 URL、图片 URL、页面正文片段、自定义提示词或用户直接输入的问题。

不要把密码、API Key、私密账号信息、未公开文档或敏感客户数据主动发送给模型 provider。

## Chrome 权限说明

| 权限 | 用途 |
| --- | --- |
| `contextMenus` | 在右键菜单中显示 Aviso 操作。 |
| `activeTab` | 用户触发后读取或操作当前标签页。 |
| `storage` | 保存设置、API Key、模板和历史。 |
| `bookmarks` | 在命令面板中搜索用户书签。 |
| `clipboardWrite` | 允许从浮窗复制结果。 |

## Host permission

当前记录中的 host permission 为：

```text
https://ark.cn-beijing.volces.com/*
```

它用于豆包 / 火山方舟 OpenAI 兼容接口。Aviso 当前没有为了抓取任意网页正文而申请 `http://*/*` 或 `https://*/*` 这类广域 host permission。

## 敏感内容处理

Aviso 对剪贴板感知做了敏感域名和敏感内容过滤，尽量避免在密码、密钥、支付、后台管理等场景里误触发。

这不是对所有敏感信息的完整保证。用户仍应自行判断哪些内容可以发送给模型 provider。

## 截图和反馈

提交问题反馈或准备商店截图时，请不要暴露：

- API Key。
- 私人网页。
- 真实账号。
- 客户数据。
- 未公开业务资料。
- provider 原始错误中可能包含的敏感内容。
