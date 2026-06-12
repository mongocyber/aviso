---
title: 已知限制
description: Aviso v0.1 的当前限制。
sidebar_position: 8
---

# 已知限制

Aviso 当前是 v0.1。以下记录用于说明当前版本的使用边界。

## Provider 响应速度

Aviso 会尽量在触发后立即显示浮窗和等待状态，但模型首段返回速度仍取决于：

- 选择的模型。
- 网络状态。
- API Key 是否有效。
- provider 负载。
- 输入内容长度。
- 页面正文复杂度。

Aviso v0.1 不承诺模型秒回。v0.2 已加入更明确的等待状态和本地 summary-only TTFT 方法，但未执行真实 provider 采样，也不宣称 p50 / p95 目标已经达成。

## 页面总结长度

页面总结会提取当前页面正文，并默认截断到约 5000 字符后再发送给 provider。

这能减少请求体积和等待时间，但长页面后半部分可能没有被完整覆盖。

## 远端链接正文

链接总结当前主要把链接 URL 作为上下文交给模型，不会主动抓取远端网页正文。

Aviso 当前不抓取任意远端链接内容，也不申请广域 host permissions。

## 浏览历史和书签搜索

命令面板可以搜索 Chrome 浏览历史、Chrome 书签和 Aviso 本地 AI 对话。浏览历史和书签只用于本地关键词搜索，不进入 AI 请求，也不会发送给 Aviso 服务器。

浏览器权限、页面焦点或用户环境可能影响搜索结果展示。

打开 URL、打开历史/书签候选、翻译当前页面和总结当前页面都需要用户选择候选后才执行。命令面板不做自主浏览、联网搜索或远端链接正文抓取。

## 图片解释

Aviso 仅在右键内部路径中，对支持的图片 URL 或支持格式的 base64 图片数据发起解释。部分远端图片即使格式看起来可用，也可能因为 provider 无法下载、网页鉴权、跨域策略或图片来源限制而失败。

任意网页图片解释并不保证所有来源都可用。

## 截图入口

截图能力仅保留在用户主动触发的右键内部路径中。命令面板和双击快捷菜单不展示截图入口，当前也不把截图作为普通用户主入口或公开卖点。

截图提问是否可用还取决于用户选择的模型是否支持视觉输入。

## Provider 验证状态

当前记录中：

- 内部测试和用户反馈确认豆包 / Volcengine Ark 路径可用。
- OpenAI 支持配置 API Key 和模型 ID；实际可用性取决于你的 Key、模型权限和 provider 状态。
- Anthropic 支持配置 API Key 和模型 ID；实际可用性取决于你的 Key、模型权限和 provider 状态。
- DeepSeek 支持配置 API Key 和模型 ID；未做真实 provider live validation。
- Kimi / Moonshot 支持配置 API Key 和模型 ID；未做真实 provider live validation。
- OpenRouter 支持配置 API Key 和手动模型 ID；provider id 为 `openrouter`，base URL 为 `https://openrouter.ai/api/v1`，host permission 为 `https://openrouter.ai/*`；未做真实 provider live validation，不自动读取模型列表。
- Gemini 支持配置 API Key 和手动模型 ID；provider id 为 `gemini`，base URL 为 `https://generativelanguage.googleapis.com/v1beta/openai/`，host permission 为 `https://generativelanguage.googleapis.com/*`；V02-018 已完成非 live 验证，未做真实 provider live validation，不自动读取模型列表。
- Tencent Hunyuan 支持配置 API Key 和手动模型 ID；provider id 为 `hunyuan`，base URL 为 `https://api.hunyuan.cloud.tencent.com/v1`，host permission 为 `https://api.hunyuan.cloud.tencent.com/*`；V02-018 已完成非 live 验证，未做真实 provider live validation，不自动读取模型列表。

OpenAI、Anthropic、DeepSeek、Kimi / Moonshot、OpenRouter、Gemini 和 Tencent Hunyuan 不作为当前版本的可用性保证；需要由用户填写自己的可用 API Key，并在 Popup 中手动触发连接测试。
