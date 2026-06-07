export type DoubleClickTargetDescriptor = {
  tagName?: string
  inputType?: string
  role?: string
  isContentEditable?: boolean
  id?: string
  className?: string
  ariaLabel?: string
}

export type MenuPoint = {
  x: number
  y: number
}

export type MenuPlacement = {
  left: number
  top: number
}

const UNSAFE_TAGS = new Set(["input", "textarea", "select", "option"])
const TEXT_INPUT_TYPES = new Set([
  "",
  "email",
  "number",
  "password",
  "search",
  "tel",
  "text",
  "url"
])

const CODE_EDITOR_PATTERNS = [
  "ace_editor",
  "cm-editor",
  "codemirror",
  "monaco-editor",
  "prosemirror",
  "ql-editor",
  "tox-edit-area",
  "slate-editor"
]

export const DOUBLE_CLICK_MENU_SELECTION_MIN_CHARS = 2

export function hasValidDoubleClickSelection(text: string): boolean {
  return text.trim().length >= DOUBLE_CLICK_MENU_SELECTION_MIN_CHARS
}

export function isUnsafeDoubleClickTarget(
  target: DoubleClickTargetDescriptor
): boolean {
  const tagName = (target.tagName ?? "").toLowerCase()
  const inputType = (target.inputType ?? "").toLowerCase()
  const role = (target.role ?? "").toLowerCase()

  if (target.isContentEditable) return true
  if (role === "textbox" || role === "combobox") return true

  if (tagName === "input") {
    return TEXT_INPUT_TYPES.has(inputType)
  }

  if (UNSAFE_TAGS.has(tagName)) return true

  const searchable = [
    target.id,
    target.className,
    target.ariaLabel
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return CODE_EDITOR_PATTERNS.some((pattern) => searchable.includes(pattern))
}

export function clampDoubleClickMenuPosition(
  point: MenuPoint,
  viewport: { width: number; height: number },
  menu: { width: number; height: number },
  margin = 12
): MenuPlacement {
  const left = Math.min(
    Math.max(point.x, margin),
    Math.max(margin, viewport.width - menu.width - margin)
  )
  const top = Math.min(
    Math.max(point.y, margin),
    Math.max(margin, viewport.height - menu.height - margin)
  )

  return { left, top }
}
