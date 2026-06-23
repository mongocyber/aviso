import { resolve } from "node:path"
import { defineConfig } from "wxt"

export default defineConfig({
  srcDir: "src",
  vite: () => ({
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "react"
    }
  }),
  alias: {
    "~styles": resolve("src/styles"),
    "~components": resolve("src/components"),
    "~types": resolve("src/types"),
    "~utils": resolve("src/utils")
  },
  manifest: {
    name: "Aviso",
    default_locale: "zh_CN",
    description: "__MSG_app_description__",
    permissions: [
      "contextMenus",
      "activeTab",
      "storage",
      "history",
      "bookmarks",
      "identity",
      "clipboardWrite"
    ],
    host_permissions: [
      "https://api.openai.com/*",
      "https://api.anthropic.com/*",
      "https://ark.cn-beijing.volces.com/*",
      "https://api.deepseek.com/*",
      "https://api.moonshot.cn/*",
      "https://openrouter.ai/*",
      "https://generativelanguage.googleapis.com/*",
      "https://api.hunyuan.cloud.tencent.com/*",
      "https://aviso-backend-staging.vercel.app/*"
    ],
    commands: {
      "open-command-palette": {
        suggested_key: {
          default: "Ctrl+Shift+Space",
          mac: "Command+Shift+Space"
        },
        description: "__MSG_open_command_palette_description__"
      }
    },
    icons: {
      16: "/icon-16.png",
      32: "/icon-32.png",
      48: "/icon-48.png",
      64: "/icon-64.png",
      128: "/icon-128.png"
    },
    action: {
      default_icon: {
        16: "/icon-16.png",
        32: "/icon-32.png",
        48: "/icon-48.png",
        64: "/icon-64.png",
        128: "/icon-128.png"
      },
      default_popup: "popup.html"
    }
  }
})
