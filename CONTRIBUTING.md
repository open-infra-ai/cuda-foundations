# Contributing to cuda-foundations

Thanks for helping improve the repository.

## What belongs here

This project is no longer expanding aggressively. The highest-value contributions are:

- bug fixes and correctness repairs
- targeted CUDA or build-system cleanup
- documentation that removes ambiguity for real users
- workflow simplification and repository hardening

Please avoid drive-by framework additions, generic boilerplate docs, or speculative new subsystems.

## Development environment

| Requirement | Minimum | Recommended |
| --- | --- | --- |
| CUDA Toolkit | 12.0 | 12.x |
| CMake | 3.20 | 3.24+ |
| GCC / Clang | GCC 9 / Clang 10 | GCC 11+ |
| Node.js | 18 | 22 |
| GPU | sm_70 | sm_80+ |

## Quick start

```bash
git clone https://github.com/open-infra-ai/cuda-foundations.git
cd cuda-foundations

pip install pre-commit
pre-commit install

cmake --list-presets
cmake --preset default
cmake --build --preset default
```

For the standalone tutorial module:

```bash
cd 01-sgemm-tutorial
make GPU_ARCH=sm_86
make test
```

## Working loop

### 1. Keep the change small

Use a short-lived branch and keep the scope focused. This repository prefers narrow fixes, cleanup, and documentation corrections over broad speculative work.

### 2. Implement and verify

Run the checks that match your change:

```bash
pre-commit run --all-files
npm ci
npm run docs:build
cmake --list-presets
```

If you changed CUDA/CMake code, also validate on a real GPU machine:

```bash
cmake --preset default
cmake --build --preset default
ctest --preset default
```

### 3. Keep docs and history aligned

If you change the public repository surface, update the matching docs in the same branch.

- `CHANGELOG.md` at the repository root is the only changelog.
- GitHub Pages should stay focused on learning and reference material, not release-history duplication.
- Prefer deleting stale explanations over writing a parallel explanation beside them.

### 4. Open a focused pull request

Keep the summary concrete, list the commands you ran, and call out any GPU-only validation that still needs a real CUDA machine.

## Code and documentation rules

- follow `.clang-format` and existing conventions
- use existing helpers before adding new abstractions
- update docs in the same change when commands, behavior, or workflow change
- prefer deleting stale material over adding another layer of explanation beside it
- non-trivial changes (behavior, architecture, cross-file contracts, process/tooling,
  testing strategy) carry an Agent Note under `.agents/notes/` (see `AGENTS.md`);
  `npm run verify-notes` must be green

## Pull requests

A good pull request for this repository:

- is scoped to one change or one tightly related fix set
- explains why the change is needed without requiring chat history
- explains user-facing or workflow-facing impact clearly
- includes the exact local checks that were run when they matter

## Commit messages

Conventional Commits are preferred:

```text
fix(scope): short description
docs(scope): short description
ci(scope): short description
refactor(scope): short description
```
