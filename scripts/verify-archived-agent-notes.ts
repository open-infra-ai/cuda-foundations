/**
 * Verify frozen archived Agent Notes: exact head layout, manifest.json seals,
 * append-only extension vs a git baseline (skipped gracefully without git).
 * Usage:
 *   npx tsx scripts/verify-archived-agent-notes.ts          # verify only
 *   npx tsx scripts/verify-archived-agent-notes.ts --write  # verify, then seal unsealed files
 * Env: AGENT_NOTE_ARCHIVE_BASE_REF (default HEAD) — git ref the manifest is compared against.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { agentNoteRoot } from "./agent-note-tree.ts";
import { collectArchivedNotes, parseArchiveManifest, validateArchiveSeals, type ArchiveManifest } from "./agent-note-archive-manifest.ts";

const isWrite = process.argv.includes("--write");
const errors: string[] = [];
const warnings: string[] = [];
const fail = (msg: string) => { errors.push(msg); };

// --- collect archived files (skip accidental .zh.md)
const archivedDir = join(agentNoteRoot, "archived");
const files = collectArchivedNotes(agentNoteRoot).map((key) => key.slice("archived/".length));

// --- head layout: L1 title / L2 blank / L3 Status / L4 Archived / L5 blank
const TITLE_RE = /^# Agent Note[:：] ?\S/;
const ARCHIVED_RE = /^Archived: \d{4}-\d{2}-\d{2}$/;
for (const rel of files) {
  const lines = readFileSync(join(archivedDir, rel), "utf8").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  if (!TITLE_RE.test(lines[0] ?? "")) fail(`${rel} — line 1 must be \`# Agent Note: <title>\``);
  if (lines[1] !== "") fail(`${rel} — line 2 must be blank`);
  if (lines[2] !== "Status: implemented") fail(`${rel} — line 3 must be \`Status: implemented\``);
  if (!ARCHIVED_RE.test(lines[3] ?? "")) fail(`${rel} — line 4 must be \`Archived: YYYY-MM-DD\` immediately below Status`);
  if (lines[4] !== "") fail(`${rel} — line 5 must be blank after Archived`);
}

// --- manifest seals
const manifestPath = join(archivedDir, "manifest.json");
let manifest: ArchiveManifest = { version: 1, files: {} };
if (existsSync(manifestPath)) {
  try {
    manifest = parseArchiveManifest(readFileSync(manifestPath, "utf8"));
  } catch (error) {
    console.error(`archived: invalid manifest: ${(error as Error).message}`);
    process.exit(1);
  }
} else if (files.length > 0 && !isWrite) {
  fail("archived/manifest.json missing — run with --write to seal existing archived notes");
}

try {
  validateArchiveSeals(agentNoteRoot, manifest, files.map((rel) => `archived/${rel}`), isWrite);
} catch (error) {
  console.error(`archived: ${(error as Error).message}`);
  process.exit(1);
}

const sealOf = (relFromRoot: string) =>
  `sha256:${createHash("sha256").update(readFileSync(join(agentNoteRoot, relFromRoot))).digest("hex")}`;

for (const rel of files) {
  const key = `archived/${rel}`;
  const entry = manifest.files[key];
  if (!entry) {
    if (isWrite) {
      manifest.files[key] = sealOf(key);
    } else {
      fail(`${key} — missing seal in manifest.json (run with --write)`);
    }
  }
}

// --- append-only vs git baseline (skipped without git)
const repoRoot = (() => {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: agentNoteRoot, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
})();
if (repoRoot) {
  const baseRef = process.env.AGENT_NOTE_ARCHIVE_BASE_REF || "HEAD";
  const manifestRel = relative(repoRoot, manifestPath).split("\\").join("/");
  let baselineRaw: string | null = null;
  try {
    baselineRaw = execFileSync("git", ["show", `${baseRef}:${manifestRel}`], { cwd: repoRoot, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  } catch {
    // manifest absent at baseline — nothing to compare
  }
  if (baselineRaw !== null) {
    try {
      const baseline = parseArchiveManifest(baselineRaw);
      for (const [key, seal] of Object.entries(baseline.files)) {
        if (manifest.files[key] !== seal) {
          fail(`${key} — seal added/changed/removed relative to ${baseRef}; archived seals are append-only`);
        }
      }
    } catch (error) {
      fail(`archived/manifest.json at ${baseRef} is invalid: ${(error as Error).message}`);
    }
  }
} else {
  warnings.push("not a git repository — append-only check skipped (seal hashes still verified against disk)");
}

if (errors.length) {
  for (const e of errors) console.error(`archived: ${e}`);
  process.exit(1);
}

if (isWrite) {
  const sorted = Object.fromEntries(Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(manifestPath, JSON.stringify({ version: 1, files: sorted }, null, 2) + "\n", "utf8");
}

for (const w of warnings) console.warn(`warning: ${w}`);
console.log(`ok: ${files.length} archived note(s) verified, ${Object.keys(manifest.files).length} seal(s) in manifest`);
