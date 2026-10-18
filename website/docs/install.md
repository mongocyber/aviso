---
title: 安装
description: 安装 Aviso Chrome 扩展的当前说明。
sidebar_position: 2
---

# 安装

Aviso 目前还没有上架 Chrome Web Store，请下载安装包后手动加载。

## 下载安装包

[下载 aviso-0.1.1.zip](https://github.com/mongocyber/aviso/releases/latest/download/aviso-0.1.1.zip)（[所有版本](https://github.com/mongocyber/aviso/releases/latest)）。源码在 [GitHub](https://github.com/mongocyber/aviso)，使用 MIT 许可。

先把 zip 解压成一个文件夹，后面要选的就是这个文件夹。

## 在 Chrome 中加载扩展

1. 打开 Chrome。
2. 进入 `chrome://extensions/`。
3. 打开右上角的“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择刚才解压出来的文件夹（里面直接能看到 `manifest.json`）。
6. 确认扩展列表中显示 Aviso。

安装后，Chrome 工具栏中会出现 Aviso 扩展入口。你可以从 Popup 中设置界面语言、外观主题、默认模型、AI 服务配置、API Key、功能开关、本地历史和自定义模板。

## 安装后先检查

建议先完成这些检查：

- 打开 Aviso Popup，确认能看到 Aviso AI 登录入口、AI 服务配置和 API Key 设置。
- 如果想快速开始，登录 Aviso AI，确认账号和免费额度状态显示正常。
- 如果想使用自己的模型服务，新增或编辑一个 BYOK 服务配置，并按需保存 API Key、模型 ID 或接入点。
- 第一次登录 Aviso AI、保存 API Key 或切换新的模型服务后，首次请求可能需要更久；等待页面提示返回即可，之后通常会更快。
- 打开一个普通网页，选中一段文本，检查是否出现划词工具栏。
- 在网页中右键，检查是否出现 Aviso 菜单。
- Mac 使用 `Command+Shift+Space`，Windows/Linux 使用 `Ctrl+Shift+Space`，检查命令面板是否能打开。
- 如已开启划词翻译卡或双击快捷菜单，确认它们只在普通网页区域按设置出现。
