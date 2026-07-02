import { useEffect, useMemo, useState } from "react"

import {
  createI18n,
  DEFAULT_UI_LANGUAGE,
  normalizeUiLanguageSetting,
  resolveUiLanguage,
  type ResolvedUiLanguage,
  type UiLanguageSetting
} from "./i18n-core"

export * from "./i18n-core"

export function useSyncedAvisoLanguage(): {
  language: ResolvedUiLanguage
  setting: UiLanguageSetting
  t: ReturnType<typeof createI18n>
} {
  const [setting, setSetting] = useState<UiLanguageSetting>(DEFAULT_UI_LANGUAGE)

  useEffect(() => {
    chrome.storage.sync.get("contextai_settings", (result) => {
      setSetting(
        normalizeUiLanguageSetting(result.contextai_settings?.uiLanguage)
      )
    })

    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area !== "sync" || !changes.contextai_settings) return
      setSetting(
        normalizeUiLanguageSetting(
          changes.contextai_settings.newValue?.uiLanguage
        )
      )
    }

    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const language = resolveUiLanguage(setting)
  const t = useMemo(() => createI18n(language), [language])

  return { language, setting, t }
}
