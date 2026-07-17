# Testing & Quality Strategy

Status: `active`
Updated: 2026-07-10

本文件是 Aviso 唯一的测试/质量策略入口。release、operations、security 和 ai 文档只链接这里，不维护第二套命令或门槛。

## 测试政策

- 修 bug 时，能稳定复现就先写失败回归测试，再修复；无法自动化时必须记录原因、手动步骤和 owner。
- 行为、权限、存储、provider route、公开文案或数据流变化必须附带对应测试/验收。
- 纯重构以相关测试全绿为准；不以“只是重构”为由跳过现有检查。
- 默认测试不访问真实 provider、OAuth、商店后台或生产服务，不读取真实 API Key/token。
- 发布门禁证据写入 [`../STATE.md`](../STATE.md) 或 [`../../RELEASE_CHECKLIST.md`](../../RELEASE_CHECKLIST.md)，不在本文追加运行流水。

## 测试层级

| 层级 | 目的 | 位置 | 默认命令 | 门槛 |
| --- | --- | --- | --- | --- |
| unit | 纯逻辑、边界、错误和存储辅助 | `tests/**/*.test.ts` | `npm test` | 相关测试全部通过 |
| integration | background/content/popup/hosted route 协作 | 同一 Node test suite 的跨模块用例 | `npm test` | 相关路径全部通过 |
| contract | manifest、host permission、版本、frontend/backend message 约束 | manifest scripts + hosted/provider tests | `npm run check:manifests`、`npm test` | 无未解释差异 |
| package | WXT/Plasmo build、规范候选包、跨表面发布声明扫描 | `scripts/verify-release-candidate.mjs` | `npm run verify:release-candidate` | 全部子门禁通过 |
| website | 中英文官网、文档和反馈页构建 | `website/` | `cd website && npm run build` | build 成功、链接/文案复核 |
| manual | Chrome loaded-extension、原生菜单和用户路径 | `tests/manual-test.html` + release checklist | owner 手动执行 | 关键路径被接受或明确 hold |

当前没有独立浏览器 E2E/视觉回归框架；loaded-extension 手动验收不能被普通 unit test 替代。

## 变更类型 → 必需测试

| 变更类型 | 必需测试 | 可接受的不适用说明 |
| --- | --- | --- |
| bug fix | 失败回归测试 + 相关 suite | 浏览器/商店外部行为无法自动化，并附手动复现证据 |
| 新行为/UI | unit/integration + loaded-extension；网站变化另跑 website build | 无用户可见路径并说明原因 |
| API/message/schema | frontend contract/route tests + 后端契约对账 | 纯内部类型重命名且无 runtime 影响 |
| manifest/permission/storage | manifest checks + storage/route tests + privacy/security review + loaded-extension | 只改文档且未改变包 |
| provider/model/prompt | provider/hosted tests + [`../ai/evals.md`](../ai/evals.md) + owner review | 只改注释且无行为变化 |
| release/package | package/zip/secret/manifest checks + loaded-extension + rollback 说明 | 非发布路径且不触及构建/包 |
| website/public copy | docs check + website build + STATE/隐私/商店口径对账 | 内部文档且不被网站包含 |
| observability/security | 脱敏/权限/secret scan 或明确人工验证 | 无数据、权限、日志或依赖影响 |
| performance-critical | 可复现 benchmark/summary-only 计时 + 结果边界 | 无性能路径变化 |

## 测试目录 / 命令

| 文件/目录 | 覆盖什么 | 命令 |
| --- | --- | --- |
| `tests/core-utils.test.ts` | 工具、storage 邻接逻辑、i18n、URL/文本 | `npm test` |
| `tests/model-provider.test.ts` | provider registry/config/model/routing | `npm test` |
| `tests/hosted-ai.test.ts` | hosted session、route、错误和边界 | `npm test` |
| `tests/popup-settings.test.ts` | Popup settings、默认值和用户配置 | `npm test` |
| `tests/extension-surface.test.ts` | 可见入口和 content-script 契约 | `npm test` |
| `tests/conversation-runtime.test.ts` | 结果面板、history、follow-up | `npm test` |
| `tests/connectivity-perf-screenshot.test.ts` | 连接测试、summary-only timing、截图隐私 | `npm test` |
| `tests/unit.test.ts` | 共享逻辑回归 | `npm test` |
| `tests/manual-test.html` | Chrome 手动 loaded-extension 验收 | 按 release checklist |
| `website/` | 官网与公开文档 | `cd website && npm run build` |

`scripts/verify-release-candidate.mjs` 的发布声明扫描覆盖 `docs/STATE.md`、release evidence、source/final manifests、官网中英文文案、隐私/权限文档、store listing 和 reviewer notes；扫描输出必须包含文件、行号、匹配声明和原因。

## Fixture 与测试数据

- 默认使用 synthetic 公开短句、fake config、fake token 和本地测试页。
- 禁止复制真实 API Key、OAuth/session token、私人页面正文、完整 URL、截图/base64、剪贴板或 raw provider response。
- 测试中的 sentinel secret 必须明显为 fake，失败输出也不能泄露真实环境。
- 当前没有 golden/snapshot 目录；未来引入时必须说明 owner、更新命令和敏感数据边界。

## 真实网络 / 凭证隔离

- `npm test`、typecheck、docs check、manifest check、build/package 默认不得调用真实 provider/OAuth/商店 API。
- Provider 连接测试只能由用户在 Popup 主动触发，使用固定公开短句并输出脱敏摘要。
- hosted production/staging 验证属于 owner-approved 外部门禁，在 aviso-backend runbook 中执行。
- 凭证只从用户本地或平台 secret 注入，不写入仓库、日志、测试快照或失败附件。

## 慢测试

- 快速默认集：`npm run docs:check && npm test && npx tsc --noEmit`。
- build/package/website/release-candidate 属于慢检查，按变更类型或发布前运行。
- 当前没有慢测试 marker 或 nightly job；不能用自动重试掩盖稳定失败。

## Flaky Test

- flaky 测试不得长期留在主门禁并靠重试变绿。
- 发现后建立 issue，记录 owner、根因假设和修复期限；临时跳过必须在 PR 中显式说明。
- 重新启用以根因修复和连续本地/CI 通过证据为准。

## 覆盖率 / 关键路径

当前没有仓库级数字覆盖率门槛。以下关键路径必须有自动化或 owner 手动保护：BYOK/provider config、hosted route/session、permission/manifest、storage/data boundary、危险 URL、结果面板/history、候选包和中英文官网。

数字覆盖率不能替代权限、隐私、loaded-extension、商店文案和回滚验证。

## 手动 / 视觉 / 无障碍

- UI 变化至少验证 Popup、右键/划词/命令面板、结果面板、iframe（如相关）、中文/英文、键盘关闭/焦点和错误状态。
- 当前没有自动视觉 diff；截图只能作为脱敏验收证据，不能包含 API Key 或私人页面内容。
- 无障碍至少检查键盘可达、可见焦点、文本/图标标签、色彩对比和缩放；没有完整自动门禁时要在 PR 说明手动范围。

## 性能 / 安全测试

- 性能：使用现有 summary-only timing 与针对性 benchmark；不得记录输入正文或宣称未测量的真实 provider p50/p95。
- 安全：`npm audit --audit-level=high`、secret scan、manifest/permission check、zip 内容复核；不能修复的依赖风险需要 owner 决策。
- `docs:check` 不替代 SAST、依赖审计、secret scan 或 Chrome 商店审核。

## 发布门禁

| Gate | 必需证据 | Owner |
| --- | --- | --- |
| docs/unit/type | 对应命令输出或 CI 链接 | PR author |
| candidate package | `npm run verify:release-candidate` + 包路径/版本 | PR author + owner |
| loaded-extension | release checklist 的手动结果 | Aviso owner |
| privacy/security | 权限、数据、secret、依赖复核 | Aviso owner |
| website/public copy | website build + STATE/商店/隐私对账 | Aviso owner |
| rollback | [`../release/README.md`](../release/README.md) 对应方案 | Aviso owner |
| AI eval | [`../ai/evals.md`](../ai/evals.md) 的相关回归/人工审核 | Aviso owner |
