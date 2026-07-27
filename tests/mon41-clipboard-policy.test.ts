import assert from "node:assert/strict"
import { test } from "node:test"
import { getSettings, saveSettings } from "../src/utils/storage.ts"
import "./helpers/register-aliases.ts"

type ChromeLike = typeof globalThis.chrome

function installSyncStorageForSettings(contextaiSettings: unknown) {
  const previousChrome = (globalThis as { chrome?: ChromeLike }).chrome
  let storedSettings = contextaiSettings

  ;(globalThis as { chrome?: unknown }).chrome = {
    runtime: { id: "aviso-test-extension" },
    storage: {
      sync: {
        get: async (key: string) => ({ [key]: storedSettings }),
        set: async (items: Record<string, unknown>) => {
          if ("contextai_settings" in items) {
            storedSettings = items.contextai_settings
          }
        }
      }
    }
  }

  return {
    get storedSettings() {
      return storedSettings
    },
    restore() {
      ;(globalThis as { chrome?: ChromeLike }).chrome = previousChrome
    }
  }
}

async function importClipboardSenseModule() {
  return import("../src/utils/clipboard-sense.ts").catch(() => null)
}

async function importClipboardWriteModule() {
  return import("../src/utils/clipboard-write.ts").catch(() => null)
}

test("clipboard sense defaults off when the setting is missing", async () => {
  const harness = installSyncStorageForSettings({})

  try {
    const settings = await getSettings()
    assert.equal(settings.enableClipboardSense, false)
  } finally {
    harness.restore()
  }
})

test("clipboard sense fails closed for historical true without consent marker", async () => {
  const harness = installSyncStorageForSettings({
    enableClipboardSense: true
  })

  try {
    const settings = await getSettings()
    assert.equal(settings.enableClipboardSense, false)

    const mod = await importClipboardSenseModule()
    assert.ok(mod, "clipboard sense policy module should exist")
    const added: Array<() => void> = []
    const copyListener = () => undefined
    const controller = mod.createClipboardSenseListenerController({
      listener: copyListener,
      addCopyListener: (listener: () => void) => added.push(listener),
      removeCopyListener: () => undefined
    })
    controller.applySettings(settings)
    assert.deepEqual(added, [])
  } finally {
    harness.restore()
  }
})

test("saving unrelated settings does not grant clipboard sense consent", async () => {
  const harness = installSyncStorageForSettings({
    enableClipboardSense: true,
    enableToolbar: true
  })

  try {
    await saveSettings({ appearanceTheme: "dark" })
    const storedSettings = harness.storedSettings as {
      enableClipboardSense?: boolean
      clipboardSenseConsentVersion?: number
      appearanceTheme?: string
    }

    assert.equal(storedSettings.enableClipboardSense, false)
    assert.equal(storedSettings.clipboardSenseConsentVersion, undefined)
    assert.equal(storedSettings.appearanceTheme, "dark")
  } finally {
    harness.restore()
  }
})

test("clipboard sense preserves explicit consented true and explicit false", async () => {
  const harnessTrue = installSyncStorageForSettings({
    enableClipboardSense: true,
    clipboardSenseConsentVersion: 1
  })

  try {
    assert.equal((await getSettings()).enableClipboardSense, true)
  } finally {
    harnessTrue.restore()
  }

  const harnessFalse = installSyncStorageForSettings({
    enableClipboardSense: false
  })

  try {
    assert.equal((await getSettings()).enableClipboardSense, false)
  } finally {
    harnessFalse.restore()
  }
})

test("disabling clipboard sense clears the stored consent marker", async () => {
  const harness = installSyncStorageForSettings({
    enableClipboardSense: true,
    clipboardSenseConsentVersion: 1
  })

  try {
    await saveSettings({ enableClipboardSense: false })
    const storedSettings = harness.storedSettings as {
      enableClipboardSense?: boolean
      clipboardSenseConsentVersion?: number
    }

    assert.equal(storedSettings.enableClipboardSense, false)
    assert.equal(storedSettings.clipboardSenseConsentVersion, undefined)
  } finally {
    harness.restore()
  }
})

test("partial clipboard sense true after disable does not reuse old consent", async () => {
  const mod = await importClipboardSenseModule()
  assert.ok(mod, "clipboard sense policy module should exist")

  const harness = installSyncStorageForSettings({
    enableClipboardSense: true,
    clipboardSenseConsentVersion: 1
  })
  const added: Array<() => void> = []
  const removed: Array<() => void> = []
  const copyListener = () => undefined
  const controller = mod.createClipboardSenseListenerController({
    listener: copyListener,
    addCopyListener: (listener: () => void) => added.push(listener),
    removeCopyListener: (listener: () => void) => removed.push(listener)
  })

  try {
    controller.applySettings(await getSettings())
    assert.deepEqual(added, [copyListener])

    await saveSettings({ enableClipboardSense: false })
    controller.applySettings(harness.storedSettings as Record<string, unknown>)
    assert.deepEqual(removed, [copyListener])

    await saveSettings({ enableClipboardSense: true })
    controller.applySettings(harness.storedSettings as Record<string, unknown>)

    const storedSettings = harness.storedSettings as {
      enableClipboardSense?: boolean
      clipboardSenseConsentVersion?: number
    }
    assert.equal(storedSettings.enableClipboardSense, false)
    assert.equal(storedSettings.clipboardSenseConsentVersion, undefined)
    assert.deepEqual(added, [copyListener])
    assert.equal((await getSettings()).enableClipboardSense, false)
  } finally {
    controller.dispose()
    harness.restore()
  }
})

test("stale full settings autosave cannot re-enable clipboard sense after disable", async () => {
  const harness = installSyncStorageForSettings({
    enableClipboardSense: true,
    clipboardSenseConsentVersion: 1,
    appearanceTheme: "light"
  })

  try {
    const staleAutosaveSettings = await getSettings()
    await saveSettings({ enableClipboardSense: false })
    await saveSettings({ ...staleAutosaveSettings, appearanceTheme: "dark" })

    const storedSettings = harness.storedSettings as {
      enableClipboardSense?: boolean
      clipboardSenseConsentVersion?: number
      appearanceTheme?: string
    }
    assert.equal(storedSettings.enableClipboardSense, false)
    assert.equal(storedSettings.clipboardSenseConsentVersion, undefined)
    assert.equal(storedSettings.appearanceTheme, "dark")
    assert.equal((await getSettings()).enableClipboardSense, false)
  } finally {
    harness.restore()
  }
})

test("explicit clipboard sense consent grant can re-enable after disable", async () => {
  const harness = installSyncStorageForSettings({
    enableClipboardSense: true,
    clipboardSenseConsentVersion: 1
  })

  try {
    await saveSettings({ enableClipboardSense: false })
    await saveSettings(
      {
        enableClipboardSense: true,
        clipboardSenseConsentVersion: 1
      },
      { allowClipboardSenseConsentGrant: true }
    )

    const storedSettings = harness.storedSettings as {
      enableClipboardSense?: boolean
      clipboardSenseConsentVersion?: number
    }
    assert.equal(storedSettings.enableClipboardSense, true)
    assert.equal(storedSettings.clipboardSenseConsentVersion, 1)
    assert.equal((await getSettings()).enableClipboardSense, true)
  } finally {
    harness.restore()
  }
})

test("clipboard sense listener registers only after explicit enable and removes on disable", async () => {
  const mod = await importClipboardSenseModule()
  assert.ok(mod, "clipboard sense policy module should exist")

  const added: Array<() => void> = []
  const removed: Array<() => void> = []
  const copyListener = () => undefined
  const controller = mod.createClipboardSenseListenerController({
    listener: copyListener,
    addCopyListener: (listener: () => void) => added.push(listener),
    removeCopyListener: (listener: () => void) => removed.push(listener)
  })

  assert.deepEqual(added, [])
  controller.applySettings({})
  assert.deepEqual(added, [])

  controller.applySettings({ enableClipboardSense: true })
  assert.deepEqual(added, [])

  controller.applySettings({
    enableClipboardSense: true,
    clipboardSenseConsentVersion: 1
  })
  assert.deepEqual(added, [copyListener])

  controller.applySettings({
    enableClipboardSense: true,
    clipboardSenseConsentVersion: 1
  })
  assert.deepEqual(added, [copyListener])
  assert.deepEqual(removed, [])

  controller.applySettings({ enableClipboardSense: false })
  assert.deepEqual(removed, [copyListener])

  controller.applySettings({
    enableClipboardSense: true,
    clipboardSenseConsentVersion: 1
  })
  controller.dispose()
  assert.deepEqual(removed, [copyListener, copyListener])
})

test("clipboard DOM fallback is denied by default and when false", async () => {
  const mod = await importClipboardWriteModule()
  assert.ok(mod, "clipboard write policy module should exist")

  const harness = installClipboardWriteHarness({ clipboardRejects: true })
  try {
    await assert.rejects(
      mod.writeTextToClipboard("private context"),
      /Clipboard API write was rejected/
    )
    assert.equal(harness.appended, 0)
    assert.equal(harness.execCalls, 0)

    await assert.rejects(
      mod.writeTextToClipboard("private context", { allowDomFallback: false }),
      /Clipboard API write was rejected/
    )
    assert.equal(harness.appended, 0)
    assert.equal(harness.execCalls, 0)
  } finally {
    harness.restore()
  }
})

test("clipboard DOM fallback only runs for explicit top-frame opt-in", async () => {
  const mod = await importClipboardWriteModule()
  assert.ok(mod, "clipboard write policy module should exist")

  const harness = installClipboardWriteHarness({ clipboardRejects: true })
  try {
    await mod.writeTextToClipboard("top frame context", {
      allowDomFallback: true
    })
    assert.equal(harness.appended, 1)
    assert.equal(harness.execCalls, 1)
  } finally {
    harness.restore()
  }
})

test("clipboard DOM fallback policy only trusts confirmed top-frame sources", async () => {
  const {
    canUseDomClipboardFallbackForSourceFrame,
    TOP_FRAME_ID
  } = await import("../src/background/frame-router.ts")
  assert.equal(canUseDomClipboardFallbackForSourceFrame(TOP_FRAME_ID), true)
  assert.equal(canUseDomClipboardFallbackForSourceFrame(7), false)
  assert.equal(canUseDomClipboardFallbackForSourceFrame(undefined), false)
})

function installClipboardWriteHarness({
  clipboardRejects
}: {
  clipboardRejects: boolean
}) {
  const previousNavigator = Object.getOwnPropertyDescriptor(
    globalThis,
    "navigator"
  )
  const previousDocument = (globalThis as { document?: Document }).document
  let appended = 0
  let execCalls = 0

  const textarea = {
    value: "",
    style: {},
    setAttribute: () => undefined,
    select: () => undefined,
    remove: () => undefined
  }
  const documentStub = {
    body: {
      appendChild: () => {
        appended += 1
      }
    },
    documentElement: {
      appendChild: () => {
        appended += 1
      }
    },
    createElement: () => textarea,
    execCommand: () => {
      execCalls += 1
      return true
    }
  }

  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      clipboard: {
        writeText: async () => {
          if (clipboardRejects) throw new Error("denied")
        }
      }
    }
  })
  ;(globalThis as { document?: unknown }).document = documentStub

  return {
    get appended() {
      return appended
    },
    get execCalls() {
      return execCalls
    },
    restore() {
      if (previousNavigator) {
        Object.defineProperty(globalThis, "navigator", previousNavigator)
      } else {
        Reflect.deleteProperty(globalThis, "navigator")
      }
      ;(globalThis as { document?: Document }).document = previousDocument
    }
  }
}
