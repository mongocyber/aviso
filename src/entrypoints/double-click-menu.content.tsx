import { defineContentScript } from "wxt/utils/define-content-script"

import DoubleClickMenu from "../contents/double-click-menu"
import { mountReactShadowUi } from "../wxt/react-shadow-ui"

export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: true,
  async main(ctx) {
    await mountReactShadowUi(ctx, {
      hostId: "aviso-double-click-menu-host",
      component: DoubleClickMenu
    })
  }
})
