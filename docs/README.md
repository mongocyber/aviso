# Aviso Project Docs

当前 `docs/` 只做导航和长期事实入口。当前状态不要复制到多个文件：人读状态见根目录 [`STATUS.md`](../STATUS.md)，agent gate 见 [`ai/CURRENT_GATE.md`](./ai/CURRENT_GATE.md)，发布证据见 [`../RELEASE_CHECKLIST.md`](../RELEASE_CHECKLIST.md)。

## 文档入口

### 当前事实文档

- [charter.md](./charter.md)：项目定位、当前范围和边界。
- [prd.md](./prd.md)：当前已实现能力对应的产品需求。
- [tech-spec.md](./tech-spec.md)：当前技术结构、权限、存储和数据流。
- [privacy-and-security.md](./privacy-and-security.md)：当前隐私、安全和敏感数据边界。
- [execution-plan.md](./execution-plan.md)：当前维护执行计划。
- [acceptance-criteria.md](./acceptance-criteria.md)：当前验收标准。

### 版本规划

- [planning/README.md](./planning/README.md)：版本规划、执行进度和归档规则。
- [planning/roadmap.md](./planning/roadmap.md)：产品路线图、版本顺序和跨仓库方向。
- [planning/v0.3/README.md](./planning/v0.3/README.md)：v0.3 hosted AI 历史规划入口。

### 历史归档和决策

- [archive/README.md](./archive/README.md)：历史版本归档规则。
- [archive/v0.2/README.md](./archive/v0.2/README.md)：v0.2 历史规划、执行和过程证据归档。
- [decisions/README.md](./decisions/README.md)：跨版本技术、隐私、权限和商业化决策记录规则。

### Agent 上下文

- [ai/CURRENT_GATE.md](./ai/CURRENT_GATE.md)：当前 agent gate。
- [ai/PROJECT_CONTEXT.md](./ai/PROJECT_CONTEXT.md)：给 Codex / Claude 执行线程读取的仓库身份、协同入口和 stop lines。

### 设计系统

- [design-system/README.md](./design-system/README.md)：设计系统入口、目录分工和当前边界。
- [design-system/design-system.md](./design-system/design-system.md)：颜色、字体、字号、间距、圆角、阴影、动效、图标、Logo 和语气规则。
- [design-system/components.md](./design-system/components.md)：基础组件、适用场景、未来替换位置和暂不抽象范围。
- [design-system/assets/](./design-system/assets/)：已确认可用的 Logo / brand 源资产。

根目录入口：

- [../README.md](../README.md)：项目概览和开发入口。
- [../STATUS.md](../STATUS.md)：当前人读状态。
- [../RELEASE_CHECKLIST.md](../RELEASE_CHECKLIST.md)：内部试用、release candidate 和发布证据清单。
- [../CLAUDE.md](../CLAUDE.md)：长期工作规则。

## 当前文档原则

- 只描述当前已经实现、正在维护和需要验收的功能。
- 需求文档只记录当前版本对应的用户需求、数据需求和验收入口。
- 技术、隐私和工作规则文档用于记录实现边界与维护要求。
- 设计系统文档只记录当前已确认的品牌和组件基础，不代表公开发布、商店上架或 loaded-extension QA 完成。
- 新想法先写入 `planning/inbox.md`；已梳理但不进当前版本的事项写入 `planning/backlog.md`；新版本需求、任务计划和执行进度再写入对应 `planning/vX.Y/`。
- 版本完成后，将对应 planning/status/release summary 归档到 `archive/`，再更新当前事实文档。
