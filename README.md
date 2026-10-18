# Aviso

Aviso 是一个 Chrome MV3 浏览器扩展。它在当前网页内提供右键菜单、划词工具栏、命令面板、剪贴板提示和页面内结果面板，让用户用自己的模型 API Key 调用 AI 做解释、翻译、润色、总结、图片说明和自定义指令。

当前版本：`0.1.1`

当前状态：见 [docs/STATE.md](./docs/STATE.md)。README 只描述产品形态和本地开发流程，不作为 hosted AI 或发布状态 的事实源。

技术栈：Chrome MV3、React 18、TypeScript；本地 `dev` / `build` 保留 Plasmo 路径，规范发布包由 WXT 生成。

## 当前状态

当前产品状态、hosted AI 边界、发布证据和 owner 待确认事项统一维护在 [docs/STATE.md](./docs/STATE.md)。更细的状态视图和证据记录见 [STATUS.md](./STATUS.md) 与 [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)。

## 当前功能

- 右键菜单：解释、翻译、润色选区、润色可编辑区域、总结选区、总结当前页面、总结链接、总结视频、解释图片、复制当前上下文、模型切换、自定义指令。
- 划词工具栏：对选中文本快速解释、翻译、润色、总结或发送给 AI。
- 划词翻译卡：开启后可对短选区显示就地翻译结果，支持复制、重试和打开结果面板。
- 命令面板：Mac 使用 `Command+Shift+Space`，Windows/Linux 使用 `Ctrl+Shift+Space`；可搜索 Chrome 浏览历史、Chrome 书签和 Aviso 本地 AI 对话，也可直接输入问题。本地候选和打开/页面动作采用 confirm-first，不做自主浏览、联网搜索或远端链接正文抓取。
- 双击快捷菜单：默认关闭；开启后在安全网页区域双击显示紧凑入口，复用现有本地动作和 AI 动作。
- 剪贴板提示：复制普通文本后显示提示，敏感页面和敏感内容会跳过。
- 结果面板：流式展示结果，支持复制、保存、继续追问和本地对话历史。
- Popup 设置页：界面语言、外观主题、默认模型、本地功能开关、AI 服务配置、手动连接测试、历史、自定义指令；`0.1.1` production candidate 中还包含可选 Aviso AI 账号/session/额度状态。

截图入口当前只保留在用户主动触发的右键内部路径中，不作为普通用户主入口或公开卖点。

## 文档

- [docs/STATE.md](./docs/STATE.md)：当前事实的唯一来源。
- [docs/README.md](./docs/README.md)：项目文档索引。
- [docs/charter.md](./docs/charter.md)：当前项目定位和边界。
- [docs/prd.md](./docs/prd.md)：当前已实现功能对应的产品需求。
- [docs/tech-spec.md](./docs/tech-spec.md)：当前技术结构、权限、存储和数据流。
- [docs/privacy-and-security.md](./docs/privacy-and-security.md)：当前隐私和安全边界。
- [docs/execution-plan.md](./docs/execution-plan.md)：当前维护执行计划。
- [docs/acceptance-criteria.md](./docs/acceptance-criteria.md)：当前验收标准。

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

生产构建检查：

```bash
npm run build
```

生成规范加载包和 zip：

```bash
npm run package
```

Chrome 加载规范包目录：

```text
build/chrome-mv3-prod
```

## 检查

常用检查：

```bash
npm test
npx tsc --noEmit
npm run build
npm run package
```

这些命令只验证单元测试、类型检查和构建，不等于真实 Chrome 加载验收，也不等于真实模型 API 验证。

## 手动验收

1. 运行 `npm run package`。
2. 在 Chrome 扩展管理页加载 `build/chrome-mv3-prod`。
3. 打开 `tests/manual-test.html`。
4. 按 A-G 清单验证右键菜单、划词工具栏、命令面板、剪贴板提示、自定义指令、结果面板和 iframe 场景。
5. 把结论记录到 [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)。

## API Key 与隐私

BYOK 路径下，Aviso 的 AI 请求由浏览器扩展直接发往用户选择的模型厂商。可选 Aviso AI / hosted AI 路径的当前状态和 release 边界见 [docs/STATE.md](./docs/STATE.md)。

- API Key 不明文保存，保存在 `chrome.storage.local/contextai_api_keys`，不进入 Chrome sync。
- 当前保护方式使用由扩展 ID 派生的口令，属于本地加密 / 混淆级保护；它能避免普通配置同步和直接明文暴露，但不防御已能读取本机浏览器 profile 或本机已被控制的攻击者。
- 非敏感设置保存在 `chrome.storage.sync/contextai_settings`。
- 本地 AI 对话历史保存在 `chrome.storage.local/contextai_history`。
- 允许访问的 host 仅限已批准 provider host：OpenAI、Anthropic、火山方舟北京网关、DeepSeek、Moonshot、OpenRouter、Gemini、Tencent Hunyuan，以及 `0.1.1` production candidate 托管 AI 后端域名 `https://aviso-backend-production.vercel.app/*`。
- 连接测试只能由用户在 Popup 中手动触发，一次只测一个 provider，并只展示脱敏摘要。
- BYOK 默认路径不添加遥测、分析 SDK、production 模型中转服务或远端日志。任何后续公开发布或 hosted AI live 口径仍需 owner 单独批准和对应复核证据。
