import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test, type TestContext } from "node:test";

const source = "implemented/bug-fix/2026-10-04-source.md";
const successor = "implemented/bug-fix/2026-10-04-successor.md";
const archived = "archived/bug-fix/2026-10-04-source.md";
const prior = "archived/process/2026-10-03-prior.md";
const active = "# Agent Note: Fixture\n\nStatus: implemented\n\n## Problem\n\nFixture.\n";
const frozen = active.replace("Status: implemented\n", "Status: implemented\nArchived: 2026-10-03\n");
const hash = (content: string) => `sha256:${createHash("sha256").update(content).digest("hex")}`;

const loader = process.execArgv.find((arg) => arg.includes("/tsx/dist/loader.mjs"))!.replace(/^--import=/, "");
const scriptRoot = resolve("scripts");

function fixture(t: TestContext) {
  const dir = mkdtempSync(join(tmpdir(), "agent-note-archive-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const root = join(dir, ".agents/notes");
  const put = (rel: string, content: string) => {
    const path = join(root, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content);
  };
  put(source, active);
  put(successor, active);
  const snapshot = () => {
    const result: Record<string, string> = {};
    function walk(path: string, prefix = "") {
      for (const entry of readdirSync(path, { withFileTypes: true })) {
        const rel = prefix + entry.name;
        if (entry.isDirectory()) walk(join(path, entry.name), rel + "/");
        else result[rel] = readFileSync(join(path, entry.name)).toString("hex");
      }
    }
    walk(root);
    return result;
  };
  const cli = (script: string, args: string[] = []) => {
    const result = spawnSync(process.execPath, ["--import", loader, join(scriptRoot, script), ...args], {
      cwd: dir, encoding: "utf8", timeout: 20_000,
      env: { ...process.env, AGENT_NOTE_ROOT: root },
    });
    assert.equal(result.error, undefined);
    assert.notEqual(result.status, null);
    return result;
  };
  return { root, put, snapshot, cli,
    archive: () => cli("archive-agent-note.ts", [join(root, source), "--superseded-by", join(root, successor)]),
    manifest: (files: Record<string, string>) => put("archived/manifest.json", JSON.stringify({ version: 1, files }) + "\n"),
  };
}

const corruptManifests = [
  ["invalid JSON", "{broken"],
  ["missing files", '{"version":1}'],
  ["wrong version", '{"version":2,"files":{}}'],
  ["array files", '{"version":1,"files":[]}'],
  ["null manifest", "null"],
  ["unsafe seal path", JSON.stringify({ version: 1, files: { "../outside.md": "sha256:" + "0".repeat(64) } })],
  ["invalid hash", JSON.stringify({ version: 1, files: { [prior]: "sha256:bad" } })],
] as const;

for (const [name, content] of corruptManifests) {
  for (const command of ["archive", "verify --write"]) {
    test(`${command} rejects ${name} without writes`, (t) => {
      const f = fixture(t);
      f.put(prior, frozen);
      f.put("archived/manifest.json", content);
      const before = f.snapshot();
      const result = command === "archive" ? f.archive() : f.cli("verify-archived-agent-notes.ts", ["--write"]);
      assert.notEqual(result.status, 0, result.stdout + result.stderr);
      assert.deepEqual(f.snapshot(), before);
    });
  }
}

for (const scenario of ["seal mismatch", "orphan seal", "unsealed archive", "missing manifest", "destination collision"]) {
  test(`archive rejects ${scenario} without writes`, (t) => {
    const f = fixture(t);
    if (scenario !== "orphan seal") f.put(prior, frozen);
    if (scenario !== "missing manifest") f.manifest(scenario === "unsealed archive" ? {} : { [prior]: hash(scenario === "seal mismatch" ? "changed" : frozen) });
    if (scenario === "destination collision") f.put(archived, frozen);
    const before = f.snapshot();
    const result = f.archive();
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(f.snapshot(), before);
  });
}

for (const body of [
  "[peer](../process/2026-10-03-peer.md)",
  "[missing](../../implemented/process/missing.md)",
  "[peer][ref]\n\n[ref]: ../process/2026-10-03-peer.md",
  '[unsupported](../../implemented/process/2026-10-03-peer.md "title")',
  "[nested [label]](../process/2026-10-03-peer.md)",
  "[unsupported](file:///tmp/file.md)",
  "[unresolved][unknown]",
  "[unsupported](../../implemented/process/2026-10-03-`quoted`peer.md)",
  "\\`[peer](../process/2026-10-03-peer.md)`",
]) {
  test(`archive refuses unsafe link: ${body.split("\n")[0]}`, (t) => {
    const f = fixture(t);
    f.put(source, active + "\n" + body + "\n");
    f.put("implemented/process/2026-10-03-peer.md", active);
    const before = f.snapshot();
    const result = f.archive();
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.deepEqual(f.snapshot(), before);
  });
}

for (const append of [false, true]) {
  test(`successful ${append ? "append preserves old seal" : "first archive"} and body`, (t) => {
    const f = fixture(t);
    const content = active + "\n[web](https://example.com) [mail](mailto:test@example.com) [section](#problem)\n" +
      "[peer](../../implemented/process/2026-10-03-peer.md#problem)\n";
    f.put(source, content);
    f.put("implemented/process/2026-10-03-peer.md", active);
    if (append) { f.put(prior, frozen); f.manifest({ [prior]: hash(frozen) }); }
    const result = f.archive();
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(existsSync(join(f.root, source)), false);
    const output = readFileSync(join(f.root, archived), "utf8");
    assert.equal(output.replace(/^Archived: \d{4}-\d{2}-\d{2}\n/m, ""), content);
    const manifest = JSON.parse(readFileSync(join(f.root, "archived/manifest.json"), "utf8"));
    assert.equal(manifest.files[archived], hash(output));
    if (append) { assert.equal(manifest.files[prior], hash(frozen)); assert.equal(readFileSync(join(f.root, prior), "utf8"), frozen); }
    assert.match(readFileSync(join(f.root, successor), "utf8"), /历史快照/);
    const verify = f.cli("verify-archived-agent-notes.ts");
    assert.equal(verify.status, 0, verify.stdout + verify.stderr);
  });
}

test("verify --write bootstraps valid historical archives", (t) => {
  const f = fixture(t);
  f.put(prior, frozen);
  const result = f.cli("verify-archived-agent-notes.ts", ["--write"]);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(JSON.parse(readFileSync(join(f.root, "archived/manifest.json"), "utf8")).files[prior], hash(frozen));
});

test("archive rejects changed links even when both targets exist", (t) => {
  const f = fixture(t);
  const peer = "process/2026-10-03-peer.md";
  f.put(source, active + `\n[peer](../${peer})\n`);
  f.put(`implemented/${peer}`, active);
  f.put(`archived/${peer}`, frozen);
  f.manifest({ [`archived/${peer}`]: hash(frozen) });
  const before = f.snapshot();
  const result = f.archive();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /link target changes/);
  assert.deepEqual(f.snapshot(), before);
});

test("archive accepts absolute, reference and image links without changing body", (t) => {
  const f = fixture(t);
  const peer = "implemented/process/2026-10-03-peer.md";
  f.put(peer, active);
  const content = active + `\n[absolute](${join(f.root, peer)})\n![image](../../${peer})\n[ref][peer]\n\n[peer]: ../../${peer}\n\n` +
    "```markdown\n[example](missing-example.md)\n```\n`[example](missing-inline.md)`\n";
  f.put(source, content);
  const result = f.archive();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(readFileSync(join(f.root, archived), "utf8").replace(/^Archived: \d{4}-\d{2}-\d{2}\n/m, ""), content);
});

for (const args of [[source], ["archived/process/2026-10-03-prior.md"], ["implemented/unknown/2026-10-03-note.md"]]) {
  test(`archive rejects invalid successor ${args[0]} without writes`, (t) => {
    const f = fixture(t);
    if (args[0] !== source) f.put(args[0], frozen);
    const before = f.snapshot();
    const result = f.cli("archive-agent-note.ts", [join(f.root, source), "--superseded-by", join(f.root, args[0])]);
    assert.notEqual(result.status, 0);
    assert.deepEqual(f.snapshot(), before);
  });
}

for (const scenario of ["mismatch", "orphan"]) {
  test(`verify --write rejects ${scenario} without writes`, (t) => {
    const f = fixture(t);
    if (scenario === "mismatch") f.put(prior, frozen);
    f.manifest({ [prior]: hash("different") });
    const before = f.snapshot();
    const result = f.cli("verify-archived-agent-notes.ts", ["--write"]);
    assert.notEqual(result.status, 0);
    assert.deepEqual(f.snapshot(), before);
  });
}

for (const invalidPath of ["archived/unknown/2026-10-03-prior.md", "archived/process/old.md"]) {
  test(`verify --write rejects invalid new seal path ${invalidPath} without writes`, (t) => {
    const f = fixture(t);
    f.put(invalidPath, frozen);
    const before = f.snapshot();
    const result = f.cli("verify-archived-agent-notes.ts", ["--write"]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /invalid seal path/);
    assert.deepEqual(f.snapshot(), before);
  });
}
