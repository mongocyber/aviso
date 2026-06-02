# Aviso — 项目说明

## 沟通语言
- 默认始终用**中文**回复用户。

## 设计系统概览
本项目是 Aviso(浏览器扩展)的设计系统,品牌基调:克制、清楚、不喧宾夺主。

- **品牌色**:sage(鼠尾草绿)色阶,全部用 oklch 定义
- **字体**:Hanken Grotesk(界面/正文)+ Space Mono(标签/代码/快捷键)
- **品牌标记**:Aperture(三段同心圆弧),ink / sage / white 三版
- **令牌唯一真源**:`tokens.css`(颜色、字号、圆角、间距、阴影、动效)

## 文件结构
- `tokens.css` — 设计令牌,唯一真源,可交付开发
- `Aviso Design System.html` — Foundations 文档(品牌/颜色/字体/令牌/图标/语气)
- `Aviso Components.html` — 组件库展示
- `Aviso Landing Page.html` — 产品落地页(支持中英文切换)
- `components/aviso-ui.js` — 共享:Aperture 标记 + 图标集 + 流式输出(三页共用)
- `components/aviso-components.css` — 组件样式
- `components/aviso-system.css` — 设计系统文档样式
- `components/aviso-landing.css` — 落地页样式
- `assets/aviso-mark-*.svg` — 品牌标记三版

## 重要约定
- 任何**新建的 HTML 页面**都必须链接 `tokens.css`(在其它样式表之前),否则圆角/阴影/字体令牌会解析为空。
- 颜色一律引用 sage 令牌,不要凭空造新色。
- 语气遵循三原则:先说事后给路 / 克制不亢奋 / 清楚不居高临下。
