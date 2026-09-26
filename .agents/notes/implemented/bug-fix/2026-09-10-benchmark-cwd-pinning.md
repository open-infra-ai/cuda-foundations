# Agent Note: run_benchmarks.sh pins every step's working directory

Status: implemented

## Problem

`01-sgemm-tutorial` benchmarks write `roofline_data_<size>.csv` to a relative
path, while `scripts/run_benchmarks.sh` invoked builds and benchmarks without
fixing the working directory. Run from the workspace root, CSVs leaked outside
the repository entirely — four orphan files at the workspace root went
unattributed until the 2026-09-10 cleanup traced them back.

## Decision

`run_benchmarks.sh` pins the working directory of every step (cmake configure,
build, module-01 and module-02 benchmarks), so result artifacts land inside
`01-sgemm-tutorial/` regardless of where the script is invoked from
(commit `c629363`). `*.csv` remains gitignored; authoritative benchmark
narrative lives in `docs/**/benchmarks/*.md`, not in loose CSVs.

## Alternatives considered

- **Keep relative output + document "run from module dir"** — zero code churn;
  but the failure mode is silent file leakage into an unrelated directory,
  which already happened once.
- **Write results to a fixed absolute path** — deterministic; but hardcoding
  machine paths breaks portability and repo-relative reproducibility.

## Consequences

- **Gain**: artifacts always land inside the repo; workspace root stays clean;
  the script is safe to invoke from any cwd.
- **Cost**: callers must not rely on the old "output next to invocation"
  behavior — anyone who did gets files in a different place now.

## Verification

Workspace `changelog/2026-09-10-workspace-normalization.md` records the root
cause and the removal of the four orphan CSVs; running the script from the
workspace root produces no files outside the repo.
