# Aviso 品牌参考

本目录保存 Aviso 的品牌和组件视觉参考文件，仅作为设计归档和后续样式调整参考，不作为生产代码入口。

## 目录边界

- `reference/`：设计源文件归档区。用于保存定稿前后的 HTML、CSS、tokens、screenshots、uploads 和设计说明，帮助后续还原设计来源；不要把这里的 HTML/CSS/JS 直接作为官网或扩展运行时代码。
- `assets/`：当前品牌 mark 参考素材。这里的 SVG 可作为品牌资产来源，但进入公开网站前仍应复制到 `website/static/img/` 并确认文件、命名和使用场景安全。
- `components/`：组件视觉参考样式和演示脚本。它们用于理解 Popup、浮窗、命令面板、Toast 等 UI 质感，不是扩展生产组件。
- `website/`：Docusaurus 用户文档站目录，位于仓库根目录的 `website/`。官网首页和公开文档应从内部事实源改写，不反向覆盖 `docs/01-07`。
- `src/`：浏览器扩展源码目录。品牌参考文件不应直接导入 `src/`，扩展 UI 如需更新，应沿用现有 React / Plasmo 结构做最小实现。

## 使用方式

后续修改 Popup、页面内浮窗、划词工具栏、命令面板、Toast 等样式前，应先查看本目录中的参考文件，确保视觉语言、组件质感和品牌表达一致。

不要直接把这些参考 HTML、CSS 或 JS 当成运行时代码复制进扩展。实际实现应继续沿用当前项目的 React / Plasmo 组件结构，并把参考样式转化为项目内可维护的组件和样式。

## 已归档参考

- `reference/landing-page-2026-06-01/`：2026-06-01 Aviso 官网落地页设计源文件归档，来自本地下载目录 `Aviso 2`。归档时已将顶层 HTML / Markdown 文件名规范化为小写短横线，保留 `assets/`、`components/`、`screenshots/`、`uploads/` 原目录。

## reference 文案禁用口径（重要）

`docs/brand/reference/` **只能作为视觉、排版、组件氛围参考**，用于还原设计来源、对齐品牌色板/字体/间距/质感。它**不是**官网、Chrome Web Store、PRD 或任何公开文案的事实源。

`reference/landing-page-2026-06-01/` 是历史设计归档（改名前、v0.3 设想阶段的旧叙事），其文案已与当前真实状态冲突。**禁止把 reference 里的任何文案复制、改写或当作事实引用进官网、商店、PRD 或公开材料。**

特别地，下列旧叙事一律不得复用，也不得改写后变相保留：

- 兼容你已有的订阅 / Works with your existing subscription
- ChatGPT Plus / Claude Pro
- 复用订阅额度
- Browser Session / 浏览器会话模式
- no extra API fees / no API costs / 完全没有 API 费用 / 零 API 费用
- 永久免费 / Free forever
- 免 Key
- hosted AI 已上线
- 匿名额度已上线
- 登录 / 订阅 / 支付已上线

### 当前真实状态以这些为准

事实源（不是 reference）：`STATUS.md`、`RELEASE_CHECKLIST.md`、`docs/specs/aviso-v1-public-launch.md`、生产 `website/`。

当前官网真实口径：

- `v0.1 internal dogfood`，BYOK（用户自带 API Key）直连所选 provider。
- 无自建后端、无遥测、无分析 SDK；API Key 本地加密保存。
- OpenAI / Anthropic 尚未真实验证；当前仅豆包 / 火山方舟已用户验证可用。
- 尚未上架 Chrome Web Store。

### v1.0 方向只能作为 planned / roadmap 表达

`docs/specs/aviso-v1-public-launch.md` 里的默认 Aviso AI、匿名免费额度、登录、订阅、支付等是**正式产品方向但尚未实现**。这些只能用 planned / roadmap / coming soon 口径表达，并需带"未上线 / 以发布版本为准"标记；**绝不能写成已实现、已上线或已验证**。reference 里出现的相关老文案不构成"已实现"的依据。

## 公开使用注意

- Aviso 当前口径仍是 `v0.1 internal dogfood / 内部试用版`，不是公开商店发布状态。
- 官网文案不得写成已上架 Chrome Web Store，不得写 OpenAI / Anthropic 已验证，不得暗示 provider 免费。
- API Key 表达保持保守：Key 保存在本地浏览器，用于直连用户选择的 provider。
- `reference/` 中的 screenshots 和 uploads 是设计过程素材，进入 `website/static/img/` 前必须再次确认不包含 API Key、账号信息、私密网页、真实个人数据或不适合公开的浏览器截图。
