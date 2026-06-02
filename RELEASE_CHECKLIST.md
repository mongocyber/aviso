# Aviso Release Checklist

> 发布或提交商店前必须逐项记录。本清单不代表当前已经满足公开发布条件。

版本：`0.1.0`

负责人：

日期：2026-06-02

当前收口状态：`v0.1 internal dogfood / 内部试用版`

发布结论：A-G 手动验收用户已验证基本通过，豆包/火山方舟 API 用户确认可用；OpenAI / Anthropic 真实调用尚未验证。本版本仅用于内部试用，不进入公开发布，不提交商店。

## 1. 功能验收

- [x] 右键菜单：选区、链接、页面、图片、可编辑区域的菜单项符合预期。用户手动验收基本通过。
- [x] 划词工具栏：解释、翻译、润色、总结、发给 AI 均能触发浮窗。用户手动验收基本通过。
- [x] 命令面板：快捷键、搜索历史、搜索书签、无结果发问、历史项复用均正常。用户手动验收基本通过。
- [x] 剪贴板感知：普通文本提示，敏感内容和敏感域名不提示。用户手动验收基本通过。
- [x] 自定义模板：新增、编辑、删除、右键同步、占位符展开均正常。用户手动验收基本通过。
- [x] 浮窗与历史：流式输出、复制、保存去重、继续追问、历史管理均正常。用户手动验收基本通过。
- [x] iframe 场景：iframe 内划词、右键触发、命令面板快捷键、剪贴板提示和单实例 UI 基本通过。

## 2. 手动 QA 记录

构建路径：

```text
build/chrome-mv3-prod
```

测试页面：

```text
tests/manual-test.html
```

| 清单 | 结果 | 记录 |
|------|------|------|
| A · 右键菜单 | 基本通过 | 用户反馈已验证基本通过；作为内部试用通过记录。 |
| B · 划词工具栏 | 基本通过 | 用户反馈已验证基本通过；作为内部试用通过记录。 |
| C · 命令面板 | 基本通过 | 用户反馈已验证基本通过；作为内部试用通过记录。 |
| D · 剪贴板感知 | 基本通过 | 用户反馈已验证基本通过；作为内部试用通过记录。 |
| E · 自定义模板 | 基本通过 | 用户反馈已验证基本通过；作为内部试用通过记录。 |
| F · 浮窗与历史 | 基本通过 | 用户反馈已验证基本通过；作为内部试用通过记录。 |
| G · iframe / Hugging Face Spaces / Gradio 嵌入页 | 基本通过 | 用户反馈已验证基本通过；覆盖 iframe 内划词、右键、命令面板、剪贴板提示和单实例 UI。 |

Chrome 版本：用户未补录

操作系统：用户未补录

验收时间：2026-06-01 用户反馈

A-G 是否全部通过：基本通过，进入 v0.1 内部试用

Aviso 命名可见项：用户未补录逐项截图；当前按 A-G 基本通过记录

AI 回复速度反馈：豆包/火山方舟 API 用户确认可用；provider 首 token 仍按 v0.1 已知限制记录

异常截图或录屏：用户未补录

结论：v0.1 收口为 internal dogfood / 内部试用版；不进入公开发布，不提交商店。

## 3. 权限、隐私与 API Key

- [ ] `manifest.permissions` 只包含实际使用的权限。
- [ ] `host_permissions` 没有为链接正文抓取扩大到广域权限。
- [x] OpenAI / Anthropic provider host permission 产品决策已记录；当前任务未改 manifest。
- [ ] Popup 隐私说明与实际实现一致。
- [ ] 商店隐私文案与 Popup 隐私说明一致。
- [ ] API Key 不出现在日志、构建产物、截图、提交记录或 issue 文档中。
- [ ] 真实 OpenAI 调用已通过用户手动触发的单 provider 最小样例验证。公开发布门禁未关闭。
- [ ] 真实 Anthropic 调用已通过用户手动触发的单 provider 最小样例验证。公开发布门禁未关闭。
- [x] 真实豆包/火山方舟调用已由用户确认 API 可用。本次未运行真实 API。

## 4. 构建产物

- [x] `npm test` 通过。2026-05-29 22:48 CST，18 项测试通过；存在 Node `MODULE_TYPELESS_PACKAGE_JSON` 性能警告，非阻塞。
- [x] `npx tsc --noEmit` 通过。2026-05-29 22:48 CST，无错误输出。
- [x] `npm run build` 通过。2026-05-29 22:48 CST，生成 `build/chrome-mv3-prod`；默认沙箱内被系统拦截为 `Operation not permitted`，沙箱外重跑通过。
- [ ] `npm run package` 通过，并生成可提交 zip。
- [ ] Chrome 加载 `build/chrome-mv3-prod` 无安装报错。
- [x] 版本号、扩展名称、描述、图标符合本次发布目标。Manifest 显示 `0.1.0` / `Aviso`，权限未扩大。

## 5. 商店素材

- [ ] 128x128 图标可用。
- [ ] 商店截图齐备，且不包含 API Key、私人网页、真实账号或敏感信息。
- [ ] 商店描述准确说明功能、权限和隐私边界。
- [x] 托管文档站已通过 GitHub `main` 自动部署到 Vercel 生产环境：`https://aviso-nine.vercel.app/`。该状态不代表扩展已公开发布或已提交 Chrome Web Store。
- [x] 新版官网首页已部署。设计源文件归档 commit：`6258c94`；官网首页刷新 commit：`cb801bc`。
- [ ] `aviso-social-card.png` 仍待补齐。
- [x] 隐私政策草案页面已有可访问 URL：`https://aviso-nine.vercel.app/docs/privacy-policy/`。
- [ ] 隐私政策最终版本仍需与 Chrome Web Store 隐私声明、Popup 内隐私说明和最终构建产物再次核对。
- [ ] 发布说明列出主要功能、已知限制和支持方式。

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
- [x] 已保留响应速度优化：立即显示浮窗、正在连接模型、timing 日志、页面正文 5000 字符截断、默认 `max_tokens` 1024。
- [x] 默认模型为较快的 `gpt-4o-mini`。
- [x] provider 首 token 仍可能受模型、网络、API Key 状态、provider 负载和输入长度影响。
- [x] Aviso v0.1 不承诺模型秒回；本版本不做后端中转、不扩大权限、不新增依赖、不继续重构 AI 客户端。

## 8. 内部试用与公开发布门禁

- [x] v0.1 当前用途限定为 internal dogfood / 内部试用。
- [x] A-G 手动验收用户已验证基本通过。
- [x] 豆包/火山方舟 API 用户确认可用；本次未运行真实 API。
- [x] Aviso 官网文档站已通过 GitHub `main` 自动部署到 Vercel，Root Directory 为 `website`，生产 URL 为 `https://aviso-nine.vercel.app/`。
- [x] 已验证官网首页、介绍文档、隐私政策草案、安装文档均返回 200。
- [x] 当前版本不进入公开发布，不提交 Chrome 商店。
- [ ] OpenAI 真实最小调用验证完成。
- [ ] Anthropic 真实最小调用验证完成。
- [ ] `npm run package` 通过并生成可提交 zip。
- [ ] Chrome 商店截图、描述、发布说明等素材准备完成。
- [ ] 外部隐私政策最终版本准备完成并与 Popup 隐私说明、Chrome Web Store 隐私声明一致。
- [ ] 发布前存在可追踪 git 提交或 tag，并记录回滚点。

## 9. v0.2-alpha 规划门禁

> v0.2-alpha 是下一轮内部试用规划，不代表公开发布门禁已关闭。

- [x] v0.2 desktop PRD / tech draft 已完成只读评估，并收敛为项目内 v0.2-alpha 范围。
- [x] v0.2-alpha MVP 不默认包含多 Tab 聚合、Tab 分组、语音输入、第三方免费翻译兜底、远端链接正文抓取或内部 storage key 迁移。
- [x] v0.2-alpha issue map 已记录到 `docs/04_ROADMAP.md`。
- [x] v0.2-alpha 技术约束已记录到 `docs/03_TECH_SPEC.md`，包括当前真实 manifest 权限、host permissions、消息协议和 storage 边界。
- [x] v0.2-alpha 隐私与风险已同步到 `docs/06_RISK_REGISTER.md` 和 `docs/07_PRIVACY_AND_SECURITY.md`。
- [x] V2-002 provider validation / permission audit 的 host permission 产品决策已批准并记录到 `docs/decisions/001-v2-provider-host-permissions.md`。
- [x] OpenAI / Anthropic 新增 provider host permission 已由用户确认，并同步到隐私、安全、风险和路线文档；实际 manifest 改动留给 V2-003。
- [ ] 任何真实 provider 连通性测试均由用户手动触发、一次只测单 provider，使用安全测试 Key，不记录 Key、raw prompt、raw response、私人网页内容或私密截图。
- [ ] 截图、翻译、缓存或复制上下文能力上线前，已确认不会把敏感截图、缓存内容或私有网页信息写入日志、文档、截图或 release artifacts。
