# AI Evals

Status: `active`
Updated: 2026-07-10

本文件定义 Aviso 的 AI 行为评测策略。测试/质量命令只在 [`../architecture/testing.md`](../architecture/testing.md) 维护；模型/provider 和数据边界见 [`model-provider-policy.md`](./model-provider-policy.md)；当前门禁状态见 [`../STATE.md`](../STATE.md)。

## Eval 范围

Aviso 当前没有独立的主观回答质量 benchmark 或线上用户内容采样系统。现有自动化主要验证可确定的产品契约：路由、配置、权限、错误处理、隐私边界和扩展交互。任何“回答更好”或“模型更快”的发布结论都需要单独 eval 设计和 owner 认可。

## Offline Eval Sets

| Eval set | 覆盖行为 | 数据来源 | 入口 |
| --- | --- | --- | --- |
| provider routing | BYOK/hosted 选择、模型 ID、配置就绪、错误分类 | synthetic config/payload | `tests/model-provider.test.ts`、`tests/hosted-ai.test.ts` |
| privacy/safety | 连接测试脱敏、截图边界、危险 URL、无 secret 泄露 | synthetic public text | `tests/connectivity-perf-screenshot.test.ts`、`tests/core-utils.test.ts` |
| extension surfaces | 用户主动触发、面板、历史、settings 和本地意图 | synthetic DOM/state | `tests/extension-surface.test.ts`、`tests/conversation-runtime.test.ts`、`tests/popup-settings.test.ts` |
| loaded-extension acceptance | Chrome 中真实 UI、iframe、权限和用户路径 | 固定测试页 + owner 手动步骤 | `tests/manual-test.html`、[`../../RELEASE_CHECKLIST.md`](../../RELEASE_CHECKLIST.md) |

新 AI 行为至少增加：成功样本、边界样本、失败/拒绝样本，以及不会泄露 API Key/私人页面内容的断言。真实用户内容不得直接进入仓库 eval。

## Regression Gates

| Gate | 门槛 | 阻塞级别 | 证据 |
| --- | --- | --- | --- |
| deterministic AI contracts | 相关自动化测试全部通过 | `blocking` | `npm test` |
| type/route compatibility | TypeScript 和 manifest checks 通过 | `blocking` | `npx tsc --noEmit`、`npm run check:manifests` |
| release candidate | 候选包验证通过且 loaded-extension 关键路径被 owner 接受 | `blocking` | `npm run verify:release-candidate` + 发布清单 |
| public wording | 不把配置支持、手动单次结果或候选证据扩大成普遍模型质量/速度结论 | `blocking` | docs-check + owner review |

## Safety Evals

- Prompt injection：网页文本和模型输出不得触发自动浏览、代码执行、支付、提交、删除或权限变化。
- Sensitive data leakage：API Key、session、页面正文、截图/base64、剪贴板和完整 URL 不进入日志、文档或测试快照。
- Permission safety：新 provider/hosted path 必须在调用前校验精确 host permission 和必要配置。
- Failure behavior：未配置、未授权、provider 错误、超时和 hosted session 失效时给出可解释错误，不静默切换数据边界。
- Overclaim：不把本地测试或单一 provider 连接结果写成普遍可用性、质量或延迟保证。

## Human Review

| 场景 | 触发条件 | Reviewer | 处理动作 |
| --- | --- | --- | --- |
| loaded-extension UI | 扩展入口、结果面板、权限或存储变化 | Aviso owner | 按清单 pass / hold |
| provider/model/public copy | 新 provider、默认模型、能力/速度文案变化 | Aviso owner | 对齐证据、隐私和商店口径 |
| 高风险数据流 | 页面正文、截图、剪贴板、OAuth/session 变化 | owner + 对应后端 owner | 通过、修改或阻止发布 |

## Online Metrics / Drift

产品仓库不采集远端用户行为遥测，也不保存线上 prompt/response。可用信号是商店后台、支持反馈、owner 手动 smoke 和 aviso-backend 的脱敏聚合监控。发现质量/安全漂移时，应先增加可复现的 synthetic eval，再决定模型、prompt 或 UI 变化。

## Version Evidence

Prompt/model/provider 变化的证据进入对应测试、ADR、release checklist 和 [`../STATE.md`](../STATE.md) gate；本文件不追加逐次运行流水。
