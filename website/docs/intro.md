---
title: 产品介绍
description: Aviso 是一个在当前网页直接使用 AI 的 Chrome 扩展。
sidebar_position: 1
---

# 产品介绍

Aviso 是一个 Chrome 浏览器扩展，适合在阅读、研究、编辑网页内容时直接使用 AI。你可以对选中文字、当前页面、链接、剪贴板内容、浏览历史、书签和本地 AI 对话发起解释、翻译、润色、总结或自定义提示词操作，结果会显示在当前页面内的浮窗里。

Aviso 的核心价值是减少来回复制粘贴：当你正在看网页、写内容或整理资料时，可以直接在当前上下文里处理手边的信息。

## 两种开始方式

Aviso 支持两条 AI 服务路径：

- **登录 Aviso AI**：适合想快速开始的用户。登录后可使用免费额度，不需要先准备模型 provider API Key。
- **自带 API Key**：适合已经有 OpenAI、Anthropic、豆包 / Volcengine Ark、DeepSeek、Kimi / Moonshot、OpenRouter、Gemini 或 Tencent Hunyuan 等模型服务账号的用户。请求由浏览器扩展直连你选择的 provider。

两种方式可以按任务切换。BYOK 不强制登录；退出 Aviso AI 账号不会删除或禁用你的 BYOK 配置。

## 当前状态

- 本站按公开官网口径说明当前能力；Chrome Web Store 正式安装链接暂不可用，后续会更新。
- 在正式链接可用前，安装页会说明当前可加载的扩展构建目录。
- 右键菜单、划词工具栏、划词翻译卡、命令面板、双击快捷菜单、默认关闭的剪贴板提示、复制当前上下文、页面内结果面板和 Popup 设置页已经实现。
- Aviso AI 登录、账号状态、免费额度展示、刷新 / 退出，以及 BYOK provider 配置、默认服务切换、模型 ID 手动编辑、中文 / English 界面和 Manifest 本地化已经实现。
- 支持多种模型服务配置，包括 OpenAI、Anthropic、豆包 / Volcengine Ark、DeepSeek、Kimi / Moonshot、OpenRouter、Gemini 和 Tencent Hunyuan。你可以在设置中填写自己的 API Key、模型 ID 或接入点；实际可用性取决于你的账号权限、模型权限和服务状态。

## 适合谁使用

Aviso 适合经常在浏览器里处理信息的人，例如：

- 阅读英文资料并需要快速翻译或解释。
- 编辑网页文本、邮件、表单或草稿，需要润色表达。
- 研究网页、链接、书签和历史记录，希望快速提取线索。
- 想登录后先用 Aviso AI 免费额度开始。
- 希望用自己的 API Key 调用模型，并清楚数据会发送到所选模型 provider。
- 希望把复制上下文、常用提示词、模型切换、历史复用和继续追问放在浏览器当前上下文里完成。

## Aviso 的使用边界

如果你选择“自带 API Key”，Aviso 会让浏览器直接连接你选的模型服务商；你的 API Key、设置和历史优先保存在本地浏览器。登录 Aviso AI 后使用免费额度时，请求会经过 Aviso 后端和上游模型服务商。

这意味着：

- 想快速开始，可以登录 Aviso AI 使用免费额度。
- 想使用自己的模型服务商，可以添加自己的 API Key；计费、数据处理和服务条款由你与该服务商之间的账户关系决定。
- Aviso 不承诺模型响应一定很快，首段返回速度会受网络、模型、输入长度、服务状态和 API Key 状态影响。
- Aviso 已改善等待状态，并提供本地 summary-only 计时方法；当前不宣称真实 provider p50 / p95 目标已经达成。
- Aviso 目前不抓取任意远端链接正文，也不请求广域网页访问权限。
- 命令面板搜索浏览历史、书签和本地 AI 对话时只展示本地候选；打开或页面动作需要用户选择确认，不做自主浏览或联网搜索。
- 截图能力仅保留在右键内部路径中，不作为普通用户主入口或公开卖点。

## 文档入口

建议按以下顺序阅读：

1. [安装 Aviso](./install.md)
2. [首次使用](./first-use.md)
3. [AI 服务与 API Key](./api-keys.md)
4. [核心功能](./core-features.md)
5. [隐私政策](./privacy-policy.md)
