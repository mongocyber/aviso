import { defineContentScript } from "wxt/utils/define-content-script"

export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: false,
  async main() {
    await import("../contents/screenshot")
  }
})
