import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react"

import {
  aviso,
  AvisoIcon,
  useSyncedAvisoTheme,
  visuallyStable,
  type AvisoIconName
} from "~styles/aviso"

type AvisoMenuItemProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: AvisoIconName
  trailing?: ReactNode
  description?: ReactNode
  active?: boolean
  danger?: boolean
  children: ReactNode
}

export function AvisoMenuItem({
  icon,
  trailing,
  description,
  active = false,
  danger = false,
  disabled,
  children,
  style,
  ...props
}: AvisoMenuItemProps) {
  const { tokens: ui } = useSyncedAvisoTheme()
  const color = danger ? ui.danger : disabled ? ui.disabledText : ui.text2
  const background = active ? (danger ? ui.dangerBg : ui.accentSoft) : "transparent"

  const itemStyle: CSSProperties = {
    width: "100%",
    minHeight: description ? 48 : 34,
    display: "flex",
    alignItems: "center",
    gap: 9,
    border: "none",
    borderRadius: aviso.radiusSm,
    background,
    color,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.62 : 1,
    padding: description ? "8px 10px" : "8px 9px",
    fontFamily: aviso.font,
    textAlign: "left",
    transition: `.15s ${aviso.ease}`,
    ...visuallyStable,
    ...style
  }

  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      {...props}
      style={itemStyle}>
      {icon && (
        <AvisoIcon
          name={icon}
          size={15}
          style={{ color: danger ? ui.danger : ui.accent }}
        />
      )}
      <span style={{ minWidth: 0, flex: 1 }}>
        <span
          style={{
            display: "block",
            color: danger ? ui.danger : disabled ? ui.disabledText : ui.text,
            fontSize: 13,
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap"
          }}>
          {children}
        </span>
        {description && (
          <span
            style={{
              display: "block",
              color: ui.text3,
              fontSize: 11.5,
              lineHeight: 1.4,
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}>
            {description}
          </span>
        )}
      </span>
      {trailing}
    </button>
  )
}
