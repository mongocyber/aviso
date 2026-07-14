# Model / Provider Policy

Status: `active`
Updated: 2026-07-10

本文件记录 Aviso 的稳定模型与 provider 规则，不记录逐次调用、实时模型可用性或临时 provider 状态。当前能力与门禁见 [`../STATE.md`](../STATE.md)，路由实现契约见 [`../architecture/provider-routing.md`](../architecture/provider-routing.md)。

## Provider Selection

| 用途 | 选择方式 | Owner |
| --- | --- | --- |
| BYOK AI 请求 | 用户在扩展内选择并配置 provider/model | 用户；Aviso 维护配置与安全边界 |
| hosted AI 请求 | 用户显式选择 hosted path；模型链由 aviso-backend 管理 | aviso-backend owner |
| provider 连接测试 | 用户在 Popup 单次手动触发，使用固定公开短句 | 用户 + Aviso UI |

配置支持不等于真实可用性、质量、速度或发布证明。新 provider 必须评审 host permission、API 兼容、数据处理条款、错误行为、测试和公开说明。

## Data Boundary

| 数据 | BYOK path | hosted path |
| --- | --- | --- |
| API Key | 只发给用户选择的 provider | 不发给 Aviso backend |
| 用户输入/必要页面上下文 | 浏览器直发所选 provider | 经过 Aviso backend 和其上游 provider |
| hosted session | 不使用 | 只发给 Aviso backend |
| 浏览历史/书签/本地候选 | 不因搜索候选自动发送 | 不因搜索候选自动发送 |

Prompt、上下文、图片、工具输出和模型输出都属于数据流。新增数据类型先按 [`../security/data-classification.md`](../security/data-classification.md) 定级，再决定是否允许发送。

## Fallback

- BYOK 不得在用户不知情时跨 provider 发送数据；配置缺失或 provider 失败时应返回可解释错误。
- hosted fallback 由后端模型链负责，必须遵守同一数据边界、成本上限、安全 eval 和用户体验契约。
- fallback 不得绕过 permission、登录、quota、隐私或 owner gate。
- 图片/截图等后端契约不支持的 operation 不得通过模型 fallback 偷渡。

## Rate Limits / Cost / Latency

- BYOK 限额和账单由用户与 provider 的账户关系决定；Aviso 只呈现可解释错误，不承诺额度。
- hosted quota、并发、花费熔断和 provider billing 由 aviso-backend 维护。
- 产品当前不承诺真实 provider p50/p95；速度结论必须来自批准的测量方法和证据。
- 成本或延迟异常时优先停止/降级受影响路径，不通过记录用户正文来换取可观测性。

## Prompt / Model Versioning

- 内置 operation prompt 和请求构造属于行为契约；变化必须带自动化测试和必要的 loaded-extension 验收。
- 用户自定义指令属于本地用户内容，不进入仓库或远端日志。
- hosted system prompt、逻辑模型映射和 provider fallback 由后端仓库持有；前端只消费公开契约。
- Prompt、model ID、tool/message schema 变化需评估 [`evals.md`](./evals.md)、隐私和回滚影响。

## Output Safety

- 模型输出是不可信内容，只展示给用户，不自动当作代码、导航或不可逆操作执行。
- URL、HTML、Markdown 或代码片段必须按普通文本/受控渲染处理，不能获得扩展权限。
- 错误 UI 不显示 API Key、token、raw provider response 或私人页面内容。
- 未来的 agent/tool/browser automation 能力必须先有独立权限、用户确认、最大步骤、停用条件和安全 eval。

## Disable Conditions

出现疑似 secret/页面内容泄露、权限与公开说明不一致、恶意包、hosted 成本失控、provider 重大安全事件或无法解释的跨 provider 路由时，停止继续发布/放量并进入 incident response。恢复前必须完成相关回归与安全 eval、数据边界复核和 owner 批准。
