---
title: 已知限制
description: Aviso 当前版本的使用限制。
sidebar_position: 8
---

# 已知限制

以下记录用于说明 Aviso 当前版本的使用边界。

## Provider 响应速度

Aviso 会尽量在触发后立即显示浮窗和等待状态，但模型首段返回速度仍取决于：

- 选择的模型。
- 网络状态。
- API Key 是否有效。
- provider 负载。
- 输入内容长度。
- 页面正文复杂度。

Aviso 当前版本不承诺模型秒回。界面会显示等待状态；如果长时间没有返回结果，会给出更明确的失败提示。

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

## 发布状态与 API Key

Aviso 仅通过官网和 GitHub Releases 分发安装包，需手动加载。

Aviso 需要你自己的模型服务 API Key，目前不提供内置的免费模型额度。

## Provider 支持范围

当前支持配置：

- 豆包 / Volcengine Ark 支持配置 API Key、模型 ID 和接入点。
- OpenAI 支持配置 API Key 和模型 ID。
- Anthropic 支持配置 API Key 和模型 ID。
- DeepSeek 支持配置 API Key 和模型 ID。
- Kimi / Moonshot 支持配置 API Key 和模型 ID。
- OpenRouter 支持配置 API Key、模型 ID 和接入点。
- Gemini 支持配置 API Key、模型 ID 和接入点。
- Tencent Hunyuan 支持配置 API Key、模型 ID 和接入点。

这些服务需要填写自己的可用 API Key。OpenRouter、Gemini 和 Tencent Hunyuan 作为 OpenAI-compatible 配置使用时，需要手动填写模型 ID；Aviso 不会自动读取模型列表。你也可以在 Popup 中按需手动触发连接测试。
