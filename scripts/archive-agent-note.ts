/**
 * CLI tool to archive an implemented Agent Note with frozen manifest sealing.
 * Usage: npx tsx scripts/archive-agent-note.ts .agents/notes/implemented/<class>/<filename>.md [--superseded-by <new-note-path>]
 * --superseded-by writes a relative link into the NEW note, never into the archived file.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { agentNoteRoot, AGENT_NOTE_CLASSES, walkAgentNoteTree } from "./agent-note-tree.ts";
import { collectArchivedNotes, parseArchiveManifest, validateArchiveSeals, type ArchiveManifest } from "./agent-note-archive-manifest.ts";

const args = process.argv.slice(2);
const targetArg = args[0];
const supersededByArgIdx = args.indexOf("--superseded-by");
const supersededByArg = supersededByArgIdx !== -1 ? args[supersededByArgIdx + 1] : undefined;
if (supersededByArgIdx !== -1 && !supersededByArg) {
  console.error("Error: --superseded-by requires a note path");
  process.exit(1);
}
if (!targetArg) {
  console.error("Usage: npx tsx scripts/archive-agent-note.ts <path-to-note> [--superseded-by <new-note-path>]");
  process.exit(1);
}

let successorPath: string | undefined;
let successorRel: string | undefined;
if (supersededByArg) {
  successorPath = resolve(process.cwd(), supersededByArg);
  if (!existsSync(successorPath)) {
    console.error(`Error: --superseded-by target not found at ${successorPath}`);
    process.exit(1);
  }
}

const targetPath = resolve(process.cwd(), targetArg);
if (!existsSync(targetPath)) {
  console.error(`Error: target note not found at ${targetPath}`);
  process.exit(1);
}

const relToRoot = relative(agentNoteRoot, targetPath).replace(/\\/g, "/");
const segs = relToRoot.split("/");

if (segs[0] !== "implemented" || segs.length !== 3) {
  console.error(`Error: only notes in .agents/notes/implemented/<class>/ can be archived (got: ${relToRoot})`);
  process.exit(1);
}

const [, cls, filename] = segs;
if (!AGENT_NOTE_CLASSES.includes(cls as any)) {
  console.error(`Error: unknown class "${cls}"`);
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}-[^/\\]+\.md$/.test(filename) || filename.endsWith(".zh.md")) {
  console.error(`Error: invalid note filename for archive seal: ${filename}`);
  process.exit(1);
}

// 1. Read and update content with Archived line
const raw = readFileSync(targetPath, "utf8");
const lines = raw.split("\n");
const statusIdx = lines.findIndex((l) => l === "Status: implemented");
if (statusIdx === -1) {
  console.error("Error: note must contain `Status: implemented` to be archived");
  process.exit(1);
}

// Local calendar date, not UTC — toISOString() would roll the archived stamp
// back one day for evening runs east of the prime meridian.
const nowLocal = new Date();
const pad2 = (n: number) => String(n).padStart(2, "0");
const today = `${nowLocal.getFullYear()}-${pad2(nowLocal.getMonth() + 1)}-${pad2(nowLocal.getDate())}`;
// DSH contract: `Archived:` sits immediately below `Status:` (L3/L4).
if (!lines.some((l) => l.startsWith("Archived:"))) {
  lines.splice(statusIdx + 1, 0, `Archived: ${today}`);
}

if (successorPath) {
  const rel = relative(agentNoteRoot, successorPath).replace(/\\/g, "/");
  successorRel = rel;
  const successorSegs = rel.split("/");
  if (successorPath === targetPath || successorSegs.length !== 3 || !["proposed", "implemented", "rejected"].includes(successorSegs[0] ?? "") || !AGENT_NOTE_CLASSES.includes(successorSegs[1] as any)) {
    console.error(`Error: --superseded-by target must be an active note in {lifecycle}/{class}/ (got: ${rel})`);
    process.exit(1);
  }
}

const oldTitle = (lines[0] ?? "").replace(/^# Agent Note[:：] ?/, "").trim() || basename(filename, ".md");
const updatedContent = lines.join("\n");

// 2. Determine archived destination
const archivedDir = join(agentNoteRoot, "archived", cls);
const archivedPath = join(archivedDir, filename);

if (existsSync(archivedPath)) {
  console.error(`Error: target archived note already exists at ${archivedPath}`);
  console.error("Refusing to overwrite existing archived note. Please inspect and resolve name collision manually.");
  process.exit(1);
}

// Validate all inputs before changing the source, successor, archive or manifest.
const manifestPath = join(agentNoteRoot, "archived", "manifest.json");
let manifest: ArchiveManifest = { version: 1, files: {} };
try {
  const archivedFiles = collectArchivedNotes(agentNoteRoot);
  if (existsSync(manifestPath)) {
    manifest = parseArchiveManifest(readFileSync(manifestPath, "utf8"));
  } else if (archivedFiles.length) {
    throw new Error("archived/manifest.json missing for existing archives; run verify-archived-agent-notes.ts --write before archiving");
  }
  validateArchiveSeals(agentNoteRoot, manifest, archivedFiles);
  validateOutboundLinks(raw, targetPath, archivedPath);
  if (successorPath) readFileSync(successorPath, "utf8");
} catch (error) {
  console.error(`Error: archive preflight failed: ${(error as Error).message}`);
  process.exit(1);
}

mkdirSync(archivedDir, { recursive: true });
writeFileSync(targetPath, updatedContent, "utf8");
renameSync(targetPath, archivedPath);
console.log(`Moved: ${relToRoot} -> archived/${cls}/${filename}`);

// 3. Append the new SHA-256 seal, preserving all existing entries.
const newArchivedRel = `archived/${cls}/${filename}`;
const sha256 = `sha256:${createHash("sha256").update(readFileSync(archivedPath)).digest("hex")}`;
manifest.files[newArchivedRel] = sha256;

// Deterministic sort keys
const sortedFiles = Object.fromEntries(
  Object.entries(manifest.files).sort(([a], [b]) => a.localeCompare(b))
);
writeFileSync(manifestPath, JSON.stringify({ version: 1, files: sortedFiles }, null, 2) + "\n", "utf8");
console.log(`Sealed in archived/manifest.json with hash ${sha256.slice(0, 16)}...`);

// 4. Scan inbound links in active notes (precise markdown-link resolution)
const { notes } = walkAgentNoteTree();
const inboundFound: string[] = [];
const LINK_REGEX = /\[([^\]]+)\]\(([^)]+)\)/g;
for (const note of notes) {
  const noteFullPath = resolve(agentNoteRoot, note.rel);
  const content = readFileSync(noteFullPath, "utf8");
  let match: RegExpExecArray | null;
  LINK_REGEX.lastIndex = 0;
  while ((match = LINK_REGEX.exec(content)) !== null) {
    const rawTarget = match[2]?.trim();
    if (!rawTarget || rawTarget.startsWith("http://") || rawTarget.startsWith("https://") || rawTarget.startsWith("#") || rawTarget.startsWith("mailto:")) continue;
    const fileTarget = rawTarget.split("#")[0];
    if (!fileTarget) continue;
    // resolve the link relative to the linking note, then compare with the archived note's original location
    const resolvedTarget = resolve(dirname(noteFullPath), fileTarget);
    if (resolvedTarget === targetPath) {
      inboundFound.push(note.rel);
      break;
    }
  }
}

if (inboundFound.length > 0) {
  console.log("\n[Notice] The following active notes link to the archived note:");
  for (const rel of inboundFound) {
    console.log(`  - ${rel}`);
  }
  console.log("Please review and update their relative markdown links if necessary.");
} else {
  console.log("\nNo active notes link to this archived note.");
}

if (successorPath && successorRel) {
  const relLink = relative(dirname(successorPath), archivedPath).replace(/\\/g, "/");
  const newRaw = readFileSync(successorPath, "utf8");
  if (!newRaw.includes(`archived/${cls}/${filename}`) && !newRaw.includes(relLink)) {
    writeFileSync(successorPath, `${newRaw.replace(/\s*$/, "")}\n\n[历史快照：${oldTitle}](${relLink})\n`, "utf8");
    console.log(`Linked from ${successorRel}: [历史快照：${oldTitle}](${relLink})`);
  }
}

function validateOutboundLinks(content: string, source: string, destination: string): void {
  // Code samples are not links. Complex destinations are rejected rather than rewritten.
  const prose = content
    .replace(/^ {0,3}(`{3,})[^`\n]*\n[\s\S]*?^ {0,3}\1`*[ \t]*$/gm, "")
    .replace(/^ {0,3}(~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1~*[ \t]*$/gm, "");
  const codeSpans = [...prose.matchAll(/(?<![\\`])(`+)[\s\S]*?(?<!`)\1(?!`)/g)];
  const outsideCode = (match: RegExpMatchArray) => !codeSpans.some((span) => match.index! >= span.index! && match.index! < span.index! + span[0].length);
  if (/<(?:a|img)\b/i.test(prose)) throw new Error("unsupported HTML link syntax in note body");
  const inlineLinks = [...prose.matchAll(/!?\[[^\]\n]*\]\(([^)\n]*)\)/g)].filter(outsideCode);
  if ([...prose.matchAll(/\]\(/g)].filter(outsideCode).length !== inlineLinks.length) throw new Error("unsupported Markdown link syntax in note body");
  const targets = inlineLinks.map((match) => match[1].trim());
  const definitions = [...prose.matchAll(/^ {0,3}\[([^\]\n]+)\]:\s*(.+)$/gm)].filter(outsideCode);
  const labels = new Set(definitions.map((match) => match[1].toLowerCase()));
  for (const match of definitions) targets.push(match[2].trim());
  for (const match of [...prose.matchAll(/\[([^\]\n]+)\]\[([^\]\n]*)\]/g)].filter(outsideCode)) {
    if (!labels.has((match[2] || match[1]).toLowerCase())) throw new Error(`unresolved reference link: ${match[0]}`);
  }
  for (let target of targets) {
    if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
    if (!target || /[\s()\\`]/.test(target)) throw new Error(`unsupported Markdown link destination: ${target}`);
    if (/^(?:https?:\/\/|mailto:|#)/i.test(target)) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("//") || /[?%<>]/.test(target)) {
      throw new Error(`unsupported Markdown link destination: ${target}`);
    }
    const fileTarget = target.split("#")[0];
    const before = resolve(dirname(source), fileTarget);
    const after = resolve(dirname(destination), fileTarget);
    if (!existsSync(before) || !existsSync(after)) throw new Error(`link target missing before or after archive: ${target}`);
    if (realpathSync(before) !== realpathSync(after)) throw new Error(`link target changes after archive: ${target}`);
    if (realpathSync(before) === realpathSync(source)) throw new Error(`link points to the source being moved: ${target}`);
  }
}
