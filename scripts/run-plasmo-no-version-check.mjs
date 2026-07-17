#!/usr/bin/env node

import { existsSync } from "node:fs"

const plasmoBinUrl = new URL("../node_modules/plasmo/bin/index.mjs", import.meta.url)

if (!existsSync(plasmoBinUrl)) {
  console.error(
    "Missing local Plasmo dependency install at node_modules/plasmo. Run npm ci from package-lock.json before using this script."
  )
  process.exit(1)
}

const originalFetch = globalThis.fetch?.bind(globalThis)

if (typeof originalFetch === "function") {
  globalThis.fetch = async (input, init) => {
    if (isPlasmoPackageMetadataRequest(requestUrl(input))) {
      return new Response(
        JSON.stringify({
          "dist-tags": {
            latest: "0.90.5"
          },
          versions: {
            "0.90.5": {
              version: "0.90.5"
            }
          },
          time: {}
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json"
          }
        }
      )
    }

    return originalFetch(input, init)
  }
}

await import(plasmoBinUrl.href)

function requestUrl(input) {
  if (typeof input === "string") {
    return input
  }
  if (input instanceof URL) {
    return input.href
  }
  if (typeof Request !== "undefined" && input instanceof Request) {
    return input.url
  }
  if (input && typeof input === "object" && "url" in input) {
    return String(input.url)
  }
  return ""
}

function isPlasmoPackageMetadataRequest(url) {
  try {
    const parsed = new URL(url)
    return parsed.pathname.replace(/\/+$/, "") === "/plasmo"
  } catch {
    return false
  }
}
