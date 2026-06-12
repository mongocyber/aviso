import type { ButtonHTMLAttributes, CSSProperties } from "react"

import {
  aviso,
  AvisoIcon,
  useSyncedAvisoTheme,
  visuallyStable,
  type AvisoIconName
} from "~styles/aviso"

type AvisoIconButtonVariant = "ghost" | "soft" | "danger"
type AvisoIconButtonSize = "sm" | "md"

type AvisoIconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  icon: AvisoIconName
  "aria-label": string
  variant?: AvisoIconButtonVariant
  size?: AvisoIconButtonSize
}

const SIZE_MAP: Record<AvisoIconButtonSize, { box: number; icon: number }> = {
  sm: { box: 28, icon: 15 },
  md: { box: 34, icon: 17 }
}

export function AvisoIconButton({
  icon,
  variant = "ghost",
  size = "sm",
  disabled,
  style,
  ...props
}: AvisoIconButtonProps) {
  const { tokens: ui } = useSyncedAvisoTheme()
  const sizeSpec = SIZE_MAP[size]
  const palette = resolveIconButtonPalette(variant, ui, Boolean(disabled))

  const buttonStyle: CSSProperties = {
    width: sizeSpec.box,
    height: sizeSpec.box,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: palette.border,
    borderRadius: aviso.radiusSm,
    background: palette.background,
    color: palette.color,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.62 : 1,
    padding: 0,
    transition: `.15s ${aviso.ease}`,
    ...visuallyStable,
    ...style
  }

  return (
    <button type="button" disabled={disabled} {...props} style={buttonStyle}>
      <AvisoIcon name={icon} size={sizeSpec.icon} />
    </button>
  )
}

function resolveIconButtonPalette(
  variant: AvisoIconButtonVariant,
  ui: ReturnType<typeof useSyncedAvisoTheme>["tokens"],
  disabled: boolean
) {
  if (disabled) {
    return {
      background: "transparent",
      border: "1px solid transparent",
      color: ui.disabledText
    }
  }

  if (variant === "soft") {
    return {
      background: ui.accentSoft,
      border: "1px solid transparent",
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
    border: "1px solid transparent",
    color: ui.text3
  }
}
