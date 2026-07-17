import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  listReleaseClaimScanFiles,
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

test("release claim scanner enumerates and accepts current repository release surfaces", () => {
  const filePaths = listReleaseClaimScanFiles()
  const expectedSurfaces = [
    "docs/STATE.md",
    "docs/privacy-and-security.md",
    "docs/release/README.md",
    "docs/planning/v0.3/cws-disclosure-draft.md",
    "website/src/pages/index.tsx",
    "website/docs/privacy-policy.md",
    "website/i18n/en/docusaurus-plugin-content-docs/current/privacy-policy.md",
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
