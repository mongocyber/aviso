# Aviso STATUS

Updated: 2026-06-01

## 本轮接管结论

Aviso 是一个 Chrome MV3 浏览器扩展，技术栈为 Plasmo、React 18、TypeScript。产品定位是：在网页当前上下文里，通过右键菜单、划词工具栏、命令面板和剪贴板感知触发 AI 操作，并用页面内浮窗展示结果。

当前状态：v0.1.0 收口为 `v0.1 internal dogfood / 内部试用版`。A-G 手动验收用户已验证基本通过，豆包/火山方舟 API 用户确认可用；OpenAI / Anthropic 真实调用尚未验证。本版本用于内部试用，不进入公开发布，不提交商店。

## 本轮读取的来源

- `README.md`
- `STATUS.md`
- `docs/issues/001-project-takeover-baseline.md`
- `docs/EXECUTION_PLAN.md`
- `docs/ACCEPTANCE_CRITERIA.md`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `tests/manual-test.html`
- `tests/unit.test.ts`
- `.github/workflows/submit.yml`
- 关键源码：`src/background/`、`src/contents/`、`src/popup/`、`src/utils/`、`src/types/`

本轮开始时未发现：

- `AGENTS.md`（本轮按会话中提供的 AGENTS 规则执行）
- `CLAUDE.md`
- `RELEASE_CHECKLIST.md`（本轮已新增）

仓库风险：

- 当前目录不是 git 仓库，无法在此目录直接生成正常 git diff、commit、tag 或回滚记录。本轮没有自行初始化 git。

## 本轮完成的 Issue 001 改动

- 重写 `README.md`，替换 Plasmo 脚手架文档，改为 Aviso 的真实产品说明、本地安装/构建/验收、隐私与发布门禁说明。
- 重写 `docs/EXECUTION_PLAN.md`，把 M1-M5 从旧开发计划改为接管基线状态：M1-M4 代码项完成，M5 自动化/手动脚本基线具备，但发布仍未放行。
- 重写 `docs/ACCEPTANCE_CRITERIA.md`，与执行计划统一口径，明确哪些是代码证据、哪些仍需 Chrome 人工验收、真实 provider 验证和商店发布确认。
- 新增 `RELEASE_CHECKLIST.md`，覆盖功能验收、手动 QA 记录、权限/隐私/API Key、构建产物、商店素材、发布与回滚。
- 更新 `.github/workflows/submit.yml`，从 pnpm + Node 16 调整为 npm + Node 20，并在构建/打包前加入 `npm test` 和 `npx tsc --noEmit`。未修改发布密钥字段，未运行发布 workflow。

## 手动验收后的响应速度处理

用户反馈已做手动验收，但 AI 回复等待时间偏久。已先处理最明确的前端等待来源：

- `src/utils/intent.ts`：命令面板无搜索结果时，原来会先请求模型做一次意图解析，再发起真正 AI 请求；现在改为本地轻量解析常见命令，避免一次用户提问变成两轮模型等待。
- `tests/unit.test.ts`：新增本地意图解析测试，覆盖翻译、总结、润色、解释、搜索和导航。

这个改动不涉及新依赖、不改 API Key、不扩大权限、不更换模型。它主要改善命令面板发问的等待时间；右键菜单、划词工具栏、剪贴板触发的模型首 token 延迟仍主要取决于所选模型、网络、输入长度和 provider。

## Issue 002 响应速度优化

本轮继续处理“点击/发送后等很久才看到回答”的体验问题，重点改动如下：

- 确认命令面板已经使用 `src/utils/intent.ts` 的本地解析；同时把后台遗留的 `PARSE_INTENT` 消息也改为本地解析，避免未来误触发额外模型调用。
- 增加 `[Aviso timing]` 轻量日志，按 requestId 标记 trigger、floating shown、AI_REQUEST sent、background received、provider request start、first chunk、done。页面总结额外记录 page content request / ready。
- “总结当前页面”改为先打开浮窗并显示“正在读取页面内容…”，正文抽取完成后再启动 AI 请求，避免右键点击后长时间无反馈。
- 页面正文默认截断从 8000 字符收紧为 5000 字符，降低默认输入长度，优先改善首段等待与整体生成时间。取舍是长文总结更偏向前段内容，后段细节可能需要后续分段能力补足。
- AI 请求前的设置与 API Key 读取改为并行；模板请求复用已读取的 settings，避免重复读取 storage。
- 默认输出上限从 2048 tokens 调整为 1024 tokens；翻译/润色保留 1536 tokens。取舍是普通解释/总结/问答更短更快，特别长的输出可能需要继续追问。
- OpenAI / Anthropic / 豆包流式链路都记录 provider start、first chunk、done；如果 provider 流结束但没有显式 done，也会发送 done chunk，避免浮窗一直 loading。
- 新增单元测试覆盖本地意图解析入口和页面正文截断。

v0.1 结论：前端触发链路已能立即响应，默认模型保持较快的 `gpt-4o-mini`。模型 provider 的首 token 仍可能受所选模型、网络、API Key 状态、provider 负载、输入长度和页面正文复杂度影响；Aviso v0.1 不承诺模型秒回，这一项作为已知限制记录，不再为 v0.1 继续做后端中转或 AI 客户端大改。

## 官方命名同步

用户已确认产品正式改名为 Aviso。本轮已同步对外可见命名：

- `README.md`、`STATUS.md`、`RELEASE_CHECKLIST.md`、`docs/` 和 `tests/manual-test.html` 的产品文案改为 Aviso。
- `package.json` / `package-lock.json` / manifest 的扩展名称与包名保持 Aviso / `aviso`。
- Popup、浮窗、右键根菜单、日志前缀和样式命名保持 Aviso。

说明：代码中仍保留少量 `contextai_*` 内部 storage key、context menu id 和 Shadow DOM host id，用于兼容改名前的本地设置、历史记录和已保存 API Key。它们不是对外品牌文案，发布前无需强制迁移；如未来要彻底改内部命名，应单独做迁移方案，避免丢失用户本地数据。

## 命令面板快捷键调整

本轮先按要求把 Aviso 命令面板官方快捷键统一为 Control/Ctrl + Shift + Space，后续真实测试发现 Mac 上 Control 组合不稳定，因此改回更可靠的 Mac Command + Shift + Space，Windows/Linux 继续使用 Ctrl + Shift + Space：

- Manifest `open-command-palette.suggested_key` 保持 `default: Ctrl+Shift+Space`，Mac 改回 `mac: Command+Shift+Space`。
- 页面内监听按平台处理：Mac 响应 `Command+Shift+Space`，Windows/Linux 响应 `Ctrl+Shift+Space`，并避免 Alt 组合。
- README、执行计划、验收标准、手动验收页、Popup 设置页和品牌参考文案已同步为 Mac `Command+Shift+Space`、Windows/Linux `Ctrl+Shift+Space`。
- 命令面板底部提示去掉单独的 Command 符号，改为“无结果时 Enter 发给 AI”。
- 本轮未修改权限、API Key、内部 `contextai_*` storage key、DOM id、依赖或发布配置。

## 品牌参考入口

已新增 `docs/brand/` 作为 Aviso 品牌和组件视觉参考入口：

- `docs/brand/aviso-components-reference.html`
- `docs/brand/aviso-logo-final.html`
- `docs/brand/assets/aviso-mark-ink.svg`
- `docs/brand/assets/aviso-mark-sage.svg`
- `docs/brand/assets/aviso-mark-white.svg`
- `docs/brand/components/aviso-components.css`
- `docs/brand/components/aviso-ui.js`
- `docs/brand/README.md`

这些文件仅用于设计参考归档，不作为扩展生产代码入口。后续修改 Popup、页面内浮窗、划词工具栏、命令面板、Toast 等样式前，应先查看 `docs/brand/`；实际实现仍需按当前 React / Plasmo 组件结构落地，不要直接把参考 HTML、CSS 或 JS 复制进运行时代码。

## Issue 003 发布前回归整理

时间：2026-05-29 17:16 CST。

命名一致性检查：

- `README.md`、`STATUS.md`、`RELEASE_CHECKLIST.md`、`docs/`、`tests/manual-test.html`、`package.json` 和生产构建 manifest 的对外产品名均为 Aviso。
- 未发现旧品牌名作为对外品牌文案残留。
- `contextai_*` / `contextai-` 仍只作为内部 storage key、context menu id 和 Shadow DOM host id 保留，用于兼容改名前的本地设置、历史记录和已保存 API Key。本轮未迁移这些内部 key。

自动化检查：

- `npm test`：通过，18 项测试全部通过。
  - 备注：Node 输出 `MODULE_TYPELESS_PACKAGE_JSON` 性能警告，提示可通过在 `package.json` 增加 `"type": "module"` 消除；本轮未改 package 类型，避免扩大影响。
- `npx tsc --noEmit`：通过。
- `npm run build`：
  - 默认沙箱内失败：`Operation not permitted`。
  - 沙箱外重跑后通过，Plasmo 构建完成，目标为 `build/chrome-mv3-prod`。

手动验收状态：

- 已补录自动化检查结果到 `RELEASE_CHECKLIST.md`。
- 已按用户反馈把 A-G 手动验收记录为基本通过，作为 v0.1 内部试用通过记录。
- 豆包/火山方舟 API 用户确认可用；本轮未运行真实 API。
- Chrome 版本、操作系统、异常截图或录屏仍未补录，公开发布前需要补齐更严格的验收记录。

## 当前产品基线

已从源码和文档核对到的实现范围：

- 右键菜单：选区操作、页面总结、链接总结菜单、图片解释、模型切换、自定义模板动态菜单。
- 划词工具栏：解释、翻译、润色、总结、发给 AI，并读取开关。
- 命令面板：快捷键唤起、历史/书签搜索、意图路由、历史项原始操作复用，并读取开关。
- 剪贴板感知：普通文本提示，敏感域名/敏感内容过滤，并读取开关。
- 浮窗：流式输出、复制、保存反馈、去重、继续追问。
- Popup：模型、API Key、豆包接入点、功能开关、自定义模板、历史管理、内联隐私说明。
- 单元测试：剪贴板检测、敏感过滤、模板展开、错误归一。

## Issue 004 iframe 触发链路修复

目标：让 Aviso 在 Hugging Face Spaces / Gradio / 普通嵌入 iframe 页面里，也能通过划词工具栏、右键菜单和命令面板打开同一个顶层 UI。

修复点：

- `src/contents/toolbar.tsx` 改为注入 all frames，仅用于 iframe 内选择文字后显示划词工具栏；`floating`、`command`、`clipboard` 仍保持顶层注入，避免重复 UI。
- 新增 `src/contents/frame-bridge.ts`，只在非顶层 frame 监听命令面板快捷键，并转发给 background，由顶层 frame 打开唯一命令面板。
- 新增 `src/background/frame-router.ts`，background 统一优先向顶层 frame 投递 `SHOW_FLOATING_WINDOW` / `OPEN_COMMAND_PALETTE`；如果顶层投递失败，会记录可诊断日志，并按来源 frame 做 fallback。
- `src/background/context-menus.ts` 开始使用 `chrome.contextMenus.OnClickData.frameId` / `frameUrl`：右键触发 AI 时，浮窗显示投递到顶层 frame，页面正文抽取投递到被点击的 frame。
- `src/contents/readability.ts` 改为 all frames，支持 iframe 内“总结当前页面”抽取 iframe 正文。
- `tests/manual-test.html` 新增 G 组 iframe 验收，`tests/iframe-fixture.html` 提供本地 iframe fixture。

验收状态：`npm test`、`npx tsc --noEmit`、`npm run build` 已通过；`npm run build` 在默认沙箱内仍会出现既有的 `Operation not permitted`，沙箱外同命令通过。用户反馈 A-G 手动验收基本通过，iframe 场景进入内部试用；更多真实 Hugging Face Spaces / Gradio 网站样本作为 dogfood 期间继续观察。

## v0.1 已知限制

- 前端响应链路已优化：触发后浮窗应立即出现，并显示“正在读取页面内容…”或“正在连接模型…”等等待状态。
- 模型首 token 仍可能较慢，受模型、网络、API Key、provider 状态、输入长度和页面正文长度影响。
- Aviso v0.1 不承诺模型秒回；当前不接入后端中转、不扩大权限、不新增依赖，也不继续重构 AI 客户端。

## 仍需人工确认

1. OpenAI / Anthropic 真实最小调用尚未验证。必须由用户另行明确批准，并用安全测试 Key 验证。
2. `npm run package` 尚未执行，尚未生成可提交商店的 zip。
3. 商店截图、描述、发布说明、外部隐私政策页面、发布账号和发布密钥仍未确认。
4. 当前目录不是 git 仓库。公开发布前建议先迁入/初始化版本控制，再做 tag、发布记录和回滚方案。
5. 远端链接正文总结仍未实现。当前只透传 URL；如果要抓远端正文，通常需要扩大 `host_permissions`，需产品决策。

## 建议下一步

进入 v0.1 internal dogfood / 内部试用：使用 `build/chrome-mv3-prod` 作为当前内部试用包，小范围安装、记录真实页面问题和 provider 反馈；不公开发布、不提交商店、不扩大权限、不新增功能。

公开发布前仍需关闭这些门禁：OpenAI / Anthropic 真实最小调用、`npm run package`、商店素材、外部隐私政策页面、git/tag/回滚点。

## v0.2 候选问题

1. 远端链接正文总结：是否接受扩大 `host_permissions`，还是继续保持只透传 URL。
2. 任意网页图片解释：若要提升成功率，需要评估浏览器本地截图或转 base64 的方案，而不是继续依赖模型侧下载远端图片。
3. 长文总结：当前 v0.1 默认截断 5000 字符；v0.2 可评估分段总结、继续总结或页面结构化摘取。
4. provider 体验：对 OpenAI / Anthropic / 豆包做真实调用矩阵、错误分类和首 token 延迟记录，再决定是否优化模型默认值或接入方式。
5. 公开发布准备：商店素材、隐私政策、发布说明、版本号、git tag 和回滚流程可作为单独发布工程任务处理。
6. 内部命名迁移：`contextai_*` storage key、context menu id 和 Shadow DOM host id 当前为兼容保留；若公开发布前要彻底更名，需要单独设计迁移，避免丢失本地数据。
