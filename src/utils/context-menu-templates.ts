import type { PromptTemplate } from "~types/history"

export type TemplateMenuContext = chrome.contextMenus.ContextType

const SUPPORTED_TEMPLATE_CONTEXTS: TemplateMenuContext[] = [
  "selection",
  "link",
  "image",
  "video",
  "editable",
  "page"
]

const SUPPORTED_TEMPLATE_CONTEXT_SET = new Set<string>(
  SUPPORTED_TEMPLATE_CONTEXTS
)

export function normalizeTemplateMenuContexts(
  contexts: string[] | undefined
): TemplateMenuContext[] {
  const normalized =
    contexts?.filter((context): context is TemplateMenuContext =>
      SUPPORTED_TEMPLATE_CONTEXT_SET.has(context)
    ) ?? []

  return normalized.length ? normalized : ["selection"]
}

export function getTemplateParentMenuContexts(
  templates: PromptTemplate[]
): TemplateMenuContext[] {
  const contexts = new Set<TemplateMenuContext>()
  templates.forEach((template) => {
    normalizeTemplateMenuContexts(template.contexts).forEach((context) => {
      contexts.add(context)
    })
  })

  return SUPPORTED_TEMPLATE_CONTEXTS.filter((context) => contexts.has(context))
}
