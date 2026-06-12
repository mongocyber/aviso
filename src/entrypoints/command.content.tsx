import { defineContentScript } from "wxt/utils/define-content-script"

import CommandPalette from "../contents/command"
import { mountReactShadowUi } from "../wxt/react-shadow-ui"

export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: false,
  async main(ctx) {
    await mountReactShadowUi(ctx, {
      hostId: "aviso-command-host",
      component: CommandPalette
    })
  }
})
