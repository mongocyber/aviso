import { defineContentScript } from "wxt/utils/define-content-script"

import FloatingWindow from "../contents/floating"
import { mountReactShadowUi } from "../wxt/react-shadow-ui"

export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: false,
  async main(ctx) {
    await mountReactShadowUi(ctx, {
      hostId: "aviso-floating-host",
      component: FloatingWindow
    })
  }
})
