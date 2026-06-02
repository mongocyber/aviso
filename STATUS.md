# Aviso STATUS

Updated: 2026-06-02

## 本轮接管结论

Aviso 是一个 Chrome MV3 浏览器扩展，技术栈为 Plasmo、React 18、TypeScript。产品定位是：在网页当前上下文里，通过右键菜单、划词工具栏、命令面板和剪贴板感知触发 AI 操作，并用页面内浮窗展示结果。

当前状态：v0.1.0 收口为 `v0.1 internal dogfood / 内部试用版`。A-G 手动验收用户已验证基本通过，豆包/火山方舟 API 用户确认可用；OpenAI / Anthropic 真实调用尚未验证。本版本用于内部试用，不进入公开发布，不提交商店。

## Phase 1 内部文档体系

状态：已创建，待用户验收。本文档体系不创建官网、不安装依赖、不配置自动化，作为后续上架、迭代、自动 changelog、release-please 和 Docusaurus 用户文档整理的内部事实源。

本轮新增内部文档：

- `docs/01_PROJECT_CHARTER.md`
- `docs/02_PRD.md`
- `docs/03_TECH_SPEC.md`
- `docs/04_ROADMAP.md`
- `docs/05_RELEASE_PLAN.md`
- `docs/06_RISK_REGISTER.md`
- `docs/07_PRIVACY_AND_SECURITY.md`

同步更新：

- `README.md` 新增项目文档入口，并把当前状态统一为 v0.1 internal dogfood、A-G 基本通过、豆包可用、OpenAI / Anthropic 未验证。
- `docs/EXECUTION_PLAN.md` 和 `docs/ACCEPTANCE_CRITERIA.md` 清理旧验收口径，改为 A-G 内部试用基线。
- 本轮未改源码、未安装依赖、未配置自动化、未运行真实 API、未提交 Git。

## 官网文档站 Vercel 生产部署状态

时间：2026-06-02 CST。

状态：Aviso 官网文档站已通过 GitHub `main` 自动部署到 Vercel，使用 Vercel 默认域名托管。该状态只代表 `website/` Docusaurus 文档站已可访问，且 GitHub main -> Vercel 自动部署链路已启用并成功触发；不代表 Aviso 扩展已公开发布、已提交 Chrome Web Store 或已关闭 v0.1 发布门禁。

生产 URL：

```text
https://aviso-nine.vercel.app/
```

本次 GitHub 自动部署 URL：

```text
https://vercel.com/jonyliu-projects/aviso/7FtsfHC9FMQAGvpzRUo5dWbrg2VH
```

最新线上 commit：

```text
cb801bc9e6a41bdfd6591bf33a162c44d4583fa2
```

相关提交：

- `6258c94 docs: archive landing page design references`：官网首页设计源文件归档。
- `cb801bc docs: refresh website landing page`：官网首页刷新并通过 GitHub `main` 自动部署到 Vercel。

Vercel 项目配置：

- Root Directory：`website`
- Framework：`Docusaurus (v2+)`
- Install Command：`npm ci`
- Build Command：`npm run build`
- Output Directory：`build`
- Node.js：`20.x`

线上页面验证结果：

| 页面 | 状态 |
|------|------|
| `/` | 200 |
| `/docs/intro/` | 200 |
| `/docs/privacy-policy/` | 200 |
| `/docs/install/` | 200 |

当前限制与风险：

- Vercel GitHub 集成已连上，GitHub `main` 自动部署已启用并已成功触发。
- 新版官网首页已部署到生产 URL，但 `aviso-social-card.png` 仍待补齐。
- 隐私政策页面仍为发布前草案，正式公开发布前仍需与 Chrome Web Store 隐私声明、Popup 内隐私说明和最终构建产物再次核对。
- Aviso 仍保持 `v0.1 internal dogfood / 内部试用版` 口径；OpenAI / Anthropic 真实调用、Chrome Web Store 提交、最终 package zip、release tag 和回滚点仍未关闭。

## v0.2-alpha P0 Provider Work

时间：2026-06-02 CST。

当前状态：

- V2-002 / V2-002A：provider host permission 审计和决策文档已完成。
- V2-003：minimal model registry and routing 已实现并提交，默认 `gpt-4o-mini`、`claude*` 路由和豆包 / 火山方舟北京网关行为保持兼容。
- V2-004：Popup API Key 页已新增用户手动触发的单 provider 连接测试入口，background 通过独立 `VALIDATE_PROVIDER_CONNECTIVITY` 消息返回脱敏 validation 摘要。
- 当前生产 zip 包已生成：`build/chrome-mv3-prod.zip`，约 1.1 MB；包内 manifest 已核对为 `Aviso` / `0.1.0`，普通权限未新增，host permissions 仍为 OpenAI / Anthropic / Ark。

V2-004 边界：

- 设置页打开时不会自动测试所有 provider。
- 每次点击只测试当前 provider。
- 测试 payload 只使用固定公开短句，不带网页正文、选中文本、链接、图片、截图或剪贴板内容。
- UI 只展示摘要字段，不展示 raw prompt、raw response、API Key、私人网页内容或截图内容。
- 当前实现不代表 OpenAI / Anthropic 已通过真实验证；公开发布仍只能宣称已完成验证的 provider。

仍未关闭：

- OpenAI / Anthropic / 豆包真实最小调用记录需要用户在安装后的扩展中手动触发并补录脱敏结果。
- 商店素材、最终隐私政策一致性、release tag 和回滚点仍未完成。

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
- Phase 1 文档：`docs/01_PROJECT_CHARTER.md` 到 `docs/07_PRIVACY_AND_SECURITY.md`

历史接管时未发现：

- `AGENTS.md`（本轮按会话中提供的 AGENTS 规则执行）
- `CLAUDE.md`
- `RELEASE_CHECKLIST.md`（本轮已新增）

版本控制状态：

- 当前目录已是本地 Git 仓库。
- v0.1 internal dogfood 基线提交：`3dc7ea3 chore: establish v0.1 internal dogfood baseline`。
- GitHub `origin/main` 已包含新版官网首页部署提交：`cb801bc9e6a41bdfd6591bf33a162c44d4583fa2`。
- 当前没有创建 release tag 或公开发布回滚点；公开发布前仍需单独确认 tag 和回滚方案。

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

1. OpenAI / Anthropic 真实最小调用尚未验证。用户已批准后续 V2-004 只做手动触发、一次一个 provider 的安全测试 Key 验证；当前尚未执行。
2. `npm run package` 尚未执行，尚未生成可提交商店的 zip。
3. 商店截图、描述、发布说明、外部隐私政策页面、发布账号和发布密钥仍未确认。
4. 当前只有本地 Git 基线提交。公开发布前仍需确认 GitHub 远端、release tag、发布记录和回滚方案。
5. 远端链接正文总结仍未实现。当前只透传 URL；如果要抓远端正文，通常需要扩大 `host_permissions`，需产品决策。

## 建议下一步

进入 v0.1 internal dogfood / 内部试用：使用 `build/chrome-mv3-prod` 作为当前内部试用包，小范围安装、记录真实页面问题和 provider 反馈；不公开发布、不提交商店、不扩大权限、不新增功能。

公开发布前仍需关闭这些门禁：OpenAI / Anthropic 真实最小调用、`npm run package`、商店素材、外部隐私政策页面、git/tag/回滚点。

## v0.2-alpha 规划状态

时间：2026-06-02 CST。

用户提供的桌面草案已完成只读评估：

- `/Users/jonyliu/Desktop/Aviso_PRD_v0.2.md`
- `/Users/jonyliu/Desktop/TECH_SPEC_v0.2_delta.md`

结论：桌面草案有价值，但范围过大，且部分技术假设与当前仓库不一致。项目内文档已将其收敛为 `v0.2-alpha internal dogfood` 规划，不直接作为公开发布规格。

已同步更新：

- `docs/02_PRD.md`：新增 v0.2-alpha 目标、范围、非范围、验收标准和待确认问题。
- `docs/03_TECH_SPEC.md`：新增 v0.2-alpha 技术约束，修正桌面 tech draft 中的文件名、消息协议、权限、host permissions 和 storage 假设。
- `docs/04_ROADMAP.md`：新增 V2-001 到 V2-009 issue map、推荐顺序和高权限 discovery backlog。
- `docs/06_RISK_REGISTER.md`：新增 v0.2-alpha 范围、权限、provider 检测、截图、缓存、第三方翻译和 tab/voice 风险。
- `docs/07_PRIVACY_AND_SECURITY.md`：新增 v0.2-alpha 数据流、权限原则和高权限非范围。
- `RELEASE_CHECKLIST.md`：新增 v0.2-alpha 规划门禁。

v0.2-alpha MVP 当前建议：

1. P0：provider validation / permission audit、最小模型注册与路由、手动模型连通性检测。
2. P1：截图发给 AI、复制当前上下文、翻译 MVP。
3. P2：主题与 Aviso 面板命名优化。

暂不进入 v0.2-alpha MVP：

- 远端链接正文抓取。
- Google Translate / 百度 / 有道默认兜底。
- 多 Tab 聚合、Tab 分组、语音输入。
- YouTube 字幕翻译、复杂全页 DOM 翻译。
- `contextai_*` storage key 迁移。

本次只改文档；未改源码、未安装依赖、未运行真实 API、未执行 `npm run package`、未提交 Git。

## V2-002A provider host permission decision docs

时间：2026-06-02 CST。

状态：docs-only 决策记录完成。本轮只记录用户已确认的 provider host permission 产品/权限决策，不改源码、不改 `package.json` / manifest、不运行真实 API、不读取或输出 API Key、不安装依赖、不打包、不发布。

新增记录：

- `docs/decisions/001-v2-provider-host-permissions.md`：记录批准后续新增 `https://api.openai.com/*` 和 `https://api.anthropic.com/*`，并保留豆包 / 火山方舟北京网关 `https://ark.cn-beijing.volces.com/*`。
- `docs/issues/002-v2-provider-host-permission-handoff.md`：给 V2-003 / V2-004 执行 agent 使用，明确 host permission、手动单 provider 连通性测试、脱敏记录和非范围。

当前门禁口径：

- V2-003 可以在实现最小模型注册与路由时，只按上述三个 provider host 边界落 manifest 改动。
- V2-004 只能做用户手动触发、一次一个 provider 的连通性测试；不能在设置页打开时自动测试全部 provider。
- 连通性测试和验证记录不得写入 API Key、raw prompt、raw response、私人网页内容或私密截图。
- 公开发布只宣称已完成验证记录的 provider。
- 远端链接正文抓取、多 Tab、Tab 分组、语音、第三方翻译兜底、YouTube 字幕和复杂全页 DOM 翻译仍不在 v0.2-alpha MVP。

## V2-003 minimal model registry and routing

时间：2026-06-02 CST。

状态：实现完成；未运行真实 provider 调用，未读取或输出 API Key，未提交 Git，未打包或发布。

实现内容：

- 新增 `src/utils/model-registry.ts`，只登记当前三类 provider：OpenAI、Anthropic、豆包 / 火山方舟。
- Registry 暴露 provider id、display name、SDK 类型、host permission、API Key storage key、vision 静态标记、是否需要 endpoint 配置、Ark base URL 和当前模型元数据。
- `src/background/ai-client.ts` 改为通过 registry route 选择 provider/model；默认仍为 `gpt-4o-mini`，`claude*` 仍走 Anthropic，`doubao` 仍走火山方舟 OpenAI-compatible base URL 和用户填写的接入点 ID，未知非 Claude 模型仍按原兼容行为走 OpenAI。
- `package.json` manifest 已新增批准的 `https://api.openai.com/*` 和 `https://api.anthropic.com/*`，并保留 `https://ark.cn-beijing.volces.com/*`；未新增普通 `permissions`。
- API Key 存储未改，仍为 encrypted `chrome.storage.local` 的 `contextai_api_keys`。
- 根 `tsconfig.json` 排除独立 Docusaurus `website/` 子项目，避免扩展类型检查被网站依赖污染；网站仍保留自己的 `website/tsconfig.json`。

自动化检查：

- `npm test`：通过，28 项测试通过；存在既有 Node `MODULE_TYPELESS_PACKAGE_JSON` 性能警告，非阻塞。
- `npx tsc --noEmit`：通过。第一次运行前工作树缺少本地 TypeScript 可执行文件，已按现有依赖执行 `npm install` 后重跑通过；未新增依赖声明。
- `npm run build`：默认沙箱内仍出现既有 `Operation not permitted`；沙箱外重跑通过，`build/chrome-mv3-prod/manifest.json` 核对到普通权限未变，host permissions 精确为 OpenAI、Anthropic、Ark 三条。

剩余门禁：

- OpenAI / Anthropic 真实最小调用仍未验证，继续留给 V2-004 手动单 provider connectivity test。
- 豆包 / 火山方舟仍缺 fresh structured validation record。
- `npm run package`、Chrome Web Store 素材、最终隐私政策、tag 和回滚点仍未完成。
