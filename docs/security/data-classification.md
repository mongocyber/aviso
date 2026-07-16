# Data Classification

Status: `active`
Updated: 2026-07-10
Owner: Aviso owner
Last reviewed: 2026-07-10

本文件把 [`../STATE.md`](../STATE.md) 和 [`../privacy-and-security.md`](../privacy-and-security.md) 的数据边界转成稳定处理规则。

## Levels

| Level | 定义 | Aviso 示例 | 默认处理 |
| --- | --- | --- | --- |
| `public` | 可公开发布 | README、官网文案、商店素材、公开文档 | 可进入仓库和公开平台 |
| `internal` | 团队内部但不含用户秘密 | 未发布路线图、候选包证据、内部 QA 摘要 | 私有仓库/受控协作渠道 |
| `confidential` | 用户内容或可识别使用信息 | 页面正文、选区、截图、剪贴板、本地历史、反馈文本/图片 | 最小处理、HTTPS、禁止公开日志 |
| `restricted` | 凭证或可直接造成账号/资金影响 | BYOK API Key、hosted session、OAuth token、部署 secret | 专用存储、默认不记录、不复制到聊天/issue |

## Storage Rules

| Level | 允许 | 禁止 |
| --- | --- | --- |
| `public` | Git、官网、商店素材 | 伪装成公开事实的未验证状态 |
| `internal` | 私有 Git 历史、脱敏发布/QA 记录 | 公共页面、构建包内无关文件 |
| `confidential` | 用户浏览器本地存储或获批的反馈处理服务 | 文档、console、telemetry、公开 issue、测试快照 |
| `restricted` | `chrome.storage.local` 指定 secret/session key 或平台 secret store | sync storage、仓库、日志、截图、聊天、fixture、release artifact |

## Transit Rules

- `public`：标准 HTTPS 或仓库分发。
- `internal`：认证后的 Git/协作平台，证据必须脱敏。
- `confidential`：只在用户主动触发且功能必需时，通过 HTTPS 发送给用户选择的 provider 或 hosted path。
- `restricted`：API Key 只发给对应 BYOK provider；hosted session 只发给 Aviso backend；不得跨用途复用。

## Logging Rules

- `confidential` 默认不记录原文；只允许必要的长度、阶段、错误分类和聚合状态。
- `restricted` 不进入日志、文档、测试、截图或分析系统。
- 测试只使用 synthetic 数据；真实用户样本进入测试/eval 前必须获得授权并完成脱敏。
- 完整 URL、页面正文、raw prompt/response、截图/base64 和剪贴板内容不作为调试证据。

## Retention

| 数据 | Level | 位置 | 稳定规则 |
| --- | --- | --- | --- |
| BYOK API Key | `restricted` | 本地 `contextai_api_keys` | 用户管理；不进入 sync 或 Aviso 后端 |
| 非敏感设置 | `internal` | `chrome.storage.sync/contextai_settings` | 由用户/Chrome 生命周期管理 |
| 本地 AI 历史 | `confidential` | `chrome.storage.local/contextai_history` | 仅本地；不进入远端日志 |
| hosted session/account state | `restricted/confidential` | 本地 hosted storage | 仅用于 hosted path；退出逻辑按产品契约 |
| 运行时短缓存 | `confidential` | 内存 | 不持久化，随运行时失效 |
| 官网反馈 | `confidential` | Vercel Function → Resend/维护者邮箱 | 只含用户主动提交字段；不得提交 secret 或未脱敏内容 |
| hosted AI 元数据 | `confidential` | aviso-backend | 保留和删除由后端隐私文档负责 |

## Deletion

- 本地数据删除必须覆盖对应 Chrome storage key，并避免误删独立的 BYOK/hosted 配置。
- 反馈和 hosted 元数据的删除请求必须转到持有该数据的系统/owner。
- 无法立即物理删除的备份或第三方系统，需要说明保留窗口和访问限制。
- 删除证据只保留工单编号和结果，不复制被删除内容。
