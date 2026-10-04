import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { AGENT_NOTE_CLASSES } from "./agent-note-tree.ts";

export interface ArchiveManifest { version: 1; files: Record<string, string>; }

function validateArchivePath(key: string): void {
  const parts = key.split("/");
  if (parts.length !== 3 || parts[0] !== "archived" || !AGENT_NOTE_CLASSES.includes(parts[1] as any) ||
      !/^\d{4}-\d{2}-\d{2}-[^/\\]+\.md$/.test(parts[2]) || parts[2].endsWith(".zh.md")) {
    throw new Error(`archived/manifest.json has an invalid seal path: ${key}`);
  }
}

export function parseArchiveManifest(raw: string): ArchiveManifest {
  let value;
  try { value = JSON.parse(raw); }
  catch { throw new Error("archived/manifest.json is not valid JSON"); }
  if (!value || value.version !== 1 || !value.files || typeof value.files !== "object" || Array.isArray(value.files)) {
    throw new Error("archived/manifest.json must contain version=1 and a files object");
  }
  for (const [key, seal] of Object.entries(value.files)) {
    validateArchivePath(key);
    if (typeof seal !== "string" || !/^sha256:[a-f0-9]{64}$/.test(seal)) {
      throw new Error(`archived/manifest.json has an invalid SHA-256 seal: ${key}`);
    }
  }
  return value;
}

export function collectArchivedNotes(root: string): string[] {
  const archivedDir = join(root, "archived");
  const files: string[] = [];
  function scan(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) scan(full);
      else if (entry.isFile() && entry.name.endsWith(".md") && !entry.name.endsWith(".zh.md")) {
        files.push(relative(root, full).replace(/\\/g, "/"));
      }
    }
  }
  if (existsSync(archivedDir)) scan(archivedDir);
  return files;
}

export const archiveSeal = (path: string) => `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;

export function validateArchiveSeals(root: string, manifest: ArchiveManifest, files: string[], allowUnsealed = false): void {
  for (const key of files) validateArchivePath(key);
  for (const [key, seal] of Object.entries(manifest.files)) {
    const path = join(root, key);
    if (!existsSync(path) || !lstatSync(path).isFile()) throw new Error(`${key} — sealed entry has no regular file on disk`);
    if (archiveSeal(path) !== seal) throw new Error(`${key} — seal mismatch: archived note was modified after sealing`);
  }
  if (!allowUnsealed) {
    for (const key of files) {
      if (!manifest.files[key]) throw new Error(`${key} — missing seal; run verify-archived-agent-notes.ts --write before archiving`);
    }
  }
}
