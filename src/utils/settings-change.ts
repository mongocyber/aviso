import type { PromptTemplate, Settings } from "~types/history"

function templateSignature(templates: PromptTemplate[] = []) {
  return JSON.stringify(
    templates.map((template) => ({
      id: template.id,
      name: template.name,
      prompt: template.prompt,
      contexts: template.contexts ?? []
    }))
  )
}

export function haveTemplatesChanged(
  previous?: Partial<Settings>,
  next?: Partial<Settings>
) {
  return (
    templateSignature(previous?.templates) !==
    templateSignature(next?.templates)
  )
}

export function hasDefaultModelChanged(
  previous?: Partial<Settings>,
  next?: Partial<Settings>
) {
  return (
    Boolean(next?.defaultModel) && previous?.defaultModel !== next.defaultModel
  )
}
