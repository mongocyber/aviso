import { defineContentScript } from "wxt/utils/define-content-script"

import SelectionToolbar from "../contents/toolbar"
import { mountReactShadowUi } from "../wxt/react-shadow-ui"

export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: true,
  async main(ctx) {
    await mountReactShadowUi(ctx, {
      hostId: "aviso-toolbar-host",
      component: SelectionToolbar
    })
  }
})
