import type { CSSProperties, HTMLAttributes } from "react"

import { aviso, AvisoMark, visuallyStable } from "~styles/aviso"

type AvisoLogoVariant = "mark" | "wordmark" | "horizontal" | "vertical"
type AvisoLogoTone = "current" | "ink" | "sage" | "white"
type AvisoLogoSize = "sm" | "md" | "lg"

type AvisoLogoProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: AvisoLogoVariant
  tone?: AvisoLogoTone
  size?: AvisoLogoSize
  label?: string
}

const SIZE_MAP: Record<
  AvisoLogoSize,
  { mark: number; text: number; gap: number }
> = {
  sm: { mark: 16, text: 14, gap: 7 },
  md: { mark: 20, text: 17, gap: 9 },
  lg: { mark: 32, text: 28, gap: 12 }
}

const TONE_MAP: Record<AvisoLogoTone, string | undefined> = {
  current: undefined,
  ink: aviso.ink,
  sage: aviso.sage600,
  white: aviso.paper
}

export function AvisoLogo({
  variant = "horizontal",
  tone = "current",
  size = "md",
  label = "Aviso",
  style,
  ...props
}: AvisoLogoProps) {
  const spec = SIZE_MAP[size]
  const color = TONE_MAP[tone]
  const isVertical = variant === "vertical"
  const showMark = variant !== "wordmark"
  const showWordmark = variant !== "mark"

  const baseStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: isVertical ? "column" : "row",
    gap: spec.gap,
    color: color ?? "currentColor",
    fontFamily: aviso.font,
    fontWeight: 800,
    letterSpacing: 0,
    lineHeight: 1,
    textTransform: variant === "vertical" ? "uppercase" : "none",
    ...visuallyStable,
    ...style
  }

  return (
    <span aria-label={label} {...props} style={baseStyle}>
      {showMark && <AvisoMark size={spec.mark} />}
      {showWordmark && (
        <span style={{ fontSize: spec.text, color: "currentColor" }}>
          Aviso
        </span>
      )}
    </span>
  )
}
