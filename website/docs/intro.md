---
title: 产品介绍
description: Aviso 是一个在当前网页就地调用 AI 的 Chrome 扩展。
sidebar_position: 1
---

# 产品介绍

Aviso 是一个 Chrome 浏览器扩展，适合在阅读、研究、编辑网页内容时快速调用 AI。你可以对选中文字、当前页面、链接、图片线索、剪贴板内容、浏览历史、书签和本地 AI 对话发起解释、翻译、润色、总结或自定义提示词操作，结果会显示在当前页面内的浮窗里。

Aviso 的核心目标不是替代完整聊天工具，而是减少来回复制粘贴：当你正在看网页、写内容或整理资料时，可以直接在当前上下文里处理手边的信息。

## 当前状态

Aviso 当前版本为 `0.1.0`。本站是面向公开发布使用的产品官网与文档，用于介绍当前能力、隐私边界和安装说明；`0.1.0` 已提交 Chrome Web Store 审核，正式安装链接暂不可用，审核通过后会更新。核心功能已经实现，并已有内部手动验收基本通过的记录；内部测试和用户反馈确认豆包 / Volcengine Ark 路径可用。BYOK direct-provider 仍是当前对外主线；v0.3 Aviso AI / 托管 AI 是可选 staging 路径，不代表 production、公开发布或 Chrome Web Store 批准。

当前状态：

- 本站按公开官网口径说明当前能力；Chrome Web Store 正式安装链接暂不可用，审核通过后会更新。
- 当前 `0.1.0` 已提交 Chrome Web Store 审核；在正式链接可用前，仅向受邀测试者和审核准备人员提供可加载的扩展构建目录。
- 右键菜单、划词工具栏、划词翻译卡、命令面板、双击快捷菜单、剪贴板提示、页面内结果面板和 Popup 设置页已经实现。
- 多 AI 服务配置、默认服务切换、模型 ID 手动编辑、中文 / English 界面和 Manifest 本地化已经实现。
- BYOK direct-provider 是当前默认可用路径，不强制登录；v0.3 staging 中 Aviso AI / 托管 AI 已作为可选路径验证，只有选择托管路径才需要登录，BYOK 不受影响。
- 内部测试和用户反馈确认豆包 / Volcengine Ark 路径可用。
- OpenAI、Anthropic、DeepSeek、Kimi / Moonshot、OpenRouter、Gemini 和 Tencent Hunyuan 支持在设置中配置 API Key 和模型 ID；OpenRouter、Gemini 和 Tencent Hunyuan 的模型 ID 需要手动填写，Aviso 不自动读取模型列表。DeepSeek 已有一次 owner 手动 connectivity pass；Kimi / Moonshot、OpenRouter、Gemini 与 Tencent Hunyuan 当前仍不能写成 live validated。实际可用性取决于你的 Key、模型权限和 provider 状态。
- 本站说明当前已实现能力和使用边界；当前状态是已提交审核，不代表已经通过 Chrome Web Store。

## 适合谁使用

Aviso 适合经常在浏览器里处理信息的人，例如：

- 阅读英文资料并需要快速翻译或解释。
- 编辑网页文本、邮件、表单或草稿，需要润色表达。
- 研究网页、链接、书签和历史记录，希望快速提取线索。
- 希望用自己的 API Key 调用模型，并清楚数据会发送到所选模型 provider。
- 希望把常用提示词、模型切换、历史复用和继续追问放在浏览器当前上下文里完成。

## Aviso 的使用边界

BYOK AI 请求由浏览器扩展直接发送给你选择的模型 provider。API Key、设置和历史优先保存在本地浏览器。v0.3 Aviso AI / 托管 AI 当前仅是 staging 内部验证路径；使用该路径时，请求会经过 Aviso staging 后端和上游 provider。

这意味着：

- 你需要自行准备 provider API Key。
- 只有你主动选择 Aviso AI / 托管路径时才需要登录；未登录托管 AI 不会阻止你继续使用 BYOK provider。
- provider 的计费、数据处理和服务条款由你与 provider 之间的账户关系决定。
- Aviso 不承诺模型响应一定很快，首段返回速度会受网络、模型、输入长度、provider 状态和 API Key 状态影响。
- Aviso 已改善等待状态，并提供本地 summary-only 计时方法；当前不宣称真实 provider p50 / p95 目标已经达成。
- Aviso 目前不抓取任意远端链接正文，也不请求广域网页访问权限。
- 命令面板搜索浏览历史、书签和本地 AI 对话时只展示本地候选；打开或页面动作需要用户选择确认，不做自主浏览或联网搜索。
- 截图能力仅保留在右键内部路径中，不作为普通用户主入口或公开卖点。

## 文档入口

建议按以下顺序阅读：

1. [安装 Aviso](./install.md)
2. [API Key 设置](./api-keys.md)
3. [首次使用](./first-use.md)
4. [核心功能](./core-features.md)
5. [隐私政策](./privacy-policy.md)
