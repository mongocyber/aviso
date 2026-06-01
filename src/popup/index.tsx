import { useEffect, useRef, useState } from "react"

import { aviso, AvisoIcon, AvisoMark, visuallyStable } from "~styles/aviso"
import type { HistoryEntry, PromptTemplate, Settings } from "~types/history"
import {
  getApiKeys,
  getSettings,
  saveApiKey,
  saveSettings
} from "~utils/storage"

const TEMPLATE_CONTEXTS: { value: string; label: string }[] = [
  { value: "selection", label: "选中文字" },
  { value: "link", label: "链接" },
  { value: "image", label: "图片" },
  { value: "editable", label: "可编辑区" },
  { value: "page", label: "页面" }
]

const DEFAULT_SETTINGS: Settings = {
  defaultModel: "gpt-4o-mini",
  enableClipboardSense: true,
  enableToolbar: true,
  enableCommandPalette: true,
  templates: []
}

const MODEL_OPTIONS = [
  { value: "gpt-4o-mini", label: "GPT-4o mini（推荐，速度快）" },
  { value: "gpt-4o", label: "GPT-4o（更强）" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku（轻量）" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet（更强）" },
  { value: "doubao", label: "豆包（火山方舟）" }
]

const POPUP_FRAME = {
  width: 356,
  compactHeight: 516,
  expandedHeight: 600
} as const

const settingsSignature = (value: Settings) =>
  JSON.stringify({
    defaultModel: value.defaultModel,
    doubaoModel: value.doubaoModel ?? "",
    enableClipboardSense: value.enableClipboardSense,
    enableToolbar: value.enableToolbar,
    enableCommandPalette: value.enableCommandPalette,
    templates: value.templates ?? []
  })

function Popup() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [openaiKey, setOpenaiKey] = useState("")
  const [anthropicKey, setAnthropicKey] = useState("")
  const [doubaoKey, setDoubaoKey] = useState("")
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<"general" | "api" | "templates" | "history">(
    "general"
  )
  const [draft, setDraft] = useState<PromptTemplate | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [openHint, setOpenHint] = useState("")
  const [showPrivacy, setShowPrivacy] = useState(false)
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false)

  // 自动保存：首屏加载完成前不触发保存，避免把默认值写回覆盖已存设置
  const loaded = useRef(false)
  const persistedSettingsSignature = useRef("")
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()
  const modelDropdownRef = useRef<HTMLDivElement>(null)

  // 顶部短暂提示"已保存"
  const flashSaved = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const loadHistory = () => {
    chrome.runtime.sendMessage({ action: "GET_HISTORY" }, (resp) => {
      if (resp?.success && Array.isArray(resp.data)) setHistory(resp.data)
    })
  }

  useEffect(() => {
    if (tab === "history") loadHistory()
  }, [tab])

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (!modelDropdownRef.current?.contains(event.target as Node)) {
        setModelDropdownOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModelDropdownOpen(false)
    }

    document.addEventListener("mousedown", closeOnOutside)
    document.addEventListener("keydown", closeOnEscape)
    return () => {
      document.removeEventListener("mousedown", closeOnOutside)
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [])

  const pinEntry = (id: string) => {
    chrome.runtime.sendMessage(
      { action: "PIN_HISTORY", payload: { id } },
      loadHistory
    )
  }
  const deleteEntry = (id: string) => {
    chrome.runtime.sendMessage(
      { action: "DELETE_HISTORY", payload: { id } },
      () => setHistory((prev) => prev.filter((e) => e.id !== id))
    )
  }
  const clearAll = () => {
    chrome.runtime.sendMessage({ action: "CLEAR_HISTORY" }, () =>
      setHistory([])
    )
  }

  // 点击历史项：在当前标签页右下角浮窗中恢复这次对话
  const openHistory = (entry: HistoryEntry) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id
      const url = tabs[0]?.url ?? ""
      // chrome:// 等受限页面无法注入内容脚本，提示用户切到普通网页
      if (!tabId || /^(chrome|edge|about|chrome-extension):/.test(url)) {
        setOpenHint("请切换到普通网页后再打开历史")
        setTimeout(() => setOpenHint(""), 2500)
        return
      }
      chrome.tabs.sendMessage(
        tabId,
        {
          action: "SHOW_FLOATING_WINDOW",
          payload: {
            trigger: "history",
            operation: entry.operation || "custom",
            restore: { input: entry.input ?? "", output: entry.output ?? "" }
          }
        },
        () => {
          if (chrome.runtime.lastError) {
            setOpenHint("当前页面无法打开，请刷新后再试")
            setTimeout(() => setOpenHint(""), 2500)
          } else {
            window.close()
          }
        }
      )
    })
  }

  useEffect(() => {
    Promise.all([getSettings(), getApiKeys()]).then(([s, keys]) => {
      persistedSettingsSignature.current = settingsSignature(s)
      setSettings(s)
      // 显示掩码
      if (keys.openai) setOpenaiKey("••••••••" + keys.openai.slice(-4))
      if (keys.anthropic) setAnthropicKey("••••••••" + keys.anthropic.slice(-4))
      if (keys.doubao) setDoubaoKey("••••••••" + keys.doubao.slice(-4))
      // 加载完成后才允许自动保存
      loaded.current = true
    })
  }, [])

  // 设置（模型 / 开关 / 模板 / 豆包接入点）变更即时保存，防抖 300ms
  useEffect(() => {
    if (!loaded.current) return
    const nextSignature = settingsSignature(settings)
    if (nextSignature === persistedSettingsSignature.current) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await saveSettings(settings)
      persistedSettingsSignature.current = nextSignature
      // 通知 background 重建右键菜单，使模板/模型变更即时生效
      chrome.runtime.sendMessage({ action: "UPDATE_TEMPLATES" })
      flashSaved()
    }, 300)
    return () => clearTimeout(saveTimer.current)
  }, [settings])

  // API Key 在输入框失焦时保存（掩码值跳过，避免覆盖已存 Key）
  const saveKeyOnBlur = async (
    provider: "openai" | "anthropic" | "doubao",
    value: string
  ) => {
    if (!value || value.startsWith("••")) return
    await saveApiKey(provider, value)
    flashSaved()
  }

  const commitDraft = () => {
    if (!draft || !draft.name.trim() || !draft.prompt.trim()) return
    const exists = settings.templates.some((t) => t.id === draft.id)
    const templates = exists
      ? settings.templates.map((t) => (t.id === draft.id ? draft : t))
      : [...settings.templates, draft]
    updateSetting("templates", templates)
    setDraft(null)
  }

  const toggleDraftContext = (ctx: string) => {
    if (!draft) return
    const has = draft.contexts.includes(ctx)
    const contexts = has
      ? draft.contexts.filter((c) => c !== ctx)
      : [...draft.contexts, ctx]
    setDraft({ ...draft, contexts: contexts.length ? contexts : ["selection"] })
  }

  const updateSetting = <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  const selectedModel =
    MODEL_OPTIONS.find((m) => m.value === settings.defaultModel) ??
    MODEL_OPTIONS[0]
  const popupHeight =
    tab === "api" || tab === "templates"
      ? POPUP_FRAME.expandedHeight
      : POPUP_FRAME.compactHeight
  const panelSectionStyle =
    tab === "api" || tab === "templates"
      ? { ...styles.section, ...styles.expandedSection }
      : styles.section

  return (
    <div
      style={{
        ...styles.container,
        height: popupHeight
      }}>
      <style>{`
        html,
        body {
          width: ${POPUP_FRAME.width}px;
          height: ${popupHeight}px;
          margin: 0;
          background: ${aviso.darkSurface};
          overflow: hidden;
        }
        #__plasmo {
          width: ${POPUP_FRAME.width}px;
          height: ${popupHeight}px;
          overflow: hidden;
        }
        #aviso-popup-content {
          scrollbar-width: thin;
          scrollbar-color: ${aviso.darkLine} transparent;
        }
        #aviso-popup-content::-webkit-scrollbar {
          width: 8px;
        }
        #aviso-popup-content::-webkit-scrollbar-track {
          background: transparent;
        }
        #aviso-popup-content::-webkit-scrollbar-thumb {
          background: ${aviso.darkLine};
          border: 2px solid ${aviso.darkBg};
          border-radius: 999px;
        }
        select,
        input,
        textarea,
        button {
          font: inherit;
        }
        .aviso-dropdown-trigger:hover {
          border-color: ${aviso.sage500};
        }
        .aviso-dropdown-option:hover {
          background: color-mix(in oklab, ${aviso.sage400} 16%, transparent);
        }
      `}</style>
      <header style={styles.header}>
        <span style={styles.logo}>
          <AvisoMark size={20} />
          Aviso
        </span>
        <span style={styles.version}>v0.1.0</span>
      </header>

      {/* 标签页 */}
      <div style={styles.tabs}>
        {(["general", "api", "templates", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              ...styles.tabBtn,
              ...(tab === t ? styles.tabBtnActive : {})
            }}>
            {
              {
                general: "常规",
                api: "API Key",
                templates: "模板",
                history: "历史"
              }[t]
            }
          </button>
        ))}
      </div>

      <div id="aviso-popup-content" style={styles.content}>
        {/* 常规设置 */}
        {tab === "general" && (
          <>
            <div style={panelSectionStyle}>
              <label style={styles.label}>默认 AI 模型</label>
              <div ref={modelDropdownRef} style={styles.dropdown}>
                <button
                  type="button"
                  className="aviso-dropdown-trigger"
                  aria-haspopup="listbox"
                  aria-expanded={modelDropdownOpen}
                  onClick={() => setModelDropdownOpen((open) => !open)}
                  style={{
                    ...styles.dropdownTrigger,
                    ...(modelDropdownOpen ? styles.dropdownTriggerOpen : {})
                  }}>
                  <span style={styles.dropdownValue}>
                    <AvisoIcon
                      name="model"
                      size={16}
                      style={styles.dropdownValueIcon}
                    />
                    <span style={styles.dropdownText}>
                      {selectedModel.label}
                    </span>
                  </span>
                  <AvisoIcon
                    name="chevdown"
                    size={16}
                    style={{
                      ...styles.dropdownChevron,
                      transform: modelDropdownOpen ? "rotate(180deg)" : "none"
                    }}
                  />
                </button>
                {modelDropdownOpen && (
                  <div role="listbox" style={styles.dropdownMenu}>
                    {MODEL_OPTIONS.map((model) => {
                      const selected = model.value === settings.defaultModel
                      return (
                        <button
                          key={model.value}
                          type="button"
                          className="aviso-dropdown-option"
                          role="option"
                          aria-selected={selected}
                          onClick={() => {
                            updateSetting("defaultModel", model.value)
                            setModelDropdownOpen(false)
                          }}
                          style={{
                            ...styles.dropdownOption,
                            ...(selected ? styles.dropdownOptionSelected : {})
                          }}>
                          <AvisoIcon
                            name="model"
                            size={16}
                            style={{
                              ...styles.dropdownOptionIcon,
                              ...(selected
                                ? styles.dropdownOptionIconSelected
                                : {})
                            }}
                          />
                          <span style={styles.dropdownOptionText}>
                            {model.label}
                          </span>
                          <AvisoIcon
                            name="check"
                            size={15}
                            style={{
                              ...styles.dropdownCheck,
                              opacity: selected ? 1 : 0
                            }}
                          />
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div style={panelSectionStyle}>
              <label style={styles.label}>功能开关</label>
              {(
                [
                  ["enableToolbar", "划词浮动工具栏"],
                  ["enableClipboardSense", "剪贴板感知提示"],
                  [
                    "enableCommandPalette",
                    "命令面板",
                    "Mac Command+Shift+Space",
                    "Win/Linux Ctrl+Shift+Space"
                  ]
                ] as [keyof Settings, string, string?, string?][]
              ).map(([key, label, helper, helper2]) => (
                <div key={key} style={styles.toggleItem}>
                  <div style={styles.toggleRow}>
                    <span style={styles.toggleLabel}>{label}</span>
                    <button
                      onClick={() => updateSetting(key, !settings[key] as any)}
                      style={{
                        ...styles.toggle,
                        background: settings[key]
                          ? aviso.sage500
                          : aviso.darkSurface2
                      }}>
                      <span
                        style={{
                          ...styles.toggleThumb,
                          transform: settings[key]
                            ? "translateX(21px)"
                            : "translateX(3px)"
                        }}
                      />
                    </button>
                  </div>
                  {helper && (
                    <span style={styles.toggleHelper}>
                      {helper}
                      {helper2 && (
                        <>
                          <br />
                          {helper2}
                        </>
                      )}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* API Key */}
        {tab === "api" && (
          <div style={panelSectionStyle}>
            <p style={styles.privacyNote}>
              <AvisoIcon name="shield" size={15} />
              API Key 使用 AES-256 加密存储在本地，不会上传到任何服务器。
            </p>
            {(
              [
                {
                  provider: "openai",
                  label: "OpenAI API Key",
                  value: openaiKey,
                  setter: setOpenaiKey,
                  placeholder: "sk-..."
                },
                {
                  provider: "anthropic",
                  label: "Anthropic API Key",
                  value: anthropicKey,
                  setter: setAnthropicKey,
                  placeholder: "sk-ant-..."
                },
                {
                  provider: "doubao",
                  label: "豆包 API Key（火山方舟 ARK）",
                  value: doubaoKey,
                  setter: setDoubaoKey,
                  placeholder: "火山方舟控制台获取"
                }
              ] as const
            ).map(({ provider, label, value, setter, placeholder }) => (
              <div key={label} style={styles.fieldGroup}>
                <label style={styles.label}>{label}</label>
                <input
                  type="password"
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  onBlur={(e) => saveKeyOnBlur(provider, e.target.value)}
                  placeholder={placeholder}
                  style={styles.input}
                />
              </div>
            ))}

            <div style={styles.fieldGroup}>
              <label style={styles.label}>豆包接入点 ID / 模型名</label>
              <input
                type="text"
                value={settings.doubaoModel ?? ""}
                onChange={(e) => updateSetting("doubaoModel", e.target.value)}
                placeholder="如 ep-2024... 或 doubao-pro-32k"
                style={styles.input}
              />
              <p style={{ ...styles.hint, marginTop: 6, marginBottom: 0 }}>
                选「豆包」模型时使用此接入点。在火山方舟控制台「在线推理」创建接入点后复制其
                ID。
              </p>
            </div>
          </div>
        )}

        {/* 模板管理 */}
        {tab === "templates" && (
          <div style={panelSectionStyle}>
            <p style={styles.hint}>
              自定义 Prompt 模板（最多 20 条），将在右键菜单中显示。
              可用占位符：{"{{selection}}"} 选中文字、{"{{url}}"} 页面地址、
              {"{{page}}"} 页面正文。
            </p>

            {settings.templates.length === 0 && !draft && (
              <p style={styles.emptyText}>暂无模板，请点击下方添加。</p>
            )}

            {settings.templates.map((t) => (
              <div key={t.id} style={styles.templateRow}>
                <span style={styles.templateName}>{t.name}</span>
                <button
                  onClick={() => setDraft({ ...t, contexts: [...t.contexts] })}
                  style={styles.editBtn}>
                  编辑
                </button>
                <button
                  onClick={() =>
                    updateSetting(
                      "templates",
                      settings.templates.filter((x) => x.id !== t.id)
                    )
                  }
                  style={styles.deleteBtn}>
                  删除
                </button>
              </div>
            ))}

            {draft ? (
              <div style={styles.templateForm}>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="模板名称"
                  style={styles.input}
                />
                <textarea
                  value={draft.prompt}
                  onChange={(e) =>
                    setDraft({ ...draft, prompt: e.target.value })
                  }
                  placeholder="Prompt 内容，用 {{selection}} 引用选中文字"
                  rows={4}
                  style={{
                    ...styles.input,
                    resize: "vertical",
                    fontFamily: "inherit"
                  }}
                />
                <div style={styles.contextChips}>
                  {TEMPLATE_CONTEXTS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => toggleDraftContext(c.value)}
                      style={{
                        ...styles.chip,
                        ...(draft.contexts.includes(c.value)
                          ? styles.chipActive
                          : {})
                      }}>
                      {c.label}
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={commitDraft} style={styles.primaryBtn}>
                    完成
                  </button>
                  <button
                    onClick={() => setDraft(null)}
                    style={styles.deleteBtn}>
                    取消
                  </button>
                </div>
              </div>
            ) : (
              settings.templates.length < 20 && (
                <button
                  onClick={() =>
                    setDraft({
                      id: `tpl-${Date.now()}`,
                      name: "",
                      prompt: "",
                      contexts: ["selection"]
                    })
                  }
                  style={styles.addBtn}>
                  + 添加模板
                </button>
              )
            )}
          </div>
        )}

        {/* 历史记录 */}
        {tab === "history" && (
          <div style={panelSectionStyle}>
            {history.length === 0 ? (
              <p style={styles.emptyText}>暂无历史记录。</p>
            ) : (
              <>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: 8
                  }}>
                  <button onClick={clearAll} style={styles.deleteBtn}>
                    清空全部
                  </button>
                </div>
                {openHint && <p style={styles.warningText}>{openHint}</p>}
                {history.map((e) => (
                  <div key={e.id} style={styles.historyItem}>
                    <div
                      onClick={() => openHistory(e)}
                      title="点击在页面右下角恢复这次对话"
                      style={{ flex: 1, minWidth: 0, cursor: "pointer" }}>
                      <div style={styles.historyInput}>
                        {e.pinned && (
                          <AvisoMark
                            size={13}
                            style={{ color: aviso.sage400, marginRight: 4 }}
                          />
                        )}
                        {e.input || "（无输入）"}
                      </div>
                      <div style={styles.historyOutput}>
                        {e.output?.slice(0, 80)}
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 4
                      }}>
                      {!e.pinned && (
                        <button
                          onClick={() => pinEntry(e.id)}
                          style={styles.editBtn}>
                          置顶
                        </button>
                      )}
                      <button
                        onClick={() => deleteEntry(e.id)}
                        style={styles.deleteBtn}>
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {showPrivacy && (
        <div style={styles.privacyBox}>
          Aviso 不收集、不上传任何数据。API Key 经 AES-256 加密后仅存于本机； AI
          请求由你的浏览器直连模型厂商（OpenAI / Anthropic /
          豆包·火山方舟），不经过任何中间服务器。
          历史记录与设置保存在浏览器本地存储中。
        </div>
      )}
      <footer style={styles.footer}>
        <span style={styles.autoSaveHint}>
          {saved ? "✓ 已保存" : "改动自动保存"}
        </span>
        <button onClick={() => setShowPrivacy((v) => !v)} style={styles.link}>
          隐私说明
        </button>
      </footer>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: POPUP_FRAME.width,
    height: POPUP_FRAME.compactHeight,
    margin: 0,
    background: aviso.darkSurface,
    border: "none",
    borderRadius: 0,
    boxShadow: "none",
    boxSizing: "border-box",
    color: aviso.darkText,
    fontFamily: aviso.font,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    ...visuallyStable
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 18px 0"
  },
  logo: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
    fontSize: 17,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    color: aviso.darkText
  },
  version: {
    flex: "0 0 auto",
    fontFamily: aviso.mono,
    fontSize: 11,
    color: aviso.darkText3
  },
  tabs: {
    display: "flex",
    gap: 4,
    padding: "14px 14px 0",
    borderBottom: `1px solid ${aviso.darkLine}`
  },
  tabBtn: {
    flex: 1,
    background: "transparent",
    border: "none",
    borderBottom: "2px solid transparent",
    color: aviso.darkText3,
    padding: "9px 4px",
    fontFamily: aviso.font,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    minWidth: 0,
    whiteSpace: "nowrap",
    transition: `.15s ${aviso.ease}`
  },
  tabBtnActive: { color: aviso.sage300, borderBottomColor: aviso.sage400 },
  content: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    padding: "2px 0"
  },
  section: { padding: "20px 18px" },
  expandedSection: { padding: "16px 18px" },
  label: {
    display: "block",
    fontSize: 12,
    color: aviso.darkText3,
    marginBottom: 8,
    letterSpacing: "0.02em"
  },
  dropdown: {
    position: "relative",
    width: "100%"
  },
  dropdownTrigger: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    background: aviso.darkBg,
    border: `1px solid ${aviso.darkLine}`,
    borderRadius: 10,
    color: aviso.darkText,
    cursor: "pointer",
    fontFamily: aviso.font,
    fontSize: 14,
    padding: "11px 13px",
    outline: "none",
    textAlign: "left",
    transition: `.15s ${aviso.ease}`
  },
  dropdownTriggerOpen: {
    borderColor: aviso.sage500,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${aviso.sage400} 22%, transparent)`
  },
  dropdownValue: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    minWidth: 0
  },
  dropdownValueIcon: {
    color: aviso.sage300
  },
  dropdownText: {
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  dropdownChevron: {
    color: aviso.darkText3,
    transition: `.18s ${aviso.ease}`
  },
  dropdownMenu: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "calc(100% + 6px)",
    zIndex: 40,
    padding: 6,
    borderRadius: 11,
    background: aviso.darkSurface2,
    border: `1px solid ${aviso.darkLine}`,
    boxShadow: "0 16px 38px -14px oklch(0.12 0.02 155 / .6)",
    boxSizing: "border-box"
  },
  dropdownOption: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 9,
    background: "transparent",
    border: "none",
    borderRadius: 8,
    color: aviso.darkText2,
    cursor: "pointer",
    fontFamily: aviso.font,
    fontSize: 13.5,
    lineHeight: 1.25,
    padding: "9px 10px",
    textAlign: "left",
    transition: `.15s ${aviso.ease}`
  },
  dropdownOptionSelected: {
    color: aviso.sage300,
    fontWeight: 500,
    background: `color-mix(in oklab, ${aviso.sage400} 16%, transparent)`
  },
  dropdownOptionIcon: {
    color: aviso.darkText3
  },
  dropdownOptionIconSelected: {
    color: aviso.sage300
  },
  dropdownOptionText: {
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  dropdownCheck: {
    color: aviso.sage300,
    marginLeft: "auto"
  },
  toggleItem: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: "11px 0",
    minWidth: 0
  },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    minWidth: 0
  },
  toggleLabel: {
    minWidth: 0,
    fontSize: 14,
    color: aviso.darkText,
    lineHeight: 1.35,
    overflowWrap: "anywhere"
  },
  toggleHelper: {
    minWidth: 0,
    fontSize: 11.5,
    color: aviso.darkText3,
    lineHeight: 1.35,
    paddingRight: 56,
    overflowWrap: "anywhere"
  },
  toggle: {
    position: "relative",
    width: 42,
    height: 24,
    borderRadius: 999,
    border: "none",
    cursor: "pointer",
    transition: `.2s ${aviso.ease}`,
    padding: 0,
    flex: "0 0 auto"
  },
  toggleThumb: {
    position: "absolute",
    top: 3,
    left: 0,
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: "#fff",
    boxShadow: "0 1px 3px oklch(0 0 0 / .25)",
    transition: `.2s ${aviso.ease}`
  },
  hint: {
    fontSize: 12,
    color: aviso.darkText3,
    marginBottom: 14,
    lineHeight: 1.55
  },
  privacyNote: {
    display: "flex",
    alignItems: "flex-start",
    gap: 9,
    padding: "11px 12px",
    borderRadius: 10,
    margin: "0 0 18px",
    background: `color-mix(in oklab, ${aviso.sage400} 12%, transparent)`,
    color: aviso.darkText2,
    fontSize: 12,
    lineHeight: 1.5
  },
  fieldGroup: { marginBottom: 14 },
  input: {
    width: "100%",
    background: aviso.darkBg,
    border: `1px solid ${aviso.darkLine}`,
    borderRadius: 10,
    color: aviso.darkText,
    padding: "10px 12px",
    fontFamily: aviso.font,
    fontSize: 13,
    lineHeight: 1.45,
    boxSizing: "border-box",
    outline: "none"
  },
  templateRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 12px",
    marginBottom: 8,
    border: `1px solid ${aviso.darkLine}`,
    borderRadius: 10,
    background: aviso.darkBg
  },
  templateName: {
    flex: 1,
    minWidth: 0,
    fontSize: 13.5,
    fontWeight: 600,
    color: aviso.darkText,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  deleteBtn: {
    background: "transparent",
    border: `1px solid ${aviso.darkLine}`,
    color: aviso.darkText2,
    borderRadius: 8,
    padding: "6px 10px",
    fontFamily: aviso.font,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  editBtn: {
    background: "transparent",
    border: `1px solid ${aviso.darkLine}`,
    color: aviso.sage300,
    borderRadius: 8,
    padding: "6px 10px",
    fontFamily: aviso.font,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  templateForm: {
    marginTop: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    padding: 12,
    border: `1px solid ${aviso.darkLine}`,
    borderRadius: 12,
    background: aviso.darkBg
  },
  contextChips: { display: "flex", flexWrap: "wrap", gap: 6 },
  chip: {
    background: "transparent",
    border: `1px solid ${aviso.darkLine}`,
    color: aviso.darkText2,
    borderRadius: 999,
    padding: "6px 11px",
    fontFamily: aviso.font,
    fontSize: 12,
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  chipActive: {
    background: aviso.sage500,
    color: aviso.paper,
    borderColor: aviso.sage500
  },
  historyItem: {
    display: "flex",
    gap: 10,
    padding: "12px 0",
    borderTop: `1px solid ${aviso.darkLine}`
  },
  historyInput: {
    fontSize: 13,
    color: aviso.darkText,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  historyOutput: {
    fontSize: 12,
    color: aviso.darkText3,
    marginTop: 4,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  addBtn: {
    marginTop: 12,
    background: "transparent",
    border: `1px dashed ${aviso.darkLine}`,
    color: aviso.sage300,
    borderRadius: 10,
    padding: "11px 14px",
    fontFamily: aviso.font,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    width: "100%"
  },
  primaryBtn: {
    flex: 1,
    background: aviso.sage500,
    border: "none",
    color: aviso.paper,
    borderRadius: 10,
    padding: "8px 14px",
    fontFamily: aviso.font,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap"
  },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "14px 18px",
    borderTop: `1px solid ${aviso.darkLine}`
  },
  autoSaveHint: {
    fontSize: 12,
    color: aviso.sage300
  },
  link: {
    fontSize: 12,
    color: aviso.darkText3,
    textDecoration: "none",
    background: "transparent",
    border: "none",
    fontFamily: aviso.font,
    cursor: "pointer"
  },
  privacyBox: {
    fontSize: 11,
    lineHeight: 1.6,
    color: aviso.darkText2,
    background: `color-mix(in oklab, ${aviso.sage400} 10%, transparent)`,
    borderTop: `1px solid ${aviso.darkLine}`,
    padding: "11px 18px"
  },
  emptyText: {
    color: aviso.darkText3,
    fontSize: 13,
    lineHeight: 1.5,
    margin: 0
  },
  warningText: {
    color: aviso.danger,
    fontSize: 12,
    margin: "0 0 8px",
    lineHeight: 1.5
  }
}

export default Popup
