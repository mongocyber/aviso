#!/usr/bin/env node
/**
 * check-docs.mjs — 文档系统机器校验（零依赖）。
 *
 * 读取 docs/.docs-check.json，检查（各项对应 DOC-SYSTEM.md §6 与 §6.1 问责表）：
 *
 * error 级（阻塞）：
 *   1. bannedClaims：禁语不得出现在 include 范围的文本文件中（默认 .md，可用 textExtensions 扩展；allowIn 支持文件或目录）。
 *      匹配前剥离代码块与 * _ ~ 强调标记：代码块里的示例不算违规，
 *      "已**上线**" 这类写法也无法绕过。
 *   2. 死链：md 内相对链接必须解析到真实文件（含内联式 [text](target)
 *      与引用式定义 [label]: target；跳过脚注 [^n]:）。
 *   3. requiredFiles：必需文件必须存在。
 *   4. gateEvidence：STATE.md Gates 表中 `passed` 的行必须有证据（非 "—"）。
 *
 * warning 级（默认开启；单项设 false 关闭；errorOn: ["max-lines", ...] 可升级为 error）：
 *   5. freshness：STATE.md 的 `Updated: YYYY-MM-DD` 距今不超过 maxDays。
 *   6. maxLines：默认 CLAUDE.md ≤100 行、docs/STATE.md ≤200 行（DOC-SYSTEM.md §2）。
 *   7. requiredSections：STATE.md 必须含 Release Line / Capabilities / Boundaries 节。
 *   8. statusEnums：Capabilities / Gates 表的状态值必须属于枚举集合（配置可扩展）。
 *   9. capabilityEvidence：`implemented` 能力行的备注应含路径或链接；
 *      当证据是裸文件路径（含 .ext）时，该路径必须真实存在。
 *  10. placeholders：`{{...}}` 占位符不得残留（行内代码中的提及除外，allowIn 可豁免目录）。
 *  11. sourceRefs：行内代码中的 `path/to/file.ext:line` 必须指向仓库内真实文件（`../` 跨仓库引用跳过）。
 *  12. anchors：`file.md#锚点` 与同文件 `#锚点` 的锚点必须对应目标文件中的真实标题
 *      （GFM slug 近似算法，识别 HTML <a id/name>；目标非 .md 时跳过）。
 *  13. kitVersion：项目 CLAUDE.md 页脚声明的 kit 版本与本脚本 KIT_VERSION 一致（检测 vendored 脚本漂移）。
 *
 * 用法：node scripts/check-docs.mjs [--root <repo-root>]
 * 退出码：有 error 时 1，否则 0（warning 不影响退出码）。
 * 配置错误（JSON 语法、非法正则）报可读的 error，不崩溃、不中断其他检查。
 */

import fs from "node:fs";
import path from "node:path";

// 本脚本所属 ai-doc-kit 版本。项目 CLAUDE.md 页脚声明的版本与此不一致时，
// 说明 vendored 的脚本相对声明版本已漂移（自检见文件末尾 kitVersion 检查）。
const KIT_VERSION = "1.8.0";

const rootIdx = process.argv.indexOf("--root");
const ROOT = path.resolve(rootIdx > -1 ? process.argv[rootIdx + 1] : ".");
const CONFIG_PATH = path.join(ROOT, "docs", ".docs-check.json");

if (!fs.existsSync(CONFIG_PATH)) {
  console.error(`error: missing config ${path.relative(ROOT, CONFIG_PATH)}`);
  process.exit(1);
}
let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
} catch (e) {
  console.error(
    `error: bad-config ${path.relative(ROOT, CONFIG_PATH)} is not valid JSON: ${e.message}`
  );
  process.exit(1);
}
const include = cfg.include ?? ["docs", "CLAUDE.md"];
const exclude = (cfg.exclude ?? ["docs/archive", "node_modules"]).map((p) =>
  path.join(ROOT, p)
);
const textExtensions = new Set(cfg.textExtensions ?? [".md"]);
const placeholderExtensions = new Set(cfg.placeholderExtensions ?? [".md"]);

const errors = [];
const warnings = [];

// warning 级检查的 kind 出现在 errorOn 里时升级为 error
const errorOn = new Set(cfg.errorOn ?? []);
function report(kind, msg, defaultError = false) {
  (defaultError || errorOn.has(kind) ? errors : warnings).push(msg);
}

function toAllowList(list) {
  return (list ?? []).map((p) => path.join(ROOT, p));
}
function isAllowed(file, allowAbs) {
  return allowAbs.some((a) => file === a || file.startsWith(a + path.sep));
}

function isExcluded(abs) {
  return exclude.some((ex) => abs === ex || abs.startsWith(ex + path.sep));
}

function collectText(entry) {
  const abs = path.join(ROOT, entry);
  if (!fs.existsSync(abs) || isExcluded(abs)) return [];
  const stat = fs.statSync(abs);
  if (stat.isFile()) return textExtensions.has(path.extname(abs)) ? [abs] : [];
  return fs
    .readdirSync(abs)
    .flatMap((name) => collectText(path.join(entry, name)));
}

const files = [...new Set(include.flatMap(collectText))];

// 预处理：围栏代码块整块置空（保留行号，报错位置不漂移），禁语与链接检查共用。
function linesWithoutFences(text) {
  const out = [];
  let fence = null;
  for (const line of text.split("\n")) {
    const marker = line.match(/^\s*(```+|~~~+)/);
    if (fence) {
      out.push("");
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
    } else if (marker) {
      fence = marker[1];
      out.push("");
    } else {
      out.push(line);
    }
  }
  return out;
}
const stripInlineCode = (line) => line.replace(/`[^`]*`/g, "");

const fileRaw = new Map(files.map((f) => [f, fs.readFileSync(f, "utf8")]));
const fileLines = new Map(
  files.map((f) => [f, linesWithoutFences(fileRaw.get(f))])
);

// 1. banned claims
for (const rule of cfg.bannedClaims ?? []) {
  let re;
  try {
    re = new RegExp(rule.pattern, "iu");
  } catch (e) {
    errors.push(
      `bad-config bannedClaims pattern /${rule.pattern}/ is not a valid regex: ${e.message}`
    );
    continue;
  }
  const allow = toAllowList(rule.allowIn);
  for (const file of files) {
    if (isAllowed(file, allow)) continue;
    fileLines.get(file).forEach((line, i) => {
      const plain = stripInlineCode(line).replace(/[*_~]/g, "");
      if (re.test(plain)) {
        errors.push(
          `banned-claim ${path.relative(ROOT, file)}:${i + 1} matches /${rule.pattern}/` +
            (rule.hint ? ` — ${rule.hint}` : "")
        );
      }
    });
  }
}

// 2. 死链：内联式 [text](target)（含 <带空格路径>、文件名含成对括号）
//    与引用式定义 [label]: target（含 <带空格路径> 与尾随 "title"）
const INLINE_LINK_RE = /\[[^\]]*\]\(\s*(<[^>]*>|(?:[^()\s]|\([^()\s]*\))+)/g;
const REF_DEF_RE = /^\s*\[(?!\^)[^\]]+\]:\s+(?:<([^>]*)>|(\S+))/;

// 目标文件的合法锚点集合：GFM 标题 slug（近似）+ HTML <a id/name>
const anchorCache = new Map();
function anchorsOf(absFile) {
  if (anchorCache.has(absFile)) return anchorCache.get(absFile);
  const raw = fs.readFileSync(absFile, "utf8");
  const seen = new Map();
  const set = new Set();
  for (const line of linesWithoutFences(raw)) {
    const h = line.match(/^#{1,6}\s+(.*)/);
    if (!h) continue;
    const slug = h[1]
      .trim()
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[`*_~]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s/g, "-");
    const n = seen.get(slug) ?? 0;
    seen.set(slug, n + 1);
    set.add(n === 0 ? slug : `${slug}-${n}`);
  }
  for (const m of raw.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) set.add(m[1].toLowerCase());
  anchorCache.set(absFile, set);
  return set;
}

function checkLinkTarget(file, lineNo, rawTarget) {
  let target = rawTarget;
  if (target.startsWith("<")) target = target.replace(/^</, "").replace(/>$/, "");
  if (/^(https?:|mailto:)/i.test(target)) return;
  if (target.startsWith("/") && !target.startsWith("//")) {
    const siteRoutes = new Set(cfg.siteAbsoluteRoutes ?? []);
    const withSlash = target.endsWith("/") ? target : `${target}/`;
    if (siteRoutes.has(target) || siteRoutes.has(withSlash)) return;
  }
  const rel = path.relative(ROOT, file);
  const hashIdx = target.indexOf("#");
  const filePart = hashIdx === -1 ? target : target.slice(0, hashIdx);
  const fragment = hashIdx === -1 ? "" : target.slice(hashIdx + 1);
  let resolved;
  if (!filePart) {
    resolved = file; // 同文件锚点 #section
  } else {
    let decoded;
    try {
      decoded = decodeURI(filePart);
    } catch {
      errors.push(`bad-link ${rel}:${lineNo} → ${target} (malformed URI)`);
      return;
    }
    resolved = path.resolve(path.dirname(file), decoded);
    if (!fs.existsSync(resolved)) {
      errors.push(`dead-link ${rel}:${lineNo} → ${target}`);
      return;
    }
  }
  if (!fragment || cfg.anchors === false || !resolved.endsWith(".md")) return;
  let frag;
  try {
    frag = decodeURIComponent(fragment).toLowerCase();
  } catch {
    errors.push(`bad-link ${rel}:${lineNo} → ${target} (malformed URI)`);
    return;
  }
  if (!anchorsOf(resolved).has(frag)) {
    report(
      "dead-anchor",
      `dead-anchor ${rel}:${lineNo} → ${target} (no such heading in ${path.relative(ROOT, resolved)})`
    );
  }
}

for (const file of files) {
  fileLines.get(file).forEach((line, i) => {
    const scan = stripInlineCode(line);
    for (const m of scan.matchAll(INLINE_LINK_RE)) checkLinkTarget(file, i + 1, m[1]);
    const def = scan.match(REF_DEF_RE);
    if (def) checkLinkTarget(file, i + 1, def[1] ?? def[2]);
  });
}

// 3. required files
for (const req of cfg.requiredFiles ?? []) {
  if (!fs.existsSync(path.join(ROOT, req))) {
    errors.push(`missing-required-file ${req}`);
  }
}

// 4. freshness
if (cfg.freshness?.file) {
  const f = path.join(ROOT, cfg.freshness.file);
  if (!fs.existsSync(f)) {
    warnings.push(`freshness ${cfg.freshness.file}: file not found, check skipped`);
  } else {
    const m = fs.readFileSync(f, "utf8").match(/^Updated:\s*(\d{4}-\d{2}-\d{2})/m);
    if (!m) {
      errors.push(`freshness ${cfg.freshness.file}: no "Updated: YYYY-MM-DD" line`);
    } else {
      const ageDays = (Date.now() - new Date(m[1]).getTime()) / 86400000;
      const max = cfg.freshness.maxDays ?? 45;
      if (ageDays > max) {
        warnings.push(
          `stale ${cfg.freshness.file}: Updated ${m[1]} is ${Math.floor(ageDays)}d old (max ${max}d) — run prompts/audit-docs.md`
        );
      }
    }
  }
}

// 6. 行数上限（DOC-SYSTEM.md §2：L0 ≤100、L1 ≤200）
if (cfg.maxLines !== false) {
  const caps = { "CLAUDE.md": 100, "docs/STATE.md": 200, ...(cfg.maxLines ?? {}) };
  for (const [rel, cap] of Object.entries(caps)) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) continue;
    const n = fs.readFileSync(abs, "utf8").trimEnd().split("\n").length;
    if (n > cap) {
      report("max-lines", `max-lines ${rel}: ${n} lines exceeds cap ${cap} (DOC-SYSTEM.md §2)`);
    }
  }
}

// 7–9. STATE.md 结构与证据检查（必需节 / 状态枚举 / 门禁与能力证据）
const stateRel = cfg.stateFile ?? "docs/STATE.md";
const stateAbs = path.join(ROOT, stateRel);
if (fs.existsSync(stateAbs)) {
  const stateLines = linesWithoutFences(fs.readFileSync(stateAbs, "utf8"));
  const headings = stateLines
    .filter((l) => /^##\s/.test(l))
    .map((l) => l.replace(/^##\s+/, "").trim());

  if (cfg.requiredSections !== false) {
    const required = cfg.requiredSections ?? ["Release Line", "Capabilities", "Boundaries"];
    for (const name of required) {
      if (!headings.some((h) => h.startsWith(name))) {
        report("required-section", `required-section ${stateRel}: missing "## ${name}"`);
      }
    }
  }

  // 取某个 H2 节里表格分隔行之后的数据行
  function tableRows(sectionName) {
    const rows = [];
    let inSection = false;
    let pastSeparator = false;
    stateLines.forEach((line, i) => {
      const h = line.match(/^##\s+(.*)/);
      if (h) {
        inSection = h[1].trim().startsWith(sectionName);
        pastSeparator = false;
        return;
      }
      if (!inSection || !/^\s*\|/.test(line)) return;
      const cells = line.split("|").map((c) => c.trim());
      cells.shift();
      if (cells.length && cells[cells.length - 1] === "") cells.pop();
      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        pastSeparator = true;
        return;
      }
      if (pastSeparator) rows.push({ cells, no: i + 1 });
    });
    return rows;
  }

  const stripTicks = (s) => s.replace(/`/g, "").trim();
  const isTemplateRow = (cells) => cells.join(" ").includes("{{");

  if (cfg.statusEnums !== false) {
    const enums = {
      capability: ["implemented", "configured-only", "unverified", "not-planned"],
      gate: ["not-started", "pending", "passed", "failed", "waived"],
      ...(typeof cfg.statusEnums === "object" ? cfg.statusEnums : {}),
    };
    for (const [section, allowed] of [["Capabilities", enums.capability], ["Gates", enums.gate]]) {
      for (const { cells, no } of tableRows(section)) {
        if (isTemplateRow(cells)) continue;
        const status = stripTicks(cells[1] ?? "");
        if (status && !allowed.includes(status)) {
          report(
            "status-enum",
            `status-enum ${stateRel}:${no} ${section} status \`${status}\` not in [${allowed.join(", ")}]`
          );
        }
      }
    }
  }

  if (cfg.gateEvidence !== false) {
    for (const { cells, no } of tableRows("Gates")) {
      if (isTemplateRow(cells)) continue;
      const evidence = (cells[2] ?? "").trim();
      if (stripTicks(cells[1] ?? "") === "passed" && (evidence === "" || /^[—–-]+$/.test(evidence))) {
        report(
          "gate-evidence",
          `gate-evidence ${stateRel}:${no} gate "${cells[0]}" is passed without evidence link`,
          true
        );
      }
    }
  }

  if (cfg.capabilityEvidence !== false) {
    // 行内代码里"文件路径"形状：可含目录、必须以 .ext 结尾（1-8 位）。
    // 排除跨仓库 ../、URL、以及带 :line 的引用（后者归 sourceRefs）。
    const EVIDENCE_PATH_RE = /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.[A-Za-z0-9]{1,8}$/;
    for (const { cells, no } of tableRows("Capabilities")) {
      if (isTemplateRow(cells)) continue;
      if (stripTicks(cells[1] ?? "") !== "implemented") continue;
      const note = cells[2] ?? "";
      if (!/\[[^\]]*\]\(|https?:|`[^`]*[./][^`]*`/.test(note)) {
        report(
          "capability-evidence",
          `capability-evidence ${stateRel}:${no} "${cells[0]}" implemented without path/link evidence`
        );
        continue;
      }
      // 证据是裸文件路径时，路径必须真实存在——否则"证据"是虚的。
      for (const m of note.matchAll(/`([^`]+)`/g)) {
        const tok = m[1];
        if (tok.startsWith("../") || !EVIDENCE_PATH_RE.test(tok)) continue;
        if (!fs.existsSync(path.join(ROOT, tok))) {
          report(
            "capability-evidence",
            `capability-evidence ${stateRel}:${no} "${cells[0]}" cites path ${tok} that does not exist`
          );
        }
      }
    }
  }
}

// 10. 占位符残留（扫描原始行含代码围栏；行内代码中的提及豁免）
if (cfg.placeholders !== false) {
  const allow = toAllowList(typeof cfg.placeholders === "object" ? cfg.placeholders.allowIn : []);
  for (const file of files) {
    if (!placeholderExtensions.has(path.extname(file))) continue;
    if (isAllowed(file, allow)) continue;
    fileRaw.get(file).split("\n").forEach((line, i) => {
      const m = stripInlineCode(line).match(/\{\{[^}]+\}\}/);
      if (m) {
        report("placeholder", `placeholder ${path.relative(ROOT, file)}:${i + 1} unfilled ${m[0]}`);
      }
    });
  }
}

// 11. 源码引用存在性：行内代码里的 path/to/file.ext:line（../ 开头的跨仓库引用跳过）
if (cfg.sourceRefs !== false) {
  const SRC_REF_RE = /^([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+\.[A-Za-z0-9]+):\d+/;
  for (const file of files) {
    fileLines.get(file).forEach((line, i) => {
      for (const m of line.matchAll(/`([^`]+)`/g)) {
        const ref = m[1].match(SRC_REF_RE);
        if (!ref || ref[1].startsWith("../")) continue;
        if (!fs.existsSync(path.join(ROOT, ref[1]))) {
          report(
            "source-ref",
            `source-ref ${path.relative(ROOT, file)}:${i + 1} → ${ref[1]} not found from repo root`
          );
        }
      }
    });
  }
}

// 13. kitVersion：项目 CLAUDE.md 页脚声明的 kit 版本与本脚本 KIT_VERSION 不一致时提示。
//     用于检测 vendored 脚本相对声明版本的漂移；未声明则跳过。
if (cfg.kitVersion !== false) {
  const claudePath = path.join(ROOT, "CLAUDE.md");
  if (fs.existsSync(claudePath)) {
    const declared = fs
      .readFileSync(claudePath, "utf8")
      .match(/Doc system: ai-doc-kit v(\d+\.\d+\.\d+)/);
    if (declared && declared[1] !== KIT_VERSION) {
      report(
        "kit-version",
        `kit-version CLAUDE.md declares ai-doc-kit v${declared[1]} but check-docs.mjs is v${KIT_VERSION}; re-vendor the script or update the footer`
      );
    }
  }
}

for (const w of warnings) console.warn(`warning: ${w}`);
for (const e of errors) console.error(`error: ${e}`);
console.log(
  `check-docs: ${files.length} files, ${errors.length} error(s), ${warnings.length} warning(s)`
);
process.exit(errors.length > 0 ? 1 : 0);
