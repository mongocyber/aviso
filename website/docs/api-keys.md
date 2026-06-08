---
title: API Key 设置
description: 设置模型 provider API Key，并了解数据会如何发送。
sidebar_position: 3
---

# API Key 设置

Aviso 使用你自己的模型 provider API Key 发起请求。请求会从浏览器扩展直连你选择的 provider。

## 支持的 provider

当前代码中包含以下 provider 路径：

| Provider | 当前状态 |
| --- | --- |
| 豆包 / 火山方舟 | 已有用户可用反馈。 |
| OpenAI | 代码路径已实现，真实调用待验收。 |
| Anthropic | 代码路径已实现，真实调用待验收。 |

OpenAI 和 Anthropic 保持待验收状态。

## 设置步骤

1. 点击 Chrome 工具栏中的 Aviso 图标。
2. 在 Popup 中选择要使用的模型或 provider。
3. 输入对应的 API Key。
4. 如果使用豆包 / 火山方舟，按维护者说明填写接入点和模型字段。
5. 保存设置后，回到网页中使用右键菜单、划词工具栏或命令面板发起请求。

## API Key 如何保存

API Key 会经过 AES 加密后保存在 Chrome 的本地扩展存储中，并用于浏览器扩展直连所选 provider。

仍需理解这个边界：

- API Key 存在于你的浏览器本地环境中。
- 使用模型时，请求会直接发送给你选择的 provider。
- provider 的计费、日志、数据保留和使用限制由你的 provider 账户条款决定。
- 不要在截图、反馈、Issue、录屏或聊天中暴露 API Key。

## 更换或移除 Key

你可以在 Aviso Popup 中更新 API Key。如果要停止使用某个 provider，请删除对应 Key，并在 provider 后台按需要轮换或撤销旧 Key。

如果你卸载扩展，Chrome 会清理该扩展的本地存储。
