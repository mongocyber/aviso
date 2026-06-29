import { register } from "node:module"

const testImportAliasHook = `
import { pathToFileURL } from "node:url"

const projectRootUrl = pathToFileURL(process.cwd() + "/").href

export async function resolve(specifier, context, nextResolve) {
  for (const [alias, target] of [
    ["~types/", "src/types/"],
    ["~utils/", "src/utils/"]
  ]) {
    if (!specifier.startsWith(alias)) continue

    const relativePath = specifier.slice(alias.length)
    const extension = /\\.[cm]?[tj]sx?$/.test(relativePath) ? "" : ".ts"
    return nextResolve(
      new URL(target + relativePath + extension, projectRootUrl).href,
      context
    )
  }

  if (
    specifier.startsWith(".") &&
    !/\\.[cm]?[tj]sx?$/.test(specifier) &&
    context.parentURL?.includes("/src/")
  ) {
    try {
      return await nextResolve(specifier + ".ts", context)
    } catch {
      return nextResolve(specifier, context)
    }
  }

  return nextResolve(specifier, context)
}
`

register(`data:text/javascript,${encodeURIComponent(testImportAliasHook)}`)
