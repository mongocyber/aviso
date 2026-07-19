import assert from "node:assert/strict"
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import {
  classifyCommandFailure,
  listReleaseClaimScanFiles,
  normalizeReleaseClaimScanPath,
  runCommandStep,
  scanForbiddenReleaseClaimsInFiles,
  type ReleaseClaimFinding
} from "../scripts/verify-release-candidate.mjs"

function fixture(name: string): { content: string; filePath: string } {
  const filePath = `tests/fixtures/release-verifier/${name}`
  return {
    filePath,
    content: readFileSync(new URL(`./fixtures/release-verifier/${name}`, import.meta.url), "utf8")
  }
}

function reasons(findings: ReleaseClaimFinding[]): string[] {
  return findings.map((finding) => finding.reason)
}

test("release claim scanner reports clause-level false negatives with explainable findings", () => {
  const findings = scanForbiddenReleaseClaimsInFiles([fixture("false-negatives.md")])

  assert.deepEqual(findings, [
    claim(3, "free quota without sign-in overclaim", "free quota is available without sign-in"),
    claim(4, "hosted AI live/public overclaim", "hosted AI is live"),
    claim(5, "install CTA overclaim", "install from Chrome Web Store now"),
    claim(6, "retention overclaim", "raw prompts are retained"),
    claim(7, "free quota without sign-in overclaim", "免费额度无需登录"),
    claim(8, "install CTA overclaim", "Chrome Web Store 公开可安装"),
    claim(9, "Chinese hosted AI live/public overclaim", "托管 AI 已公开上线"),
    claim(11, "Chrome Web Store approval overclaim", "Chrome Web Store is publicly listed"),
    claim(12, "hosted AI live/public overclaim", "Aviso AI is publicly available"),
    claim(13, "Chrome Web Store approval overclaim", "Chrome Web Store 已公开上架"),
    claim(14, "hosted AI live/public overclaim", "hosted AI is live"),
    claim(15, "Chinese hosted AI live/public overclaim", "托管 AI 已公开上线")
  ])
})

test("release claim scanner accepts legitimate same-clause negation and gated quota wording", () => {
  const findings = scanForbiddenReleaseClaimsInFiles([fixture("safe-claims.md")])

  assert.deepEqual(findings, [])
})

test("release claim scanner reports MON-45 API-key protection and backend overclaims", () => {
  const unsafeFindings = scanForbiddenReleaseClaimsInFiles([
    {
      filePath: "popup-en.ts",
      content: "API keys are AES-256 encrypted and stored only on this device."
    },
    {
      filePath: "popup-zh.ts",
      content: "API Key 经 AES-256 加密后仅存于本机。"
    },
    {
      filePath: "popup-helper-en.ts",
      content:
        "Aviso has no project-owned server. When you start an AI request, the browser sends content directly to the model provider you choose."
    },
    {
      filePath: "popup-helper-zh.ts",
      content:
        "Aviso 没有项目方服务器。你主动发起 AI 请求时，内容会由浏览器直接发送到你选择的模型厂商。"
    },
    {
      filePath: "store-listing.md",
      content:
        "When the user actively triggers an AI action, required content is sent directly from the browser extension to the user-selected provider."
    }
  ])

  assert.deepEqual(
    unsafeFindings.map(({ filePath, line, label, matchedClaim }) => ({
      filePath,
      line,
      label,
      matchedClaim
    })),
    [
      {
        filePath: "popup-en.ts",
        line: 1,
        label: "API-key protection overclaim",
        matchedClaim: "API keys are AES-256 encrypted"
      },
      {
        filePath: "popup-zh.ts",
        line: 1,
        label: "API-key protection overclaim",
        matchedClaim: "API Key 经 AES-256 加密"
      },
      {
        filePath: "popup-helper-en.ts",
        line: 1,
        label: "project backend absence overclaim",
        matchedClaim: "Aviso has no project-owned server"
      },
      {
        filePath: "popup-helper-en.ts",
        line: 1,
        label: "unscoped direct-provider overclaim",
        matchedClaim:
          "When you start an AI request, the browser sends content directly to the model provider you choose"
      },
      {
        filePath: "popup-helper-zh.ts",
        line: 1,
        label: "project backend absence overclaim",
        matchedClaim: "Aviso 没有项目方服务器"
      },
      {
        filePath: "popup-helper-zh.ts",
        line: 1,
        label: "unscoped direct-provider overclaim",
        matchedClaim: "你主动发起 AI 请求时，内容会由浏览器直接发送到你选择的模型厂商"
      },
      {
        filePath: "store-listing.md",
        line: 1,
        label: "unscoped direct-provider overclaim",
        matchedClaim:
          "When the user actively triggers an AI action, required content is sent directly from the browser extension to the user-selected provider"
      }
    ]
  )

  const safeFindings = scanForbiddenReleaseClaimsInFiles([
    {
      filePath: "safe-key-boundary.md",
      content:
        "API keys are not stored in plaintext; they use local encryption/obfuscation-level protection and do not defend against a compromised machine or readable browser profile."
    },
    {
      filePath: "safe-routing.md",
      content:
        "BYOK requests go directly to the selected provider; Aviso AI requests pass through the Aviso backend after the user chooses that path and signs in."
    },
    {
      filePath: "safe-limited-use.md",
      content:
        "When the user actively triggers an AI action, the BYOK path sends required content directly from the browser extension to the selected model provider. The Aviso AI path sends required content to the Aviso backend and upstream model providers."
    },
    {
      filePath: "safe-zh.md",
      content:
        "BYOK 路径由浏览器直连所选 provider；Aviso AI 路径在用户主动选择并登录后经过 Aviso 后端。API Key 仅是本地加密 / 混淆级保护，不防御可读浏览器 profile。"
    },
    {
      filePath: "safe-key-negated-details.md",
      content:
        "API keys are not keychain storage, hardware-backed protection, end-to-end encryption, or zero-knowledge protection."
    },
    {
      filePath: "safe-negated.md",
      content:
        "Do not claim API keys are AES-256 encrypted, and do not claim Aviso has no project-owned server."
    }
  ])

  assert.deepEqual(safeFindings, [])
})

test("release claim scanner reports MON-45 independent blocker false negatives", () => {
  const findings = scanForbiddenReleaseClaimsInFiles([
    {
      filePath: "mon45-byok-prefix.md",
      content:
        "BYOK provider settings are available; When you start an AI request, the browser sends content directly to the model provider you choose."
    },
    {
      filePath: "mon45-no-backend-all-traffic.md",
      content:
        "There is no Aviso backend involved in requests; all traffic goes directly to providers."
    },
    {
      filePath: "mon45-zh-all-requests.md",
      content: "所有 AI 请求均由浏览器直连所选模型厂商。"
    },
    {
      filePath: "mon45-key-inherited-aes.md",
      content: "API keys are not stored in plaintext; they are AES-256 encrypted."
    },
    {
      filePath: "mon45-key-unrelated-negation.md",
      content: "API keys are not synced because they are strongly encrypted locally."
    },
    {
      filePath: "mon45-key-aes-word-order.md",
      content: "API keys are encrypted with AES 256."
    },
    {
      filePath: "mon45-key-zh-overclaim.md",
      content: "API 密钥采用军用级加密并存入硬件安全模块，完全安全。"
    }
  ])

  assert.deepEqual(
    findings.map(({ filePath, line, label, matchedClaim }) => ({
      filePath,
      line,
      label,
      matchedClaim
    })),
    [
      {
        filePath: "mon45-byok-prefix.md",
        line: 1,
        label: "unscoped direct-provider overclaim",
        matchedClaim:
          "When you start an AI request, the browser sends content directly to the model provider you choose"
      },
      {
        filePath: "mon45-no-backend-all-traffic.md",
        line: 1,
        label: "project backend absence overclaim",
        matchedClaim: "no Aviso backend involved in requests"
      },
      {
        filePath: "mon45-no-backend-all-traffic.md",
        line: 1,
        label: "unscoped direct-provider overclaim",
        matchedClaim: "all traffic goes directly to providers"
      },
      {
        filePath: "mon45-zh-all-requests.md",
        line: 1,
        label: "unscoped direct-provider overclaim",
        matchedClaim: "所有 AI 请求均由浏览器直连所选模型厂商"
      },
      {
        filePath: "mon45-key-inherited-aes.md",
        line: 1,
        label: "API-key protection overclaim",
        matchedClaim: "API keys are AES-256 encrypted"
      },
      {
        filePath: "mon45-key-unrelated-negation.md",
        line: 1,
        label: "API-key protection overclaim",
        matchedClaim: "API keys are strongly encrypted locally"
      },
      {
        filePath: "mon45-key-aes-word-order.md",
        line: 1,
        label: "API-key protection overclaim",
        matchedClaim: "API keys are encrypted with AES 256"
      },
      {
        filePath: "mon45-key-zh-overclaim.md",
        line: 1,
        label: "API-key protection overclaim",
        matchedClaim: "API 密钥采用军用级加密并存入硬件安全模块"
      }
    ]
  )
})

test("release claim scanner reports MON-45 round3 popup and wrapped false negatives", () => {
  const findings = scanForbiddenReleaseClaimsInFiles([
    {
      filePath: "mon45-round3-popup-old-en.md",
      content:
        "Connect OpenAI; your browser talks to providers directly; requests don't go through us."
    },
    {
      filePath: "mon45-round3-popup-old-zh.md",
      content: "连接 OpenAI，浏览器直连厂商，请求不经过我们。"
    },
    {
      filePath: "mon45-round3-wrapped-key.md",
      content: "API keys are not stored in plaintext;\nthey are AES-256 encrypted."
    },
    {
      filePath: "mon45-round3-wrapped-direct-en.md",
      content:
        "When you start an AI request:\nthe browser sends content directly to the model provider you choose."
    },
    {
      filePath: "mon45-round3-wrapped-direct-zh.md",
      content:
        "你主动发起 AI 请求时：\n内容会由浏览器直接发送到你选择的模型厂商。"
    },
    {
      filePath: "mon45-round4-byok-prefix-all-traffic.md",
      content: "BYOK provider settings are available and all traffic goes directly to providers."
    },
    {
      filePath: "mon45-round4-own-key-prefix-all-requests.md",
      content: "Bring your own API key and all requests are sent directly to providers."
    }
  ])

  assert.deepEqual(
    findings.map(({ filePath, line, label, matchedClaim }) => ({
      filePath,
      line,
      label,
      matchedClaim
    })),
    [
      {
        filePath: "mon45-round3-popup-old-en.md",
        line: 1,
        label: "project backend absence overclaim",
        matchedClaim: "requests don't go through us"
      },
      {
        filePath: "mon45-round3-popup-old-zh.md",
        line: 1,
        label: "project backend absence overclaim",
        matchedClaim: "请求不经过我们"
      },
      {
        filePath: "mon45-round3-wrapped-key.md",
        line: 2,
        label: "API-key protection overclaim",
        matchedClaim: "API keys are AES-256 encrypted"
      },
      {
        filePath: "mon45-round3-wrapped-direct-en.md",
        line: 2,
        label: "unscoped direct-provider overclaim",
        matchedClaim:
          "When you start an AI request, the browser sends content directly to the model provider you choose"
      },
      {
        filePath: "mon45-round3-wrapped-direct-zh.md",
        line: 2,
        label: "unscoped direct-provider overclaim",
        matchedClaim: "你主动发起 AI 请求时，内容会由浏览器直接发送到你选择的模型厂商"
      },
      {
        filePath: "mon45-round4-byok-prefix-all-traffic.md",
        line: 1,
        label: "unscoped direct-provider overclaim",
        matchedClaim: "all traffic goes directly to providers"
      },
      {
        filePath: "mon45-round4-own-key-prefix-all-requests.md",
        line: 1,
        label: "unscoped direct-provider overclaim",
        matchedClaim: "all requests are sent directly to providers"
      }
    ]
  )
})

test("release claim scanner accepts MON-45 scoped and policy negation controls", () => {
  const findings = scanForbiddenReleaseClaimsInFiles([
    {
      filePath: "safe-own-api-key-routing.md",
      content:
        "When you start an AI request with your own API key, the browser sends content directly to the model provider you choose."
    },
    {
      filePath: "safe-false-that-backend.md",
      content: "It is false that Aviso has no project-owned backend."
    },
    {
      filePath: "safe-zh-do-not-claim-backend.md",
      content: "不要宣称 Aviso 没有项目方服务器。"
    },
    {
      filePath: "safe-zh-do-not-claim-aes.md",
      content: "不得声称 API Key 使用 AES-256 加密。"
    },
    {
      filePath: "safe-current-byok-split-en.md",
      content:
        "BYOK requests go directly to the selected provider; Aviso AI requests pass through the Aviso backend after the user chooses that path and signs in."
    },
    {
      filePath: "safe-current-byok-split-zh.md",
      content:
        "BYOK 路径由浏览器直连所选 provider；Aviso AI 路径在用户主动选择并登录后经过 Aviso 后端。"
    },
    {
      filePath: "safe-current-local-protection-en.md",
      content:
        "API keys are not stored in plaintext; they use local encryption/obfuscation-level protection and do not defend against a compromised machine or readable browser profile."
    },
    {
      filePath: "safe-current-local-protection-zh.md",
      content:
        "API Key 不明文保存，仅是当前浏览器 profile 内的本地加密/混淆便利边界，不防可读 profile、已被控制设备或恶意扩展。"
    },
    {
      filePath: "safe-round3-do-not-claim-requests.md",
      content: "Do not claim requests don't go through us."
    },
    {
      filePath: "safe-round3-zh-do-not-claim-requests.md",
      content: "不要宣称请求不经过我们。"
    },
    {
      filePath: "safe-round3-wrapped-own-key-colon.md",
      content:
        "When you start an AI request with your own API key:\nthe browser sends content directly to the model provider you choose."
    },
    {
      filePath: "safe-round3-wrapped-own-key-semicolon.md",
      content:
        "When you start an AI request with your own API key;\nthe browser sends content directly to the model provider you choose."
    },
    {
      filePath: "safe-round4-wrapped-byok-colon.md",
      content:
        "When you start an AI request with BYOK:\nthe browser sends content directly to the model provider you choose."
    },
    {
      filePath: "safe-round4-wrapped-byok-path-colon.md",
      content:
        "When you start an AI request in the BYOK path:\nthe browser sends content directly to the model provider you choose."
    },
    {
      filePath: "safe-round3-wrapped-current-byok-split-en.md",
      content:
        "BYOK requests go directly to the selected provider;\nAviso AI requests pass through the Aviso backend after the user chooses that path and signs in."
    },
    {
      filePath: "safe-round3-wrapped-current-byok-split-zh.md",
      content:
        "BYOK 路径由浏览器直连所选 provider；\nAviso AI 路径在用户主动选择并登录后经过 Aviso 后端。"
    }
  ])

  assert.deepEqual(findings, [])
})

test("release claim scanner avoids over-splitting words and long safe negatives", () => {
  const longSafeNegative = `${"Chrome Web Store is not approved and not publicly listed. ".repeat(
    200
  )} 托管 AI 尚未公开上线且不可用。`
  const findings = scanForbiddenReleaseClaimsInFiles([
    {
      filePath: "safe-long.md",
      content: [
        "The coordinator can write ordinary notes without creating an or boundary.",
        "权限和隐私说明不得宣称托管 AI 已公开上线。",
        longSafeNegative
      ].join("\n")
    }
  ])

  assert.deepEqual(findings, [])
})

test("release claim scanner keeps negation scoped to the matching clause", () => {
  const findings = scanForbiddenReleaseClaimsInFiles([
    {
      filePath: "inline.md",
      content: "Chrome Web Store is not approved; Aviso AI free quota is available without login."
    }
  ])

  assert.equal(findings.length, 1)
  assert.equal(findings[0].line, 1)
  assert.equal(findings[0].matchedClaim, "free quota is available without login")
  assert.match(findings[0].reason, /must require sign-in/)
})

test("release claim scanner does not let unrelated negation cross claim boundaries", () => {
  const probes = [
    "Chrome Web Store is not approved — hosted AI is live.",
    "Chrome Web Store is not approved / hosted AI is live.",
    "Although the store is not approved, hosted AI is live.",
    "The store is not approved yet hosted AI is live."
  ]

  const findings = scanForbiddenReleaseClaimsInFiles(
    probes.map((content, index) => ({ filePath: `boundary-${index + 1}.md`, content }))
  )

  assert.deepEqual(
    findings.map(({ filePath, line, label, matchedClaim }) => ({
      filePath,
      line,
      label,
      matchedClaim
    })),
    probes.map((_, index) => ({
      filePath: `boundary-${index + 1}.md`,
      line: 1,
      label: "hosted AI live/public overclaim",
      matchedClaim: "hosted AI is live"
    }))
  )

  assert.deepEqual(
    scanForbiddenReleaseClaimsInFiles([
      { filePath: "safe-hosted.md", content: "Hosted AI is not live." },
      { filePath: "safe-cws.md", content: "Chrome Web Store is not approved." }
    ]),
    []
  )
})

test("release claim scanner treats not-yet predicate negation as safe", () => {
  const safeFindings = scanForbiddenReleaseClaimsInFiles([
    { filePath: "safe-hosted-not-yet.md", content: "Hosted AI is not yet live." },
    {
      filePath: "safe-cws-not-yet.md",
      content: "Chrome Web Store is not yet approved."
    },
    { filePath: "safe-contraction.md", content: "Aviso AI isn't yet publicly available." }
  ])

  assert.deepEqual(safeFindings, [])

  const unsafeFindings = scanForbiddenReleaseClaimsInFiles([
    {
      filePath: "unsafe-yet-boundary.md",
      content: "The store is not approved yet hosted AI is live."
    }
  ])

  assert.deepEqual(
    unsafeFindings.map(({ filePath, line, label, matchedClaim }) => ({
      filePath,
      line,
      label,
      matchedClaim
    })),
    [
      {
        filePath: "unsafe-yet-boundary.md",
        line: 1,
        label: "hosted AI live/public overclaim",
        matchedClaim: "hosted AI is live"
      }
    ]
  )
})

test("release claim scanner reports required inline probes", () => {
  const probes = [
    "Chrome Web Store is not approved but is publicly listed.",
    "Aviso AI is not live but publicly available.",
    "Chrome Web Store 尚未审核通过但已公开上架。",
    "Chrome Web Store is not approved or hosted AI is live.",
    "Chrome Web Store 未审核通过和托管 AI 已公开上线。"
  ]

  const findings = scanForbiddenReleaseClaimsInFiles(
    probes.map((content, index) => ({ filePath: `probe-${index + 1}.md`, content }))
  )

  assert.deepEqual(
    findings.map(({ filePath, line, label, matchedClaim }) => ({
      filePath,
      line,
      label,
      matchedClaim
    })),
    [
      {
        filePath: "probe-1.md",
        line: 1,
        label: "Chrome Web Store approval overclaim",
        matchedClaim: "Chrome Web Store is publicly listed"
      },
      {
        filePath: "probe-2.md",
        line: 1,
        label: "hosted AI live/public overclaim",
        matchedClaim: "Aviso AI is publicly available"
      },
      {
        filePath: "probe-3.md",
        line: 1,
        label: "Chrome Web Store approval overclaim",
        matchedClaim: "Chrome Web Store 已公开上架"
      },
      {
        filePath: "probe-4.md",
        line: 1,
        label: "hosted AI live/public overclaim",
        matchedClaim: "hosted AI is live"
      },
      {
        filePath: "probe-5.md",
        line: 1,
        label: "Chinese hosted AI live/public overclaim",
        matchedClaim: "托管 AI 已公开上线"
      }
    ]
  )
})

test("release claim scanner treats dash slash and connector combinations as claim boundaries", () => {
  const probes = [
    [
      "dash-but-cws.md",
      "Chrome Web Store is not approved — but is publicly listed.",
      "Chrome Web Store approval overclaim",
      "Chrome Web Store is publicly listed"
    ],
    [
      "dash-but-hosted.md",
      "Aviso AI is not live — but is publicly available.",
      "hosted AI live/public overclaim",
      "Aviso AI is publicly available"
    ],
    [
      "tight-slash-hosted.md",
      "Chrome Web Store is not approved/hosted AI is live.",
      "hosted AI live/public overclaim",
      "hosted AI is live"
    ],
    [
      "dash-and-cws.md",
      "Chrome Web Store is not approved — and is publicly listed.",
      "Chrome Web Store approval overclaim",
      "Chrome Web Store is publicly listed"
    ],
    [
      "slash-although-cws.md",
      "Chrome Web Store is not approved/although publicly listed.",
      "Chrome Web Store approval overclaim",
      "Chrome Web Store is publicly listed"
    ],
    [
      "slash-however-hosted.md",
      "Chrome Web Store is not approved/however hosted AI is live.",
      "hosted AI live/public overclaim",
      "hosted AI is live"
    ]
  ] as const

  const findings = scanForbiddenReleaseClaimsInFiles(
    probes.map(([filePath, content]) => ({ filePath, content }))
  )

  assert.deepEqual(
    findings.map(({ filePath, line, label, matchedClaim }) => ({
      filePath,
      line,
      label,
      matchedClaim
    })),
    probes.map(([filePath, , label, matchedClaim]) => ({
      filePath,
      line: 1,
      label,
      matchedClaim
    }))
  )

  assert.deepEqual(
    scanForbiddenReleaseClaimsInFiles([
      {
        filePath: "safe-dash-negated.md",
        content: "Aviso AI is not live — and not publicly available."
      },
      {
        filePath: "safe-slash-negated.md",
        content: "Chrome Web Store is not approved/not publicly listed."
      }
    ]),
    []
  )
})

test("release claim scanner keeps screenshots/base64 retention claims intact across slash boundaries", () => {
  const findings = scanForbiddenReleaseClaimsInFiles([
    {
      filePath: "english-store-compound.md",
      content: "Aviso stores screenshots/base64."
    },
    {
      filePath: "english-retained-compound.md",
      content: "Screenshots/base64 are retained."
    },
    {
      filePath: "chinese-store-compound.md",
      content: "Aviso 保存截图/base64。"
    },
    {
      filePath: "url-safe.md",
      content: "See https://example.com/screenshots/base64 for a safe reference."
    },
    {
      filePath: "slash-clause.md",
      content: "Chrome Web Store is not approved/hosted AI is live."
    }
  ])

  assert.deepEqual(
    findings.map(({ filePath, line, label, matchedClaim }) => ({
      filePath,
      line,
      label,
      matchedClaim
    })),
    [
      {
        filePath: "english-store-compound.md",
        line: 1,
        label: "retention overclaim",
        matchedClaim: "Aviso stores screenshots/base64"
      },
      {
        filePath: "english-retained-compound.md",
        line: 1,
        label: "retention overclaim",
        matchedClaim: "Screenshots/base64 are retained"
      },
      {
        filePath: "chinese-store-compound.md",
        line: 1,
        label: "retention overclaim",
        matchedClaim: "Aviso 保存截图/base64"
      },
      {
        filePath: "slash-clause.md",
        line: 1,
        label: "hosted AI live/public overclaim",
        matchedClaim: "hosted AI is live"
      }
    ]
  )
})

test("release claim scanner treats complete URLs as unscannable while keeping outside retention claims", () => {
  const findings = scanForbiddenReleaseClaimsInFiles([
    {
      filePath: "url-only.md",
      content: "See https://example.com/Aviso/stores/screenshots/base64 for context."
    },
    {
      filePath: "url-plus-claim.md",
      content:
        "See https://example.com/Aviso/stores/screenshots/base64?from=docs. Aviso stores screenshots/base64."
    }
  ])

  assert.deepEqual(
    findings.map(({ filePath, line, label, matchedClaim }) => ({
      filePath,
      line,
      label,
      matchedClaim
    })),
    [
      {
        filePath: "url-plus-claim.md",
        line: 1,
        label: "retention overclaim",
        matchedClaim: "Aviso stores screenshots/base64"
      }
    ]
  )
})

test("release claim scanner catches release assertions wrapped across three lines", () => {
  const findings = scanForbiddenReleaseClaimsInFiles([
    {
      filePath: "wrapped-hosted.md",
      content: "hosted AI\nis\nlive now."
    },
    {
      filePath: "wrapped-cws.md",
      content: "Chrome Web Store\nis publicly\nlisted."
    },
    {
      filePath: "wrapped-safe.md",
      content: [
        "Hosted AI",
        "is",
        "not",
        "live.",
        "",
        "Chrome Web Store",
        "is",
        "not publicly",
        "listed."
      ].join("\n")
    }
  ])

  assert.deepEqual(
    findings.map(({ filePath, line, label, matchedClaim }) => ({
      filePath,
      line,
      label,
      matchedClaim
    })),
    [
      {
        filePath: "wrapped-hosted.md",
        line: 1,
        label: "hosted AI live/public overclaim",
        matchedClaim: "hosted AI is live now"
      },
      {
        filePath: "wrapped-cws.md",
        line: 1,
        label: "Chrome Web Store approval overclaim",
        matchedClaim: "Chrome Web Store is publicly listed"
      }
    ]
  )
})

test("release claim scanner maps wrapped matches to source lines before dedupe", () => {
  const findings = scanForbiddenReleaseClaimsInFiles([
    {
      filePath: "wrapped-offset-hosted.md",
      content: "Introductory text\nhosted AI\nis live now."
    },
    {
      filePath: "wrapped-offset-multi.md",
      content: "Introductory text\nChrome Web Store\nis publicly listed and hosted AI\nis live now."
    },
    {
      filePath: "wrapped-empty-paragraph.md",
      content: "Chrome Web Store\n\nis publicly listed."
    }
  ])

  assert.deepEqual(
    findings.map(({ filePath, line, label, matchedClaim }) => ({
      filePath,
      line,
      label,
      matchedClaim
    })),
    [
      {
        filePath: "wrapped-offset-hosted.md",
        line: 2,
        label: "hosted AI live/public overclaim",
        matchedClaim: "hosted AI is live now"
      },
      {
        filePath: "wrapped-offset-multi.md",
        line: 2,
        label: "Chrome Web Store approval overclaim",
        matchedClaim: "Chrome Web Store is publicly listed"
      },
      {
        filePath: "wrapped-offset-multi.md",
        line: 3,
        label: "hosted AI live/public overclaim",
        matchedClaim: "hosted AI is live now"
      }
    ]
  )
})

test("release claim scanner maps inherited wrapped predicates to their source lines", () => {
  const findings = scanForbiddenReleaseClaimsInFiles([
    {
      filePath: "wrapped-inherited-cws.md",
      content: "Chrome Web Store is not approved\nbut publicly listed."
    },
    {
      filePath: "wrapped-inherited-hosted.md",
      content: "Aviso AI is not live\nbut publicly available."
    }
  ])

  assert.deepEqual(
    findings.map(({ filePath, line, label, matchedClaim }) => ({
      filePath,
      line,
      label,
      matchedClaim
    })),
    [
      {
        filePath: "wrapped-inherited-cws.md",
        line: 2,
        label: "Chrome Web Store approval overclaim",
        matchedClaim: "Chrome Web Store is publicly listed"
      },
      {
        filePath: "wrapped-inherited-hosted.md",
        line: 2,
        label: "hosted AI live/public overclaim",
        matchedClaim: "Aviso AI is publicly available"
      }
    ]
  )
})

test("release claim scanner maps normalized markdown and whitespace offsets to source lines", () => {
  const findings = scanForbiddenReleaseClaimsInFiles([
    {
      filePath: "wrapped-markdown-offset.md",
      content: "**Introductory text**\nhosted AI\nis live now."
    },
    {
      filePath: "wrapped-spaces-offset.md",
      content: "Introductory     text\nhosted AI\nis live now."
    }
  ])

  assert.deepEqual(
    findings.map(({ filePath, line, label, matchedClaim }) => ({
      filePath,
      line,
      label,
      matchedClaim
    })),
    [
      {
        filePath: "wrapped-markdown-offset.md",
        line: 2,
        label: "hosted AI live/public overclaim",
        matchedClaim: "hosted AI is live now"
      },
      {
        filePath: "wrapped-spaces-offset.md",
        line: 2,
        label: "hosted AI live/public overclaim",
        matchedClaim: "hosted AI is live now"
      }
    ]
  )
})

test("release claim scanner normalizes repository paths with platform separators", () => {
  assert.equal(
    normalizeReleaseClaimScanPath("store-assets\\chrome-web-store\\output\\bad.md"),
    "store-assets/chrome-web-store/output/bad.md"
  )
  assert.equal(
    normalizeReleaseClaimScanPath("./store-assets/chrome-web-store//SPEC.md"),
    "store-assets/chrome-web-store/SPEC.md"
  )
})

test("release claim scanner repository scan includes Chrome Web Store text assets", () => {
  const claimPath = "store-assets/chrome-web-store/GENERATION_REPORT.md"
  const explicitFindings = scanForbiddenReleaseClaimsInFiles([
    { filePath: claimPath, content: "Hosted AI is live now." }
  ])
  assert.equal(explicitFindings.length, 1)

  const previousCwd = process.cwd()
  const root = mkdtempSync(join(tmpdir(), "aviso-release-scan-"))
  try {
    mkdirSync(join(root, "store-assets/chrome-web-store"), { recursive: true })
    writeFileSync(join(root, claimPath), "Hosted AI is live now.\n")
    writeFileSync(
      join(root, "store-assets/chrome-web-store/STORE_LISTING_COPY.md"),
      "Chrome Web Store is not approved.\n"
    )

    process.chdir(root)
    const repoFiles = listReleaseClaimScanFiles()
    assert.ok(repoFiles.includes(claimPath), `expected repository scan to include ${claimPath}`)

    const repoFindings = scanForbiddenReleaseClaimsInFiles(
      repoFiles.map((filePath) => ({
        filePath,
        content: readFileSync(filePath, "utf8")
      }))
    )
    assert.deepEqual(
      repoFindings.map(({ filePath, line, label, matchedClaim }) => ({
        filePath,
        line,
        label,
        matchedClaim
      })),
      [
        {
          filePath: claimPath,
          line: 1,
          label: "hosted AI live/public overclaim",
          matchedClaim: "Hosted AI is live now"
        }
      ]
    )
  } finally {
    process.chdir(previousCwd)
    rmSync(root, { recursive: true, force: true })
  }
})

test("release claim scanner skips unsafe paths while keeping stable repo-relative findings", (t) => {
  const previousCwd = process.cwd()
  const root = mkdtempSync(join(tmpdir(), "aviso-release-scan-safe-paths-"))
  const chromeAssetsRoot = join(root, "store-assets/chrome-web-store")
  const outsideRoot = join(root, "outside")

  try {
    mkdirSync(chromeAssetsRoot, { recursive: true })
    mkdirSync(join(chromeAssetsRoot, "output"), { recursive: true })
    mkdirSync(outsideRoot, { recursive: true })

    const expectedAssets = [
      "store-assets/chrome-web-store/ACCEPTANCE.md",
      "store-assets/chrome-web-store/SPEC.md",
      "store-assets/chrome-web-store/GENERATION_REPORT.md",
      "store-assets/chrome-web-store/IMAGE2_PROMPTS.md"
    ]
    writeFileSync(join(root, expectedAssets[0]), "Chrome Web Store is not approved.\n")
    writeFileSync(join(root, expectedAssets[1]), "Hosted AI is not live.\n")
    writeFileSync(join(root, expectedAssets[2]), "Chrome Web Store is not publicly listed.\n")
    writeFileSync(join(root, expectedAssets[3]), "Hosted AI is live now.\n")
    writeFileSync(join(chromeAssetsRoot, "output/bad.md"), "Hosted AI is live now.\n")
    writeFileSync(join(chromeAssetsRoot, "notes.tmp"), "Hosted AI is live now.\n")
    writeFileSync(
      join(chromeAssetsRoot, "binary.md"),
      Buffer.from([0, 1, 2, 3, 72, 111, 115, 116, 101, 100])
    )
    writeFileSync(join(outsideRoot, "escape.md"), "Hosted AI is live now.\n")

    try {
      symlinkSync(
        join(outsideRoot, "escape.md"),
        join(chromeAssetsRoot, "symlink-file.md")
      )
      symlinkSync(outsideRoot, join(chromeAssetsRoot, "symlink-dir"), "dir")
      symlinkSync("loop-b.md", join(chromeAssetsRoot, "loop-a.md"))
      symlinkSync("loop-a.md", join(chromeAssetsRoot, "loop-b.md"))
    } catch (error) {
      t.skip(`symlink fixture unsupported: ${(error as NodeJS.ErrnoException).code ?? error}`)
      return
    }

    process.chdir(root)
    const repoFiles = listReleaseClaimScanFiles()

    for (const asset of expectedAssets) {
      assert.ok(repoFiles.includes(asset), `expected repository scan to include ${asset}`)
    }
    assert.deepEqual(
      repoFiles.filter(
        (filePath) =>
          filePath.includes("output") ||
          filePath.includes("symlink") ||
          filePath.endsWith(".tmp") ||
          filePath.endsWith("binary.md")
      ),
      []
    )

    const findings = scanForbiddenReleaseClaimsInFiles(
      repoFiles.map((filePath) => ({
        filePath,
        content: readFileSync(filePath, "utf8")
      }))
    )
    assert.deepEqual(
      findings.map(({ filePath, line, label, matchedClaim }) => ({
        filePath,
        line,
        label,
        matchedClaim
      })),
      [
        {
          filePath: "store-assets/chrome-web-store/IMAGE2_PROMPTS.md",
          line: 1,
          label: "hosted AI live/public overclaim",
          matchedClaim: "Hosted AI is live now"
        }
      ]
    )
  } finally {
    process.chdir(previousCwd)
    rmSync(root, { recursive: true, force: true })
  }
})

test("release claim scanner rejects scan roots that resolve outside the canonical repo root", (t) => {
  const previousCwd = process.cwd()
  const root = mkdtempSync(join(tmpdir(), "aviso-release-scan-repo-root-"))
  const outsideRoot = mkdtempSync(join(tmpdir(), "aviso-release-scan-outside-root-"))

  try {
    const outsideStoreAssets = join(outsideRoot, "store-assets")
    const outsideWebsiteI18n = join(outsideRoot, "website-i18n")
    mkdirSync(join(outsideStoreAssets, "chrome-web-store"), { recursive: true })
    mkdirSync(join(outsideWebsiteI18n, "en"), { recursive: true })
    mkdirSync(join(root, "website"), { recursive: true })
    writeFileSync(
      join(outsideStoreAssets, "chrome-web-store/escape.md"),
      "Hosted AI is live now.\n"
    )
    writeFileSync(
      join(outsideWebsiteI18n, "en/code.json"),
      JSON.stringify({ message: "Hosted AI is live now." })
    )

    try {
      symlinkSync(outsideStoreAssets, join(root, "store-assets"), "dir")
      symlinkSync(outsideWebsiteI18n, join(root, "website/i18n"), "dir")
    } catch (error) {
      t.skip(`symlink fixture unsupported: ${(error as NodeJS.ErrnoException).code ?? error}`)
      return
    }

    process.chdir(root)
    const repoFiles = listReleaseClaimScanFiles()

    assert.equal(repoFiles.includes("store-assets/chrome-web-store/escape.md"), false)
    assert.equal(repoFiles.includes("website/i18n/en/code.json"), false)

    const findings = scanForbiddenReleaseClaimsInFiles(
      repoFiles.map((filePath) => ({
        filePath,
        content: readFileSync(filePath, "utf8")
      }))
    )
    assert.deepEqual(findings, [])
  } finally {
    process.chdir(previousCwd)
    rmSync(root, { recursive: true, force: true })
    rmSync(outsideRoot, { recursive: true, force: true })
  }
})

test("release claim scanner enumerates and accepts current repository release surfaces", () => {
  const filePaths = listReleaseClaimScanFiles()
  const expectedSurfaces = [
    "docs/STATE.md",
    "docs/privacy-and-security.md",
    "docs/release/README.md",
    "docs/planning/v0.3/cws-disclosure-draft.md",
    "src/utils/i18n-core.ts",
    "website/src/pages/index.tsx",
    "website/docs/privacy-policy.md",
    "website/i18n/en/docusaurus-plugin-content-docs/current/privacy-policy.md",
    "store-assets/chrome-web-store/ACCEPTANCE.md",
    "store-assets/chrome-web-store/SPEC.md",
    "store-assets/chrome-web-store/GENERATION_REPORT.md",
    "store-assets/chrome-web-store/IMAGE2_PROMPTS.md",
    "store-assets/chrome-web-store/STORE_LISTING_COPY.md",
    "store-assets/chrome-web-store/THREAD_BRIEF.md",
    "README.md",
    "STATUS.md",
    "RELEASE_CHECKLIST.md"
  ]

  for (const surface of expectedSurfaces) {
    assert.ok(filePaths.includes(surface), `expected release scan to include ${surface}`)
  }

  const findings = scanForbiddenReleaseClaimsInFiles(
    filePaths.map((filePath) => ({
      filePath,
      content: readFileSync(filePath, "utf8")
    }))
  )

  assert.deepEqual(findings, [])
})

function claim(
  line: number,
  label: ReleaseClaimFinding["label"],
  matchedClaim: string
): ReleaseClaimFinding {
  const reasonsByLabel = new Map(
    [
      [
        "hosted AI live/public overclaim",
        "Hosted AI is candidate-only and must not be described as public live."
      ],
      [
        "Chinese hosted AI live/public overclaim",
        "Hosted AI is candidate-only and must not be described as public live."
      ],
      [
        "Chrome Web Store approval overclaim",
        "Chrome Web Store approval and public listing are still pending gates."
      ],
      [
        "free quota without sign-in overclaim",
        "Aviso AI free quota must require sign-in; anonymous or no-login quota is outside the release scope."
      ],
      ["anonymous quota overclaim", "Public anonymous quota is excluded from the current release."],
      [
        "paid hosted AI overclaim",
        "Subscription, payment, billing, checkout, and paid hosted AI are outside the release scope."
      ],
      [
        "web-search overclaim",
        "Web search and remote link-body fetching are outside the release scope."
      ],
      [
        "retention overclaim",
        "Raw prompts, page bodies, screenshots/base64, clipboard content, and full URLs must not be described as retained or persisted by Aviso."
      ],
      [
        "permission scope overclaim",
        "Public permission wording must stay within approved permissions and approved host origins."
      ],
      [
        "install CTA overclaim",
        "Chrome Web Store install CTA must not be described as currently available before the store link gate passes."
      ]
    ] as const
  )

  return {
    filePath: "tests/fixtures/release-verifier/false-negatives.md",
    line,
    label,
    matchedClaim,
    reason: reasonsByLabel.get(label) ?? ""
  }
}

test("release verifier classifies captured child stderr", () => {
  assert.equal(
    classifyCommandFailure('Error [ERR_MODULE_NOT_FOUND]: Cannot find package "plasmo"'),
    "missing local dependency install; restore dependencies from the lockfile before treating this as a code regression"
  )
})

test("release verifier classifies read-only dependency builds as environment failures", () => {
  assert.equal(
    classifyCommandFailure(
      "EROFS: read-only file system, open '/workspace/node_modules/@plasmohq/parcel-config/run.json'"
    ),
    "environment or sandbox permission failure; rerun in an allowed local environment before treating this as a code regression"
  )
})

test("release verifier mirrors and classifies child output from failed steps", () => {
  const stdoutChunks: string[] = []
  const stderrChunks: string[] = []

  assert.throws(
    () =>
      runCommandStep(
        {
          label: "test missing dependency",
          command: "node",
          args: ["missing.js"]
        },
        {
          spawnSync: () => ({
            status: 1,
            stdout: "build preface\n",
            stderr: 'Error [ERR_MODULE_NOT_FOUND]: Cannot find package "plasmo"\n'
          }),
          stdout: { write: (chunk: string) => stdoutChunks.push(chunk) },
          stderr: { write: (chunk: string) => stderrChunks.push(chunk) },
          exit: (code: number) => {
            throw new Error(`exit ${code}`)
          }
        }
      ),
    /exit 1/
  )

  assert.equal(stdoutChunks.includes("build preface\n"), true)
  assert.equal(
    stderrChunks.includes(
      'Error [ERR_MODULE_NOT_FOUND]: Cannot find package "plasmo"\n'
    ),
    true
  )
  assert.equal(
    stderrChunks.some((chunk) =>
      chunk.includes("Classification: missing local dependency install")
    ),
    true
  )
})
