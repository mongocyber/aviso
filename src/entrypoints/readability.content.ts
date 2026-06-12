import { defineContentScript } from "wxt/utils/define-content-script"

export default defineContentScript({
  matches: ["<all_urls>"],
  allFrames: true,
  runAt: "document_idle",
  async main() {
    await import("../contents/readability")
  }
})
