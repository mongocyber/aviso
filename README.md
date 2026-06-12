# Aviso

Aviso 是一个 Chrome MV3 浏览器扩展。它在当前网页内提供右键菜单、划词工具栏、命令面板、剪贴板提示和页面内结果面板，让用户用自己的模型 API Key 调用 AI 做解释、翻译、润色、总结、图片说明和自定义指令。

当前版本：`0.1.0`

当前状态：`v0.1 internal dogfood / 内部试用版`，已提交 Chrome Web Store 审核，等待审核结果

技术栈：Plasmo、React 18、TypeScript、Chrome MV3

## 当前状态

- 当前代码和 `0.1.0` 上传包已提交 Chrome Web Store 审核；还不是公开上架版本，没有通过 Chrome Web Store 审核，也没有正式商店链接。
- 主要功能已经实现，并已有用户 A-G 手动验收“基本通过”的内部记录。
- 豆包 / 火山方舟已由用户确认可用；OpenAI / Anthropic / DeepSeek / Kimi-Moonshot / OpenRouter / Gemini / Tencent Hunyuan 支持在设置中配置 API Key 和模型 ID，请求由浏览器直连用户选择的 provider。DeepSeek、Kimi / Moonshot、OpenRouter、Gemini 与 Tencent Hunyuan 当前仅代表 BYOK direct-provider 配置支持，未做真实 provider live validation。
- UI 支持中文和英文：默认跟随 Chrome 界面语言，Popup 设置里可以手动切换。
- Aviso 没有项目方后端、账号系统、订阅支付、匿名额度、遥测、分析 SDK、远端链接正文抓取或联网搜索。
- v0.2 的命令面板本地意图、等待态和 WXT 并行构建路径已有实现证据；v0.2 仍未公开发布，WXT 也未切换为默认构建。

更细状态见 [STATUS.md](./STATUS.md) 和 [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)。

## 当前功能

- 右键菜单：解释、翻译、润色选区、润色可编辑区域、总结选区、总结当前页面、总结链接、总结视频、解释图片、复制当前上下文、模型切换、自定义指令。
- 划词工具栏：对选中文本快速解释、翻译、润色、总结或发送给 AI。
- 划词翻译卡：开启后可对短选区显示就地翻译结果，支持复制、重试和打开结果面板。
- 命令面板：Mac 使用 `Command+Shift+Space`，Windows/Linux 使用 `Ctrl+Shift+Space`；可搜索 Chrome 浏览历史、Chrome 书签和 Aviso 本地 AI 对话，也可直接输入问题。本地候选和打开/页面动作采用 confirm-first，不做自主浏览、联网搜索或远端链接正文抓取。
- 双击快捷菜单：默认关闭；开启后在安全网页区域双击显示紧凑入口，复用现有本地动作和 AI 动作。
- 剪贴板提示：复制普通文本后显示提示，敏感页面和敏感内容会跳过。
- 结果面板：流式展示结果，支持复制、保存、继续追问和本地对话历史。
- Popup 设置页：界面语言、外观主题、默认模型、本地功能开关、AI 服务配置、手动连接测试、历史和自定义指令。

截图入口当前只保留在用户主动触发的右键内部路径中，不作为普通用户主入口或公开卖点。

## 文档

- [docs/README.md](./docs/README.md)：项目文档索引。
- [docs/01_PROJECT_CHARTER.md](./docs/01_PROJECT_CHARTER.md)：当前项目定位和边界。
- [docs/02_PRD.md](./docs/02_PRD.md)：当前已实现功能对应的产品需求。
- [docs/03_TECH_SPEC.md](./docs/03_TECH_SPEC.md)：当前技术结构、权限、存储和数据流。
- [docs/07_PRIVACY_AND_SECURITY.md](./docs/07_PRIVACY_AND_SECURITY.md)：当前隐私和安全边界。
- [docs/EXECUTION_PLAN.md](./docs/EXECUTION_PLAN.md)：当前维护执行计划。
- [docs/ACCEPTANCE_CRITERIA.md](./docs/ACCEPTANCE_CRITERIA.md)：当前验收标准。

## 本地开发

安装依赖：

```bash
npm install
```

启动开发模式：

```bash
npm run dev
```

Chrome 加载开发构建目录：

```text
build/chrome-mv3-dev
```

生产构建：

```bash
npm run build
```

Chrome 加载生产构建目录：

```text
build/chrome-mv3-prod
```

打包 zip：

```bash
npm run package
```

## 检查

常用检查：

```bash
npm test
npx tsc --noEmit
npm run build
```

这些命令只验证单元测试、类型检查和构建，不等于真实 Chrome 加载验收，也不等于真实模型 API 验证。

## 手动验收

1. 运行 `npm run build`。
2. 在 Chrome 扩展管理页加载 `build/chrome-mv3-prod`。
3. 打开 `tests/manual-test.html`。
4. 按 A-G 清单验证右键菜单、划词工具栏、命令面板、剪贴板提示、自定义指令、结果面板和 iframe 场景。
5. 把结论记录到 [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)。

## API Key 与隐私

Aviso 的 AI 请求由浏览器扩展直接发往用户选择的模型厂商。

- API Key 不明文保存，保存在 `chrome.storage.local/contextai_api_keys`，不进入 Chrome sync。
- 当前保护方式使用由扩展 ID 派生的口令，属于本地加密 / 混淆级保护；它能避免普通配置同步和直接明文暴露，但不防御已能读取本机浏览器 profile 或本机已被控制的攻击者。
- 非敏感设置保存在 `chrome.storage.sync/contextai_settings`。
- 本地 AI 对话历史保存在 `chrome.storage.local/contextai_history`。
- 允许访问的 provider host 只有 OpenAI、Anthropic、火山方舟北京网关、DeepSeek、Moonshot、OpenRouter、Gemini 和 Tencent Hunyuan。
- 连接测试只能由用户在 Popup 中手动触发，一次只测一个 provider，并只展示脱敏摘要。
- 项目不添加遥测、分析 SDK、项目方模型中转服务或远端日志。
