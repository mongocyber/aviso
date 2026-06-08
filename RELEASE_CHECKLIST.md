# Aviso Release Checklist

> 发布或提交商店前必须逐项记录。本清单不代表当前已经满足公开发布条件。

版本：`0.1.0`

负责人：

日期：2026-06-05

当前收口状态：`v0.1 internal dogfood / 内部试用版`

发布结论：A-G 手动验收用户已验证基本通过，豆包/火山方舟 API 用户确认可用；OpenAI / Anthropic 真实调用尚未验证。本版本仅用于内部试用，不进入公开发布，不提交商店。

2026-06-05 scope 更新：v1.0 先按 BYOK 基础上线版收敛。登录、订阅、支付、匿名额度、hosted Aviso AI、provider proxy、远端链接正文抓取和联网搜索不进入当前基础版验收；截图功能暂停普通用户展示决策，不作为商店卖点；当前商店截图 / promo 图片仅为占位草案，不可作为最终素材。

## 1. 功能验收

- [x] 右键菜单：选区、链接、页面、图片、可编辑区域的菜单项符合预期。用户手动验收基本通过。
- [x] 划词工具栏：解释、翻译、润色、总结、发给 AI 均能触发浮窗。用户手动验收基本通过。
- [x] 命令面板：快捷键、搜索历史、搜索书签、无结果发问、历史项复用均正常。用户手动验收基本通过。
- [x] 剪贴板感知：普通文本提示，敏感内容和敏感域名不提示。用户手动验收基本通过。
- [x] 自定义模板：新增、编辑、删除、右键同步、占位符展开均正常。用户手动验收基本通过。
- [x] 浮窗与历史：流式输出、复制、保存去重、继续追问、历史管理均正常。用户手动验收基本通过。
- [x] iframe 场景：iframe 内划词、右键触发、命令面板快捷键、剪贴板提示和单实例 UI 基本通过。
- [x] V2-006 复制当前上下文：右键页面菜单手动触发，把标题、URL、可选选中文本和截断正文复制到剪贴板；不调用 AI。自动化覆盖已补齐，安装后人工 dogfood 用户反馈通过。
- [x] V2-007 翻译 MVP：选区右键、划词工具栏和命令面板输入继续使用现有 `operation=translate` 浮窗流；翻译 prompt、标题、用户气泡、等待状态和失败提示已明确为翻译；右键 page 上下文不再提供空选区翻译入口。
- [x] V2-008 theme / Aviso panel polish：Popup、结果面板、命令面板、划词工具栏、Toast 和截图 overlay 的视觉 token、按钮状态、错误态、等待态和面板命名已收敛；不新增功能、权限、provider、依赖或 storage key。
- [x] V1-004 Command Palette search panel：2026-06-05 基础版草稿落地后，命令面板用户可见体验已从 quick action cards / mock access states 降级为搜索式控制面板；默认搜索历史、书签和已保存 AI 对话，选中文字只作为 Tab 可填入建议，短状态只显示 AI 可用或未连接。旧 quota / login / subscription mock 状态不进入基础版验收，也不代表 hosted Aviso AI、匿名额度、登录、订阅、支付、backend 或 provider proxy 已实现。
- [x] V1 Popup high-fidelity settings panel：Popup 标签收敛为 `设置`、`AI 服务`、`记录`、`指令`；设置页展示 Aviso header、`浅色 / 深色 / 跟随系统` 主题切换、当前模型卡、模型下拉、常用功能紧凑列表、内联翻译行内语言下拉、本地可用三卡和自动保存页脚；AI 服务页只保留 API Key、模型/接入点和手动测试，并补齐配置说明、添加 provider 下拉、provider 配置卡、状态 pill、测试/保存/取消/删除、配置/测试状态和隐私边界；记录页强调默认自动保存；模板中文改为常用指令。2026-06-05 补救后，添加 provider / 模型下拉添加入口会进入明确编辑状态，测试/保存/取消/删除均有反馈，缺 Key / 豆包接入点时不会发起真实 provider 调用而是显示未发起摘要，本地可用三卡改为真实动作或明确提示。2026-06-06 全局主题同步代码完成后，`appearanceTheme` 会驱动 Popup、命令面板、结果面板、划词工具栏、内联翻译卡、双击菜单和截图 overlay / toolbar；浅色主题 token 已覆盖 hover、dropdown、input、footer、privacy、scrollbar、warning、danger、disabled、panel、button、border 等状态。新增主题设置仍仅写入现有非 secret `contextai_settings.appearanceTheme`，不新增 storage key。
- [x] V1 Popup AI service states / scroll fix：2026-06-06 代码修复后，Popup 外层/root/body 固定高度并隐藏外层滚动，header + tabs 固定，只有 tab 内容区滚动；`AI 服务` provider 卡片明确区分 view / edit / add，默认 view 收起输入框，新增/编辑才展开输入框，保存后收起，取消恢复保存前状态，删除清除对应本地加密 Key 和豆包非 secret 接入点配置；掩码 Key 不会覆盖真实 Key，未保存草稿不会提前进入模型下拉。`划词翻译` 语言显示已改为目标语言 label（`English`、`日本語`、`한국어`、`Español`、`Français`、`Deutsch` 等），底层设置值和翻译路由不变。该项代码检查已通过，加载扩展后的 focused manual QA 仍待补录。
- [x] V1-006 内联即时翻译 P0：Popup 新增默认关闭的开关和翻译目标语言选项；开启后短选区显示内联翻译卡片，支持复制、重试和打开结果面板；长选区 / 多行选区提示进入结果面板。不做替换、全文翻译、第三方翻译 fallback、缓存或新权限。
- [x] V1-007 双击快捷菜单 MVP：Popup 常规设置新增默认关闭的 `双击快捷菜单` 开关；开启后在安全网页区域双击显示 compact dropdown，复用现有复制当前上下文、页面总结、自定义模板和选区 AI 动作路径；避开输入框、可编辑区、常见代码编辑器和 Aviso 自身 UI；不替换划词工具栏。2026-06-05 起，截图入口已从普通双击菜单移除；本轮 P1 修复后会更早抑制划词工具栏，并优先复用缓存设置/模板，减少双入口闪出或并存。
- [x] V1-008 BYOK settings cleanup：Popup 设置页将原 `API Key` 标签调整为 `AI`，把 Aviso AI 标为规划中 / 当前版本未上线，并把现有 provider Key 字段和手动连接测试保留在“高级：使用自己的 API Key”区域；默认模型下拉显示未配置 / 未测试 / 已连接 / 连接失败状态，并禁用未配置或已知连接失败的选项。该项不代表 hosted Aviso AI、匿名额度、登录、订阅、支付或 backend 已实现。
- [x] V1-005 screenshot local action toolbar：截图选区后显示复制图片、下载图片、重选、发送给 AI、取消。复制/下载为 local-only，不调用 provider、不消耗 quota、不要求 login；下载未新增 `downloads` permission。发送给 AI 继续复用现有 BYOK `image_explain` 和 unsupported-model 边界，不接 hosted AI。2026-06-05 起，命令面板和双击快捷菜单已不再展示截图入口；右键菜单保留 `截图提问` 作为授权截图路径，不作为基础版商店卖点。
- [x] V1-011 conversation autosave：结果面板标题只显示 `Aviso` 并保留动作标签；AI 结果默认自动保存为 `chrome.storage.local/contextai_history` conversation，最多保留最近 20 条；结果面板 visible 时新的划词工具栏 / 双击菜单 / 命令面板 AI 动作会追加到当前 conversation；点击“保存”保存整段 conversation；底部追问输入框支持多行自增高、Enter 发送、Shift+Enter 换行。本轮 P1 修复后，新结果打开面板时不再误显示为“已保存”；只有历史里本来 pinned/saved 的 conversation 才显示已保存。
- [x] T1 v1-pre-qa-hardening：书签搜索日志和 meta 已脱敏为 query length / hasQuery / counts / source；保存或 pinned conversation 不再被普通最近 20 条上限静默淘汰，普通未保存记录仍只保留最近 20 条；`划词翻译` 关闭时目标语言下拉禁用；双击快捷菜单残留的 screenshot action 死代码已移除。
- [x] V1-012 自定义模板右键菜单同步：Popup 模板新增、编辑、删除后，模板设置变化会触发 Chrome 原生右键菜单串行重建；仅默认模型变化时仍只同步模型 radio 勾选。未新增权限、依赖、provider、backend 或 storage secret。
- [ ] V1-013 UI language localization：默认按 Chrome UI 语言显示中文或英文，并在设置里保留 `自动` / `中文` / `English` override；需覆盖 Popup、命令面板、结果面板、划词工具栏、内联翻译卡、双击菜单、原生右键菜单、Toast/error 和必要 manifest 文案。该需求尚未实现，公开给英文用户前必须补实现和 loaded-extension QA。

## 2. 手动 QA 记录

构建路径：

```text
build/chrome-mv3-prod
```

测试页面：

```text
tests/manual-test.html
```

| 清单                                             | 结果     | 记录                                                                                |
| ------------------------------------------------ | -------- | ----------------------------------------------------------------------------------- |
| A · 右键菜单                                     | 基本通过 | 用户反馈已验证基本通过；作为内部试用通过记录。                                      |
| B · 划词工具栏                                   | 基本通过 | 用户反馈已验证基本通过；作为内部试用通过记录。                                      |
| C · 命令面板                                     | 基本通过 | 用户反馈已验证基本通过；作为内部试用通过记录。                                      |
| D · 剪贴板感知                                   | 基本通过 | 用户反馈已验证基本通过；作为内部试用通过记录。                                      |
| E · 自定义模板                                   | 基本通过 | 用户反馈已验证基本通过；作为内部试用通过记录。                                      |
| F · 浮窗与历史                                   | 基本通过 | 用户反馈已验证基本通过；作为内部试用通过记录。                                      |
| G · iframe / Hugging Face Spaces / Gradio 嵌入页 | 基本通过 | 用户反馈已验证基本通过；覆盖 iframe 内划词、右键、命令面板、剪贴板提示和单实例 UI。 |
| V2-004C · 追问速度保护                           | 通过     | 用户反馈已验收；覆盖追问上下文预算、慢响应提示和停止等待。                          |
| V2-006 · 复制当前上下文                          | 通过     | 用户反馈已验收；覆盖右键复制当前上下文 internal dogfood 主路径。                    |
| V2-007 · 翻译 MVP                                 | 通过     | 用户反馈已验收；覆盖右键选区“翻译”、划词工具栏“翻译”和命令面板“翻译 hello”。       |
| T1D · 右键选区菜单标题长度                         | 已修复待人工 QA | 代码已改为静态短标题：解释/翻译/润色/总结选中文本；仍需真实 Chrome 右键 reload 后确认菜单不再展示长选区原文。 |
| V2-008 · 界面 polish                              | 通过     | 用户反馈已验收；覆盖 Popup、结果面板、命令面板、划词工具栏、Toast、截图取消 / 确认、复制当前上下文、追问 / 停止等待。 |
| V1-005 · 截图本地动作工具栏                       | 暂停普通用户验收 | 代码已实现但当前不作为基础版普通用户入口；后续先决定隐藏 / 移除 / internal-only，再决定是否补录 internal QA。 |
| V1-006 · 内联即时翻译 P0                          | 通过     | 用户反馈已验收；覆盖开关、目标语言、短选区内联卡片、复制、重试、打开结果面板和长选区提示。 |
| V1-007 · 双击快捷菜单 MVP                         | 已修复待人工 QA | 需加载构建后开启设置，验证安全区域双击、输入/编辑/代码区域不触发、选区动作、复制上下文、页面总结、自定义模板和关闭行为；重点确认双击时划词工具栏被提前抑制，不再闪出或并存，并确认不再出现截图入口。 |
| V1-008 · 默认模型下拉配置状态                      | 通过     | 用户反馈已验收；默认模型下拉显示配置状态，未配置项置灰不可点击。已配置未测试项仍显示 `未测试`。 |
| V1 Popup high-fidelity settings panel              | 已补救待人工 QA | 需加载构建后验证四个 tab、全局主题切换、当前模型卡、模型下拉、添加 AI 服务入口、AI 服务配置卡 view/edit/add 三态、测试/保存/取消/删除反馈、外层无滚动条且仅内容区滚动、划词翻译语言 label、本地可用三卡、记录/指令卡片、隐私说明，以及无登录/订阅/支付/hosted AI 入口。 |
| V1 Popup focused settings polish                    | 通过     | 2026-06-07 主线程 loaded-extension focused QA 通过：语言 mini dropdown 不再被 `settingList overflow: hidden` 裁切并可向下/向上展开；AI 服务卡状态统一到第二行 pill；翻译卡/结果面板按钮文案统一为 `发给 AI`；命令面板辅助文案位置已调整。 |
| V1 Popup AI 服务卡片 latest polish                  | 通过     | 2026-06-07 隔离临时 Chrome 加载 `build/chrome-mv3-prod` 验收通过：输入焦点落在外层圆角容器，标题与按钮垂直居中，已保存配置删除进入 `确定删除` / `取消` 二次确认；未点击最终删除，未触发真实 provider 测试。 |
| T1 v1-pre-qa-hardening                             | 代码通过待人工 QA | 自动检查已通过；加载扩展后需重点复看 `划词翻译` 关闭时语言下拉 disabled、双击菜单无截图入口、保存历史不会因普通最近 20 条淘汰而丢失。 |
| V1-011 · Conversation 自动保存                     | 已修复待人工 QA | 需加载构建后验证两轮以上对话自动保存、点击保存后历史恢复完整多轮、超过 20 条删除最旧 conversation、追问输入框多行自增高；重点确认新对话打开结果面板时不会误显示为已保存。 |
| V1-012 · 自定义模板右键菜单同步                    | 待人工 QA | 需加载构建后验证模板新增、编辑、删除后无需重装扩展，选中文字右键菜单即时出现、更新、移除对应模板。 |
| V1-013 · UI language localization                  | 未实现 | 需实现后分别验证 `自动`、`中文`、`English`：中文 Chrome 默认中文，英文 Chrome 默认 English，手动 override 立即影响 Popup、命令面板、结果面板、页面内卡片、Toast/error 和原生右键菜单；翻译目标语言设置保持独立。 |

Chrome 版本：用户未补录

操作系统：用户未补录

验收时间：2026-06-01 / 2026-06-02 / 2026-06-03 用户反馈

A-G 是否全部通过：基本通过，进入 v0.1 内部试用

Aviso 命名可见项：用户未补录逐项截图；当前按 A-G 基本通过记录

AI 回复速度反馈：豆包/火山方舟 API 用户确认可用；V2-004C 追问速度保护用户已验收；provider 首 token 仍按已知限制记录

异常截图或录屏：用户未补录

结论：v0.1 收口为 internal dogfood / 内部试用版；不进入公开发布，不提交商店。

## 3. 权限、隐私与 API Key

- [x] `manifest.permissions` 只包含实际使用的权限。2026-06-08 命令面板浏览历史搜索新增普通权限 `history`，用途仅为本地 `chrome.history.search`；其余普通权限仍为 `contextMenus`、`activeTab`、`storage`、`bookmarks`、`clipboardWrite`。
- [x] `host_permissions` 没有为链接正文抓取扩大到广域权限；仅包含 OpenAI、Anthropic 和 Ark Beijing 三个已批准 provider host。
- [x] OpenAI / Anthropic provider host permission 产品决策已记录，且 V2-003 已落到 `package.json` manifest。
- [x] Popup 隐私说明与实际实现一致。2026-06-03 已修正为：Aviso 无项目方服务器、不收集或保存用户数据；用户主动发起 AI 请求时由浏览器直连所选模型厂商；历史记录与设置保存在浏览器本地。
- [x] 商店隐私文案草案与 Popup 隐私说明一致。2026-06-03 已记录到 `docs/store/chrome-web-store-submission-draft.md`，并补充内容脚本站点访问、provider host permissions 和 Chrome Web Store Limited Use 说明。
- [ ] Chrome Web Store 后台最终隐私声明与 Popup、官网隐私政策、最终 manifest、商店截图 / 素材一致，并由用户确认。
- [x] 当前源码和 `build/chrome-mv3-prod.zip` 未命中常见真实 API Key 形态。2026-06-04 V1-006 / 最新 package 后已重新扫描当前源码和 zip；Git 历史扫描此前 2026-06-03 通过。后续商店截图、商店素材和最终 release artifacts 生成后仍需再次检查。
- [x] Provider 连接测试入口为用户手动触发、一次只测单 provider，并返回脱敏摘要；不会在设置页打开时自动测试全部 provider。
- [x] V2-004B `[Aviso perf]` 性能摘要只输出到本地 console，不写入 `chrome.storage`，不发送远端 telemetry，不包含 raw prompt、raw response、页面正文、选中文本、完整 URL、图片/base64 或 API Key。
- [x] V2-004C / 2026-06-07 可感知响应保护已实现：追问只携带预算后的近期对话节选；结果面板和内联翻译约 2 秒无首段真实内容时显示慢响应提示；慢响应提示和停止等待不记录 raw 内容；取消分类仅输出 `user_cancelled` 等脱敏类别。
- [x] 2026-06-08 AI 请求前置准备与连接状态体感优化已实现：service worker 内存级 settings / API key / route 短缓存会在 `contextai_settings` 或 `contextai_api_keys` 变化时失效；provider SDK client 仅在 service worker 存活期间复用；连接测试结果按当前 provider config + model 记录为 `上次通过 / 上次失败` 并带 `testedAt`，Key / model / provider 变化后失效；正式 AI 调用路径仍直接发起流式请求，不执行连接测试。
- [x] 2026-06-08 优化边界已核对：未新增 manifest permission、host permission、依赖、backend、hosted AI、provider proxy、telemetry、storage key 迁移或持久化明文 API Key；未运行真实 provider API。
- [x] 2026-06-08 翻译速度二次优化已实现：翻译 `max_tokens` 按输入长度动态下调为 128 / 256 / 512；划词自动内联翻译 debounce 降为 100ms；内联翻译重试和命令面板 `翻译 xxx` 回车直发；短文本翻译缓存仅存在 service worker 内存中，cache key 使用页面 / 文本 / 目标语言 hash，设置或 Key 变化时失效。
- [x] 2026-06-08 翻译缓存边界已核对：未新增 manifest permission、host permission、provider、第三方翻译 fallback、依赖、backend、hosted AI、provider proxy、telemetry、storage key 迁移或持久化 raw source text、raw prompt、raw response、完整 URL、页面正文、API Key。
- [x] 2026-06-08 命令面板搜索范围修复已实现：新增 `history` 普通权限后，命令面板本地搜索 Chrome 浏览历史、Chrome 书签和 Aviso AI 对话历史；浏览历史只用于本地关键词匹配和打开 URL，不进入 AI 请求、provider、telemetry、`chrome.storage` 或远端服务。
- [x] 2026-06-08 命令面板浏览历史搜索补充修复已实现：`chrome.history.search` 显式传入 `startTime: 0`，避免默认只搜索最近 24 小时导致较早浏览记录搜不到；结果来源标签区分为 `浏览历史`、`书签`、`AI 对话`。
- [x] 2026-06-08 截图和右键模型菜单补救已实现：截图选区改为透明选区 + 外侧遮罩，不遮挡被框选内容；右键 `截图提问` 去掉内部试用后缀；右键模型 radio 改为读取已保存 AI 服务配置和默认配置，AI 服务配置 / 默认服务 / 本地 Key 变化时会重建菜单。
- [ ] V1-013 UI language localization 未实现：实现时只能新增/复用现有 `chrome.storage.sync/contextai_settings` 内的非 secret UI 语言字段，不新增 storage key、manifest permission、host permission、依赖、backend、hosted AI、provider proxy、telemetry、analytics、provider route、API Key 处理或翻译目标语言行为变更。
- [x] V2-006 复制当前上下文使用既有 `clipboardWrite` 能力，未新增 manifest permission 或 host permission；复制内容只写入用户剪贴板，不进入 provider、AI 请求、history、`chrome.storage`、文件、文档、console 或 telemetry。
- [x] V2-007 翻译 MVP 未新增 manifest permission、host permission、provider、依赖、远端服务或第三方翻译 fallback；translate payload 只使用选区或用户输入，不把页面 URL、链接 URL 或页面正文当作翻译内容。
- [x] V2-008 theme / panel polish 未新增 manifest permission、host permission、provider、依赖、远端服务、telemetry、cache、theme storage 设置或 `contextai_*` storage key 迁移；不改变 AI 请求 payload、provider routing、默认模型或 token 上限。
- [x] V1-004 Command Palette search panel 未新增 manifest permission、host permission、provider、依赖、backend URL、telemetry、storage key 或真实 provider 调用；不展示 quota/login/subscription mock 状态，不把截图入口放回普通用户命令面板。命令面板只检查本地加密 Key 是否存在来显示 AI 可用/未连接，不解密、不展示、不输出 API Key。
- [x] V1-008 BYOK settings cleanup 未新增 storage key、manifest permission、host permission、provider、依赖、backend URL、telemetry 或 analytics；API Key 继续只保存在 encrypted `chrome.storage.local/contextai_api_keys`，`chrome.storage.sync/contextai_settings` 继续只保存非 secret 设置；provider 连接测试仍为用户手动触发、一次只测单 provider、只展示脱敏摘要。
- [x] V1 global appearance theme sync 只新增并继续复用非 secret `appearanceTheme` 到现有 `chrome.storage.sync/contextai_settings`，默认 `system`；不新增 storage key、不迁移 API Key、不读取或展示完整 Key、不改变宿主网页主题。主题现在只作用于 Aviso 自己的 Popup、命令面板、结果面板、划词工具栏、内联翻译卡、双击菜单和截图 overlay / toolbar。
- [x] V1-005 screenshot local action toolbar 未新增 manifest permission、host permission、provider、依赖、storage key、telemetry、cache、backend、quota、login 或 hosted AI。Copy image 只写入用户剪贴板；Download image 使用临时 object URL 和浏览器原生下载行为，不使用 `chrome.downloads` API 或 `downloads` permission；截图/base64 不写入 history、`chrome.storage`、docs、console、telemetry 或 release artifacts。
- [x] V1-006 内联即时翻译未新增 manifest permission、host permission、provider、依赖、storage key、telemetry、cache、backend、quota、login、subscription、payment、hosted AI 或第三方翻译 fallback。新增设置只写非 secret `chrome.storage.sync/contextai_settings`；翻译 payload 继续只允许 selected text / user input，并排除 URL、页面正文、远端链接正文、截图、剪贴板、full DOM 和 prior context。
- [x] V1-007 双击快捷菜单 MVP 未新增 manifest permission、host permission、provider、依赖、backend URL、telemetry、analytics、storage secret 或真实 provider 验证；新增设置开关为非 secret `contextai_settings` 字段，默认关闭；动作复用现有用户手动触发路径。
- [x] V1-011 conversation autosave 复用本地正式 history key `contextai_history`，只写 `chrome.storage.local`，最多保留最近 20 条 conversation；不写 sync、不写 API Key、不写截图/base64、不写 raw provider response、不新增权限、依赖、backend、telemetry、hosted AI、登录、额度、订阅、支付或真实 provider 调用。
- [x] V1-012 自定义模板右键菜单同步只读取/比较 `chrome.storage.sync/contextai_settings.templates` 非 secret 设置并重建本地 Chrome context menu；不读取 API Key、不迁移 storage key、不新增 manifest permission、host permission、provider、依赖、backend、telemetry、hosted AI、登录、额度、订阅、支付或真实 provider 调用。
- [ ] 真实 OpenAI 调用已通过用户手动触发的单 provider 最小样例验证。公开发布门禁未关闭。
- [ ] 真实 Anthropic 调用已通过用户手动触发的单 provider 最小样例验证。公开发布门禁未关闭。
- [x] 真实豆包/火山方舟调用已通过 V2-004 手动单 provider 连接测试。脱敏记录：`provider=doubao`，`model_or_endpoint=doubao-seed-2-0-lite-260428`，`host_permission_present=true`，`result=success`，`latency_note=约 2505 ms`，`error_category=none`，`secret_leak_check=pass`，`raw_prompt_logged=no`，`raw_response_logged=no`，`private_page_data_logged=no`。记录来源：2026-06-02 用户在已加载扩展的 Popup 手动触发。

## 4. 构建产物

- [x] `npm test` 通过。2026-06-07，V1 Popup AI 服务卡片 latest polish 后 104/104 项测试通过；存在 Node `MODULE_TYPELESS_PACKAGE_JSON` 性能警告，非阻塞。
- [x] `npm test` 通过。2026-06-08，AI 请求前置准备与连接状态体感优化后 110/110 项测试通过；仍存在既有 Node `MODULE_TYPELESS_PACKAGE_JSON` 性能警告，非阻塞。
- [x] `npm test` 通过。2026-06-08，翻译速度二次优化后 112/112 项测试通过；仍存在既有 Node `MODULE_TYPELESS_PACKAGE_JSON` 性能警告，非阻塞。
- [x] `npm test` 通过。2026-06-08，命令面板浏览历史搜索修复后 113/113 项测试通过；仍存在既有 Node `MODULE_TYPELESS_PACKAGE_JSON` 性能警告，非阻塞。
- [x] `npm test` 通过。2026-06-08，命令面板浏览历史全量时间范围补丁后 113/113 项测试通过；仍存在既有 Node `MODULE_TYPELESS_PACKAGE_JSON` 性能警告，非阻塞。
- [x] `npm test` 通过。2026-06-08，截图选区透明、右键截图文案和右键模型菜单同步补救后 116/116 项测试通过；仍存在既有 Node `MODULE_TYPELESS_PACKAGE_JSON` 性能警告，非阻塞。
- [x] `npx tsc --noEmit` 通过。2026-06-07，V1 Popup AI 服务卡片 latest polish 后无错误输出。
- [x] `npx tsc --noEmit` 通过。2026-06-08，AI 请求前置准备与连接状态体感优化后无错误输出。
- [x] `npx tsc --noEmit` 通过。2026-06-08，翻译速度二次优化后无错误输出。
- [x] `npx tsc --noEmit` 通过。2026-06-08，命令面板浏览历史搜索修复后无错误输出。
- [x] `npx tsc --noEmit` 通过。2026-06-08，命令面板浏览历史全量时间范围补丁后无错误输出。
- [x] `npx tsc --noEmit` 通过。2026-06-08，截图选区透明、右键截图文案和右键模型菜单同步补救后无错误输出。
- [x] `npm run build` 通过。2026-06-07，默认沙箱内仍为已知 `Operation not permitted`，沙箱外同命令重跑通过。
- [x] `npm run build` 通过。2026-06-08，默认沙箱内仍为已知 `Operation not permitted`，沙箱外同命令重跑通过。
- [x] `npm run build` 通过。2026-06-08，翻译速度二次优化后默认沙箱内仍为已知 `Operation not permitted`，沙箱外同命令重跑通过。
- [x] `npm run build` 通过。2026-06-08，命令面板浏览历史搜索修复后默认沙箱内仍为已知 `Operation not permitted`，沙箱外同命令重跑通过；构建 manifest 普通权限为 `contextMenus`、`activeTab`、`storage`、`history`、`bookmarks`、`clipboardWrite`。
- [x] `npm run build` 通过。2026-06-08，命令面板浏览历史全量时间范围补丁后默认沙箱内仍为已知 `Operation not permitted`，沙箱外同命令重跑通过。
- [x] `npm run build` 通过。2026-06-08，截图选区透明、右键截图文案和右键模型菜单同步补救后默认沙箱内仍为已知 `Operation not permitted`，沙箱外同命令重跑通过。
- [x] `git diff --check` 通过。2026-06-07，V1 Popup AI 服务卡片 latest polish 后通过。
- [x] `git diff --check` 通过。2026-06-08，AI 请求前置准备与连接状态体感优化后通过。
- [x] `git diff --check` 通过。2026-06-08，翻译速度二次优化后通过。
- [x] `git diff --check` 通过。2026-06-08，命令面板浏览历史搜索修复后通过。
- [x] `git diff --check` 通过。2026-06-08，命令面板浏览历史全量时间范围补丁后通过。
- [x] `git diff --check` 通过。2026-06-08，截图选区透明、右键截图文案和右键模型菜单同步补救后通过。
- [x] `package.json` / lock 文件无 diff。2026-06-07，未新增依赖；构建 manifest 权限仍为 `contextMenus`、`activeTab`、`storage`、`bookmarks`、`clipboardWrite`，`host_permissions` 仍只包含 OpenAI、Anthropic、Ark 三个已批准 provider 域名。
- [x] `package.json` / lock 文件无 diff。2026-06-08，未新增依赖；构建 manifest 权限仍为 `contextMenus`、`activeTab`、`storage`、`bookmarks`、`clipboardWrite`，`host_permissions` 仍只包含 OpenAI、Anthropic、Ark 三个已批准 provider 域名。
- [x] `package.json` / lock 文件无 diff。2026-06-08，翻译速度二次优化未新增依赖；构建 manifest 权限仍为 `contextMenus`、`activeTab`、`storage`、`bookmarks`、`clipboardWrite`，`host_permissions` 仍只包含 OpenAI、Anthropic、Ark 三个已批准 provider 域名。
- [x] lock 文件无 diff。2026-06-08，命令面板浏览历史搜索修复未新增依赖；`package.json` manifest 普通权限新增 `history`，`host_permissions` 仍只包含 OpenAI、Anthropic、Ark 三个已批准 provider 域名。
- [x] `website` 的 `npm run build` 通过。2026-06-04，补齐 `aviso-social-card.png` 后 Docusaurus 生产构建通过。
- [x] `website` 的 `npm run build` 通过。2026-06-08，命令面板浏览历史搜索权限说明更新后 Docusaurus 生产构建通过。
- [x] `npm run package` 通过，并生成当前 zip：`build/chrome-mv3-prod.zip`，约 1.37 MB。2026-06-04 V1-006 内联即时翻译 P0 和最新 QA 记录更新后沙箱外重跑通过；包内 manifest 权限边界未扩大。
- [x] Chrome 加载 `build/chrome-mv3-prod` 无安装报错。2026-06-02 用户本地验收通过。
- [x] 版本号、扩展名称、描述、图标符合本次发布目标。Manifest 显示 `0.1.0` / `Aviso`，权限未扩大。

## 5. 商店素材

- [x] 128x128 图标可用。源图 `assets/icon.png` 为 512x512；最新构建 manifest 已引用生成的 `icon128.plasmo.*.png`，尺寸为 128x128。
- [ ] 三张 1280x800 商店截图需要重做。现有 `docs/store/assets/store-screenshot-01-context-actions.png`、`docs/store/assets/store-screenshot-02-result-panel-history.png`、`docs/store/assets/store-screenshot-03-ai-settings-boundary.png` 只能作为占位草案，不可作为最终商店素材。
- [ ] 最终商店截图需按 BYOK 基础版、无登录/订阅/hosted AI、弱化或隐藏截图入口的口径重新设计，并在提交前与最终描述、隐私声明、manifest 和 release artifacts 再次核对。
- [ ] 440x280 small promo tile 需要重做。现有 `docs/store/assets/aviso-small-promo-tile.png` 只能作为占位草案。
- [ ] 1400x560 marquee promo tile 如需使用也需要重做。现有 `docs/store/assets/aviso-marquee-promo-tile.png` 只能作为占位草案。
- [x] 商店描述、权限说明、隐私声明和发布说明草案已准备：`docs/store/chrome-web-store-submission-draft.md`。草案不代表已提交 Chrome Web Store。
- [ ] Chrome Web Store 后台最终描述准确说明功能、权限和隐私边界，并与截图 / 素材一致。
- [x] 托管文档站已通过 GitHub `main` 自动部署到 Vercel 生产环境：`https://aviso-nine.vercel.app/`。该状态不代表扩展已公开发布或已提交 Chrome Web Store。
- [x] 新版官网首页已部署。设计源文件归档 commit：`6258c94`；官网首页刷新 commit：`cb801bc`。
- [x] `aviso-social-card.png` 已补齐：`website/static/img/aviso-social-card.png`，1200x630 PNG，使用保守当前能力文案，不展示 API Key、私人网页、真实账号或未上线的登录 / 额度 / 订阅 / 支付。
- [x] 隐私政策页面已有可访问 URL：`https://aviso-nine.vercel.app/docs/privacy-policy/`。
- [x] 当前官网隐私政策已按现有 Popup 隐私说明、provider host permissions、v0.2-alpha 数据流和当前构建产物边界更新。2026-06-03 本地文档已更新，线上需等待 GitHub `main` 自动部署。
- [ ] 隐私政策最终版本仍需与 Chrome Web Store 后台隐私声明、商店截图 / 素材和最终 release artifacts 再次核对。当前草案已补充 Chrome Web Store Limited Use 说明和内容脚本站点访问披露。
- [x] 发布说明草案已列出主要功能、已知限制和支持方式；最终公开文案仍需用户确认。

## 6. 发布与回滚

- [ ] 发布账号、提交权限和密钥由用户确认。
- [ ] GitHub Actions 发布 workflow 只在确认后手动触发。
- [x] Vercel GitHub 集成自动部署 `main` 已启用并已成功触发。最新线上 commit：`cb801bc9e6a41bdfd6591bf33a162c44d4583fa2`；Deployment URL：`https://vercel.com/jonyliu-projects/aviso/7FtsfHC9FMQAGvpzRUo5dWbrg2VH`。
- [ ] 发布前有可追踪 git 提交或 tag。
- [ ] 记录上一版可回滚构建产物或 tag。
- [ ] 发布后验证商店版本号、权限提示和首次启动体验。
- [ ] 出现严重问题时的回滚动作、负责人和沟通文案已准备。

## 7. v0.1 已知限制记录

- [x] 前端触发链路已优化：用户点击/发送后应立即看到浮窗和明确等待状态。
- [x] 已保留响应速度优化：立即显示浮窗、等待模型响应、timing 日志、页面正文 5000 字符截断、默认 `max_tokens` 1024。
- [x] 已新增 V2-004B 脱敏性能基线：普通浮窗 AI 请求输出一条 `[Aviso perf]` 摘要，可区分 UI 可见、background 接收、provider start、first chunk、done、缺失阶段和错误失败。
- [x] 已新增 V2-004C / 2026-06-07 可感知响应保护：追问上下文预算、约 2 秒慢响应提示、停止等待并忽略后续 chunk、background abort signal、`user_cancelled` 脱敏分类；真实 provider 首 token 仍不承诺稳定 2 秒内。
- [x] 已新增 2026-06-08 请求前置准备优化：settings / API key / route 短缓存和 SDK client 复用只降低本地准备成本与“每次重新连接”的体感；真实 provider 首 token 仍可能受模型、网络、API Key 状态、provider 负载、连接复用策略和输入长度影响。
- [x] 已新增 2026-06-08 翻译速度二次优化：短文本翻译输出预算动态下调，内联自动翻译 debounce 100ms，重试 / 命令面板翻译直发，同页同文本同目标语言短文本可在 service worker 内存缓存命中后秒回；真实 provider 首 token 仍不承诺稳定 2 秒内。
- [x] 已新增 2026-06-08 `t_first_chunk` 本地侧优化：按功能压缩上下文，选区/自由问不再携带页面正文，页面总结正文预算收敛到 3000 字符，prompt 改为首句优先，页面总结正文使用 service worker 内存短缓存并与 runtime config 预热并行；真实 provider 首 token 仍不承诺稳定 2 秒内。
- [x] 已新增 2026-06-08 动态等待态文案：结果面板和内联翻译在等待首段真实内容时轮播显示场景化状态短句；文案只用于 UI，不写入 AI 输出、history、storage 或 provider payload。
- [x] 默认模型为较快的 `gpt-4o-mini`。
- [x] provider 首 token 仍可能受模型、网络、API Key 状态、provider 负载和输入长度影响。
- [x] Aviso v0.1 不承诺模型秒回；本版本不做后端中转、不扩大权限、不新增依赖、不继续重构 AI 客户端。

## 8. 内部试用与公开发布门禁

- [x] v0.1 当前用途限定为 internal dogfood / 内部试用。
- [x] A-G 手动验收用户已验证基本通过。
- [x] 豆包/火山方舟 API 已通过 V2-004 手动单 provider 连接测试；本记录不包含 Key、raw prompt、raw response 或私人页面内容。
- [x] Aviso 官网文档站已通过 GitHub `main` 自动部署到 Vercel，Root Directory 为 `website`，生产 URL 为 `https://aviso-nine.vercel.app/`。
- [x] 已验证官网首页、介绍文档、隐私政策、安装文档均返回 200。当前隐私政策文案已更新到本地，线上版本需等待 GitHub `main` 自动部署。
- [x] 当前版本不进入公开发布，不提交 Chrome 商店。
- [ ] OpenAI 真实最小调用验证完成。
- [ ] Anthropic 真实最小调用验证完成。
- [x] `npm run package` 通过并刷新当前 zip：`build/chrome-mv3-prod.zip`。
- [ ] Chrome 商店素材最终确认完成。当前三张截图草案、small promo tile、可选 marquee tile 已判定为占位草案，需重做；最终是否采用、后台填报和提交前扫描仍待用户确认。
- [ ] 外部隐私政策最终版本准备完成并与 Popup 隐私说明、Chrome Web Store 后台隐私声明、商店截图 / 素材和最终 release artifacts 一致。当前官网隐私政策和商店文案草案已完成本地一致性更新，但后台最终声明仍未提交。
- [ ] 发布前存在可追踪 git 提交或 tag，并记录回滚点。

## 9. v0.2-alpha 规划门禁

> v0.2-alpha 是下一轮内部试用规划，不代表公开发布门禁已关闭。

- [x] v0.2 desktop PRD / tech draft 已完成只读评估，并收敛为项目内 v0.2-alpha 范围。
- [x] v0.2-alpha MVP 不默认包含多 Tab 聚合、Tab 分组、语音输入、第三方免费翻译兜底、远端链接正文抓取或内部 storage key 迁移。
- [x] v0.2-alpha issue map 已记录到 `docs/04_ROADMAP.md`。
- [x] v0.2-alpha 技术约束已记录到 `docs/03_TECH_SPEC.md`，包括当前真实 manifest 权限、host permissions、消息协议和 storage 边界。
- [x] v0.2-alpha 隐私与风险已同步到 `docs/06_RISK_REGISTER.md` 和 `docs/07_PRIVACY_AND_SECURITY.md`。
- [x] V2-002 provider validation / permission audit 的 host permission 产品决策已批准并记录到 `docs/decisions/001-v2-provider-host-permissions.md`。
- [x] OpenAI / Anthropic 新增 provider host permission 已由用户确认，并已在 V2-003 同步到 `package.json` manifest；真实 provider 连通性验证仍留给 V2-004。
- [x] V2-003 minimal model registry and routing 已实现，默认 `gpt-4o-mini` 和现有 OpenAI / Anthropic / 豆包路由行为保持兼容。
- [x] V2-004 manual connectivity test UI 已实现：用户手动触发、一次只测单 provider，摘要不记录 Key、raw prompt、raw response、私人网页内容或私密截图。
- [x] 豆包 / 火山方舟真实 provider 最小验证记录已补录。
- [x] V2-004B latency baseline 已实现为本地 console 脱敏摘要；未运行真实 provider、未新增 provider、未改变 manifest 权限。
- [x] V2-004C follow-up speed guard 已实现：未运行真实 provider、未新增 provider、未改变 manifest 权限、未改变 API Key / storage key 边界。
- [x] V2-004C 已重新加载本地扩展并完成人工 UI QA：追问、慢响应提示和停止等待主路径用户反馈通过。记录来源：2026-06-02 用户反馈。
- [x] V2-005 screenshot to AI internal dogfood MVP 已实现：右键页面菜单手动触发，确认选区后才截图；截图/base64 不写入 history、storage、docs、console 或 release artifacts；未新增权限、provider、依赖或真实 API 验证。
- [x] V2-005 已重新加载本地扩展并完成 internal dogfood 人工 UI QA：取消流程正常，确认流程正常，豆包 / 火山方舟未验证 vision endpoint 被拦截并显示可读错误，Service Worker Console 可见 `[Aviso perf]` 摘要入口。记录来源：2026-06-02 用户本地截图测试反馈。
- [x] V2-006 copy current context internal dogfood MVP 已实现：右键页面菜单手动触发，复制 Markdown 结构化上下文到剪贴板，正文按默认 5000 字符边界截断；未新增权限、provider、依赖、storage、history 或真实 API 调用。
- [x] V2-006 已重新加载本地扩展并完成人工 UI QA：右键复制当前上下文 internal dogfood 主路径用户反馈通过。记录来源：2026-06-02 用户反馈。
- [x] V2-007 translation MVP 已实现：选区/用户输入翻译继续复用现有 provider routing、streaming、history 和脱敏 perf；不做全页 DOM 翻译、不接第三方翻译服务、不扩大权限。
- [x] V2-007 已重新加载本地扩展并完成人工 UI QA：右键选区“翻译”、划词工具栏“翻译”和命令面板“翻译 hello”三条主路径用户反馈通过。记录来源：2026-06-03 用户反馈。
- [x] V2-008 theme / Aviso panel polish 已实现：复用 `src/styles/aviso.tsx` 的共享视觉 token，收敛 Popup、结果面板、命令面板、划词工具栏、Toast、截图 overlay 的按钮、状态、错误和等待呈现；未新增权限、provider、依赖、storage key 或真实 API 调用。
- [x] V2-008 已重新加载本地扩展并完成人工 UI QA：Popup、结果面板、命令面板、划词工具栏、Toast、截图取消 / 确认、复制当前上下文、追问 / 停止等待主路径用户反馈通过。记录来源：2026-06-03 用户反馈。
- [x] V1-004 Command Palette mocked states 已被基础版搜索式控制面板替代：quick actions、mock access states、BYOK route badge 和 quota/login/subscription UI-only 预览不再面向普通用户展示；focused unit tests 已补齐；未新增权限、provider、依赖、storage key、backend 或真实 API 调用。
- [x] V1-006 内联即时翻译 P0 已重新加载本地扩展并完成人工 UI QA：开关、目标语言、短选区内联卡片、复制、重试、打开结果面板和长选区提示用户反馈通过。记录来源：2026-06-04 用户反馈。
- [x] V1-007 / V1-011 两个 P1 代码修复已完成：双击快捷菜单提前抑制划词工具栏并复用缓存设置/模板；结果面板不再把新对话误标成已保存。自动检查已通过，但加载扩展后的 focused manual QA 仍待补录。
- [x] V1-008 默认模型下拉配置状态已重新加载本地扩展并完成人工 UI QA：下拉框显示状态，未配置项置灰不可点击。记录来源：2026-06-04 用户反馈。
- [x] V1-005 screenshot local action toolbar 已实现：复用现有可见区域截图 overlay，在选区后提供 Copy image、Download image、Retry、Cancel，并保留现有 Send to AI 安全边界；不新增 `downloads` permission、manifest permission、host permission、provider、依赖、storage、telemetry、backend、quota、login 或 hosted AI。
- [x] V1 basic hide screenshot entry 已实现最小入口收敛：命令面板和双击快捷菜单不再展示截图动作；右键菜单保留 `截图提问` 作为授权入口；未新增权限、依赖、backend、hosted AI 或 storage key 迁移。
- [ ] V1-005 加载扩展后的人工 UI QA 仍待补录：Copy image、Download image、Retry、Cancel、现有 Send to AI unsupported-model/error 主路径。
- [x] V1-012 custom template context-menu sync 已实现：Popup 模板新增、编辑、删除后，模板设置变化会触发 Chrome 原生右键菜单串行重建；模板父菜单只在至少一个子模板适用于当前右键上下文时出现，避免空白页右键显示空子菜单；仅默认模型变化时仍只同步模型 radio 勾选。未新增权限、provider、依赖、backend 或 storage secret。
- [ ] V1-012 加载扩展后的人工 UI QA 仍待补录：新增模板后无需重装扩展，选中文字右键应即时出现模板；编辑后菜单标题同步更新；删除后菜单项移除，没有模板时不显示空的自定义模板子菜单。
- [x] V1 Popup focused settings polish 已通过主线程 loaded-extension focused QA：语言 mini dropdown 不再被设置卡片裁切，AI 服务卡状态统一为第二行 pill，翻译相关按钮文案统一为 `发给 AI`，命令面板辅助文案位置已调整。该记录不是整个 v1 Popup release approval。
- [x] V1 Popup AI 服务卡片 latest polish 已通过隔离临时 Chrome 加载 `build/chrome-mv3-prod` focused QA：外层输入框焦点、标题按钮垂直居中、已保存配置删除二次确认通过；未点击最终删除，未触发真实 provider 测试。
- [ ] V2-005 真实 vision provider 验证仍未完成；OpenAI / Anthropic 原生 API Key 验证前，截图理解不能对外宣称 provider 已验证。
- [ ] OpenAI / Anthropic 真实 provider 最小验证记录仍待原生 API Key 手动触发并补录；OpenAI / Anthropic 仍不可对外宣称已验证。
- [ ] V1-013 UI language localization 仍待实现和中英文 loaded-extension QA；英文 Chrome 用户看到 English UI 前，不建议进入英文公开发布或英文商店素材定稿。
- [x] 翻译和复制上下文能力已确认不会把缓存内容或私有网页信息写入日志、文档、截图或 release artifacts；本轮未实现翻译缓存。
