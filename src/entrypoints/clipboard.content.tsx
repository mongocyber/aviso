import { defineContentScript } from "wxt/utils/define-content-script"

import ClipboardToast from "../contents/clipboard"
import { mountReactShadowUi } from "../wxt/react-shadow-ui"

export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: true,
  async main(ctx) {
    await mountReactShadowUi(ctx, {
      hostId: "aviso-clipboard-host",
      component: ClipboardToast
    })
  }
})
