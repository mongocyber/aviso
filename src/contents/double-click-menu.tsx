import type { PlasmoCSConfig, PlasmoGetShadowHostId } from "plasmo"
import { useEffect, useMemo, useRef, useState } from "react"

import { AvisoMenuItem } from "~components"
import {
  aviso,
  AvisoMark,
  useSyncedAvisoTheme,
  visuallyStable,
  type AvisoIconName
} from "~styles/aviso"
import type { PromptTemplate } from "~types/history"
import type { MessageResponse } from "~types/messages"
import {
  clampDoubleClickMenuPosition,
  hasValidDoubleClickSelection,
  isUnsafeDoubleClickTarget,
  type DoubleClickTargetDescriptor
} from "~utils/double-click-menu"
import { useSyncedAvisoLanguage } from "~utils/i18n"
import { getSettings } from "~utils/storage"
import { logTiming, startTiming } from "~utils/timing"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  all_frames: true
}

export const getShadowHostId: PlasmoGetShadowHostId = () =>
  "aviso-double-click-menu-host"

type MenuState = {
  visible: boolean
  left: number
  top: number
  selectionText: string
  templates: PromptTemplate[]
}

type QuickAction =
  | "copy-context"
  | "page-summary"
  | "explain"
  | "translate"
  | "polish"
  | "summarize"
  | "send"
  | "template"

const INITIAL_MENU: MenuState = {
  visible: false,
  left: 0,
  top: 0,
  selectionText: "",
  templates: []
}

const HOST_IDS = [
  "aviso-toolbar-host",
  "aviso-floating-host",
  "aviso-command-host",
  "aviso-clipboard-host",
  "aviso-double-click-menu-host"
]

const CODE_EDITOR_SELECTOR = [
  ".ace_editor",
  ".cm-editor",
  ".CodeMirror",
  ".monaco-editor",
  ".ProseMirror",
  ".ql-editor",
  ".tox-edit-area",
  "[data-slate-editor='true']"
].join(",")

const UNSAFE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "option",
  "[contenteditable='true']",
  "[contenteditable='']",
  "[role='textbox']",
  "[role='combobox']",
  CODE_EDITOR_SELECTOR
].join(",")

const MENU_WIDTH = 236
const BASE_MENU_HEIGHT = 268
const MAX_TEMPLATES_IN_MENU = 4
const SUPPRESS_SELECTION_TOOLBAR_EVENT = "aviso:suppress-selection-toolbar"

function DoubleClickMenu() {
  const { tokens: ui } = useSyncedAvisoTheme()
  const { t } = useSyncedAvisoLanguage()
  const [menu, setMenu] = useState<MenuState>(INITIAL_MENU)
  const enabledRef = useRef(false)
  const templatesRef = useRef<PromptTemplate[]>([])
  const menuRef = useRef<HTMLDivElement>(null)
  const closeMenu = () => setMenu((prev) => ({ ...prev, visible: false }))

  useEffect(() => {
    getSettings().then((settings) => {
      enabledRef.current = settings.enableDoubleClickMenu
      templatesRef.current = settings.templates ?? []
    })

    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => {
      if (area !== "sync" || !changes.contextai_settings) return
      const next = changes.contextai_settings.newValue as
        | {
            enableDoubleClickMenu?: boolean
            templates?: PromptTemplate[]
          }
        | undefined

      if (typeof next?.enableDoubleClickMenu === "boolean") {
        enabledRef.current = next.enableDoubleClickMenu
        if (!next.enableDoubleClickMenu) closeMenu()
      }

      if (Array.isArray(next?.templates)) {
        templatesRef.current = next.templates
      }
    }

    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  useEffect(() => {
    const onMouseDownCapture = (event: MouseEvent) => {
      if (!enabledRef.current) return
      if (event.detail < 2) return
      if (isInsideAvisoUI(event)) return
      if (!isSafeDoubleClickTarget(event.target)) return

      window.dispatchEvent(new CustomEvent(SUPPRESS_SELECTION_TOOLBAR_EVENT))
    }

    const onDoubleClick = async (event: MouseEvent) => {
      if (!enabledRef.current) return
      if (isInsideAvisoUI(event)) return
      if (!isSafeDoubleClickTarget(event.target)) return

      const selectionText = window.getSelection()?.toString().trim() ?? ""
      const templates = templatesRef.current
      const itemCount =
        4 +
        (hasValidDoubleClickSelection(selectionText) ? 5 : 0) +
        Math.min(templates.length, MAX_TEMPLATES_IN_MENU)
      const position = clampDoubleClickMenuPosition(
        { x: event.clientX + 10, y: event.clientY + 10 },
        { width: window.innerWidth, height: window.innerHeight },
        {
          width: MENU_WIDTH,
          height: Math.min(BASE_MENU_HEIGHT + itemCount * 4, 520)
        }
      )

      setMenu({
        visible: true,
        left: position.left,
        top: position.top,
        selectionText,
        templates
      })
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current) return
      const path = event.composedPath()
      if (!path.includes(menuRef.current)) closeMenu()
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu()
    }

    const onScroll = () => closeMenu()
    const onVisibilityChange = () => {
      if (document.hidden) closeMenu()
    }

    document.addEventListener("mousedown", onMouseDownCapture, true)
    document.addEventListener("dblclick", onDoubleClick)
    document.addEventListener("mousedown", onPointerDown, true)
    document.addEventListener("keydown", onKeyDown)
    window.addEventListener("scroll", onScroll, true)
    document.addEventListener("visibilitychange", onVisibilityChange)

    return () => {
      document.removeEventListener("mousedown", onMouseDownCapture, true)
      document.removeEventListener("dblclick", onDoubleClick)
      document.removeEventListener("mousedown", onPointerDown, true)
      document.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("scroll", onScroll, true)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [])

  const visibleTemplates = useMemo(
    () => menu.templates.slice(0, MAX_TEMPLATES_IN_MENU),
    [menu.templates]
  )

  const hasSelection = hasValidDoubleClickSelection(menu.selectionText)

  const runAction = (action: QuickAction, templateId?: string) => {
    const selectionText = menu.selectionText
    closeMenu()

    if (action === "copy-context") {
      sendRuntimeMessage({
        action: "REQUEST_COPY_CURRENT_CONTEXT",
        payload: {
          title: document.title,
          pageUrl: window.location.href,
          selectionText: hasValidDoubleClickSelection(selectionText)
            ? selectionText
            : undefined
        }
      })
      return
    }

    if (action === "page-summary") {
      sendRuntimeMessage({
        action: "REQUEST_SUMMARIZE_PAGE",
        payload: { pageUrl: window.location.href }
      })
      return
    }

    const operationMap: Record<QuickAction, string> = {
      "copy-context": "copy-context",
      "page-summary": "summarize",
      explain: "explain",
      translate: "translate",
      polish: "polish",
      summarize: "summarize",
      send: "custom",
      template: "template"
    }
    const requestId = `req-${Date.now()}`
    const timing = startTiming()
    const operation = operationMap[action]
    logTiming("trigger", requestId, timing, {
      trigger: "double-click-menu",
      operation,
      selectionChars: selectionText.length
    })

    sendRuntimeMessage({
      action: "SHOW_FLOATING_WINDOW",
      payload: {
        requestId,
        trigger: "double-click-menu",
        operation,
        selectionText,
        pageUrl: window.location.href,
        templateId,
        timing
      }
    })
  }

  if (!menu.visible) return null

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={t("doubleClick.aria")}
      style={{
        position: "fixed",
        left: menu.left,
        top: menu.top,
        width: MENU_WIDTH,
        maxWidth: "calc(100vw - 24px)",
        maxHeight: "min(520px, calc(100vh - 24px))",
        overflowY: "auto",
        background: ui.surface,
        border: `1px solid ${ui.line}`,
        borderRadius: aviso.radius,
        boxShadow: ui.popShadow,
        color: ui.text,
        fontFamily: aviso.font,
        padding: 6,
        zIndex: 2147483647,
        ...visuallyStable
      }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 9px 9px",
          color: ui.text2,
          fontSize: 12.5,
          borderBottom: `1px solid ${ui.line}`,
          marginBottom: 4
        }}>
        <AvisoMark size={16} style={{ color: ui.accent }} />
        <span>{t("doubleClick.title")}</span>
      </div>

      <MenuButton
        icon="copy"
        label={t("action.copyContext")}
        onClick={() => runAction("copy-context")}
      />
      <MenuButton
        icon="summarize"
        label={t("action.summarizePage")}
        onClick={() => runAction("page-summary")}
      />

      <MenuDivider />
      {visibleTemplates.length > 0 ? (
        visibleTemplates.map((template) => (
          <MenuButton
            key={template.id}
            icon="model"
            label={`${t("action.templatePrefix")}${template.name}`}
            onClick={() => runAction("template", template.id)}
          />
        ))
      ) : (
        <MenuButton icon="model" label={t("action.noTemplates")} disabled />
      )}

      {hasSelection && (
        <>
          <MenuDivider />
          <MenuButton
            icon="translate"
            label={t("action.translateSelection")}
            onClick={() => runAction("translate")}
          />
          <MenuButton
            icon="explain"
            label={t("action.explainSelection")}
            onClick={() => runAction("explain")}
          />
          <MenuButton
            icon="refine"
            label={t("action.polishSelection")}
            onClick={() => runAction("polish")}
          />
          <MenuButton
            icon="summarize"
            label={t("action.summarizeSelection")}
            onClick={() => runAction("summarize")}
          />
          <MenuButton
            icon="send"
            label={t("action.sendToAviso")}
            onClick={() => runAction("send")}
          />
        </>
      )}

      <style>{`
        .aviso-double-click-menu-button:hover:not(:disabled),
        .aviso-double-click-menu-button:focus-visible {
          background: ${ui.accentSoft} !important;
          color: ${ui.text} !important;
          outline: none;
        }
        .aviso-double-click-menu-button:focus-visible {
          box-shadow: ${ui.focusRing};
        }
        .aviso-double-click-menu-button:active:not(:disabled) {
          transform: translateY(1px);
        }
      `}</style>
    </div>
  )
}

function MenuButton({
  icon,
  label,
  disabled,
  onClick
}: {
  icon: AvisoIconName
  label: string
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <AvisoMenuItem
      icon={icon}
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className="aviso-double-click-menu-button"
      style={{ minHeight: 34 }}>
      {label}
    </AvisoMenuItem>
  )
}

function MenuDivider() {
  const { tokens: ui } = useSyncedAvisoTheme()

  return (
    <div
      style={{
        height: 1,
        background: ui.line,
        margin: "5px 6px"
      }}
    />
  )
}

function isInsideAvisoUI(event: MouseEvent): boolean {
  const path = event.composedPath()
  return HOST_IDS.some((id) => {
    const host = document.getElementById(id)
    return !!host && path.includes(host)
  })
}

function isSafeDoubleClickTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  if (target.closest(UNSAFE_SELECTOR)) return false

  const descriptor = describeTarget(target)
  return !isUnsafeDoubleClickTarget(descriptor)
}

function describeTarget(target: Element): DoubleClickTargetDescriptor {
  const input = target instanceof HTMLInputElement ? target : null
  const editor = target.closest(CODE_EDITOR_SELECTOR)
  return {
    tagName: target.tagName,
    inputType: input?.type,
    role: target.getAttribute("role") ?? undefined,
    isContentEditable: (target as HTMLElement).isContentEditable,
    id: target.id || editor?.id,
    className: [target.className, editor?.className].join(" "),
    ariaLabel: target.getAttribute("aria-label") ?? undefined
  }
}

function sendRuntimeMessage(message: unknown) {
  chrome.runtime.sendMessage(message, (response?: MessageResponse) => {
    const runtimeError = chrome.runtime.lastError
    if (runtimeError) {
      console.warn("[Aviso] Double-click menu action failed", {
        error: runtimeError.message
      })
      return
    }

    if (response && !response.success) {
      console.warn("[Aviso] Double-click menu action was rejected", {
        error: response.error
      })
    }
  })
}

export default DoubleClickMenu
