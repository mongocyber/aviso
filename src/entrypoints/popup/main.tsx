import { createElement } from "react"
import { createRoot } from "react-dom/client"

import Popup from "../../popup"

const root = document.getElementById("root")

if (!root) {
  throw new Error("Aviso popup root not found")
}

createRoot(root).render(createElement(Popup))
