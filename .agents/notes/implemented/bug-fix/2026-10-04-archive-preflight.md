# Agent Note: 归档前验证正文链接与既有封印

Status: implemented

## Problem

笔记从 implemented 移入 archived 后，正文相对链接可能指向另一文件。无效的 manifest 若被当作空记录继续写入，会丢失既有封印；校验失败时已经移动源文件也使失败难以恢复。

## Decision

archive-agent-note 在任何写入或移动前检查目的路径、正文链接和既有 manifest。相对链接只有在原位置与归档位置解析到同一现存目标时才允许归档；无法确认的链接语法、缺失目标及目标变化均以非零状态拒绝。正文保持原字节，只插入 Archived 行。

manifest 必须为 version=1、files 对象，键为合法归档笔记路径，值为 SHA-256 封印。既有封印与文件必须一致，归档树不得遗留未封印笔记。verify-archived 的 --write 允许为合法历史语料补封印，但无效 JSON 或 schema 不得被覆盖。

[命令交付边界](../process/2026-10-04-delivered-note-commands.md)说明可用入口，与归档拒绝策略部分重叠，继续保留。

## Alternatives considered

自动重写相对链接可减少人工整理，但改变归档正文，违反历史快照只允许新增 Archived 行的约定，因此工具拒绝并要求在活跃笔记中解决目标。

重建无效 manifest 可让命令继续完成，但无法证明既有封印仍被保留，因此校验错误直接中止，修复历史记录由维护者单独处理。

## Consequences

输入错误不会修改源笔记、继任笔记、既有归档或 manifest。工具对无法确认的 Markdown 链接采取保守拒绝，复杂链接需要人工确认。前置校验不提供跨多次文件写入的崩溃原子性，也不处理并发写入者之间的竞争。

## Verification

scripts/test-agent-note-archive.ts 在临时目录调用真实 tsx CLI，比较失败前后的全部文件字节，覆盖损坏 manifest、封印冲突、迁移链接及成功追加；不依赖 GPU 或模型文件。
