# Aviso

Aviso 是一个 Chrome MV3 浏览器扩展。它把右键菜单、划词工具栏、命令面板和剪贴板感知统一到一个页面内浮窗里，让用户在当前网页就地调用 AI 解释、翻译、润色、总结或执行自定义 Prompt。

当前版本：`0.1.0`

技术栈：Plasmo、React 18、TypeScript、Chrome MV3

## 当前状态

本项目已进入 v0.1.0 代码完成候选状态，但还不是可发布状态。

- M1-M4 的功能代码项已实现。
- M5 的自动化测试、手动验收页和生产构建基线已具备。
- 用户已反馈完成早期真实 Chrome A-F 人工点击验收，但尚未把逐项结果写入发布清单；当前新增 iframe G 组验收后需按 A-G 重新记录。
- 尚未完成真实 OpenAI / Anthropic / 豆包调用验证。
- 尚未准备 Chrome 商店素材、隐私政策页面和发布回滚记录。

更细的状态以 [STATUS.md](./STATUS.md)、[docs/EXECUTION_PLAN.md](./docs/EXECUTION_PLAN.md) 和 [docs/ACCEPTANCE_CRITERIA.md](./docs/ACCEPTANCE_CRITERIA.md) 为准。

## 功能范围

- 右键菜单：解释、翻译、润色、总结选区、总结当前页面、解释图片、模型切换、自定义模板。
- 划词工具栏：选中文字后快速解释、翻译、润色、总结或发给 AI。
- 命令面板：Mac 通过 `Command+Shift+Space`，Windows/Linux 通过 `Ctrl+Shift+Space` 搜索历史和书签，或直接输入问题。
- 剪贴板感知：复制普通文本后给出提示，敏感页面和敏感内容会被跳过。
- 浮窗：流式展示结果，支持复制、保存、继续追问。
- Popup 设置页：模型选择、API Key、本地功能开关、自定义模板、历史管理和隐私说明。

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

打包发布 zip：

```bash
npm run package
```

## 自动化检查

发布前至少运行：

```bash
npm test
npx tsc --noEmit
npm run build
```

这些命令只验证单元测试、类型检查和构建产物，不等于真实 Chrome 人工验收，也不等于真实模型 API 验证。

## 手动验收

1. 运行 `npm run build`。
2. 在 Chrome 扩展管理页加载 `build/chrome-mv3-prod`。
3. 打开 `tests/manual-test.html`。
4. 按页面内 A-G 清单逐项验证。
5. 把结果记录到 [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md) 的 QA 记录模板中。

当前文档只记录“用户已反馈完成手动验收”，发布前仍需把 Chrome 版本、操作系统、验收时间、A-G 逐项结果和异常备注补录到发布清单。

## API Key 与隐私

Aviso 没有自建后端。AI 请求由浏览器扩展直接发往用户选择的模型厂商。

- API Key 经 AES 加密后保存在 `chrome.storage.local`。
- 设置、模板和历史保存在浏览器本地存储中。
- 代码里保留少量 `contextai_*` 内部 storage key / DOM id，用于兼容改名前的本地设置、历史和已保存 Key；这不影响对外品牌名。
- 项目不添加遥测、分析 SDK 或自建中转服务。
- 当前 `host_permissions` 仅包含豆包/火山方舟 OpenAI 兼容网关：`https://ark.cn-beijing.volces.com/*`。
- 远端链接正文总结未实现，因为它通常需要扩大 `host_permissions`，这与当前最小权限原则存在取舍。

发布前必须再次确认 Popup 内隐私说明、商店隐私文案和实际权限一致。

## 发布门禁

发布或提交商店前，先完成 [RELEASE_CHECKLIST.md](./RELEASE_CHECKLIST.md)。任何涉及发布凭证、商店提交、真实 API 调用或权限扩大的动作，都需要单独确认。
