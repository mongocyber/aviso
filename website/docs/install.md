---
title: 安装
description: 安装 Aviso Chrome 扩展的当前说明。
sidebar_position: 2
---

# 安装

Aviso 的正式 Chrome Web Store 安装链接暂不可用。当前页面说明正式链接可用前的加载方式，以及安装后建议检查的项目。

## Chrome Web Store 安装

正式商店链接可用后，本页会更新为标准安装步骤。当前先保留占位说明，不写假链接：

```text
Chrome Web Store 正式链接：暂不可用，后续更新
```

官网首页和导航中的“添加到 Chrome”也会随正式链接同步更新。

## 当前构建获取方式

在正式商店链接可用之前，当前构建目录由维护者提供。当前记录中的构建目录为：

```text
build/chrome-mv3-prod
```

这个目录来自项目本地构建，用于加载扩展并完成安装检查。Chrome Web Store 链接可用后，本页会替换为正式安装步骤。

## 在 Chrome 中加载扩展

1. 打开 Chrome。
2. 进入 `chrome://extensions/`。
3. 打开右上角的“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择维护者提供的 `build/chrome-mv3-prod` 目录。
6. 确认扩展列表中显示 Aviso。

安装后，Chrome 工具栏中会出现 Aviso 扩展入口。你可以从 Popup 中设置界面语言、外观主题、默认模型、AI 服务配置、API Key、功能开关、本地历史和自定义模板。

## 安装后先检查

建议先完成这些检查：

- 打开 Aviso Popup，确认能看到托管账号候选入口、AI 服务配置和 API Key 设置。
- 确认托管账号路径在没有 owner-gated Supabase 配置时安全失败；不要把它当作公开可用登录入口。
- 如果想使用自己的模型服务，新增或编辑一个 BYOK 服务配置，并按需保存 API Key、模型 ID 或接入点。
- 第一次保存 API Key 或切换新的模型服务后，首次请求可能需要更久；等待页面提示返回即可，之后通常会更快。
- 打开一个普通网页，选中一段文本，检查是否出现划词工具栏。
- 在网页中右键，检查是否出现 Aviso 菜单。
- Mac 使用 `Command+Shift+Space`，Windows/Linux 使用 `Ctrl+Shift+Space`，检查命令面板是否能打开。
- 如已开启划词翻译卡或双击快捷菜单，确认它们只在普通网页区域按设置出现。
