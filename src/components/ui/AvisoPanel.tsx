import type { CSSProperties, HTMLAttributes, ReactNode } from "react"

import {
  aviso,
  AvisoMark,
  useSyncedAvisoTheme,
  visuallyStable
} from "~styles/aviso"

type AvisoPanelProps = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode
  meta?: ReactNode
  leading?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  compact?: boolean
  elevated?: boolean
  children: ReactNode
}

export function AvisoPanel({
  title,
  meta,
  leading,
  actions,
  footer,
  compact = false,
  elevated = true,
  children,
  style,
  ...props
}: AvisoPanelProps) {
  const { tokens: ui } = useSyncedAvisoTheme()
  const hasHeader = Boolean(title || meta || leading || actions)

  const panelStyle: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: ui.surface,
    border: `1px solid ${ui.line}`,
    borderRadius: aviso.radiusLg,
    boxShadow: elevated ? ui.panelShadow : undefined,
    color: ui.text,
    fontFamily: aviso.font,
    ...visuallyStable,
    ...style
  }

  return (
    <div {...props} style={panelStyle}>
      {hasHeader && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
            borderBottom: `1px solid ${ui.line}`,
            padding: compact ? "10px 12px" : "13px 14px"
          }}>
          {leading ?? <AvisoMark size={18} style={{ color: ui.accent }} />}
          <div style={{ minWidth: 0, flex: 1 }}>
            {title && (
              <div
                style={{
                  color: ui.text,
                  fontSize: compact ? 13.5 : 14,
                  fontWeight: 750,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}>
                {title}
              </div>
            )}
            {meta && (
              <div
                style={{
                  color: ui.text3,
                  fontFamily: aviso.mono,
                  fontSize: 10.5,
                  lineHeight: 1.4,
                  marginTop: title ? 2 : 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}>
                {meta}
              </div>
            )}
          </div>
          {actions}
        </div>
      )}
      <div style={{ minWidth: 0, padding: compact ? 12 : 16 }}>{children}</div>
      {footer && (
        <div
          style={{
            borderTop: `1px solid ${ui.line}`,
            background: `color-mix(in oklab, ${ui.bg} 40%, transparent)`,
            padding: compact ? "9px 12px" : "10px 12px"
          }}>
          {footer}
        </div>
      )}
    </div>
  )
}
