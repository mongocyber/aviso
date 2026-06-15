export type TemplateContext = {
  selection?: string
  url?: string
  page?: string
}

/** 将模板中的 {{selection}} / {{url}} / {{page}} 占位符替换为实际上下文 */
export function expandTemplate(prompt: string, ctx: TemplateContext): string {
  return prompt
    .replace(/\{\{\s*selection\s*\}\}/gi, ctx.selection ?? "")
    .replace(/\{\{\s*url\s*\}\}/gi, ctx.url ?? "")
    .replace(/\{\{\s*page\s*\}\}/gi, ctx.page ?? "")
}

export function hasSelectionPlaceholder(prompt: string): boolean {
  return /\{\{\s*selection\s*\}\}/i.test(prompt)
}
