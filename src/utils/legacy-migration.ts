import type { Settings } from "~types/history"

// Builds before 0.1.2 offered an optional "Aviso AI" provider stored under this
// config id, plus two chrome.storage.local keys for its account session. 0.1.2
// is BYOK-only, so these values are migrated away and must not be reused.
const LEGACY_REMOVED_PROVIDER_CONFIG_ID = "aviso-hosted-ai"
const LEGACY_REMOVED_LOCAL_STORAGE_KEYS = [
  "aviso_hosted_session",
  "aviso_hosted_sign_in_result"
]

type MigratableSettings = Pick<
  Settings,
  "defaultProviderConfigId" | "fastProviderConfigId" | "providerConfigs"
>

export function migrateLegacyProviderSelection<T extends MigratableSettings>(
  settings: T
): { settings: T; changed: boolean } {
  const defaultIsLegacy =
    settings.defaultProviderConfigId === LEGACY_REMOVED_PROVIDER_CONFIG_ID
  const fastIsLegacy =
    settings.fastProviderConfigId === LEGACY_REMOVED_PROVIDER_CONFIG_ID
  if (!defaultIsLegacy && !fastIsLegacy) return { settings, changed: false }

  const byokConfigs = (settings.providerConfigs ?? []).filter(
    (config) => config.id !== LEGACY_REMOVED_PROVIDER_CONFIG_ID
  )
  const fallbackDefaultId =
    (byokConfigs.find((config) => config.isDefault) ?? byokConfigs[0])?.id ?? ""

  return {
    settings: {
      ...settings,
      providerConfigs: byokConfigs,
      ...(defaultIsLegacy ? { defaultProviderConfigId: fallbackDefaultId } : {}),
      // An unset fast config falls back to the default provider config.
      ...(fastIsLegacy ? { fastProviderConfigId: "" } : {})
    },
    changed: true
  }
}

export async function runLegacyStorageMigration(): Promise<void> {
  const result = await chrome.storage.sync.get("contextai_settings")
  const stored = result.contextai_settings as Partial<Settings> | undefined
  if (stored) {
    const migrated = migrateLegacyProviderSelection(stored)
    if (migrated.changed) {
      await chrome.storage.sync.set({ contextai_settings: migrated.settings })
    }
  }

  await chrome.storage.local.remove(LEGACY_REMOVED_LOCAL_STORAGE_KEYS)
}
