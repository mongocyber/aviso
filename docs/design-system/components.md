# Aviso Components

Updated: 2026-06-12

本页记录本轮新增的基础组件和后续迁移规则。当前只建立可复用基础件，不批量替换 toolbar、floating、command、clipboard、double-click-menu 或 popup 的既有业务 UI。

## 新增组件

| 组件 | 路径 | 用途 |
| --- | --- | --- |
| `AvisoLogo` | `src/components/brand/AvisoLogo.tsx` | Mark、wordmark、horizontal / vertical lockup 的基础品牌组件。 |
| `AvisoButton` | `src/components/ui/AvisoButton.tsx` | 基础按钮，支持 `variant`、`size`、`icon`、`disabled`。 |
| `AvisoIconButton` | `src/components/ui/AvisoIconButton.tsx` | 纯图标按钮，要求 `aria-label`，适合关闭、保存、复制等工具按钮。 |
| `AvisoPanel` | `src/components/ui/AvisoPanel.tsx` | 通用浮层面板，支持 header、title、meta、footer 和紧凑模式。 |
| `AvisoMenuItem` | `src/components/ui/AvisoMenuItem.tsx` | 菜单项基础件，支持 icon、description、active、danger、disabled。 |
| `AvisoToast` | `src/components/ui/AvisoToast.tsx` | 通用 Toast 壳，支持状态、标题、详情、操作按钮和计时条。 |
| barrel exports | `src/components/index.ts` | 后续引用入口。 |

## API 原则

- 组件 API 保持小而稳定：`variant`、`size`、`icon`、`children`、`onClick`、`disabled`、`style`。
- 组件复用 `src/styles/aviso.tsx`，不硬拷贝外部 CSS。
- 组件内部使用 inline style，保持与现有 content script / popup 写法兼容。
- 不绑定具体业务消息、provider、storage、权限或 Chrome API。
- 不在本轮替换现有业务 UI，避免和其他线程冲突。

## 未来可逐步替换的位置

| 现有文件 | 未来候选 |
| --- | --- |
| `src/contents/toolbar.tsx` | 划词工具条按钮可逐步替换为 `AvisoButton`；内联翻译卡片可拆成后续专用组件。 |
| `src/contents/double-click-menu.tsx` | 菜单项可逐步替换为 `AvisoMenuItem`；菜单容器可后续抽 `AvisoMenuSurface`。 |
| `src/contents/floating.tsx` | 结果窗口外壳可逐步替换为 `AvisoPanel`；操作栏按钮可用 `AvisoButton` / `AvisoIconButton`。 |
| `src/contents/command.tsx` | 命令面板外壳可基于 `AvisoPanel`；结果行可后续抽 `CommandResultRow`。 |
| `src/contents/clipboard.tsx` | 剪贴板提示可逐步替换为 `AvisoToast`。 |
| `src/popup/index.tsx` | Popup shell、tabs、provider card、dropdown、toggle row 可分批抽象，暂不在本轮处理。 |

## 暂不迁移 / 暂不抽象

- `SelectionToolbar`：定位、选区、iframe 和内联翻译行为耦合较多，先不整体抽。
- `InlineTranslationCard`：和翻译路由、请求取消、复制、fallback 行为绑定，先保持在 `toolbar.tsx`。
- `CommandPaletteShell` / `CommandResultRow`：键盘导航、本地 intent、history/bookmark 搜索耦合较多，后续单独做。
- `ProviderCard`：涉及 API Key、provider config、连接测试和存储边界，不能只按视觉抽。
- `Screenshot` 相关组件：当前 release candidate 只保留右键内部路径，不把截图做成普通主入口。
- 商店素材、官网文案、Landing Page 历史变体：需要事实复核和 owner 单独确认。
