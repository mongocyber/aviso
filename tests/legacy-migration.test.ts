import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import type { ProviderConfig } from "../src/types/history.ts"
import {
  migrateLegacyProviderSelection,
  runLegacyStorageMigration
} from "../src/utils/legacy-migration.ts"
import "./helpers/register-aliases.ts"

// Legacy values written by pre-0.1.2 builds; see src/utils/legacy-migration.ts.
const LEGACY_CONFIG_ID = "aviso-hosted-ai"
const LEGACY_LOCAL_KEYS = ["aviso_hosted_session", "aviso_hosted_sign_in_result"]

function byokConfig(id: string, isDefault = false): ProviderConfig {
  return {
    id,
    provider: "openai",
    displayName: id,
    model: "gpt-4o-mini",
    isDefault,
    testStatus: "untested",
    createdAt: 1,
    updatedAt: 1
  } as ProviderConfig
}

function installChromeStorageMock(input: {
  sync?: Record<string, unknown>
  local?: Record<string, unknown>
}) {
  const previousChrome = (globalThis as any).chrome
  const syncStore: Record<string, unknown> = { ...input.sync }
  const localStore: Record<string, unknown> = { ...input.local }
  const removedLocalKeys: string[] = []
  ;(globalThis as any).chrome = {
    storage: {
      sync: {
        get: async (key: string) => ({ [key]: syncStore[key] }),
        set: async (value: Record<string, unknown>) => {
          Object.assign(syncStore, value)
        }
      },
      local: {
        get: async (key: string) => ({ [key]: localStore[key] }),
        remove: async (keys: string | string[]) => {
          for (const key of Array.isArray(keys) ? keys : [keys]) {
            removedLocalKeys.push(key)
            delete localStore[key]
          }
        }
      }
    }
  }
  return {
    syncStore,
    localStore,
    removedLocalKeys,
    restore: () => {
      ;(globalThis as any).chrome = previousChrome
    }
  }
}

test("legacy default provider id falls back to the explicit BYOK default config", () => {
  const configs = [byokConfig("cfg-a"), byokConfig("cfg-b", true)]
  const { settings, changed } = migrateLegacyProviderSelection({
    defaultProviderConfigId: LEGACY_CONFIG_ID,
    fastProviderConfigId: LEGACY_CONFIG_ID,
    providerConfigs: configs
  })

  assert.equal(changed, true)
  assert.equal(settings.defaultProviderConfigId, "cfg-b")
  assert.equal(settings.fastProviderConfigId, "")
  assert.deepEqual(settings.providerConfigs, configs)
})

test("legacy default provider id falls back to the first BYOK config, or unset", () => {
  assert.equal(
    migrateLegacyProviderSelection({
      defaultProviderConfigId: LEGACY_CONFIG_ID,
      providerConfigs: [byokConfig("cfg-a"), byokConfig("cfg-b")]
    }).settings.defaultProviderConfigId,
    "cfg-a"
  )
  assert.equal(
    migrateLegacyProviderSelection({
      defaultProviderConfigId: LEGACY_CONFIG_ID,
      providerConfigs: []
    }).settings.defaultProviderConfigId,
    ""
  )
  assert.equal(
    migrateLegacyProviderSelection({
      defaultProviderConfigId: LEGACY_CONFIG_ID
    }).settings.defaultProviderConfigId,
    ""
  )
})

test("legacy fast provider id is cleared without touching a BYOK default", () => {
  const { settings, changed } = migrateLegacyProviderSelection({
    defaultProviderConfigId: "cfg-b",
    fastProviderConfigId: LEGACY_CONFIG_ID,
    providerConfigs: [byokConfig("cfg-a"), byokConfig("cfg-b")]
  })

  assert.equal(changed, true)
  assert.equal(settings.defaultProviderConfigId, "cfg-b")
  assert.equal(settings.fastProviderConfigId, "")
})

test("BYOK-only settings pass through migration unchanged", () => {
  const input = {
    defaultProviderConfigId: "cfg-a",
    fastProviderConfigId: "cfg-b",
    providerConfigs: [byokConfig("cfg-a"), byokConfig("cfg-b")]
  }
  const result = migrateLegacyProviderSelection(input)

  assert.equal(result.changed, false)
  assert.equal(result.settings, input)
})

test("startup migration rewrites stored settings and clears legacy local keys", async () => {
  const mock = installChromeStorageMock({
    sync: {
      contextai_settings: {
        defaultProviderConfigId: LEGACY_CONFIG_ID,
        fastProviderConfigId: LEGACY_CONFIG_ID,
        providerConfigs: [byokConfig("cfg-a")],
        uiLanguage: "en"
      }
    },
    local: {
      contextai_api_keys: { providerConfigKeys: {} },
      [LEGACY_LOCAL_KEYS[0]]: { session: {} },
      [LEGACY_LOCAL_KEYS[1]]: { status: "signed_out" }
    }
  })

  try {
    await runLegacyStorageMigration()

    const stored = mock.syncStore.contextai_settings as Record<string, unknown>
    assert.equal(stored.defaultProviderConfigId, "cfg-a")
    assert.equal(stored.fastProviderConfigId, "")
    assert.equal(stored.uiLanguage, "en")
    assert.deepEqual(mock.removedLocalKeys.sort(), [...LEGACY_LOCAL_KEYS].sort())
    assert.deepEqual(Object.keys(mock.localStore), ["contextai_api_keys"])
  } finally {
    mock.restore()
  }
})

test("startup migration still clears legacy local keys when no settings are stored", async () => {
  const mock = installChromeStorageMock({
    local: { [LEGACY_LOCAL_KEYS[0]]: { session: {} } }
  })

  try {
    await runLegacyStorageMigration()

    assert.equal(mock.syncStore.contextai_settings, undefined)
    assert.deepEqual(mock.removedLocalKeys.sort(), [...LEGACY_LOCAL_KEYS].sort())
    assert.deepEqual(Object.keys(mock.localStore), [])
  } finally {
    mock.restore()
  }
})

test("getSettings never surfaces the legacy provider id before migration persists", async () => {
  const mock = installChromeStorageMock({
    sync: {
      contextai_settings: {
        defaultProviderConfigId: LEGACY_CONFIG_ID,
        fastProviderConfigId: LEGACY_CONFIG_ID,
        providerConfigs: [byokConfig("cfg-a")]
      }
    }
  })

  try {
    const { getSettings } = await import("../src/utils/storage.ts")
    const settings = await getSettings()
    assert.equal(settings.defaultProviderConfigId, "cfg-a")
    assert.equal(settings.fastProviderConfigId, "")
  } finally {
    mock.restore()
  }
})

test("background runs the legacy storage migration on install/update and startup", () => {
  const backgroundSource = readFileSync(
    new URL("../src/background/index.ts", import.meta.url),
    "utf8"
  )

  assert.match(
    backgroundSource,
    /onInstalled\.addListener\(\(\) => \{\s*runLegacyMigrationSafely\("installed"\)/
  )
  assert.match(
    backgroundSource,
    /onStartup\.addListener\(\(\) => \{\s*runLegacyMigrationSafely\("startup"\)/
  )
})
