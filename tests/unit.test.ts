import assert from "node:assert/strict"
import { test } from "node:test"
import {
  detectType,
  isSensitive,
  isSensitiveDomain
} from "../src/utils/clipboard-detect.ts"
import {
  clampDoubleClickMenuPosition,
  hasValidDoubleClickSelection,
  isUnsafeDoubleClickTarget
} from "../src/utils/double-click-menu.ts"
import {
  isSafeBrowserOpenUrl,
  normalizeSafeBrowserOpenUrl
} from "../src/utils/url-safety.ts"
import "./helpers/register-aliases.ts"

test("detectType 识别 URL", () => {
  assert.equal(detectType("https://example.com/path?q=1"), "url")
})

test("browser URL opening only allows http and https", () => {
  assert.equal(isSafeBrowserOpenUrl("https://example.com/path?q=1"), true)
  assert.equal(isSafeBrowserOpenUrl("http://example.com/path"), true)
  assert.equal(
    isSafeBrowserOpenUrl("https://accounts.google.com@evil.tld"),
    false
  )
  assert.equal(
    isSafeBrowserOpenUrl("https://user:pass@example.com/path"),
    false
  )
  assert.equal(
    normalizeSafeBrowserOpenUrl("example.com/docs"),
    "https://example.com/docs"
  )
  assert.equal(
    normalizeSafeBrowserOpenUrl("localhost:3000"),
    "http://localhost:3000/"
  )
  assert.equal(isSafeBrowserOpenUrl("javascript:alert(1)"), false)
  assert.equal(isSafeBrowserOpenUrl("data:text/html,<script></script>"), false)
  assert.equal(isSafeBrowserOpenUrl("file:///Users/example/private.txt"), false)
  assert.equal(isSafeBrowserOpenUrl("chrome://extensions"), false)
  assert.equal(isSafeBrowserOpenUrl("about:blank"), false)
  assert.equal(isSafeBrowserOpenUrl("blob:https://example.com/id"), false)
  assert.equal(
    isSafeBrowserOpenUrl("chrome-extension://abc/options.html"),
    false
  )
  assert.equal(isSafeBrowserOpenUrl("not a url"), false)
})

test("double-click menu safety blocks editable and code-editor targets", () => {
  assert.equal(isUnsafeDoubleClickTarget({ tagName: "textarea" }), true)
  assert.equal(
    isUnsafeDoubleClickTarget({ tagName: "input", inputType: "password" }),
    true
  )
  assert.equal(
    isUnsafeDoubleClickTarget({ tagName: "div", isContentEditable: true }),
    true
  )
  assert.equal(
    isUnsafeDoubleClickTarget({
      tagName: "div",
      className: "monaco-editor"
    }),
    true
  )
  assert.equal(isUnsafeDoubleClickTarget({ tagName: "p" }), false)
})

test("double-click menu validates selection length and clamps placement", () => {
  assert.equal(hasValidDoubleClickSelection("a"), false)
  assert.equal(hasValidDoubleClickSelection(" hello "), true)
  assert.deepEqual(
    clampDoubleClickMenuPosition(
      { x: 390, y: 290 },
      { width: 400, height: 300 },
      { width: 120, height: 90 }
    ),
    { left: 268, top: 198 }
  )
})
