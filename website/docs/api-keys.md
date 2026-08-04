---
title: AI 服务与 API Key
description: 选择 Aviso AI 或设置模型 provider API Key，并了解数据会如何发送。
sidebar_position: 3
---

# AI 服务与 API Key

Aviso 支持两种 AI 服务路径：

- **托管账号候选路径**：Supabase 前端基础默认关闭，真实登录需要 owner-gated 配置；启用后不要求用户提供模型 provider API Key。
- **BYOK direct-provider**：使用你自己的模型 provider API Key；BYOK 请求会从浏览器扩展直连你选择的 provider。

你可以在 Popup 中管理默认服务，也可以按任务切换服务。

## 托管账号候选路径

托管账号路径当前用于候选审核且默认关闭。Popup 中已有账号状态、计划/额度状态、刷新和退出的前端基础，但真实 Supabase 登录需要 owner-gated 配置后才能启用。使用该路径时，只有用户选择托管路径、登录状态可用且 owner-gated 激活完成后，请求才会经过 Aviso 后端和上游模型 provider。

需要注意：

- 退出 Aviso AI 不会删除或禁用 BYOK provider 配置。
- 如果账号、计划/额度或服务状态不可用，可以切回 BYOK provider。

## 支持的 provider

当前代码中包含以下 provider 路径：

| Provider | 当前状态 |
| --- | --- |
| 豆包 / Volcengine Ark | 支持配置 API Key、模型 ID 和接入点；实际可用性取决于你的 Key、模型权限和服务状态。 |
| OpenAI | 支持配置 API Key 和模型 ID；实际可用性取决于你的 Key、模型权限和服务状态。 |
| Anthropic | 支持配置 API Key 和模型 ID；实际可用性取决于你的 Key、模型权限和服务状态。 |
| DeepSeek | 支持配置 API Key 和模型 ID；实际可用性取决于你的 Key、模型权限和服务状态。 |
| Kimi / Moonshot | 支持配置 API Key 和模型 ID；实际可用性取决于你的 Key、模型权限和服务状态。 |
| OpenRouter | 支持配置 API Key、模型 ID 和接入点；实际可用性取决于你的 Key、模型权限和服务状态。 |
| Gemini | 支持配置 API Key、模型 ID 和接入点；实际可用性取决于你的 Key、模型权限和服务状态。 |
| Tencent Hunyuan | 支持配置 API Key、模型 ID 和接入点；实际可用性取决于你的 Key、模型权限和服务状态。 |

这些服务需要你填写自己的可用 API Key，并在 Popup 中按需触发连接测试。OpenRouter、Gemini 和 Tencent Hunyuan 作为 OpenAI-compatible 配置使用时，需要手动填写模型 ID，Aviso 不会自动读取模型列表。

## AI 服务配置

Popup 支持多 AI 服务配置。你可以：

- 查看托管账号状态、计划/额度状态，并在候选路径中执行刷新或退出。
- 为同一个 provider 保存多个配置。
- 设置当前默认服务。
- 手动编辑 OpenAI / Anthropic / DeepSeek / Kimi-Moonshot / OpenRouter / Gemini / Tencent Hunyuan 的模型 ID。
- 为豆包 / Volcengine Ark 填写接入点和模型字段。
- 手动触发连接测试；测试一次只针对当前 provider，并只展示脱敏摘要。

Aviso 不会自动读取 provider 账号里的模型列表，也不会自动调用 list-models API。

## BYOK 设置步骤

1. 点击 Chrome 工具栏中的 Aviso 图标。
2. 在 Popup 的 AI 服务区域新增或编辑一个服务配置。
3. 输入对应的 API Key。
4. 按需要填写模型 ID、接入点或服务名称。
5. 保存后，可以把该配置设为默认服务。
6. 回到网页中使用右键菜单、划词工具栏、命令面板、划词翻译卡或结果面板追问发起请求。

## API Key 如何保存

API Key 不明文保存，会以本地加密/混淆级保护保存在当前浏览器 profile 的 Chrome local extension storage 中，并用于 BYOK direct-provider 请求。

仍需理解这个边界：

- API Key 存在于当前浏览器 profile 中。
- 当前保护只是浏览器 profile 内的便利边界，不防御可读浏览器 profile、已被控制的设备或恶意扩展。
- 当前保护不是系统钥匙串、硬件安全模块、端到端加密或零知识保护。
- 非敏感服务设置保存在 Chrome 同步设置中，API Key 不进入同步设置。
- 使用 BYOK provider 时，请求会直接发送给你选择的 provider；使用 Aviso AI 时，只有在你选择托管路径、登录状态可用且 owner-gated 激活完成后，请求才会经过 Aviso 后端和上游 provider。
- provider 的计费、日志、数据保留和使用限制由你的 provider 账户条款决定。
- 不要在截图、反馈、Issue、录屏或聊天中暴露 API Key。

托管账号路径不要求你提供模型 provider API Key；托管 session 保存在本地扩展存储中，可以在 Popup 中退出。真实 Supabase 激活仍需 owner-gated 配置。

## 更换或移除 Key

你可以在 Aviso Popup 中更新 API Key。如果要停止使用某个 provider，请删除对应 Key，并在 provider 后台按需要轮换或撤销旧 Key。

如果你卸载扩展，Chrome 会清理该扩展的本地存储。
