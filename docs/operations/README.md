# Operations

Status: `active`
Updated: 2026-07-10

本文件定义 Aviso 产品仓库的稳定运维职责。当前发布状态与门禁见 [`../STATE.md`](../STATE.md)；实时运行信息留在商店、部署、支持和后端监控系统，不写入 STATE。

## Ownership

| 范围 | Primary owner | 备援/升级 |
| --- | --- | --- |
| 扩展包、权限、商店文案和发布 | Aviso owner | 发布暂停并进入 incident 流程 |
| 官网与反馈入口 | Aviso owner | 回退部署或暂时关闭入口 |
| hosted AI 后端运行 | aviso-backend owner | 后端 operations / incident 文档 |
| 用户沟通与支持 | Aviso owner | 官网、支持入口和商店更新 |

本仓库没有记录正式 on-call 轮值；未指定代理时由 owner 担任 incident commander。

## SLI / SLO

当前产品仓库不保存远端用户行为遥测，也没有可验证的数字化产品 SLO。发布后优先观察以下 SLI 候选，任何数值目标都需 owner 单独批准后再写入：

| 用户旅程/系统面 | SLI 候选 | 证据入口 |
| --- | --- | --- |
| 扩展安装与启动 | 安装后核心入口可见、无阻塞错误 | loaded-extension checklist / 商店后台 |
| BYOK 核心路径 | 用户主动调用成功、错误可解释 | 手动验收 / 支持反馈 |
| 官网 | 首页、文档、隐私页、反馈页可访问 | Vercel 部署与页面检查 |
| hosted AI | 登录、会话、流式请求可用 | 后端 dashboard / smoke / runbook |

数字指标和实时达成率不得写入本文件；后端 SLO 由后端仓库维护。

## Dashboards 与 Alerts

| 入口 | 用途 | 当前规则 |
| --- | --- | --- |
| Chrome Web Store 后台 | 审核、崩溃、版本和用户反馈 | 仅 owner 访问；结果回写 STATE gate |
| Vercel 项目后台 | 官网部署与运行错误 | 不记录 secret 或用户提交正文 |
| 支持/反馈入口 | 用户问题与隐私投诉 | 按严重度进入 incident response |
| aviso-backend 监控 | hosted AI 错误、延迟、成本和滥用 | 由后端仓库维护 |

产品仓库没有已验证的自动 pager。新增告警必须可行动、指向 runbook，并确保不收集页面正文、prompt、response、完整 URL、API Key、token 或截图内容。

## Runbooks

- 通用模板：[`runbook-template.md`](./runbook-template.md)。
- 事故响应：[`incident-response.md`](./incident-response.md)。
- 复盘模板：[`postmortem-template.md`](./postmortem-template.md)。
- 发布与回滚：[`../release/README.md`](../release/README.md)。
- 后端故障：使用 [`aviso-backend` 的运维文档](https://github.com/mongocyber/aviso-backend/tree/main/docs/operations)。

新增高严重度告警或外部依赖时，同一 PR 必须补诊断、止血、恢复、验证和升级路径。

## Backup / Restore

| 数据/资产 | 恢复来源 | 边界 |
| --- | --- | --- |
| 源码、官网和商店资产 | Git 历史与已审 PR | 不把构建目录当唯一备份 |
| 官网部署 | 已知可用 commit / Vercel deployment | 回退需 owner 批准 |
| 用户本地设置、历史和 BYOK Key | Chrome profile / 用户自己的备份 | Aviso 项目方不持有、不能远端恢复 |
| hosted AI 元数据 | 后端存储与备份策略 | 本仓库不执行恢复 |

备份存在不等于恢复能力已验证。涉及真实用户数据或生产系统的恢复演练由对应 owner 执行并记录脱敏证据。

## Capacity / Cost

- BYOK 模型成本由用户与所选 provider 的账户关系承担。
- hosted AI 的额度、provider 花费、熔断和容量由后端仓库负责。
- 官网和商店固定成本由 owner 在外部平台管理；本文件不复制账单流水。
- 成本或容量异常达到用户影响时，按 [`incident-response.md`](./incident-response.md) 升级。

## On-call / Escalation

1. 确认用户影响、当前版本、最近变更和受影响路径。
2. 扩展/官网问题由 Aviso owner 处理；后端问题立即转交 aviso-backend owner。
3. 涉及隐私、API Key、token、页面内容或恶意包时直接按 `SEV1` 处理。
4. 稳定后只把长期规则变化回写 release / operations / security / ai 文档；事件流水进入复盘。
