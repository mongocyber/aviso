import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import * as storageModule from "../src/utils/storage.ts"
import "./helpers/register-aliases.ts"

type ChromeLike = typeof globalThis.chrome
type StorageModule = typeof storageModule & {
  saveSettingsDirect?: typeof storageModule.saveSettings
}

const SETTINGS_STORAGE_KEY = "contextai_settings"
const CLIPBOARD_SENSE_REVOCATION_EPOCH_STORAGE_KEY =
  "contextai_clipboard_sense_revocation_epoch"

const { getSettings } = storageModule
const saveSettings = getDirectSaveSettings()

function getDirectSaveSettings(mod: StorageModule = storageModule) {
  return mod.saveSettingsDirect ?? mod.saveSettings
}

async function importStorageModule(label: string): Promise<StorageModule> {
  return import(
    `../src/utils/storage.ts?mon41-${label}-${Date.now()}-${Math.random()}`
  ) as Promise<StorageModule>
}

function resolveSyncStorageGet(
  storage: Record<string, unknown>,
  keys: string | string[] | Record<string, unknown> | null | undefined
) {
  if (typeof keys === "string") {
    return { [keys]: storage[keys] }
  }
  if (Array.isArray(keys)) {
    return Object.fromEntries(keys.map((key) => [key, storage[key]]))
  }
  if (keys && typeof keys === "object") {
    return Object.fromEntries(
      Object.entries(keys).map(([key, fallback]) => [
        key,
        storage[key] ?? fallback
      ])
    )
  }
  return { ...storage }
}

function installSyncStorageForSettings(
  contextaiSettings: unknown,
  options: {
    revocationEpoch?: unknown
    failEpochSet?: boolean
    failSettingsSet?: boolean
  } = {}
) {
  const previousChrome = (globalThis as { chrome?: ChromeLike }).chrome
  const storage: Record<string, unknown> = {
    [SETTINGS_STORAGE_KEY]: contextaiSettings
  }
  if ("revocationEpoch" in options) {
    storage[CLIPBOARD_SENSE_REVOCATION_EPOCH_STORAGE_KEY] =
      options.revocationEpoch
  }
  let shouldFailEpochSet = Boolean(options.failEpochSet)
  let shouldFailSettingsSet = Boolean(options.failSettingsSet)

  ;(globalThis as { chrome?: unknown }).chrome = {
    runtime: { id: "aviso-test-extension" },
    storage: {
      sync: {
        get: async (
          keys: string | string[] | Record<string, unknown> | null | undefined
        ) => resolveSyncStorageGet(storage, keys),
        set: async (items: Record<string, unknown>) => {
          if (
            CLIPBOARD_SENSE_REVOCATION_EPOCH_STORAGE_KEY in items &&
            shouldFailEpochSet
          ) {
            shouldFailEpochSet = false
            throw new Error("revocation_epoch_write_failed")
          }
          if (SETTINGS_STORAGE_KEY in items && shouldFailSettingsSet) {
            shouldFailSettingsSet = false
            throw new Error("settings_write_failed")
          }
          Object.assign(storage, items)
        }
      }
    }
  }

  return {
    get storedSettings() {
      return storage[SETTINGS_STORAGE_KEY]
    },
    get revocationEpoch() {
      return storage[CLIPBOARD_SENSE_REVOCATION_EPOCH_STORAGE_KEY]
    },
    restore() {
      ;(globalThis as { chrome?: ChromeLike }).chrome = previousChrome
    }
  }
}

function installControlledSyncStorageForSettings(contextaiSettings: unknown) {
  const previousChrome = (globalThis as { chrome?: ChromeLike }).chrome
  const storage: Record<string, unknown> = {
    [SETTINGS_STORAGE_KEY]: contextaiSettings
  }
  const pendingSets: Array<{
    items: Record<string, unknown>
    resolve: () => void
  }> = []
  const setWaiters: Array<{
    count: number
    resolve: () => void
  }> = []

  function notifySetWaiters() {
    for (let i = setWaiters.length - 1; i >= 0; i -= 1) {
      if (pendingSets.length >= setWaiters[i].count) {
        const [waiter] = setWaiters.splice(i, 1)
        waiter.resolve()
      }
    }
  }

  ;(globalThis as { chrome?: unknown }).chrome = {
    runtime: { id: "aviso-test-extension" },
    storage: {
      sync: {
        get: async (
          keys: string | string[] | Record<string, unknown> | null | undefined
        ) => resolveSyncStorageGet(storage, keys),
        set: async (items: Record<string, unknown>) =>
          new Promise<void>((resolve) => {
            pendingSets.push({ items, resolve })
            notifySetWaiters()
          })
      }
    }
  }

  return {
    get storedSettings() {
      return storage[SETTINGS_STORAGE_KEY]
    },
    get revocationEpoch() {
      return storage[CLIPBOARD_SENSE_REVOCATION_EPOCH_STORAGE_KEY]
    },
    get pendingSetCount() {
      return pendingSets.length
    },
    get pendingSetItems() {
      return pendingSets.map((pending) => pending.items)
    },
    waitForSetCount(count: number) {
      if (pendingSets.length >= count) {
        return Promise.resolve()
      }
      return new Promise<void>((resolve) => {
        setWaiters.push({ count, resolve })
      })
    },
    completeSet(index: number) {
      const [pending] = pendingSets.splice(index, 1)
      assert.ok(pending, `expected pending set at index ${index}`)
      Object.assign(storage, pending.items)
      pending.resolve()
    },
    restore() {
      ;(globalThis as { chrome?: ChromeLike }).chrome = previousChrome
    }
  }
}

async function waitForSetCountWithin(
  waitForSetCount: (count: number) => Promise<void>,
  count: number,
  ms: number
): Promise<boolean> {
  return Promise.race([
    waitForSetCount(count).then(() => true),
    new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), ms)
    })
  ])
}

async function waitForMicrotasks(): Promise<void> {
  await Promise.resolve()
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })
}

async function completePendingSetsUntilDone(
  harness: ReturnType<typeof installControlledSyncStorageForSettings>,
  isDone: () => boolean,
  options: { preserveFirstPendingSet?: boolean } = {}
): Promise<void> {
  for (let guard = 0; !isDone() && guard < 5; guard += 1) {
    const expectedPendingCount = options.preserveFirstPendingSet ? 2 : 1
    const hasPendingSet = await waitForSetCountWithin(
      harness.waitForSetCount,
      expectedPendingCount,
      250
    )
    assert.equal(hasPendingSet, true)
    harness.completeSet(options.preserveFirstPendingSet ? 1 : 0)
    await waitForMicrotasks()
  }
  assert.equal(isDone(), true)
}

function installRuntimeMessageHarness(mode: "lastError" | "timeout") {
  const previousChrome = (globalThis as { chrome?: ChromeLike }).chrome
  const sentMessages: unknown[] = []
  let lastError: { message: string } | undefined

  const runtime = {
    id: "aviso-test-extension",
    get lastError() {
      return lastError
    },
    sendMessage(
      message: unknown,
      callback?: (response?: { success: boolean; error?: string }) => void
    ) {
      sentMessages.push(message)
      if (mode === "timeout") return
      lastError = { message: "background unavailable" }
      callback?.(undefined)
      lastError = undefined
    }
  }

  ;(globalThis as { chrome?: unknown }).chrome = {
    runtime,
    storage: {
      sync: {
        get: async (
          keys: string | string[] | Record<string, unknown> | null | undefined
        ) => resolveSyncStorageGet({ [SETTINGS_STORAGE_KEY]: {} }, keys),
        set: async () => undefined
      }
    }
  }

  return {
    sentMessages,
    restore() {
      ;(globalThis as { chrome?: ChromeLike }).chrome = previousChrome
    }
  }
}

function installTimerHarness() {
  const previousSetTimeout = globalThis.setTimeout
  const previousClearTimeout = globalThis.clearTimeout
  const callbacks: Array<() => void> = []

  ;(globalThis as { setTimeout: typeof setTimeout }).setTimeout = ((
    handler: TimerHandler
  ) => {
    callbacks.push(() => {
      if (typeof handler === "function") {
        handler()
      }
    })
    return callbacks.length as unknown as ReturnType<typeof setTimeout>
  }) as typeof setTimeout
  ;(globalThis as { clearTimeout: typeof clearTimeout }).clearTimeout = ((
    _timer?: ReturnType<typeof setTimeout>
  ) => undefined) as typeof clearTimeout

  return {
    fireNext() {
      const callback = callbacks.shift()
      assert.ok(callback, "expected pending timeout")
      callback()
    },
    restore() {
      ;(globalThis as { setTimeout: typeof setTimeout }).setTimeout =
        previousSetTimeout
      ;(globalThis as { clearTimeout: typeof clearTimeout }).clearTimeout =
        previousClearTimeout
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

test("clipboard sense epoch migration and lifecycle stay backward compatible", async () => {
  const legacyTrue = installSyncStorageForSettings({
    enableClipboardSense: true
  })

  try {
    const settings = await getSettings()
    assert.equal(settings.enableClipboardSense, false)
    assert.equal(settings.clipboardSenseConsentVersion, undefined)
    assert.equal(settings.clipboardSenseConsentEpoch, undefined)
  } finally {
    legacyTrue.restore()
  }

  const currentConsentedNoEpoch = installSyncStorageForSettings({
    enableClipboardSense: true,
    clipboardSenseConsentVersion: 1
  })

  try {
    const settings = await getSettings()
    assert.equal(settings.enableClipboardSense, true)
    assert.equal(settings.clipboardSenseConsentVersion, 1)
    assert.equal(settings.clipboardSenseConsentEpoch, 0)
    assert.equal(currentConsentedNoEpoch.revocationEpoch, undefined)
  } finally {
    currentConsentedNoEpoch.restore()
  }

  const lifecycle = installSyncStorageForSettings({
    enableClipboardSense: true,
    clipboardSenseConsentVersion: 1
  })

  try {
    await saveSettings({ enableClipboardSense: false })
    assert.equal(lifecycle.revocationEpoch, 1)
    let storedSettings = lifecycle.storedSettings as {
      enableClipboardSense?: boolean
      clipboardSenseConsentVersion?: number
      clipboardSenseConsentEpoch?: number
    }
    assert.equal(storedSettings.enableClipboardSense, false)
    assert.equal(storedSettings.clipboardSenseConsentVersion, undefined)
    assert.equal(storedSettings.clipboardSenseConsentEpoch, undefined)
    assert.equal((await getSettings()).enableClipboardSense, false)

    await saveSettings(
      {
        enableClipboardSense: true,
        clipboardSenseConsentVersion: 1
      },
      { allowClipboardSenseConsentGrant: true }
    )
    storedSettings = lifecycle.storedSettings as {
      enableClipboardSense?: boolean
      clipboardSenseConsentVersion?: number
      clipboardSenseConsentEpoch?: number
    }
    assert.equal(storedSettings.enableClipboardSense, true)
    assert.equal(storedSettings.clipboardSenseConsentVersion, 1)
    assert.equal(storedSettings.clipboardSenseConsentEpoch, 1)
    assert.equal((await getSettings()).enableClipboardSense, true)
  } finally {
    lifecycle.restore()
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

test("overlapping stale autosave cannot overwrite newer clipboard sense disable", async () => {
  const harness = installControlledSyncStorageForSettings({
    enableClipboardSense: true,
    clipboardSenseConsentVersion: 1,
    appearanceTheme: "light"
  })

  try {
    const staleAutosave = saveSettings({
      enableClipboardSense: true,
      clipboardSenseConsentVersion: 1,
      appearanceTheme: "dark"
    })
    await harness.waitForSetCount(1)

    let disableDone = false
    const disable = saveSettings({ enableClipboardSense: false }).then(() => {
      disableDone = true
    })

    if (await waitForSetCountWithin(harness.waitForSetCount, 2, 25)) {
      await completePendingSetsUntilDone(harness, () => disableDone, {
        preserveFirstPendingSet: true
      })
      harness.completeSet(0)
      await staleAutosave
    } else {
      assert.equal(harness.pendingSetCount, 1)
      harness.completeSet(0)
      await staleAutosave
      await completePendingSetsUntilDone(harness, () => disableDone)
      await disable
    }

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

test("cross-context stale write cannot resurrect clipboard sense after newer revocation", async () => {
  const harness = installControlledSyncStorageForSettings({
    enableClipboardSense: true,
    clipboardSenseConsentVersion: 1,
    defaultModel: "old-model"
  })

  try {
    const popupStorage = await importStorageModule("popup")
    const backgroundStorage = await importStorageModule("background")
    const popupSaveSettings = getDirectSaveSettings(popupStorage)
    const backgroundSaveSettings = getDirectSaveSettings(backgroundStorage)

    const stalePopupWrite = popupSaveSettings({
      enableClipboardSense: true,
      clipboardSenseConsentVersion: 1,
      defaultModel: "new-model"
    })
    await harness.waitForSetCount(1)

    let revocationDone = false
    const newerRevocation = backgroundSaveSettings({
      enableClipboardSense: false
    }).then(() => {
      revocationDone = true
    })

    await completePendingSetsUntilDone(harness, () => revocationDone, {
      preserveFirstPendingSet: true
    })
    await newerRevocation

    harness.completeSet(0)
    await stalePopupWrite

    const storedSettings = harness.storedSettings as {
      enableClipboardSense?: boolean
      clipboardSenseConsentVersion?: number
      clipboardSenseConsentEpoch?: number
      defaultModel?: string
    }
    assert.equal(storedSettings.enableClipboardSense, true)
    assert.equal(storedSettings.clipboardSenseConsentVersion, 1)
    assert.equal(storedSettings.clipboardSenseConsentEpoch, 0)
    assert.equal(storedSettings.defaultModel, "new-model")
    assert.equal(harness.revocationEpoch, 1)
    assert.equal((await backgroundStorage.getSettings()).enableClipboardSense, false)
  } finally {
    harness.restore()
  }
})

test("clipboard sense revocation reports storage write failures without claiming success", async () => {
  const failEpoch = installSyncStorageForSettings(
    {
      enableClipboardSense: true,
      clipboardSenseConsentVersion: 1
    },
    { failEpochSet: true }
  )

  try {
    await assert.rejects(
      saveSettings({ enableClipboardSense: false }),
      /revocation_epoch_write_failed/
    )
    assert.equal(failEpoch.revocationEpoch, undefined)
    assert.equal((await getSettings()).enableClipboardSense, true)
  } finally {
    failEpoch.restore()
  }

  const failSettings = installSyncStorageForSettings(
    {
      enableClipboardSense: true,
      clipboardSenseConsentVersion: 1
    },
    { failSettingsSet: true }
  )

  try {
    await assert.rejects(
      saveSettings({ enableClipboardSense: false }),
      /settings_write_failed/
    )
    assert.equal(failSettings.revocationEpoch, 1)
    assert.equal((await getSettings()).enableClipboardSense, false)
  } finally {
    failSettings.restore()
  }
})

test("settings client reports background message failure and timeout", async () => {
  const failedMessage = installRuntimeMessageHarness("lastError")
  try {
    await assert.rejects(
      storageModule.saveSettings({ enableClipboardSense: false }),
      /runtime_message_failed/
    )
    assert.equal(failedMessage.sentMessages.length, 1)
  } finally {
    failedMessage.restore()
  }

  const timedOutMessage = installRuntimeMessageHarness("timeout")
  const timers = installTimerHarness()
  try {
    const save = storageModule.saveSettings({ enableClipboardSense: false })
    assert.equal(timedOutMessage.sentMessages.length, 1)
    timers.fireNext()
    await assert.rejects(save, /settings_save_timeout/)
  } finally {
    timers.restore()
    timedOutMessage.restore()
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

test("clipboard sense listener registers for first-time consent at epoch zero", async () => {
  const mod = await importClipboardSenseModule()
  assert.ok(mod, "clipboard sense policy module should exist")

  const harness = installSyncStorageForSettings({
    enableClipboardSense: true,
    clipboardSenseConsentVersion: 1
  })
  const added: Array<() => void> = []
  const copyListener = () => undefined
  const controller = mod.createClipboardSenseListenerController({
    listener: copyListener,
    addCopyListener: (listener: () => void) => added.push(listener),
    removeCopyListener: () => undefined
  })

  try {
    const settings = await getSettings()
    assert.equal(settings.enableClipboardSense, true)
    assert.equal(settings.clipboardSenseConsentEpoch, 0)

    controller.applySettings(settings)
    assert.deepEqual(added, [copyListener])
  } finally {
    controller.dispose()
    harness.restore()
  }
})

test("clipboard sense listener registers after revoke and explicit re-consent", async () => {
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
    controller.applySettings(await getSettings())
    assert.deepEqual(removed, [copyListener])

    await saveSettings(
      {
        enableClipboardSense: true,
        clipboardSenseConsentVersion: 1
      },
      { allowClipboardSenseConsentGrant: true }
    )

    const settings = await getSettings()
    assert.equal(settings.enableClipboardSense, true)
    assert.equal(settings.clipboardSenseConsentEpoch, 1)

    controller.applySettings(settings)
    assert.deepEqual(added, [copyListener, copyListener])
  } finally {
    controller.dispose()
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

test("popup disables clipboard sense through immediate confirmed save", () => {
  const popupSource = readFileSync(
    new URL("../src/popup/index.tsx", import.meta.url),
    "utf8"
  )
  const handler =
    popupSource.match(
      /const updateCommonFeatureSetting = \([\s\S]*?\n  const popupApiKeyPresence:/
    )?.[0] ?? ""
  const clipboardSenseBlock =
    handler.match(
      /if \(key === "enableClipboardSense"\) \{[\s\S]*?\n      return\s*\n    \}/
    )?.[0] ?? ""

  assert.match(clipboardSenseBlock, /clearTimeout\(saveTimer\.current\)/)
  assert.match(
    clipboardSenseBlock,
    /else \{[\s\S]*delete requestedSettings\.clipboardSenseConsentVersion[\s\S]*delete requestedSettings\.clipboardSenseConsentEpoch/
  )
  assert.match(clipboardSenseBlock, /await saveSettings\(/)
  assert.match(clipboardSenseBlock, /setSettings\(/)
  assert.doesNotMatch(
    clipboardSenseBlock,
    /setSettings\([\s\S]*await saveSettings/
  )
})

test("clipboard content script recomputes effective settings on settings or epoch changes", () => {
  const clipboardSource = readFileSync(
    new URL("../src/contents/clipboard.tsx", import.meta.url),
    "utf8"
  )

  assert.match(
    clipboardSource,
    /CLIPBOARD_SENSE_REVOCATION_EPOCH_STORAGE_KEY/
  )
  assert.match(
    clipboardSource,
    /changes\.contextai_settings[\s\S]*changes\[CLIPBOARD_SENSE_REVOCATION_EPOCH_STORAGE_KEY\]/
  )
  assert.match(clipboardSource, /getSettings\(\)\.then\(\(settings\) =>/)
  assert.doesNotMatch(
    clipboardSource,
    /applySettings\(\s*changes\.contextai_settings\.newValue/
  )
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
