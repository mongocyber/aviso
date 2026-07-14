# Threat Model

Status: `active`
Updated: 2026-07-10
Owner: Aviso owner
Last reviewed: 2026-07-10

本文件描述稳定威胁与控制；当前实现和发布门禁见 [`../STATE.md`](../STATE.md)，详细数据流见 [`../privacy-and-security.md`](../privacy-and-security.md)。

## Assets

| Asset | 级别 | 主要影响 |
| --- | --- | --- |
| BYOK API Key | `restricted` | 被盗用、产生费用、访问 provider 账户能力 |
| hosted session / OAuth state | `restricted` | 账号冒用、额度盗刷 |
| 页面正文、选区、截图、剪贴板 | `confidential` | 私人内容泄露 |
| 本地 AI 历史和自定义指令 | `confidential` | 用户内容和工作习惯泄露 |
| 扩展包、manifest、更新渠道 | `internal` | 供应链攻击、权限扩大、恶意更新 |
| 官网反馈内容和上传图片 | `confidential` | 用户提交信息泄露或恶意文件处理 |

## Trust Boundaries

| Boundary | 不可信侧 | 可信侧/控制 |
| --- | --- | --- |
| 网页主世界 → content script | 任意页面脚本和 DOM | isolated world、消息校验、用户主动触发 |
| content script → background | 页面上下文和用户输入 | operation/payload 校验、最小数据传递 |
| 扩展 → BYOK provider | 公网和第三方服务 | 精确 host permission、用户配置、HTTPS |
| 扩展 → Aviso backend | 公网、OAuth/provider 依赖 | 精确 backend host、session、后端契约 |
| 源码 → 候选包 → 商店 | 依赖和构建工具链 | lockfile、测试、secret scan、包内容复核、owner gate |
| 官网反馈 → Vercel/Resend | 用户文本和图片 | 输入限制、最小收集、不得提交 secret 的公开提示 |

## Threats

| Threat | 场景 | 影响 | 当前控制 | 残余风险 |
| --- | --- | --- | --- | --- |
| 本地 Key 暴露 | 浏览器 profile 或设备被读取 | provider 盗用 | local-only、非 sync、非明文、禁止日志 | 受控设备仍可读取；需如实说明 |
| 过度收集页面内容 | 无关正文、URL、截图进入请求/日志 | 隐私泄露 | 用户主动触发、最小上下文、禁止持久化和远端日志 | provider 仍处理本次请求内容 |
| Prompt injection | 网页文本诱导模型输出错误指令 | 误导用户、未来自动化风险 | 输出不自动执行；当前无自主浏览/工具执行 | 用户仍需判断模型输出 |
| 权限扩大 | 新功能请求广域 host 或浏览器权限 | 攻击面和商店风险扩大 | stop line、manifest checks、owner review | 第三方依赖或代码缺陷仍可能滥用现有权限 |
| hosted session 被盗 | token 被复制或泄露 | 额度盗刷、账号冒用 | 本地敏感存储、[后端 session hash/revoke](https://github.com/mongocyber/aviso-backend/blob/main/apps/backend/src/auth/session.ts)、日志禁令 | 受控设备和第三方 OAuth 风险 |
| 构建链污染 | npm 依赖或本地构建产物被篡改 | 恶意扩展包 | 锁文件、审计、secret scan、zip/manifest 复核 | 尚无可证明的签名/可复现 CI 发布链 |
| 公开文案漂移 | 网站、商店、隐私说明与包不一致 | 用户误导、审核/合规风险 | STATE 唯一事实源、docs-check include、发布对账 | 外部后台内容仍需 owner 手动核对 |
| 反馈入口滥用 | 恶意上传、敏感内容或垃圾请求 | 数据/成本/支持风险 | 最小字段、用户警示、平台限制 | 外部服务和人工处理仍有风险 |

## Mitigations

- 输入和消息：校验来源、operation、URL scheme、payload 大小和必要字段。
- 权限：保持最小 permission/host permission；任何扩大都需 owner 审批和公开说明。
- 数据：按 [`data-classification.md`](./data-classification.md) 处理；restricted 默认不进日志和测试。
- 输出：模型输出只展示给用户，不自动执行代码、导航、支付、提交或删除动作。
- 供应链：固定依赖、审计、构建包扫描、manifest 对账和手动 loaded-extension 验证。

## Residual Risks

| Risk | 接受/关闭条件 | 复查触发 |
| --- | --- | --- |
| 本地浏览器 profile 可读时 Key 可被恢复 | 产品文案持续如实说明；未来保护方案单独评审 | storage/crypto 变化或真实事件 |
| 第三方 provider 处理请求内容 | 用户选择、公开披露、provider 条款对齐 | 新 provider 或数据流变化 |
| 构建工具链依赖审计项 | owner 风险接受、升级/隔离方案或上游修复 | 每次公开候选 |
| 无远端产品遥测导致检测依赖人工信号 | 支持/商店/后端分层观察，避免为监控扩大隐私收集 | 公开发布或 SLO 决策 |

## Review Triggers

新增 provider、host permission、OAuth/session、远端数据流、反馈字段、浏览器自动化、工具调用、支付、遥测、构建/发布链或发生相关事故时，必须复查本文件。
