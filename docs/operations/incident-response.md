# Incident Response

Status: `active`
Updated: 2026-07-10

本文件记录 Aviso 扩展、官网、商店发布和产品级 hosted AI 影响的稳定事故流程。单次事故的时间线、日志和实时指标放在 incident 工单或复盘，不写入 [`../STATE.md`](../STATE.md)。

## Severity

| Severity | 判定标准 | 首次响应目标 | 通知范围 |
| --- | --- | --- | --- |
| `SEV1` | API Key/token/私人页面内容泄露风险、恶意包、广泛不可用或成本失控 | 尽快开始止血，目标 30 分钟内形成 owner 决策 | owner、后端 owner、必要的外部平台/用户沟通 |
| `SEV2` | 核心路径明显降级、部分用户不可用、商店/官网重要口径错误 | 4 小时内开始处理 | owner、相关维护者、支持入口 |
| `SEV3` | 低影响缺陷、有明确 workaround、未触及数据/权限边界 | 2 个工作日内归类 | 维护者 |

以上是内部响应目标，不是公开 SLA。

## Roles

| Role | 职责 |
| --- | --- |
| Incident commander | 定级、指定 owner、决定止血/回滚和升级节奏 |
| Technical lead | 诊断扩展、官网或后端路径并执行获批动作 |
| Communications | 只发布已确认的用户影响、规避方式和更新时间 |
| Scribe | 保存脱敏时间线、证据和决策 |

个人维护场景可由同一人兼任，但必须明确当前角色；后端事故要邀请 aviso-backend owner。

## Response

1. 确认开始时间、影响范围、当前版本、最近变更和问题是否仍扩大。
2. 保护敏感数据：停止收集原始用户内容，撤下不安全的复现步骤，必要时轮换受影响凭证。
3. 使用对应 runbook 止血；无 runbook 时优先停止发布、停止放量或隔离受影响路径。
4. 建立单一 incident 记录，`SEV1`/`SEV2` 活跃期间目标每 30 分钟更新一次。
5. 恢复后验证扩展核心路径、官网、商店文案和后端健康，再进入观察窗口。

## Communication

- 对外只说已确认事实、用户影响、可执行 workaround 和下一次更新时间。
- 不公开猜测性根因，不泄露用户内容、凭证、内部日志或第三方账号信息。
- 涉及隐私、安全或数据处理时，按 [`../security/README.md`](../security/README.md) 升级并评估是否需要平台/用户通知。

## Recovery

- 发布与回滚按 [`../release/README.md`](../release/README.md)。
- hosted AI 后端按后端仓库 runbook；BYOK 与 hosted 路径必须分别验证。
- 恢复优先用户影响，其次处理根因和清理临时措施。
- 无法回滚时，记录 owner 决策并做最小 forward fix。

## Evidence

只保存版本、时间、commit/deployment/store 记录、脱敏错误分类、聚合影响和 owner 决策。严禁保存 API Key、session token、raw prompt/response、页面正文、完整 URL、截图/base64 或剪贴板内容。

## Postmortem

`SEV1`、`SEV2` 或 owner 要求的事件使用 [`postmortem-template.md`](./postmortem-template.md)。行动项必须有 owner、期限和验证方式；只有稳定规则变化回写文档系统。
