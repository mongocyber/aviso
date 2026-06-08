# Aviso STATUS

Updated: 2026-06-08

## 本轮接管结论

Aviso 是一个 Chrome MV3 浏览器扩展，技术栈为 Plasmo、React 18、TypeScript。产品定位是：在网页当前上下文里，通过右键菜单、划词工具栏、命令面板和剪贴板感知触发 AI 操作，并用页面内浮窗展示结果。

当前状态：v0.1.0 收口为 `v0.1 internal dogfood / 内部试用版`。A-G 手动验收用户已验证基本通过，豆包/火山方舟 API 用户确认可用；OpenAI / Anthropic 真实调用尚未验证。本版本用于内部试用，不进入公开发布，不提交商店。

2026-06-05 CTO 接管后的最新 scope 决策：v1.0 先做简化 BYOK 基础上线版。登录、订阅、支付、匿名额度、hosted Aviso AI、provider proxy、远端链接正文抓取和联网搜索不进入当前基础版实现、QA 或发布验收；这些不是遗漏项，而是未来状态。`docs/specs/aviso-v1-public-launch.md` 已从旧 default-hosted public launch 草案收敛为基础版 scope 文档。

v1.0 当前执行边界：继续保持 BYOK direct-provider、无项目方后端、无 telemetry、无 storage key 迁移；API Key 仍只保存在 encrypted `chrome.storage.local/contextai_api_keys`，非 secret 设置仍保存在 `chrome.storage.sync/contextai_settings`。截图功能当前暂停对普通用户强化展示，后续需单独决定隐藏、移除或 internal-only；当前商店截图 / promo 图片质量不达最终标准，只能作为占位草案。

2026-06-08：V1-013 UI language localization 已追加为公开发布前需求，当前为 planned requirement / 未实现。目标是默认按 Chrome UI 语言显示中文或英文，并在设置里保留 `自动` / `中文` / `English` override；该设置应作为非 secret 字段继续写入现有 `chrome.storage.sync/contextai_settings`，不新增 storage key。此需求只影响 Aviso UI 文案与 Chrome 原生菜单/manifest 本地化，不改变翻译目标语言、provider 输出、BYOK direct-provider 架构、权限、依赖、backend、hosted AI、provider proxy、telemetry 或 API Key 存储边界。公开给英文用户前，需要完成实现、自动检查、manifest 权限复核和中英文 loaded-extension QA。

2026-06-05：V1 basic hide screenshot entry 已做最小入口收敛。命令面板 quick actions 不再展示截图动作；双击快捷菜单不再展示截图入口；Chrome 右键菜单保留 `截图提问` 作为授权截图路径，不再作为 v1.0 BYOK 基础版商店卖点。底层截图 overlay、本地复制/下载和现有 `image_explain` 安全边界保留不变；未新增 manifest permission、host permission、依赖、backend、hosted AI、登录、额度、订阅、支付、telemetry 或 storage key 迁移。

2026-06-08：截图与右键模型菜单补救已完成代码同步，待 loaded-extension focused QA。截图选区改为透明选区 + 外侧遮罩，不再用浅色填充遮挡选区内容；右键菜单 `截图提问` 去掉内部试用后缀。右键模型 radio 从固定五个模型改为读取已保存的 AI 服务配置，展示配置名和模型/接入点，勾选项跟随 `defaultProviderConfigId`；AI 服务配置、默认服务或本地 Key 变化会重建右键菜单。该调整未新增权限、依赖、provider、backend、hosted AI、provider proxy、telemetry 或 storage key；不改变 API Key 加密存储边界。

2026-06-05：V1 core UI 两个 P1 修复已完成代码同步，自动检查已通过，但 loaded-extension focused manual QA 仍待补录。V1-011 结果面板在打开后不再把新对话误显示为“已保存”；只有历史里原本 pinned/saved 的 conversation 才显示已保存。V1-007 双击快捷菜单会更早抑制划词工具栏，并复用缓存的设置与模板，降低双入口闪出或并存风险。相关自动检查结果：`npm test` 82 项通过，`npx tsc --noEmit` 通过，`git diff --check` 通过；`npm run build` 在默认沙箱内仍是已知 `Operation not permitted`，沙箱外同命令已通过。当前剩余门禁是加载扩展后的 focused manual QA，重点见 `docs/issues/007-v1-core-ui-manual-qa.md`。

2026-06-05：V1 Popup / Command draft update 已按 BYOK 基础版边界落地。Popup 顶部标签收敛为 `设置`、`AI 服务`、`记录`、`指令`：设置页首屏展示 AI 连接状态、默认模型、常用入口开关和紧凑翻译目标下拉；AI 服务页只保留 OpenAI / Anthropic / 豆包 API Key、模型/接入点和手动连接测试；记录页强调对话默认自动保存；模板中文统一为常用指令。命令面板已从 quick action cards / mock access states 降级为搜索式控制面板：默认只搜索历史、书签和已保存 AI 对话，选中文字只作为 Tab 可填入建议，短状态只显示 `AI 可用 · {provider}` 或 `AI 未连接`。本轮未新增 provider route、manifest permission、host permission、依赖、backend、hosted AI、登录、额度、订阅、支付、telemetry 或 storage key 迁移；截图普通用户入口仍隐藏。自动检查结果：`npm test` 84 项通过，`npx tsc --noEmit` 通过，`git diff --check` 通过；`npm run build` 在默认沙箱内仍是已知 `Operation not permitted`，沙箱外同命令已通过。加载扩展后的 Popup / 命令面板 focused manual QA 待补录。

2026-06-05：V1 Popup high-fidelity settings panel 已补做第二轮高还原实现。Popup `设置` 页补齐 Aviso header、Popup-only `浅色 / 深色 / 跟随系统` 主题切换、当前模型卡、模型下拉、常用功能紧凑列表、内联翻译行内语言下拉、本地可用三卡和自动保存页脚；`AI 服务` 页补齐配置说明卡、服务配置标题、添加 provider 下拉、provider 配置卡、状态 pill、测试/保存/取消/删除按钮、配置/测试状态和隐私边界卡；`记录` / `指令` 页补齐草稿式说明卡和列表/卡片结构。新增 `appearanceTheme: "light" | "dark" | "system"` 仅作为非 secret 设置写入现有 `chrome.storage.sync/contextai_settings`，默认 `system`；未新增 storage key，未迁移或读取完整 API Key，未恢复截图普通用户入口，未改命令面板。本轮 loaded-extension Popup 高还原 QA 仍待用户重新加载扩展后补录。

2026-06-05：V1 Popup polish interactions / light theme 补救已完成代码同步。`AI 服务` 页的添加下拉现在会进入对应 provider 编辑状态并定位到卡片；模型下拉里的 `添加 AI 服务` 会进入 AI 服务页并打开明确添加状态；`测试连接` 在缺 Key 或豆包接入点时会先显示未发起的脱敏摘要，不做真实 provider 调用；`保存配置`、`取消编辑`、`删除配置` 均有卡片内反馈，且掩码 Key 不会覆盖真实 Key；豆包接入点改为保存后生效，取消可恢复已保存状态。`本地可用` 三卡改为真实动作或明确反馈：复制当前页上下文、打开命令面板搜索、进入记录恢复。浅色主题补齐 hover、dropdown、input、footer、privacy、scrollbar、warning、danger、disabled 等 token，并在设计草稿中补充 light theme reference。Popup 高度上调一档以减少滚动压力；小屏仍通过内容区滚动。未新增权限、依赖、backend、hosted AI、登录、额度、订阅、支付、telemetry 或 storage key 迁移；loaded-extension focused manual QA 仍待用户重新加载扩展后复看。

2026-06-06：V1 Popup `设置 > 常用功能` 已做追加修正。常用功能行的标题和辅助说明改为上下两行，避免与右侧 toggle / 语言下拉挤在同一行；顺序调整为 `划词工具栏`、`划词翻译`、`命令面板`、`剪贴板提示`、`双击入口`；原 `内联翻译` 用户可见文案改为 `划词翻译`。`划词工具栏` 与 `划词翻译` 在 Popup 设置层互斥：开启其中一个会自动关闭另一个；历史设置若两者都为 true，Popup 加载时会归一化为只开启 `划词翻译` 并写回现有 `contextai_settings`。本轮未新增权限、依赖、provider、storage key、API Key 处理、命令面板或商店素材改动；loaded-extension Popup 常用功能行仍待用户重新加载扩展后复看。

2026-06-06：V1 Popup AI service states / scroll fix 已完成代码同步。Popup 根容器、`html` / `body` / Plasmo root 均固定宽高并隐藏外层滚动，header 与 tabs 保持固定，只有 `#aviso-popup-content` 作为 tab 内容区滚动；浅色/深色滚动条沿用 Popup theme token。`AI 服务` provider 卡片改为明确 `view` / `edit` / `add` 三态：默认 view 收起输入框；配置入口进入 edit/add；保存后收起回 view；取消恢复保存前状态；删除清除对应 `contextai_api_keys` provider 条目并把豆包接入点从现有 `contextai_settings.doubaoModel` 清空。掩码 Key 不会作为新 Key 写回；未保存草稿不会让 provider 提前出现在模型下拉。`划词翻译` 语言下拉用户可见 label 改为目标语言写法：`自动`、`中文`、`English`、`日本語`、`한국어`、`Español`、`Français`、`Deutsch`，不改底层枚举值、翻译 routing 或 prompt。本轮未新增权限、依赖、provider route、backend、hosted AI、登录、额度、订阅、支付、telemetry 或 storage key 迁移；loaded-extension Popup focused QA 仍待用户重新加载扩展后复看。

2026-06-06：V1 Popup scroll follow-up 已做二次代码修复。用户重新预览后确认外层滚动条仍出现在整个 Popup 面板最右侧；本轮将 `html` / `body` / `#__plasmo` / immediate root wrapper / `#aviso-popup-shell` 从固定 660px 文档高度改为 `min(target height, 100vh)` 视口约束，外层全部 `overflow: hidden !important`，并把 `#aviso-popup-content` 强制设为唯一 `overflow-y: auto` 的 flex 内容区。未改 AI 服务状态机、provider、storage、权限、命令面板或商店素材；加载扩展后的滚动 focused QA 仍待用户重新加载构建后复看。

2026-06-06：V1 Popup scroll third pass 已改为 runtime adaptive height。用户再次 reload 后确认二次修复未通过；本轮判断真实根因更可能是固定 popup 请求高度超过 Chrome action popup 实际可用高度，导致 Chrome 给整个 popup document 加外层滚动条。因此移除固定 expanded height，保留 580 safe max，Popup mount 后读取 `window.innerHeight` 并监听 resize，shell 使用 `Math.min(window.innerHeight || safeMax, safeMax)` 的实际高度；`#aviso-popup-content` 仍是唯一业务滚动容器。未改 AI 服务状态机、provider、storage、权限、命令面板、截图、商店素材或发布动作；加载扩展后的滚动 focused QA 仍待用户重新加载构建后复看。

2026-06-06：V1 global appearance theme sync 已完成代码同步。`appearanceTheme: "light" | "dark" | "system"` 仍作为非 secret 设置保存在现有 `chrome.storage.sync/contextai_settings`，但主题解析和 light/dark token 已抽到 `src/styles/aviso.tsx` 共享；Popup、命令面板、结果/回答面板、划词工具栏、内联翻译卡、双击快捷菜单和截图 overlay / toolbar 会读取同一设置并监听 storage 与系统 `prefers-color-scheme` 变化。浅色模式补齐 background、surface、surface2、text、line、accent、hover、focus、warning、danger、disabled、scrollbar、input、card、button、pill 与 shadow token；只作用于 Aviso 自己的容器，不污染宿主网页 `body/html`。本轮未新增权限、依赖、provider、storage key、backend、hosted AI、登录、额度、订阅、支付、telemetry 或 AI 请求 payload 改动；loaded-extension global theme focused QA 仍待用户重新加载构建后复看。

2026-06-06：V1 Popup AI 服务多配置方案 B 已完成代码同步，待加载扩展复看。保持 `contextai_api_keys` / `contextai_settings` storage key 名不变，只扩展 value shape：非 secret `providerConfigs` / `defaultProviderConfigId` 写入 sync settings；每个配置的 API Key 按 `providerConfigId` 加密保存在 local `contextai_api_keys.providerConfigKeys`；旧 `{ openai, anthropic, doubao }` key 继续兼容读取并映射为 legacy 配置。Popup `AI 服务` 页从固定三张 provider 卡改为可添加多个服务配置实例；删除草稿只移除草稿，删除已配置实例会清对应 encrypted key 和 metadata，删除最后一个配置后进入未连接状态。默认服务切换后，设置页当前模型、命令面板连接状态、background AI 请求和手动连通测试会按默认配置解析。未新增权限、依赖、backend、hosted AI、登录、额度、订阅、支付、telemetry 或真实 provider 调用；loaded-extension 多配置/删除 focused QA 仍待用户 reload 后复看。

2026-06-07：T1 v1-pre-qa-hardening 已完成进入 loaded-extension QA 前的 4 个代码收口点。书签搜索日志和返回 meta 不再包含原始 query，仅保留 `hasQuery`、`queryLength`、数量和 source 等脱敏字段；conversation history 的最近 20 条上限只裁剪未保存记录，`pinned` / 保存的 conversation 不会被普通新记录静默淘汰；Popup `划词翻译` 关闭时目标语言下拉会禁用并显示 disabled 视觉状态；双击快捷菜单中不可达的 screenshot action 类型、分支和 operation 映射已删除。自动检查已通过：`npm test` 95 项通过，`npx tsc --noEmit` 通过，`npm run build` 在默认沙箱仍为已知 `Operation not permitted`，沙箱外同命令通过；构建产物 manifest 权限/host_permissions 未扩大。loaded-extension focused manual QA 仍待补录。

2026-06-07：T1D context-menu-selection-title-cap 已完成代码修复。Chrome 右键 selection 子菜单不再使用 `%s` 展示长选区原文，内置选区菜单改为 `解释选中文本`、`翻译选中文本`、`润色选中文本`、`总结选中文本` 静态短标题；点击后仍继续使用 `info.selectionText` 作为 AI 输入。未新增权限、依赖、provider、storage key 或真实 API 调用；仍待 reload 后复测右键菜单标题。

2026-06-07：V1 Popup / AI 服务 focused polish 已完成并通过主线程 loaded-extension 验收。Popup `设置` 页的语言 mini dropdown 已改为按可用空间向下/向上展开，并在打开时解除 `settingList` 裁切，避免菜单被设置卡片边界截断；`AI 服务` 配置卡标题行只保留图标、配置名和操作按钮，`默认`、`新增中`、`编辑中`、`未保存`、`可用`、`建议测试`、`连接失败`、`未配置`、`未测试` 等状态统一进入第二行 pill 区。翻译卡 / 结果面板按钮文案统一为 `发给 AI`；命令面板底部辅助文案已调整到输入区域右侧辅助文字；右键 selection 菜单标题已改为静态短标题，但仍需真实 Chrome 右键 reload 后确认。

2026-06-07：V1 Popup AI 服务卡片 latest polish 已完成并通过隔离临时 Chrome 加载 `build/chrome-mv3-prod` 验收。AI 服务卡的配置名称、API Key、模型/接入点三个输入字段现在由外层带图标的圆角容器显示焦点状态，内部 `input/password` 不再显示独立浏览器焦点框；卡片标题图标/文字与右侧按钮组垂直居中；已保存配置删除改为二次确认，第一次点击只显示 `确定删除` / `取消`，取消可恢复，确认后才删除；新增草稿仍可直接删除。本次验收没有点击最终删除，没有触发真实 provider 测试，没有读取或暴露 API Key。自动检查现状：`npm test` 104/104 通过且仍有既有 Node `MODULE_TYPELESS_PACKAGE_JSON` warning，`npx tsc --noEmit` 通过，`git diff --check` 通过；`npm run build` 默认沙箱内仍为已知 `Operation not permitted`，沙箱外重跑通过；`package.json` / lock 文件无 diff，构建 manifest 权限仍为 `contextMenus`、`activeTab`、`storage`、`bookmarks`、`clipboardWrite`，`host_permissions` 仍只包含 OpenAI、Anthropic、Ark 三个 provider 域名。未新增权限、依赖、provider route、backend、hosted AI、登录、额度、订阅、支付、provider proxy、web search、telemetry 或 storage key 迁移；这不是公开发布批准，Command Palette、double-click、context menu、history 等更大范围回归仍按清单保留 pending/retest。

2026-06-07：AI 可感知响应专项优化已完成代码同步，待 loaded-extension focused QA。结果面板和内联翻译在请求已发出但约 2 秒仍无首段真实内容时，会显示“请求已发出，模型还在响应。可继续等待、停止，或稍后重试。”；真实 provider chunk 到达后仍立即流式显示真实内容，不伪造 AI 输出。内联翻译 debounce 从 260ms 收敛为 180ms，慢提示只写入等待状态，不混入译文；关闭、重试、错误或完成会清理旧请求计时。翻译 payload 继续只保留选区或用户输入，并排除 pageContent、priorContext、pageUrl、linkUrl、srcUrl；有选区时会丢弃命令文本兜底，避免扩大输入。翻译输出预算降为 512 tokens，润色降为 768 tokens，其余保持 1024。未新增权限、依赖、provider、backend、hosted AI、登录、额度、订阅、支付、provider proxy、telemetry 或 storage key 迁移；未运行真实 provider API。本轮只实现 2 秒左右的可见反馈，不代表真实 provider 首 token 稳定在 2 秒内。

2026-06-08：AI 请求前置准备与连接状态体感优化已完成代码同步，待 loaded-extension focused QA。Background service worker 新增内存级 settings / API key / route 短缓存，`contextai_settings` 或 `contextai_api_keys` 变化时会清空缓存；OpenAI / Anthropic / 豆包 OpenAI-compatible SDK client 在 service worker 存活期间复用，但不承诺跨 service worker 休眠或 provider 网络连接永久复用。Provider 连接测试结果按当前 provider config + model 记录为 `上次通过 / 上次失败`，并保留 `testedAt`；Key、model 或 provider 变化会让旧结果失效。正式 AI 调用路径仍直接发起流式请求，不执行连接测试。该调整未新增权限、依赖、backend、hosted AI、登录、额度、订阅、支付、provider proxy、telemetry 或 storage key 迁移；明文 API Key 仍不持久化，只在内存缓存和 SDK client 生命周期内存在；未运行真实 provider API。

2026-06-08：翻译速度二次优化已完成代码同步，待 loaded-extension focused QA。翻译输出 token 上限从固定 512 改为按输入长度动态控制：短文本 128、中等文本 256、长文本 512。划词自动内联翻译 debounce 从 180ms 降为 100ms；内联翻译重试直接发起请求；命令面板输入 `翻译 xxx` 后回车会同步识别并直发 AI，不再被搜索结果或异步意图解析挡住。Background service worker 新增短文本翻译内存缓存：同一页面、同一源文本、同一目标语言在 service worker 存活期内可直接返回缓存译文；缓存 key 只使用页面 / 文本 / 目标语言 hash，不写入 `chrome.storage`，不持久化 raw source text、raw prompt、raw response、完整 URL、API Key 或页面正文；`contextai_settings` 或 `contextai_api_keys` 变化时会随 runtime cache 一起清空。该调整不新增 provider、第三方翻译 fallback、backend、hosted AI、provider proxy、manifest permission、host permission、依赖、telemetry 或 storage key 迁移；未运行真实 provider API。真实 provider 首 token 仍可能受模型、网络、API Key 状态、provider 负载和输入长度影响。

2026-06-08：AI `t_first_chunk` 本地侧优化已完成代码同步，待 loaded-extension focused QA。Provider 前的 payload 现在会按功能压缩上下文：翻译仍只带选区/用户输入；选区解释/润色/自由提问不再携带页面正文，且选区、用户输入、追问上下文都有字符预算；页面总结正文从 5000 字符收敛到 3000 字符，并清理无关 link/src/priorContext。默认 prompt 改为首句优先、短回答导向，减少模型首段前的组织负担。页面总结新增 service worker 内存级截断正文短缓存，并把浮窗显示、页面正文抽取、settings/API key 预热并行执行；普通 SHOW_FLOATING_WINDOW 路径也会提前预热 runtime config。该调整不新增权限、依赖、provider、backend、hosted AI、provider proxy、telemetry、storage key 或真实 provider 调用；页面正文缓存不写入 `chrome.storage`，随 service worker / runtime cache 失效。

2026-06-08：结果面板和内联翻译等待态文案已改为动态轮播，待 loaded-extension focused QA。等待期间会按场景展示“已发送给模型”“模型正在读取选区/待翻译文本/截图内容”“正在读取网页内容”“等待首段返回”等短句，减少静态 loading 体感；真实 provider chunk 到达后仍立即切换为真实内容，动态文案不会写入输出、history、storage 或 provider payload。本轮不新增工具调用、联网搜索、provider、权限、依赖、backend、hosted AI、provider proxy、telemetry 或真实 provider 调用。

2026-06-08：命令面板搜索范围修复已完成代码同步，待 loaded-extension focused QA。命令面板搜索现在同时覆盖 Chrome 浏览历史、Chrome 书签和 Aviso 本地 AI 对话历史；浏览历史和书签结果点击后打开 URL，AI 对话历史仍复用原始操作重新执行。为实现真实浏览历史搜索，manifest 普通权限新增 `history`；该权限只用于本地 `chrome.history.search` 关键词搜索，不接入模型，不发送浏览历史到 provider、Aviso 服务器、telemetry、docs、console 或 `chrome.storage`。命令面板输入框接入模型理解/语义检索暂不进入当前版本，本轮只解决关键词搜索范围不足。

2026-06-08：命令面板浏览历史搜索补充修复已完成代码同步，待 loaded-extension focused QA。Chrome `history.search` 未显式传入 `startTime` 时默认只覆盖最近 24 小时，导致 6 月 6 日等较早浏览记录在 6 月 8 日测试时搜不到；当前实现已改为 `startTime: 0`，按关键词搜索 Chrome 当前 Profile 可访问的本地历史范围。结果标签同步区分为 `浏览历史`、`书签`、`AI 对话`，避免把来源看混。

2026-06-04：V1-006 inline selection translation 已做 P0 实现并通过加载扩展后的人工 UI QA。Popup 常规设置新增默认关闭的 `内联即时翻译` 开关和翻译目标语言选项（自动、中文、英文、日文、韩文、西班牙文、法文、德文）。开启后，普通网页短选区会在选区附近显示内联翻译卡片，支持加载、成功、错误、复制、重试和打开结果面板；长选区 / 多行选区显示结果面板提示，不自动做页面全文翻译。现有右键 / 划词工具栏 / 命令面板翻译继续复用 `operation=translate`，并使用同一目标语言设置。该调整不做替换、不缓存译文、不新增权限、host permission、依赖、provider、third-party translation fallback、hosted AI、backend、登录、额度、订阅、支付、telemetry 或真实 provider 验证；翻译 payload 仍由 `sanitizeTranslationPayload` 兜底，排除 page URL、link URL、page body、remote link body、screenshot、clipboard、full DOM 和 prior context。记录来源：2026-06-04 用户反馈。

2026-06-04：V1-011 result panel conversation autosave 已按最新产品规则调整。结果面板标题从 `Aviso 结果面板` 改为 `Aviso`，保留当前动作标签。结果面板产生的 AI 结果默认自动保存为 `contextai_history` conversation，最多保留最近 20 条，超过后删除最旧 conversation。一个结果面板生命周期对应一条 conversation；只要结果面板仍打开，划词工具栏、双击菜单、命令面板等复用同一 result panel 的新 AI 动作都会追加新的 user / assistant turn 到当前 messages，不再覆盖旧内容；关闭面板后下次调用 AI 才会创建新 conversation。点击“保存”会标记并保存整段 conversation，不再只保存最后一轮问答。底部追问输入框已改为自增高多行输入，Enter 发送、Shift+Enter 换行，超过上限后输入框内部滚动。该调整仍为 local-only，只写 `chrome.storage.local`；不写 sync，不保存 API Key、截图/base64 或 raw provider response；未新增权限、依赖、backend、hosted AI、登录、额度、订阅、支付、telemetry 或真实 provider 调用。

2026-06-04：V1-012 custom template context-menu sync 已做最小修复。Popup 自定义模板新增、编辑、删除后，`chrome.storage.sync/contextai_settings.templates` 的实际变化会触发右键菜单串行重建；仅默认模型变化时仍只同步右键模型 radio 勾选。该调整不改菜单结构、不新增权限、依赖、provider、backend、hosted AI、登录、额度、订阅、支付、telemetry 或 storage secret；API Key 仍只保存在 encrypted `chrome.storage.local/contextai_api_keys`。自动检查已通过，加载扩展后的模板右键菜单即时同步仍需用户人工验收。

2026-06-04：V1-008 BYOK settings cleanup 已做最小 Popup 信息架构调整。Popup 顶部标签从 `API Key` 改为 `AI`，新增 `Aviso AI` 规划中 / 当前版本未上线说明，并把 OpenAI、Anthropic、豆包 / 火山方舟 Key 字段和手动连接测试保留在 `高级：使用自己的 API Key` 区域。默认 AI 模型下拉已接入当前 BYOK 配置状态：未配置 API Key、豆包未配置接入点、或本次手动连接测试明确失败的 provider/model 会显示状态并禁用；已配置但本次 Popup 尚未测试的模型显示 `未测试`，仍允许选择，避免引入自动网络测试或新的持久连通状态。该调整不新增 hosted AI、登录、匿名额度、订阅、支付、backend、provider proxy、manifest 权限、host permission、依赖、storage key 或真实 provider 调用；API Key 仍只保存在 encrypted `chrome.storage.local/contextai_api_keys`，非 secret 设置仍保存在 `chrome.storage.sync/contextai_settings`。已完成重新加载后的人工 UI QA：默认模型下拉显示配置状态，未配置项置灰不可点击。记录来源：2026-06-04 用户反馈。

2026-06-04：V1-005 screenshot local action toolbar 已做最小实现。现有可见区域截图 overlay 在用户选区后显示 compact toolbar：复制图片、下载图片、重选、发送给 AI、取消。复制和下载都是用户点击后的本地动作，不消耗 quota，不要求登录，不调用 provider；下载使用页面内临时 object URL 和浏览器原生下载行为，未新增 `downloads` permission。发送给 AI 继续复用现有 BYOK `image_explain` 安全边界和 unsupported-model 拦截，不接 hosted Aviso AI、不运行真实 provider API。截图/base64 仍不写入 history、`chrome.storage`、docs、console、telemetry 或 release artifacts。

2026-06-04：V1-007 double-click dropdown shortcut 已实现低风险本地 MVP。Popup 常规设置新增 `双击快捷菜单` 开关，默认关闭；开启后在安全网页区域双击会显示 compact dropdown/right-click style menu。菜单复用现有复制当前上下文、页面总结、自定义模板和选区解释 / 翻译 / 润色 / 总结 / 发送给 Aviso 路径；截图入口已在 2026-06-05 基础版入口收敛中从普通双击菜单移除。会避开 input、password、textarea、select、contenteditable、常见代码编辑器和 Aviso 自身 UI；Esc、外部点击、滚动、动作触发和 tab hidden 会关闭。该调整不替换划词工具栏，不新增 hosted AI、backend、auth、quota、payment、manifest 权限、host permission、provider、依赖、storage secret 或真实 provider 调用。

2026-06-04：V1-004 Command Palette mocked states 曾作为 UI-only 预览实现。2026-06-05 基础版草稿落地后，该用户可见 mock / quick action 入口已被搜索式控制面板替代，不再进入基础版普通用户体验。

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

| 页面                    | 状态 |
| ----------------------- | ---- |
| `/`                     | 200  |
| `/docs/intro/`          | 200  |
| `/docs/privacy-policy/` | 200  |
| `/docs/install/`        | 200  |

当前限制与风险：

- Vercel GitHub 集成已连上，GitHub `main` 自动部署已启用并已成功触发。
- 新版官网首页已部署到生产 URL；`website/static/img/aviso-social-card.png` 已补齐，线上仍需等待 GitHub `main` 自动部署后复核。
- 隐私政策页面已在本地按当前 Popup 隐私说明、provider host permissions、v0.2-alpha 数据流和当前构建产物边界更新；正式公开发布前仍需与 Chrome Web Store 隐私声明、商店截图 / 素材和最终 release artifacts 再次核对。线上页面需等待 GitHub `main` 自动部署。
- Aviso 仍保持 `v0.1 internal dogfood / 内部试用版` 口径；OpenAI / Anthropic 真实调用、Chrome Web Store 提交、最终 package zip、release tag 和回滚点仍未关闭。

## v0.2-alpha P0 Provider Work

时间：2026-06-02 CST。

当前状态：

- V2-002 / V2-002A：provider host permission 审计和决策文档已完成。
- V2-003：minimal model registry and routing 已实现并提交，默认 `gpt-4o-mini`、`claude*` 路由和豆包 / 火山方舟北京网关行为保持兼容。
- V2-004：Popup API Key 页已新增用户手动触发的单 provider 连接测试入口，background 通过独立 `VALIDATE_PROVIDER_CONNECTIVITY` 消息返回脱敏 validation 摘要。
- V2-004B：真实浮窗 AI 请求已新增请求级 `[Aviso perf]` 脱敏性能摘要，覆盖 trigger、provider、model/endpoint、输入长度分桶、context type、UI/background/provider start/first chunk/done 阶段耗时和错误分类。该日志只输出到本地 console，不写入 storage，不发送远端 telemetry。
- V2-004C：Follow-up speed guard 已实现。追问只携带最近对话节选并按字符预算裁剪；普通请求和追问等待文案改为“等待模型响应…”；2026-06-07 起，请求已发出后约 2 秒仍未收到首段内容时，结果面板和内联翻译会显示慢响应提示；用户可停止当前等待，浮窗会忽略该 requestId 后续 chunk，并向 background 发送取消信号。
- V2-005：Screenshot to AI internal dogfood MVP 已实现为右键页面菜单“截图提问”：用户手动框选可见区域并确认后才截图，裁剪后的图片复用现有 `image_explain` 浮窗流。未新增 manifest 权限、host permission、provider 或依赖；未运行真实 provider API。
- V2-006：Copy current context internal dogfood MVP 已实现为右键页面菜单“复制当前上下文”：用户手动触发后把页面标题、URL、可选选中文本和可选截断正文整理为 Markdown 文本写入剪贴板。该流程不调用 AI、不调用 provider、不写入 history / `chrome.storage` / 文件 / 文档 / console，未新增权限、host permission、provider 或依赖。
- V2-007：Translation MVP 已实现为现有翻译流体验改进。选区右键、划词工具栏和命令面板本地 intent 继续复用 `operation=translate`、当前 configured provider/model、浮窗 streaming、history、provider routing 和脱敏 `[Aviso perf]` 摘要；翻译 prompt 改为只输出译文，浮窗标题、用户气泡、等待状态和失败提示更明确；右键 page 上下文不再提供空选区“翻译”入口，避免把页面 URL 当作翻译内容。
- V2-008：Theme / Aviso panel polish 已实现为界面一致性收敛。Popup、结果面板、命令面板、划词工具栏、Toast 和截图 overlay 复用 `src/styles/aviso.tsx` 的共享视觉 token；用户可见命名收敛为“划词工具栏 / 结果面板 / 命令面板”；按钮 hover/focus、状态色、错误态、等待态和截图 overlay 质感统一。未新增 manifest 权限、host permission、provider、依赖、storage key、主题设置、真实 API 调用或发布动作。
- 当前隐私一致性更新后生产 zip 包已刷新：`build/chrome-mv3-prod.zip`，约 1.16 MB；包内 manifest 已核对为 `Aviso` / `0.1.0`，普通权限未新增，host permissions 仍为 OpenAI / Anthropic / Ark。
- 2026-06-03：隐私说明一致性已完成一轮本地更新。Popup 隐私说明已避免把项目方数据收集与用户主动 provider 请求混写，改为明确 Aviso 无项目方服务器、不收集或保存用户数据；用户主动发起 AI 请求时浏览器直连所选模型厂商。官网隐私政策已同步当前 provider host permissions、翻译 / 截图提问 / 复制上下文 / 连接测试 / 本地性能摘要边界。Chrome Web Store 隐私声明草案已准备，后台最终声明仍未提交，公开发布门禁未关闭。
- 2026-06-03：Chrome Web Store 提交资料草案已准备到 `docs/store/chrome-web-store-submission-draft.md`，覆盖商店短描述 / 长描述、单一用途、权限说明、远程代码声明、数据使用披露、Limited Use 草案、截图计划和发布说明。该草案不代表已经提交商店；后台最终隐私声明、截图素材、OpenAI / Anthropic 原生验证、真实 vision provider 验证、release tag 和回滚点仍未关闭。

V2-004 边界：

- 设置页打开时不会自动测试所有 provider。
- 每次点击只测试当前 provider。
- 测试 payload 只使用固定公开短句，不带网页正文、选中文本、链接、图片、截图或剪贴板内容。
- UI 只展示摘要字段，不展示 raw prompt、raw response、API Key、私人网页内容或截图内容。
- 当前实现不代表 OpenAI / Anthropic 已通过真实验证；公开发布仍只能宣称已完成验证的 provider。

V2-004B 边界：

- `[Aviso perf]` 每次普通浮窗 AI 请求最多输出一条请求级摘要。
- `input_size_bucket` 只记录 `0-500`、`501-2000`、`2001-5000`、`5001+` 分桶，不记录原文、页面正文、选中文本、完整 URL、图片 base64 或 response。
- `context_type` 区分 `selection`、`page_summary`、`image_explain`、`command`、`follow_up`、`unknown`。
- 该性能基线不改变默认 provider、模型、token 上限、API Key 存储位置、`contextai_*` storage key 或 manifest 权限。
- V2-004 手动连接测试摘要保持原结构；本轮未运行真实 provider API。

V2-004C 边界：

- Follow-up 上下文预算在浮窗侧执行：最多带最近 4 条非空消息，用户片段最多 600 字符、助手片段最多 1200 字符、上下文主体最多 3000 字符，并标记已截断内容。
- 追问 payload 使用 `priorContext` 字段传递预算后的近期对话节选，不再把完整长历史无限拼入 `selectionText`。
- 慢响应提示只在当前 requestId 仍处于 loading 且尚无首段助手内容时出现；提示不记录 raw prompt、raw response、页面正文、选中文本、完整 URL、图片/base64 或 API Key。
- 停止等待会让浮窗立即停止 loading，并忽略同一 requestId 后续 chunk / error；background 会对仍在进行的 provider 请求发送 abort signal。
- `[Aviso perf]` 可将用户停止归类为 `user_cancelled`，仍只输出固定脱敏字段，不写入 storage，不发送远端 telemetry。
- 本轮未新增 manifest permission、host permission、provider、依赖、API Key 存储位置、默认 provider、默认模型或 `contextai_*` storage key；未运行真实 provider API。
- 已完成重新加载后的人工 UI QA：追问、慢响应提示和停止等待主路径用户反馈通过。记录来源：2026-06-02 用户反馈。

V2-005 边界：

- 入口仅为用户手动触发的右键页面菜单“截图提问”；未确认选区不会调用 `captureVisibleTab`，取消不会调用 provider。
- 截图只在内存中用于裁剪和本次 `image_explain` 请求；不写入 `chrome.storage`、history input、文件、文档、console 或 release artifact。
- 发送给 provider 的 screenshot payload 不附带完整页面 URL；浮窗用户气泡只显示“截图区域”，不展示 base64。
- `screenshot` perf/timing 只记录阶段和图片大小/区域分桶，不记录 raw image、base64、页面正文、选中文本、raw prompt、raw response 或 API Key。
- 豆包 / 火山方舟截图理解按 model-dependent 处理：当前接入点未验证 vision 时会在发送 provider 前拦截并提示切换已确认支持视觉输入的模型。
- 已完成一轮重新加载后的手动 UI QA：取消流程正常，确认流程正常，豆包 / 火山方舟未验证 vision endpoint 被拦截并显示可读错误，Service Worker Console 可见 `[Aviso perf]` 摘要入口。记录来源：2026-06-02 用户本地截图测试反馈。
- 该 QA 不包含真实 OpenAI / Anthropic vision provider 验证；不代表 Chrome Web Store 公开发布能力已关闭验收。

V2-006 边界：

- 入口仅为用户手动触发的右键页面菜单“复制当前上下文”，在页面或选中文本右键场景可用。
- 复制内容包含标题、URL、选中文本（如有）和页面正文；页面正文复用现有 `EXTRACT_PAGE_CONTENT`，并按当前 5000 字符默认边界截断。
- 剪贴板写入由 content script 在当前页面执行，使用既有 `clipboardWrite` 能力；失败时显示可读 toast。
- 复制内容只写入用户剪贴板；不会进入 AI 请求、provider、history、`chrome.storage`、文件、文档、console、性能摘要或远端 telemetry。
- 已完成重新加载后的人工 UI QA：右键复制当前上下文 internal dogfood 主路径用户反馈通过。记录来源：2026-06-02 用户反馈。

V2-007 边界：

- 入口限定为选区翻译和用户输入翻译：右键选区“翻译”、划词工具栏“翻译”、命令面板“翻译 xxx”。
- 翻译仍调用当前 configured provider/model，不新增 provider、host permission、manifest permission、依赖、远端服务或第三方免费翻译 fallback。
- 翻译 prompt 要求自动中英互译、只输出译文、保持原意/语气/格式，不添加解释、标题、候选译法或额外说明。
- translate payload 只使用 `selectionText` 或命令面板解析后的 `userMessage`；不会把页面 URL、链接 URL 或页面正文作为待翻译文本混入。
- 空翻译输入会在 provider 前拦截并显示可读错误，不运行真实 provider API。
- `[Aviso perf]` 仍只输出脱敏字段和输入长度分桶；不记录 raw prompt、raw response、页面正文、选中文本、完整 URL、图片/base64、截图或 API Key。
- 已完成重新加载后的人工 UI QA：右键选区“翻译”、划词工具栏“翻译”和命令面板“翻译 hello”三条主路径用户反馈通过。记录来源：2026-06-03 用户反馈。

V2-008 边界：

- 本轮只做 UI polish 和文案收敛，不新增功能入口、不改变快捷键、不改变 AI 请求 payload、provider routing、默认模型、token 上限、API Key 存储或 `contextai_*` storage key。
- Popup、结果面板、命令面板、划词工具栏、Toast 和截图 overlay 的圆角、边框、阴影、hover/focus、强调色、危险态和等待态复用 Aviso theme token。
- 截图 overlay 仍是用户手动拖选并确认后才截图；取消 / Esc 不调用 `captureVisibleTab` 或 provider。
- V2-004B `[Aviso perf]`、V2-004C 追问速度保护、V2-005 截图提问、V2-006 复制当前上下文、V2-007 翻译 MVP 的行为边界保持不变。
- 已完成重新加载后的人工 UI QA：Popup、结果面板、命令面板、划词工具栏、Toast、截图取消 / 确认、复制当前上下文、追问 / 停止等待主路径用户反馈通过。记录来源：2026-06-03 用户反馈。
- 该 polish 不代表公开发布门禁关闭；OpenAI / Anthropic 原生验证、真实 vision provider 验证、商店素材、隐私政策最终一致性、release tag 和回滚点仍未关闭。

V1-005 screenshot local action toolbar 边界：

- 本轮复用现有 V2-005 可见区域 overlay，不新增单独截图 popup、不做 full-page scrolling capture、不新增 prompt field。
- Copy image / Download image / Retry / Cancel 都是本地 UI 动作；Copy image 写入用户剪贴板，Download image 使用临时 object URL 触发浏览器下载，均不调用 provider、不消耗 quota、不要求 login。
- Download image 未使用 `chrome.downloads` API，未新增 `downloads` permission、manifest permission、host permission、依赖、storage key、telemetry、cache、package、tag、release action 或真实 provider API 调用。
- Send to AI 只保留现有 `image_explain` 路径：当前 configured BYOK provider/model、现有 vision support gate、浮窗错误态和脱敏 `[Aviso perf]` 摘要；未接 hosted Aviso AI、backend、quota、login、subscription 或 provider proxy。
- 截图/base64 只在用户点击动作后的当前内存流程中临时存在；不写入 history、`chrome.storage`、文件、docs、console、telemetry 或 release artifacts。用户主动下载图片会由浏览器把图片保存到用户选择/默认下载位置，这是该本地动作的预期结果。
- 该实现不代表真实 vision provider 验证完成，也不关闭 Chrome Web Store 公开发布门禁。

已补录的 V2-004 脱敏验证结果：

- 豆包 / 火山方舟：通过。`provider=doubao`，`model_or_endpoint=doubao-seed-2-0-lite-260428`，`host_permission_present=true`，`result=success`，`latency_note=约 2505 ms`，`error_category=none`，`secret_leak_check=pass`，`raw_prompt_logged=no`，`raw_response_logged=no`，`private_page_data_logged=no`。记录来源为用户在已加载扩展的 Popup 手动点击单 provider 测试。

仍未关闭：

- OpenAI / Anthropic 真实最小调用记录仍未完成；用户当前没有原生 OpenAI / Anthropic API Key，OpenRouter Key 不作为这两条原生 provider 的验证依据。
- 三张 1280x800 商店截图草案、440x280 small promo tile、可选 1400x560 marquee promo tile 和 social card 本地素材已补齐，但 2026-06-05 已判定为占位草案，不可作为最终商店素材。后续需要按 BYOK 基础版、弱化/隐藏截图入口、无登录订阅/hosted AI 口径重做；Chrome Web Store 后台最终隐私声明、最终素材采用确认、最终 release artifact 一致性、release tag 和回滚点仍未完成。
- 2026-06-04 V1-006 / 最新 package 后已完成当前源码和 `build/chrome-mv3-prod.zip` 的常见真实 API Key 形态扫描，未命中；Git 历史扫描此前 2026-06-03 通过。后续商店截图、商店素材和最终 release artifacts 生成后仍需再次检查。

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

- 前端响应链路已优化：触发后浮窗应立即出现，并显示“正在读取页面内容…”或“等待模型响应…”等等待状态。
- 模型首 token 仍可能较慢，受模型、网络、API Key、provider 状态、输入长度和页面正文长度影响。
- 追问已增加上下文预算、慢响应提示和停止等待能力；停止后 UI 会忽略后续 chunk。Provider 是否能立即中断仍取决于 SDK / 网络层对 abort signal 的响应。
- Aviso v0.1 不承诺模型秒回；当前不接入后端中转、不扩大权限、不新增依赖，也不继续重构 AI 客户端。

## 仍需人工确认

1. OpenAI / Anthropic 真实最小调用尚未验证。用户已批准后续 V2-004 只做手动触发、一次一个 provider 的安全测试 Key 验证；当前尚未执行。
2. 当前 `npm run package` 已通过并生成 `build/chrome-mv3-prod.zip`；公开提交前仍需在最终变更后重跑 package，并确认版本、manifest 和 release artifact。
3. 商店截图草案、small promo tile、可选 marquee tile、描述和发布说明草案已本地准备，但图片素材当前只算占位草案，不可作为最终商店素材；需要按 BYOK 基础版重新设计并由用户确认后，才能进入 Chrome Web Store 后台填报。
4. 当前只有本地 Git 基线提交。公开发布前仍需确认 GitHub 远端、release tag、发布记录和回滚方案。
5. 远端链接正文总结仍未实现。2026-06-04 用户确认该需求先不做；当前继续只透传 URL，不抓远端正文，不扩大 `host_permissions`，不接后端抓取。

2026-06-04 用户决策更新：V1-006 内联即时翻译卡片后续实现时必须提供明确开关和翻译目标语言选项；在这两个控制项落地前，不把“选中文字后自动原地翻译”视为完成。远端链接正文总结先不做，继续保持当前只透传 URL / 不抓远端正文 / 不扩大权限的边界。

2026-06-05 用户决策更新：v1.0 基础版移出登录、订阅、支付、匿名额度和 hosted Aviso AI；截图功能先暂停普通用户展示，不继续强化为商店卖点；当前商店截图 / promo 图片判定为占位草案，需要重做；远端链接正文总结和联网搜索继续不做。

## 建议下一步

进入 v0.1 internal dogfood / 内部试用：使用 `build/chrome-mv3-prod` 作为当前内部试用包，小范围安装、记录真实页面问题和 provider 反馈；不公开发布、不提交商店、不扩大权限、不新增功能。

公开发布前仍需关闭这些门禁：OpenAI / Anthropic 真实最小调用、最终 package 复跑与 artifact 核对、商店素材最终确认、外部隐私政策页面最终一致性、git/tag/回滚点。

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
