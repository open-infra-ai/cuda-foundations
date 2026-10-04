import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { existsSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..', '..')

const guidanceFiles = [
  'AGENTS.md',
  'README.md',
  'README.zh-CN.md',
  'CONTRIBUTING.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
  'docs/en/guides/workflow.md',
  'docs/zh/guides/workflow.md',
  'CHANGELOG.md'
]

const forbiddenFrameworkPatterns = [
  /\bOpenSpec\b/,
  /\bopenspec\b/,
  /\/review\b/,
  /docs\/AI_TOOLING\.md/,
  /copilot-setup-steps/i
]

test('repository guidance drops AI process-framework language', async () => {
  const violations = []

  for (const relativePath of guidanceFiles) {
    const content = await readFile(path.join(repoRoot, relativePath), 'utf8')

    for (const pattern of forbiddenFrameworkPatterns) {
      if (pattern.test(content)) {
        violations.push(`${relativePath}: matched ${pattern}`)
      }
    }
  }

  assert.deepStrictEqual(
    violations,
    [],
    `Found stale AI process-framework references:\n${violations.join('\n')}`
  )
})

test('tracked repo surface keeps one root changelog and no obsolete AI scaffolding', async () => {
  const { stdout } = await execFileAsync('git', ['ls-files'], { cwd: repoRoot })
  const trackedFiles = stdout.trim().split('\n').filter(Boolean)
  const existingTrackedFiles = trackedFiles.filter((file) => existsSync(path.join(repoRoot, file)))

  const trackedChangelogs = existingTrackedFiles.filter((file) => /(^|\/)CHANGELOG\.md$/.test(file))
  const trackedFrameworkArtifacts = existingTrackedFiles.filter((file) =>
    file === 'CLAUDE.md'
    || file === '.github/copilot-instructions.md'
    || file === '.devin/config.local.json'
    || file === '.github/workflows/copilot-setup-steps.yml'
    || file.startsWith('openspec/')
  )

  assert.deepStrictEqual(
    trackedChangelogs,
    ['CHANGELOG.md'],
    `Expected only the root CHANGELOG.md to remain tracked, found:\n${trackedChangelogs.join('\n')}`
  )

  assert.deepStrictEqual(
    trackedFrameworkArtifacts,
    [],
    `Expected obsolete AI scaffolding to be removed, found:\n${trackedFrameworkArtifacts.join('\n')}`
  )
})

test('agent guidance points to shipped local decision-note tooling', async () => {
  const guidance = await readFile(path.join(repoRoot, 'AGENTS.md'), 'utf8')
  for (const skill of ['write-notes-like-deepseek', 'writing-for-agents', 'documentation-writer']) {
    const relativePath = `.agents/skills/${skill}/SKILL.md`
    assert.ok(guidance.includes(relativePath), `Missing guidance pointer: ${relativePath}`)
    assert.ok(existsSync(path.join(repoRoot, relativePath)), `Unshipped skill: ${relativePath}`)
  }
  assert.match(guidance, /npm run verify-notes/)
  const config = JSON.parse(await readFile(path.join(repoRoot, 'package.json'), 'utf8'))
  for (const script of [
    'verify-agent-note-tree.ts', 'verify-agent-note-format.ts',
    'verify-archived-agent-notes.ts', 'test-agent-note-archive.ts'
  ]) {
    assert.ok(config.scripts['verify-notes'].includes(script), `Missing notes gate: ${script}`)
    assert.ok(existsSync(path.join(repoRoot, 'scripts', script)), `Unshipped notes gate: ${script}`)
  }
})
