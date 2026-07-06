# Aviso Project Docs

当前 `docs/` 按用途分成几个入口：

1. **当前事实文档**：只描述已经实现、正在维护和需要验收的真实产品状态。
2. **版本规划文档**：描述尚未实现或正在推进的版本。
3. **历史归档文档**：保存已完成版本的规格、执行记录、发布总结和关键决策。
4. **决策与执行上下文**：保存跨版本决策、agent 入口和 issue 执行合同。
5. **设计系统文档**：沉淀 Aviso 当前可复用的品牌、视觉 token、基础组件和迁移规则。

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
- [planning/inbox.md](./planning/inbox.md)：新想法、新需求和未定范围事项的入口。
- [planning/backlog.md](./planning/backlog.md)：已梳理但暂不进入当前版本的需求池。
- [planning/roadmap.md](./planning/roadmap.md)：产品路线图、版本顺序和跨仓库方向。
- [planning/v0.3/README.md](./planning/v0.3/README.md)：v0.3 托管 AI 规划入口。

### 历史归档和决策

- [archive/README.md](./archive/README.md)：历史版本归档规则。
- [archive/v0.2/README.md](./archive/v0.2/README.md)：v0.2 历史规划、执行和过程证据归档。
- [decisions/README.md](./decisions/README.md)：跨版本技术、隐私、权限和商业化决策记录规则。

### Agent 上下文

- [ai/PROJECT_CONTEXT.md](./ai/PROJECT_CONTEXT.md)：给 Codex / Claude 执行线程读取的仓库身份、当前边界和 v0.3 协同入口。

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
- 新想法先写入 `planning/inbox.md`；已梳理但不进当前版本的事项写入 `planning/backlog.md`；新版本需求、任务计划和执行进度再写入对应 `planning/vX.Y/`。
- 版本完成后，将对应 planning/status/release summary 归档到 `archive/`，再更新当前事实文档。
