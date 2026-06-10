---
title: 安装
description: 安装 Aviso Chrome 扩展的当前说明。
sidebar_position: 2
---

# 安装

Aviso 官网文档面向公开发布使用，但 Chrome Web Store 正式安装链接仍在上架准备阶段。当前页面同时说明未来的商店安装路径，以及当前受邀测试者 / 上架准备人员使用的加载方式。

## Chrome Web Store 上架后安装

Chrome Web Store 审核通过后，本页会替换为正式商店链接和正式安装步骤。当前先保留占位说明，不写假链接：

```text
Chrome Web Store 正式链接：暂不可用，审核通过后更新
```

届时官网首页和导航中的“添加到 Chrome”也会同步替换为正式商店链接。

## 当前构建获取方式

在正式商店链接可用之前，当前构建目录仅向受邀测试者和上架准备人员提供。当前记录中的生产构建目录为：

```text
build/chrome-mv3-prod
```

这个目录来自项目本地构建，当前用于受邀测试和上架准备加载。Chrome Web Store 链接可用后，本页会替换为正式安装步骤。

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

- 打开 Aviso Popup，确认能看到模型和 API Key 设置。
- 打开一个普通网页，选中一段文本，检查是否出现划词工具栏。
- 在网页中右键，检查是否出现 Aviso 菜单。
- Mac 使用 `Command+Shift+Space`，Windows/Linux 使用 `Ctrl+Shift+Space`，检查命令面板是否能打开。
- 如已开启划词翻译卡或双击快捷菜单，确认它们只在普通网页区域按设置出现。

当前材料应按“上架准备中、正式商店链接暂不可用、当前仅通过维护者提供的构建目录验证”的状态理解。
