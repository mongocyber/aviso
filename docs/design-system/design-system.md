# Aviso Design System

Updated: 2026-06-12

本文记录 Aviso 当前可迁入并维护的设计系统规则。它以项目当前事实和 `src/styles/aviso.tsx` 为准，外部设计包只作为已确认方向的来源，不覆盖产品状态、隐私边界或发布口径。

## 颜色

Aviso 使用 sage 作为唯一品牌主色，搭配带轻微绿色倾向的中性色。运行态颜色真源在 `src/styles/aviso.tsx`。

| 类别 | 用法 |
| --- | --- |
| `sage900` - `sage50` | 品牌色阶。`sage500` 附近用于主操作，`sage700` 用于浅底强调，`sage300` / `sage400` 用于深底强调。 |
| `ink` / `ink2` / `ink3` | 浅色主题下的主文字、次要文字和说明文字。 |
| `paper` / `line` | 浅色主题背景和分隔线。 |
| `darkBg` / `darkSurface` / `darkSurface2` / `darkLine` | 深色主题背景、面板、悬停表面和分隔线。 |
| `darkText` / `darkText2` / `darkText3` | 深色主题文字层级。 |
| `ok` / `danger` | 成功、保存、硬失败、删除等语义状态。普通提示优先使用 sage，不升级为警告色。 |

规则：

- 不新增另一套 CSS token 真源。
- 不使用强烈渐变作为品牌主视觉。
- 不用第三方 provider 品牌色作为 Aviso UI 的主色。
- provider 支持、live validation 和 release readiness 必须在文案里分开。

## 字体与字号

运行态字体在 `aviso.font` 和 `aviso.mono` 中定义。

- UI 与正文：`Hanken Grotesk` 优先，随后使用系统字体 fallback。
- 标签、模型 chip、快捷键、工程感短标签：`Space Mono` 优先，随后使用 monospace fallback。
- 运行态组件字号集中在 `12px` - `16px`：
  - `16px`：命令面板输入。
  - `14px` - `14.5px`：结果面板正文、Popup 主信息。
  - `13px` - `13.5px`：按钮、菜单项、工具条。
  - `10.5px` - `12px`：badge、caption、状态说明。

## 间距、圆角与阴影

当前代码中主要 token：

| Token | 用法 |
| --- | --- |
| `radiusSm` | 小按钮、图标按钮、菜单项。 |
| `radiusMd` | 输入、下拉、气泡、小卡片。 |
| `radius` | 常规浮层、菜单、Toast。 |
| `radiusLg` | 结果面板、命令面板等主容器。 |
| `toolbarShadow` | 划词工具条。 |
| `panelShadow` | 结果面板。 |
| `popShadow` | 命令面板、菜单、内联卡片等高层浮层。 |

规则：

- 浮层必须有明确边界：背景、边框、阴影三者至少保留两项。
- 页面内组件要避免大面积装饰，优先保证可读、可点、稳定定位。
- 文字必须能换行或截断，不允许挤出按钮、菜单项或 panel。

## 动效

动效统一使用 `aviso.ease`：`cubic-bezier(.2,.8,.2,1)`。

- hover / focus / active：约 `0.15s`。
- toast 进出与计时条：约 `0.2s` - `0.3s`。
- 加载中的 Aperture mark 可以旋转，但不得暗示 provider 性能已验证。

## 图标

运行态图标真源为 `src/styles/aviso.tsx` 的 `AvisoIcon` 和 `ICONS`。

规则：

- 图标采用 24x24 网格、圆角线端、约 1.6px 描边。
- 按钮优先使用图标 + 必要文本；纯图标按钮必须提供 `aria-label`。
- 模型或 provider 状态使用中性符号，不复刻第三方 logo。
- 新图标先进入 `src/styles/aviso.tsx`，再由组件复用。

## Logo / Brand

已迁入的源资产：

- `assets/aviso-mark-ink.svg`
- `assets/aviso-mark-sage.svg`
- `assets/aviso-mark-white.svg`

运行态优先使用 `AvisoMark`，资产文件用于文档、品牌规范和后续发布素材审查。

规则：

- Aperture mark 保持单色。
- 浅底可使用 ink 或 sage，深底使用 white 或深底可读的 sage。
- 最小尺寸按 `16px` 处理；更小尺寸需要单独验收。
- 不加渐变、外发光、复杂背景或未经确认的 wordmark 变体。
- extension icon、favicon、横向 lockup、纵向 lockup 可作为后续品牌资产任务，不在本轮直接替换运行态图标。

## 品牌语气

Aviso 的语气是自然、克制、清楚、面向普通用户的。

应该：

- 说明用户当前能做什么。
- 明确配置支持、实现支持、live validation、release ready 的区别。
- 对隐私和 API Key 保护使用准确描述。

不应该：

- 宣称已经公开上架或通过 Chrome Web Store review。
- 宣称 provider 已 live validated，除非有真实验证证据。
- 写成 hosted Aviso AI、匿名额度、登录、订阅、支付、provider proxy 已上线。
- 把截图作为普通用户主卖点；当前截图路径仍是右键内部路径。
