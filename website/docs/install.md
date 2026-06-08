---
title: 安装
description: 安装 Aviso Chrome 扩展的当前说明。
sidebar_position: 2
---

# 安装

当前安装说明主要面向内部试用和审核准备场景。

## 当前可用方式

内部试用时，维护者会提供可加载的 Chrome 扩展目录。当前记录中的生产构建目录为：

```text
build/chrome-mv3-prod
```

这个目录来自项目本地构建，当前用于内部试用加载。

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

如果你是审核人员，请按“内部试用构建”的状态理解当前材料。
