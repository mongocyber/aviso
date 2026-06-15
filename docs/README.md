# Aviso Project Docs

当前 `docs/` 分成四层：

1. **当前事实文档**：只描述已经实现、正在维护和需要验收的真实产品状态。
2. **版本规划文档**：描述尚未实现或正在推进的下一个版本。
3. **历史归档文档**：保存已完成版本的规格、执行记录、发布总结和关键决策。
4. **设计系统文档**：沉淀 Aviso 当前可复用的品牌、视觉 token、基础组件和迁移规则。

当前事实文档不能混入未来版本功能；未来版本应先进入 `planning/`，完成后再更新当前事实文档并归档旧版本记录。

## 文档入口

### 当前事实

- [01_PROJECT_CHARTER.md](./01_PROJECT_CHARTER.md)：项目定位、当前范围和边界。
- [02_PRD.md](./02_PRD.md)：当前已实现能力对应的产品需求。
- [03_TECH_SPEC.md](./03_TECH_SPEC.md)：当前技术结构、权限、存储和数据流。
- [07_PRIVACY_AND_SECURITY.md](./07_PRIVACY_AND_SECURITY.md)：当前隐私、安全和敏感数据边界。
- [EXECUTION_PLAN.md](./EXECUTION_PLAN.md)：当前维护执行计划。
- [ACCEPTANCE_CRITERIA.md](./ACCEPTANCE_CRITERIA.md)：当前验收标准。

### 版本规划

- [planning/README.md](./planning/README.md)：版本规划、执行进度和归档规则。
- [planning/design-system-migration-preview.html](./planning/design-system-migration-preview.html)：设计系统迁移预览记录。
- [planning/v0.2-fast-open-provider-spec.md](./planning/v0.2-fast-open-provider-spec.md)：v0.2 需求规格草案。
- [planning/v0.2-issue-plan.md](./planning/v0.2-issue-plan.md)：v0.2 issue 拆分和执行顺序。
- [planning/v0.2-status.md](./planning/v0.2-status.md)：v0.2 当前进度和证据记录。
- [planning/v0.2-manual-acceptance.html](./planning/v0.2-manual-acceptance.html)：v0.2 owner 人工验收表。
- [planning/v0.2-wxt-migration-plan.md](./planning/v0.2-wxt-migration-plan.md)：v0.2 WXT 迁移计划和依赖安排。
- [planning/v0.2-provider-architecture-preflight.md](./planning/v0.2-provider-architecture-preflight.md)：V02-001 provider 架构预检草案、权限矩阵和停线条件。
- [planning/v0.2-wxt-migration-preflight.md](./planning/v0.2-wxt-migration-preflight.md)：V02-WXT-001 WXT 迁移预检草案、manifest parity 和 loaded-extension QA 计划。
- [planning/v0.2-provider-config-contract.md](./planning/v0.2-provider-config-contract.md)：V02-003 provider config schema、UI 状态、路由、存储和连接测试合同。
- [planning/v0.2-wxt-migration-closeout.md](./planning/v0.2-wxt-migration-closeout.md)：V02-WXT-003 runtime build 证据和 V02-WXT-004 自动 package / manifest parity 记录。
- [planning/v0.2-speed-baseline.md](./planning/v0.2-speed-baseline.md)：V02-006 等待态、本地 summary-only TTFT 方法和 reasoning-control gate。
- [planning/v0.2-command-palette-local-intent.md](./planning/v0.2-command-palette-local-intent.md)：V02-007 本地确定性候选、confirm-first 行为和 unsafe URL blocking 记录。

### 历史归档和决策

- [archive/README.md](./archive/README.md)：历史版本归档规则。
- [decisions/README.md](./decisions/README.md)：跨版本技术、隐私、权限和商业化决策记录规则。

### 设计系统

- [design-system/README.md](./design-system/README.md)：设计系统入口、目录分工和当前边界。
- [design-system/design-system.md](./design-system/design-system.md)：颜色、字体、字号、间距、圆角、阴影、动效、图标、Logo 和语气规则。
- [design-system/components.md](./design-system/components.md)：基础组件、适用场景、未来替换位置和暂不抽象范围。
- [design-system/assets/](./design-system/assets/)：已确认可用的 Logo / brand 源资产。

根目录还保留：

- [../README.md](../README.md)：项目概览和开发入口。
- [../STATUS.md](../STATUS.md)：当前状态。
- [../RELEASE_CHECKLIST.md](../RELEASE_CHECKLIST.md)：内部试用验收清单。
- [../CLAUDE.md](../CLAUDE.md)：长期工作规则。

## 编号说明

当前文档保留历史编号，`04`、`05`、`06` 对应的旧规划文档已随过时规划移除或归档。为避免破坏历史引用，本轮不重命名现有文件。

## 当前文档原则

- 只描述当前已经实现、正在维护和需要验收的功能。
- 需求文档只记录当前版本对应的用户需求、数据需求和验收入口。
- 技术、隐私和工作规则文档用于记录实现边界与维护要求。
- 设计系统文档只记录当前已确认的品牌和组件基础，不代表公开发布、商店上架或 loaded-extension QA 完成。
- 新版本需求、任务计划和执行进度先写入 `planning/`。
- 版本完成后，将对应 planning/status/release summary 归档到 `archive/`，再更新当前事实文档。
