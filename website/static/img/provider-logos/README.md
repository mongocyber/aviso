# Aviso · 模型厂商 Logo 资源包

8 家厂商的官方真实 logo,两套色版:

- color/ —— 各家官方品牌色原版
- sage/  —— 同一几何,统一上成 Aviso sage 单色(#3B5440);内部用 currentColor,
           可在 CSS 里用 color / fill 自由改色

## 清单
| 文件        | 厂商                  |
|-------------|-----------------------|
| openai      | OpenAI                |
| anthropic   | Anthropic (Claude)    |
| deepseek    | DeepSeek              |
| gemini      | Gemini (Google)       |
| doubao      | 豆包 / 火山方舟        |
| kimi        | Kimi / Moonshot       |
| openrouter  | OpenRouter            |
| hunyuan     | 腾讯混元              |

均为 24×24 viewBox。

## 用法
直接内联:
  <img src="provider-logos/sage/openai.svg" width="22" height="22" alt="OpenAI">

或内联 SVG 后用 currentColor 改色(sage 版):
  .glyph{ color: var(--sage-700); }

## 来源与商标
图形来自开源品牌 logo 库 lobehub/lobe-icons(MIT)。各 logo 商标归各自厂商所有,
此处仅用于标识「已支持的模型厂商」(兼容性标识用途)。用于对外营销物料前,请遵循
各厂商的品牌使用规范。
