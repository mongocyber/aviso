# Aviso Design System

Aviso 设计系统用于沉淀当前 extension UI 的品牌、视觉 token、基础组件和后续迁移规则。它不是发布状态文档，也不代表 Chrome Web Store 审核、公开上架或 loaded-extension QA 已完成。

## 入口

- [design-system.md](./design-system.md)：颜色、字体、字号、间距、圆角、阴影、动效、图标、Logo 和语气规则。
- [components.md](./components.md)：当前新增基础组件、适用场景、未来替换位置和暂不抽象范围。
- [assets/](./assets/)：已确认可用的 Logo / brand 源资产。

## 分工

- `docs/design-system/`：设计系统文档和可审查的品牌资产说明。
- `src/styles/aviso.tsx`：运行时代码的 token、主题解析、`AvisoIcon` 和 `AvisoMark` 真源。
- `src/components/`：复用型基础组件。当前只新增组件，不批量替换既有业务 UI。

## 当前边界

- 设计系统不维护发布状态；当前产品状态以 [`../../STATUS.md`](../../STATUS.md) 为准。
- 不新增权限、manifest、host permissions、依赖、后台服务、遥测或商店发布材料。
- 不迁入 `uploads/`、`screenshots/`、`studio/`、Landing Page 历史变体或外部 `CLAUDE.md`。
- 商店截图、官网文案和公开卖点必须另走事实复核，不能直接由设计包迁入。
