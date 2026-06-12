import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react"

import {
  aviso,
  AvisoIcon,
  useSyncedAvisoTheme,
  visuallyStable,
  type AvisoIconName
} from "~styles/aviso"

type AvisoButtonVariant = "primary" | "secondary" | "ghost" | "danger"
type AvisoButtonSize = "sm" | "md"

type AvisoButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AvisoButtonVariant
  size?: AvisoButtonSize
  icon?: AvisoIconName
  trailingIcon?: AvisoIconName
  fullWidth?: boolean
  children: ReactNode
}

const SIZE_STYLE: Record<
  AvisoButtonSize,
  { height: number; padding: string; fontSize: number; icon: number }
> = {
  sm: { height: 30, padding: "6px 10px", fontSize: 12.5, icon: 14 },
  md: { height: 36, padding: "8px 14px", fontSize: 13.5, icon: 16 }
}

export function AvisoButton({
  variant = "primary",
  size = "md",
  icon,
  trailingIcon,
  fullWidth = false,
  disabled,
  children,
  style,
  ...props
}: AvisoButtonProps) {
  const { tokens: ui } = useSyncedAvisoTheme()
  const sizeStyle = SIZE_STYLE[size]
  const palette = resolveButtonPalette(variant, ui, Boolean(disabled))

  const buttonStyle: CSSProperties = {
    minHeight: sizeStyle.height,
    width: fullWidth ? "100%" : undefined,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    border: palette.border,
    borderRadius: aviso.radiusSm,
    background: palette.background,
    color: palette.color,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.68 : 1,
    padding: sizeStyle.padding,
    fontFamily: aviso.font,
    fontSize: sizeStyle.fontSize,
    fontWeight: 650,
    lineHeight: 1.2,
    whiteSpace: "nowrap",
    transition: `.15s ${aviso.ease}`,
    ...visuallyStable,
    ...style
  }

  return (
    <button type="button" disabled={disabled} {...props} style={buttonStyle}>
      {icon && <AvisoIcon name={icon} size={sizeStyle.icon} />}
      <span
        style={{
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis"
        }}>
        {children}
      </span>
      {trailingIcon && <AvisoIcon name={trailingIcon} size={sizeStyle.icon} />}
    </button>
  )
}

function resolveButtonPalette(
  variant: AvisoButtonVariant,
  ui: ReturnType<typeof useSyncedAvisoTheme>["tokens"],
  disabled: boolean
) {
  if (disabled) {
    return {
      background: ui.disabledBg,
      border: `1px solid ${ui.disabledBg}`,
      color: ui.disabledText
    }
  }

  if (variant === "primary") {
    return {
      background: ui.accent,
      border: `1px solid ${ui.accent}`,
      color: ui.accentText
    }
  }

  if (variant === "secondary") {
    return {
      background: ui.accentSoft,
      border: `1px solid ${ui.accentBorder}`,
      color: ui.accent
    }
  }

  if (variant === "danger") {
    return {
      background: ui.dangerBg,
      border: `1px solid ${ui.dangerBorder}`,
      color: ui.danger
    }
  }

  return {
    background: "transparent",
    border: `1px solid ${ui.line}`,
    color: ui.text2
  }
}
