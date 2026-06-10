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
| 豆包 / Volcengine Ark | 内部测试和用户反馈确认路径可用。 |
| OpenAI | 支持配置 API Key 和模型 ID；实际可用性取决于你的 Key、模型权限和 provider 状态。 |
| Anthropic | 支持配置 API Key 和模型 ID；实际可用性取决于你的 Key、模型权限和 provider 状态。 |

OpenAI 和 Anthropic 不作为当前版本的主卖点；需要由用户填写自己的可用 API Key，并在 Popup 中手动触发连接测试。

## AI 服务配置

Popup 支持多 AI 服务配置。你可以：

- 为同一个 provider 保存多个配置。
- 设置当前默认服务。
- 手动编辑 OpenAI / Anthropic 的模型 ID。
- 为豆包 / Volcengine Ark 填写接入点和模型字段。
- 手动触发连接测试；测试一次只针对当前 provider，并只展示脱敏摘要。

Aviso 不会自动读取 provider 账号里的模型列表，也不会自动调用 list-models API。

## 设置步骤

1. 点击 Chrome 工具栏中的 Aviso 图标。
2. 在 Popup 的 AI 服务区域新增或编辑一个服务配置。
3. 输入对应的 API Key。
4. 按需要填写模型 ID、接入点或服务名称。
5. 保存后，可以把该配置设为默认服务。
6. 回到网页中使用右键菜单、划词工具栏、命令面板、划词翻译卡或结果面板追问发起请求。

## API Key 如何保存

API Key 不明文保存，会经过本地加密/混淆级保护后保存在 Chrome local extension storage 中，并用于浏览器扩展直连所选 provider。

仍需理解这个边界：

- API Key 存在于你的浏览器本地环境中。
- 当前保护不防御已经能读取本机浏览器 profile、控制本机或控制当前 Chrome 用户环境的攻击者。
- 非敏感服务设置保存在 Chrome 同步设置中，API Key 不进入同步设置。
- 使用模型时，请求会直接发送给你选择的 provider。
- provider 的计费、日志、数据保留和使用限制由你的 provider 账户条款决定。
- 不要在截图、反馈、Issue、录屏或聊天中暴露 API Key。

## 更换或移除 Key

你可以在 Aviso Popup 中更新 API Key。如果要停止使用某个 provider，请删除对应 Key，并在 provider 后台按需要轮换或撤销旧 Key。

如果你卸载扩展，Chrome 会清理该扩展的本地存储。
