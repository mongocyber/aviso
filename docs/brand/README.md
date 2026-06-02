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

## 公开使用注意

- Aviso 当前口径仍是 `v0.1 internal dogfood / 内部试用版`，不是公开商店发布状态。
- 官网文案不得写成已上架 Chrome Web Store，不得写 OpenAI / Anthropic 已验证，不得暗示 provider 免费。
- API Key 表达保持保守：Key 保存在本地浏览器，用于直连用户选择的 provider。
- `reference/` 中的 screenshots 和 uploads 是设计过程素材，进入 `website/static/img/` 前必须再次确认不包含 API Key、账号信息、私密网页、真实个人数据或不适合公开的浏览器截图。
