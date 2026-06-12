import type { ComponentType } from "react"
import { createElement } from "react"
import { createRoot, type Root } from "react-dom/client"
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root"
import type { ContentScriptContext } from "wxt/utils/content-script-context"

export async function mountReactShadowUi(
  ctx: ContentScriptContext,
  options: {
    hostId: string
    component: ComponentType
    zIndex?: number
  }
) {
  const ui = await createShadowRootUi<{ root: Root }>(ctx, {
    name: options.hostId,
    position: "inline",
    anchor: () => document.documentElement,
    append: "last",
    isolateEvents: true,
    onMount: (container, _shadow, shadowHost) => {
      shadowHost.id = options.hostId
      if (options.zIndex) {
        shadowHost.style.position = "relative"
        shadowHost.style.zIndex = String(options.zIndex)
      }

      const root = createRoot(container)
      root.render(createElement(options.component))
      return { root }
    },
    onRemove: (mounted) => {
      mounted?.root.unmount()
    }
  })

  ui.mount()
}
