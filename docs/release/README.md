# Release

Status: `active`
Updated: 2026-07-19

本文件是 Aviso 产品仓库的稳定发布规则入口。当前版本、商店审核、公开发布和 owner 门禁状态只以 [`../STATE.md`](../STATE.md) 为准；每次发布的证据保留在 [`../../RELEASE_CHECKLIST.md`](../../RELEASE_CHECKLIST.md) 和对应版本规划中。

## 职责与边界

- 本仓库负责扩展候选包、官网、公开文案、Chrome Web Store 流程和产品级发布批准。
- hosted AI 后端的部署、迁移、运行监控和后端回滚由 [`mongocyber/aviso-backend`](https://github.com/mongocyber/aviso-backend) 负责。
- 测试命令和质量门槛只在 [`../architecture/testing.md`](../architecture/testing.md) 维护；本文件不复制第二套测试事实。
- 发布动作、商店提交、生产部署、tag 和 GitHub Release 都是 owner gate。

## 发布层级

| 层级 | 目标 | 入口 | 不能替代的证据 |
| --- | --- | --- | --- |
| 本地开发 | 验证代码、文档和本地供应链基线 | `npm test`、`npm run docs:check`、`npm run supply-chain:check` | loaded-extension 体验、商店状态、fresh registry audit |
| 扩展候选包 | 生成可复核的目录和 zip | `npm run verify:release-candidate` | owner 手动验收、商店后台结果 |
| 官网候选 | 构建中英文静态站点 | `cd website && npm run build` | 生产部署和页面复核 |
| 公开发布 | 商店与官网对外可用 | owner 执行的外部流程 | [`../STATE.md`](../STATE.md) 中全部相关门禁 |

## 候选包与发布流程

1. 以 [`../architecture/testing.md`](../architecture/testing.md) 的变更类型矩阵确定必跑检查。
2. 运行 `npm run supply-chain:check`，确认 package/lock 相对 merge-base 的唯一允许依赖变化、baseline schema、hash 和本地冻结安装语义，再生成候选包并核对 manifest、权限、版本、locale、敏感声明和 zip 内容。
3. 在 Chrome 中加载 `build/canonical-chrome-mv3-prod`，按 [`../../RELEASE_CHECKLIST.md`](../../RELEASE_CHECKLIST.md) 做 owner 手动验收；不要把 Plasmo 默认输出 `build/chrome-mv3-prod` 当作规范候选包。
4. 对齐官网、隐私政策、数据权限说明和商店文案；状态事实仍只写入 [`../STATE.md`](../STATE.md)。
5. owner 明确批准后，才可执行商店提交、生产部署、tag 或 GitHub Release。
6. 外部审核或发布结果回写 [`../STATE.md`](../STATE.md) Gates，并链接脱敏证据。

当前仓库没有可证明的自动发布流水线。若候选包由本地生成，必须记录命令、commit、包版本、人工复核和 owner 批准，不能把它写成 CI 产物。

## 配置与数据迁移

- 扩展存储键、schema、默认值或兼容逻辑变化，必须提供旧数据读取、升级和回退测试。
- 不得通过卸载、清空 storage 或要求用户重新填写 API Key 来代替迁移方案。
- 官网内容迁移不得改变产品能力、隐私边界或商店状态口径。
- 后端数据库迁移不在本仓库执行，必须转到后端仓库的 release 文档。

## 渐进发布

- 商店支持分阶段发布时，先用最小可行比例观察崩溃、核心路径、权限投诉和支持反馈，再扩大范围。
- Aviso 不依赖远端遥测；观察证据只能来自 owner 手动验证、商店后台、支持入口和后端自身的脱敏监控。
- hosted AI 可选路径出现风险时，产品仓库负责用户文案和扩展侧处置，后端仓库负责运行时止血。

## 回滚与止血

| 场景 | 首选动作 | 验证 |
| --- | --- | --- |
| 候选包有问题、尚未提交 | 停止提交，修复后重新生成候选包 | 完整候选检查 + loaded-extension smoke |
| 商店审核中的包有问题 | owner 在商店后台停止或替换提交；若外部流程不支持即时回退，记录限制 | 后台状态 + 新包证据 |
| 已分发扩展出现严重问题 | 停止继续放量，准备最小修复版本；必要时由 owner 决定下架或禁用相关路径 | 核心用户路径 + 支持反馈 |
| 官网发布异常 | 回退到已知可用部署或重新部署上一稳定 commit | 中英文页面、文档和反馈入口 |
| hosted AI 后端异常 | 按后端 incident/runbook 止血，扩展侧保持 BYOK 边界和准确提示 | BYOK 路径 + 后端健康证据 |

回滚优先恢复用户影响，不在发布事故中扩大功能范围。无法立即回退时，必须记录 owner 决策、临时缓解和下一次更新时间。

## 发布证据与 Owner Gate

最少证据：commit、版本、检查结果、供应链基线 JSON 语义、merge-base package/lock base diff 语义、候选包路径、manifest/权限复核、loaded-extension 结果、官网构建结果、隐私/商店文案对账、fresh registry audit 外部门禁状态、回滚方案和 owner 批准。CODEOWNERS/branch protection 的实际强制是外部 owner gate；同 PR 只刷新 baseline policy/schema 不等于批准。当前状态写入 [`../STATE.md`](../STATE.md)，执行流水留在发布清单或外部系统。
