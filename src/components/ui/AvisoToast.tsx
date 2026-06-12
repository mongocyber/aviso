import type { CSSProperties, HTMLAttributes, ReactNode } from "react"

import {
  aviso,
  AvisoIcon,
  AvisoMark,
  useSyncedAvisoTheme,
  visuallyStable,
  type AvisoIconName
} from "~styles/aviso"

type AvisoToastTone = "neutral" | "success" | "warning" | "danger"

type AvisoToastProps = HTMLAttributes<HTMLDivElement> & {
  tone?: AvisoToastTone
  icon?: AvisoIconName
  title: ReactNode
  detail?: ReactNode
  action?: ReactNode
  showProgress?: boolean
}

export function AvisoToast({
  tone = "neutral",
  icon,
  title,
  detail,
  action,
  showProgress = false,
  style,
  ...props
}: AvisoToastProps) {
  const { tokens: ui } = useSyncedAvisoTheme()
  const toneColor = resolveToastTone(tone, ui)

  const toastStyle: CSSProperties = {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 11,
    maxWidth: "min(330px, calc(100vw - 32px))",
    overflow: "hidden",
    background: ui.mode === "dark" ? aviso.darkSurface : ui.surface,
    border: `1px solid ${tone === "danger" ? ui.dangerBorder : ui.line}`,
    borderRadius: aviso.radiusMd,
    boxShadow: ui.shadow,
    color: ui.text,
    fontFamily: aviso.font,
    padding: "11px 12px 11px 14px",
    ...visuallyStable,
    ...style
  }

  return (
    <div role={tone === "danger" ? "alert" : "status"} {...props} style={toastStyle}>
      {icon ? (
        <AvisoIcon name={icon} size={20} style={{ color: toneColor }} />
      ) : (
        <AvisoMark size={20} style={{ color: toneColor }} />
      )}
      <span style={{ minWidth: 0, flex: 1 }}>
        <strong
          style={{
            display: "block",
            color: ui.text,
            fontSize: 13.5,
            fontWeight: 650,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
          {title}
        </strong>
        {detail && (
          <span
            style={{
              display: "block",
              color: ui.text3,
              fontSize: 11.5,
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>
            {detail}
          </span>
        )}
      </span>
      {action}
      {showProgress && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: "100%",
            height: 2,
            background: toneColor,
            transformOrigin: "left"
          }}
        />
      )}
    </div>
  )
}

function resolveToastTone(
  tone: AvisoToastTone,
  ui: ReturnType<typeof useSyncedAvisoTheme>["tokens"]
) {
  if (tone === "success") return aviso.ok
  if (tone === "warning") return ui.warningText
  if (tone === "danger") return ui.danger
  return ui.accent
}
