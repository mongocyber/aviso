import { useEffect, useMemo, useState, type CSSProperties } from "react"

export const aviso = {
  sage900: "oklch(0.30 0.030 152)",
  sage700: "oklch(0.42 0.045 150)",
  sage600: "oklch(0.50 0.052 150)",
  sage500: "oklch(0.60 0.055 150)",
  sage400: "oklch(0.70 0.052 150)",
  sage300: "oklch(0.81 0.040 150)",
  sage200: "oklch(0.89 0.026 150)",
  sage100: "oklch(0.94 0.016 150)",
  sage50: "oklch(0.975 0.008 150)",
  ink: "oklch(0.24 0.012 155)",
  ink2: "oklch(0.44 0.010 155)",
  ink3: "oklch(0.60 0.008 155)",
  paper: "oklch(0.987 0.004 130)",
  line: "oklch(0.91 0.010 150)",
  darkBg: "oklch(0.205 0.016 158)",
  darkSurface: "oklch(0.248 0.017 158)",
  darkSurface2: "oklch(0.295 0.018 158)",
  darkLine: "oklch(0.345 0.018 158)",
  darkText: "oklch(0.95 0.006 150)",
  darkText2: "oklch(0.74 0.012 152)",
  darkText3: "oklch(0.58 0.012 152)",
  ok: "oklch(0.62 0.10 150)",
  danger: "oklch(0.60 0.15 28)",
  radius: 14,
  radiusSm: 8,
  radiusMd: 10,
  radiusLg: 16,
  font: '"Hanken Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  mono: '"Space Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  ease: "cubic-bezier(.2,.8,.2,1)",
  focusRing:
    "0 0 0 3px color-mix(in oklab, oklch(0.70 0.052 150) 24%, transparent)",
  accentSurface:
    "color-mix(in oklab, oklch(0.70 0.052 150) 16%, transparent)",
  accentSurfaceStrong:
    "color-mix(in oklab, oklch(0.70 0.052 150) 22%, transparent)",
  dangerSurface:
    "color-mix(in oklab, oklch(0.60 0.15 28) 14%, transparent)",
  panelShadow: "0 18px 50px -16px oklch(0.2 0.02 155 / .45)",
  popShadow: "0 24px 60px -18px oklch(0.15 0.02 155 / .6)",
  toolbarShadow: "0 8px 24px -10px oklch(0.3 0.03 155 / .35)"
} as const

export type AvisoThemeMode = "light" | "dark" | "system"
export type ResolvedAvisoTheme = "light" | "dark"

export type AvisoThemeTokens = {
  mode: ResolvedAvisoTheme
  bg: string
  surface: string
  surface2: string
  card: string
  input: string
  inputBorder: string
  button: string
  buttonHover: string
  pill: string
  line: string
  text: string
  text2: string
  text3: string
  accent: string
  accentText: string
  accentSoft: string
  accentBorder: string
  hover: string
  focusRing: string
  warningText: string
  warningBg: string
  warningBorder: string
  danger: string
  dangerBg: string
  dangerBorder: string
  disabledBg: string
  disabledText: string
  scrollbarThumb: string
  scrollbarTrack: string
  shadow: string
  activeShadow: string
  panelShadow: string
  popShadow: string
  toolbarShadow: string
  overlay: string
}

export function resolveAvisoTheme(
  mode: AvisoThemeMode,
  systemPrefersDark: boolean
): ResolvedAvisoTheme {
  if (mode === "system") return systemPrefersDark ? "dark" : "light"
  return mode
}

export function getAvisoThemeTokens(
  theme: ResolvedAvisoTheme
): AvisoThemeTokens {
  if (theme === "light") {
    return {
      mode: "light",
      bg: "oklch(0.985 0.004 130)",
      surface: aviso.paper,
      surface2: "oklch(0.958 0.009 140)",
      card: "oklch(0.995 0.002 130)",
      input: "oklch(0.995 0.002 130)",
      inputBorder: aviso.line,
      button: "oklch(0.968 0.007 140)",
      buttonHover: "color-mix(in oklab, oklch(0.70 0.052 150) 14%, white)",
      pill: "color-mix(in oklab, oklch(0.70 0.052 150) 18%, white)",
      line: aviso.line,
      text: aviso.ink,
      text2: aviso.ink2,
      text3: aviso.ink3,
      accent: aviso.sage700,
      accentText: aviso.paper,
      accentSoft: "color-mix(in oklab, oklch(0.70 0.052 150) 18%, white)",
      accentBorder: aviso.sage400,
      hover: "color-mix(in oklab, oklch(0.70 0.052 150) 12%, white)",
      focusRing:
        "0 0 0 3px color-mix(in oklab, oklch(0.70 0.052 150) 24%, transparent)",
      warningText: "oklch(0.48 0.085 74)",
      warningBg: "oklch(0.96 0.035 86)",
      warningBorder: "oklch(0.82 0.075 82)",
      danger: aviso.danger,
      dangerBg: "color-mix(in oklab, oklch(0.60 0.15 28) 10%, white)",
      dangerBorder: "color-mix(in oklab, oklch(0.60 0.15 28) 55%, white)",
      disabledBg: "oklch(0.93 0.006 140)",
      disabledText: "oklch(0.62 0.008 150)",
      scrollbarThumb: "oklch(0.78 0.018 150)",
      scrollbarTrack: "transparent",
      shadow: "0 16px 34px -20px oklch(0.2 0.02 155 / .35)",
      activeShadow:
        "0 0 0 3px color-mix(in oklab, oklch(0.70 0.052 150) 18%, transparent)",
      panelShadow: "0 18px 42px -22px oklch(0.20 0.02 155 / .34)",
      popShadow: "0 24px 54px -24px oklch(0.20 0.02 155 / .38)",
      toolbarShadow: "0 10px 26px -16px oklch(0.20 0.02 155 / .30)",
      overlay: "oklch(0.16 0.012 155 / .18)"
    }
  }

  return {
    mode: "dark",
    bg: aviso.darkBg,
    surface: aviso.darkSurface,
    surface2: aviso.darkSurface2,
    card: aviso.darkSurface,
    input: aviso.darkBg,
    inputBorder: aviso.darkLine,
    button: "transparent",
    buttonHover: aviso.darkSurface2,
    pill: aviso.accentSurface,
    line: aviso.darkLine,
    text: aviso.darkText,
    text2: aviso.darkText2,
    text3: aviso.darkText3,
    accent: aviso.sage300,
    accentText: aviso.paper,
    accentSoft: aviso.accentSurface,
    accentBorder: aviso.sage600,
    hover: aviso.darkSurface2,
    focusRing: aviso.focusRing,
    warningText: aviso.darkText2,
    warningBg: aviso.darkBg,
    warningBorder: aviso.darkLine,
    danger: aviso.danger,
    dangerBg: aviso.dangerSurface,
    dangerBorder: aviso.danger,
    disabledBg: aviso.darkSurface2,
    disabledText: aviso.darkText3,
    scrollbarThumb: aviso.darkLine,
    scrollbarTrack: "transparent",
    shadow: "0 16px 38px -14px oklch(0.12 0.02 155 / .6)",
    activeShadow:
      "0 0 0 3px color-mix(in oklab, oklch(0.70 0.052 150) 14%, transparent)",
    panelShadow: aviso.panelShadow,
    popShadow: aviso.popShadow,
    toolbarShadow: aviso.toolbarShadow,
    overlay: "oklch(0 0 0 / .28)"
  }
}

function isAvisoThemeMode(value: unknown): value is AvisoThemeMode {
  return value === "light" || value === "dark" || value === "system"
}

function readSystemPrefersDark(): boolean {
  return typeof window === "undefined" || !window.matchMedia
    ? true
    : window.matchMedia("(prefers-color-scheme: dark)").matches
}

export function useSyncedAvisoTheme() {
  const [mode, setMode] = useState<AvisoThemeMode>("system")
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    readSystemPrefersDark
  )

  useEffect(() => {
    if (!window.matchMedia) return
    const query = window.matchMedia("(prefers-color-scheme: dark)")
    setSystemPrefersDark(query.matches)
    const onChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches)
    }
    query.addEventListener?.("change", onChange)
    return () => query.removeEventListener?.("change", onChange)
  }, [])

  useEffect(() => {
    chrome.storage.sync.get("contextai_settings", (result) => {
      const nextMode = result.contextai_settings?.appearanceTheme
      if (isAvisoThemeMode(nextMode)) setMode(nextMode)
    })

    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area !== "sync" || !changes.contextai_settings) return
      const nextMode = changes.contextai_settings.newValue?.appearanceTheme
      if (isAvisoThemeMode(nextMode)) setMode(nextMode)
    }

    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  const resolved = resolveAvisoTheme(mode, systemPrefersDark)
  const tokens = useMemo(() => getAvisoThemeTokens(resolved), [resolved])

  return { mode, resolved, tokens }
}

export const visuallyStable: CSSProperties = {
  boxSizing: "border-box",
  WebkitFontSmoothing: "antialiased",
  textRendering: "optimizeLegibility"
}

function pol(cx: number, cy: number, r: number, deg: number): [number, number] {
  const angle = (deg * Math.PI) / 180
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
}

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const [sx, sy] = pol(cx, cy, r, a0)
  const [ex, ey] = pol(cx, cy, r, a1)
  const large = (a1 - a0 + 360) % 360 > 180 ? 1 : 0
  return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`
}

const GAP = 58
const MARK_PATHS = [
  { r: 41, w: 4, gap: 18 },
  { r: 28, w: 5.8, gap: 63 },
  { r: 15, w: 7.6, gap: 108 }
]
  .map(
    (ring) =>
      `<path d="${arcPath(50, 50, ring.r, ring.gap + GAP / 2, ring.gap + 360 - GAP / 2)}" fill="none" stroke="currentColor" stroke-width="${ring.w}" stroke-linecap="round"/>`
  )
  .join("")

const MARK_SVG = `${MARK_PATHS}<circle cx="50" cy="50" r="6.2" fill="currentColor"/>`

export type AvisoIconName =
  | "bookmark"
  | "chevdown"
  | "check"
  | "close"
  | "clipboard"
  | "commandPanel"
  | "copy"
  | "doubleClick"
  | "edit"
  | "explain"
  | "features"
  | "history"
  | "key"
  | "local"
  | "model"
  | "plus"
  | "refine"
  | "refresh"
  | "save"
  | "search"
  | "selection"
  | "send"
  | "shield"
  | "summarize"
  | "stop"
  | "trash"
  | "translate"
  | "warning"

export const ICONS: Record<AvisoIconName, string> = {
  bookmark:
    '<rect x="4" y="5" width="14" height="14" rx="2"/><path d="M8 5v6l2.5-1.8L13 11V5"/>',
  chevdown: '<path d="M6.5 9.5 12 15l5.5-5.5"/>',
  check: '<path d="M4.5 12.5l4.5 4.2L19.5 6.8"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  clipboard:
    '<rect x="6" y="5.5" width="12" height="16" rx="2.2"></rect><path d="M9.5 5.5A2.5 2.5 0 0 1 12 3a2.5 2.5 0 0 1 2.5 2.5v1.2h-5V5.5z"></path><path d="M9 12h6M9 16h4"></path>',
  commandPanel:
    '<rect x="4" y="5" width="16" height="14" rx="2.5"></rect><path d="M8 10l2.4 2L8 14M13 14h4"></path>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2.4"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  doubleClick:
    '<path d="M5 4.5l8.6 8.3-3.7.7 2.1 4.4-2.4 1.1-2.1-4.3-3 2V4.5z"></path><circle cx="17.5" cy="7" r="2"></circle><circle cx="19" cy="13" r="1.7"></circle>',
  edit:
    '<path d="M4.5 19.5l4.2-1 10-10a2.1 2.1 0 0 0-3-3l-10 10-1.2 4z"></path><path d="M14.6 6.2l3.2 3.2"></path>',
  explain:
    '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><circle cx="12" cy="7.8" r=".2" fill="currentColor" stroke-width="1.6"/>',
  features:
    '<path d="M4.5 7h7M15.5 7h4M4.5 12h3.5M12 12h7.5M4.5 17h9M17.5 17h2"></path><circle cx="13.5" cy="7" r="2"></circle><circle cx="10" cy="12" r="2"></circle><circle cx="15.5" cy="17" r="2"></circle>',
  history:
    '<path d="M3.6 9.5A8.5 8.5 0 1 1 4 14"/><path d="M3 5v4.5h4.5"/><path d="M12 8v4.2l3 1.8"/>',
  key: '<circle cx="8" cy="8" r="4.2"/><path d="M11 11l8.5 8.5M16.5 16.5l2-2M19.5 19.5l1.6-1.6"/>',
  local:
    '<rect x="4" y="5" width="16" height="12" rx="2.4"></rect><path d="M8 21h8M12 17v4M8.8 11.5l2.2 2.1 4.6-4.7"></path>',
  model:
    '<path d="M12 3l7.5 4.3v8.6L12 21l-7.5-5.1V7.3L12 3z"/><circle cx="12" cy="11.6" r="2.6" fill="currentColor" stroke="none"/>',
  plus: '<path d="M12 5v14M5 12h14"></path>',
  refine: '<path d="M4 20l1-4L16 5l3 3L8 19l-4 1z"/><path d="M14 7l3 3"/>',
  refresh:
    '<path d="M20 11a7.5 7.5 0 0 0-13.2-4.9L4.5 8.4"></path><path d="M4.5 4.5v3.9h3.9"></path><path d="M4 13a7.5 7.5 0 0 0 13.2 4.9l2.3-2.3"></path><path d="M19.5 19.5v-3.9h-3.9"></path>',
  save: '<path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 21 21"/>',
  selection:
    '<rect x="4.5" y="5" width="15" height="9" rx="2"></rect><path d="M7.5 9.5h7M7.5 18h6M16 14.5l4 4-2.8.6-1.2 2.5-4-9 9 4-2.5 1.2-.6 2.8"></path>',
  send: '<path d="M21 3 3 10.5l7 2.6L12.5 20 21 3z"/><path d="M21 3 10 13.1"/>',
  shield:
    '<path d="M12 3.2l7 2.8v5.2c0 4.2-3 7.3-7 8.6-4-1.3-7-4.4-7-8.6V6l7-2.8z"/><path d="M9 11.6l2.1 2.1L15.5 9.5"/>',
  stop: '<rect x="7" y="7" width="10" height="10" rx="2"/>',
  summarize: '<path d="M5 7h14M5 12h10M5 17h6"/>',
  trash:
    '<path d="M4 7h16"></path><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7"></path><path d="M7 7l1 13h8l1-13"></path><path d="M10 11v5M14 11v5"></path>',
  translate:
    '<text x="3.5" y="11" font-family="Hanken Grotesk,sans-serif" font-size="9.5" font-weight="700" fill="currentColor" stroke="none">A</text><text x="11" y="20.5" font-family="sans-serif" font-size="10" font-weight="600" fill="currentColor" stroke="none">文</text><path d="M3.5 14.5h6"/>',
  warning:
    '<path d="M12 4.5l8.5 15h-17l8.5-15z"/><path d="M12 10v4.2"/><circle cx="12" cy="17.3" r="1" fill="currentColor" stroke="none"/>'
}

type IconProps = {
  size?: number
  style?: CSSProperties
  name: AvisoIconName
}

export function AvisoIcon({ name, size = 16, style }: IconProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        color: "currentColor",
        flex: "0 0 auto",
        ...style
      }}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: "block", width: "100%", height: "100%" }}
        dangerouslySetInnerHTML={{ __html: ICONS[name] }}
      />
    </span>
  )
}

type MarkProps = {
  size?: number
  style?: CSSProperties
}

export function AvisoMark({ size = 18, style }: MarkProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        color: "currentColor",
        flex: "0 0 auto",
        ...style
      }}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        style={{ display: "block", width: "100%", height: "100%" }}
        dangerouslySetInnerHTML={{ __html: MARK_SVG }}
      />
    </span>
  )
}
