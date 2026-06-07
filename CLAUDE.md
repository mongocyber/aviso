# CLAUDE.md

本文件是 Claude Code 在 Aviso 项目里的长期工作规则。每次会话开始、改动文件之前都应遵守。规则与真实状态冲突时，以仓库内 `STATUS.md`、`RELEASE_CHECKLIST.md` 和源码为准。

## 项目概览

- Aviso 是一个 Chrome MV3 浏览器扩展（Plasmo + React 18 + TypeScript），在当前网页内通过右键菜单、划词工具栏、命令面板、剪贴板感知触发 AI 操作，结果显示在页面内浮窗。
- 当前真实状态：`v0.1 internal dogfood / 内部试用版`。**尚未公开发布，尚未提交 Chrome Web Store。**
- 当前数据模型：无项目方后端、无遥测、无分析 SDK；API Key 本地 AES 加密，AI 请求由浏览器直连用户选择的 provider（BYOK）。

## 1. 先读再改

任何改动文件之前，默认先读这些事实源，避免基于过期假设动手：

- `README.md`
- `STATUS.md`
- `RELEASE_CHECKLIST.md`
- 相关的 `docs/`：`02_PRD.md`、`03_TECH_SPEC.md`、`04_ROADMAP.md`、`06_RISK_REGISTER.md`、`07_PRIVACY_AND_SECURITY.md`
- 涉及 v1.0 需求时，读 `docs/specs/aviso-v1-public-launch.md`
- 涉及品牌/视觉时，读 `docs/brand/README.md` 和 `docs/brand/components/aviso-components.css`

## 2. v1.0 基础版需求源

- 当前 v1.0 执行方向已经从旧的 default-hosted public launch 草案收敛为 **BYOK 基础上线版**。`docs/specs/aviso-v1-public-launch.md` 仍是 v1.0 范围文档，但其中的 hosted AI / 匿名额度 / 登录 / 订阅 / 支付方向已被 2026-06-05 的 owner 决策暂停，必须先按基础版 scope cleanup 后再作为执行依据。
- 登录、订阅、支付、匿名额度、hosted Aviso AI、provider proxy 和后端抓取不是遗漏功能，而是当前明确移出 v1.0 基础版的未来状态。
- 不要把 `/Users/jonyliu/Desktop/Aviso_PRD_v0.3_merged.md`（或其他桌面草稿）当成 v1.0 需求源，**除非用户在当轮明确指定**。桌面草稿只是历史输入，不是规格。

## 3. v1.0 基础版是当前执行边界

- 当前基础版保持 BYOK direct-provider：用户自己的 API Key，本地加密保存，浏览器扩展直连 OpenAI / Anthropic / 豆包火山方舟等已批准 provider host。
- V1-006 内联即时翻译、V1-008 默认模型配置状态已通过用户加载扩展后的人工 QA；V1-005 截图本地动作工具栏、V1-007 双击快捷菜单、V1-011 conversation autosave、V1-012 模板右键同步已有实现但仍有不同程度人工 QA 或产品取舍未关闭，具体以 `STATUS.md` / `RELEASE_CHECKLIST.md` / `docs/issues/007-v1-core-ui-manual-qa.md` 为准。
- 截图功能当前暂停对普通用户强化展示。不要把截图作为 Chrome Web Store 卖点继续推进；如需改入口，应先按 owner 决策隐藏、移除或保留 internal-only。
- 远端链接正文总结和联网搜索当前不做。继续只透传 URL，不扩大 `host_permissions`，不接后端抓取。

## 4. 官网与公开文案的三分法

任何官网、商店、对外文案必须把内容严格分成三类，不得混淆：

1. **已实现**：可在 `STATUS.md` / `RELEASE_CHECKLIST.md` / 源码中找到证据，才能写成现状。
2. **planned / roadmap / coming soon**：v1.0 方向中尚未实现的能力，必须带"规划中 / 未上线 / 以发布版本为准"等标记。
3. **禁止出现**：会误导用户的未实现能力，既不能写成现状，也不要含糊暗示。

## 5. 禁止的"已上线"宣称

下列内容当前**一律不得**写成已实现 / 已上线 / 已验证 / 已上架：

- Chrome Web Store 已上架（当前未提交、未上架）。
- OpenAI / Anthropic 已真实验证（host permission 已实现，但 live 调用未验证；公开文案只能写"发布前验证中"）。
- hosted AI / 默认托管 Aviso AI 已上线。
- 匿名免费额度已上线。
- 登录 / 订阅 / 支付已上线。
- 截图功能已作为普通用户公开卖点完成验收。
- 当前商店截图 / promo 图片是最终素材。
- 本地模型（Ollama / LM Studio）已支持（registry 仅 OpenAI / Anthropic / 豆包·火山方舟）。
- 复用 ChatGPT / Claude / Gemini 订阅额度、零 API 费用、免 Key（属 v1.0 非范围或未实现）。
- Browser Session、Agent、多 Tab 聚合、语音、全页 DOM 翻译、第三方翻译兜底（均为非范围或未实现）。

可作为已实现表达的当前事实示例：豆包 / 火山方舟连通已通过 V2-004 手动单 provider 测试；BYOK 直连、无后端、无遥测、host_permissions 仅三条 provider 域名。

## 6. 路由与新增页面

- 不要新增 `/login/`、`/pricing/`、checkout、account、quota、hosted AI 或匿名额度入口，**除非用户明确批准重新进入这些未来状态的实现阶段**。
- 不要为未实现的托管 AI / 额度 / 登录 / 订阅流程预埋会让用户以为已上线的入口。

## 7. 高风险动作先停下确认

涉及以下任一项时，**先停下来向用户确认**，不要自行推进：

- `manifest` / `package.json` 权限或 `host_permissions` 变更
- 隐私政策、商店隐私声明、数据流口径变更
- API Key 读取、存储或处理逻辑
- 真实 provider API 调用（含 OpenAI / Anthropic / 豆包的 live 调用与验证）
- 登录、支付、订阅、后端、托管 AI 相关实现
- 普通用户截图入口展示策略或把截图放入商店卖点
- 发布动作：`npm run package` 之外的发布、tag、Chrome Web Store 提交、release workflow 触发
- 任何 Git 提交、push 或远端操作

## 8. 品牌与视觉

- 品牌与视觉必须参考 `docs/brand/README.md` 与 `docs/brand/components/aviso-components.css`，并与 `website/src/css/custom.css` 的现有 token 保持一致（sage / ink / paper oklch 色板、`--radius:14px`、Hanken Grotesk + Space Mono、`--ease`）。
- `docs/brand/` 下的 HTML / CSS / JS 仅为设计参考归档，**不要直接复制进扩展运行时或官网生产代码**；实现应沿用现有 React / Plasmo / Docusaurus 结构落地。

## 9. 设计探索与生产分离

- 不要把设计探索直接写进生产官网文件。
- 设计阶段先输出方案、信息架构或独立草案；得到确认后再改 `website/` 生产文件。

## 10. 改动前后的沟通

- **改动前**：说明将要修改哪些文件、以及大致改什么。
- **改动后**：报告实际改了哪些文件、运行了哪些检查及结果、以及剩余风险或未关闭的门禁。
- 如实报告：测试失败就贴失败输出，跳过的步骤要说明，不夸大完成度。

## 11. 敏感数据红线

- 不要读取、打印或写入：API Key、raw prompt、raw response、私人网页正文、截图内容、含敏感信息的日志。
- 验证 / 性能记录只用脱敏摘要格式（参考 V2-004 / V2-004B 的固定字段与分桶口径）。
- 不向 `chrome.storage`、文件、文档、console 或任何远端写入原始敏感内容。

## 12. 常用验证命令

发布前推荐（不等于真实 Chrome 人工验收，也不等于真实模型 API 验证）：

```bash
npm test
npx tsc --noEmit
npm run build
npm run package
```

`npm run build` 在默认沙箱内可能报 `Operation not permitted`，已知可行路径是沙箱外重跑。`website/` 是独立 Docusaurus 子项目，有自己的 `tsconfig.json`，不纳入根扩展类型检查。

## 13. 当前未关闭的发布门禁（仅供判断，不要写成已完成）

- OpenAI / Anthropic 真实最小调用验证。
- Chrome Web Store 截图 / 描述 / 隐私声明最终一致性。
- 当前商店截图 / promo 图片质量未达最终标准，只能作为占位草案；需要按 BYOK 基础版重做并由 owner 最终确认。
- release tag 与回滚点。
- 最终 API Key 泄漏扫描（商店素材与最终 artifacts 生成后）。
