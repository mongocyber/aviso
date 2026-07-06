# CLAUDE.md

本文件是 Aviso 项目里的长期工作规则。每次改动前先看真实代码和当前文档，不要基于历史草案或旧规划推进。

## 当前项目事实

- Aviso 是 Chrome MV3 扩展，技术栈为 React 18 和 TypeScript；本地 `dev` / `build` 保留 Plasmo 路径，规范发布包由 WXT 生成。
- 当前 Chrome 上传包版本是 `0.1.1`，owner 已上传并提交 Chrome Web Store 审核，等待审核结果；还不是公开上架版本，没有通过 Chrome Web Store 审核，也没有正式商店链接。
- 当前默认可用产品模型仍是 BYOK direct-provider：用户提供自己的 API Key，浏览器扩展直连模型厂商。
- v0.3 production candidate 已加入可选 Aviso AI / hosted AI 路径：只有用户主动选择托管路径时才需要 Google 登录，请求才会经过 Aviso production 后端。该路径已有 production backend authenticated HTTP smoke 和候选包证据，但还不是公开发布、Chrome Web Store 批准、hosted AI live 或网站部署。
- 当前没有 provider proxy 公开 live、订阅、支付、公开匿名额度、遥测、分析 SDK、远端链接正文抓取或联网搜索。
- API Key 不明文保存，保存在 `chrome.storage.local/contextai_api_keys`；当前口令由扩展 ID 派生，属于本地加密 / 混淆级保护，不防御已能读取本机浏览器 profile 或本机已被控制的攻击者。非敏感设置保存在 `chrome.storage.sync/contextai_settings`；本地对话历史保存在 `chrome.storage.local/contextai_history`。

## 先读再改

改动前默认先读：

- `README.md`
- `STATUS.md`
- `RELEASE_CHECKLIST.md`
- `docs/README.md`
- `docs/prd.md`
- `docs/tech-spec.md`
- `docs/privacy-and-security.md`
- 和当前任务直接相关的源码或测试。

不要引用已经移除的旧 roadmap、issue、spec、store、design 或 brand 目录作为当前依据。

## 当前可写成事实的能力

- 右键菜单、划词工具栏、划词翻译卡、命令面板、双击快捷菜单、剪贴板提示、结果面板、历史、自定义指令和 Popup 设置页已经实现。
- UI 支持中文和 English，默认跟随 Chrome UI language，也支持设置 override。
- Manifest 描述和命令说明已接入 `zh_CN` / `en` locale。
- 多 AI 服务配置和模型 ID 手动编辑已经实现。
- 豆包 / 火山方舟已由用户确认可用。
- OpenAI / Anthropic 只有 host permission 和配置能力；当前没有可用 API Key，真实最小调用暂缓验收。

截图能力只按当前内部试用边界处理：右键主动触发内部路径保留，命令面板和双击快捷菜单不展示截图入口，不作为普通用户主入口或公开卖点。

## 不要写成当前能力

以下内容不能写成已实现、已上线或已验证：

- Chrome Web Store 已经公开可安装、已通过审核或已有正式商店链接。
- OpenAI / Anthropic 真实调用已验收。
- 项目方托管 AI 已经公开 live、Chrome Web Store 已批准、所有用户都可用、订阅支付已上线、公开匿名额度已发布。
- 联网搜索、远端链接正文抓取、全页 DOM 翻译、第三方翻译 fallback。
- 本地模型、浏览器会话 Agent、多 Tab 聚合、语音输入。
- 截图能力作为普通用户主入口或公开卖点。

## 高风险动作

遇到以下动作先停下确认：

- 修改 `manifest` 权限、host permissions 或 API Key 存储逻辑。
- 增加 provider、依赖、后端、远端服务、遥测、分析 SDK 或真实网络验证。
- 读取、打印、记录或提交 API Key、raw prompt、raw response、私人网页正文、截图/base64、完整 URL。
- 触发发布、tag、Chrome Web Store workflow、push 或生产部署，除非 owner 在当前任务中明确授权。
- 把当前内部试用状态改写成公开发布状态。

## 改动纪律

- 保持最小改动，优先复用现有结构和命名。
- 不做无关格式化，不重写 unrelated 文件。
- 不使用 `git add .`；如需提交，按文件白名单 stage。
- 不提交 secrets、生成凭证、`.env` 或敏感日志。
- 对功能、权限、隐私、命令、架构有影响时，同步更新相关文档。

## 常用检查

根项目常用检查：

```bash
git diff --check
npm test
npx tsc --noEmit
npm run build
npm run package
```

`npm run build` 在默认沙箱内可能出现 Plasmo `Operation not permitted`；需要在允许的本地环境中重跑确认。涉及 release package、manifest 或 loaded-extension candidate 时，以 `npm run package` 生成的 `build/chrome-mv3-prod` / `build/chrome-mv3-prod.zip` 为准。

`website/` 是独立 Docusaurus 项目；只有改到网站代码或网站文档时才进入 `website/` 单独构建。
